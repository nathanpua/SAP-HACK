import json
import pathlib
import re

from ...config import AgentConfig
from ...utils import SimplifiedAsyncOpenAI, get_jinja_env
from .common import AgentInfo, CreatePlanResult, OrchestraTaskRecorder, Subtask


class OutputParser:
    def __init__(self, available_agents=None):
        # Patterns for both XML tags and markdown format
        self.analysis_pattern = r"<analysis>(.*?)</analysis>|## Query Analysis\s*\n(.*?)(?=\n##|\n\d+\.|\Z)"
        self.plan_pattern = r"<plan>(.*?)</plan>|## Agent Action Plan\s*\n(.*?)(?=\n##|\Z)"
        self.available_agents = available_agents or []
        # self.next_step_pattern = r'<next_step>\s*<agent>\s*(.*?)\s*</agent>\s*<task>\s*(.*?)\s*</task>\s*</next_step>'
        # self.task_finished_pattern = r'<task_finished>\s*</task_finished>'

    def parse(self, output_text: str) -> CreatePlanResult:
        analysis = self._extract_analysis(output_text)
        plan = self._extract_plan(output_text)
        return CreatePlanResult(analysis=analysis, todo=plan)

    def _extract_analysis(self, text: str) -> str:
        match = re.search(self.analysis_pattern, text, re.DOTALL)
        if match:
            # Return the first non-None capture group (either XML or markdown format)
            for group in match.groups():
                if group is not None:
                    return group.strip()
        return ""

    def _extract_plan(self, text: str) -> list[Subtask]:
        match = re.search(self.plan_pattern, text, re.DOTALL)
        if not match:
            print(f"⚠️ No plan tags found in response. Looking for fallback patterns...")
            # Fallback: try to extract todo list content from the entire response
            return self._extract_plan_fallback(text)

        # Get the first non-None capture group (either XML or markdown format)
        plan_content = ""
        for group in match.groups():
            if group is not None:
                plan_content = group.strip()
                break
        tasks = []
        # Parse numbered format: "1. AgentName: responsibilities"
        numbered_pattern = r'^\s*\d+\.\s*([A-Za-z]+Agent):\s*(.+?)(?=\n\s*\d+\.\s*[A-Za-z]+Agent:|\Z)'
        numbered_matches = re.findall(numbered_pattern, plan_content, re.MULTILINE | re.DOTALL)

        if numbered_matches:
            print(f"✅ Found {len(numbered_matches)} numbered tasks")
            for agent_name, task_desc in numbered_matches:
                tasks.append(Subtask(agent_name=agent_name, task=task_desc.strip(), completed=False))
            return tasks

        print(f"⚠️ No valid numbered tasks found in plan content. Trying fallback...")
        return self._extract_plan_fallback(text)

    def _extract_plan_fallback(self, text: str) -> list[Subtask]:
        """Fallback method to extract plan when proper markdown format is not used"""
        tasks = []

        # Get agent names from available agents (dynamic list)
        agent_names = [agent.name for agent in self.available_agents] if self.available_agents else ["ResearchAgent", "AnalysisAgent", "SkillsDevelopmentAgent", "SynthesisAgent"]

        # Try to parse numbered format: "1. AgentName: ..."
        numbered_pattern = r'^\s*\d+\.\s*([A-Za-z]+Agent):\s*(.+?)(?=\n\s*\d+\.\s*[A-Za-z]+Agent:|\Z)'
        numbered_matches = re.findall(numbered_pattern, text, re.MULTILINE | re.DOTALL)

        if numbered_matches:
            print(f"✅ Found {len(numbered_matches)} numbered tasks in fallback")
            for agent_name, task_desc in numbered_matches:
                tasks.append(Subtask(agent_name=agent_name, task=task_desc.strip(), completed=False))
            return tasks

        # Fallback to bullet point format: "- AgentName: ..."
        task_pattern = r'^\s*-\s*([A-Za-z]+Agent):\s*(.+?)(?=\n\s*-\s*[A-Za-z]+Agent:|\s*$)'
        task_matches = re.findall(task_pattern, text, re.MULTILINE)

        if task_matches:
            for agent_name, task_desc in task_matches:
                tasks.append(Subtask(agent_name=agent_name, task=task_desc.strip(), completed=False))
                print(f"✅ Extracted fallback todo for {agent_name}: {task_desc.strip()[:100]}...")
            return tasks

        # Fallback: Look for patterns like "ResearchAgent will..." or "ResearchAgent: ..."
        for agent_name in agent_names:
            agent_pattern = rf'{agent_name}[\s:]+(.*?)(?=(?:{"|".join(agent_names)}|$))'
            match = re.search(agent_pattern, text, re.DOTALL | re.IGNORECASE)

            if match:
                task_desc = match.group(1).strip()
                if task_desc:
                    tasks.append(Subtask(agent_name=agent_name, task=task_desc, completed=False))
                    print(f"✅ Extracted fallback task for {agent_name}: {task_desc[:100]}...")
                # Note: No longer forcing all agents - only add if mentioned in the response

        # If no agents were found in the text, this indicates a problem with the LLM response
        if not tasks:
            print("⚠️ No agents found in LLM response, using minimal fallback")
            # Use first available agent as fallback, not hardcoded
            fallback_agent = agent_names[0] if agent_names else "ResearchAgent"
            tasks.append(Subtask(
                agent_name=fallback_agent,
                task="Research SAP career information and provide relevant guidance",
                completed=False
            ))

        return tasks


class PlannerAgent:
    def __init__(self, config: AgentConfig):
        self.config = config
        self.llm = SimplifiedAsyncOpenAI(**self.config.planner_model.model_provider.model_dump())
        self.jinja_env = get_jinja_env(pathlib.Path(__file__).parent / "prompts")
        self.planner_examples = self._load_planner_examples()
        self.available_agents = self._load_available_agents()
        self.output_parser = OutputParser(available_agents=self.available_agents)

        # Memory toolkit for context awareness
        self.memory_toolkit = None
        self.memory_context = ""
        self.conversation_history = []
        self.conversation_context = ""  # Immediate conversation context

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
        # Inject memory context and conversation context into the user prompt
        background_info = self.memory_context if self.memory_context else ""

        # Add conversation context if available
        if self.conversation_context:
            if background_info:
                background_info += "\n\n"
            background_info += f"RECENT CONVERSATION CONTEXT:\n{self.conversation_context}\n\nINSTRUCTIONS: Use this recent conversation context to understand the current query in relation to previous messages. Reference ongoing discussions and build upon previous responses."

        up = self.jinja_env.get_template("planner_up.j2").render(
            available_agents=self._format_available_agents(self.available_agents),
            question=task_recorder.task,
            background_info=background_info,
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

            # Format the plan as numbered list instead of JSON
            plan_str = ""
            if 'plan' in example and isinstance(example['plan'], list):
                for i, plan_item in enumerate(example['plan'], 1):
                    if isinstance(plan_item, dict) and 'agent_name' in plan_item and 'task' in plan_item:
                        plan_str += f"{i}. {plan_item['agent_name']}: {plan_item['task']}\n"

            examples_str.append(
                f"Question: {question}\n"
                f"<analysis>{example['analysis']}</analysis>\n"
                f"<plan>{plan_str.strip()}</plan>\n"
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
