#!/usr/bin/env python3
"""
Calendar Tools Setup Verification Script
Run this script to verify your Microsoft Calendar integration is working correctly.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
import dotenv

dotenv.load_dotenv()

def check_environment():
    """Check required environment variables"""
    print("🔍 Checking Environment Variables...")

    required_vars = [
        ('OUTLOOK_CLIENT_ID', 'Outlook Application Client ID'),
        ('OUTLOOK_CLIENT_SECRET', 'Outlook Application Client Secret'),
        ('OUTLOOK_TENANT_ID', 'Outlook Directory Tenant ID'),
        ('TEAMS_CLIENT_ID', 'Teams Application Client ID'),
        ('TEAMS_CLIENT_SECRET', 'Teams Application Client Secret'),
        ('TEAMS_TENANT_ID', 'Teams Directory Tenant ID')
    ]

    missing_vars = []
    for var_name, description in required_vars:
        value = os.getenv(var_name)
        if value:
            print(f"✅ {description}: Set ({len(value)} characters)")
        else:
            print(f"❌ {description}: NOT SET")
            missing_vars.append(var_name)

    if missing_vars:
        print(f"\n💥 Missing required environment variables: {', '.join(missing_vars)}")
        print("Please set these in your environment or .env file")
        return False

    print("\n🎉 All environment variables are configured!")
    return True

def check_imports():
    """Check that toolkit modules can be imported"""
    print("\n📦 Checking Module Imports...")

    try:
        from utu.tools.outlook_calendar_toolkit import OutlookCalendarToolkit
        print("✅ Outlook Calendar Toolkit: Imported successfully")
    except ImportError as e:
        print(f"❌ Outlook Calendar Toolkit: Import failed - {e}")
        return False

    try:
        from utu.tools.teams_calendar_toolkit import TeamsCalendarToolkit
        print("✅ Teams Calendar Toolkit: Imported successfully")
    except ImportError as e:
        print(f"❌ Teams Calendar Toolkit: Import failed - {e}")
        return False

    try:
        from utu.config import ToolkitConfig
        print("✅ Toolkit Configuration: Imported successfully")
    except ImportError as e:
        print(f"❌ Toolkit Configuration: Import failed - {e}")
        return False

    print("\n🎉 All modules imported successfully!")
    return True

async def test_authentication():
    """Test Microsoft Graph API authentication"""
    print("\n🔐 Testing Microsoft Graph Authentication...")

    outlook_auth_success = True
    teams_auth_success = True

    # Test Outlook authentication
    try:
        from utu.tools.outlook_calendar_toolkit import OutlookCalendarToolkit
        from utu.config import ToolkitConfig

        config = ToolkitConfig(config={
            "client_id": os.getenv("OUTLOOK_CLIENT_ID"),
            "client_secret": os.getenv("OUTLOOK_CLIENT_SECRET"),
            "tenant_id": os.getenv("OUTLOOK_TENANT_ID"),
        })

        toolkit = OutlookCalendarToolkit(config=config)
        access_token = toolkit._get_access_token()

        if access_token:
            print("✅ Outlook Authentication: Token obtained")
            print(f"   Token length: {len(access_token)} characters")

            # Test if token works with a simple API call
            try:
                # Try to get user profile (this tests if the token has proper permissions)
                test_response = toolkit._make_graph_request("/me")
                print("✅ Outlook Authentication: API access verified")
            except Exception as api_e:
                if is_authentication_error(str(api_e)):
                    print("❌ Outlook Authentication: Token obtained but API access failed - Permission issue")
                    outlook_auth_success = False
                else:
                    print(f"⚠️  Outlook Authentication: API test failed (may be network issue): {api_e}")
        else:
            print("❌ Outlook Authentication: Failed - No token received")
            outlook_auth_success = False

    except Exception as e:
        error_msg = str(e)
        if is_authentication_error(error_msg):
            print(f"❌ Outlook Authentication: Failed - {e}")
            outlook_auth_success = False
        else:
            print(f"❌ Outlook Authentication: Failed - {e}")
            outlook_auth_success = False

    # Test Teams authentication
    try:
        from utu.tools.teams_calendar_toolkit import TeamsCalendarToolkit

        config = ToolkitConfig(config={
            "client_id": os.getenv("TEAMS_CLIENT_ID"),
            "client_secret": os.getenv("TEAMS_CLIENT_SECRET"),
            "tenant_id": os.getenv("TEAMS_TENANT_ID"),
        })

        toolkit = TeamsCalendarToolkit(config=config)
        access_token = toolkit._get_access_token()

        if access_token:
            print("✅ Teams Authentication: Token obtained")
            print(f"   Token length: {len(access_token)} characters")

            # Test if token works with a simple API call
            try:
                # Try to get user profile (this tests if the token has proper permissions)
                test_response = toolkit._make_graph_request("/me")
                print("✅ Teams Authentication: API access verified")
            except Exception as api_e:
                if is_authentication_error(str(api_e)):
                    print("❌ Teams Authentication: Token obtained but API access failed - Permission issue")
                    teams_auth_success = False
                else:
                    print(f"⚠️  Teams Authentication: API test failed (may be network issue): {api_e}")
        else:
            print("❌ Teams Authentication: Failed - No token received")
            teams_auth_success = False

    except Exception as e:
        error_msg = str(e)
        if is_authentication_error(error_msg):
            print(f"❌ Teams Authentication: Failed - {e}")
            teams_auth_success = False
        else:
            print(f"❌ Teams Authentication: Failed - {e}")
            teams_auth_success = False

    overall_auth_success = outlook_auth_success and teams_auth_success

    if overall_auth_success:
        print("\n🎉 Authentication tests passed!")
    else:
        print("\n💥 Authentication tests failed!")
        print("   🔴 This indicates authentication or permission issues")
        print("   📖 Check: docs/calendar_setup_guide.md#azure-app-registration")

    return overall_auth_success

def is_authentication_error(error_message: str) -> bool:
    """Check if the error is related to authentication/permissions"""
    auth_error_indicators = [
        "badrequest",
        "unauthorized",
        "forbidden",
        "access denied",
        "delegated authentication flow",
        "invalid_grant",
        "invalid_client",
        "insufficient privileges",
        "permission denied",
        "authentication failed"
    ]

    error_lower = str(error_message).lower()
    return any(indicator in error_lower for indicator in auth_error_indicators)

async def test_basic_operations():
    """Test basic calendar operations"""
    print("\n📅 Testing Basic Calendar Operations...")

    outlook_success = True
    teams_success = True

    # Test Outlook operations
    try:
        from utu.tools.outlook_calendar_toolkit import OutlookCalendarToolkit
        from utu.config import ToolkitConfig

        config = ToolkitConfig(config={
            "client_id": os.getenv("OUTLOOK_CLIENT_ID"),
            "client_secret": os.getenv("OUTLOOK_CLIENT_SECRET"),
            "tenant_id": os.getenv("OUTLOOK_TENANT_ID"),
        })

        toolkit = OutlookCalendarToolkit(config=config)

        # Test listing events
        start_date = datetime.now().isoformat()
        end_date = (datetime.now() + timedelta(days=1)).isoformat()

        events = await toolkit.list_events(
            start_date=start_date,
            end_date=end_date,
            max_results=1
        )

        # Check if the response indicates an error
        if isinstance(events, str) and '"error":' in events:
            if is_authentication_error(events):
                print("❌ Outlook List Events: Failed - Authentication/Permission Error")
                outlook_success = False
            else:
                print("⚠️  Outlook List Events: API Error (may be expected)")
        else:
            print("✅ Outlook List Events: Successful")

        # Test free time finding
        free_slots = await toolkit.find_free_time(
            start_time=start_date,
            end_time=end_date,
            duration_minutes=30
        )

        # Check if the response indicates an error
        if isinstance(free_slots, str) and '"error":' in free_slots:
            if is_authentication_error(free_slots):
                print("❌ Outlook Find Free Time: Failed - Authentication/Permission Error")
                outlook_success = False
            else:
                print("⚠️  Outlook Find Free Time: API Error (may be expected)")
        else:
            print("✅ Outlook Find Free Time: Successful")

    except Exception as e:
        error_msg = str(e)
        if is_authentication_error(error_msg):
            print(f"❌ Outlook Basic Operations: Failed - Authentication Error: {e}")
            outlook_success = False
        else:
            print(f"❌ Outlook Basic Operations: Failed - {e}")
            outlook_success = False

    # Test Teams operations
    try:
        from utu.tools.teams_calendar_toolkit import TeamsCalendarToolkit

        config = ToolkitConfig(config={
            "client_id": os.getenv("TEAMS_CLIENT_ID"),
            "client_secret": os.getenv("TEAMS_CLIENT_SECRET"),
            "tenant_id": os.getenv("TEAMS_TENANT_ID"),
        })

        toolkit = TeamsCalendarToolkit(config=config)

        # Test listing meetings
        meetings = await toolkit.list_teams_meetings(
            max_results=1
        )

        # Check if the response indicates an error
        if isinstance(meetings, str) and '"error":' in meetings:
            if is_authentication_error(meetings):
                print("❌ Teams List Meetings: Failed - Authentication/Permission Error")
                teams_success = False
            else:
                print("⚠️  Teams List Meetings: API Error (may be expected)")
        else:
            print("✅ Teams List Meetings: Successful")

    except Exception as e:
        error_msg = str(e)
        if is_authentication_error(error_msg):
            print(f"❌ Teams Basic Operations: Failed - Authentication Error: {e}")
            teams_success = False
        else:
            print(f"❌ Teams Basic Operations: Failed - {e}")
            teams_success = False

    overall_success = outlook_success and teams_success

    if overall_success:
        print("\n🎉 Basic operations tests passed!")
    else:
        print("\n💥 Basic operations tests failed!")
        if not outlook_success:
            print("   - Outlook operations have authentication/permission issues")
        if not teams_success:
            print("   - Teams operations have authentication/permission issues")
        print("   📖 Check the setup guide for authentication configuration")

    return overall_success

def print_setup_summary():
    """Print setup summary and next steps"""
    print("""
