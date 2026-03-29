# 🐳 Containerized Data Quality Platform - Quick Reference

## One-Command Start

```powershell
.\quick-start.ps1
```

That's it! Everything runs automatically.

---

## What Gets Containerized

| Component | Container | Port | Description |
|-----------|-----------|------|-------------|
| **PostgreSQL** | `dq-postgres` | 5432 | Database with persistent storage |
| **API Server** | `dq-platform-api` | 8000 | FastAPI with all data quality features |
| **pgAdmin** (optional) | `dq-pgadmin` | 5050 | Database management UI |

---

## Quick Commands

```powershell
# Start everything
.\quick-start.ps1
# or
.\manage.ps1 start

# Stop everything
.\manage.ps1 stop

# Check status
.\manage.ps1 status

# View logs
.\manage.ps1 logs -Follow

# Run health check
.\manage.ps1 test

# Open shell in container
.\manage.ps1 shell

# Connect to database
.\manage.ps1 db

# Development mode with hot-reload
.\manage.ps1 start -Mode dev -Admin
```

---

## Access URLs

- **API**: http://localhost:8000
- **API Documentation** (Swagger): http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health
- **pgAdmin** (with `-Admin`): http://localhost:5050

---

## File Organization

```
📦 Project Root
├── 🐳 Docker Files
│   ├── docker-compose.yml          # Production setup
│   ├── docker-compose.dev.yml      # Development with hot-reload
│   ├── docker-compose.postgres.yml # DB only
│   ├── Dockerfile                  # Application image
│   ├── .dockerignore              # Build exclusions
│   └── .env.docker                # Environment template
│
├── 🛠️ Management Scripts
│   ├── quick-start.ps1            # One-command setup
│   ├── manage.ps1                 # Full management script
│   └── start-postgres.ps1         # DB-only start
│
├── 📚 Documentation
│   ├── CONTAINERIZATION.md        # Complete Docker guide
│   ├── DOCKER_SETUP.md           # Docker basics
│   ├── README-CONTAINER.md       # This file
│   └── STORAGE_OPTIONS.md        # Backend comparison
│
├── 🔧 Configuration
│   ├── .env                      # Runtime environment
│   ├── soda_duckdb/              # Data quality checks
│   └── init-scripts/             # DB initialization
│
├── 📊 Runtime Directories
│   ├── data/                     # Input data files (mounted)
│   ├── logs/                     # Application logs (mounted)
│   └── reports/                  # HTML reports (mounted)
│
└── 💻 Source Code
    └── src/                      # Application code
```

---

## Workflow Examples

### First Time Setup

```powershell
# 1. Start Docker Desktop (wait for whale icon)

# 2. Run quick start
.\quick-start.ps1

# 3. Verify it's working
.\manage.ps1 test

# 4. View API docs
start http://localhost:8000/docs
```

### Running a Data Quality Scan

```powershell
# 1. Place your CSV in ./data/ directory
Copy-Item "C:\path\to\mydata.csv" -Destination ".\data\"

# 2. Open shell in container
.\manage.ps1 shell

# 3. Run scan
python main.py scan --csv /app/data/mydata.csv --table mytable --report /app/reports/report.html

# 4. View report
start .\reports\report.html

# 5. Check database for history
.\manage.ps1 db
```

```sql
-- View scan results
SELECT * FROM data_quality_scans ORDER BY timestamp DESC LIMIT 10;
```

### Development Workflow

```powershell
# 1. Start in dev mode
.\manage.ps1 start -Mode dev -Admin

# 2. Edit code in src/
# Changes auto-reload - no restart needed!

# 3. View logs in real-time
.\manage.ps1 logs -Follow

# 4. Access pgAdmin for database inspection
start http://localhost:5050
```

### Using the API

```powershell
# Test health endpoint
Invoke-RestMethod http://localhost:8000/api/health

# Run scan via API
$body = @{
    csv_path = "/app/data/mydata.csv"
    table_name = "customers"
    checks_path = "/app/soda_duckdb/checks.yml"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8000/api/scan -Method Post -Body $body -ContentType "application/json"

# Get scan history
Invoke-RestMethod "http://localhost:8000/api/history/customers?days=30"

# Get trend analysis
Invoke-RestMethod "http://localhost:8000/api/trends/customers"
```

---

## Modes Comparison

| Feature | Production | Development |
|---------|-----------|-------------|
| **Compose File** | `docker-compose.yml` | `docker-compose.dev.yml` |
| **Hot Reload** | ❌ | ✅ |
| **Source Mounted** | ❌ | ✅ |
| **Log Level** | INFO | DEBUG |
| **pgAdmin** | Optional | Included |
| **Image Size** | Optimized | Larger |
| **Start Command** | `.\manage.ps1 start` | `.\manage.ps1 start -Mode dev` |

