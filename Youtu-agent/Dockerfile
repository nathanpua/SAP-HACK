# 1. Use an official Python base image
FROM python:3.12

# 2. Install git and Node.js for cloning dependencies and MCP servers
RUN apt-get update && apt-get install -y git curl && \
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# 3. Set the working directory
WORKDIR /Youtu-agent

# 4. Copy project files (pyproject.toml, uv.lock, source code)
COPY pyproject.toml uv.lock ./
COPY utu/ ./utu/

# 5. Install the 'uv' build tool globally
RUN pip install uv

# 6. Synchronize the Python environment and dependencies
RUN uv sync --no-install-project --group documents

# 7. Add the virtual environment's bin directory to PATH
ENV PATH="/Youtu-agent/.venv/bin:$PATH"

# 8. Copy the rest of the application code
COPY . .

# 9. Install the project in editable mode
RUN uv pip install -e .

# 11. Install the frontend UI package
RUN uv pip install https://github.com/Tencent/Youtu-agent/releases/download/frontend/v0.1.5/utu_agent_ui-0.1.5-py3-none-any.whl

# 12. Set environment variables
ENV PYTHONPATH=/Youtu-agent
ENV FRONTEND_IP=0.0.0.0
ENV PORT=8080

# 13. Expose port
EXPOSE 8080

# 14. Start the application
CMD ["python", "examples/career_coach/main_web.py"]
