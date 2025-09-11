# 🚀 SAP Hack Deployment Guide - Option 1 (Vercel + Railway)

This guide provides step-by-step instructions for deploying your SAP Hack application using Vercel (frontend) and Railway (backend).

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Vercel account (vercel.com)
- ✅ Railway account (railway.app)
- ✅ Supabase project set up
- ✅ API keys for OpenAI, Serper, and other services
- ✅ Vercel CLI installed (`sudo npm install -g vercel`)
- ✅ Railway CLI installed (`sudo npm install -g @railway/cli`)

## 🔧 Configuration Files Created

The following configuration files have been created for you:

### 1. Frontend Configuration
**File**: `sap-hack-frontend/vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@next-public-supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@next-public-supabase-anon-key",
    "CAREER_COACH_WS_URL": "@career-coach-ws-url"
  }
}
```

### 2. Backend Configuration
**File**: `Youtu-agent/railway.toml`
```toml
[build]
builder = "NIXPACKS"

[build.env]
PYTHON_VERSION = "3.12"

[deploy]
startCommand = "python examples/career_coach/main_web.py"
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[environments.production]
UTU_LLM_TYPE = "chat.completions"
UTU_LLM_MODEL = "gpt-4o-mini"
FRONTEND_IP = "0.0.0.0"
FRONTEND_PORT = "8848"
```

### 3. Docker Configuration
**File**: `Youtu-agent/Dockerfile`
```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install https://github.com/Tencent/Youtu-agent/releases/download/frontend/v0.1.5/utu_agent_ui-0.1.5-py3-none-any.whl
COPY . .
ENV PYTHONPATH=/app
ENV FRONTEND_IP=0.0.0.0
ENV FRONTEND_PORT=8848
EXPOSE 8848
CMD ["python", "examples/career_coach/main_web.py"]
```

### 4. Environment Variables Template
**File**: `env-production-example.txt`
```
# Frontend Environment Variables (for Vercel)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
CAREER_COACH_WS_URL=ws://your-railway-app.up.railway.app:8848/ws

# Backend Environment Variables (for Railway)
UTU_LLM_TYPE=chat.completions
UTU_LLM_MODEL=gpt-4o-mini
UTU_LLM_API_KEY=your-openai-api-key
SUPABASE_ACCESS_TOKEN=your-supabase-access-token
SERPER_API_KEY=your-serper-api-key
JINA_API_KEY=your-jina-api-key
FRONTEND_IP=0.0.0.0
FRONTEND_PORT=8848
```

## 🚀 Deployment Steps

### Phase 1: Prepare Your Environment Variables

1. **Copy the environment template**:
   ```bash
   cp env-production-example.txt .env.production
   ```

2. **Fill in your actual values**:
   - Get Supabase URL and anon key from your Supabase dashboard
   - Get your OpenAI API key from OpenAI platform
   - Get Serper API key from serper.dev
   - Get other API keys as needed

### Phase 2: Deploy Frontend to Vercel

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Navigate to frontend directory**:
   ```bash
   cd sap-hack-frontend
   ```

3. **Initialize Vercel project**:
   ```bash
   vercel --yes
   ```

4. **Set production environment variables**:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   # Enter: [your-supabase-project-url]

   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   # Enter: [your-supabase-anon-key]

   vercel env add CAREER_COACH_WS_URL production
   # Enter: ws://your-railway-app.up.railway.app:8848/ws (we'll update this later)
   ```

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

6. **Note the deployment URL** (e.g., `https://sap-hack.vercel.app`)

### Phase 3: Deploy Backend to Railway

1. **Login to Railway**:
   ```bash
   railway login
   ```

2. **Navigate to project root**:
   ```bash
   cd /Users/nathanpua/Desktop/SAP\ hack
   ```

3. **Initialize Railway project**:
   ```bash
   railway init
   ```

4. **Link your project** (or create new):
   ```bash
   railway link
   ```

5. **Set environment variables**:
   ```bash
   railway variables set UTU_LLM_API_KEY=your-openai-api-key
   railway variables set SUPABASE_ACCESS_TOKEN=your-supabase-access-token
   railway variables set SERPER_API_KEY=your-serper-api-key
   railway variables set JINA_API_KEY=your-jina-api-key
   railway variables set FRONTEND_IP=0.0.0.0
   railway variables set FRONTEND_PORT=8848
   railway variables set UTU_LLM_TYPE=chat.completions
   railway variables set UTU_LLM_MODEL=gpt-4o-mini
   ```