---

## Troubleshooting

### Docker Not Running
```powershell
# Start Docker Desktop from Start menu
# Wait for whale icon in system tray
# Run: .\quick-start.ps1
```

### Container Won't Start
```powershell
# Check logs
.\manage.ps1 logs

# Check Docker status
docker ps -a

# Restart everything
.\manage.ps1 restart
```

### Port Conflicts
```powershell
# Check what's using port 8000
netstat -ano | findstr :8000

# Use different port
$env:API_PORT="8001"
.\manage.ps1 start
```

### Database Connection Failed
```powershell
# Test database
docker exec dq-postgres pg_isready -U postgres

# Restart database
docker restart dq-postgres

# Or full restart
.\manage.ps1 restart
```

### API Returns Errors
```powershell
# View API logs
docker logs dq-platform-api

# Or use management script
.\manage.ps1 logs -Follow

# Check health
.\manage.ps1 test
```

---

## Data Persistence

All data persists across container restarts:

- **Database**: Docker volume `postgres_data`
- **Logs**: Host directory `./logs`
- **Reports**: Host directory `./reports`
- **Input Data**: Host directory `./data`

### Backup

```powershell
# Backup database
docker exec dq-postgres pg_dump -U postgres data_quality > backup.sql

# Backup volume
docker run --rm -v postgres_data:/data -v ${PWD}:/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

### Restore

```powershell
# Restore database
Get-Content backup.sql | docker exec -i dq-postgres psql -U postgres data_quality
```

---

## CI/CD Integration

### Build Image

```bash
# Build for production
docker build -t data-quality-platform:v1.0 .

# Build for Azure Container Registry
docker build -t myregistry.azurecr.io/data-quality-platform:v1.0 .
docker push myregistry.azurecr.io/data-quality-platform:v1.0
```

### Deploy to Azure

```bash
# Azure Container Apps
az containerapp up \
  --name data-quality \
  --resource-group my-rg \
  --image myregistry.azurecr.io/data-quality-platform:v1.0 \
  --ingress external \
  --target-port 8000

# Azure App Service
az webapp create \
  --resource-group my-rg \
  --plan my-plan \
  --name data-quality-app \
  --deployment-container-image-name myregistry.azurecr.io/data-quality-platform:v1.0
```

---

## Environment Configuration

### Production

```env
# .env.docker
ENVIRONMENT=production
POSTGRES_PASSWORD=SecurePassword123!
API_PORT=8000
LOG_LEVEL=INFO
ALERTING_ENABLED=true
EMAIL_ENABLED=true
```

### Development

```env
# .env.dev
ENVIRONMENT=development
POSTGRES_PASSWORD=test123
API_PORT=8000
LOG_LEVEL=DEBUG
ALERTING_ENABLED=false
```

---

## Performance Tuning

### Docker Desktop Settings

**Recommended Settings:**
- Memory: 4 GB minimum, 8 GB optimal
- CPUs: 2 minimum, 4 optimal
- Disk: 10 GB minimum

### PostgreSQL Tuning

Edit `docker-compose.yml`:

```yaml
postgres:
  command:
    - postgres
    - -c
    - max_connections=100
    - -c
    - shared_buffers=256MB
    - -c
    - effective_cache_size=1GB
```

### Container Resource Limits

```yaml
data-quality-api:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

---

## Security Best Practices

✅ **Do:**
- Change default passwords in production
- Use `.env` files for secrets
- Keep Docker Desktop updated
- Use specific image versions (not `latest`)
- Regular security scans: `docker scan data-quality-platform`
- Limit container privileges
- Use read-only mounts where possible

❌ **Don't:**
- Commit `.env` files to git
- Use default credentials in production
- Run containers as root
- Expose unnecessary ports
- Store production secrets in compose files

---

## Next Steps

1. ✅ **Start the platform**: `.\quick-start.ps1`
2. ✅ **Explore API docs**: http://localhost:8000/docs
3. ✅ **Run a test scan**: Place CSV in `./data/` and scan it
4. ✅ **Check database**: `.\manage.ps1 db`
5. ✅ **View reports**: Open `./reports/*.html`
6. ✅ **Set up monitoring**: Configure alerts and notifications
7. ✅ **Deploy to cloud**: Use Azure Container Apps or Kubernetes

---

## Support & Documentation

- **Full Guide**: [CONTAINERIZATION.md](CONTAINERIZATION.md)
- **Docker Basics**: [DOCKER_SETUP.md](DOCKER_SETUP.md)
- **Features**: [README.md](README.md)
- **Storage Options**: [STORAGE_OPTIONS.md](STORAGE_OPTIONS.md)
- **Testing**: [TESTING.md](TESTING.md)

---

**Everything is containerized and ready to go! 🐳🚀**

Run `.\quick-start.ps1` to begin!
