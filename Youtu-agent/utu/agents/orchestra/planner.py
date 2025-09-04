import json
import pathlib
import re

from ...config import AgentConfig
from ...utils import SimplifiedAsyncOpenAI, get_jinja_env
from .common import AgentInfo, CreatePlanResult, OrchestraTaskRecorder, Subtask


class OutputParser:
    def __init__(self):
        self.analysis_pattern = r"<analysis>(.*?)</analysis>"
        self.plan_pattern = r"<plan>\s*\[(.*?)\]\s*</plan>"
        # self.next_step_pattern = r'<next_step>\s*<agent>\s*(.*?)\s*</agent>\s*<task>\s*(.*?)\s*</task>\s*</next_step>'
        # self.task_finished_pattern = r'<task_finished>\s*</task_finished>'

    def parse(self, output_text: str) -> CreatePlanResult:
        analysis = self._extract_analysis(output_text)
        plan = self._extract_plan(output_text)
        return CreatePlanResult(analysis=analysis, todo=plan)

    def _extract_analysis(self, text: str) -> str:
        match = re.search(self.analysis_pattern, text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return ""

    def _extract_plan(self, text: str) -> list[Subtask]:
        match = re.search(self.plan_pattern, text, re.DOTALL)
        if not match:
            print(f"⚠️ No plan tags found in response. Looking for fallback patterns...")
            # Fallback: try to extract JSON-like content from the entire response
            return self._extract_plan_fallback(text)

        plan_content = match.group(1).strip()
        tasks = []
        task_pattern = r'\{"agent_name":\s*"([^"]+)",\s*"task":\s*"([^"]+)",\s*"completed":\s*(true|false)\s*\}'
        task_matches = re.findall(task_pattern, plan_content, re.IGNORECASE)

        if not task_matches:
            print(f"⚠️ No valid tasks found in plan content. Trying fallback...")
            return self._extract_plan_fallback(text)

        for agent_name, task_desc, completed_str in task_matches:
            completed = completed_str.lower() == "true"
            tasks.append(Subtask(agent_name=agent_name, task=task_desc, completed=completed))
        return tasks

    def _extract_plan_fallback(self, text: str) -> list[Subtask]:
        """Fallback method to extract plan when proper XML format is not used"""
        tasks = []

        # Look for agent mentions and try to create tasks
        agent_names = ["ResearchAgent", "AnalysisAgent", "SynthesisAgent"]

        for agent_name in agent_names:
            # Look for patterns like "ResearchAgent will..." or "ResearchAgent: ..."
            agent_pattern = rf'{agent_name}[\s:]+(.*?)(?=(?:{agent_names[0]}|{agent_names[1]}|{agent_names[2]}|$))'
            match = re.search(agent_pattern, text, re.DOTALL | re.IGNORECASE)

            if match:
                task_desc = match.group(1).strip()
                if task_desc:
                    tasks.append(Subtask(agent_name=agent_name, task=task_desc, completed=False))
                    print(f"✅ Extracted fallback task for {agent_name}: {task_desc[:100]}...")
            else:
                # If no specific task found, create a generic one
                generic_tasks = {
                    "ResearchAgent": "Research SAP career acceleration strategies, certification requirements, and market trends",
                    "AnalysisAgent": "Analyze current skills, identify gaps, and assess career progression potential",
                    "SynthesisAgent": "Create comprehensive career development plan with actionable steps"
                }
                tasks.append(Subtask(agent_name=agent_name, task=generic_tasks[agent_name], completed=False))
                print(f"⚠️ Using generic task for {agent_name}")

        return tasks


class PlannerAgent:
    def __init__(self, config: AgentConfig):
        self.config = config
        self.llm = SimplifiedAsyncOpenAI(**self.config.planner_model.model_provider.model_dump())
        self.output_parser = OutputParser()
        self.jinja_env = get_jinja_env(pathlib.Path(__file__).parent / "prompts")
        self.planner_examples = self._load_planner_examples()
        self.available_agents = self._load_available_agents()

    @property
    def name(self) -> str:
        return self.config.planner_config.get("name", "planner")

    def _load_planner_examples(self) -> list[dict]:
        examples_path = self.config.planner_config.get("examples_path", "")
        if examples_path and pathlib.Path(examples_path).exists():
            examples_path = pathlib.Path(examples_path)
        else:
            examples_path = pathlib.Path(__file__).parent / "data" / "planner_examples.json"
        with open(examples_path, encoding="utf-8") as f:
            return json.load(f)

    def _load_available_agents(self) -> list[AgentInfo]:
        available_agents = []
        for info in self.config.workers_info:
            available_agents.append(AgentInfo(**info))
        return available_agents

    async def build(self):
        pass

    async def create_plan(self, task_recorder: OrchestraTaskRecorder) -> CreatePlanResult:
        sp = self.jinja_env.get_template("planner_sp.j2").render(
            planning_examples=self._format_planner_examples(self.planner_examples)
        )
        up = self.jinja_env.get_template("planner_up.j2").render(
            available_agents=self._format_available_agents(self.available_agents),
            question=task_recorder.task,
            background_info="",  # TODO: add background info?
        )
        messages = [{"role": "system", "content": sp}, {"role": "user", "content": up}]
        response = await self.llm.query_one(messages=messages, **self.config.planner_model.model_params.model_dump())
        return self.output_parser.parse(response)

    def _format_planner_examples(self, examples: list[dict]) -> str:
        # format examples to string. example: {question/user_query, available_agents, analysis, plan}
        examples_str = []
        for example in examples:
            # Handle both 'question' and 'user_query' keys for compatibility
            question = example.get('question') or example.get('user_query', 'Unknown question')
            examples_str.append(
                f"Question: {question}\n"
                f"<analysis>{example['analysis']}</analysis>\n"
                f"<plan>{json.dumps(example['plan'], ensure_ascii=False)}</plan>\n"
            )
        return "\n".join(examples_str)

    def _format_available_agents(self, agents: list[AgentInfo]) -> str:
        agents_str = []
        for agent in agents:
            agents_str.append(
                f"- {agent.name}: {agent.desc}\n  Best for: {agent.strengths}\n"
                if agent.strengths
                else f"  Weaknesses: {agent.weaknesses}\n"
                if agent.weaknesses
                else ""
            )
        return "\n".join(agents_str)
