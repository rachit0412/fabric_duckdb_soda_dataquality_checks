# Quick Reference Card

## 🚀 Start Platform
``powershell
.\quick-start.ps1
``

## 🌐 Access Points
- **Dashboard:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Health:** http://localhost:8000/api/health

## 📊 Run Scan (API)
``python
POST http://localhost:8000/api/scan
{
  "table_name": "customers",
  "csv_path": "data/customers.csv"
}
``

## 🔧 Configuration
Edit `.env` file:
``bash
# Database
POSTGRES_HOST=localhost
POSTGRES_DB=data_quality

# Alerts
ENABLE_EMAIL_ALERTS=true
SMTP_SERVER=smtp.gmail.com

# API
API_PORT=8000
``

## 📁 Directory Structure
``
src/
├── api/           # FastAPI server
├── core/          # Scanner, profiler, anomaly detection
├── storage/       # PostgreSQL, Cosmos DB
├── notifications/ # Alerting service
└── reporting/     # HTML report generator

data/              # CSV input files (read-only in container)
reports/           # HTML reports (writable)
logs/              # Application logs (writable)
``

## 🐳 Docker Commands
``bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Restart
docker compose restart

# Security test
.\test-security.ps1
``

## 🔐 Security Features
- ✅ Non-root execution (UID 1000)
- ✅ Read-only filesystem
- ✅ Dropped capabilities
- ✅ Resource limits (2CPU, 2GB RAM)
- ✅ Network isolation

## 📖 Documentation
- [Architecture](ARCHITECTURE.md)
- [Security Guide](SECURITY.md)
- [API Reference](docs/API_REFERENCE.md)
- [Contributing](CONTRIBUTING.md)

---
*Generated: 2026-04-01* | *Version: 1.0.1*
