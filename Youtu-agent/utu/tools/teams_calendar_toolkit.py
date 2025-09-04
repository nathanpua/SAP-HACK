"""
Microsoft Teams Calendar integration toolkit using Microsoft Graph API.
"""

import json
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Optional

import requests

from ..config import ToolkitConfig
from ..utils import get_logger
from .base import AsyncBaseToolkit

logger = get_logger(__name__)


class TeamsCalendarToolkit(AsyncBaseToolkit):
    """Toolkit for managing Microsoft Teams meetings and calendar integration."""

    def __init__(self, config: ToolkitConfig = None):
        """Initialize the TeamsCalendarToolkit.

        Required config:
        - client_id: Azure app registration client ID
        - client_secret: Azure app registration client secret
        - tenant_id: Azure tenant ID
        - access_token: Microsoft Graph API access token (optional if using client credentials)
        """
        super().__init__(config)
        self.client_id = self.config.config.get("client_id")
        self.client_secret = self.config.config.get("client_secret")
        self.tenant_id = self.config.config.get("tenant_id")
        self.access_token = self.config.config.get("access_token")

        # Microsoft Graph API endpoints
        self.graph_base_url = "https://graph.microsoft.com/v1.0"
        self.auth_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"

        # Ensure we have authentication
        if not self.access_token and not (self.client_id and self.client_secret and self.tenant_id):
            raise ValueError("Either access_token or (client_id, client_secret, tenant_id) must be provided")

    def _get_access_token(self) -> str:
        """Get access token using client credentials flow if not provided."""
        if self.access_token:
            return self.access_token

        data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://graph.microsoft.com/.default"
        }

        response = requests.post(self.auth_url, data=data)
        response.raise_for_status()

        token_data = response.json()
        return token_data["access_token"]

    def _make_graph_request(self, endpoint: str, method: str = "GET", data: dict = None) -> dict:
        """Make a request to Microsoft Graph API."""
        access_token = self._get_access_token()
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        url = f"{self.graph_base_url}{endpoint}"

        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PATCH":
            response = requests.patch(url, headers=headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")

        if response.status_code >= 400:
            logger.error(f"Graph API error: {response.status_code} - {response.text}")
            response.raise_for_status()

        return response.json() if response.content else {}

    async def create_teams_meeting(
        self,
        subject: str,
        start_time: str,
        end_time: str,
        attendees: str = "",
        agenda: str = "",
        allow_anonymous_join: bool = True
    ) -> str:
        """Create a Microsoft Teams meeting.

        Args:
            subject (str): Meeting subject/title
            start_time (str): Start time in ISO format (YYYY-MM-DDTHH:MM:SS)
            end_time (str): End time in ISO format (YYYY-MM-DDTHH:MM:SS)
            attendees (str): Comma-separated list of attendee email addresses
            agenda (str): Meeting agenda/description
            allow_anonymous_join (bool): Allow anonymous users to join

        Returns:
            str: JSON string with Teams meeting details including join URL
        """
        logger.info(f"[tool] create_teams_meeting: {subject} at {start_time}")

        # Parse attendees
        attendee_list = []
        if attendees:
            for email in attendees.split(","):
                email = email.strip()
                if email:
                    attendee_list.append({
                        "emailAddress": {"address": email, "name": email},
                        "type": "required"
                    })

        # Create online meeting with Teams integration
        meeting_data = {
            "startDateTime": start_time,
            "endDateTime": end_time,
            "subject": subject,
            "isOnlineMeeting": True,
            "onlineMeetingProvider": "teamsForBusiness",
            "attendees": attendee_list,
            "allowAttendeeToEnableCamera": True,
            "allowAttendeeToEnableMic": True,
            "allowAnonymousUsersToJoin": allow_anonymous_join
        }

        if agenda:
            meeting_data["body"] = {
                "contentType": "HTML",
                "content": f"<p>{agenda}</p>"
            }

        endpoint = "/me/onlineMeetings"

        try:
            response = self._make_graph_request(endpoint, "POST", meeting_data)

            # Also create calendar event for the meeting
            calendar_event = {
                "subject": subject,
                "start": {
                    "dateTime": start_time,
                    "timeZone": "UTC"
                },
                "end": {
                    "dateTime": end_time,
                    "timeZone": "UTC"
                },
                "isOnlineMeeting": True,
                "onlineMeetingUrl": response.get("joinUrl"),
                "attendees": attendee_list,
                "body": {
                    "contentType": "HTML",
                    "content": f"<p>{agenda}</p><p>Join Teams Meeting: <a href='{response.get('joinUrl')}'>{response.get('joinUrl')}</a></p>" if agenda else f"<p>Join Teams Meeting: <a href='{response.get('joinUrl')}'>{response.get('joinUrl')}</a></p>"
                }
            }

            calendar_response = self._make_graph_request("/me/events", "POST", calendar_event)

            return json.dumps({
                "meeting_id": response.get("id"),
                "join_url": response.get("joinUrl"),
                "meeting_code": response.get("meetingCode", ""),
                "subject": subject,
                "start_time": start_time,
                "end_time": end_time,
                "calendar_event_id": calendar_response.get("id"),
                "attendees": [attendee.get("emailAddress", {}).get("address") for attendee in attendee_list],
                "status": "created"
            }, indent=2)

        except Exception as e:
            logger.error(f"Error creating Teams meeting: {str(e)}")
            return json.dumps({"error": f"Failed to create Teams meeting: {str(e)}"})

    async def list_teams_meetings(
        self,
        start_date: str = None,
        end_date: str = None,
        max_results: int = 10
    ) -> str:
        """List upcoming Teams meetings.

        Args:
            start_date (str): Start date in ISO format (YYYY-MM-DDTHH:MM:SS)
            end_date (str): End date in ISO format (YYYY-MM-DDTHH:MM:SS)
            max_results (int): Maximum number of meetings to return

        Returns:
            str: JSON string of Teams meetings
        """
        logger.info(f"[tool] list_teams_meetings: start={start_date}, end={end_date}")

        if not start_date:
            start_date = datetime.now().isoformat()
        if not end_date:
            end_date = (datetime.now() + timedelta(days=30)).isoformat()

        # Query calendar events that are online meetings
        endpoint = "/me/events"
        params = {
            "$filter": f"start/dateTime ge '{start_date}' and end/dateTime le '{end_date}' and isOnlineMeeting eq true",
            "$orderby": "start/dateTime",
            "$top": max_results,
            "$select": "id,subject,start,end,isOnlineMeeting,onlineMeetingUrl,organizer,attendees,webLink"
        }

        try:
            response = self._make_graph_request(endpoint, "GET")
            events = response.get("value", [])

            teams_meetings = []
            for event in events:
                if event.get("isOnlineMeeting"):
                    meeting_info = {
                        "id": event.get("id"),
                        "subject": event.get("subject"),
                        "start": event.get("start", {}).get("dateTime"),
                        "end": event.get("end", {}).get("dateTime"),
                        "join_url": event.get("onlineMeetingUrl"),
                        "organizer": event.get("organizer", {}).get("emailAddress", {}).get("name"),
                        "attendees": [attendee.get("emailAddress", {}).get("name")
                                    for attendee in event.get("attendees", [])],
                        "webLink": event.get("webLink")
                    }
                    teams_meetings.append(meeting_info)

            return json.dumps(teams_meetings, indent=2)

        except Exception as e:
            logger.error(f"Error listing Teams meetings: {str(e)}")
            return json.dumps({"error": f"Failed to list Teams meetings: {str(e)}"})

    async def update_teams_meeting(
        self,
        meeting_id: str,
        subject: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        attendees: Optional[str] = None,
        agenda: Optional[str] = None
    ) -> str:
        """Update an existing Teams meeting.

        Args:
            meeting_id (str): ID of the meeting to update
            subject (str): New meeting subject
            start_time (str): New start time in ISO format
            end_time (str): New end time in ISO format
            attendees (str): New comma-separated list of attendee email addresses
            agenda (str): New meeting agenda

        Returns:
            str: JSON string with updated meeting details
        """
        logger.info(f"[tool] update_teams_meeting: {meeting_id}")

        update_data = {}
        if subject:
            update_data["subject"] = subject
        if start_time:
            update_data["start"] = {"dateTime": start_time, "timeZone": "UTC"}
        if end_time:
            update_data["end"] = {"dateTime": end_time, "timeZone": "UTC"}
        if attendees is not None:
            attendee_list = []
            for email in attendees.split(","):
                email = email.strip()
                if email:
                    attendee_list.append({
                        "emailAddress": {"address": email, "name": email},
                        "type": "required"
                    })
            update_data["attendees"] = attendee_list
        if agenda is not None:
            update_data["body"] = {
                "contentType": "HTML",
                "content": f"<p>{agenda}</p>"
            }

        if not update_data:
            return json.dumps({"error": "No fields provided for update"})

        endpoint = f"/me/events/{meeting_id}"

        try:
            response = self._make_graph_request(endpoint, "PATCH", update_data)
            return json.dumps({
                "id": response.get("id"),
                "subject": response.get("subject"),
                "start": response.get("start", {}).get("dateTime"),
                "end": response.get("end", {}).get("dateTime"),
                "join_url": response.get("onlineMeetingUrl"),
                "status": "updated"
            }, indent=2)
        except Exception as e:
            logger.error(f"Error updating Teams meeting: {str(e)}")
            return json.dumps({"error": f"Failed to update Teams meeting: {str(e)}"})

    async def cancel_teams_meeting(self, meeting_id: str, cancellation_message: str = "") -> str:
        """Cancel a Teams meeting.

        Args:
            meeting_id (str): ID of the meeting to cancel
            cancellation_message (str): Optional cancellation message

        Returns:
            str: JSON string confirming cancellation
        """
        logger.info(f"[tool] cancel_teams_meeting: {meeting_id}")

        # Cancel the calendar event (this will also cancel the Teams meeting)
        cancel_data = {
            "comment": cancellation_message or "Meeting cancelled"
        }

        endpoint = f"/me/events/{meeting_id}/cancel"

        try:
            self._make_graph_request(endpoint, "POST", cancel_data)
            return json.dumps({
                "status": "cancelled",
                "meeting_id": meeting_id,
                "message": cancellation_message or "Meeting cancelled"
            })
        except Exception as e:
            logger.error(f"Error cancelling Teams meeting: {str(e)}")
            return json.dumps({"error": f"Failed to cancel Teams meeting: {str(e)}"})

    async def get_meeting_details(self, meeting_id: str) -> str:
        """Get detailed information about a specific Teams meeting.

        Args:
            meeting_id (str): ID of the meeting

        Returns:
            str: JSON string with detailed meeting information
        """
        logger.info(f"[tool] get_meeting_details: {meeting_id}")

        endpoint = f"/me/events/{meeting_id}"

        try:
            response = self._make_graph_request(endpoint, "GET")

            meeting_details = {
                "id": response.get("id"),
                "subject": response.get("subject"),
                "start": response.get("start", {}).get("dateTime"),
                "end": response.get("end", {}).get("dateTime"),
                "is_online_meeting": response.get("isOnlineMeeting"),
                "join_url": response.get("onlineMeetingUrl"),
                "location": response.get("location", {}).get("displayName"),
                "organizer": response.get("organizer", {}).get("emailAddress", {}).get("name"),
                "attendees": [
                    {
                        "name": attendee.get("emailAddress", {}).get("name"),
                        "email": attendee.get("emailAddress", {}).get("address"),
                        "status": attendee.get("status", {}).get("response")
                    }
                    for attendee in response.get("attendees", [])
                ],
                "body": response.get("body", {}).get("content", ""),
                "webLink": response.get("webLink"),
                "last_modified": response.get("lastModifiedDateTime")
            }

            return json.dumps(meeting_details, indent=2)

        except Exception as e:
            logger.error(f"Error getting meeting details: {str(e)}")
            return json.dumps({"error": f"Failed to get meeting details: {str(e)}"})

    async def schedule_recurring_meeting(
        self,
        subject: str,
        start_time: str,
        duration_minutes: int,
        recurrence_pattern: str,
        attendees: str = "",
        agenda: str = "",
        occurrences: int = 10
    ) -> str:
        """Schedule a recurring Teams meeting.

        Args:
            subject (str): Meeting subject
            start_time (str): First occurrence start time in ISO format
            duration_minutes (int): Duration of each meeting in minutes
            recurrence_pattern (str): Pattern like 'weekly', 'daily', 'monthly'
            attendees (str): Comma-separated attendee emails
            agenda (str): Meeting agenda
            occurrences (int): Number of occurrences

        Returns:
            str: JSON string with recurring meeting details
        """
        logger.info(f"[tool] schedule_recurring_meeting: {subject} - {recurrence_pattern}")

        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        # Set up recurrence pattern
        recurrence = {
            "pattern": {
                "type": recurrence_pattern.lower(),
                "interval": 1
            },
            "range": {
                "type": "numbered",
                "numberOfOccurrences": occurrences,
                "startDate": start_dt.date().isoformat()
            }
        }

        # Parse attendees
        attendee_list = []
        if attendees:
            for email in attendees.split(","):
                email = email.strip()
                if email:
                    attendee_list.append({
                        "emailAddress": {"address": email, "name": email},
                        "type": "required"
                    })

        meeting_data = {
            "subject": subject,
            "start": {
                "dateTime": start_time,
                "timeZone": "UTC"
            },
            "end": {
                "dateTime": end_dt.isoformat(),
                "timeZone": "UTC"
            },
            "recurrence": recurrence,
            "isOnlineMeeting": True,
            "onlineMeetingProvider": "teamsForBusiness",
            "attendees": attendee_list
        }

        if agenda:
            meeting_data["body"] = {
                "contentType": "HTML",
                "content": f"<p>{agenda}</p>"
            }

        endpoint = "/me/events"

        try:
            response = self._make_graph_request(endpoint, "POST", meeting_data)
            return json.dumps({
                "id": response.get("id"),
                "subject": response.get("subject"),
                "start": response.get("start", {}).get("dateTime"),
                "recurrence": response.get("recurrence"),
                "join_url": response.get("onlineMeetingUrl"),
                "status": "created"
            }, indent=2)
        except Exception as e:
            logger.error(f"Error scheduling recurring meeting: {str(e)}")
            return json.dumps({"error": f"Failed to schedule recurring meeting: {str(e)}"})

    async def get_tools_map(self) -> dict[str, Callable]:
        return {
            "create_teams_meeting": self.create_teams_meeting,
            "list_teams_meetings": self.list_teams_meetings,
            "update_teams_meeting": self.update_teams_meeting,
            "cancel_teams_meeting": self.cancel_teams_meeting,
            "get_teams_meeting_details": self.get_meeting_details,
            "schedule_recurring_teams_meeting": self.schedule_recurring_meeting,
        }
