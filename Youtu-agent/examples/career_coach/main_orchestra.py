#!/usr/bin/env python3
"""
SAP Career Coach Orchestra Agent Example

This script demonstrates the multi-agent orchestra system for comprehensive SAP career coaching.
"""

import asyncio
import pathlib
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import env module first to load environment variables
from utu.utils.env import EnvUtils

from utu.agents import OrchestraAgent
from utu.config import ConfigLoader
from utu.agents.orchestra.context_builder import ContextBuilder, get_memory_summary, build_memory_context_string


async def update_agent_memories(agent, user_input, context_query):
    """Update all agents' memories with conversation context"""
    try:
        for agent_name, worker in agent.worker_agents.items():
            if hasattr(worker.agent, 'tools') and worker.agent.tools:
                memory_tool = worker.agent.tools.get('enhanced_memory')
                if memory_tool:
                    current_memory = await memory_tool.enhanced_memory(action="read")
                    # Structure the memory update
                    new_memory_content = f"{current_memory}\n\n--- NEW INTERACTION ---\n"
                    new_memory_content += f"User Input: {user_input[:200]}...\n"
                    new_memory_content += f"Context: {context_query[:300]}...\n"
                    new_memory_content += f"Timestamp: {asyncio.get_event_loop().time()}\n"
                    await memory_tool.enhanced_memory(action="write", content=new_memory_content)
                    print(f"✅ Updated memory for {agent_name}")
    except Exception as e:
        print(f"⚠️ Memory update warning: {e}")


async def update_agent_memories_with_response(agent, response_output):
    """Update agent memories with the latest response"""
    try:
        for agent_name, worker in agent.worker_agents.items():
            if hasattr(worker.agent, 'tools') and worker.agent.tools:
                memory_tool = worker.agent.tools.get('enhanced_memory')
                if memory_tool:
                    current_memory = await memory_tool.enhanced_memory(action="read")
                    # Append latest response to memory
                    updated_memory = f"{current_memory}\n\n--- LATEST RESPONSE ---\n"
                    updated_memory += f"Response: {response_output[:300]}...\n"
                    updated_memory += f"Timestamp: {asyncio.get_event_loop().time()}\n"
                    await memory_tool.enhanced_memory(action="write", content=updated_memory)
    except Exception as e:
        print(f"⚠️ Response memory update warning: {e}")


async def get_memory_summary(agent):
    """Get a summary of all agent memories"""
    memory_summary = {}
    try:
        for agent_name, worker in agent.worker_agents.items():
            if hasattr(worker.agent, 'tools') and worker.agent.tools:
                memory_tool = worker.agent.tools.get('enhanced_memory')
                if memory_tool:
                    memory = await memory_tool.enhanced_memory(action="read")
                    if memory:
                        # Extract key insights from memory (increased from 200 to 1000 chars for enhanced memory)
                        memory_summary[agent_name] = memory[-1000:] if len(memory) > 1000 else memory
    except Exception as e:
        print(f"⚠️ Memory summary warning: {e}")
    return memory_summary


async def clear_agent_memories(agent):
    """Clear all agent memories (for reset functionality)"""
    try:
        for agent_name, worker in agent.worker_agents.items():
            if hasattr(worker.agent, 'tools') and worker.agent.tools:
                memory_tool = worker.agent.tools.get('enhanced_memory')
                if memory_tool:
                    await memory_tool.enhanced_memory(action="write", content="")
                    print(f"🧹 Cleared memory for {agent_name}")
    except Exception as e:
        print(f"⚠️ Memory clear warning: {e}")


async def show_memory_status(agent):
    """Display current memory status for all agents"""
    print("\n🧠 Agent Memory Status:")
    memory_summary = await get_memory_summary(agent)
    for agent_name, memory in memory_summary.items():
        memory_lines = memory.count('\n') + 1
        print(f"  {agent_name}: {memory_lines} entries ({len(memory)} chars)")
        if memory_lines > 0:
            print(f"    Latest: {memory.split('---')[-1][:100]}...")
    print()


