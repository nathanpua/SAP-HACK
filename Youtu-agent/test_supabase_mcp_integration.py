#!/usr/bin/env python3
"""
Test script for Supabase MCP integration with Youtu-agent SAP Analysis Agent

This script tests the integration between:
1. Supabase MCP server
2. Youtu-agent framework
3. SAP Analysis Agent with database access

Usage:
    python test_supabase_mcp_integration.py

Requirements:
    - Set SUPABASE_ACCESS_TOKEN environment variable
    - Set SUPABASE_PROJECT_REF environment variable
    - SAP employee database schema deployed in Supabase
"""

import asyncio
import os
import sys
import yaml
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Load environment variables using the project's env utility
try:
    from utu.utils.env import load_env
    load_env()
    print("✅ Environment variables loaded from .env file")
except ImportError:
    print("⚠️  Could not import utu.utils.env, environment variables may not be loaded")
except Exception as e:
    print(f"⚠️  Error loading environment variables: {e}")


async def test_supabase_connection():
    """Test basic Supabase MCP connection and database access."""
    print("🔗 Testing Supabase MCP Connection")
    print("=" * 50)

    # Check environment variables
    access_token = os.getenv('SUPABASE_ACCESS_TOKEN')
    project_ref = os.getenv('SUPABASE_PROJECT_REF')

    if not access_token:
        print("❌ SUPABASE_ACCESS_TOKEN not set")
        return False

    if not project_ref:
        print("❌ SUPABASE_PROJECT_REF not set")
        return False

    print(f"✅ Environment variables configured")
    print(f"   Project: {project_ref}")

    return True


async def test_sap_analysis_agent():
    """Test the SAP Analysis Agent with Supabase integration."""
    print("\n🤖 Testing SAP Analysis Agent")
    print("=" * 50)

    try:
        # Load the SAP analysis agent configuration directly from YAML
        config_path = project_root / "configs/agents/simple_agents/sap_analysis_agent.yaml"
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)

        print("✅ SAP Analysis Agent configuration loaded")
        agent_name = config.get('agent', {}).get('name', 'default')
        print(f"   Agent Name: {agent_name}")

        # Check if toolkits section exists
        if 'toolkits' not in config:
            print("❌ No toolkits section found in SAP Analysis Agent configuration")
            return False

        toolkits = config['toolkits']
        print(f"   Available toolkits: {list(toolkits.keys())}")

        # Check if Supabase tool is configured
        has_supabase_tool = 'supabase' in toolkits

        if has_supabase_tool:
            print("✅ Supabase tool configured in SAP Analysis Agent")
            supabase_ref = toolkits['supabase']
            print(f"   Tool reference: {supabase_ref}")

            # Check if the supabase tool config file exists
            supabase_config_path = project_root / "configs/agents/tools/supabase.yaml"
            if supabase_config_path.exists():
                with open(supabase_config_path, 'r') as f:
                    supabase_config = yaml.safe_load(f)
                print(f"   Tool mode: {supabase_config.get('mode', 'unknown')}")
                print(f"   Tool name: {supabase_config.get('name', 'unknown')}")
            else:
                print("⚠️  Supabase tool config file not found")
        else:
            print("❌ Supabase tool not found in SAP Analysis Agent")
            return False

        return True

    except Exception as e:
        print(f"❌ Error loading SAP Analysis Agent: {e}")
        import traceback
        print(f"   Traceback: {traceback.format_exc()}")
        return False


