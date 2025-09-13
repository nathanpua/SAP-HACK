import asyncio
import json
import time
import traceback
from dataclasses import asdict
from importlib import resources

import agents as ag
import tornado.httputil
import tornado.web
import tornado.websocket

from utu.agents.orchestra import OrchestraStreamEvent
from utu.agents.orchestra_agent import OrchestraAgent
from utu.agents.simple_agent import SimpleAgent

from .common import (
    Event,
    ExampleContent,
    UserQuery,
    handle_new_agent,
    handle_orchestra_events,
    handle_raw_stream_events,
    handle_tool_call_output, 
)


class WebSocketHandler(tornado.websocket.WebSocketHandler):
    def initialize(self, agent: SimpleAgent | OrchestraAgent, example_query: str = ""):
        self.agent: SimpleAgent | OrchestraAgent = agent
        self.example_query = example_query
        self.stream_task = None  # Track the current streaming task
        self.finish_requested = False  # Flag to indicate finish was requested

    def check_origin(self, origin):
        # Allow all origins to connect
        return True

    def open(self):
        # print("WebSocket opened")
        # send example query
        self.write_message(asdict(Event("example", ExampleContent(type="example", query=self.example_query))))

    async def send_event(self, event: Event):
        # print in green color
        print(f"\033[92mSending event: {asdict(event)}\033[0m")
        self.write_message(asdict(event))

    async def stream_responses(self, stream):
        """Stream responses and handle interruption"""
        print("\033[94mStarting streaming task\033[0m")
        try:
            async for event in stream.stream_events():
                # Check if finish was requested
                if self.finish_requested:
                    print("\033[93mStreaming interrupted by finish request\033[0m")
                    break

                event_to_send = None
                print(f"--------------------\n{event}")
                if isinstance(event, ag.RawResponsesStreamEvent):
                    event_to_send = await handle_raw_stream_events(event)
                elif isinstance(event, ag.RunItemStreamEvent):
                    event_to_send = await handle_tool_call_output(event)
                elif isinstance(event, ag.AgentUpdatedStreamEvent):
                    event_to_send = await handle_new_agent(event)
                elif isinstance(event, OrchestraStreamEvent):
                    event_to_send = await handle_orchestra_events(event)
                else:
                    pass
                if event_to_send:
                    # print(f"Sending event: {asdict(event_to_send)}")
                    await self.send_event(event_to_send)
            else:
                # Only send finish if not interrupted
                if not self.finish_requested:
                    print("\033[94mStreaming completed naturally\033[0m")
                    event_to_send = Event(type="finish")
                    await self.send_event(event_to_send)
                    print(f"\033[92mSending event: {asdict(event_to_send)}\033[0m")
                else:
                    print("\033[93mStreaming completed due to interruption\033[0m")
        except asyncio.CancelledError:
            print("\033[93mStream task cancelled via asyncio\033[0m")
            # Send finish event when cancelled
            if self.finish_requested:
                event_to_send = Event(type="finish")
                try:
                    await self.send_event(event_to_send)
                    print(f"\033[92mSending finish event after cancellation: {asdict(event_to_send)}\033[0m")
                except Exception as e:
                    print(f"Error sending finish event after cancellation: {e}")
            raise
        except Exception as e:
            print(f"Error in stream_responses: {e}")
            raise

    async def on_message(self, message: str):
        try:
            data = json.loads(message)
            if data.get("type") == "query":
                try:
                    query = UserQuery(**data)
                    # check query not empty
                    if query.query.strip() == "":
                        raise ValueError("Query cannot be empty")

                    # print(f"Received query: {query.query}")
                    # Echo back the query in the response

                    # Build conversation context from history
                    context_parts = []
                    if query.conversation_history:
                        print(f"📚 Building context from {len(query.conversation_history)} previous messages")
                        for msg in query.conversation_history:
                            role = "user" if msg["sender"] == "user" else "assistant"
                            content = msg["content"]
                            # Handle different content types
                            if isinstance(content, str):
                                context_parts.append(f"{role}: {content}")
                            else:
                                # Handle structured content (PlanItem, WorkerItem, etc.)
                                context_parts.append(f"{role}: {str(content)}")

                    # Combine context with current query
                    if context_parts:
                        full_context = "\n\n".join(context_parts)
                        query_with_context = f"CONVERSATION CONTEXT:\n{full_context}\n\nCURRENT QUERY: {query.query}"
                        print(f"🧠 Context length: {len(full_context)} characters")
                    else:
                        query_with_context = query.query

                    if query.user_id:
                        # Store user context in agent and its workers for toolkit access
                        if hasattr(self.agent, 'current_user_id'):
                            self.agent.current_user_id = query.user_id
                        # Also set user_id for worker agents in orchestra
                        if hasattr(self.agent, 'worker_agents'):
                            for worker_name, worker in self.agent.worker_agents.items():
                                # Set on the worker agent wrapper
                                if hasattr(worker, 'current_user_id'):
                                    worker.current_user_id = query.user_id
                                # Also set on the actual agent inside SimpleWorkerAgent
                                if hasattr(worker, 'agent') and hasattr(worker.agent, 'current_user_id'):
                                    worker.agent.current_user_id = query.user_id
                                    print(f"\033[94mSet user_id {query.user_id} on worker agent: {worker_name}\033[0m")
                        print(f"\033[94mUser authenticated: {query.user_id}\033[0m")

                    # Cancel any existing stream task
                    if self.stream_task and not self.stream_task.done():
                        print("\033[93mCancelling previous stream task\033[0m")
                        self.stream_task.cancel()
                        # Don't await here - just cancel and move on

                    # Reset finish flag for new query
                    self.finish_requested = False

                    if isinstance(self.agent, OrchestraAgent):
                        stream = self.agent.run_streamed(query_with_context)
                    elif isinstance(self.agent, SimpleAgent):
                        self.agent.input_items.append({"role": "user", "content": query_with_context})
                        # print in red color
                        print(f"\033[91mInput items: {self.agent.input_items}\033[0m")
                        stream = self.agent.run_streamed(self.agent.input_items)
                    else:
                        raise ValueError(f"Unsupported agent type: {type(self.agent).__name__}")

                    # Start streaming in a separate task (non-blocking)
                    self.stream_task = asyncio.create_task(self.stream_responses(stream))

                    # IMPORTANT: Don't await the task here - let it run in background
                    # This allows other messages (like finish) to be processed immediately

                    # Schedule cleanup when task completes (but don't block)
                    def cleanup_task(task):
                        try:
                            # Handle post-stream cleanup
                            if isinstance(self.agent, SimpleAgent) and not self.finish_requested:
                                input_list = stream.to_input_list()
                                self.agent.input_items = input_list
                                # print in red
                                print(f"\033[91mInput list: {input_list}\033[0m")
                                self.agent.current_agent = stream.last_agent
                        except Exception as e:
                            print(f"Error in cleanup_task: {e}")

                    self.stream_task.add_done_callback(cleanup_task)
                except TypeError as e:
                    print(f"Invalid query format: {e}")
                    # stack trace
                    print(traceback.format_exc())
                    self.close(1002, "Invalid query format")
            elif data.get("type") == "finish":
                # Handle finish event from client (same as Ctrl+C)
                print(f"\033[93mReceived finish event from client: {data}\033[0m")

                # Set flag to indicate finish was requested
                self.finish_requested = True

                # Cancel the current streaming task if it exists
                if self.stream_task and not self.stream_task.done():
                    print("\033[93mCancelling streaming task due to finish request\033[0m")
                    self.stream_task.cancel()
                    # Don't await here - just cancel and let the task handle cleanup
                    print("\033[93mStream task cancellation requested\033[0m")

                # Send finish event back to client to complete the response
                event_to_send = Event(type="finish")
                await self.send_event(event_to_send)

                # Log the finish event (same format as Ctrl+C)
                print(f"\033[92mSending event: {asdict(event_to_send)}\033[0m")
            else:
                # print(f"Unhandled message type: {data.get('type')}")
                # self.close(1002, "Unhandled message type")
                pass
        except json.JSONDecodeError:
            # print(f"Invalid JSON received: {message}")
            self.close(1002, "Invalid JSON received")
        except Exception as e:
            print(f"Error processing message: {str(e)}")
            # stack trace
            print(traceback.format_exc())
            self.close(1002, "Error processing message")

    def on_close(self):
        # print("WebSocket closed")
        # Cancel any running streaming task
        if self.stream_task and not self.stream_task.done():
            print("\033[93mCancelling streaming task due to connection close\033[0m")
            self.stream_task.cancel()
        pass


