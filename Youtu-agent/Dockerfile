# Use Python 3.12 slim base image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install the UI package
RUN pip install https://github.com/Tencent/Youtu-agent/releases/download/frontend/v0.1.5/utu_agent_ui-0.1.5-py3-none-any.whl

# Copy the application code
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV FRONTEND_IP=0.0.0.0
ENV FRONTEND_PORT=8848

# Expose port
EXPOSE 8848

# Start the application
CMD ["python", "examples/career_coach/main_web.py"]