async def main():
    """Run the SAP Career Coach orchestra agent."""

    print("🎭 SAP Career Coach Orchestra")
    print("=" * 50)

    # Load the orchestra agent configuration
    config = ConfigLoader.load_agent_config("career_coach_orchestra")

    # Set up the planner examples path
    config.planner_config["examples_path"] = pathlib.Path(__file__).parent / "planner_examples.json"

    # Create and run the orchestra agent
    agent = OrchestraAgent(config)
    await agent.build()
    print("✅ OrchestraAgent initialized with memory-enabled SAPPlannerAgent")

    async with agent:
        print("\n🤖 SAP Multi-Agent Career Coach is ready!")
        print("This system uses specialized SAP-focused agents for comprehensive career guidance.\n")

        # Debug: Show agent configuration immediately
        # print(f"🔍 Debug: Worker agents available: {list(agent.worker_agents.keys())}")
        # print(f"🔍 Debug: Workers info keys: {list(agent.config.workers_info.keys()) if hasattr(agent.config.workers_info, 'keys') else agent.config.workers_info}")
        # print()

        # Example SAP career coaching scenarios
        examples = [
            "I'm an SAP consultant with 3 years experience wanting to become a Solution Architect. What's my path?",
            "I specialize in SAP HCM and want to transition to SAP SuccessFactors. How should I plan this?",
            "I'm an SAP developer interested in moving into SAP cloud solutions. What certifications do I need?",
            "I want to advance from SAP functional consultant to SAP presales. What skills should I develop?",
            "How can I build expertise in SAP S/4HANA and position myself for senior technical roles?"
        ]

        print("💡 Example SAP Career Coaching Scenarios:")
        for i, example in enumerate(examples, 1):
            print(f"{i}. {example}")

        print("\n🎯 Interactive SAP Career Coaching")
        print("Ask complex SAP career questions. The system will ask clarifying questions when needed.\n")
        print("Commands: 'quit' to exit, 'help' for guidance, 'clear' to start fresh, 'memory' to check memory status\n")

        conversation_history = []
        clarification_count = 0
        max_clarifications = 3

        while True:
            user_input = input("You: ").strip()

            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("\n👋 Thank you for using SAP Career Coach! Your SAP journey awaits!")
                break

            elif user_input.lower() == 'help':
                print("\n📖 SAP Career Coach Help:")
                print("• Ask about SAP career paths, certifications, or job transitions")
                print("• Share your current SAP experience and goals")
                print("• The system will ask clarifying questions to provide better guidance")
                print("• You can provide more details at any time to refine recommendations")
                print("• Use 'memory' to check current memory status")
                print("• Use 'memory-clear' to reset agent memories only")
                print("• Use 'memory-export' to view detailed memory contents")
                print("• Use 'clear' to reset conversation and agent memories")
                print()
                continue

            elif user_input.lower() == 'memory':
                await show_memory_status(agent)
                continue

            elif user_input.lower() == 'memory-clear':
                print("🧹 Clearing all agent memories...\n")
                await clear_agent_memories(agent)
                print("✅ All memories cleared. Agent context has been reset.\n")
                continue

            elif user_input.lower() == 'memory-export':
                print("📤 Exporting current memory state...")
                memory_summary = await get_memory_summary(agent)
                for agent_name, memory in memory_summary.items():
                    print(f"\n--- {agent_name} Memory ---")
                    print(memory[:500] + ("..." if len(memory) > 500 else ""))
                print("\n💾 Memory export complete.\n")
                continue

            elif user_input.lower() == 'clear':
                conversation_history = []
                clarification_count = 0
                print("🧹 Conversation history cleared. Clearing agent memories...\n")
                await clear_agent_memories(agent)
                print("✅ All memories cleared. Let's start fresh!\n")
                continue

            try:
                # Build enhanced memory-aware context (NEW MEMORY INTEGRATION)
                print("\n🔄 Building memory-aware context for your SAP career request...")
                context_builder = ContextBuilder()

                # Get agent memories for context
                agent_memories = await get_memory_summary(agent)
                memory_context = await context_builder.build_memory_context_string(
                    agent_memories, conversation_history
                )

                # Build comprehensive context query
                if memory_context:
                    enhanced_query = f"""{memory_context}

CURRENT USER INPUT:
{user_input}

MEMORY-AWARE PROCESSING:
- Reference target career role from previous conversations
- Build upon existing analysis and planning decisions
- Maintain conversation continuity and context awareness
- Use agent memories to understand previous insights"""
                else:
                    enhanced_query = f"""CURRENT USER INPUT:
{user_input}

NEW CONVERSATION:
- This appears to be the start of a new conversation
- Focus on understanding career goals and current situation"""

                print("🧠 Memory context loaded and integrated")
                if clarification_count > 0:
                    print(f"💭 This is clarification round {clarification_count}/{max_clarifications}")

                # Update agent memories with enhanced context before processing
                print("📝 Updating agent memories with enhanced context...")
                await update_agent_memories(agent, user_input, enhanced_query)

                response = await agent.run(enhanced_query)

                # Update agent memories with the response after processing
                print("💾 Storing response in agent memories...")
                await update_agent_memories_with_response(agent, response.final_output)

                # Store in conversation history
                conversation_history.append((user_input, response.final_output))

                print("\n📋 SAP Career Guidance Report:")
                print(f"{response.final_output}\n")

                # Show which agents were involved
                if hasattr(response, 'agent_activities') and response.agent_activities:
                    print("🤝 SAP Agents Involved:")
                    for activity in response.agent_activities:
                        print(f"• {activity}")
                    print()

                # Check if response contains clarifying questions
                response_lower = response.final_output.lower()
                if any(phrase in response_lower for phrase in [
                    "could you", "can you", "would you", "what about", "tell me more",
                    "clarify", "specify", "elaborate", "additional information"
                ]):
                    clarification_count += 1
                    if clarification_count <= max_clarifications:
                        print(f"💡 The system asked clarifying questions. You can provide more details or ask a new question.\n")
                    else:
                        print(f"⚠️ Maximum clarification rounds reached. The system provided guidance based on available information.\n")
                        clarification_count = 0  # Reset for next conversation
                else:
                    clarification_count = 0  # Reset when we get a complete response

                # Show conversation summary
                if len(conversation_history) > 1:
                    print("📝 Conversation Summary:")
                    print(f"• Total exchanges: {len(conversation_history)}")
                    print(f"• Clarification rounds: {clarification_count}")
                    print()

            except Exception as e:
                print(f"❌ Error: {e}\n")
                print("💡 Try rephrasing your question or providing more specific details about your SAP background.\n")


if __name__ == "__main__":
    asyncio.run(main())

