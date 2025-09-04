# Microsoft Calendar Tools Setup and Testing Guide

This comprehensive guide walks you through setting up and testing the Microsoft Outlook and Teams calendar integration tools for Youtu-agent.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure App Registration](#azure-app-registration)
3. [Environment Configuration](#environment-configuration)
4. [Installation and Setup](#installation-and-setup)
5. [Testing the Tools](#testing-the-tools)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Usage Examples](#advanced-usage-examples)
8. [Integration Testing](#integration-testing)

## Prerequisites

### System Requirements

- Python 3.8 or higher
- Youtu-agent framework installed
- Azure subscription with administrative access
- Microsoft 365 account with calendar access
- Internet connection for API calls

### Required Python Packages

The tools use standard libraries, but you may need to install additional dependencies:

```bash
pip install requests python-dateutil
```

### Azure Requirements

- Azure Active Directory tenant
- Permission to create app registrations
- Microsoft 365 licenses for users (if testing with real accounts)

## Azure App Registration

### Step 1: Create App Registration

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** → **App registrations**
3. Click **+ New registration**

   ![Azure Portal - New App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/media/quickstart-register-app/app-registration-page.png)

4. Configure basic settings:
   - **Name**: `Youtu-Agent-Calendar-Integration`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: `http://localhost` (for testing)

### Step 2: Configure API Permissions

Add the following Microsoft Graph permissions:

#### For Outlook Calendar:
```
Calendars.ReadWrite
Calendars.ReadWrite.Shared
User.Read
```

#### For Teams Meetings:
```
OnlineMeetings.ReadWrite
Calendars.ReadWrite
User.Read
```

#### For Service Account Access:
```
Calendars.ReadWrite.All
OnlineMeetings.ReadWrite.All
User.Read.All
```

**To add permissions:**
1. In your app registration, go to **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Choose **Application permissions** (for service accounts) or **Delegated permissions** (for user accounts)
5. Search and add the required permissions
6. Click **Grant admin consent** for your organization

![API Permissions Configuration](https://docs.microsoft.com/en-us/graph/images/permissions-consent.png)

### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **+ New client secret**
3. Configure:
   - **Description**: `Youtu-Agent Secret`
   - **Expires**: `24 months` (recommended)
4. **Copy the secret value immediately** (you won't be able to see it again)

### Step 4: Note Required Values

Record these values for configuration:
- **Application (client) ID**: From the app overview page
- **Directory (tenant) ID**: From the app overview page
- **Client Secret**: The value you copied in Step 3

## Environment Configuration

### Create Environment Variables

Create a `.env` file in your project root or set environment variables:

```bash
# Outlook Calendar Configuration
OUTLOOK_CLIENT_ID="your-application-client-id"
OUTLOOK_CLIENT_SECRET="your-client-secret"
OUTLOOK_TENANT_ID="your-directory-tenant-id"

# Teams Calendar Configuration
TEAMS_CLIENT_ID="your-application-client-id"
TEAMS_CLIENT_SECRET="your-client-secret"
TEAMS_TENANT_ID="your-directory-tenant-id"

# Optional: LLM Configuration for enhanced features
UTU_LLM_TYPE="openai"
UTU_LLM_MODEL="gpt-4"
UTU_LLM_API_KEY="your-llm-api-key"
UTU_LLM_BASE_URL="https://api.openai.com/v1"
```

### Alternative: Direct Access Token Setup

If you prefer to use access tokens directly:

```bash
# Get access token using Azure CLI or other methods
OUTLOOK_ACCESS_TOKEN="your-access-token-here"
TEAMS_ACCESS_TOKEN="your-access-token-here"
```

## Installation and Setup

### Step 1: Verify Implementation

Ensure all files are in place:

```bash
# Check that the toolkit files exist
ls -la utu/tools/outlook_calendar_toolkit.py
ls -la utu/tools/teams_calendar_toolkit.py

# Check configuration files
ls -la configs/agents/tools/outlook_calendar.yaml
ls -la configs/agents/tools/teams_calendar.yaml
```

### Step 2: Register Toolkits

Verify that the toolkits are registered in the TOOLKIT_MAP:

```bash
# Check the __init__.py file
grep -A 5 -B 5 "outlook_calendar\|teams_calendar" utu/tools/__init__.py
```

### Step 3: Test Import

Test that the toolkits can be imported without errors:

```python
# In Python REPL or test script
from utu.tools.outlook_calendar_toolkit import OutlookCalendarToolkit
from utu.tools.teams_calendar_toolkit import TeamsCalendarToolkit

print("Toolkits imported successfully!")
```

## Testing the Tools

### Test 1: Basic Authentication Test

Create a simple test script to verify authentication:

```python
#!/usr/bin/env python3
"""
Basic authentication test for calendar tools
"""

import asyncio
import os
from utu.config import ToolkitConfig
from utu.tools.outlook_calendar_toolkit import OutlookCalendarToolkit

async def test_authentication():
    """Test basic authentication with Microsoft Graph API"""

    # Load configuration
    config = ToolkitConfig(config={
        "client_id": os.getenv("OUTLOOK_CLIENT_ID"),
        "client_secret": os.getenv("OUTLOOK_CLIENT_SECRET"),
        "tenant_id": os.getenv("OUTLOOK_TENANT_ID"),
    })

    # Initialize toolkit
    toolkit = OutlookCalendarToolkit(config=config)

    try:
        # Test authentication by trying to get access token
        # This will fail if credentials are invalid
        access_token = toolkit._get_access_token()
        print("✅ Authentication successful!")
        print(f"Token obtained: {access_token[:20]}...")

    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return False

    return True

if __name__ == "__main__":
    success = asyncio.run(test_authentication())
    if success:
        print("\n🎉 Basic authentication test passed!")
    else:
        print("\n💥 Basic authentication test failed!")
```

**Run the test:**

```bash
python test_auth.py
```

### Test 2: Outlook Calendar Operations

Create a comprehensive test for Outlook calendar functionality:

```python
#!/usr/bin/env python3
"""
Comprehensive test for Outlook calendar tools
"""

import asyncio
import os
import json
from datetime import datetime, timedelta
from utu.config import ToolkitConfig
from utu.tools.outlook_calendar_toolkit import OutlookCalendarToolkit

async def test_outlook_calendar():
    """Test Outlook calendar operations"""

    print("🔄 Testing Outlook Calendar Tools...")

    # Configuration
    config = ToolkitConfig(config={
        "client_id": os.getenv("OUTLOOK_CLIENT_ID"),
        "client_secret": os.getenv("OUTLOOK_CLIENT_SECRET"),
        "tenant_id": os.getenv("OUTLOOK_TENANT_ID"),
    })

    toolkit = OutlookCalendarToolkit(config=config)

    # Test 1: List upcoming events
    print("\n📅 Test 1: Listing calendar events...")
    try:
        start_date = datetime.now().isoformat()
        end_date = (datetime.now() + timedelta(days=7)).isoformat()

        events = await toolkit.list_events(
            start_date=start_date,
            end_date=end_date,
            max_results=5
        )

        print("✅ Events retrieved successfully")
        print(f"Events: {events[:200]}...")

    except Exception as e:
        print(f"❌ Failed to list events: {e}")

    # Test 2: Create a test event
    print("\n📝 Test 2: Creating calendar event...")
    try:
        start_time = (datetime.now() + timedelta(hours=1)).isoformat()
        end_time = (datetime.now() + timedelta(hours=2)).isoformat()

        event = await toolkit.create_event(
            subject="Youtu-Agent Test Event",
            start_time=start_time,
            end_time=end_time,
            location="Virtual Meeting",
            body="Test event created by Youtu-agent calendar tools"
        )

        print("✅ Event created successfully")
        event_data = json.loads(event)
        event_id = event_data.get("id")
        print(f"Event ID: {event_id}")

        # Store event ID for cleanup
        test_event_id = event_id

    except Exception as e:
        print(f"❌ Failed to create event: {e}")
        test_event_id = None

    # Test 3: Find free time
    print("\n⏰ Test 3: Finding free time slots...")
    try:
        start_time = datetime.now().isoformat()
        end_time = (datetime.now() + timedelta(days=1)).isoformat()

        free_slots = await toolkit.find_free_time(
            start_time=start_time,
            end_time=end_time,
            duration_minutes=30
        )

        print("✅ Free time slots found")
        print(f"Free slots: {free_slots[:200]}...")

    except Exception as e:
        print(f"❌ Failed to find free time: {e}")

    # Cleanup: Delete test event
    if test_event_id:
        print(f"\n🧹 Cleanup: Deleting test event {test_event_id}...")
        try:
            await toolkit.delete_event(test_event_id)
            print("✅ Test event deleted successfully")
        except Exception as e:
            print(f"❌ Failed to delete test event: {e}")

    print("\n🏁 Outlook Calendar tests completed!")

if __name__ == "__main__":
    asyncio.run(test_outlook_calendar())
```

### Test 3: Teams Meeting Operations

Create a test script for Teams meeting functionality:

```python
#!/usr/bin/env python3
"""
Comprehensive test for Teams calendar tools
"""

import asyncio
import os
import json
from datetime import datetime, timedelta
from utu.config import ToolkitConfig
from utu.tools.teams_calendar_toolkit import TeamsCalendarToolkit

async def test_teams_meeting():
    """Test Teams meeting operations"""

    print("👥 Testing Teams Calendar Tools...")

    # Configuration
    config = ToolkitConfig(config={
        "client_id": os.getenv("TEAMS_CLIENT_ID"),
        "client_secret": os.getenv("TEAMS_CLIENT_SECRET"),
        "tenant_id": os.getenv("TEAMS_TENANT_ID"),
    })

    toolkit = TeamsCalendarToolkit(config=config)

    # Test 1: List existing meetings
    print("\n📋 Test 1: Listing Teams meetings...")
    try:
        start_date = datetime.now().isoformat()
        end_date = (datetime.now() + timedelta(days=7)).isoformat()

        meetings = await toolkit.list_teams_meetings(
            start_date=start_date,
            end_date=end_date,
            max_results=5
        )

        print("✅ Meetings retrieved successfully")
        print(f"Meetings: {meetings[:200]}...")

    except Exception as e:
        print(f"❌ Failed to list meetings: {e}")

    # Test 2: Create a Teams meeting
    print("\n🎥 Test 2: Creating Teams meeting...")
    try:
        start_time = (datetime.now() + timedelta(hours=2)).isoformat()
        end_time = (datetime.now() + timedelta(hours=3)).isoformat()

        meeting = await toolkit.create_teams_meeting(
            subject="Youtu-Agent Teams Test Meeting",
            start_time=start_time,
            end_time=end_time,
            attendees="",  # Add test email if available
            agenda="Testing Teams integration with Youtu-agent",
            allow_anonymous_join=True
        )

        print("✅ Teams meeting created successfully")
        meeting_data = json.loads(meeting)
        meeting_id = meeting_data.get("meeting_id")
        join_url = meeting_data.get("join_url")
        print(f"Meeting ID: {meeting_id}")
        print(f"Join URL: {join_url}")

        # Store for cleanup
        test_meeting_id = meeting_id

    except Exception as e:
        print(f"❌ Failed to create Teams meeting: {e}")
        test_meeting_id = None

    # Test 3: Get meeting details
    if test_meeting_id:
        print(f"\n📋 Test 3: Getting meeting details for {test_meeting_id}...")
        try:
            details = await toolkit.get_teams_meeting_details(test_meeting_id)
            print("✅ Meeting details retrieved successfully")
            print(f"Details: {details[:300]}...")

        except Exception as e:
            print(f"❌ Failed to get meeting details: {e}")

    # Test 4: Create recurring meeting
    print("\n🔄 Test 4: Creating recurring meeting...")
    try:
        start_time = (datetime.now() + timedelta(days=1, hours=10)).isoformat()

        recurring = await toolkit.schedule_recurring_meeting(
            subject="Weekly Youtu-Agent Sync",
            start_time=start_time,
            duration_minutes=60,
            recurrence_pattern="weekly",
            attendees="",
            agenda="Weekly synchronization and updates",
            occurrences=4
        )

        print("✅ Recurring meeting scheduled successfully")
        print(f"Recurring meeting: {recurring[:200]}...")

    except Exception as e:
        print(f"❌ Failed to schedule recurring meeting: {e}")

    # Cleanup: Cancel test meeting
    if test_meeting_id:
        print(f"\n🧹 Cleanup: Cancelling test meeting {test_meeting_id}...")
        try:
            await toolkit.cancel_teams_meeting(
                test_meeting_id,
                "Test meeting cleanup"
            )
            print("✅ Test meeting cancelled successfully")
        except Exception as e:
            print(f"❌ Failed to cancel test meeting: {e}")

    print("\n🏁 Teams Calendar tests completed!")

if __name__ == "__main__":
    asyncio.run(test_teams_meeting())
```

### Test 4: Integration Test with Agent

Test the tools through the Youtu-agent framework:

```python
#!/usr/bin/env python3
"""
Integration test with Youtu-agent framework
"""

import asyncio
import os
from datetime import datetime, timedelta

from utu.config import ConfigLoader
from utu.agents.orchestra.planner import OrchestraPlanner

async def test_agent_integration():
    """Test calendar tools through the agent framework"""

    print("🤖 Testing Agent Integration...")

    # Load calendar agent configuration
    config = ConfigLoader.load_agent_config("calendar_agent_example")

    # Initialize agent
    agent = OrchestraPlanner(config=config)

    # Test 1: Schedule a meeting using natural language
    print("\n📅 Test 1: Natural language meeting scheduling...")
    try:
        user_request = """
        Schedule a Teams meeting for tomorrow at 2 PM for 1 hour.
        Topic: Project Status Update
        Invite: team@company.com
        Agenda: Review project progress, discuss blockers, plan next steps
        """

        response = await agent.process_request(user_request)
        print("✅ Meeting scheduled successfully through agent")
        print(f"Response: {response[:300]}...")

    except Exception as e:
        print(f"❌ Agent scheduling failed: {e}")

    # Test 2: Check calendar availability
    print("\n📊 Test 2: Calendar availability check...")
    try:
        availability_request = """
        Check my calendar for free time slots this week between 9 AM and 5 PM.
        I need 1-hour blocks for meetings.
        """

        response = await agent.process_request(availability_request)
        print("✅ Availability check completed")
        print(f"Response: {response[:300]}...")

    except Exception as e:
        print(f"❌ Availability check failed: {e}")

    # Test 3: List upcoming events
    print("\n📋 Test 3: List upcoming events...")
    try:
        list_request = """
        Show me my calendar events for the next 3 days.
        Include meeting details and join links if available.
        """

        response = await agent.process_request(list_request)
        print("✅ Events listed successfully")
        print(f"Response: {response[:300]}...")

    except Exception as e:
        print(f"❌ Event listing failed: {e}")

    print("\n🏁 Agent integration tests completed!")

if __name__ == "__main__":
    asyncio.run(test_agent_integration())
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Errors

**Error:** `invalid_client`
```
Solution: Verify client_id, tenant_id, and client_secret are correct
```

**Error:** `unauthorized_client`
```
Solution: Check that API permissions are granted and admin consent is given
```

**Error:** `invalid_grant`
```
Solution: Ensure client_secret is valid and not expired
```

#### 2. Permission Errors

**Error:** `Access denied`
```
Solution: Add required Microsoft Graph permissions and grant admin consent
```

**Error:** `Insufficient privileges`
```
Solution: Use Application permissions instead of Delegated permissions for service accounts
```

#### 3. Network and API Errors

**Error:** `Connection timeout`
```
Solution: Check internet connectivity and Azure service status
```

**Error:** `Rate limit exceeded`
```
Solution: Implement exponential backoff and reduce request frequency
```

#### 4. Calendar-Specific Errors

**Error:** `Calendar not found`
```
Solution: Use 'primary' as calendar_id or verify calendar exists
```

**Error:** `Meeting creation failed`
```
Solution: Check Teams licensing and OnlineMeetings permissions
```

### Debug Mode

Enable detailed logging for troubleshooting:

```python
import logging

# Enable debug logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Set specific loggers
logging.getLogger('utu.tools.outlook_calendar_toolkit').setLevel(logging.DEBUG)
logging.getLogger('utu.tools.teams_calendar_toolkit').setLevel(logging.DEBUG)
```

### Test Environment Variables

Create a test script to verify environment variables:

```python
#!/usr/bin/env python3
"""
Environment variables validation script
"""

import os

def check_env_vars():
    """Check required environment variables"""

    required_vars = [
        'OUTLOOK_CLIENT_ID',
        'OUTLOOK_CLIENT_SECRET',
        'OUTLOOK_TENANT_ID',
        'TEAMS_CLIENT_ID',
        'TEAMS_CLIENT_SECRET',
        'TEAMS_TENANT_ID'
    ]

    print("🔍 Checking environment variables...")

    missing = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {'*' * len(value)} (set)")
        else:
            print(f"❌ {var}: NOT SET")
            missing.append(var)

    if missing:
        print(f"\n💥 Missing required variables: {', '.join(missing)}")
        return False
    else:
        print("\n🎉 All required environment variables are set!")
        return True

if __name__ == "__main__":
    check_env_vars()
```

## Advanced Usage Examples

### Example 1: Automated Meeting Scheduler

```python
#!/usr/bin/env python3
"""
Automated meeting scheduler with conflict resolution
"""

import asyncio
from datetime import datetime, timedelta
from utu.tools.outlook_calendar_toolkit import OutlookCalendarToolkit
from utu.tools.teams_calendar_toolkit import TeamsCalendarToolkit

class AutomatedMeetingScheduler:
    """Automated meeting scheduling system"""

    def __init__(self, outlook_config, teams_config):
        self.outlook = OutlookCalendarToolkit(outlook_config)
        self.teams = TeamsCalendarToolkit(teams_config)

    async def schedule_optimal_meeting(self, preferences):
        """Schedule meeting at optimal time based on preferences"""

        # Find free time slots
        free_slots = await self.outlook.find_free_time(
            start_time=preferences['start_range'],
            end_time=preferences['end_range'],
            duration_minutes=preferences['duration'],
            attendees=preferences.get('attendees', '')
        )

        # Parse free slots and select optimal time
        slots_data = json.loads(free_slots)
        available_slots = slots_data.get('free_slots', [])

        if not available_slots:
            return {"error": "No free time slots available"}

        # Select first available slot (could implement more complex logic)
        selected_slot = available_slots[0]

        # Create Teams meeting
        meeting = await self.teams.create_teams_meeting(
            subject=preferences['subject'],
            start_time=selected_slot['startTime'],
            end_time=selected_slot['endTime'],
            attendees=preferences.get('attendees', ''),
            agenda=preferences.get('agenda', ''),
            allow_anonymous_join=True
        )

        return {
            "meeting": json.loads(meeting),
            "slot": selected_slot
        }

# Usage example
async def main():
    scheduler = AutomatedMeetingScheduler(outlook_config, teams_config)

    meeting_request = {
        'subject': 'Sprint Planning',
        'start_range': '2024-01-15T09:00:00Z',
        'end_range': '2024-01-15T17:00:00Z',
        'duration': 90,
        'attendees': 'team@company.com,manager@company.com',
        'agenda': 'Sprint planning and task assignment'
    }

    result = await scheduler.schedule_optimal_meeting(meeting_request)
    print(f"Meeting scheduled: {result}")

if __name__ == "__main__":
    asyncio.run(main())
```

### Example 2: Calendar Analytics

```python
#!/usr/bin/env python3
"""
Calendar analytics and reporting tool
"""

import asyncio
import json
from datetime import datetime, timedelta
from collections import defaultdict
from utu.tools.outlook_calendar_toolkit import OutlookCalendarToolkit

class CalendarAnalytics:
    """Analyze calendar data for insights"""

    def __init__(self, config):
        self.toolkit = OutlookCalendarToolkit(config)

    async def analyze_calendar_usage(self, days=30):
        """Analyze calendar usage patterns"""

        # Get events for analysis period
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        end_date = datetime.now().isoformat()

        events_str = await self.toolkit.list_events(
            start_date=start_date,
            end_date=end_date,
            max_results=1000
        )

        events = json.loads(events_str)

        # Analyze patterns
        analysis = {
            'total_events': len(events),
            'events_by_day': defaultdict(int),
            'events_by_hour': defaultdict(int),
            'meeting_durations': [],
            'attendees_count': []
        }

        for event in events:
            start = datetime.fromisoformat(event['start'].replace('Z', '+00:00'))

            # Count by day and hour
            analysis['events_by_day'][start.strftime('%A')] += 1
            analysis['events_by_hour'][start.hour] += 1

            # Calculate duration
            end = datetime.fromisoformat(event['end'].replace('Z', '+00:00'))
            duration = (end - start).total_seconds() / 3600  # hours
            analysis['meeting_durations'].append(duration)

            # Count attendees
            attendees = len(event.get('attendees', []))
            analysis['attendees_count'].append(attendees)

        return analysis

    async def generate_report(self, days=30):
        """Generate calendar usage report"""

        analysis = await self.analyze_calendar_usage(days)

        report = f"""
Calendar Analytics Report ({days} days)
=====================================

Total Events: {analysis['total_events']}

Most Active Days:
{self._format_top_items(analysis['events_by_day'], 3)}

Most Active Hours:
{self._format_top_items(analysis['events_by_hour'], 5)}

Average Meeting Duration: {sum(analysis['meeting_durations']) / len(analysis['meeting_durations']):.1f} hours
Average Attendees per Meeting: {sum(analysis['attendees_count']) / len(analysis['attendees_count']):.1f}
        """

        return report

    def _format_top_items(self, data, top_n):
        """Format top items for display"""
        sorted_items = sorted(data.items(), key=lambda x: x[1], reverse=True)
        return '\n'.join([f"- {item}: {count}" for item, count in sorted_items[:top_n]])

# Usage
async def main():
    analytics = CalendarAnalytics(config)
    report = await analytics.generate_report(days=30)
    print(report)

if __name__ == "__main__":
    asyncio.run(main())
```

## Integration Testing

### End-to-End Workflow Test

```python
#!/usr/bin/env python3
"""
End-to-end integration test
"""

import asyncio
import json
from datetime import datetime, timedelta

async def end_to_end_test():
    """Complete workflow test"""

    print("🚀 Starting End-to-End Integration Test...")

    # Step 1: Create a Teams meeting
    print("\n1️⃣ Creating Teams meeting...")
    meeting_result = await teams_toolkit.create_teams_meeting(
        subject="Integration Test Meeting",
        start_time=(datetime.now() + timedelta(hours=1)).isoformat(),
        end_time=(datetime.now() + timedelta(hours=2)).isoformat(),
        attendees="test@example.com",
        agenda="Testing complete integration workflow"
    )

    meeting_data = json.loads(meeting_result)
    meeting_id = meeting_data.get('meeting_id')

    # Step 2: Verify meeting appears in calendar
    print("\n2️⃣ Verifying meeting in Outlook calendar...")
    events = await outlook_toolkit.list_events(
        start_date=datetime.now().isoformat(),
        end_date=(datetime.now() + timedelta(hours=3)).isoformat()
    )

    events_data = json.loads(events)
    calendar_meeting = next(
        (e for e in events_data if e.get('subject') == "Integration Test Meeting"),
        None
    )

    if calendar_meeting:
        print("✅ Meeting found in calendar")
    else:
        print("❌ Meeting not found in calendar")

    # Step 3: Update the meeting
    print("\n3️⃣ Updating meeting details...")
    update_result = await teams_toolkit.update_teams_meeting(
        meeting_id=meeting_id,
        subject="Updated Integration Test Meeting",
        agenda="Updated agenda for integration testing"
    )

    # Step 4: Get meeting details
    print("\n4️⃣ Retrieving meeting details...")
    details = await teams_toolkit.get_teams_meeting_details(meeting_id)
    details_data = json.loads(details)

    print(f"✅ Meeting details retrieved: {details_data.get('subject')}")

    # Step 5: Find free time around the meeting
    print("\n5️⃣ Finding free time slots...")
    free_time = await outlook_toolkit.find_free_time(
        start_time=(datetime.now() + timedelta(hours=3)).isoformat(),
        end_time=(datetime.now() + timedelta(hours=6)).isoformat(),
        duration_minutes=30
    )

    free_data = json.loads(free_time)
    print(f"✅ Found {free_data.get('total_found', 0)} free time slots")

    # Step 6: Cleanup - Cancel meeting
    print("\n6️⃣ Cleaning up - Cancelling test meeting...")
    await teams_toolkit.cancel_teams_meeting(
        meeting_id,
        "End-to-end test cleanup"
    )

    print("\n🎉 End-to-End Integration Test Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(end_to_end_test())
```

### Performance Testing

```python
#!/usr/bin/env python3
"""
Performance testing for calendar tools
"""

import asyncio
import time
from statistics import mean, median

async def performance_test():
    """Test performance of calendar operations"""

    print("⚡ Running Performance Tests...")

    operations = []
    num_tests = 10

    # Test list events performance
    print(f"\n📊 Testing list_events performance ({num_tests} iterations)...")
    for i in range(num_tests):
        start_time = time.time()
        await outlook_toolkit.list_events(max_results=10)
        end_time = time.time()
        operations.append(end_time - start_time)

    avg_time = mean(operations)
    median_time = median(operations)
    print(".3f"    print(".3f"
    # Test create/delete event performance
    print(f"\n📝 Testing create/delete event performance ({num_tests} iterations)...")
    operations = []

    for i in range(num_tests):
        start_time = time.time()

        # Create event
        event = await outlook_toolkit.create_event(
            subject=f"Perf Test Event {i}",
            start_time=(datetime.now() + timedelta(hours=i+1)).isoformat(),
            end_time=(datetime.now() + timedelta(hours=i+2)).isoformat()
        )

        # Delete event
        event_data = json.loads(event)
        await outlook_toolkit.delete_event(event_data['id'])

        end_time = time.time()
        operations.append(end_time - start_time)

    avg_time = mean(operations)
    median_time = median(operations)
    print(".3f"    print(".3f"
    print("\n🏁 Performance Testing Completed!")

if __name__ == "__main__":
    asyncio.run(performance_test())
```

## Quick Start Commands

### One-Line Setup Check

```bash
# Check all prerequisites
python -c "
import os, sys
req_vars = ['OUTLOOK_CLIENT_ID', 'OUTLOOK_CLIENT_SECRET', 'OUTLOOK_TENANT_ID']
missing = [v for v in req_vars if not os.getenv(v)]
if missing:
    sys.exit(f'Missing: {missing}')
print('✅ Environment ready')
"
```

### Automated Test Suite

```bash
# Run all tests
python test_auth.py && python test_outlook.py && python test_teams.py && python test_integration.py
```

### Health Check

```bash
# Quick health check
python -c "
import asyncio
from utu.tools.outlook_calendar_toolkit import OutlookCalendarToolkit
from utu.config import ToolkitConfig
import os

async def health_check():
    try:
        config = ToolkitConfig(config={
            'client_id': os.getenv('OUTLOOK_CLIENT_ID'),
            'client_secret': os.getenv('OUTLOOK_CLIENT_SECRET'),
            'tenant_id': os.getenv('OUTLOOK_TENANT_ID')
        })
        toolkit = OutlookCalendarToolkit(config)
        token = toolkit._get_access_token()
        print('✅ Health check passed - authentication working')
    except Exception as e:
        print(f'❌ Health check failed: {e}')

asyncio.run(health_check())
"
```

## Next Steps

After successful setup and testing:

1. **Monitor API Usage**: Track your Microsoft Graph API usage in Azure Portal
2. **Implement Error Handling**: Add comprehensive error handling in production
3. **Set Up Alerts**: Configure alerts for authentication issues
4. **Optimize Performance**: Implement caching for frequently accessed data
5. **Add Logging**: Set up structured logging for debugging and monitoring
6. **Security Review**: Regular security audits of API permissions and access patterns

## Support Resources

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [Azure Active Directory Documentation](https://docs.microsoft.com/en-us/azure/active-directory/)
- [Youtu-agent Framework Documentation](../README.md)
- [Microsoft Teams Developer Documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/)

---

**🎯 Pro Tips:**
- Always test with development credentials before using production accounts
- Implement rate limiting to avoid hitting Microsoft Graph API limits
- Use application permissions for service accounts, delegated permissions for user-interactive scenarios
- Keep client secrets secure and rotate them regularly
- Monitor token expiration and implement refresh logic for long-running applications
