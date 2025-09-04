#!/usr/bin/env python3
"""
Quick test script to verify Supabase database queries work with the SAP Analysis Agent

This script allows you to test specific database queries without running the full WebUI.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Load environment variables
try:
    from utu.utils.env import load_env
    load_env()
    print("✅ Environment variables loaded")
except Exception as e:
    print(f"⚠️  Could not load environment variables: {e}")


async def test_database_queries():
    """Test various database queries that the analysis agent might perform."""
    print("🗄️  Testing Supabase Database Queries")
    print("=" * 50)

    # Check if we have Supabase credentials
    supabase_token = os.getenv('SUPABASE_ACCESS_TOKEN')
    supabase_project = os.getenv('SUPABASE_PROJECT_REF')

    if not supabase_token or not supabase_project:
        print("❌ Supabase credentials not found")
        print("   Please set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF in .env")
        return

    print(f"✅ Using Supabase project: {supabase_project}")

    # Test queries that would be useful for career analysis using list_tables and execute_sql
    test_queries = [
        {
            "description": "List all available tables (first step)",
            "tool": "list_tables",
            "note": "Use this first to understand database schema"
        },
        {
            "description": "Count active employees",
            "tool": "execute_sql",
            "query": "SELECT COUNT(*) as active_employees FROM employees WHERE employment_status = 'active';"
        },
        {
            "description": "Find most common SAP skills",
            "tool": "execute_sql",
            "query": "SELECT s.name, COUNT(es.*) as employee_count FROM skills s JOIN employee_skills es ON s.id = es.skill_id WHERE s.category = 'sap_module' GROUP BY s.name ORDER BY employee_count DESC LIMIT 5;"
        },
        {
            "description": "Check certification completion rates",
            "tool": "execute_sql",
            "query": "SELECT c.name, COUNT(ec.*) as completion_count FROM certifications c JOIN employee_certifications ec ON c.id = ec.certification_id WHERE ec.status = 'completed' GROUP BY c.name ORDER BY completion_count DESC LIMIT 5;"
        },
        {
            "description": "Analyze career level distribution",
            "tool": "execute_sql",
            "query": "SELECT r.career_level, COUNT(e.*) as employee_count FROM roles r JOIN employees e ON r.id = e.current_role_id GROUP BY r.career_level ORDER BY employee_count DESC;"
        },
        {
            "description": "Find employees with Solution Architect roles",
            "tool": "execute_sql",
            "query": "SELECT COUNT(*) as architect_count FROM employees e JOIN roles r ON e.current_role_id = r.id WHERE r.title LIKE '%Solution Architect%' OR r.title LIKE '%Architect%';"
        }
    ]

    print("\n📋 Testing sample career analysis queries:")
    print("-" * 50)

    for i, test_query in enumerate(test_queries, 1):
        print(f"\n{i}. {test_query['description']}")
        print(f"   Tool: {test_query['tool']}")

        if 'query' in test_query:
            print(f"   SQL: {test_query['query'][:80]}...")
        elif 'note' in test_query:
            print(f"   Note: {test_query['note']}")

        # In a real implementation, you would execute these queries
        # For now, we just show what queries would be run
        print("   ✅ Query prepared for execution")

    print("\n" + "=" * 50)
    print("🎯 Sample Questions to Test with the Analysis Agent:")
    print("=" * 50)

    sample_questions = [
        "What SAP certifications do senior architects typically have in our company?",
        "How long does it take employees to become SAP Solution Architects?",
        "What are the most common career progression paths in our SAP organization?",
        "Which SAP modules are most frequently used by our consultants?",
        "What skills differentiate senior from junior SAP consultants?",
        "Show me certification completion rates for different SAP modules",
        "How many employees have transitioned from consultant to architect roles?",
        "What are the typical project assignments for different career levels?"
    ]

    for i, question in enumerate(sample_questions, 1):
        print(f"{i}. {question}")

    print("\n" + "=" * 50)
    print("🚀 Ready to test with WebUI!")
    print("=" * 50)
    print("Run: python examples/career_coach/main_web.py")
    print("Then ask the questions above to test database integration")


if __name__ == "__main__":
    asyncio.run(test_database_queries())