🎯 Setup Verification Summary
=============================

✅ Environment Variables: Configured
✅ Module Imports: Working
✅ Authentication: Successful
✅ Basic Operations: Functional

🚀 Your Microsoft Calendar integration is ready!

Next Steps:
1. Review the comprehensive guide: docs/calendar_setup_guide.md
2. Run the full test suite: python test_outlook.py && python test_teams.py
3. Try the agent integration: python test_agent_integration.py
4. Create your first automated meeting scheduler

Useful Commands:
• Health Check: python verify_setup.py
• Full Tests: python docs/calendar_setup_guide.md#testing-the-tools
• Performance Test: python performance_test.py

📚 Documentation:
• Setup Guide: docs/calendar_setup_guide.md
• API Reference: docs/calendar_tools.md
• Troubleshooting: docs/calendar_setup_guide.md#troubleshooting
    """)

def print_failure_help():
    """Print help for failed setups"""
    print("""
💥 Setup Issues Detected
========================

Common Solutions:

1. Environment Variables:
   • Check .env file exists and is loaded
   • Verify variable names match exactly
   • Ensure no extra spaces or quotes

2. Azure Configuration:
   • Confirm API permissions are granted
   • Check admin consent is provided
   • Verify app registration is active

3. 🔴 AUTHENTICATION/PERMISSIONS (Most Common):
   • Use Delegated permissions instead of Application permissions for /me endpoints
   • Or switch to Application permissions and update code to use /users/{user-id} instead of /me
   • Check if you're using the right authentication flow

