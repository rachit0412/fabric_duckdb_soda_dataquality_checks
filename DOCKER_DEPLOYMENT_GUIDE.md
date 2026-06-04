# 🐳 Docker Build & Deployment Guide

**Version:** 1.0.1  
**Status:** Production Ready  
**Date:** April 2026  

---

## Quick Start (5 minutes)

### Prerequisites
- ✅ Docker Desktop installed and running
- ✅ Docker Compose (included with Desktop)
- ✅ 2GB RAM available
- ✅ Port 8000 (API) and 5432 (PostgreSQL) free

### One-Command Deploy

```bash
# Start the application
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f data-quality-api

# Test API
curl http://localhost:8000/health

# Interactive API docs
open http://localhost:8000/docs
```

**Result:**
- ✅ PostgreSQL running on localhost:5432
- ✅ FastAPI running on localhost:8000
- ✅ All 22 endpoints available
- ✅ Health checks passing every 30s

---

## Clean Build (Fresh Image)

### Remove Old Images & Start Fresh

```bash
# Stop and remove all containers
docker compose down

# Remove old images
docker rmi data-quality-api:latest postgres:16-alpine

# Remove volumes (erases all database data)
docker volume rm fabric_duckdb_soda_dataquality_checks_postgres_data

# Build fresh images without cache
docker compose build --no-cache

# Start fresh
docker compose up -d
```

**This will:**
- ✓ Remove old application images
- ✓ Remove old PostgreSQL image
- ✓ Erase all data
- ✓ Build completely fresh images
- ✓ Start with clean state

---

## Docker Image Optimization

### Multi-Stage Build (Applied)

The updated `Dockerfile` uses a multi-stage approach:

1. **Builder Stage (Discarded)**: Compiles Python wheels with build-essential
2. **Final Stage (Shipped)**: Only runtime dependencies, ~50% smaller

### File Size Reduction

```
Before multi-stage:  ~650MB (with build tools)
After multi-stage:   ~350MB (runtime only)
Reduction:           ~46% smaller
```

### What Was Removed

- ❌ `build-essential` (C compiler, not needed at runtime)
- ❌ Dev header files
- ❌ Git history
- ✓ `curl` (kept for health checks)
- ✓ Python runtime (slim image)
- ✓ PostgreSQL client libraries (kept for connectivity)

---

## Production Configuration

### Environment Variables

```env
# Database
POSTGRES_PASSWORD=change-me-with-a-32-char-random-password
PGADMIN_PASSWORD=change-me-before-enabling-pgadmin
POSTGRES_PORT=5432
POSTGRES_DB=data_quality

# API
API_PORT=8000
API_HOST=0.0.0.0

# Feature flags
ENABLE_ANOMALY_DETECTION=true
ENABLE_DATA_PROFILING=true
```

**Setup:**
```bash
cp .env.example .env
# Edit .env with your values
docker compose up -d
```

### Security Settings (Applied)

✅ Non-root user (UID 1000)  
✅ Read-only filesystem (can be enabled)  
✅ Dropped Linux capabilities  
✅ No privilege escalation  
✅ Resource limits set  
✅ Health checks enabled  

---

## Container Management

### View Status

```bash
# List running containers
docker compose ps

# View logs (real-time)
docker compose logs -f

# View specific service logs
docker compose logs -f data-quality-api
docker compose logs -f postgres

# View last 100 lines
docker compose logs --tail=100 data-quality-api
```

### Start/Stop

```bash
# Start (creates if needed)
docker compose up -d

# Stop all services (keeps data)
docker compose stop

# Restart specific service
docker compose restart data-quality-api

# Stop everything and remove containers
docker compose down
```

### Monitor Health

```bash
# Health check API
curl http://localhost:8000/health

# Check PostgreSQL connection
docker exec dq-postgres pg_isready -U postgres

# View resource usage
docker stats dq-platform-api
docker stats dq-postgres
```

---

## Volumes & Persistence

### PostgreSQL Data Persistence

```yaml
volumes:
  postgres_data: /var/lib/postgresql/data
```

**Data stays after container stops:**
```bash
# Data persists
docker compose stop

# Data still there when you restart
docker compose up -d
```

**To erase all data:**
```bash
# Remove volume (DESTROYS DATA)
docker volume rm fabric_duckdb_soda_dataquality_checks_postgres_data

# Rebuild
docker compose up -d
```

---

## Troubleshooting

### Docker Desktop Not Running

