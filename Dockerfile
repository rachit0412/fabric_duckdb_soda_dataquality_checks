# Enterprise Dockerfile for Data Quality Platform
FROM python:3.11-slim

# Metadata
LABEL maintainer="Data Quality Team <support@your-company.com>"
LABEL version="1.0.0"
LABEL description="Enterprise Data Quality Platform for Microsoft Fabric"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY soda_duckdb/ ./soda_duckdb/

# Create necessary directories
RUN mkdir -p /app/logs /app/reports /tmp/reports

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run the API server
CMD ["python", "-m", "src.api.server"]
