"""
@ii-agent/src/ii_agent/tools/memory/
"""

from collections.abc import Callable
from typing import Literal

from ..config import ToolkitConfig
from ..utils import get_logger
from .base import AsyncBaseToolkit

logger = get_logger(__name__)


class SimpleMemoryToolkit(AsyncBaseToolkit):
    """String-based memory tool for storing and modifying persistent text.

    This tool maintains a single in-memory string that can be read,
    replaced, or selectively edited using string replacement. It provides safety
    warnings when overwriting content or when edit operations would affect
    multiple occurrences.
    """

    def __init__(self, config: ToolkitConfig = None) -> None:
        super().__init__(config)
        self.full_memory = ""

    def _read_memory(self) -> str:
        """Read the current memory contents."""
        return self.full_memory

    def _write_memory(self, content: str) -> str:
        """Replace the entire memory with new content."""
        if self.full_memory:
            previous = self.full_memory
            self.full_memory = content
            return (
                f"Warning: Overwriting existing content. Previous content was:\n{previous}\n\n"
                "Memory has been updated successfully."
            )
        self.full_memory = content
        return "Memory updated successfully."

    def _edit_memory(self, old_string: str, new_string: str) -> str:
        """Replace occurrences of old string with new string."""
        if old_string not in self.full_memory:
            return f"Error: '{old_string}' not found in memory."

        old_memory = self.full_memory
        count = old_memory.count(old_string)

        if count > 1:
            return {
                f"Warning: Found {count} occurrences of '{old_string}'. "
                "Please confirm which occurrence to replace or use more specific context."
            }

        self.full_memory = self.full_memory.replace(old_string, new_string)
        return "Edited memory: 1 occurrence replaced."

    async def simple_memory(
        self, action: Literal["read", "write", "edit"], content: str = "", old_string: str = "", new_string: str = ""
    ) -> str:
        """Tool for managing persistent text memory with read, write and edit operations.

        MEMORY STORAGE GUIDANCE:
        Store information that needs to persist across agent interactions, including:
        - User context: Requirements, goals, preferences, and clarifications
        - Task state: Completed tasks, pending items, current progress
        - Code context: File paths, function signatures, data structures, dependencies
        - Research findings: Key facts, sources, URLs, and reference materials
        - Configuration: Settings, parameters, and environment details
        - Cross-session continuity: Information needed for future interactions

        OPERATIONS:
        - Read: Retrieves full memory contents as a string
        - Write: Replaces entire memory (warns when overwriting existing data)
        - Edit: Performs targeted string replacement (warns on multiple matches)

        Use structured formats (JSON, YAML, or clear sections) for complex data.
        Prioritize information that would be expensive to regenerate or re-research.

        Args:
            action (Literal["read", "write", "edit"]: The action to perform on the memory.
            content (str, optional): The content to write to the memory. Defaults to "".
            old_string (str, optional): The string to replace in the memory. Defaults to "".
            new_string (str, optional): The string to replace the old string with in the memory. Defaults to "".
        """
        if action == "read":
            result = self._read_memory()
        elif action == "write":
            result = self._write_memory(content)
        elif action == "edit":
            result = self._edit_memory(old_string, new_string)
        else:
            result = f"Error: Unknown action '{action}'. Valid actions are read, write, edit."
        return result

    async def get_tools_map(self) -> dict[str, Callable]:
        return {
            "simple_memory": self.simple_memory,
        }


class CompactifyMemoryToolkit(AsyncBaseToolkit):
    """Memory compactification tool that works with any context manager type.

    Applies the context manager's truncation strategy to compress the conversation history.
    This tool adapts to different context management approaches (summarization, simple truncation, etc.).
    """

    async def compactify_memory(
        self,
    ) -> str:
        """Compactifies the conversation memory using the configured context management strategy.
        Use this tool when the conversation is long and you need to free up context space.
        Helps maintain conversation continuity while staying within token limits.
        """
        raise NotImplementedError
        return "Memory compactified."


