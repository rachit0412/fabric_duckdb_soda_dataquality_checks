# 🚀 Deployment Guide

**Version:** 1.0.0  
**Updated:** 2026-04-11  
**Status:** Production Ready

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Docker Desktop (or Docker + Docker Compose)
- Git
- Python 3.11+ (for local dev)
- Node.js 18+ (for frontend dev)

### Deploy (1 minute)

```powershell
# Clone or navigate to repository
cd fabric_duckdb_soda_dataquality_checks

# Start all services
docker compose up -d

# Wait for services to start (~30 seconds)
docker compose ps

# Verify health
curl http://localhost:8001/health

# Open application
# macOS/Linux: open http://localhost:3010
# Windows: Start http://localhost:3010

# Stop services
docker compose down
```

**Services Running:**
- ✅ PostgreSQL 16 on port 5432
- ✅ FastAPI on port 8001
- ✅ React Frontend on port 3010
- ✅ pgAdmin (optional) on port 5050

---

## Local Development

### Setup Python Backend

```bash
# 1. Create virtual environment
python -m venv .venv

# 2. Activate virtual environment
# macOS/Linux:
source .venv/bin/activate

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements-dev.txt

# 4. Start database (in Docker)
docker compose up -d postgres

# 5. Create database schema
psql -U postgres -d data_quality -f backend/schema.sql

# 6. Run application
cd backend/src
python -m main

# 7. API available at:
# http://localhost:8001
# Docs: http://localhost:8001/docs
```

### Setup React Frontend

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Frontend available at:
# http://localhost:5173 (Vite default)
```

### Run Tests

```bash
# Backend unit tests
pytest tests/unit/ -v

# Backend integration tests (requires Docker)
pytest tests/integration/ -v

# Frontend tests
cd frontend
npm run test

# Full test coverage
pytest --cov=src tests/ --cov-report=html
```

---

## Docker Deployment

### Single-Host Deployment

```bash
# 1. Build images (optional, compose will build)
docker compose build

# 2. Start all services
docker compose up -d

# 3. Verify all services are running
docker compose ps

# 4. Check logs
docker compose logs -f data-quality-api

# 5. Stop services
docker compose down

# 6. Stop and remove data
docker compose down -v
```

### Multi-Node Deployment (Docker Swarm)

```bash
# 1. Initialize Swarm (on manager node)
docker swarm init

# 2. Create overlay network
docker network create -d overlay dq-network

# 3. Deploy stack
docker stack deploy -c docker-compose.yml dq-platform

# 4. Verify deployment
docker stack ps dq-platform

# 5. Check service replicas
docker service ls

# 6. Scale service
docker service scale dq-platform_data-quality-api=3

# 7. Remove stack
docker stack rm dq-platform
```

### Kubernetes Deployment

```bash
# 1. Create namespace
kubectl create namespace data-quality

# 2. Create secrets (PostgreSQL password)
kubectl create secret generic postgres-secret \
  --from-literal=password=YOUR_PASSWORD \
  -n data-quality

# 3. Deploy using Kubernetes manifests (see infrastructure/)
kubectl apply -f infrastructure/k8s/ -n data-quality

# 4. Verify deployment
kubectl get pods -n data-quality
kubectl get services -n data-quality

# 5. Port-forward for local testing
kubectl port-forward -n data-quality \
  service/data-quality-api 8000:8000

# 6. View logs
kubectl logs -n data-quality deployment/data-quality-api -f

# 7. Clean up
kubectl delete namespace data-quality
```

---

## Production Deployment

### Pre-Flight Checklist

- [ ] Database backup strategy in place
- [ ] SSL/TLS certificates obtained
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Health checks configured
- [ ] Logging and monitoring enabled
- [ ] Security scanning passed
- [ ] Load testing completed

### Environment Variables

Create `.env.production` file:

```bash
# Core
APP_NAME=Data Quality Platform
APP_VERSION=1.0.0
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql://username:password@db-host:5432/data_quality
DB_POOL_SIZE=20
DB_POOL_RECYCLE=3600

# DuckDB
DUCKDB_TEMP_PATH=/data/duckdb_tmp
DUCKDB_MAX_THREADS=4

# Security
CORS_ORIGINS=https://example.com,https://app.example.com
SECRET_KEY=your-secret-key-here-minimum-32-chars
JWT_SECRET=your-jwt-secret-here
JWT_ALGORITHM=HS256

# Storage
UPLOAD_DIRECTORY=/data/uploads
MAX_UPLOAD_SIZE_MB=100

# Worker
WORKER_ENABLED=True
WORKER_MAX_TASKS=10
WORKER_TIMEOUT_SECONDS=3600

# Soda
SODA_LOGGING_ENABLED=True
SODA_TEMP_PATH=/data/soda_tmp

# Monitoring
SENTRY_DSN=https://your-sentry-url
PROMETHEUS_ENABLED=True
```

### Deploy to AWS ECS

```bash
# 1. Create ECR repository
aws ecr create-repository --repository-name data-quality-api

