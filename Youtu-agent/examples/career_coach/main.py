#!/usr/bin/env python3
"""
Career Coach Agent Example

This script demonstrates how to run the Career Coach agent using Youtu-agent framework.
"""

import asyncio
import pathlib
from utu.agents import SimpleAgent
from utu.config import ConfigLoader


async def main():
    """Run the Career Coach agent with sample interactions."""

    print("🤖 Career Coach Agent")
    print("=" * 50)

    # Load the agent configuration
    config = ConfigLoader.load_agent_config("career_coach")

    # Create and run the agent
    async with SimpleAgent(config=config) as agent:
        print("\n💬 Career Coach is ready! Here are some example interactions:\n")

        # Example 1: Career advice
        print("Example 1: General career advice")
        response1 = await agent.chat(
            "I'm a software developer with 3 years of experience. I'm considering a career switch to data science. What should I do?"
        )
        print(f"Response: {response1}\n")

        # Example 2: Resume review (if user provides a resume file)
        resume_path = pathlib.Path(__file__).parent / "sample_resume.pdf"
        if resume_path.exists():
            print("Example 2: Resume analysis")
            response2 = await agent.chat(
                f"Please analyze my resume at {resume_path} and provide feedback on how to improve it for a data science role."
            )
            print(f"Response: {response2}\n")
        else:
            print("Example 2: Job market research")
            response2 = await agent.chat(
                "What are the current job market trends for data science positions? What skills are most in demand?"
            )
            print(f"Response: {response2}\n")

        # Example 3: Interview preparation
        print("Example 3: Interview preparation")
        response3 = await agent.chat(
            "I'm preparing for a data science interview. Can you help me practice common technical interview questions?"
        )
        print(f"Response: {response3}\n")

        # Interactive mode
        print("\n🎯 Interactive Career Coaching Session")
        print("Type your career-related questions below. Type 'quit' to exit.\n")

        while True:
            user_input = input("You: ")
            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("\n👋 Thanks for using Career Coach! Best of luck with your career journey!")
                break

            try:
                response = await agent.chat(user_input)
                print(f"\nCareer Coach: {response}\n")
            except Exception as e:
                print(f"Error: {e}\n")


if __name__ == "__main__":
    asyncio.run(main())