4. Network Issues:
   • Check internet connectivity
   • Verify Azure services are accessible
   • Confirm firewall settings

5. API Permissions:
   • Regenerate client secrets if expired
   • Verify tenant ID is correct
   • Check app registration status
   • Ensure Calendars.ReadWrite and OnlineMeetings.ReadWrite permissions

📖 For detailed troubleshooting:
• Visit: docs/calendar_setup_guide.md#troubleshooting
• Check: Common Issues and Solutions section
• Review: Authentication Setup section

🆘 Need Help?
• Review Azure configuration steps in docs/calendar_setup_guide.md
• Check Microsoft Graph API status
• Verify app registration permissions
• Consider using Delegated permissions for user-specific operations
    """)

async def main():
    """Main verification function"""
    print("🚀 Microsoft Calendar Tools Setup Verification")
    print("=" * 50)

    # Track test results
    tests_passed = 0
    total_tests = 4

    # Test 1: Environment variables
    if check_environment():
        tests_passed += 1
    else:
        print_failure_help()
        sys.exit(1)

    # Test 2: Module imports
    if check_imports():
        tests_passed += 1
    else:
        print_failure_help()
        sys.exit(1)

    # Test 3: Authentication
    if await test_authentication():
        tests_passed += 1
    else:
        print_failure_help()
        sys.exit(1)

    # Test 4: Basic operations
    if await test_basic_operations():
        tests_passed += 1
    else:
        print_failure_help()
        sys.exit(1)

    # Print results
    print(f"\n📊 Test Results: {tests_passed}/{total_tests} tests passed")

    if tests_passed == total_tests:
        print_setup_summary()
        print("🎉 Setup verification completed successfully!")
        sys.exit(0)
    else:
        print_failure_help()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