# 2. Build and push image
docker build -t data-quality-api:1.0.0 .
docker tag data-quality-api:1.0.0 ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/data-quality-api:1.0.0
docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/data-quality-api:1.0.0

# 3. Create CloudFormation stack (or use Terraform)
aws cloudformation create-stack \
  --stack-name dq-platform \
  --template-body file://infrastructure/cloudformation/dq-stack.yaml

# 4. Deploy to ECS Fargate
aws ecs update-service \
  --cluster data-quality \
  --service api-service \
  --force-new-deployment
```

### Deploy to Azure Container Instances

```bash
# 1. Create container registry
az acr create -n dqplatform -g MyResourceGroup --sku Basic

# 2. Build and push image
az acr build -r dqplatform --image data-quality-api:1.0.0 .

# 3. Deploy container instance
az container create \
  --resource-group MyResourceGroup \
  --name dq-api-container \
  --image dqplatform.azurecr.io/data-quality-api:1.0.0 \
  --environment-variables API_HOST=0.0.0.0 API_PORT=8001
```

### SSL/TLS Configuration

```nginx
# Nginx reverse proxy example (production)
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
      proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Database Migration

```bash
# 1. Backup existing database
pg_dump -U postgres data_quality > backup-prod-$(date +%Y%m%d).sql

# 2. Apply new schema
psql -U postgres -d data_quality -f backend/schema.sql

# 3. Verify schema
psql -U postgres -d data_quality -c "\dt"

# 4. Verify data integrity
psql -U postgres -d data_quality -c "SELECT COUNT(*) FROM runs;"
```

---

## Configuration

### Docker Compose Environment

Override defaults in `.env` file:

```bash
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=data_quality
POSTGRES_PORT=5432

# API
API_HOST=0.0.0.0
API_PORT=8001
LOG_LEVEL=INFO

# Frontend
VITE_API_URL=http://localhost:8001
```

### Soda Core Configuration

Create `soda_duckdb/config.yml`:

```yaml
data_source duckdb:
  type: duckdb
  connection:
    host: /tmp/duckdb

metrics:
  - table_name: customers
    columns:
      - id
      - email
    metrics:
      - row_count
      - invalid_percent
      - missing_count
```

### PostgreSQL Performance Tuning

Edit `postgresql.conf` in Docker volume:

```ini
# Connection limits
max_connections = 200
superuser_reserved_connections = 10

# Memory
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB

# Query planning
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000
log_connections = on
log_disconnections = on
```

---

## Troubleshooting

### Services Not Starting

```bash
# Check Docker daemon
docker ps

# Check compose logs
docker compose logs

# Check specific service
docker compose logs data-quality-api

# Restart services
docker compose restart
```

### Database Connection Failed

```bash
# Test connection
psql -U postgres -h localhost -d data_quality -c "SELECT 1;"

# Check if postgres is running
docker compose ps postgres

# View postgres logs
docker compose logs postgres

# Restart postgres
docker compose restart postgres
```

### API Not Responding

```bash
# Check if port 8001 is in use
netstat -an | grep 8001

# Check API logs
docker compose logs data-quality-api

# Restart API
docker compose restart data-quality-api

# Test health endpoint
curl http://localhost:8001/health
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean up Docker data
docker system prune -a

# Remove old backups
rm -f backup-*.sql

# Check database size
docker exec dq-postgres du -sh /var/lib/postgresql/data
```

### Performance Issues

```bash
# Monitor resource usage
docker stats

# Check slow queries (in postgres)
psql -U postgres -d data_quality -c "SELECT query FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Reindex tables (if needed)
docker exec dq-postgres psql -U postgres -d data_quality -c "REINDEX DATABASE data_quality;"
```

---

## Monitoring & Health

### Health Check Endpoint

```bash
# Service health
curl http://localhost:8001/health

# Expected response:
# {"status": "ok", "version": "1.0.0", "database": "connected"}
```

### Prometheus Metrics

Metrics available at: `http://localhost:8001/metrics`

Key metrics:
- `api_requests_total` - Total API requests
- `api_request_duration_seconds` - Request latency
- `database_connections` - Active DB connections
- `check_execution_duration_seconds` - Check execution time

### Structured Logging

All logs are JSON-formatted for easy parsing:

```json
{
  "timestamp": "2026-04-11T10:35:00Z",
  "level": "INFO",
  "service": "data-quality-api",
  "message": "Executed check plan",
  "check_plan_id": "uuid",
  "duration_ms": 1234
}
```

---

## Backup & Recovery

### Automated Backups

```bash
# Daily backup (cron job)
0 2 * * * pg_dump -U postgres data_quality | gzip > /backups/dq-$(date +\%Y\%m\%d).sql.gz

# Upload to cloud storage
0 3 * * * aws s3 sync /backups s3://my-backup-bucket/dq-platform/
```

### Point-in-Time Recovery

```bash
# Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backups/wal_archive/%f'

# Recover to specific time
pg_basebackup -D /backup/base -Ft -z
# Restore from base backup, then apply WAL archives until desired time
```

---

**Last Updated:** 2026-04-11  
**Maintained By:** DevOps Team  
**Next Review:** 2026-05-11
