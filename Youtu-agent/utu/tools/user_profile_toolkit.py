import asyncio
import ssl
from collections.abc import Callable
from typing import Dict, Any, Optional

import aiohttp
import certifi

from ..config import ToolkitConfig
from ..utils import get_logger, oneline_object
from .base import AsyncBaseToolkit

logger = get_logger(__name__)


class UserProfileToolkit(AsyncBaseToolkit):
    def __init__(self, config: ToolkitConfig = None):
        """Initialize the UserProfileToolkit.

        - Required env variables: `USER_PROFILE_API_URL`, `SUPABASE_SERVICE_ROLE_KEY`
        """
        super().__init__(config)
        self.api_url = self.config.config.get('USER_PROFILE_API_URL', 'http://localhost:3000/api/user-profile')
        self.timeout = self.config.config.get('REQUEST_TIMEOUT', 30)
        self.service_role_key = self.config.config.get('SUPABASE_SERVICE_ROLE_KEY')
        self.default_user_id = self.config.config.get('DEFAULT_USER_ID')  # May be None - authentication required
        self._agent = None  # Will be set by the agent when toolkit is loaded

    async def fetch_user_profile(self) -> Dict[str, Any]:
        """Fetch user profile data from the API endpoint.

        Returns:
            Dict[str, Any]: The user profile data as JSON
        """
        logger.info("[tool] fetch_user_profile: Starting profile fetch")

        if not self.service_role_key:
            return {"error": "SUPABASE_SERVICE_ROLE_KEY environment variable is required"}

        # Use service role key for authentication
        headers = {
            'Authorization': f'Bearer {self.service_role_key}',
            'apikey': self.service_role_key
        }

        # Get user_id from agent context
        params = {}
        if hasattr(self, '_agent') and hasattr(self._agent, 'current_user_id') and self._agent.current_user_id:
            params['user_id'] = self._agent.current_user_id
            logger.info(f"[tool] fetch_user_profile: Using authenticated user_id: {self._agent.current_user_id}")
        else:
            return {"error": "Authentication required: No user_id found. Please log in to access your profile."}

        # Create SSL context with certifi certificates to fix SSL verification issues
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_context)

        async with aiohttp.ClientSession(connector=connector) as session:
            try:
                async with session.get(self.api_url, headers=headers, params=params, timeout=self.timeout) as response:
                    response.raise_for_status()
                    profile_data = await response.json()
                    logger.info("[tool] fetch_user_profile: Successfully fetched profile data")
                    return profile_data
            except aiohttp.ClientError as e:
                error_msg = f"Failed to fetch user profile: {str(e)}"
                logger.error(f"[tool] fetch_user_profile: {error_msg}")
                return {"error": error_msg}

    async def get_tools_map(self) -> dict[str, Callable]:
        return {
            "fetch_user_profile": self.fetch_user_profile,
        }
