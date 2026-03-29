# 🐳 Complete Containerization Guide

This guide covers running the entire Data Quality Platform in Docker containers.

## 📦 What's Containerized

✅ **PostgreSQL Database** - Data storage with persistent volumes  
✅ **Data Quality API** - FastAPI application with all features  
✅ **pgAdmin** (Optional) - Web-based database management  
✅ **Networking** - Isolated Docker network for security  
✅ **Volumes** - Persistent storage for data, logs, and reports

---

## 🚀 Quick Start (1 Command)

### Prerequisites
- Docker Desktop installed and running
- 4GB RAM available
- 10GB disk space

### Start Everything

```powershell
# Start the platform
.\manage.ps1 start

# Or manually
docker compose up -d
```

**That's it!** The entire platform is now running.

### Access Points

- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

---

## 🎯 Management Script Usage

The `manage.ps1` script makes Docker operations simple:

### Basic Commands

```powershell
# Start the platform
.\manage.ps1 start

# Stop the platform
.\manage.ps1 stop

# Restart (useful after config changes)
.\manage.ps1 restart

# Check status
.\manage.ps1 status

# View logs
.\manage.ps1 logs
.\manage.ps1 logs -Follow  # Real-time

# Run health checks
.\manage.ps1 test
```

### Development Mode

```powershell
# Start with hot-reload (code changes auto-reload)
.\manage.ps1 start -Mode dev

# Start with pgAdmin for database management
.\manage.ps1 start -Mode dev -Admin

# Access pgAdmin: http://localhost:5050
#   Email: admin@company.com
#   Password: admin123
```

### Advanced Operations

```powershell
# Open shell in API container
.\manage.ps1 shell

# Connect to PostgreSQL
.\manage.ps1 db

# Rebuild images after code changes
.\manage.ps1 build

# Clean everything (removes all data!)
.\manage.ps1 clean
```

---

## 📁 File Structure

```
.
├── docker-compose.yml          # Production configuration
├── docker-compose.dev.yml      # Development with hot-reload
├── docker-compose.postgres.yml # PostgreSQL only
├── Dockerfile                  # Application image definition
├── .dockerignore              # Files to exclude from image
├── .env.docker                # Environment template
├── manage.ps1                 # Management script
├── init-scripts/              # Database initialization
│   └── 01-init-db.sh         # Setup extensions
└── src/                       # Application code
```

---

## 🔧 Configuration

### Environment Variables

Create `.env.docker` from the template:

```env
ENVIRONMENT=production
POSTGRES_PASSWORD=YourSecurePassword123!
API_PORT=8000
LOG_LEVEL=INFO
```

### Custom Ports

Edit `docker-compose.yml` or set environment variables:

```yaml
ports:
  - "${API_PORT:-8000}:8000"      # API
  - "${POSTGRES_PORT:-5432}:5432" # Database
  - "${PGADMIN_PORT:-5050}:80"    # pgAdmin
```

---

## 🎭 Production vs Development

### Production Mode (`docker-compose.yml`)

**Use for:** Production deployment, demos, final testing

**Features:**
- Optimized image size
- No source code mounting
- Production logging
- Health checks enabled
- Auto-restart on failure

```powershell
.\manage.ps1 start
# or
docker compose up -d
```

### Development Mode (`docker-compose.dev.yml`)

**Use for:** Active development, debugging, testing changes

**Features:**
- Source code mounted (hot-reload)
- Debug logging
- pgAdmin included
- Development dependencies
- Better error messages

```powershell
.\manage.ps1 start -Mode dev -Admin
# or
docker compose -f docker-compose.dev.yml up -d
```

---

## 🗄️ Database Management

### Using psql (Command Line)

```powershell
# Connect to PostgreSQL
.\manage.ps1 db

# Or manually
docker exec -it dq-postgres psql -U postgres -d data_quality
```

```sql
-- View scan history
SELECT scan_id, timestamp, table_name, status, pass_rate
FROM data_quality_scans
ORDER BY timestamp DESC
LIMIT 10;

-- Get average pass rates
SELECT 
    table_name,
    COUNT(*) as scan_count,
    AVG(pass_rate) as avg_pass_rate
FROM data_quality_scans
GROUP BY table_name;
```

### Using pgAdmin (Web UI)

```powershell
# Start with pgAdmin
.\manage.ps1 start -Admin

# Access: http://localhost:5050
# Email: admin@company.com
# Password: admin123
```

**First time setup:**
1. Right-click "Servers" → "Register" → "Server"
2. Name: `Data Quality DB`
3. Connection tab:
   - Host: `postgres` (container name)
   - Port: `5432`
   - Database: `data_quality`
   - Username: `postgres`
   - Password: `test123`

---

## 📊 Monitoring & Logs

### View Logs

```powershell
# All logs
.\manage.ps1 logs

# Follow in real-time
.\manage.ps1 logs -Follow

# Specific service
docker compose logs data-quality-api
docker compose logs postgres

# Last 50 lines
docker compose logs --tail=50
```

### Resource Usage

```powershell
# Container stats
.\manage.ps1 status

# Or detailed view
docker stats
```

### Health Checks

```powershell
# Automated health check
.\manage.ps1 test

# Manual API check
Invoke-RestMethod http://localhost:8000/api/health

# Database check
docker exec dq-postgres pg_isready -U postgres
```

---

## 🔄 Common Workflows

### Making Code Changes

**Development Mode (Recommended):**
```powershell
# Start with hot-reload
.\manage.ps1 start -Mode dev

# Edit files in src/
# Changes automatically reload - no restart needed!
```

