# Microsoft Outlook and Teams Calendar Tools

This document describes the Microsoft Outlook and Teams calendar integration tools for Youtu-agent.

## Overview

The calendar tools provide comprehensive integration with Microsoft Outlook calendars and Microsoft Teams meetings through the Microsoft Graph API. These tools enable agents to:

- Manage Outlook calendar events (create, read, update, delete)
- Schedule and manage Microsoft Teams meetings
- Find free time slots across multiple calendars
- Handle recurring meetings and events
- Integrate calendar functionality with other agent capabilities

## Authentication Setup

### Azure App Registration

1. Go to the [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Enter a name for your application
5. Set the redirect URI type to **Web** and enter `http://localhost` (or your app's redirect URI)
6. Click **Register**

### API Permissions

Add the following Microsoft Graph API permissions:

**For Outlook Calendar:**
- `Calendars.ReadWrite` - Read and write calendars
- `Calendars.ReadWrite.Shared` - Read and write shared calendars

**For Teams Meetings:**
- `OnlineMeetings.ReadWrite` - Read and write online meetings
- `Calendars.ReadWrite` - Read and write calendars (for calendar integration)

**For User Impersonation (Service Account):**
- `User.Read` - Sign in and read user profile
- `Calendars.ReadWrite` - Read and write calendars
- `OnlineMeetings.ReadWrite` - Read and write online meetings

### Authentication Methods

#### 1. Client Credentials Flow (Recommended for service accounts)
```yaml
config:
  client_id: "your-client-id"
  client_secret: "your-client-secret"
  tenant_id: "your-tenant-id"
```

#### 2. Direct Access Token
```yaml
config:
  access_token: "your-access-token"
```

## Outlook Calendar Tools

### `list_outlook_events`
List calendar events within a date range.

**Parameters:**
- `calendar_id` (str): Calendar ID or 'primary' (default: 'primary')
- `start_date` (str): Start date in ISO format (optional)
- `end_date` (str): End date in ISO format (optional)
- `max_results` (int): Maximum events to return (default: 10)

### `create_outlook_event`
Create a new calendar event.

**Parameters:**
- `subject` (str): Event subject/title
- `start_time` (str): Start time in ISO format
- `end_time` (str): End time in ISO format
- `location` (str): Event location (optional)
- `attendees` (str): Comma-separated attendee emails (optional)
- `body` (str): Event description (optional)
- `calendar_id` (str): Calendar ID (default: 'primary')

### `update_outlook_event`
Update an existing calendar event.

**Parameters:**
- `event_id` (str): ID of event to update
- `subject` (str): New subject (optional)
- `start_time` (str): New start time (optional)
- `end_time` (str): New end time (optional)
- `location` (str): New location (optional)
- `body` (str): New description (optional)
- `calendar_id` (str): Calendar ID (default: 'primary')

### `delete_outlook_event`
Delete a calendar event.

**Parameters:**
- `event_id` (str): ID of event to delete
- `calendar_id` (str): Calendar ID (default: 'primary')

### `find_free_time_outlook`
Find free time slots for scheduling.

**Parameters:**
- `start_time` (str): Start of search range (ISO format)
- `end_time` (str): End of search range (ISO format)
- `duration_minutes` (int): Meeting duration (default: 30)
- `attendees` (str): Comma-separated attendee emails (optional)

## Teams Calendar Tools

### `create_teams_meeting`
Create a Microsoft Teams meeting.

**Parameters:**
- `subject` (str): Meeting subject
- `start_time` (str): Start time in ISO format
- `end_time` (str): End time in ISO format
- `attendees` (str): Comma-separated attendee emails (optional)
- `agenda` (str): Meeting agenda (optional)
- `allow_anonymous_join` (bool): Allow anonymous users (default: true)

### `list_teams_meetings`
List upcoming Teams meetings.

**Parameters:**
- `start_date` (str): Start date in ISO format (optional)
- `end_date` (str): End date in ISO format (optional)
- `max_results` (int): Maximum meetings to return (default: 10)

### `update_teams_meeting`
Update an existing Teams meeting.

**Parameters:**
- `meeting_id` (str): ID of meeting to update
- `subject` (str): New subject (optional)
- `start_time` (str): New start time (optional)
- `end_time` (str): New end time (optional)
- `attendees` (str): New attendee emails (optional)
- `agenda` (str): New agenda (optional)

### `cancel_teams_meeting`
Cancel a Teams meeting.

**Parameters:**
- `meeting_id` (str): ID of meeting to cancel
- `cancellation_message` (str): Cancellation message (optional)

### `get_teams_meeting_details`
Get detailed information about a Teams meeting.

**Parameters:**
- `meeting_id` (str): ID of the meeting

### `schedule_recurring_teams_meeting`
Schedule a recurring Teams meeting.

**Parameters:**
- `subject` (str): Meeting subject
- `start_time` (str): First occurrence start time
- `duration_minutes` (int): Duration of each meeting
- `recurrence_pattern` (str): 'daily', 'weekly', 'monthly'
- `attendees` (str): Comma-separated attendee emails (optional)
- `agenda` (str): Meeting agenda (optional)
- `occurrences` (int): Number of occurrences (default: 10)

## Configuration Examples

### Basic Configuration
```yaml
name: calendar_tools
mode: builtin
activated_tools: null  # Use all tools
config:
  client_id: "${oc.env:MS_CLIENT_ID}"
  client_secret: "${oc.env:MS_CLIENT_SECRET}"
  tenant_id: "${oc.env:MS_TENANT_ID}"
```

### Selective Tool Activation
```yaml
name: teams_only
mode: builtin
activated_tools:
  - create_teams_meeting
  - list_teams_meetings
  - get_teams_meeting_details
config:
  client_id: "${oc.env:TEAMS_CLIENT_ID}"
  client_secret: "${oc.env:TEAMS_CLIENT_SECRET}"
  tenant_id: "${oc.env:TEAMS_TENANT_ID}"
```

## Environment Variables

Set these environment variables for your deployment:

```bash
# Outlook Calendar
export OUTLOOK_CLIENT_ID="your-client-id"
export OUTLOOK_CLIENT_SECRET="your-client-secret"
export OUTLOOK_TENANT_ID="your-tenant-id"

# Teams Calendar
export TEAMS_CLIENT_ID="your-client-id"
export TEAMS_CLIENT_SECRET="your-client-secret"
export TEAMS_TENANT_ID="your-tenant-id"

# Optional: Direct access tokens
export OUTLOOK_ACCESS_TOKEN="your-access-token"
export TEAMS_ACCESS_TOKEN="your-access-token"
```

## Usage Examples

### Schedule a Teams Meeting
```python
# Agent can create a Teams meeting
meeting = await agent.call_tool(
    "create_teams_meeting",
    subject="Project Review",
    start_time="2024-01-15T14:00:00",
    end_time="2024-01-15T15:00:00",
    attendees="user1@company.com,user2@company.com",
    agenda="Review project progress and next steps"
)
```

### Find Free Time Slots
```python
# Find available meeting times
free_slots = await agent.call_tool(
    "find_free_time_outlook",
    start_time="2024-01-15T09:00:00",
    end_time="2024-01-15T17:00:00",
    duration_minutes=60,
    attendees="team@company.com"
)
```

### List Upcoming Events
```python
# Get calendar events
events = await agent.call_tool(
    "list_outlook_events",
    start_date="2024-01-15",
    end_date="2024-01-22",
    max_results=20
)
```

## Error Handling

The tools include comprehensive error handling for common Microsoft Graph API issues:

- **Authentication errors**: Invalid credentials or expired tokens
- **Permission errors**: Missing API permissions
- **Rate limiting**: Automatic retry with exponential backoff
- **Network errors**: Connection timeouts and retries
- **Validation errors**: Invalid parameter formats

## Security Considerations

- Store credentials securely using environment variables
- Use the principle of least privilege for API permissions
- Regularly rotate client secrets and access tokens
- Monitor API usage and implement rate limiting
- Use HTTPS for all API communications

## Troubleshooting

### Common Issues

1. **"Invalid client" error**: Check client ID and tenant ID
2. **"Access denied" error**: Verify API permissions are granted
3. **"Token expired" error**: Refresh token or use client credentials flow
4. **"Calendar not found" error**: Verify calendar ID or use 'primary'

### Debug Mode

Enable debug logging to troubleshoot issues:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Integration with Other Tools

The calendar tools work seamlessly with other Youtu-agent tools:

- **Email Toolkit**: Send meeting invites and follow-ups
- **Search Toolkit**: Research optimal meeting times
- **Document Toolkit**: Process meeting agendas and minutes
- **User Interaction Toolkit**: Get user preferences for scheduling

## Best Practices

1. **Time Zone Handling**: Always specify time zones explicitly
2. **Attendee Management**: Validate email addresses before scheduling
3. **Meeting Duration**: Consider buffer time between meetings
4. **Recurring Meetings**: Plan recurrence patterns carefully
5. **Cancellation Policy**: Have clear cancellation procedures
6. **Meeting Limits**: Set reasonable limits on meeting duration and frequency
