# MVP Deployment & Installation Guide

## Prerequisites

- **OS:** Linux, macOS, or Windows (with WSL)
- **Python:** 3.10+
- **Node.js:** 18+
- **PostgreSQL:** 13+ (or use Docker)
- **Docker & Docker Compose:** (recommended for local dev)

---

## 1. LOCAL DEVELOPMENT SETUP (< 10 minutes)

### 1a. Clone & Setup

```bash
# Clone repository
git clone <repo-url>
cd data-quality-platform

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
cd backend
pip install -r requirements.txt
cd ..
```

### 1b. Database Setup

**Option 1: Docker Compose (Recommended)**

```bash
docker-compose up -d postgres

# Wait for Postgres to be ready (check logs)
docker-compose logs postgres

# Initialize schema
docker exec -it dq-postgres psql -U dq_user -d dq_platform -f backend/schema.sql
```

**Option 2: Local PostgreSQL**

```bash
# Install Postgres (macOS: brew install postgresql)
# Start service: pg_ctl -D /usr/local/var/postgres start

# Create database and user
createdb dq_platform
createuser dq_user
psql -d dq_platform -f backend/schema.sql
```

### 1c. Environment Configuration

```bash
cd backend
cp .env.example .env

# Edit .env with your settings (especially DATABASE_URL if not using Docker)
nano .env
```

### 1d. Start Backend API

```bash
cd backend

# Run migrations (if using Alembic; skip for MVP)
# alembic upgrade head

# Start FastAPI server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 1e. Start Frontend (New Terminal)

```bash
cd frontend
npm install
npm start  # Starts on http://localhost:3000
```

### 1f. Start Worker (New Terminal, Optional for MVP)

```bash
cd backend
python -m src.worker.processor
```

---

## 2. DOCKER COMPOSE (Full Stack)

### 2a. Basic Docker Compose

Create / use existing `docker-compose.yml`:

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: dq_user
      POSTGRES_PASSWORD: dq_password
      POSTGRES_DB: dq_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dq_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: ./backend
    depends_on:
      postgres:
        condition: service_healthy
    env_file: backend/.env
    ports:
      - "8000:8000"
    volumes:
      - ./backend/src:/app/src
    command: uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: "http://localhost:8000"
    volumes:
      - ./frontend/src:/app/src

  worker:
    build: ./backend
    depends_on:
      postgres:
        condition: service_healthy
    env_file: backend/.env
    volumes:
      - ./backend/src:/app/src
    command: python -m src.worker.processor

volumes:
  postgres_data:
```

### 2b. Start Stack

```bash
# From repo root
docker-compose up -d

# Check logs
docker-compose logs -f api

# Access frontend at http://localhost:3000
```

### 2c. Inspect Database

```bash
# Connect to Postgres from local machine
psql -h localhost -U dq_user -d dq_platform

# Or via Docker
docker exec -it dq-postgres psql -U dq_user -d dq_platform
```

---

## 3. PRODUCTION DEPLOYMENT

### 3a. Environment Variables (Production)

Create `backend/.env.prod`:

```bash
DEBUG=false
APP_VERSION=1.0.0

DATABASE_URL=postgresql://dq_user:STRONG_PASSWORD@db-host:5432/dq_platform
DATABASE_POOL_SIZE=50
DATABASE_MAX_OVERFLOW=20

API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=https://yourdomain.com

SECRET_KEY=<GENERATE_WITH: openssl rand -hex 32>
ALGORITHM=HS256

WORKER_ENABLED=true
WORKER_POLL_INTERVAL_SECONDS=5
JOB_TIMEOUT_SECONDS=600

LOG_LEVEL=INFO

# Data source secrets (use secrets manager in prod, not env vars)
POSTGRES_HOST=source-db-host
POSTGRES_USER=source-user
POSTGRES_PASSWORD=<VAULT_SECRET>
```

### 3b. Production Dockerfile (Backend)

```dockerfile
FROM python:3.11-slim as builder
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY backend/src src/
ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3c. Deploy to Kubernetes (Helm Chart Outline)

```yaml
# values.yaml
replicaCount: 3

image:
  repository: your-registry/dq-platform-api
  tag: "1.0.0"

service:
  type: LoadBalancer
  port: 8000

database:
  host: postgres.default.svc.cluster.local
  port: 5432
  name: dq_platform

ingress:
  enabled: true
  hosts:
    - host: dq.yourdomain.com
      paths:
        - path: /
          pathType: Prefix

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

### 3d. Deploy to Cloud (Azure App Service Example)

```bash
# Build and push to Azure Container Registry
az acr build \
  --registry myregistry \
  --image dq-platform-api:1.0.0 \
  --file backend/Dockerfile ./backend

# Deploy to App Service
az webapp create \
  --resource-group my-rg \
  --plan my-plan \
  --name dq-platform-api \
  --deployment-container-image-name myregistry.azurecr.io/dq-platform-api:1.0.0

# Set environment variables
az webapp config appsettings set \
  --resource-group my-rg \
  --name dq-platform-api \
  --settings @backend/.env.prod
```

