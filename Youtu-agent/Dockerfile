# 1. Use an official Python base image
FROM python:3.12

# 2. Install git for cloning dependencies if needed
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# 3. Set the working directory
WORKDIR /Youtu-agent

# 4. Copy project files (pyproject.toml, uv.lock, source code)
COPY pyproject.toml uv.lock ./
COPY utu/ ./utu/

# 5. Install the 'uv' build tool globally
RUN pip install uv

# 6. Synchronize the Python environment and dependencies
RUN uv sync --no-install-project

# 7. Add the virtual environment's bin directory to PATH
ENV PATH="/Youtu-agent/.venv/bin:$PATH"

# 8. Copy the rest of the application code
COPY . .

# 9. Install the frontend UI package
RUN uv pip install https://github.com/Tencent/Youtu-agent/releases/download/frontend/v0.1.5/utu_agent_ui-0.1.5-py3-none-any.whl

# 10. Set environment variables
ENV PYTHONPATH=/Youtu-agent
ENV FRONTEND_IP=0.0.0.0
ENV PORT=8080

# 11. Expose port
EXPOSE 8080

# 12. Start the application
CMD ["python", "examples/career_coach/main_web.py"]