class EnhancedMemoryToolkit(AsyncBaseToolkit):
    """Enhanced memory tool with increased capacity and smart management.

    This toolkit provides 3x more memory capacity (24,000 characters) with intelligent
    compression, structured storage, and better memory management features.
    """

    def __init__(self, config: ToolkitConfig = None) -> None:
        super().__init__(config)
        self.max_memory_size = 24000  # 3x the original limit
        self.compression_threshold = 20000  # Start compression at 20k chars
        self.full_memory = ""
        self.memory_metadata = {
            "total_size": 0,
            "last_updated": None,
            "categories": {},
            "compression_count": 0
        }

    def _read_memory(self) -> str:
        """Read the current memory contents."""
        if not self.full_memory.strip():
            return "No previous conversation memory found. This is the start of our conversation about SAP career guidance."
        return self.full_memory

    def _write_memory(self, content: str) -> str:
        """Replace the entire memory with new content with size validation."""
        if len(content) > self.max_memory_size:
            # If content is too large, compress it first
            content = self._compress_memory_content(content)

        if self.full_memory:
            previous_size = len(self.full_memory)
            self.full_memory = content
            self._update_metadata()
            return (
                f"Warning: Overwriting existing content ({previous_size} chars). "
                f"New content size: {len(content)} chars. "
                "Memory has been updated successfully."
            )
        self.full_memory = content
        self._update_metadata()
        return f"Memory updated successfully. Size: {len(content)} chars."

    def _edit_memory(self, old_string: str, new_string: str) -> str:
        """Replace occurrences of old string with new string with enhanced validation."""
        if old_string not in self.full_memory:
            return f"Error: '{old_string}' not found in memory."

        old_memory = self.full_memory
        count = old_memory.count(old_string)

        if count > 1:
            return (
                f"Warning: Found {count} occurrences of '{old_string}'. "
                "Please provide more specific context or use edit_multiple operation."
            )

        self.full_memory = self.full_memory.replace(old_string, new_string, 1)

        # Check if we need compression after edit
        if len(self.full_memory) > self.compression_threshold:
            self._compress_memory_if_needed()

        self._update_metadata()
        return "Memory edited successfully. 1 occurrence replaced."

    def _compress_memory_content(self, content: str) -> str:
        """Compress memory content to fit within limits while preserving important information."""
        if len(content) <= self.max_memory_size:
            return content

        lines = content.split('\n')
        compressed_lines = []

        # Keep the most recent and important content
        # Priority: Recent entries, key findings, user preferences, research topics
        recent_lines = lines[-50:]  # Last 50 lines (most recent)
        important_patterns = ['KEY_FINDINGS', 'USER_PREFERENCES', 'RESEARCHED_TOPICS', 'TARGET_ROLE']

        # First pass: keep lines with important patterns
        important_lines = []
        for line in lines:
            if any(pattern in line for pattern in important_patterns):
                important_lines.append(line)

        # Combine and deduplicate
        all_important = important_lines + recent_lines
        seen = set()
        for line in reversed(all_important):
            if line.strip() and line not in seen:
                compressed_lines.insert(0, line)
                seen.add(line)

        # If still too large, truncate older content
        result = '\n'.join(compressed_lines)
        if len(result) > self.max_memory_size:
            result = result[-self.max_memory_size:]

        # Add compression marker
        self.memory_metadata["compression_count"] += 1
        compression_marker = f"\n⚠️ Memory compressed {self.memory_metadata['compression_count']} times to fit capacity limits\n"
        result = compression_marker + result

        return result

    def _compress_memory_if_needed(self) -> None:
        """Check and compress memory if approaching size limits."""
        if len(self.full_memory) > self.compression_threshold:
            self.full_memory = self._compress_memory_content(self.full_memory)

    def _update_metadata(self) -> None:
        """Update memory metadata."""
        import datetime
        self.memory_metadata.update({
            "total_size": len(self.full_memory),
            "last_updated": datetime.datetime.now().isoformat(),
        })

    async def enhanced_memory(
        self,
        action: Literal["read", "write", "edit", "status", "compress"],
        content: str = "",
        old_string: str = "",
        new_string: str = ""
    ) -> str:
        """Enhanced memory tool with increased capacity and smart management.

        ENHANCED CAPACITY FEATURES:
        - 24,000 character capacity (3x larger than simple memory)
        - Intelligent compression when approaching limits
        - Structured data organization
        - Memory usage statistics and monitoring

        OPERATIONS:
        - Read: Retrieves full memory contents
        - Write: Replaces entire memory with compression if needed
        - Edit: Performs targeted string replacement with validation
        - Status: Shows memory usage and metadata
        - Compress: Manually trigger memory compression

        Args:
            action: The action to perform on the memory
            content: Content to write to memory
            old_string: String to replace in edit operations
            new_string: Replacement string for edit operations
        """
        if action == "read":
            result = self._read_memory()
        elif action == "write":
            result = self._write_memory(content)
        elif action == "edit":
            result = self._edit_memory(old_string, new_string)
        elif action == "status":
            result = self._get_memory_status()
        elif action == "compress":
            old_size = len(self.full_memory)
            self.full_memory = self._compress_memory_content(self.full_memory)
            new_size = len(self.full_memory)
            result = f"Memory compressed from {old_size} to {new_size} characters."
        else:
            result = f"Error: Unknown action '{action}'. Valid actions: read, write, edit, status, compress."

        return result

    def _get_memory_status(self) -> str:
        """Get detailed memory status and statistics."""
        usage_percent = (len(self.full_memory) / self.max_memory_size) * 100
        status_lines = [
            f"🧠 Enhanced Memory Status:",
            f"   Capacity: {len(self.full_memory):,}/{self.max_memory_size:,} characters ({usage_percent:.1f}%)",
            f"   Last Updated: {self.memory_metadata.get('last_updated', 'Never')}",
            f"   Compression Events: {self.memory_metadata.get('compression_count', 0)}",
            f"   Categories: {list(self.memory_metadata.get('categories', {}).keys())}"
        ]

        if len(self.full_memory) > self.compression_threshold:
            status_lines.append("   ⚠️  Memory nearing capacity - compression may occur soon")

        return "\n".join(status_lines)

    async def get_tools_map(self) -> dict[str, Callable]:
        return {
            "enhanced_memory": self.enhanced_memory,
        }