---

## 4. HEALTH CHECKS & VERIFICATION

### 4a. API Health

```bash
curl http://localhost:8000/health

# Response:
# {
#   "status": "ok",
#   "app": "Data Quality Platform",
#   "version": "1.0.0"
# }
```

### 4b. Database Connection

```bash
# From backend container/venv
python -c "
from src.storage.db import engine
from src.models.db import Base

Base.metadata.create_all(bind=engine)
print('✓ Database connected and schema initialized')
"
```

### 4c. Frontend Assets

```bash
curl http://localhost:3000/
# Should return HTML with React app
```

### 4d. E2E Smoke Test

```bash
# 1. Create a connection
curl -X POST http://localhost:8000/api/v1/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_conn",
    "type": "postgres",
    "remote_url": "postgresql://localhost:5432/testdb",
    "secret": "user:pass"
  }'

# 2. Test connection
curl -X POST http://localhost:8000/api/v1/connections/<id>/test

# 3. Verify in frontend at http://localhost:3000
```

---

## 5. TROUBLESHOOTING

### Issue: "Connection refused" on port 5432

```bash
# Check if Postgres is running
docker ps | grep postgres
# or
lsof -i :5432

# If using Docker Compose
docker-compose logs postgres
docker-compose restart postgres
```

### Issue: "ModuleNotFoundError: No module named 'src'"

```bash
# Make sure you're in the backend directory and using the virtual environment
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: Frontend can't reach API

```bash
# Check CORS_ORIGINS in backend/.env includes frontend URL
# Check API is running: curl http://localhost:8000/health
# Check frontend .env has correct REACT_APP_API_URL
```

### Issue: Worker not processing jobs

```bash
# Check worker is running
ps aux | grep processor

# Check job queue table
psql -d dq_platform -c "SELECT * FROM job_queue;"

# Check worker logs for errors
```

---

## 6. PERFORMANCE TUNING (Phase 2)

### Database Optimization
```sql
-- Add connection pools
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';

-- Vacuum and analyze
VACUUM ANALYZE;
```

### Worker Scaling
- Use Celery + Redis for distributed workers
- Configure worker concurrency and task timeouts
- Implement dead letter queue for failed jobs

### API Caching
- Add Redis cache layer for metadata snapshots
- Cache suggestion results (expires after 24h)
- Implement response compression (gzip)

---

## 7. MONITORING & LOGGING

### Log Aggregation
```bash
# View API logs
docker-compose logs -f api

# View worker logs
docker-compose logs -f worker

# Tail database query logs
docker exec dq-postgres tail -f /var/log/postgresql/postgresql.log
```

### Metrics Collection (Phase 2)
```python
# Add Prometheus endpoint
from prometheus_client import Counter, Histogram

check_executions = Counter("check_executions_total", "Total checks executed")
check_duration = Histogram("check_duration_seconds", "Check execution duration")
```

---

## 8. BACKUP & RECOVERY

### Backup Database

```bash
# Docker
docker exec dq-postgres pg_dump -U dq_user dq_platform > backup.sql

# Local
pg_dump -U dq_user dq_platform > backup.sql
```

### Restore Database

```bash
# Docker
docker exec -i dq-postgres psql -U dq_user dq_platform < backup.sql

# Local
psql -U dq_user dq_platform < backup.sql
```

---

## 9. SECURITY CHECKLIST

- [ ] Change default passwords in .env
- [ ] Enable HTTPS in production (TLS certificates)
- [ ] Restrict CORS_ORIGINS to known domains
- [ ] Implement API authentication (JWT tokens)
- [ ] Store secrets in vault (AWS Secrets Manager, Azure Key Vault, etc.)
- [ ] Enable database encryption at rest
- [ ] Implement rate limiting on API endpoints
- [ ] Audit log all user actions (enabled by default)
- [ ] Regular security patches (pin dependency versions)

---

## 10. SUPPORT & DEBUGGING

### Enable DEBUG Mode (Development Only)

```bash
# In backend/.env
DEBUG=true
LOG_LEVEL=DEBUG
```

### Run Tests

```bash
cd backend
pytest tests/ -v --cov=src

# Generate coverage report
pytest tests/ --cov=src --cov-report=html
```

### Manual SodaCL Testing

```bash
# Generate config
cat > /tmp/soda_config.yml << EOF
data_sources:
  postgres_prod:
    type: postgres
    host: localhost
    port: 5432
    username: postgres
    password: postgres
    database: testdb
EOF

# Generate checks
cat > /tmp/checks.yml << EOF
checks:
  - name: row count
    type: row_count
EOF

# Run Soda CLI
soda scan -d testdb -c /tmp/soda_config.yml /tmp/checks.yml
```

---

End of Deployment Guide
