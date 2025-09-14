import asyncio
import pathlib
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utu.agents import OrchestraAgent
from utu.config import ConfigLoader
from utu.ui.webui_chatbot import WebUIChatbot

# Load environment variables (including ChromaDB and OpenAI credentials)
try:
    from utu.utils.env import EnvUtils
    print("✅ Environment variables loaded")
except ImportError:
    print("⚠️  Could not load environment variables")
except Exception as e:
    print(f"⚠️  Error loading environment variables: {e}")


def main():
    print("🚀 Starting SAP Career Coach WebUI with ChromaDB Integration")
    print("=" * 70)

    # Verify ChromaDB environment variables
    chroma_data_path = os.getenv('CHROMA_DATA_PATH', './chroma_db_data')

    print("🔍 Checking environment configuration...")
    print("✅ Using SentenceTransformers for embeddings (local model)")

    # Check if ChromaDB data directory exists
    if os.path.exists(chroma_data_path):
        print(f"✅ ChromaDB data directory found: {chroma_data_path}")
    else:
        print(f"ℹ️  ChromaDB data directory not found: {chroma_data_path}")
        print("   Run document ingestion first: python scripts/ingest_chromadb_docs.py sample_documents/")

    # Load the career coach orchestra configuration
    config = ConfigLoader.load_agent_config("career_coach_orchestra")
    config.planner_config["examples_path"] = pathlib.Path(__file__).parent / "planner_examples.json"

    # Create the orchestra agent
    runner = OrchestraAgent(config)

    # Create data directory if it doesn't exist
    data_dir = pathlib.Path(__file__).parent / "data"
    data_dir.mkdir(exist_ok=True)

    # Enhanced example query that demonstrates ChromaDB vector search
    question = "I'm new to SAP and starting tomorrow. What do I need to know about equipment, first day logistics, and available benefits?"

    print("\n🤖 SAP Career Coach WebUI Features:")
    print("- Multi-agent orchestra system with ChromaDB vector search integration")
    print("- Onboarding Agent with access to comprehensive SAP policy documents")
    print("- Real-time vector similarity search across 15+ policy documents")
    print("- Data-driven recommendations based on actual company policies")
    print("- Support for new hire onboarding, benefits enrollment, and policy questions")
    print("\n💡 Try asking questions like:")
    print("- 'What equipment will I receive on my first day at SAP?'")
    print("- 'How do I set up my SAP email and access systems?'")
    print("- 'What's the hotel limit for business travel to London?'")
    print("- 'How much PTO do I accrue with 5 years of service?'")
    print("- 'What are the company policies for remote work?'")
    print("- 'How do I request IT support or troubleshoot issues?'")
    print()

    # Launch the WebUI
    ui = WebUIChatbot(runner, example_query=question)
    print(f"🌐 Launching WebUI at http://{config.frontend_ip}:{config.frontend_port}")
    ui.launch(port=config.frontend_port, ip=config.frontend_ip)


if __name__ == "__main__":
    main()
