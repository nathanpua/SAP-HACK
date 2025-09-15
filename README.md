# 🚀 Deep SAP - AI-Powered Career Coaching Platform

A comprehensive SAP-focused AI agent system that combines an advanced Python backend framework with a modern React frontend to deliver intelligent career guidance, skills development planning, and real-time AI coaching powered by multi-agent orchestration.

## 🏆 Technology Stack & Services

### Core Technologies
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

### AI & ML Services
[![DeepSeek](https://img.shields.io/badge/DeepSeek-V3-000000?style=for-the-badge&logo=deepseek&logoColor=white)](https://platform.deepseek.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![Microsoft](https://img.shields.io/badge/Microsoft-Phi--3-00BCF2?style=for-the-badge&logo=microsoft&logoColor=white)](https://azure.microsoft.com)
[![Jina AI](https://img.shields.io/badge/Jina_AI-Embeddings-000000?style=for-the-badge&logo=jina&logoColor=white)](https://jina.ai)

### Database & Storage
[![Supabase](https://img.shields.io/badge/Supabase-2.39.0-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_DB-000000?style=for-the-badge&logo=chromadb&logoColor=white)](https://www.trychroma.com)

### APIs & Search
[![Serper](https://img.shields.io/badge/Serper_API-Search-FF6B35?style=for-the-badge&logo=google&logoColor=white)](https://serper.dev)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-010101?style=for-the-badge&logo=websocket&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

### UI & Styling
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Radix UI](https://img.shields.io/badge/Radix_UI-Components-000000?style=for-the-badge&logo=radix-ui&logoColor=white)](https://www.radix-ui.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-Components-000000?style=for-the-badge&logo=shadcnui&logoColor=white)](https://ui.shadcn.com)

### DevOps & Deployment
[![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Railway](https://img.shields.io/badge/Railway-Backend-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app)
[![Docker](https://img.shields.io/badge/Docker-Container-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)

### Development Tools
[![uv](https://img.shields.io/badge/uv-Package_Manager-000000?style=for-the-badge&logo=uv&logoColor=white)](https://github.com/astral-sh/uv)
[![npm](https://img.shields.io/badge/npm-Package_Manager-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://npmjs.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-Monitoring-000000?style=for-the-badge&logo=opentelemetry&logoColor=white)](https://opentelemetry.io)

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Environment Configuration](#-environment-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

## 🎯 Overview

Deep SAP is an intelligent career coaching platform specifically designed for SAP professionals. It leverages advanced AI agents to provide onboarding assistance, personalized career guidance, skills assessment, certification recommendations, and development planning. The system combines real-time database analysis with web research to deliver data-driven career insights.

### What Makes Deep SAP Unique

- **Multi-Agent Architecture**: Orchestrates multiple specialized AI agents for comprehensive analysis
- **Real-Time Database Integration**: Direct access to SAP employee data via Supabase MCP
- **Personalized Career Planning**: AI-driven recommendations based on individual profiles and market data
- **Skills Development Focus**: Integrated learning pathways and certification tracking
- **Enterprise-Ready**: Scalable architecture suitable for organizational deployment

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   Frontend      │◄────────────────►│   Backend       │
│   (Next.js)     │                  │   (Python)      │
│                 │    REST API      │                 │
│ - React UI      │◄────────────────►│ - Agent Framework│
│ - Auth System   │                  │ - WebSocket API │
│ - Dashboard     │                  │ - MCP Server    │
└─────────────────┘                  └─────────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌─────────────────┐    Database       ┌─────────────────┐
│   Supabase      │◄────────────────►│   AI Models      │
│   (PostgreSQL)  │                  │   (OpenAI/DeepSeek)
│                 │                  │                 │
│ - User Data     │                  │ - Deepseek V3   │
│ - Career Goals  │                  │ - Sentence      |
|                 |                  |   transformers  |
|                 |                  |   embeddings    │
│ - Chat History  │                  │ - Analysis      │
│ - Reports       │                  └─────────────────┘
└─────────────────┘
```

### Backend Architecture (Youtu-agent)

The backend is built on the **Youtu-agent framework**, featuring:

- **Orchestra Agent**: Multi-agent coordination system with planning and reporting tools
- **Specialized Workers**:
  - **Onboarding Agent**: Provide onboarding assistance based on given company documents
  - **Research Agent**: SAP market research and certification data
  - **Analysis Agent**: Database queries and profile analysis
  - **Skills Development Agent**: Learning path recommendations
  - **Synthesis Agent**: Comprehensive career strategy integration
- **MCP Integration**: Direct Supabase database and ChromaDB access via Model Context Protocol
- **WebSocket Server**: Real-time communication with frontend

### Frontend Architecture (sap-hack-frontend)

The frontend is a modern **Next.js 15** application built with the App Router, featuring a comprehensive React-based architecture:

#### 🎨 **UI Framework & Design System**
- **Next.js 15 App Router**: Server and client component architecture
- **React 19**: Latest React features with concurrent rendering
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first styling with custom design system
- **Radix UI**: Accessible, unstyled UI primitives
- **shadcn/ui**: High-quality component library built on Radix UI
- **Responsive Design**: Mobile-first approach with adaptive layouts

#### 🔐 **Authentication & Security**
- **Supabase Auth**: Complete authentication system with social logins
- **Role-Based Access**: User permissions and access control
- **Secure API Routes**: Protected endpoints with authentication middleware
- **Session Management**: Persistent user sessions with automatic refresh

#### 💬 **Real-time Communication**
- **WebSocket Integration**: Bidirectional real-time communication
- **Streaming Responses**: Live AI response streaming with typing indicators
- **Connection Management**: Automatic reconnection and error handling
- **Event-driven Updates**: Real-time UI updates based on backend events

#### 📱 **Application Architecture**
- **Modular Component Structure**: Reusable components organized by feature
- **Custom Hooks**: Business logic abstraction and state management
- **Context Providers**: Global state management for user preferences
- **API Integration Layer**: Centralized API client with error handling
- **Form Management**: React Hook Form with Zod validation

#### 📊 **Feature Modules**
- **Chat Interface**: AI conversation component with message history
- **Career Goals Manager**: CRUD operations for career objectives
- **Reports Dashboard**: Analytics and progress visualization
- **User Profile**: Personal information and preferences management
- **Authentication Flow**: Login, signup, password reset workflows

#### 🚀 **Performance & Optimization**
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js Image component with automatic optimization
- **Caching Strategies**: Intelligent caching for improved performance
- **Progressive Web App**: PWA capabilities for offline functionality
- **Bundle Analysis**: Optimized bundle size and loading performance

## ✨ Key Features

### 🤖 AI Agent Capabilities

- **Intelligent Career Coaching**: Personalized guidance based on experience and goals
- **Database-Driven Insights**: Real-time analysis of SAP employee data
- **Skills Gap Analysis**: Automated assessment and development planning
- **Certification Recommendations**: SAP-specific certification pathways
- **Market Intelligence**: Industry trends and salary insights

### 💼 Career Management

- **Goal Setting**: Structured career objective definition
- **Progress Tracking**: Milestone-based advancement monitoring
- **Skills Development**: Learning resource recommendations
- **Performance Analytics**: Career trajectory visualization
- **Report Generation**: Comprehensive progress reports

### 🔧 Technical Features

- **Real-time Communication**: WebSocket-based instant responses
- **Database Integration**: Direct SQL queries via MCP
- **Scalable Architecture**: Multi-agent orchestration
- **Enterprise Security**: Supabase authentication and authorization
- **Performance Monitoring**: OpenTelemetry tracing and analytics

## 🛠️ Technology Stack

### Backend (Youtu-agent)
- **Framework**: Youtu-agent (Tencent Youtu Lab)
- **Language**: Python 3.12+
- **AI/ML**: DeepSeek V3 for generation, Microsoft phi-3 for title generation
- **Database**: Supabase PostgreSQL via MCP
- **Vector DB**: ChromaDB with ChromaDB MCP
- **Web Framework**: FastAPI, WebSockets
- **Search**: Serper API, Jina AI embeddings
- **Monitoring**: OpenTelemetry, Phoenix

### Frontend (sap-hack-frontend)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19, Radix UI, shadcn/ui
- **Styling**: Tailwind CSS, Emotion
- **Authentication**: Supabase Auth
- **Real-time**: WebSocket, Socket.io

### Infrastructure
- **Database**: Supabase (PostgreSQL), ChromaDB
- **Deployment**: Vercel (Frontend), Railway (Backend)
- **Containerization**: Docker
- **Package Management**: uv (Python), npm (Node.js)

## 🚀 Quick Start

### Prerequisites
- Python 3.12+ with uv package manager
- Node.js 18+ with npm
- Git
- Supabase account
- Deepseek API key (or compatible LLM provider)

### One-Command Setup

```bash
# Clone and setup everything
git clone https://github.com/nathanpua/SAP-HACK.git
cd sap-hack-frontend

# Setup Python environment
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt

# Setup frontend
cd sap-hack-frontend && npm install && cd ..

# Configure environment
cp env-production-example.txt .env
# Edit with your API keys and Supabase credentials

# Start development servers
# Terminal 1: Backend
cd Youtu-agent/examples/career_coach
python main_web.py

# Terminal 2: Frontend
cd deep-sap-frontend
npm run dev
```

Visit `http://localhost:3000` to access the application!

## 📦 Installation

### Backend Setup

1. **Install Python Dependencies**
```bash
uv venv
source .venv/bin/activate  # Linux/Mac
# or .venv\Scripts\activate  # Windows
uv pip install -r requirements.txt
```

2. **Install UI Package**
```bash
# Download from: https://tencentcloudadp.github.io/youtu-agent/frontend/
uv pip install utu_agent_ui-0.1.5-py3-none-any.whl
```

3. **Configure Environment**
```bash
cd Youtu-agent
cp .env.example .env
# Edit .env with required API keys
```

### Frontend Setup

1. **Install Dependencies**
```bash
cd sap-hack-frontend
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env.local
# Configure Supabase and WebSocket URLs
```

3. **Start Development Server**
```bash
npm run dev
```

## 🔑 Environment Configuration

### Backend Environment Variables (`Youtu-agent/.env`)

```bash
# Required: LLM Configuration
UTU_LLM_TYPE=chat.completions
UTU_LLM_MODEL=gpt-4o-mini
UTU_LLM_API_KEY=your-openai-api-key

# Required: Supabase Integration
SUPABASE_ACCESS_TOKEN=your-supabase-access-token

# Required: Search and Embeddings
SERPER_API_KEY=your-serper-api-key
JINA_API_KEY=your-jina-api-key

# Server Configuration
FRONTEND_IP=0.0.0.0
FRONTEND_PORT=8080
```

### Frontend Environment Variables (`sap-hack-frontend/.env.local`)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-supabase-anon-key

# WebSocket Configuration
CAREER_COACH_WS_URL=ws://127.0.0.1:8848/ws
```

## 💡 Usage

### Starting the Application

1. **Backend Server**
```bash
cd Youtu-agent/examples/career_coach
python main_web.py
```

2. **Frontend Server**
```bash
cd sap-hack-frontend
npm run dev
```

3. **Access Application**
   - Frontend: http://localhost:3000
   - Backend WebSocket: ws://127.0.0.1:8080/ws

### Example Interactions

**Career Guidance Query:**
```
"I'm a SAP consultant with 3 years experience. I want to become a Solution Architect.
What certifications should I pursue and how long will it take?"
```

**Skills Assessment:**
```
"Analyze my current SAP skills and recommend a development plan for the next 12 months."
```

**Database Analysis:**
```
"What SAP certifications do successful architects typically have in our company?"
```

## 📚 API Documentation

### Backend APIs

#### WebSocket Endpoints
- `ws://127.0.0.1:8080/ws` - Main chat interface
- Real-time agent communication
- Streaming responses

#### REST APIs
- `/api/career-coach` - Career coaching queries
- `/api/career-goals` - Goal management
- `/api/conversations` - Chat history
- `/api/reports` - Analytics and reporting

### Frontend APIs

#### Authentication
- `/auth/login` - User login
- `/auth/signup` - User registration
- `/auth/logout` - User logout

#### Career Management
- `/api/career-goals` - CRUD operations for career goals
- `/api/user-profile` - User profile management
- `/api/reports` - Report generation

## 🔧 Development

### Backend Development

```bash
cd Youtu-agent

# Install development dependencies
uv sync --group dev

# Run tests
pytest

# Code formatting
make format

# Type checking
mypy utu/

# Linting
ruff check utu/
```

### Frontend Development

```bash
cd deep-sap-frontend

# Development server
npm run dev

# Build for production
npm run build

# Linting
npm run lint

# Type checking
npx tsc --noEmit
```

### Project Structure

```
SAP hack/
├── Youtu-agent/                    # Backend framework
│   ├── utu/                        # Core agent framework
│   │   ├── agents/                 # Agent implementations
│   │   ├── config/                 # Configuration system
│   │   ├── tools/                  # Agent tools
│   │   └── utils/                  # Utility functions
│   ├── examples/                   # Example applications
│   │   └── career_coach/          # Deep SAP career coach
│   └── configs/                    # Agent configurations
│
├── sap-hack-frontend/              # Frontend application
│   ├── app/                        # Next.js app directory
│   │   ├── api/                    # API routes
│   │   ├── auth/                   # Authentication pages
│   │   ├── chatbot/                # Chat interface
│   │   └── career-goals/          # Career management
│   ├── components/                 # React components
│   └── lib/                        # Utilities and configurations
│
├── requirements.txt                # Python dependencies
├── DEPLOYMENT_GUIDE.md            # Deployment instructions
└── README.md                      # This file
```

## 🚀 Deployment

### Option 1: Vercel + Railway (Recommended)

1. **Deploy Frontend to Vercel**
```bash
cd deep-sap-frontend
vercel --prod
```

2. **Deploy Backend to Railway**
```bash
railway init
railway variables set UTU_LLM_API_KEY=your-key
railway up
```

3. **Update WebSocket URL**
```bash
vercel env add CAREER_COACH_WS_URL production
# Enter: ws://your-railway-app.up.railway.app:8848/ws
```

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🧪 Testing

### Backend Testing

```bash
cd Youtu-agent

# Run all tests
pytest

# Run specific test file
pytest tests/agents/test_orchestra.py

# Run with coverage
pytest --cov=utu --cov-report=html
```

### Frontend Testing

```bash
cd deep-sap-frontend

# Run tests (if configured)
npm test

# E2E testing (if configured)
npm run test:e2e
```

### Integration Testing

```bash
# Test WebSocket connection
python scripts/test_websocket.py

# Test database connectivity
python scripts/test_supabase.py
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the Repository**
```bash
git clone https://github.com/nathanpua/SAP-HACK.git
```

2. **Create a Feature Branch**
```bash
git checkout -b feature/amazing-feature
```

3. **Make Your Changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation

4. **Run Tests and Linting**
```bash
# Backend
cd Youtu-agent && make format && pytest

# Frontend
cd deep-sap-frontend && npm run lint && npm run build
```

5. **Submit a Pull Request**
   - Provide a clear description of your changes
   - Reference any related issues

### Development Guidelines

- **Code Style**: Follow PEP 8 for Python, ESLint rules for TypeScript
- **Documentation**: Update README and docstrings for new features
- **Testing**: Maintain >80% test coverage for new code
- **Commits**: Use conventional commit messages

## 📄 License

This project combines multiple components with their respective licenses:

- **Youtu-agent**: MIT License (Tencent Youtu Lab)
- **Frontend Components**: MIT License
- **Documentation**: Creative Commons Attribution 4.0

See individual component LICENSE files for details.

## 🙏 Acknowledgments

### Core Technologies
- **[Youtu-agent](https://github.com/Tencent/Youtu-agent)**: Advanced agent framework from Tencent Youtu Lab
- **[Next.js](https://nextjs.org/)**: React framework for the frontend
- **[Supabase](https://supabase.com/)**: Backend-as-a-Service platform
- **[OpenAI Agents](https://github.com/openai/openai-agents-python)**: Foundation agent framework

### Special Thanks
- Tencent Youtu Lab for the Youtu-agent framework
- Vercel for hosting and deployment platform
- Supabase for database and authentication services
- OpenAI for powerful AI models and agent frameworks

## 📞 Support

### Getting Help

- **Documentation**: Check `Youtu-agent/docs/` and `deep-sap-frontend/README.md`
- **Issues**: [GitHub Issues](https://github.com/nathanpua/SAP-HACK/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nathanpua/SAP-HACK/discussions)

### Common Issues

**Backend Connection Issues:**
- Verify WebSocket URL in frontend environment variables
- Check that backend server is running on correct port
- Ensure firewall allows WebSocket connections

**Database Connection Problems:**
- Verify Supabase credentials and permissions
- Check MCP server configuration
- Ensure database tables exist and are accessible

**Authentication Errors:**
- Confirm Supabase project settings
- Verify environment variables are correctly set
- Check user permissions and roles

### Performance Optimization

- Use connection pooling for database queries
- Implement caching for frequently accessed data
- Monitor agent performance with OpenTelemetry
- Optimize WebSocket message handling

---

## 🌟 Key URLs

- **Repository**: https://github.com/nathanpua/SAP-HACK
- **Frontend (Dev)**: http://localhost:3000
- **Backend WebSocket (Dev)**: ws://127.0.0.1:8080/ws
- **Documentation**: See `Youtu-agent/docs/` and `DEPLOYMENT_GUIDE.md`

---

*Built with ❤️ for SAP professionals worldwide*
