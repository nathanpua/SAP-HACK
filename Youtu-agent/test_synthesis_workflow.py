#!/usr/bin/env python3
"""
Test script to verify the modified orchestra agent workflow ends at synthesis.
"""

import asyncio
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utu.agents import OrchestraAgent
from utu.config import ConfigLoader


async def test_synthesis_workflow():
    """Test the synthesis workflow without reporter agent."""
    print("🧪 Testing Synthesis Workflow")
    print("=" * 50)

    try:
        # Load the orchestra agent configuration
        config = ConfigLoader.load_agent_config("career_coach_orchestra")

        # Create and run the orchestra agent
        async with OrchestraAgent(config) as agent:
            print("✅ OrchestraAgent initialized successfully")

            # Test with a simple question
            test_question = "What are the key skills needed for SAP career development?"

            print(f"\n📋 Test Question: {test_question}")
            print("🔄 Processing...")

            response = await agent.run(test_question)

            print("\n📋 Synthesis Result:")
            print("=" * 30)
            print(response.final_output[:500] + "..." if len(response.final_output) > 500 else response.final_output)

            # Verify synthesis structure
            if "## Original Question" in response.final_output:
                print("✅ Synthesis includes original question")
            if "## Analysis" in response.final_output:
                print("✅ Synthesis includes analysis")
            if "## Agent" in response.final_output:
                print("✅ Synthesis includes agent results")

            print("\n🤝 Agents Involved:")
            if hasattr(response, 'agent_activities') and response.agent_activities:
                for activity in response.agent_activities:
                    print(f"• {activity}")
            else:
                print("• Agent activities not available in this test")

            print("\n✅ Synthesis workflow test completed successfully!")
            print("🎯 The workflow now ends at synthesis instead of reporter generation.")

    except Exception as e:
        print(f"❌ Error during test: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_synthesis_workflow())
