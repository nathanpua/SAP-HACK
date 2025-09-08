from ..config import ConfigLoader
from .arxiv_toolkit import ArxivToolkit
from .audio_toolkit import AudioToolkit
from .base import AsyncBaseToolkit as AsyncBaseToolkit
from .bash_remote_tool import BashRemoteToolkit
from .email_toolkit import EmailToolkit
from .bash_toolkit import BashToolkit
from .codesnip_toolkit import CodesnipToolkit
from .document_toolkit import DocumentToolkit
from .file_edit_toolkit import FileEditToolkit
from .github_toolkit import GitHubToolkit
from .image_toolkit import ImageToolkit
from .outlook_calendar_toolkit import OutlookCalendarToolkit
from .teams_calendar_toolkit import TeamsCalendarToolkit
from .memory_toolkit import SimpleMemoryToolkit, EnhancedMemoryToolkit
from .python_executor_toolkit import PythonExecutorToolkit
from .search_toolkit import SearchToolkit
from .serper_toolkit import SerperToolkit
from .tabular_data_toolkit import TabularDataToolkit
from .user_interaction_toolkit import UserInteractionToolkit as UserInteractionToolkit
from .user_profile_toolkit import UserProfileToolkit
from .video_toolkit import VideoToolkit
from .wikipedia_toolkit import WikipediaSearchTool

TOOLKIT_MAP = {
    "search": SearchToolkit,
    "document": DocumentToolkit,
    "image": ImageToolkit,
    "file_edit": FileEditToolkit,
    "github": GitHubToolkit,
    "outlook_calendar": OutlookCalendarToolkit,
    "teams_calendar": TeamsCalendarToolkit,
    "arxiv": ArxivToolkit,
    "wikipedia": WikipediaSearchTool,
    "codesnip": CodesnipToolkit,
    "bash": BashToolkit,
    "bash_remote": BashRemoteToolkit,
    "python_executor": PythonExecutorToolkit,
    "video": VideoToolkit,
    "audio": AudioToolkit,
    "serper": SerperToolkit,
    "tabular": TabularDataToolkit,
    "memory_simple": SimpleMemoryToolkit,
    "memory_enhanced": EnhancedMemoryToolkit,
    "email": EmailToolkit,
    "user_profile": UserProfileToolkit,
}


def get_toolkits_map(names: list[str] | None = None) -> dict[str, AsyncBaseToolkit]:
    toolkits = {}
    if names is None:
        names = list(TOOLKIT_MAP.keys())
    else:
        assert all(name in TOOLKIT_MAP for name in names), f"Error config tools: {names}"
    for name in names:
        config = ConfigLoader.load_toolkit_config(name)
        toolkits[name] = TOOLKIT_MAP[name](config=config)
    return toolkits
