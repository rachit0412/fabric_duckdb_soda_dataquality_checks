# Docker Setup Guide

## 🐳 Quick Start - Just PostgreSQL

If you only want to run PostgreSQL in Docker (recommended for testing):

### Step 1: Start Docker Desktop

**Find Docker Desktop:**
- Press `Windows Key` and search for "Docker Desktop"
- Click to start it
- Wait for "Docker Desktop is running" (1-2 minutes)
- Look for the whale icon 🐳 in your system tray

**Or start from Command Prompt:**
```powershell
# Search for Docker Desktop in Start Menu
start "" "Docker Desktop"
```

### Step 2: Start PostgreSQL Only

```powershell
# Start just PostgreSQL (fastest option)
docker compose -f docker-compose.postgres.yml up -d

# Wait ~30 seconds for PostgreSQL to initialize

# Check it's running
docker ps
```

Expected output:
```
CONTAINER ID   IMAGE              STATUS         PORTS
abc123         postgres:16-alpine Up 30 seconds  0.0.0.0:5432->5432/tcp
```

### Step 3: Update Your .env

```env
STORAGE_BACKEND=postgresql
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=data_quality
POSTGRES_USER=postgres
POSTGRES_PASSWORD=test123
```

### Step 4: Test Connection

```powershell
# Install dependencies (if not done)
pip install -r requirements.txt

# Test the platform
python test_quick.py
```

---

## 🚀 Full Stack (PostgreSQL + API)

To run both the database and API in Docker:

```powershell
# Build and start everything
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Access API
# Open browser: http://localhost:8000/docs
```

---

## 📋 Useful Docker Commands

### PostgreSQL-Only Commands

```powershell
# Start PostgreSQL
docker compose -f docker-compose.postgres.yml up -d

# Stop PostgreSQL
docker compose -f docker-compose.postgres.yml down

# Stop and remove data (fresh start)
docker compose -f docker-compose.postgres.yml down -v

# View logs
docker compose -f docker-compose.postgres.yml logs -f

# Connect to PostgreSQL with psql
docker exec -it dq-postgres psql -U postgres -d data_quality
```

### Full Stack Commands

```powershell
# Start everything
docker compose up -d

# Stop everything
docker compose down

# Rebuild after code changes
docker compose up -d --build

# View logs
docker compose logs -f data-quality-api
docker compose logs -f postgres

# Restart one service
docker compose restart data-quality-api
```

---

## 🔍 Troubleshooting

### "Docker daemon is not running"

**Solution:**
1. Open Start Menu
2. Search "Docker Desktop"
3. Start Docker Desktop
4. Wait for whale icon 🐳 in system tray
5. Try command again

### "Port 5432 already in use"

**Solution:**
```powershell
# Check what's using port 5432
netstat -ano | findstr :5432

# Either stop the other service or change the port
# Edit docker-compose.postgres.yml:
# ports:
#   - "5433:5432"  # Use different external port
```

### "Cannot connect to database"

**Solution:**
```powershell
# Check if PostgreSQL is running
docker ps | findstr postgres

# Check logs for errors
docker logs dq-postgres

# Test connection
docker exec dq-postgres pg_isready -U postgres
```

### "Permission denied" errors

**Solution:**
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell → "Run as Administrator"
```

---

## 🗑️ Clean Up

```powershell
# Stop and remove containers
docker compose down

# Remove containers and volumes (delete all data)
docker compose down -v

# Remove Docker images to free space
docker rmi postgres:16-alpine
docker rmi dq-platform-api
```

---

## 💾 Database Backup & Restore

### Backup PostgreSQL Data

```powershell
# Backup to SQL file
docker exec dq-postgres pg_dump -U postgres data_quality > backup.sql

# Or backup as custom format
docker exec dq-postgres pg_dump -U postgres -Fc data_quality > backup.dump
```

### Restore from Backup

```powershell
# From SQL file
docker exec -i dq-postgres psql -U postgres data_quality < backup.sql

# From custom format
docker exec -i dq-postgres pg_restore -U postgres -d data_quality backup.dump
```

---

## 🎯 What Runs Where

### PostgreSQL Only Mode:
- **PostgreSQL**: Running in Docker (port 5432)
- **Your App**: Running on your machine (uses Python locally)
- **Data Storage**: Docker volume `postgres_data`

### Full Stack Mode:
- **PostgreSQL**: Running in Docker (port 5432)
- **API**: Running in Docker (port 8000)
- **Your Scripts**: Can run locally and connect to Docker PostgreSQL

---

## 🌟 Recommendations

**For Development:**
- Use PostgreSQL-only Docker setup
- Run your Python code locally
- Easier to debug and iterate

**For Production/Demo:**
- Use full stack with docker-compose
- Everything containerized
- One command to start: `docker compose up -d`

**For CI/CD:**
- Build Docker images
- Push to container registry (ACR, Docker Hub)
- Deploy to Azure Container Apps / Kubernetes

---

## 📚 Next Steps

1. ✅ Start Docker Desktop
2. ✅ Run PostgreSQL: `docker compose -f docker-compose.postgres.yml up -d`
3. ✅ Update `.env` with PostgreSQL settings
4. ✅ Test: `python test_quick.py`
5. ✅ Run scans with database tracking!

See [STORAGE_OPTIONS.md](STORAGE_OPTIONS.md) for more details on storage backends.
