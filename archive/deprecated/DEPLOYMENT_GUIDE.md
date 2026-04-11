# Deployment Guide

**Version:** 1.0.1 | **Last Updated:** 2026-04-01

## ⚡ Quick Access URLs

For **GitHub Codespaces** users:
- **Frontend:** http://127.0.0.1:3002 (Codespaces forwards 3000 → 3002)
- **API:** http://127.0.0.1:8001 (Codespaces forwards 8000 → 8001)

For **Local Docker** users:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:8000

See [PORT_ACCESS_GUIDE.md](PORT_ACCESS_GUIDE.md) for complete port information.

---

## Quick Deploy (Docker Compose)

### Prerequisites

- Docker Desktop installed and running
- 4 GB available RAM
- Port 3000, 8000, 5432 available

### Deploy Steps

```bash
# 1. Navigate to project directory
cd /workspaces/fabric_duckdb_soda_dataquality_checks

# 2. Start all services
docker compose up -d

# 3. Wait 30 seconds for services to start
sleep 30

# 4. Verify all containers are healthy
docker ps --format "table {{.Names}}\t{{.Status}}"

# 5. Access the platform
echo "Frontend (Codespaces): http://127.0.0.1:3002"
echo "Frontend (Local):      http://localhost:3000"
echo "API:                   http://localhost:8000/api"
echo "API Docs:              http://localhost:8000/docs"
```

### Expected Output

```
NAMES                  STATUS
dq-nginx               Up X seconds
dq-platform-frontend   Up X seconds (healthy)
dq-platform-api        Up X seconds (healthy)
dq-postgres            Up X seconds (healthy)
```

---

## Services Overview

### 1. Nginx Reverse Proxy

**Container:** `dq-nginx`  
**Port:** 80 (internal), mapped to various ports

Routes traffic between frontend and API services.

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./infrastructure/docker/nginx.conf:/etc/nginx/nginx.conf:ro
```

### 2. Frontend Service

**Container:** `dq-platform-frontend`  
**Port:** 3000  
**Technology:** React 18

Build configuration:
```yaml
docker exec dq-platform-frontend npm run build

# Production: serve -s build -l 3000
# Development: npm start (with hot reload)
```

### 3. API Service

**Container:** `dq-platform-api`  
**Port:** 8000  
**Technology:** FastAPI + Uvicorn

Health check: `curl http://localhost:8000/api/health`

Key environment variables:
```yaml
- PYTHONUNBUFFERED: 1
- DUCKDB_PATH: /tmp/my_database.myduckdb
- SODA_CONFIG_PATH: /app/soda_duckdb/config.yml
- SODA_CHECKS_PATH: /app/soda_duckdb/checks.yml
- POSTGRES_HOST: postgres
- POSTGRES_PORT: 5432
- POSTGRES_USER: postgres
- POSTGRES_PASSWORD: test123  # CHANGE IN PRODUCTION
- POSTGRES_DB: data_quality
- STORAGE_BACKEND: postgresql
```

### 4. PostgreSQL Database

**Container:** `dq-postgres`  
**Port:** 5432 (internal only)  
**Technology:** PostgreSQL 16-alpine

Data persistence:
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
  - ./init-scripts:/docker-entrypoint-initdb.d:ro
```

---

## Configuration

### Environment Variables

Create `.env` file or pass via `docker compose --env-file`:

```bash
# Database Credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password_here  # Change this!
POSTGRES_DB=data_quality

# Ports
API_PORT=8000
FRONTEND_PORT=3000
POSTGRES_PORT=5432

# Environment
ENVIRONMENT=production  # or development

# Optional: Azure Cosmos DB (if using instead of PostgreSQL)
COSMOS_ENDPOINT=https://xxx.documents.azure.com:443/
COSMOS_KEY=your_key_here
```

### Storage Backend Configuration

**PostgreSQL** (default):
```yaml
STORAGE_BACKEND: postgresql
POSTGRES_HOST: postgres
POSTGRES_USER: postgres
POSTGRES_PASSWORD: test123
```

**Azure Cosmos DB:**
```yaml
STORAGE_BACKEND: cosmosdb
COSMOS_ENDPOINT: https://xxx.documents.azure.com:443/
COSMOS_KEY: your_key_here
```

---

## Monitoring & Troubleshooting

### Check Service Status

```bash
# All containers
docker ps

