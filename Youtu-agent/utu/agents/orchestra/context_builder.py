"""
Enhanced Context Builder for Memory Integration

This module provides functions to build comprehensive memory context from multiple sources
for the Career Coach Orchestra, ensuring conversation continuity and context awareness.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import asyncio


@dataclass
class MemoryEntry:
    """Structured memory entry for tracking conversation context"""
    timestamp: float
    content_type: str  # 'user_input', 'agent_response', 'planning_decision'
    content: str
    agent_name: str
    context_tags: List[str]  # ['career_goal', 'target_role', 'certification']


@dataclass
class ContextSummary:
    """Summary of conversation context for planning decisions"""
    target_role: Optional[str]
    career_goals: List[str]
    key_insights: List[str]
    previous_questions: List[str]
    agent_contributions: Dict[str, List[str]]


class ContextBuilder:
    """Enhanced context builder for memory integration"""

    def __init__(self):
        self.max_context_length = 24000  # Increased from 8000 - 3x capacity for enhanced memory
        self.max_conversation_history = 10  # Increased from 3 - more conversation history

    async def build_memory_context_string(
        self,
        agent_memories: Dict[str, str],
        conversation_history: List[Dict[str, str]]
    ) -> str:
        """
        Build comprehensive memory context for planner from multiple sources

        Args:
            agent_memories: Dictionary of agent_name -> memory_content
            conversation_history: List of conversation exchanges

        Returns:
            Formatted context string for injection into planning
        """
        context_parts = []

        # Include recent conversation history
        if conversation_history:
            context_parts.append("RECENT CONVERSATION HISTORY:")
            recent_history = conversation_history[-self.max_conversation_history:]
            for i, exchange in enumerate(recent_history, 1):
                user_input = exchange.get('user_input', '')[:300]
                response = exchange.get('response', '')[:500]
                context_parts.append(f"Q{i}: {user_input}")
                context_parts.append(f"A{i}: {response}")
                context_parts.append("")

        # Include agent memories
        for agent_name, memory in agent_memories.items():
            if memory and memory.strip():
                context_parts.append(f"{agent_name.upper()}_MEMORY:")
                # Extract key insights (increased limits for enhanced memory)
                memory_lines = memory.split('\n')
                key_lines = []
                for line in memory_lines[-20:]:  # Last 20 lines for relevance (increased from 10)
                    if line.strip() and len(line) < 500:  # Increased line length limit from 200 to 500
                        key_lines.append(line.strip())

                if key_lines:
                    context_parts.append('\n'.join(key_lines))
                context_parts.append("")

        # Build final context string
        context_string = "\n\n".join(context_parts)

        # Validate and truncate if necessary
        if len(context_string) > self.max_context_length:
            context_string = self._truncate_context(context_string)

        return context_string

    def _truncate_context(self, context: str) -> str:
        """Truncate context to fit within token limits while preserving most recent information"""
        if len(context) <= self.max_context_length:
            return context

        # Keep the most recent parts (conversation history is more important than old agent memories)
        lines = context.split('\n')
        truncated_lines = []
        current_length = 0

        # Process in reverse order to keep most recent information
        for line in reversed(lines):
            if current_length + len(line) + 1 <= self.max_context_length:
                truncated_lines.insert(0, line)
                current_length += len(line) + 1
            else:
                break

        result = '\n'.join(truncated_lines)
        if len(result) < len(context):
            result = "⚠️ Context truncated for token limits\n\n" + result

        return result

    async def extract_key_insights(self, context: str) -> ContextSummary:
        """
        Extract key insights from context for planning decisions

        Args:
            context: Raw context string

        Returns:
            Structured context summary
        """
        target_role = None
        career_goals = []
        key_insights = []
        previous_questions = []
        agent_contributions = {}

        lines = context.split('\n')

        for line in lines:
            line_lower = line.lower()

            # Extract target role
            if not target_role:
                if 'cloud engineer' in line_lower:
                    target_role = 'Cloud Engineer'
                elif 'solution architect' in line_lower:
                    target_role = 'Solution Architect'
                elif 'technical lead' in line_lower:
                    target_role = 'Technical Lead'
                elif 'sap consultant' in line_lower:
                    target_role = 'SAP Consultant'

            # Extract career goals
            if 'goal' in line_lower or 'want to' in line_lower:
                if len(line) < 200:  # Avoid very long lines
                    career_goals.append(line.strip())

            # Extract previous questions
            if line.startswith('Q') and ':' in line:
                question = line.split(':', 1)[1].strip()
                if question and len(question) < 200:
                    previous_questions.append(question)

            # Extract agent contributions
            for agent_name in ['ResearchAgent', 'AnalysisAgent', 'SkillsDevelopmentAgent', 'SynthesisAgent']:
                if agent_name.upper() in line:
                    if agent_name not in agent_contributions:
                        agent_contributions[agent_name] = []
                    # Extract the next few lines as contributions
                    line_index = lines.index(line)
                    for i in range(1, min(4, len(lines) - line_index)):  # Next 3 lines
                        next_line = lines[line_index + i]
                        if next_line.strip() and not next_line.startswith(('Q', 'A', '---')):
                            agent_contributions[agent_name].append(next_line.strip())
                            break

        # Limit arrays to prevent overflow
        career_goals = career_goals[-5:]  # Last 5 goals
        previous_questions = previous_questions[-5:]  # Last 5 questions
        key_insights = key_insights[-10:]  # Last 10 insights

        return ContextSummary(
            target_role=target_role,
            career_goals=career_goals,
            key_insights=key_insights,
            previous_questions=previous_questions,
            agent_contributions=agent_contributions
        )

    def validate_context_size(self, context: str) -> bool:
        """
        Validate context size for token limits

        Args:
            context: Context string to validate

        Returns:
            True if context is within limits, False otherwise
        """
        return len(context) <= self.max_context_length

    async def build_planner_context(
        self,
        agent_memories: Dict[str, str],
        conversation_history: List[Dict[str, str]],
        user_input: str
    ) -> str:
        """
        Build complete context for planner including current user input

        Args:
            agent_memories: Agent memory contents
            conversation_history: Recent conversation exchanges
            user_input: Current user input

        Returns:
            Formatted context for planner
        """
        # Build memory context
        memory_context = await self.build_memory_context_string(agent_memories, conversation_history)

        # Combine with current user input
        if memory_context:
            planner_context = f"""{memory_context}