class HealthHandler(tornado.web.RequestHandler):
    def get(self):
        self.set_header("Content-Type", "application/json")
        self.write({"status": "healthy", "timestamp": tornado.httputil.format_timestamp(time.time())})


class WebUIChatbot:
    def __init__(self, agent: SimpleAgent | OrchestraAgent, example_query: str = ""):
        self.agent = agent
        self.example_query = example_query
        # hack
        with resources.as_file(resources.files("utu_agent_ui.static").joinpath("index.html")) as static_dir:
            self.static_path = str(static_dir).replace("index.html", "")

    def make_app(self) -> tornado.web.Application:
        return tornado.web.Application(
            [
                (r"/health", HealthHandler),
                (r"/ws", WebSocketHandler, {"agent": self.agent, "example_query": self.example_query}),
                (
                    r"/",
                    tornado.web.RedirectHandler,
                    {"url": "/index.html"},
                ),
                (
                    r"/(.*)",
                    tornado.web.StaticFileHandler,
                    {"path": self.static_path, "default_filename": "index.html"},
                ),
            ],
            debug=True,
        )

    async def __launch(self, port: int = 8848, ip: str = "127.0.0.1"):
        await self.agent.build()
        app = self.make_app()
        app.listen(port, address=ip)
        print(f"Server started at http://{ip}:{port}/")
        await asyncio.Event().wait()

    async def launch_async(self, port: int = 8848, ip: str = "127.0.0.1"):
        await self.__launch(port=port, ip=ip)

    def launch(self, port: int = 8848, ip: str = "127.0.0.1"):
        asyncio.run(self.__launch(port=port, ip=ip))


if __name__ == "__main__":
    webui = WebUIChatbot()
    webui.launch()
