# Enterprise Dockerfile for Data Quality Platform
# Multi-stage build: Minimal, secure production image
# Build stage
FROM python:3.11-slim as builder

WORKDIR /tmp

# Install only build dependencies (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and build wheels
COPY requirements.txt .
RUN pip install --user --no-cache-dir --upgrade pip wheel \
    && pip install --user --no-cache-dir -r requirements.txt

# Final stage (production image - minimal)
FROM python:3.11-slim

# Metadata
LABEL maintainer="Data Quality Team"
LABEL version="1.0.1"
LABEL description="Enterprise Data Quality Platform (Production)"

# Security: Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -u 1000 appuser

# Set working directory
WORKDIR /app

# Copy only built wheels from builder stage (no build tools)
COPY --from=builder --chown=appuser:appuser /root/.local /home/appuser/.local

# Install runtime dependencies only (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy application code with correct ownership
COPY --chown=appuser:appuser src/ ./src/
COPY --chown=appuser:appuser soda_duckdb/ ./soda_duckdb/

# Create necessary directories
RUN mkdir -p /app/logs /app/reports /app/data \
    && chown -R appuser:appuser /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH=/home/appuser/.local/bin:$PATH

# Security: Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
