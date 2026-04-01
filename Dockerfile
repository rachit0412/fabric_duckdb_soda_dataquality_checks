# Enterprise Dockerfile for Data Quality Platform
# Security-hardened production image
FROM python:3.11-slim

# Metadata
LABEL maintainer="Data Quality Team <support@your-company.com>"
LABEL version="1.0.1"
LABEL description="Enterprise Data Quality Platform for Microsoft Fabric"
LABEL org.opencontainers.image.source="https://github.com/rachit0412/fabric_duckdb_soda_dataquality_checks"

# Security: Create non-root user early
RUN groupadd -r appuser && useradd -r -g appuser -u 1000 appuser

# Set working directory
WORKDIR /app

# Install system dependencies (minimal set)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements first for better caching
COPY --chown=appuser:appuser requirements.txt .

# Install Python packages
RUN pip install --upgrade pip --no-cache-dir \
    && pip install --no-cache-dir -r requirements.txt \
    && rm -rf /root/.cache

# Copy application code with correct ownership
COPY --chown=appuser:appuser src/ ./src/
COPY --chown=appuser:appuser soda_duckdb/ ./soda_duckdb/

# Create necessary directories with correct permissions
RUN mkdir -p /app/logs /app/reports /app/data \
    && chown -R appuser:appuser /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PYTHONDONTWRITEBYTECODE=1

# Security: Switch to non-root user
USER appuser

# Expose API port (non-privileged)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Security: Use exec form to avoid shell
CMD ["python", "-m", "uvicorn", "src.api.server:app", "--host", "0.0.0.0", "--port", "8000"]
