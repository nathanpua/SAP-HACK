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

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/nathanpua/SAP-HACK.git
cd SAP-HACK
```

### 2. Backend Setup (Youtu-agent)
```bash
# Copy environment configuration
cp .env.example .env

# Edit .env with your API keys (see backend section below)
# Then set up the Python environment
cd Youtu-agent
pip install -r ../requirements.txt
# OR using uv (recommended)
uv sync
```

### 3. Frontend Setup
```bash
# Install dependencies
cd frontend/sap-hack
npm install

# Copy and configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 4. Run the Applications
```bash
# Terminal 1: Start the backend agent server
cd Youtu-agent
python examples/career_coach/main_orchestra.py

# Terminal 2: Start the frontend
cd frontend/sap-hack
npm run dev
```

Visit `http://localhost:3000` to access the web application.

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
cd Youtu-agent
python examples/career_coach/main_orchestra.py
```

### Data Analysis Agent
```bash
cd Youtu-agent
python examples/data_analysis/main.py
```

### Web Research Agent
```bash
cd Youtu-agent
python examples/research/main.py
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
