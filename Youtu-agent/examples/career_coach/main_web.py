import asyncio
import pathlib
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utu.agents import OrchestraAgent
from utu.config import ConfigLoader
from utu.ui.webui_chatbot import WebUIChatbot


def main():
    config = ConfigLoader.load_agent_config("career_coach_orchestra")
    config.planner_config["examples_path"] = pathlib.Path(__file__).parent / "planner_examples.json"

    runner = OrchestraAgent(config)

    data_dir = pathlib.Path(__file__).parent / "data"
    data_dir.mkdir(exist_ok=True)
    question = f"I'm an SAP consultant with 3 years experience wanting to become a Solution Architect. What's my path?"

    ui = WebUIChatbot(runner, example_query=question)
    ui.launch(port=config.frontend_port, ip=config.frontend_ip)


if __name__ == "__main__":
    main()
