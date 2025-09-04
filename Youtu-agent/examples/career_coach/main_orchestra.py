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

from utu.agents import OrchestraAgent
from utu.config import ConfigLoader


async def main():
    """Run the SAP Career Coach orchestra agent."""

    print("🎭 SAP Career Coach Orchestra")
    print("=" * 50)

    # Load the orchestra agent configuration
    config = ConfigLoader.load_agent_config("career_coach_orchestra")

    # Set up the planner examples path
    config.planner_config["examples_path"] = pathlib.Path(__file__).parent / "planner_examples.json"

    # Create and run the orchestra agent
    async with OrchestraAgent(config) as agent:
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
        print("Commands: 'quit' to exit, 'help' for guidance, 'clear' to start fresh\n")

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
                print()
                continue

            elif user_input.lower() == 'clear':
                conversation_history = []
                clarification_count = 0
                print("🧹 Conversation history cleared. Let's start fresh!\n")
                continue

            try:
                # Build context-aware query
                if conversation_history:
                    context_query = f"Previous conversation context:\n"
                    for i, (q, r) in enumerate(conversation_history[-3:], 1):  # Last 3 exchanges
                        context_query += f"Q{i}: {q}\nA{i}: {r[:200]}...\n\n"
                    context_query += f"Current user input: {user_input}"
                else:
                    context_query = user_input

                print("\n🔄 Processing your SAP career request with specialized agents...")
                if clarification_count > 0:
                    print(f"💭 This is clarification round {clarification_count}/{max_clarifications}")

                response = await agent.run(context_query)

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

