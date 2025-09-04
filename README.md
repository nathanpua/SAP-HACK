# SAP Hack - Complete AI Agent Framework & Web Application

A comprehensive SAP-focused AI agent system featuring an advanced Python backend framework and a modern React frontend application.

## 🏗️ Project Structure

This repository contains two main components:

### 🔧 Backend (Youtu-agent)
- **Location**: `Youtu-agent/`
- **Technology**: Python 3.12+, Agent Framework
- **Purpose**: Advanced AI agent framework with multiple tools and integrations

### 🌐 Frontend (React Application)
- **Location**: `frontend/sap-hack/`
- **Technology**: Next.js 15, React 19, TypeScript, Supabase
- **Purpose**: Modern web interface for interacting with the AI agents

## 🚀 Get Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- Git
- uv (Python package installer and resolver)

### Step 1: Clone and Basic Setup

First, clone the repository and set up the basic Python environment:

```bash
# Clone the repository
git clone https://github.com/nathanpua/SAP-HACK.git
cd SAP-HACK

# Create a virtual environment using uv
uv venv

# Activate the virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# Install Python dependencies
uv pip install -r requirements.txt
```

### Step 2: Backend Chatbot Setup

The backend uses the Youtu-agent framework. You need to install the UI package first:

```bash
# Download the prebuilt wheel file from:
# https://tencentcloudadp.github.io/youtu-agent/frontend/#installation
# Save it to the project root directory, then install it:
uv pip install utu_agent_ui-0.1.6-py3-none-any.whl

# Navigate to the backend directory
cd Youtu-agent

# Configure environment variables (copy and edit .env file)
cp .env.example .env
# Edit .env with your API keys (see Environment Configuration section below)

# Navigate to the career coach example
cd examples/career_coach

# Start the backend chatbot server
python main_web.py
```

**Note**: The backend server will start on `ws://127.0.0.1:8848/ws` by default.

### Step 3: Frontend Setup

Set up and run the React frontend application:

```bash
# Open a new terminal and navigate to frontend directory
cd sap-hack-frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

**Note**: The frontend will be available at `http://localhost:3000`.

### Step 4: Telemetry Setup (Optional)

For monitoring and observability, set up Phoenix for OpenTelemetry:

```bash
# In a new terminal, start the Phoenix server
phoenix serve
```

**Note**: Phoenix provides observability for your AI agents and can be accessed at the URL shown in the terminal output.

### Step 5: Access the Application

Once all services are running:
- **Frontend**: Visit `http://localhost:3000` in your browser
- **Backend WebSocket**: Connected to `ws://127.0.0.1:8848/ws`
- **Phoenix Telemetry**: Check terminal output for access URL

### Troubleshooting

- **Backend not starting**: Ensure all required API keys are configured in `.env`
- **Frontend connection issues**: Verify the WebSocket URL in frontend environment variables
- **Virtual environment issues**: Make sure you're using the correct activation command for your OS
- **Package installation errors**: Try running `uv sync` instead of `uv pip install -r requirements.txt`

## 🔑 Environment Configuration

### Backend Environment Variables
Copy `.env.example` to `.env` and configure:

#### Required API Keys
- `UTU_LLM_TYPE`: LLM provider (openai, deepseek, etc.)
- `UTU_LLM_MODEL`: Model name (gpt-4o-mini, etc.)
- `UTU_LLM_API_KEY`: Your LLM API key
- `SERPER_API_KEY`: For web search functionality
- `JINA_API_KEY`: For embeddings

#### Optional Integrations
- `GITHUB_TOKEN`: GitHub API access
- `GOOGLE_API_KEY`: Google services
- `OUTLOOK_CLIENT_ID/SECRET`: Microsoft calendar integration

### Frontend Environment Variables
Create `.env.local` in `frontend/sap-hack/`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key
CAREER_COACH_WS_URL=ws://127.0.0.1:8848/ws
```

## 📁 Project Components

### Backend Features
- 🤖 **Advanced Agent Framework**: Multi-agent orchestration system
- 🛠️ **Extensive Tool Library**: Search, calendar, email, file processing
- 📊 **SAP Career Coach**: Specialized agent for career development
- 🔍 **Research Capabilities**: Deep web research and analysis
- 📈 **Evaluation System**: Benchmark testing and performance analysis
- 🔄 **WebSocket Integration**: Real-time communication with frontend

### Frontend Features
- 🎨 **Modern UI**: Built with Next.js 15 and Tailwind CSS
- 🔐 **Authentication**: Supabase-based user management
- 💬 **Real-time Chat**: WebSocket-powered agent interaction
- 📱 **Responsive Design**: Mobile-first approach
- 🎯 **Career Coaching Interface**: Specialized UI for career guidance
- 📊 **Analytics Dashboard**: Performance monitoring and insights

## 🏃‍♂️ Usage Examples

### Career Coach Agent
```bash
# Starting the chatbot server 
cd Youtu-agent
python examples/career_coach/main_web.py
```

## 🔧 Development

### Backend Development
```bash
cd Youtu-agent
# Install development dependencies
uv sync --group dev
# Run tests
pytest
# Format code
make format
```

### Frontend Development
```bash
cd frontend/sap-hack
# Start development server
npm run dev
# Build for production
npm run build
# Run linting
npm run lint
```

## 📚 Documentation

- **Backend Documentation**: See `Youtu-agent/docs/` and `Youtu-agent/README.md`
- **Frontend Documentation**: See `frontend/sap-hack/README.md`
- **API Documentation**: Available in respective component READMEs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project combines multiple components with their respective licenses. See individual component LICENSE files for details.

## 🙏 Acknowledgments

- **Youtu-agent**: Advanced agent framework from Tencent Youtu Lab
- **Next.js**: React framework for the frontend
- **Supabase**: Backend-as-a-Service for authentication and database
- **OpenAI Agents**: Foundation framework for agent orchestration

---

**Repository**: https://github.com/nathanpua/SAP-HACK
**Frontend**: http://localhost:3000 (when running)
**Backend API**: ws://127.0.0.1:8848/ws (when running)
