# User Authentication Integration Tests

This directory contains comprehensive test scripts for the user authentication integration implemented in the SAP Analysis Agent.

## 📋 Test Suite Overview

### 1. **test_user_auth_integration.py** - Complete Integration Test
Tests the entire user authentication pipeline:
- User Profile Toolkit authentication
- WebSocket Handler user context processing
- Agent-Toolkit integration
- End-to-end authentication workflow

### 2. **test_websocket_auth_flow.py** - WebSocket Flow Test
Focuses on WebSocket communication with authentication:
- Message format validation
- User context propagation
- API integration with authentication

### 3. **test_frontend_auth.js** - Frontend WebSocket Test
Tests the frontend WebSocket authentication:
- Message format validation
- WebSocket connection with authentication
- Response handling

## 🚀 Running the Tests

### Prerequisites

1. **Environment Setup**: Make sure your `.env` file is properly configured:
   ```bash
   cd /Users/nathanpua/Desktop/SAP\ hack
   # Verify .env file exists with required variables
   cat .env
   ```

2. **Required Environment Variables**:
   - `USER_PROFILE_API_URL=http://localhost:3000/api/user-profile`
   - `SUPABASE_SERVICE_ROLE_KEY` (your service role key)
   - `SUPABASE_ACCESS_TOKEN` (optional, for full Supabase integration)

3. **Python Dependencies**: Ensure you have the required packages:
   ```bash
   cd /Users/nathanpua/Desktop/SAP\ hack/Youtu-agent
   pip install python-dotenv aiohttp
   ```

### Test Execution

#### 1. Complete Integration Test
```bash
cd /Users/nathanpua/Desktop/SAP\ hack/Youtu-agent
python test_user_auth_integration.py
```

#### 2. WebSocket Flow Test
```bash
cd /Users/nathanpua/Desktop/SAP\ hack/Youtu-agent
python test_websocket_auth_flow.py
```

#### 3. Frontend WebSocket Test
```bash
cd /Users/nathanpua/Desktop/SAP\ hack
node test_frontend_auth.js
```

## 🔍 What Each Test Validates

### User Profile Toolkit Test
- ✅ Default user ID fallback
- ✅ Authenticated user context access
- ✅ Profile API calls with authentication
- ✅ Error handling for missing authentication

### WebSocket Handler Test
- ✅ UserQuery dataclass with user_id
- ✅ Agent user context setting
- ✅ Toolkit access to authenticated user
- ✅ User context propagation

### Agent-Toolkit Integration Test
- ✅ Agent initialization with user context
- ✅ Toolkit loading with agent reference
- ✅ User ID access in toolkit methods
- ✅ Authentication state persistence

### WebSocket Message Format Test
- ✅ Frontend message structure
- ✅ Backend message parsing
- ✅ User ID preservation in transit

## 🎯 Test Results Interpretation

### ✅ All Tests Pass
```
🎯 Overall: 4/4 tests passed
🎉 All authentication integration tests passed!
```
**Meaning**: Your user authentication integration is working perfectly!

### ⚠️ Some Tests Fail
If tests fail, check:
1. **Environment Variables**: Ensure `.env` file is loaded
2. **API Server**: Make sure your Next.js API is running
3. **Dependencies**: Install missing Python packages
4. **Network**: Check WebSocket connectivity

## 🔧 Troubleshooting

### Common Issues

#### 1. "No module named 'agents'"
```bash
# Install missing dependencies
cd /Users/nathanpua/Desktop/SAP\ hack/Youtu-agent
pip install -e .
```

#### 2. "python-dotenv not available"
```bash
pip install python-dotenv
```

#### 3. "WebSocket connection failed"
- Ensure the Youtu-agent backend is running
- Check if port 8848 is available
- Verify WebSocket server is started

#### 4. "API call returned error"
- Start your Next.js frontend: `npm run dev`
- Check if the API server is running on port 3000
- Verify Supabase credentials are correct

### Debug Mode

Run tests with verbose output:
```bash
cd /Users/nathanpua/Desktop/SAP\ hack/Youtu-agent
python -c "import logging; logging.basicConfig(level=logging.DEBUG)"
python test_user_auth_integration.py
```

## 📊 Test Coverage

| Component | Test Coverage | Status |
|-----------|---------------|--------|
| User Profile Toolkit | ✅ Complete | Implemented |
| WebSocket Handler | ✅ Complete | Implemented |
| Agent System | ✅ Complete | Implemented |
| Frontend Integration | ✅ Complete | Implemented |
| Error Handling | ✅ Complete | Implemented |
| Message Format | ✅ Complete | Implemented |

## 🎉 Success Criteria

When all tests pass, you have successfully implemented:

- 🔐 **Secure User Authentication**: Each user sees only their own profile
- 🔄 **Seamless Integration**: Authentication works across frontend and backend
- 🛠️ **Robust Error Handling**: Graceful fallbacks for missing authentication
- 🚀 **Production Ready**: Complete user-specific career analysis system

## 📞 Support

If tests fail or you need help:
1. Check the error messages in test output
2. Verify your environment setup
3. Ensure all services are running
4. Review the troubleshooting section above

Your SAP Analysis Agent now provides personalized, secure career analysis for authenticated users! 🎯
