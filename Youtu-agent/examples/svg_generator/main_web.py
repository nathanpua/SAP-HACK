import pathlib

from utu.agents import OrchestraAgent
from utu.config import ConfigLoader
from utu.ui.webui_chatbot import WebUIChatbot


def main():
    config = ConfigLoader.load_agent_config("examples/svg_generator")
    config.planner_config["examples_path"] = pathlib.Path(__file__).parent / "planner_examples.json"
    config.reporter_config["template_path"] = pathlib.Path(__file__).parent / "reporter_csv.j2"
    runner = OrchestraAgent(config)

    data_dir = pathlib.Path(__file__).parent / "data"
    data_dir.mkdir(exist_ok=True)
    question = "deepseek-v3.1有哪些亮点更新?"

    ui = WebUIChatbot(runner, example_query=question)
    ui.launch(port=config.frontend_port, ip=config.frontend_ip)


if __name__ == "__main__":
    main()