# Specific service
docker ps --filter "name=dq-platform-api"

# Detailed stats
docker stats
```

### View Logs

```bash
# API logs
docker logs dq-platform-api -f

# Frontend logs
docker logs dq-platform-frontend -f

# Database logs
docker logs dq-postgres -f

# All logs
docker compose logs -f
```

### Common Issues

#### Issue: Services not starting

**Solution:**
```bash
# Full rebuild
docker compose down
docker compose build --no-cache
docker compose up -d

# Wait and check
sleep 10
docker ps
```

#### Issue: Port already in use

**Solution:**
```bash
# Find process using port 8000
lsof -i :8000

# Or change port in docker-compose.yml
ports:
  - "9000:8000"  # Use 9000 instead of 8000
```

#### Issue: Database connection errors

**Solution:**
```bash
# Restart just the database
docker restart dq-postgres

# Or full restart
docker compose down
docker volume rm fabric_duckdb_soda_dataquality_checks_postgres_data  # Warning: deletes data!
docker compose up -d
```

### Health Checks

```bash
# API health
curl http://localhost:8000/api/health

# Frontend (should return HTML)
curl -s http://localhost:3000 | head -20

# Database
docker ps --filter "name=dq-postgres" --format "table {{.Names}}\t{{.Status}}"
```

---

## Production Deployment

### Security Recommendations

1. **Change Default Passwords**
   ```yaml
   POSTGRES_PASSWORD: strong_random_password_here
   ```

2. **Use Environment File**
   ```bash
   docker compose --env-file .env.prod up -d
   ```

3. **Enable Read-Only Filesystem**
   ```yaml
   read_only: true
   tmpfs:
     - /tmp
   ```

4. **Set Resource Limits**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2.0'
         memory: 2G
   ```

5. **Use Non-Root User**
   ```yaml
   user: "1000:1000"
   ```

6. **Network Isolation**
   ```yaml
   networks:
     - dq-network
   expose:
     - "8000"  # Don't expose to host
   # Don't use ports: if only for internal communication
   ```

### Backup & Recovery

```bash
# Backup database
docker exec dq-postgres pg_dump -U postgres data_quality > backup.sql

# Restore database
docker exec -i dq-postgres psql -U postgres data_quality < backup.sql

# Backup volumes
docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/db.tar.gz -C /data .
```

---

## Scaling

### Horizontal Scaling with Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dq-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dq-api
  template:
    metadata:
      labels:
        app: dq-api
    spec:
      containers:
      - name: dq-api
        image: data-quality-api:1.0.1
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2G"
            cpu: "2000m"
```

### Load Balancing

With Nginx as reverse proxy:
```nginx
upstream api {
    server dq-platform-api-1:8000;
    server dq-platform-api-2:8000;
    server dq-platform-api-3:8000;
}

server {
    listen 8000;
    location / {
        proxy_pass http://api;
        proxy_set_header Host $host;
    }
}
```

---

## Maintenance

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker compose build --no-cache

# Restart services (will lose unsaved data in temp directories)
docker compose down
docker compose up -d
```

### Cleanup

```bash
# Remove unused containers and images
docker system prune

# Remove all data (warning: destructive!)
docker compose down -v
```

### Version Management

Current version: **1.0.1**

Tag releases:
```bash
git tag -a v1.0.1 -m "Release version 1.0.1"
git push origin v1.0.1
```

---

## Support

- **API Docs:** http://localhost:8000/docs
- **GitHub Issues:** https://github.com/rachit0412/fabric_duckdb_soda_dataquality_checks/issues
- **Documentation:** See [MODERN_UI_GUIDE.md](MODERN_UI_GUIDE.md), [API_REFERENCE.md](API_REFERENCE.md)

---

**Last Updated:** 2026-04-01  
**Maintained by:** Data Quality Team