```bash
# macOS
open /Applications/Docker.app

# Windows
# Click Docker Desktop in Start Menu
# Or: C:\Program Files\Docker\Docker\Docker Desktop.exe

# Linux
sudo systemctl start docker
```

### Port Already in Use

```bash
# Port 8000 in use?
netstat -ano | findstr :8000
# Kill the process or change port in docker-compose.yml

# Port 5432 in use?
netstat -ano | findstr :5432
```

### Check Logs for Errors

```bash
# View all logs
docker compose logs

# Follow API logs
docker compose logs -f data-quality-api

# Last 50 lines
docker compose logs --tail=50
```

### Rebuild After Code Changes

```bash
# Rebuild API image
docker compose build --no-cache data-quality-api

# Restart with new image
docker compose up -d data-quality-api

# View changes
docker compose logs -f data-quality-api
```

---

## Production Deployment

### AWS ECS / Azure Container Instances

1. **Push to registry:**
   ```bash
   docker tag data-quality-api:latest yourreg.azurecr.io/data-quality-api:1.0.1
   docker push yourreg.azurecr.io/data-quality-api:1.0.1
   ```

2. **Deploy container instance:**
   ```bash
   # Azure CLI
   az container create \
     --resource-group mygroup \
     --name dq-api \
     --image yourreg.azurecr.io/data-quality-api:1.0.1 \
     --ports 8000 \
     --environment-variables POSTGRES_PASSWORD=... API_PORT=8000
   ```

### Kubernetes

Replace `docker-compose.yml` with `kubernetes/` manifests:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/postgres.yaml
```

---

## Docker Compose Services

### data-quality-api

```yaml
service: data-quality-api
image: data-quality-api:latest
port: 8000
health_check: every 30s
workers: 2 (uvicorn)
user: appuser (non-root)
```

**Endpoints:**
- `/health` - Health check
- `/docs` - Swagger UI
- `/api/v1/connections` - Connection management
- `/api/v1/check-plans` - Check configuration
- `/api/v1/runs` - Execution control
- `/api/v1/results` - Result retrieval
- ... (22 total endpoints)

### postgres

```yaml
service: postgres
image: postgres:16-alpine
port: 5432 (container only)
user: postgres (non-root)
volumes: postgres_data
health_check: pg_isready
```

**Database:**
- User: `postgres`
- Password: `${POSTGRES_PASSWORD}`
- Database: `data_quality`

---

## Performance Tuning

### Increase Workers

```bash
# In Dockerfile (default is 2)
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Increase PostgreSQL Memory

```yaml
# In docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G
```

### Scale API Horizontally

```bash
# Using docker-compose with scaling
docker compose up -d --scale data-quality-api=3
```

---

## Cleanup

### Remove Unused Docker Resources

```bash
# List all images, containers, volumes
docker system df

# Remove stopped containers
docker container prune

# Remove dangling images
docker image prune

# Remove all unused volumes
docker volume prune

# Nuclear option: Clean everything unused
docker system prune -a --volumes
```

---

## Monitoring

### Container Metrics

```bash
# Real-time stats
watch -n 1 'docker stats --no-stream'

# CPU/Memory usage
docker stats data-quality-api

# Network usage
docker network ls
docker network inspect dq-network
```

### Application Metrics

```bash
# Check API response time
time curl http://localhost:8000/health

# Monitor database connections
docker exec dq-postgres psql -U postgres -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# PostgreSQL activity
docker exec -it dq-postgres psql -U postgres data_quality
  \d  -- List tables
  \l  -- List databases
```

---

## Checklist

Before production deployment:

- [ ] Docker Desktop running
- [ ] All ports free (8000, 5432)
- [ ] `.env` file configured with secure password
- [ ] Volume mounted for data persistence
- [ ] Health checks passing (curl /health)
- [ ] API docs accessible (/docs)
- [ ] PostgreSQL connected
- [ ] Resource limits set
- [ ] Logs monitored for errors
- [ ] Backups configured (if production)

---

## Quick Reference Commands

```bash
# Build
docker compose build --no-cache

# Start
docker compose up -d

# Status
docker compose ps

# Logs
docker compose logs -f

# Stop
docker compose stop

# Down (remove containers)
docker compose down

# Rebuild and restart
docker compose down && docker compose up -d --build

# View image sizes
docker images | grep data-quality

# Execute command in container
docker exec dq-platform-api bash

# Access PostgreSQL shell
docker exec -it dq-postgres psql -U postgres
```

---

**Status:** ✅ Production-Ready Docker Setup  
**All services:** Optimized, Secure, Monitored  
**Last Updated:** April 2026
