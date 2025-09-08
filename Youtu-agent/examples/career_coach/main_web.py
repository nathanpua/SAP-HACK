import asyncio
import pathlib
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import asyncio
from utu.agents import OrchestraAgent
from utu.config import ConfigLoader
from utu.ui.webui_chatbot import WebUIChatbot

# Load environment variables (including Supabase credentials)
try:
    from utu.utils.env import EnvUtils
    print("✅ Environment variables loaded (including Supabase credentials)")
except ImportError:
    print("⚠️  Could not load environment variables - Supabase integration may not work")
except Exception as e:
    print(f"⚠️  Error loading environment variables: {e}")


def main():
    print("🚀 Starting SAP Career Coach WebUI with Supabase MCP Integration")
    print("=" * 70)

    # Verify Supabase environment variables
    supabase_token = os.getenv('SUPABASE_ACCESS_TOKEN')
    supabase_project = 'kclhwddhqtlmcjfpebz'  # Hardcoded project ID

    if supabase_token and supabase_project:
        print(f"✅ Supabase MCP configured for project: {supabase_project}")
        print("✅ Analysis Agent will have access to SAP Employee Database")
    else:
        print("⚠️  Supabase credentials not found - database queries may not work")
        print("   Make sure SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are set in .env")

    # Load the career coach orchestra configuration
    config = ConfigLoader.load_agent_config("career_coach_orchestra")
    config.planner_config["examples_path"] = pathlib.Path(__file__).parent / "planner_examples.json"

    # Create data directory if it doesn't exist
    data_dir = pathlib.Path(__file__).parent / "data"
    data_dir.mkdir(exist_ok=True)

    # Enhanced example query that will trigger database analysis using list_tables and execute_sql
    question = "I'm an SAP consultant with 3 years experience wanting to become a Solution Architect. Can you analyze our company database to show me what SAP certifications successful architects have, how long it takes to become an architect, and what skills are most valuable?"

    print("\n🤖 SAP Career Coach WebUI Features:")
    print("- Multi-agent orchestra system for comprehensive career guidance")
    print("- SAP Analysis Agent with direct database access (list_tables + execute_sql)")
    print("- Real-time SQL queries against employee database")
    print("- Data-driven recommendations based on actual company data")
    print("\n💡 Try asking questions like:")
    print("- 'What SAP certifications do senior architects typically have?'")
    print("- 'How long does it take to become a SAP Solution Architect?'")
    print("- 'What skills are most valuable for SAP consultants?'")
    print("- 'Show me career progression patterns in our company database'")
    print("- 'Analyze certification completion rates by department'")
    print()

    # Initialize the agent with proper async context manager
    async def initialize_agent():
        """Initialize the agent with memory toolkit using async context manager"""
        runner = None
        try:
            # Create orchestra agent
            runner = OrchestraAgent(config)

            # Build the agent explicitly (don't use async context manager)
            await runner.build()

            # Keep the agent alive for the WebUI
            return runner
        except Exception as e:
            print(f"⚠️ Agent initialization warning: {e}")
            # Return the runner even if initialization had issues
            return runner

    # Initialize agent asynchronously
    runner = asyncio.run(initialize_agent())
    if runner is None:
        print("❌ Failed to initialize OrchestraAgent")
        return

    # Launch the WebUI after agent is initialized
    ui = WebUIChatbot(runner, example_query=question)

    # Ensure proper IP and port values
    ip = config.frontend_ip or "127.0.0.1"
    port = config.frontend_port or 8848

    print(f"🌐 Launching WebUI at http://{ip}:{port}")
    ui.launch(port=port, ip=ip)


if __name__ == "__main__":
    main()
