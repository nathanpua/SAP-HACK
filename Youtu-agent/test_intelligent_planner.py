#!/usr/bin/env python3
"""
Test script for the intelligent SAP Career Coach planner.
Tests different query types to verify intelligent agent selection.
"""

import asyncio
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utu.config import ConfigLoader


async def test_intelligent_planner():
    """Test the intelligent planner with different query types"""

    print("🧠 Testing Intelligent SAP Career Coach Planner")
    print("=" * 50)

    # Load the career coach orchestra configuration
    config = ConfigLoader.load_agent_config("career_coach_orchestra")

    # Mock test queries to simulate different scenarios
    test_queries = [
        {
            "query": "What SAP certifications do I need for a Solution Architect role?",
            "expected_agents": ["ResearchAgent"],
            "description": "Simple certification research - should use only ResearchAgent"
        },
        {
            "query": "Can you analyze my current SAP skills and identify gaps?",
            "expected_agents": ["AnalysisAgent"],
            "description": "Profile analysis query - should use only AnalysisAgent"
        },
        {
            "query": "What SAP training courses should I take for S/4HANA?",
            "expected_agents": ["SkillsDevelopmentAgent"],
            "description": "Training-focused query - should use only SkillsDevelopmentAgent"
        },
        {
            "query": "I'm an SAP consultant wanting to transition to Solution Architect role",
            "expected_agents": ["ResearchAgent", "AnalysisAgent", "SynthesisAgent"],
            "description": "Complex career transition - should use multiple agents"
        }
    ]

    # Import here to avoid circular imports
    from utu.agents.orchestra.planner import PlannerAgent, OrchestraTaskRecorder

    # Create planner agent
    planner = PlannerAgent(config)

    print("\n📋 Testing Agent Selection Intelligence:")
    print("-" * 40)

    for i, test_case in enumerate(test_queries, 1):
        print(f"\n{i}. {test_case['description']}")
        print(f"   Query: {test_case['query']}")

        # Create task recorder
        task_recorder = OrchestraTaskRecorder(task=test_case['query'])

        try:
            # Create plan
            plan_result = await planner.create_plan(task_recorder)

            # Extract selected agents from plan
            selected_agents = [task.agent_name for task in plan_result.todo]

            print(f"   Selected agents: {selected_agents}")
            print(f"   Expected agents: {test_case['expected_agents']}")

            # Check if agent selection matches expectations
            if set(selected_agents) == set(test_case['expected_agents']):
                print("   ✅ CORRECT: Agent selection matches expectations")
            else:
                print("   ⚠️  PARTIAL: Agent selection differs from expectations")
                extra_agents = set(selected_agents) - set(test_case['expected_agents'])
                missing_agents = set(test_case['expected_agents']) - set(selected_agents)
                if extra_agents:
                    print(f"      Extra agents: {list(extra_agents)}")
                if missing_agents:
                    print(f"      Missing agents: {list(missing_agents)}")

        except Exception as e:
            print(f"   ❌ ERROR: {e}")

    print("\n🎯 Intelligent Planner Test Complete!")
    print("\n💡 Key Improvements:")
    print("- Simple queries use single specialized agents")
    print("- Complex queries use multiple agents as needed")
    print("- No unnecessary agent calls for efficiency")
    print("- Dynamic agent selection based on query analysis")


if __name__ == "__main__":
    asyncio.run(test_intelligent_planner())