6. **Deploy to Railway**:
   ```bash
   railway up
   ```

7. **Get your Railway URL**:
   ```bash
   railway domain
   ```
   Note the URL (e.g., `sap-hack-production.up.railway.app`)

### Phase 4: Update Frontend Configuration

1. **Update WebSocket URL in Vercel**:
   ```bash
   cd sap-hack-frontend

   # Remove old WebSocket URL
   vercel env rm CAREER_COACH_WS_URL production

   # Add correct Railway WebSocket URL
   vercel env add CAREER_COACH_WS_URL production
   # Enter: ws://[your-railway-app].up.railway.app:8848/ws
   ```

2. **Redeploy frontend**:
   ```bash
   vercel --prod
   ```

## 🧪 Testing Your Deployment

### Test 1: Frontend Access
- Visit your Vercel URL (e.g., `https://sap-hack.vercel.app`)
- Verify the Next.js app loads correctly
- Check that you can access the login page

### Test 2: Authentication
- Try signing up/logging in
- Verify Supabase authentication works
- Check user session persistence

### Test 3: WebSocket Connection
- Navigate to the chatbot page
- Send a message to the career coach
- Verify real-time responses from Railway backend

### Test 4: Database Integration
- Ask career coach about SAP certifications
- Verify database queries work through Supabase MCP

## 🔧 Troubleshooting

### Common Issues:

1. **WebSocket Connection Failed**:
   ```bash
   # Check Railway logs
   railway logs

   # Verify WebSocket URL format
   # Should be: ws://your-app.up.railway.app:8848/ws
   ```

2. **Build Failures**:
   ```bash
   # Check Railway build logs
   railway logs --build

   # For dependency issues, ensure requirements.txt is complete
   ```

3. **Environment Variable Issues**:
   ```bash
   # List all variables
   railway variables
   vercel env ls
   ```

4. **Frontend Build Issues**:
   ```bash
   # Check Vercel deployment logs
   vercel logs
   ```

## 📊 Monitoring & Maintenance

### Railway Monitoring:
```bash
# View logs
railway logs

# Check status
railway status

# View environment variables
railway variables
```

### Vercel Monitoring:
```bash
# View deployment logs
vercel logs

# List environment variables
vercel env ls

# Check deployment status
vercel ls
```

## 🔄 Updates & Redeployment

### Update Frontend:
```bash
cd sap-hack-frontend
vercel --prod
```

### Update Backend:
```bash
railway up
```

### Update Environment Variables:
```bash
# Frontend
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production

# Backend
railway variables set VARIABLE_NAME=new_value
railway up
```

## 📈 Scaling Considerations

- **Railway Hobby Plan**: ~10-50 concurrent users
- **Railway Pro Plan**: 100-500+ concurrent users
- **Railway Team Plan**: 1000+ concurrent users

## 💰 Cost Estimation

| Component | Plan | Monthly Cost | Notes |
|-----------|------|-------------|--------|
| Vercel | Hobby | Free | Includes 100GB bandwidth |
| Railway | Hobby | ~$5 | Good for development/testing |
| Railway | Pro | ~$10-50 | For production with more users |
| Supabase | Free | Free | Up to 500MB database, 50MB bandwidth |

## 🎯 Expected URLs After Deployment

- **Frontend**: `https://sap-hack.vercel.app`
- **Backend**: `https://sap-hack-production.up.railway.app:8848`
- **WebSocket**: `ws://sap-hack-production.up.railway.app:8848/ws`
- **Supabase**: `https://your-project.supabase.co`

## ✅ Checklist

- [ ] Environment variables configured
- [ ] Vercel CLI installed and logged in
- [ ] Railway CLI installed and logged in
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway
- [ ] WebSocket URL updated in Vercel
- [ ] Frontend redeployed with correct WebSocket URL
- [ ] Authentication tested
- [ ] WebSocket connection tested
- [ ] Database queries tested

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review deployment logs (`railway logs`, `vercel logs`)
3. Verify all environment variables are set correctly
4. Ensure API keys are valid and have sufficient credits

---

**Last Updated**: September 11, 2025
**Deployment Method**: Vercel + Railway (Option 1)
