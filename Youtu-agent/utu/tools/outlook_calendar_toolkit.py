"""
Microsoft Outlook Calendar integration toolkit using Microsoft Graph API.
"""

import json
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Optional

import requests
from dateutil import parser as date_parser

from ..config import ToolkitConfig
from ..utils import get_logger
from .base import AsyncBaseToolkit

logger = get_logger(__name__)


class OutlookCalendarToolkit(AsyncBaseToolkit):
    """Toolkit for managing Microsoft Outlook calendars."""

    def __init__(self, config: ToolkitConfig = None):
        """Initialize the OutlookCalendarToolkit.

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

    async def list_events(
        self,
        calendar_id: str = "primary",
        start_date: str = None,
        end_date: str = None,
        max_results: int = 10
    ) -> str:
        """List calendar events within a date range.

        Args:
            calendar_id (str): Calendar ID or 'primary' for default calendar
            start_date (str): Start date in ISO format (YYYY-MM-DDTHH:MM:SS)
            end_date (str): End date in ISO format (YYYY-MM-DDTHH:MM:SS)
            max_results (int): Maximum number of events to return

        Returns:
            str: JSON string of calendar events
        """
        logger.info(f"[tool] list_events: calendar={calendar_id}, start={start_date}, end={end_date}")

        if not start_date:
            start_date = datetime.now().isoformat()
        if not end_date:
            end_date = (datetime.now() + timedelta(days=30)).isoformat()

        endpoint = f"/me/calendars/{calendar_id}/events"
        params = {
            "$filter": f"start/dateTime ge '{start_date}' and end/dateTime le '{end_date}'",
            "$orderby": "start/dateTime",
            "$top": max_results,
            "$select": "id,subject,start,end,location,organizer,attendees,webLink,body"
        }

        try:
            response = self._make_graph_request(endpoint, "GET")
            events = response.get("value", [])

            formatted_events = []
            for event in events:
                formatted_event = {
                    "id": event.get("id"),
                    "subject": event.get("subject"),
                    "start": event.get("start", {}).get("dateTime"),
                    "end": event.get("end", {}).get("dateTime"),
                    "location": event.get("location", {}).get("displayName"),
                    "organizer": event.get("organizer", {}).get("emailAddress", {}).get("name"),
                    "attendees": [attendee.get("emailAddress", {}).get("name")
                                for attendee in event.get("attendees", [])],
                    "webLink": event.get("webLink"),
                    "body": event.get("body", {}).get("content", "")[:200] + "..." if len(event.get("body", {}).get("content", "")) > 200 else event.get("body", {}).get("content", "")
                }
                formatted_events.append(formatted_event)

            return json.dumps(formatted_events, indent=2)

        except Exception as e:
            logger.error(f"Error listing events: {str(e)}")
            return json.dumps({"error": f"Failed to list events: {str(e)}"})

    async def create_event(
        self,
        subject: str,
        start_time: str,
        end_time: str,
        location: str = "",
        attendees: str = "",
        body: str = "",
        calendar_id: str = "primary"
    ) -> str:
        """Create a new calendar event.

        Args:
            subject (str): Event subject/title
            start_time (str): Start time in ISO format (YYYY-MM-DDTHH:MM:SS)
            end_time (str): End time in ISO format (YYYY-MM-DDTHH:MM:SS)
            location (str): Event location
            attendees (str): Comma-separated list of attendee email addresses
            body (str): Event description/body
            calendar_id (str): Calendar ID or 'primary' for default calendar

        Returns:
            str: JSON string with created event details
        """
        logger.info(f"[tool] create_event: {subject} at {start_time}")

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

        event_data = {
            "subject": subject,
            "start": {
                "dateTime": start_time,
                "timeZone": "UTC"
            },
            "end": {
                "dateTime": end_time,
                "timeZone": "UTC"
            },
            "location": {"displayName": location} if location else None,
            "body": {
                "contentType": "HTML",
                "content": body or ""
            }
        }

        if attendee_list:
            event_data["attendees"] = attendee_list

        endpoint = f"/me/calendars/{calendar_id}/events"

        try:
            response = self._make_graph_request(endpoint, "POST", event_data)
            return json.dumps({
                "id": response.get("id"),
                "subject": response.get("subject"),
                "start": response.get("start", {}).get("dateTime"),
                "end": response.get("end", {}).get("dateTime"),
                "webLink": response.get("webLink"),
                "status": "created"
            }, indent=2)
        except Exception as e:
            logger.error(f"Error creating event: {str(e)}")
            return json.dumps({"error": f"Failed to create event: {str(e)}"})

    async def update_event(
        self,
        event_id: str,
        subject: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        location: Optional[str] = None,
        body: Optional[str] = None,
        calendar_id: str = "primary"
    ) -> str:
        """Update an existing calendar event.

        Args:
            event_id (str): ID of the event to update
            subject (str): New event subject
            start_time (str): New start time in ISO format
            end_time (str): New end time in ISO format
            location (str): New event location
            body (str): New event description
            calendar_id (str): Calendar ID or 'primary' for default calendar

        Returns:
            str: JSON string with updated event details
        """
        logger.info(f"[tool] update_event: {event_id}")

        update_data = {}
        if subject:
            update_data["subject"] = subject
        if start_time:
            update_data["start"] = {"dateTime": start_time, "timeZone": "UTC"}
        if end_time:
            update_data["end"] = {"dateTime": end_time, "timeZone": "UTC"}
        if location is not None:
            update_data["location"] = {"displayName": location}
        if body is not None:
            update_data["body"] = {"contentType": "HTML", "content": body}

        if not update_data:
            return json.dumps({"error": "No fields provided for update"})

        endpoint = f"/me/calendars/{calendar_id}/events/{event_id}"

        try:
            response = self._make_graph_request(endpoint, "PATCH", update_data)
            return json.dumps({
                "id": response.get("id"),
                "subject": response.get("subject"),
                "start": response.get("start", {}).get("dateTime"),
                "end": response.get("end", {}).get("dateTime"),
                "status": "updated"
            }, indent=2)
        except Exception as e:
            logger.error(f"Error updating event: {str(e)}")
            return json.dumps({"error": f"Failed to update event: {str(e)}"})

    async def delete_event(self, event_id: str, calendar_id: str = "primary") -> str:
        """Delete a calendar event.

        Args:
            event_id (str): ID of the event to delete
            calendar_id (str): Calendar ID or 'primary' for default calendar

        Returns:
            str: JSON string confirming deletion
        """
        logger.info(f"[tool] delete_event: {event_id}")

        endpoint = f"/me/calendars/{calendar_id}/events/{event_id}"

        try:
            self._make_graph_request(endpoint, "DELETE")
            return json.dumps({"status": "deleted", "event_id": event_id})
        except Exception as e:
            logger.error(f"Error deleting event: {str(e)}")
            return json.dumps({"error": f"Failed to delete event: {str(e)}"})

    async def find_free_time(
        self,
        start_time: str,
        end_time: str,
        duration_minutes: int = 30,
        attendees: str = ""
    ) -> str:
        """Find free time slots for scheduling meetings.

        Args:
            start_time (str): Start of time range to search (ISO format)
            end_time (str): End of time range to search (ISO format)
            duration_minutes (int): Duration of meeting in minutes
            attendees (str): Comma-separated list of attendee email addresses

        Returns:
            str: JSON string with available time slots
        """
        logger.info(f"[tool] find_free_time: duration={duration_minutes}min")

        attendee_list = []
        if attendees:
            for email in attendees.split(","):
                email = email.strip()
                if email:
                    attendee_list.append({"emailAddress": {"address": email}})

        schedule_data = {
            "schedules": [attendee["emailAddress"]["address"] for attendee in attendee_list] if attendee_list else ["me"],
            "startTime": {
                "dateTime": start_time,
                "timeZone": "UTC"
            },
            "endTime": {
                "dateTime": end_time,
                "timeZone": "UTC"
            },
            "availabilityViewInterval": 30
        }

        endpoint = "/me/calendar/getSchedule"

        try:
            response = self._make_graph_request(endpoint, "POST", schedule_data)

            # Find free slots
            free_slots = []
            for schedule in response.get("value", []):
                availability = schedule.get("availabilityView", "")
                schedule_id = schedule.get("scheduleId", "")

                # Parse availability string (0=free, 1=tentative, 2=busy, 3=out of office, 4=unknown)
                slot_start = date_parser.parse(start_time)

                for i, status in enumerate(availability):
                    if status == "0":  # Free
                        slot_time = slot_start + timedelta(minutes=i * 30)
                        free_slots.append({
                            "scheduleId": schedule_id,
                            "startTime": slot_time.isoformat(),
                            "endTime": (slot_time + timedelta(minutes=duration_minutes)).isoformat()
                        })

            return json.dumps({
                "free_slots": free_slots[:10],  # Return top 10 slots
                "total_found": len(free_slots)
            }, indent=2)

        except Exception as e:
            logger.error(f"Error finding free time: {str(e)}")
            return json.dumps({"error": f"Failed to find free time: {str(e)}"})

    async def get_tools_map(self) -> dict[str, Callable]:
        return {
            "list_outlook_events": self.list_events,
            "create_outlook_event": self.create_event,
            "update_outlook_event": self.update_event,
            "delete_outlook_event": self.delete_event,
            "find_free_time_outlook": self.find_free_time,
        }