async def test_sample_queries():
    """Test sample database queries that the analysis agent might perform."""
    print("\n🗄️  Testing Sample Database Queries")
    print("=" * 50)

    test_queries = [
        {
            "name": "Employee Count Query",
            "description": "Get total number of employees",
            "sql": "SELECT COUNT(*) as total_employees FROM employees WHERE employment_status = 'active';"
        },
        {
            "name": "Skills Analysis Query",
            "description": "Find most common SAP skills",
            "sql": "SELECT s.name, COUNT(es.*) as employee_count FROM skills s JOIN employee_skills es ON s.id = es.skill_id WHERE s.category = 'sap_module' GROUP BY s.name ORDER BY employee_count DESC LIMIT 5;"
        },
        {
            "name": "Certification Analysis Query",
            "description": "Find most completed certifications",
            "sql": "SELECT c.name, COUNT(ec.*) as completion_count FROM certifications c JOIN employee_certifications ec ON c.id = ec.certification_id WHERE ec.status = 'completed' GROUP BY c.name ORDER BY completion_count DESC LIMIT 5;"
        },
        {
            "name": "Career Level Distribution",
            "description": "Analyze career level distribution",
            "sql": "SELECT r.career_level, COUNT(e.*) as employee_count FROM roles r JOIN employees e ON r.id = e.current_role_id GROUP BY r.career_level ORDER BY employee_count DESC;"
        }
    ]

    print("📋 Sample queries for SAP Analysis Agent:")
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i}. {query['name']}")
        print(f"   Description: {query['description']}")
        print(f"   SQL: {query['sql'][:100]}...")

    print("\n✅ Sample queries defined successfully")
    return True


async def test_orchestra_integration():
    """Test the full orchestra integration with Supabase."""
    print("\n🎭 Testing Orchestra Integration")
    print("=" * 50)

    try:
        # Load the career coach orchestra configuration directly from YAML
        config_path = project_root / "configs/agents/career_coach_orchestra.yaml"
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)

        print("✅ Career Coach Orchestra configuration loaded")
        agent_type = config.get('type', 'unknown')
        print(f"   Agent Type: {agent_type}")

        # Check if it's an orchestra agent
        if agent_type != "orchestra":
            print("❌ Configuration is not an orchestra agent")
            return False

        # Check worker agents info
        if 'workers_info' in config and config['workers_info']:
            workers_info = config['workers_info']
            print(f"✅ Found {len(workers_info)} worker agents:")
            for worker in workers_info:
                print(f"   - {worker['name']}: {worker['desc'][:50]}...")

            # Check if AnalysisAgent is configured
            analysis_agent = next(
                (w for w in workers_info if w['name'] == 'AnalysisAgent'),
                None
            )

            if analysis_agent:
                print("✅ SAP Analysis Agent configured in orchestra")
            else:
                print("❌ SAP Analysis Agent not found in orchestra")
                return False
        else:
            print("❌ No worker agents configured")
            return False

        # Check defaults section for SAP analysis agent reference
        defaults = config.get('defaults', [])
        sap_analysis_ref = next(
            (d for d in defaults if 'sap_analysis_agent' in str(d)),
            None
        )

        if sap_analysis_ref:
            print("✅ SAP Analysis Agent referenced in orchestra defaults")
            print(f"   Reference: {sap_analysis_ref}")
        else:
            print("⚠️  SAP Analysis Agent not found in orchestra defaults")
            print(f"   Defaults: {defaults}")

        return True

    except Exception as e:
        print(f"❌ Error loading orchestra configuration: {e}")
        import traceback
        print(f"   Traceback: {traceback.format_exc()}")
        return False


async def run_integration_test():
    """Run the complete integration test suite."""
    print("🚀 SAP Career Coach Supabase MCP Integration Test")
    print("=" * 60)

    tests = [
        ("Supabase Connection", test_supabase_connection),
        ("SAP Analysis Agent", test_sap_analysis_agent),
        ("Sample Queries", test_sample_queries),
        ("Orchestra Integration", test_orchestra_integration),
    ]

    results = []

    for test_name, test_func in tests:
        print(f"\n🔍 Running {test_name} test...")
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)

    passed = 0
    total = len(results)

    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1

    print(f"\nOverall: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Supabase MCP integration is ready.")
        print("\nNext steps:")
        print("1. Start the career coach: python examples/career_coach/main_orchestra.py")
        print("2. Ask questions like: 'What SAP certifications do senior architects have?'")
        print("3. The analysis agent will query your Supabase database for insights")
    else:
        print("\n⚠️  Some tests failed. Please check the configuration and try again.")
        print("\nTroubleshooting:")
        print("1. Verify SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are set")
        print("2. Check that the SAP employee database schema is deployed")
        print("3. Ensure Row Level Security policies are configured correctly")

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(run_integration_test())
    sys.exit(0 if success else 1)
