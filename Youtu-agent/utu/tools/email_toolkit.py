"""
Email writing toolkit for drafting professional emails in career contexts.
"""

import json
from collections.abc import Callable
from typing import Literal

from ..config import ToolkitConfig
from ..utils import SimplifiedAsyncOpenAI, get_logger
from .base import TOOL_PROMPTS, AsyncBaseToolkit

logger = get_logger(__name__)


class EmailToolkit(AsyncBaseToolkit):
    def __init__(self, config: ToolkitConfig = None):
        """Initialize the EmailToolkit."""
        super().__init__(config)
        self.llm = SimplifiedAsyncOpenAI(
            **self.config.config_llm.model_provider.model_dump() if self.config.config_llm else {}
        )

    async def draft_job_application_email(
        self,
        position: str,
        company: str,
        your_name: str,
        your_experience: str = "",
        your_motivation: str = "",
        contact_info: str = ""
    ) -> str:
        """Draft a professional job application email.

        Args:
            position (str): The job position you're applying for
            company (str): The company name
            your_name (str): Your full name
            your_experience (str): Brief summary of your relevant experience (optional)
            your_motivation (str): Why you're interested in this role/company (optional)
            contact_info (str): Your contact information (optional)

        Returns:
            str: Complete email draft with subject, greeting, body, and closing
        """
        logger.info(f"[tool] draft_job_application_email: {position} at {company}")

        template = TOOL_PROMPTS["email_job_application"].format(
            position=position,
            company=company,
            your_name=your_name,
            your_experience=your_experience or "your relevant experience",
            your_motivation=your_motivation or "your interest in this role",
            contact_info=contact_info or "your contact information"
        )

        email_draft = await self.llm.query_one(
            messages=[{"role": "user", "content": template}],
            **self.config.config_llm.model_params.model_dump()
        )

        return email_draft

    async def draft_follow_up_email(
        self,
        company: str,
        position: str,
        your_name: str,
        interview_date: str = "",
        follow_up_reason: str = "",
        additional_info: str = ""
    ) -> str:
        """Draft a professional follow-up email after interview or application.

        Args:
            company (str): The company name
            position (str): The position you applied for
            your_name (str): Your full name
            interview_date (str): Date of interview if applicable (optional)
            follow_up_reason (str): Reason for following up (optional)
            additional_info (str): Additional information to include (optional)

        Returns:
            str: Complete follow-up email draft
        """
        logger.info(f"[tool] draft_follow_up_email: {company} - {position}")

        template = TOOL_PROMPTS["email_follow_up"].format(
            company=company,
            position=position,
            your_name=your_name,
            interview_date=interview_date or "recent interview/application",
            follow_up_reason=follow_up_reason or "following up on your application",
            additional_info=additional_info or ""
        )

        email_draft = await self.llm.query_one(
            messages=[{"role": "user", "content": template}],
            **self.config.config_llm.model_params.model_dump()
        )

        return email_draft

    async def draft_networking_email(
        self,
        recipient_name: str,
        recipient_title: str,
        recipient_company: str,
        your_name: str,
        your_title: str,
        your_company: str,
        connection_reason: str,
        mutual_connection: str = ""
    ) -> str:
        """Draft a professional networking email.

        Args:
            recipient_name (str): Name of the person you're contacting
            recipient_title (str): Their job title
            recipient_company (str): Their company
            your_name (str): Your full name
            your_title (str): Your job title
            your_company (str): Your company
            connection_reason (str): Why you're reaching out
            mutual_connection (str): Name of mutual connection if applicable (optional)

        Returns:
            str: Complete networking email draft
        """
        logger.info(f"[tool] draft_networking_email: to {recipient_name} at {recipient_company}")

        template = TOOL_PROMPTS["email_networking"].format(
            recipient_name=recipient_name,
            recipient_title=recipient_title,
            recipient_company=recipient_company,
            your_name=your_name,
            your_title=your_title,
            your_company=your_company,
            connection_reason=connection_reason,
            mutual_connection=mutual_connection or "professional networking"
        )

        email_draft = await self.llm.query_one(
            messages=[{"role": "user", "content": template}],
            **self.config.config_llm.model_params.model_dump()
        )

        return email_draft

    async def draft_thank_you_email(
        self,
        recipient_name: str,
        recipient_title: str,
        your_name: str,
        meeting_purpose: str,
        key_takeaways: str = "",
        next_steps: str = ""
    ) -> str:
        """Draft a professional thank-you email after a meeting or interview.

        Args:
            recipient_name (str): Name of the person you met with
            recipient_title (str): Their job title
            your_name (str): Your full name
            meeting_purpose (str): Purpose of the meeting/interview
            key_takeaways (str): Key points from the discussion (optional)
            next_steps (str): Proposed next steps (optional)

        Returns:
            str: Complete thank-you email draft
        """
        logger.info(f"[tool] draft_thank_you_email: to {recipient_name}")

        template = TOOL_PROMPTS["email_thank_you"].format(
            recipient_name=recipient_name,
            recipient_title=recipient_title,
            your_name=your_name,
            meeting_purpose=meeting_purpose,
            key_takeaways=key_takeaways or "the valuable insights shared",
            next_steps=next_steps or "continue the conversation"
        )

        email_draft = await self.llm.query_one(
            messages=[{"role": "user", "content": template}],
            **self.config.config_llm.model_params.model_dump()
        )

        return email_draft

    async def draft_custom_email(
        self,
        email_type: str,
        recipient_info: str,
        your_info: str,
        email_purpose: str,
        key_points: str = "",
        tone: Literal["professional", "casual", "formal"] = "professional"
    ) -> str:
        """Draft a custom professional email for various career-related purposes.

        Args:
            email_type (str): Type of email (e.g., "inquiry", "introduction", "request")
            recipient_info (str): Information about the recipient
            your_info (str): Information about yourself
            email_purpose (str): Main purpose of the email
            key_points (str): Key points to include (optional)
            tone (str): Desired tone of the email

        Returns:
            str: Complete custom email draft
        """
        logger.info(f"[tool] draft_custom_email: {email_type} - {email_purpose}")

        template = TOOL_PROMPTS["email_custom"].format(
            email_type=email_type,
            recipient_info=recipient_info,
            your_info=your_info,
            email_purpose=email_purpose,
            key_points=key_points or "relevant details",
            tone=tone
        )

        email_draft = await self.llm.query_one(
            messages=[{"role": "user", "content": template}],
            **self.config.config_llm.model_params.model_dump()
        )

        return email_draft

    async def get_tools_map(self) -> dict[str, Callable]:
        return {
            "draft_job_application_email": self.draft_job_application_email,
            "draft_follow_up_email": self.draft_follow_up_email,
            "draft_networking_email": self.draft_networking_email,
            "draft_thank_you_email": self.draft_thank_you_email,
            "draft_custom_email": self.draft_custom_email,
        }
