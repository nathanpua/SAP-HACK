# SAP Career Coach Chatbot Integration

This Next.js frontend now includes a fully integrated SAP Career Coach chatbot that connects to the Career Coach orchestra agent via WebSocket.

## 🚀 Features

- **Real-time WebSocket Communication**: Direct connection to the Python Career Coach agent
- **Multi-Agent Event Handling**: Supports all WebUI event types (raw, orchestra, new agent, etc.)
- **Interactive Tool Call Confirmations**: User can approve/reject agent tool executions
- **Modern SAP-themed UI**: Professional design with SAP branding and colors
- **Markdown Support**: Rich text rendering for career guidance content
- **Dark/Light Mode**: Automatic theme adaptation
- **Responsive Design**: Works on desktop and mobile devices

## 📋 Prerequisites

1. **Python Career Coach Agent**: Make sure you have the Career Coach orchestra agent running
2. **WebSocket Server**: The Python WebUI server should be running on `ws://127.0.0.1:8848/ws`

## 🛠️ Setup Instructions

### 1. Start the Career Coach Agent

Navigate to your Youtu-agent directory and run the Career Coach WebUI:

```bash
cd /Users/nathanpua/Desktop/SAP\ hack/Youtu-agent/examples/career_coach
python main_web.py
```

This will start:
- The Career Coach orchestra agent
- Tornado WebSocket server on port 8848
- Static file server for the frontend

### 2. Start the Next.js Frontend

```bash
cd /Users/nathanpua/Desktop/SAP\ hack/frontend/sap-hack
npm run dev
```

### 3. Access the Chatbot

Navigate to: `http://localhost:3000/chatbot`

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in your Next.js project:

```env
# Career Coach WebSocket URL (optional, defaults to ws://127.0.0.1:8848/ws)
CAREER_COACH_WS_URL=ws://127.0.0.1:8848/ws
```

### API Routes

- `GET /api/career-coach` - Check Career Coach status
- `POST /api/career-coach` - Start/stop Career Coach server (helper endpoint)

## 💬 Usage Examples

The chatbot supports various SAP career-related queries:

### Career Path Planning
```
"I'm an SAP consultant with 3 years experience wanting to become a Solution Architect. What's my path?"
```

### Technology Transitions
```
"I specialize in SAP HCM and want to transition to SAP SuccessFactors. How should I plan this?"
```

### Certification Guidance
```
"What SAP certifications should I pursue for a senior technical role?"
```

### Job Transitions
```
"I want to advance from SAP functional consultant to SAP presales. What skills should I develop?"
```

## 🎯 Supported Event Types

The chatbot handles all WebUI event types:

- **`raw`**: Text deltas, tool calls, tool outputs, reasoning
- **`orchestra`**: Plan items, worker tasks, report items
- **`new`**: Agent switching notifications
- **`example`**: Example query suggestions
- **`finish`**: Conversation completion

## 🔧 Tool Call Confirmations

When the Career Coach agent executes tools, users can:
- **Approve** ✅ tool executions
- **Reject** ❌ tool executions
- View real-time tool execution progress

## 🎨 UI Components

### Message Types
- **User Messages**: Blue gradient background, right-aligned
- **Assistant Messages**: White/gray background with SAP agent indicators
- **Tool Calls**: Green indicators with execution status
- **Plans**: Blue targets with todo lists
- **Reports**: Purple documents with analysis
- **Agent Switches**: Yellow sparkles with agent names

### Connection Status
- **🟢 Connected**: WebSocket connection established
- **🟡 Connecting**: Attempting to connect
- **🔴 Disconnected**: Connection lost

## 🚀 Advanced Features

### Multi-Agent Orchestration
The Career Coach uses multiple specialized SAP agents:
- **Planner Agent**: Creates career development plans
- **Worker Agents**: Execute specific SAP-related tasks
- **Reporter Agent**: Generates comprehensive reports

### Context Awareness
- Maintains conversation history
- Provides clarification when needed
- Adapts responses based on user expertise level

## 🐛 Troubleshooting

### Connection Issues
1. Ensure the Python Career Coach is running: `python main_web.py`
2. Check WebSocket URL configuration
3. Verify port 8848 is not blocked

### Message Not Sending
1. Check WebSocket connection status
2. Ensure Career Coach agent is responding
3. Check browser console for errors

### UI Not Loading
1. Verify all npm dependencies are installed
2. Check for TypeScript compilation errors
3. Ensure Next.js dev server is running

## 📚 API Reference

### WebSocket Events

#### Outgoing (Client → Server)
```json
{
  "type": "query",
  "query": "Your SAP career question here"
}
```

#### Incoming (Server → Client)
```json
{
  "type": "raw",
  "data": {
    "type": "text",
    "delta": "Response content"
  },
  "requireConfirm": false
}
```

## 🔄 Integration Architecture

```
┌─────────────────┐    WebSocket    ┌──────────────────────┐
│  Next.js        │◄──────────────►│  Tornado WebSocket   │
│  Frontend       │                │  Server (Port 8848) │
│                 │                │                      │
│  /chatbot       │                │  WebUIChatbot       │
│  CareerCoachChat│                │                     │
└─────────────────┘                └──────────────────────┘
                                   │
                                   ▼
                         ┌──────────────────────┐
                         │  Career Coach        │
                         │  Orchestra Agent     │
                         │                      │
                         │  - Planner Agent     │
                         │  - Worker Agents     │
                         │  - Reporter Agent    │
                         └──────────────────────┘
```

## 🎉 Getting Started

1. **Start the backend**: Run `python main_web.py`
2. **Start the frontend**: Run `npm run dev`
3. **Open chatbot**: Go to `http://localhost:3000/chatbot`
4. **Start chatting**: Ask SAP career-related questions!

The system will automatically handle agent orchestration, tool executions, and provide comprehensive SAP career guidance.