**Production Mode:**
```powershell
# Make code changes
# Rebuild image
.\manage.ps1 build

# Restart with new image
.\manage.ps1 restart
```

### Updating Dependencies

```powershell
# Edit requirements.txt
# Rebuild image
.\manage.ps1 build

# Restart
.\manage.ps1 restart
```

### Backing Up Data

```powershell
# Backup database
docker exec dq-postgres pg_dump -U postgres data_quality > backup.sql

# Backup volumes
docker run --rm -v dq_postgres_data:/data -v ${PWD}:/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

### Restoring Data

```powershell
# Restore database
Get-Content backup.sql | docker exec -i dq-postgres psql -U postgres data_quality

# Restore volume
docker run --rm -v dq_postgres_data:/data -v ${PWD}:/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

---

## 🐛 Troubleshooting

### Container Won't Start

```powershell
# Check logs for errors
.\manage.ps1 logs

# Check container status
docker ps -a

# Inspect failed container
docker logs dq-platform-api
```

### Port Already in Use

```powershell
# Check what's using the port
netstat -ano | findstr :8000

# Kill the process or change port
$env:API_PORT="8001"
.\manage.ps1 start
```

### Database Connection Issues

```powershell
# Test database
docker exec dq-postgres pg_isready -U postgres

# Check network
docker network inspect dq-network

# Recreate containers
.\manage.ps1 stop
.\manage.ps1 start
```

### Out of Disk Space

```powershell
# Remove unused Docker resources
docker system prune -a --volumes

# Check disk usage
docker system df
```

### Container Crashes Repeatedly

```powershell
# View recent logs
docker logs dq-platform-api --tail=100

# Check resource limits
docker stats

# Increase Docker Desktop resources:
# Settings → Resources → Increase Memory/CPU
```

---

## 🚀 Deployment Options

### Local Development
```powershell
.\manage.ps1 start -Mode dev
```

### Production Server
```powershell
# Use production compose file
docker compose up -d

# Or with custom env file
docker compose --env-file .env.production up -d
```

### Azure Container Apps
```bash
# Build and push to ACR
az acr build --registry myregistry --image data-quality-platform:latest .

# Deploy to Container Apps
az containerapp up \
  --name data-quality \
  --resource-group my-rg \
  --image myregistry.azurecr.io/data-quality-platform:latest \
  --environment my-env \
  --ingress external \
  --target-port 8000
```

### Kubernetes
```bash
# Build and tag
docker build -t data-quality-platform:v1.0 .
docker tag data-quality-platform:v1.0 myregistry/data-quality-platform:v1.0
docker push myregistry/data-quality-platform:v1.0

# Deploy with Helm or kubectl
kubectl apply -f k8s/
```

---

## 💾 Data Persistence

### Volumes

All data is stored in Docker volumes:

- `postgres_data`: Database files (persistent)
- `./logs`: Application logs (host mount)
- `./reports`: HTML reports (host mount)
- `./data`: Input data files (host mount)

### Volume Management

```powershell
# List volumes
docker volume ls

# Inspect volume
docker volume inspect postgres_data

# Backup volume
docker run --rm -v postgres_data:/data -v ${PWD}:/backup alpine tar czf /backup/data.tar.gz /data

# Remove volumes (DANGER: deletes data!)
docker compose down -v
```

---

## 🔒 Security Considerations

### Production Checklist

- [ ] Change default PostgreSQL password
- [ ] Change pgAdmin credentials
- [ ] Use `.env` file for secrets (not in git)
- [ ] Enable SSL/TLS for API
- [ ] Use Docker secrets for sensitive data
- [ ] Limit container resource usage
- [ ] Enable Docker Content Trust
- [ ] Regular security updates
- [ ] Network isolation
- [ ] Log monitoring

### Example Production Setup

```yaml
# docker-compose.prod.yml
secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
  
services:
  postgres:
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password
```

---

## 📈 Scaling

### Horizontal Scaling

```yaml
# Scale API to multiple instances
docker compose up -d --scale data-quality-api=3
```

### With Load Balancer

Add nginx service to `docker-compose.yml`:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - data-quality-api
```

---

## ✅ Best Practices

1. **Use Management Script**: `.\manage.ps1` for consistency
2. **Development Mode**: Use `-Mode dev` for active development
3. **Check Logs**: Always check logs when troubleshooting
4. **Health Checks**: Run `.\manage.ps1 test` regularly
5. **Backup Data**: Regular backups of PostgreSQL data
6. **Resource Limits**: Set memory/CPU limits in production
7. **Version Images**: Tag images with versions, not just `latest`
8. **Environment Files**: Use `.env` files, never hardcode secrets
9. **Clean Builds**: Use `.\manage.ps1 build` after major changes
10. **Monitor Resources**: Check `docker stats` for performance

---

## 🎊 You're All Set!

Your entire Data Quality Platform is now containerized and ready to use!

**Quick Reference:**
```powershell
.\manage.ps1 start        # Start everything
.\manage.ps1 status       # Check status
.\manage.ps1 logs -Follow # View logs
.\manage.ps1 test         # Run health checks
.\manage.ps1 stop         # Stop everything
```

**Access Points:**
- API: http://localhost:8000/docs
- pgAdmin: http://localhost:5050 (with `-Admin` flag)

For more details:
- [README.md](README.md) - Feature overview
- [DOCKER_SETUP.md](DOCKER_SETUP.md) - Docker basics
- [STORAGE_OPTIONS.md](STORAGE_OPTIONS.md) - Storage backends

Happy containerizing! 🐳🚀