CURRENT USER INPUT:
{user_input}

INSTRUCTIONS:
- Reference the target career role from previous conversations
- Build upon existing analysis rather than starting fresh
- Consider user's stated career goals and preferences
- Use agent memories to understand previous planning decisions
- Maintain conversation continuity and context awareness"""
        else:
            planner_context = f"""CURRENT USER INPUT:
{user_input}

INSTRUCTIONS:
- This appears to be the start of a new conversation
- Focus on understanding the user's career goals and current situation
- Plan comprehensive analysis using all available agents"""

        return planner_context


async def get_memory_summary(agent) -> Dict[str, str]:
    """
    Get a summary of all agent memories

    Args:
        agent: OrchestraAgent instance

    Returns:
        Dictionary of agent_name -> memory_content
    """
    memory_summary = {}
    try:
        for agent_name, worker in agent.worker_agents.items():
            if hasattr(worker.agent, 'tools') and worker.agent.tools:
                memory_tool = worker.agent.tools.get('enhanced_memory')
                if memory_tool:
                    memory = await memory_tool.enhanced_memory(action="read")
                    if memory:
                        # Extract key insights from memory (increased from 200 to 1000 chars for enhanced memory)
                        memory_summary[agent_name] = memory[-1000:] if len(memory) > 1000 else memory
    except Exception as e:
        print(f"⚠️ Memory summary warning: {e}")
    return memory_summary


async def build_memory_context_string(
    agent_memories: Dict[str, str],
    conversation_history: List[Dict[str, str]]
) -> str:
    """
    Convenience function to build memory context string

    Args:
        agent_memories: Dictionary of agent_name -> memory_content
        conversation_history: List of conversation exchanges

    Returns:
        Formatted context string
    """
    builder = ContextBuilder()
    return await builder.build_memory_context_string(agent_memories, conversation_history)
