import json
import pathlib
import re
from typing import Optional

from ...config import AgentConfig
from ...utils import SimplifiedAsyncOpenAI, get_jinja_env
from .common import AgentInfo, CreatePlanResult, OrchestraTaskRecorder, Subtask


class OutputParser:
    def __init__(self, available_agents=None):
        # Updated patterns for markdown format instead of XML
        self.analysis_pattern = r"## Query Analysis\s*\n(.*?)(?=\n##|\n\d+\.|\Z)"
        self.plan_pattern = r"## Agent Action Plan\s*\n(.*?)(?=\n##|\Z)"
        self.available_agents = available_agents or []
        # self.next_step_pattern = r'<next_step>\s*<agent>\s*(.*?)\s*</agent>\s*<task>\s*(.*?)\s*</task>\s*</next_step>'
        # self.task_finished_pattern = r'<task_finished>\s*</task_finished>'

    def parse(self, output_text: str) -> CreatePlanResult:
        analysis = self._extract_analysis(output_text)
        plan = self._extract_plan(output_text)
        return CreatePlanResult(analysis=analysis, todo=plan)

    def _extract_analysis(self, text: str) -> str:
        match = re.search(self.analysis_pattern, text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return ""

    def _extract_plan(self, text: str) -> list[Subtask]:
        match = re.search(self.plan_pattern, text, re.DOTALL)
        if not match:
            print(f"⚠️ No Agent Action Plan section found in response. Looking for fallback patterns...")
            # Fallback: try to extract todo list content from the entire response
            return self._extract_plan_fallback(text)

        plan_content = match.group(1).strip()
        tasks = []
        # Parse numbered markdown format: "1. **AgentName**: responsibilities"
        numbered_pattern = r'^\s*\d+\.\s*\*\*([A-Za-z]+Agent)\*\*:\s*(.+?)(?=\n\s*\d+\.\s*\*\*|\Z)'
        numbered_matches = re.findall(numbered_pattern, plan_content, re.MULTILINE | re.DOTALL)

        if numbered_matches:
            print(f"✅ Found {len(numbered_matches)} numbered tasks in markdown format")
            for agent_name, task_desc in numbered_matches:
                tasks.append(Subtask(agent_name=agent_name, task=task_desc.strip(), completed=False))
            return tasks

        # Fallback to simple numbered format without bold: "1. AgentName: responsibilities"
        simple_numbered_pattern = r'^\s*\d+\.\s*([A-Za-z]+Agent):\s*(.+?)(?=\n\s*\d+\.\s*[A-Za-z]+Agent:|\Z)'
        simple_matches = re.findall(simple_numbered_pattern, plan_content, re.MULTILINE | re.DOTALL)

        if simple_matches:
            print(f"✅ Found {len(simple_matches)} simple numbered tasks")
            for agent_name, task_desc in simple_matches:
                tasks.append(Subtask(agent_name=agent_name, task=task_desc.strip(), completed=False))
            return tasks

        print(f"⚠️ No valid numbered tasks found in plan content. Trying fallback...")
        return self._extract_plan_fallback(text)

    def _extract_plan_fallback(self, text: str) -> list[Subtask]:
        """Fallback method to extract plan when proper markdown format is not used"""
        tasks = []

        # Get agent names from available agents (dynamic list)
        agent_names = [agent.name for agent in self.available_agents] if self.available_agents else ["ResearchAgent", "AnalysisAgent", "SkillsDevelopmentAgent", "SynthesisAgent"]

        # Try to parse numbered markdown format first: "1. **AgentName**: ..."
        numbered_bold_pattern = r'^\s*\d+\.\s*\*\*([A-Za-z]+Agent)\*\*:\s*(.+?)(?=\n\s*\d+\.\s*\*\*|\Z)'
        numbered_matches = re.findall(numbered_bold_pattern, text, re.MULTILINE | re.DOTALL)

        if numbered_matches:
            print(f"✅ Found {len(numbered_matches)} numbered bold tasks in fallback")
            for agent_name, task_desc in numbered_matches:
                tasks.append(Subtask(agent_name=agent_name, task=task_desc.strip(), completed=False))
            return tasks

        # Try to parse simple numbered format: "1. AgentName: ..."
        simple_numbered_pattern = r'^\s*\d+\.\s*([A-Za-z]+Agent):\s*(.+?)(?=\n\s*\d+\.\s*[A-Za-z]+Agent:|\Z)'
        simple_matches = re.findall(simple_numbered_pattern, text, re.MULTILINE | re.DOTALL)

        if simple_matches:
            print(f"✅ Found {len(simple_matches)} simple numbered tasks in fallback")
            for agent_name, task_desc in simple_matches:
                tasks.append(Subtask(agent_name=agent_name, task=task_desc.strip(), completed=False))
            return tasks

        # Fallback to bullet point format: "- AgentName: ..."
        task_pattern = r'^\s*-\s*([A-Za-z]+Agent):\s*(.+?)(?=\n\s*-\s*[A-Za-z]+Agent:|\s*$)'
        task_matches = re.findall(task_pattern, text, re.MULTILINE)

        if task_matches:
            for agent_name, task_desc in task_matches:
                tasks.append(Subtask(agent_name=agent_name, task=task_desc.strip(), completed=False))
                print(f"✅ Extracted fallback todo for {agent_name}: {task_desc.strip()[:100]}...")
            return tasks

        # Fallback: Look for patterns like "ResearchAgent will..." or "ResearchAgent: ..."
        for agent_name in agent_names:
            agent_pattern = rf'{agent_name}[\s:]+(.*?)(?=(?:{"|".join(agent_names)}|$))'
            match = re.search(agent_pattern, text, re.DOTALL | re.IGNORECASE)

            if match:
                task_desc = match.group(1).strip()
                if task_desc:
                    tasks.append(Subtask(agent_name=agent_name, task=task_desc, completed=False))
                    print(f"✅ Extracted fallback task for {agent_name}: {task_desc[:100]}...")
                # Note: No longer forcing all agents - only add if mentioned in the response

        # If no agents were found in the text, this indicates a problem with the LLM response
        if not tasks:
            print("⚠️ No agents found in LLM response, using minimal fallback")
            # Use first available agent as fallback, not hardcoded
            fallback_agent = agent_names[0] if agent_names else "ResearchAgent"
            tasks.append(Subtask(
                agent_name=fallback_agent,
                task="Research SAP career information and provide relevant guidance",
                completed=False
            ))

        return tasks


class PlannerAgent:
    def __init__(self, config: AgentConfig):
        self.config = config
        self.llm = SimplifiedAsyncOpenAI(**self.config.planner_model.model_provider.model_dump())
        self.jinja_env = get_jinja_env(pathlib.Path(__file__).parent / "prompts")
        self.planner_examples = self._load_planner_examples()
        self.available_agents = self._load_available_agents()
        self.output_parser = OutputParser(available_agents=self.available_agents)

        # Memory toolkit for context awareness
        self.memory_toolkit = None
        self.memory_context = ""
        self.conversation_history = []

        # Load custom instructions from sap_planner_agent.yaml if available
        self._load_custom_instructions()

    def _load_custom_instructions(self):
        """Load custom instructions from sap_planner_agent.yaml if available"""
        try:
            # Try multiple import strategies to handle different working directories
            ConfigLoader = None

            # Strategy 1: Relative import (when running from utu directory)
            try:
                from ..config import ConfigLoader
            except ImportError:
                # Strategy 2: Absolute import (when running from project root)
                try:
                    from utu.config import ConfigLoader
                except ImportError:
                    # Strategy 3: Direct file import
                    try:
                        import sys
                        import os
                        # Add current file's parent directory to path
                        current_dir = os.path.dirname(os.path.abspath(__file__))
                        parent_dir = os.path.dirname(current_dir)  # utu/agents
                        utu_dir = os.path.dirname(parent_dir)     # utu
                        if utu_dir not in sys.path:
                            sys.path.insert(0, utu_dir)

                        from utu.config import ConfigLoader
                    except ImportError:
                        print("⚠️ All import strategies failed for ConfigLoader")
                        self.custom_instructions = None
                        return

            custom_config = ConfigLoader.load_agent_config("sap_planner_agent")
            if hasattr(custom_config, 'agent') and hasattr(custom_config.agent, 'instructions'):
                print("✅ Loading custom planner instructions from sap_planner_agent.yaml")
                # Store custom instructions for use in prompts
                self.custom_instructions = custom_config.agent.instructions
                print(f"✅ Custom instructions length: {len(self.custom_instructions)} characters")

                # Update planner config name if specified
                if hasattr(custom_config.agent, 'name'):
                    self.config.planner_config["name"] = custom_config.agent.name
                    print(f"✅ Updated planner name to: {custom_config.agent.name}")
            else:
                print("⚠️ No custom instructions found in sap_planner_agent.yaml")
                self.custom_instructions = None
        except Exception as e:
            print(f"⚠️ Could not load custom instructions: {e}")
            self.custom_instructions = None

    @property
    def name(self) -> str:
        return self.config.planner_config.get("name", "planner")

    @property
    def tools(self) -> list:
        """Expose memory toolkit for telemetry tracking"""
        if self.memory_toolkit:
            # Create a simple tool representation for telemetry
            return [{
                'name': 'enhanced_memory',
                'description': 'Enhanced memory toolkit for conversation context',
                'toolkit': self.memory_toolkit
            }]
        return []

    @property
    def is_agent(self) -> bool:
        """Mark this as an agent for telemetry purposes"""
        return True

    @property
    def agent_type(self) -> str:
        """Specify agent type for telemetry"""
        return "PlannerAgent"

    def _load_planner_examples(self) -> list[dict]:
        examples_path = self.config.planner_config.get("examples_path", "")
        if examples_path and pathlib.Path(examples_path).exists():
            examples_path = pathlib.Path(examples_path)
        else:
            examples_path = pathlib.Path(__file__).parent / "data" / "planner_examples.json"
        with open(examples_path, encoding="utf-8") as f:
            return json.load(f)

    def _load_available_agents(self) -> list[AgentInfo]:
        available_agents = []
        for info in self.config.workers_info:
            available_agents.append(AgentInfo(**info))
        return available_agents

    async def build(self):
        """Initialize memory toolkit for planning"""
        print("🔍 Building planner agent...")

        # Try to load memory toolkit from sap_planner_agent config first
        try:
            print("🔍 Attempting to load memory toolkit from sap_planner_agent config...")

            # Use robust import strategy
            ConfigLoader = None
            try:
                from ..config import ConfigLoader
            except ImportError:
                try:
                    from utu.config import ConfigLoader
                except ImportError:
                    try:
                        import sys
                        import os
                        current_dir = os.path.dirname(os.path.abspath(__file__))
                        parent_dir = os.path.dirname(current_dir)
                        utu_dir = os.path.dirname(parent_dir)
                        if utu_dir not in sys.path:
                            sys.path.insert(0, utu_dir)
                        from utu.config import ConfigLoader
                    except ImportError:
                        print("⚠️ Could not import ConfigLoader")
                        self.memory_toolkit = None
                        return

            sap_config = ConfigLoader.load_agent_config("sap_planner_agent")

            if hasattr(sap_config, 'toolkits') and sap_config.toolkits and 'memory' in sap_config.toolkits:
                # Robust import for memory toolkit
                try:
                    from ..tools.memory_toolkit import EnhancedMemoryToolkit
                except ImportError:
                    try:
                        from utu.tools.memory_toolkit import EnhancedMemoryToolkit
                    except ImportError:
                        try:
                            import sys
                            import os
                            current_dir = os.path.dirname(os.path.abspath(__file__))
                            parent_dir = os.path.dirname(current_dir)
                            utu_dir = os.path.dirname(parent_dir)
                            if utu_dir not in sys.path:
                                sys.path.insert(0, utu_dir)
                            from utu.tools.memory_toolkit import EnhancedMemoryToolkit
                        except ImportError:
                            print("⚠️ Could not import EnhancedMemoryToolkit")
                            self.memory_toolkit = None
                            return

                memory_config = sap_config.toolkits['memory']
                print(f"Memory config from sap_planner_agent: {memory_config}")
                self.memory_toolkit = EnhancedMemoryToolkit(memory_config)
                await self.memory_toolkit.build()
                print("🧠 Memory toolkit initialized from sap_planner_agent config")
            else:
                print("⚠️ No memory toolkit in sap_planner_agent config")
                self.memory_toolkit = None

        except Exception as e:
            print(f"⚠️ Could not load from sap_planner_agent config: {e}")
            self.memory_toolkit = None

        # Fallback: Try to load from orchestra config
        if not self.memory_toolkit:
            try:
                print("🔍 Trying fallback: Load memory toolkit from orchestra config...")
                if hasattr(self.config, 'toolkits') and self.config.toolkits and 'memory' in self.config.toolkits:
                    # Use same robust import strategy for memory toolkit
                    try:
                        from ..tools.memory_toolkit import EnhancedMemoryToolkit
                    except ImportError:
                        try:
                            from utu.tools.memory_toolkit import EnhancedMemoryToolkit
                        except ImportError:
                            try:
                                import sys
                                import os
                                current_dir = os.path.dirname(os.path.abspath(__file__))
                                parent_dir = os.path.dirname(current_dir)
                                utu_dir = os.path.dirname(parent_dir)
                                if utu_dir not in sys.path:
                                    sys.path.insert(0, utu_dir)
                                from utu.tools.memory_toolkit import EnhancedMemoryToolkit
                            except ImportError:
                                print("⚠️ Could not import EnhancedMemoryToolkit for fallback")
                                return

                    memory_config = self.config.toolkits['memory']
                    self.memory_toolkit = EnhancedMemoryToolkit(memory_config)
                    await self.memory_toolkit.build()
                    print("🧠 Memory toolkit initialized from orchestra config")
                else:
                    print("⚠️ No memory toolkit in orchestra config either")
            except Exception as e:
                print(f"⚠️ Fallback also failed: {e}")

        # Load memory context for planning
        await self._read_memory_context()

    async def create_plan(self, task_recorder: OrchestraTaskRecorder) -> CreatePlanResult:
        # Read memory context first (MEMORY INTEGRATION - CRITICAL)
        await self._read_memory_context()

        # Use custom instructions if available, otherwise use default
        if self.custom_instructions:
            system_prompt = self.custom_instructions
        else:
            sp = self.jinja_env.get_template("planner_sp.j2").render(
                planning_examples=self._format_planner_examples(self.planner_examples)
            )
            system_prompt = sp

        # For custom instructions, we need to format the prompt differently
        if self.custom_instructions:
            # Add examples and agent information to custom instructions
            examples_section = self._format_planner_examples(self.planner_examples)
            agents_section = self._format_available_agents(self.available_agents)

            system_prompt = f"""{self.custom_instructions}

<planning_examples>
{examples_section}
</planning_examples>

<available_agents>
{agents_section}
</available_agents>
"""

        # Inject memory context into the user prompt
        background_info = self.memory_context if self.memory_context else ""

        up = self.jinja_env.get_template("planner_up.j2").render(
            available_agents=self._format_available_agents(self.available_agents),
            question=task_recorder.task,
            background_info=background_info,
        )

        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": up}]

        # Enable tool calling for memory functions
        tools = []
        if self.memory_toolkit:
            try:
                # Use OpenAI format to avoid JSON serialization issues
                tools = await self.memory_toolkit.get_tools_in_openai()
                print(f"🧠 Loaded {len(tools)} memory tools for planning")
            except Exception as e:
                print(f"⚠️ Failed to get memory tools: {e}")
                tools = []

        # Query with tool support using raw OpenAI API
        if self.llm.type == "chat.completions":
            # Use raw chat completions API to handle tool calls properly
            raw_response = await self.llm.chat_completions_create(
                messages=messages,
                tools=tools,
                **self.config.planner_model.model_params.model_dump()
            )

            # Check if there are tool calls
            if hasattr(raw_response.choices[0].message, 'tool_calls') and raw_response.choices[0].message.tool_calls:
                print(f"🧠 Planner received {len(raw_response.choices[0].message.tool_calls)} tool calls, executing...")
                tool_results = await self._handle_tool_calls(raw_response.choices[0].message.tool_calls)

                print(f"🧠 Tool results: {len(tool_results)} results")
                for i, result in enumerate(tool_results):
                    print(f"🧠 Tool result {i}: role={result.get('role')}, content_preview={result.get('content', '')[:50]}...")

                # Make follow-up call with tool results
                if tool_results:
                    print("🧠 Constructing proper message sequence for follow-up...")

                    # Create the assistant message that contains the tool_calls
                    assistant_message_with_tools = {
                        "role": "assistant",
                        "content": raw_response.choices[0].message.content,  # Original assistant content (may be empty)
                        "tool_calls": raw_response.choices[0].message.tool_calls  # The tool calls that were made
                    }

                    # Now construct the proper sequence: user -> assistant (with tool_calls) -> tool results -> follow-up
                    messages_with_tools = messages + [assistant_message_with_tools] + tool_results
                    print(f"🧠 Making follow-up call with {len(messages_with_tools)} messages in proper sequence...")

                    try:
                        print("🧠 Sending follow-up request to LLM...")
                        follow_up_response = await self.llm.chat_completions_create(
                            messages=messages_with_tools,
                            **self.config.planner_model.model_params.model_dump()
                        )
                        print("🧠 Follow-up response received from LLM")

                        response_content = follow_up_response.choices[0].message.content
                        print(f"🧠 Follow-up call completed. Response content length: {len(response_content or '')}")

                        if response_content:
                            print(f"🧠 Follow-up response preview: {response_content[:200]}...")
                            # Check if response contains XML tags
                            if '<analysis>' in response_content and '<plan>' in response_content:
                                print("🧠 Response contains required XML format ✅")
                            else:
                                print("🧠 WARNING: Response does not contain required XML format ❌")
                        else:
                            print("🧠 Follow-up response is empty! LLM returned no content.")
                            # If LLM returns empty content, use the original response content
                            response_content = raw_response.choices[0].message.content or "Tool executed successfully, but no additional planning content generated."

                    except Exception as e:
                        print(f"🧠 ERROR in follow-up call: {e}")
                        import traceback
                        traceback.print_exc()
                        # Fallback: use original response content
                        response_content = raw_response.choices[0].message.content or "Error in follow-up call, using original response."
                else:
                    print("🧠 No tool results to send in follow-up")
                    response_content = raw_response.choices[0].message.content or ""
            else:
                print("🧠 No tool calls in response")
                response_content = raw_response.choices[0].message.content or ""

        else:
            # Fallback to responses API (though it may not handle tools well)
            response = await self.llm.query_one(
                messages=messages,
                tools=tools,
                **self.config.planner_model.model_params.model_dump()
            )
            response_content = response

        # Parse the plan from the response
        plan_result = self.output_parser.parse(response_content)

        print(f"📋 PLAN GENERATED: {len(plan_result.analysis)} chars analysis, {len(plan_result.todo)} tasks")
        for i, task in enumerate(plan_result.todo[:3]):  # Show first 3 tasks
            print(f"   Task {i+1}: {task.agent_name}")

        # FORCE MEMORY STORAGE - CRITICAL FOR TELEMETRY TRACKING
        print("💾 STARTING MANDATORY MEMORY STORAGE...")
        await self._store_planning_insights(task_recorder.task, plan_result)
        print("✅ MEMORY STORAGE METHOD CALLED")

        # Verify memory was actually stored
        if self.memory_toolkit:
            try:
                memory_after = await self.memory_toolkit.enhanced_memory(action="read")
                if "PLANNING SESSION" in memory_after:
                    session_count = memory_after.count("PLANNING SESSION")
                    print(f"✅ MEMORY VERIFICATION: {session_count} planning sessions stored")
                else:
                    print("❌ MEMORY VERIFICATION FAILED: No planning sessions found")
            except Exception as e:
                print(f"❌ MEMORY VERIFICATION ERROR: {e}")

        print("🏁 PLAN GENERATION COMPLETE WITH MEMORY STORAGE")
        return plan_result

    async def _handle_tool_calls(self, tool_calls) -> list[dict]:
        """Handle tool calls from the LLM response and return results for follow-up"""
        if not tool_calls:
            return []

        tool_results = []

        for tool_call in tool_calls:
            try:
                if tool_call.function.name == "enhanced_memory":
                    # Parse the arguments
                    args = json.loads(tool_call.function.arguments) if isinstance(tool_call.function.arguments, str) else tool_call.function.arguments

                    action = args.get("action")
                    content = args.get("content", "")
                    old_string = args.get("old_string", "")
                    new_string = args.get("new_string", "")

                    # Execute the memory function
                    if self.memory_toolkit:
                        print(f"🧠 Executing memory.{action}...")
                        result = await self.memory_toolkit.enhanced_memory(
                            action=action,
                            content=content,
                            old_string=old_string,
                            new_string=new_string
                        )
                        print(f"🧠 Memory tool call executed: {action} - Result length: {len(result)}")
                        print(f"🧠 Memory result preview: '{result[:100]}'...")

                        # Format result for follow-up call
                        tool_result = {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": result
                        }
                        tool_results.append(tool_result)
                        print(f"🧠 Added tool result for call_id: {tool_call.id}")
                    else:
                        print("⚠️ Memory toolkit not available for tool call")
                        tool_results.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": "Memory toolkit not available"
                        })
            except Exception as e:
                print(f"⚠️ Failed to handle tool call: {e}")
                import traceback
                traceback.print_exc()
                tool_results.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": f"Error executing tool: {str(e)}"
                })

        return tool_results

    def _format_planner_examples(self, examples: list[dict]) -> str:
        # format examples to string. example: {question/user_query, available_agents, analysis, plan}
        examples_str = []
        for example in examples:
            # Handle both 'question' and 'user_query' keys for compatibility
            question = example.get('question') or example.get('user_query', 'Unknown question')
            examples_str.append(
                f"Question: {question}\n"
                f"<analysis>{example['analysis']}</analysis>\n"
                f"<plan>{json.dumps(example['plan'], ensure_ascii=False)}</plan>\n"
            )
        return "\n".join(examples_str)

    def _format_available_agents(self, agents: list[AgentInfo]) -> str:
        agents_str = []
        for agent in agents:
            agents_str.append(
                f"- {agent.name}: {agent.desc}\n  Best for: {agent.strengths}\n"
                if agent.strengths
                else f"  Weaknesses: {agent.weaknesses}\n"
                if agent.weaknesses
                else ""
            )
        return "\n".join(agents_str)

    async def _read_memory_context(self) -> None:
        """Read memory context for planning decisions"""
        if not self.memory_toolkit:
            self.memory_context = ""
            return

        try:
            memory_content = await self.memory_toolkit.enhanced_memory(action="read")
            if memory_content and memory_content.strip():
                self.memory_context = f"""
MEMORY CONTEXT FROM PREVIOUS CONVERSATIONS:
{memory_content}

INSTRUCTIONS: Use this context to understand the user's career goals, previous planning decisions, and preferences. Reference the target role and build upon previous analysis rather than starting fresh.
"""
                print(f"🧠 Loaded memory context ({len(memory_content)} chars)")
            else:
                self.memory_context = ""
                print("🧠 No previous memory context found")
        except Exception as e:
            print(f"⚠️ Failed to read memory context: {e}")
            self.memory_context = ""

    async def _store_planning_insights(self, user_query: str, plan_result: CreatePlanResult) -> None:
        """Store planning insights using LLM tool calling mechanism for telemetry tracking"""
        print(f"🔍 _store_planning_insights called with query: {user_query[:50]}...")

        if not self.memory_toolkit:
            print("❌ CRITICAL: No memory toolkit available for storing planning insights")
            return

        print("✅ Memory toolkit available, proceeding with storage...")

        try:
            # Extract target role from analysis if possible
            target_role = ""
            analysis_lower = plan_result.analysis.lower()
            if "solution architect" in analysis_lower:
                target_role = "SAP Solution Architect"
            elif "cloud engineer" in analysis_lower:
                target_role = "Cloud Engineer"
            elif "consultant" in analysis_lower:
                target_role = "SAP Consultant"
            elif "developer" in analysis_lower:
                target_role = "SAP Developer"
            elif "administrator" in analysis_lower:
                target_role = "SAP Administrator"

            # Create structured memory entry with proper markdown format
            import datetime
            timestamp = datetime.datetime.now().isoformat()

            # Build the planning insights string with proper formatting
            analysis_summary = plan_result.analysis[:200] + ("..." if len(plan_result.analysis) > 200 else "")

            task_lines = []
            for i, task in enumerate(plan_result.todo):
                task_desc = task.task[:150] + ("..." if len(task.task) > 150 else "")
                task_lines.append(f"{i+1}. **{task.agent_name}**: {task_desc}")

            planning_insights = f"""
## PLANNING SESSION - {timestamp}
**User Query:** {user_query}
**Target Role:** {target_role or "Not specified"}
**Analysis Summary:** {analysis_summary}

### Assigned Tasks:
{chr(10).join(task_lines)}

---
"""

            print(f"🧠 Storing planning insights via tool call mechanism ({len(planning_insights)} chars)")
            print(f"📝 Planning insights preview: {planning_insights[:100]}...")

            # Use the same pattern as worker agents: direct tool execution
            # This mimics how ResearchAgent and other workers call memory tools
            if hasattr(self.memory_toolkit, 'enhanced_memory'):
                print("🔧 Calling memory_toolkit.enhanced_memory...")
                # Call the memory tool method directly (same as worker agents do)
                result = await self.memory_toolkit.enhanced_memory(action="write", content=planning_insights)
                print(f"✅ Memory tool executed successfully: {result}")

                # For telemetry tracking, we can add a marker that this was a tool call
                # This helps identify memory operations in telemetry logs
                print(f"🎯 TOOL CALL: enhanced_memory(action='write', content_length={len(planning_insights)})")
                print("✅ PLANNING INSIGHTS SUCCESSFULLY STORED IN MEMORY")
            else:
                print("❌ CRITICAL: Memory toolkit does not have enhanced_memory method")

        except Exception as e:
            print(f"❌ Failed to store planning insights: {e}")
            import traceback
            traceback.print_exc()

    def update_conversation_history(self, user_input: str, response: str) -> None:
        """Update conversation history for context"""
        self.conversation_history.append({
            "user_input": user_input,
            "response": response,
            "timestamp": "current_time"
        })
        # Keep only last 10 exchanges to support enhanced memory (increased from 5)
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]
