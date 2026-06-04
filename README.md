# 🎯 Enterprise Data Quality Platform

> **Production-ready data quality monitoring with AI anomaly detection, professional web UI, and enterprise security**

**Version:** 1.0.1 | **Generated:** 2026-04-01 | [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🚀 Quick Start (60 seconds)

```powershell
# 1. Start Docker Desktop (if not running)

# 2. Deploy (one command)
.\quick-start.ps1

# 3. Open dashboard
# Local: http://localhost:3010
# Codespaces: http://127.0.0.1:3002
```

**Ready!** You now have:**
- ✅ Web dashboard (modern UI, responsive)
- ✅ FastAPI REST API on port 8001
- ✅ PostgreSQL for history + DuckDB for processing
- ✅ Production security (non-root, read-only FS, hardened)

---

## 📌 v1.0.1 Features (Production Ready)

### ✨ Data Quality Scanning
- **Soda Core 3.4.3** integration with DuckDB 1.0.0 backend
- **5 Quality Checks**: Volume, Completeness, Uniqueness, Validity, Freshness
- **Selective Execution**: Choose which checks to run per scan
- **Column-Level Mapping**: See which rules apply to each data column
- **Anomaly Detection**: Z-score and IQR-based outlier detection

### 🎨 Web Dashboard
- **Modern Design**: Glass-morphism UI, fully responsive
- **Drag & Drop**: Upload CSV files directly
- **Rule Selection**: Checkbox-based rule selection (X/5 rules)
- **Live Results**: Color-coded pass/fail/warning indicators
- **Scan History**: Full audit trail of all scans with metadata

### 🛠️ REST API
- **FastAPI** on port 8001 with interactive Swagger docs
- **Endpoints**: `/api/scan`, `/api/history/{table_name}`, `/api/trends/{table_name}`
- **HTML Reports**: Generated with interactive Plotly charts
- **Programmatic Access**: Full Python SDK + REST

### 🔐 Security
- Non-root execution (UID 1000), read-only filesystem, dropped Linux capabilities
- Network isolation, resource limits, no host compromise
- See [SECURITY.md](SECURITY.md) for details

---

## 📊 Quick Decision: Which Feature Do I Need?

| Use Case | Tool | Details |
|----------|------|---------|
| I want the web dashboard | Open `http://localhost:3010` | Modern UI, point-and-click |
| I want REST API | Call `http://localhost:8001/docs` | Swagger UI, live try-it-out |
| I want to run scans programmatically | Use Python SDK | `from src.core.scanner import EnhancedDataQualityScanner` |
| I want historical data + trends | Query PostgreSQL | Scans auto-saved to DB |
| I want production deployment | Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Docker, orchestration, monitoring |

---

## 📊 Architecture

```
┌────────────────────────────────────────────────┐
│         FastAPI Server (Port 8001)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Scanner  │→ │ Profiler │→ │ Anomaly  │    │
│  │ (Soda)   │  │          │  │ Detector │    │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘    │
│        │             │             │          │
│        └─────────────┼─────────────┘          │
│                      ↓                        │
│          ┌──────────────────┐                 │
│          │    DuckDB        │ (Primary)       │
│          │  (In-Memory)     │                 │
│          └────────┬─────────┘                 │
│                   ↓                           │
│          ┌──────────────────┐                 │
│          │   PostgreSQL     │ (History)       │
│          └──────────────────┘                 │
└────────────────────────────────────────────────┘

React Dashboard (Port 3010) ↔ FastAPI Server
```

**Key Points:**
- **DuckDB** = Primary processing engine (fast, in-memory, CSV-friendly)
- **PostgreSQL** = Secondary storage (scan history only, NOT user data)
- **FastAPI** = REST API + WebSocket support
- **React** = Modern responsive UI

For detailed architecture, see [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 🛠️ Usage

### Web Dashboard (Easiest)
1. Navigate to `http://localhost:3010`
2. Upload CSV or select data path
3. Choose checks to run
4. Review results with interactive charts

### REST API
```bash
curl -X POST "http://localhost:8001/api/scan" \
  -H "Content-Type: application/json" \
  -d '{
    "csv_path": "data/customers.csv",
    "table_name": "customers"
  }'
```

See [API_REFERENCE.md](API_REFERENCE.md) for all endpoints.

### Python SDK
```python
from src.core.scanner import EnhancedDataQualityScanner

scanner = EnhancedDataQualityScanner()
result = scanner.execute_comprehensive_scan(
    csv_path="data/customers.csv",
    table_name="customers"
)
print(f"✅ {result.checks_passed} checks passed")
print(f"❌ {result.checks_failed} checks failed")
```

---

## � Docker Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f data-quality-api

# Stop services
docker compose down

# Run security tests
.\test-security.ps1
```

---

## 📖 Enterprise Documentation (Single Source of Truth)

### Root Documentation (7 Canonical Files)
| Document | Purpose |
|----------|---------|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System design, components, data flow |
| **[SECURITY.md](SECURITY.md)** | Security hardening, validation, compliance |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Development guide, code standards, testing |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | Common issues and solutions |
| **[CHANGELOG.md](CHANGELOG.md)** | Version history and release notes |
| **[COMPLETION_REPORT_ALL_PHASES.md](COMPLETION_REPORT_ALL_PHASES.md)** | Full M1-M6 implementation summary |

### Technical Reference Guides (/docs - 12 Essential Guides)
| Document | Purpose |
|----------|---------|
| **[docs/INDEX.md](docs/INDEX.md)** | 📍 START HERE - Documentation hub |
| **[docs/API.md](docs/API.md)** | REST API specification (22 endpoints) |
| **[docs/DATABASE.md](docs/DATABASE.md)** | Schema reference, queries, tuning |
| **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** | Advanced deployment options |
| **[docs/RUNBOOK.md](docs/RUNBOOK.md)** | Operations and incident response |
| **[docs/TESTING.md](docs/TESTING.md)** | Test execution (82% coverage) |
| **[docs/CI_CD.md](docs/CI_CD.md)** | GitHub Actions pipeline architecture |
| **[docs/CONNECTIONS.md](docs/CONNECTIONS.md)** | Data source registration guide |
| **[docs/CHECKS.md](docs/CHECKS.md)** | 12-rule catalog with configuration |
| **[docs/EXECUTION.md](docs/EXECUTION.md)** | Check execution flow and results |
| **[docs/DECISION_LOG.md](docs/DECISION_LOG.md)** | Architecture decisions (ADR-001+) |
| **[docs/RAID_LOG.md](docs/RAID_LOG.md)** | Risks, assumptions, issues, dependencies |

### Archive
- **[archive/deprecated/](archive/deprecated/)** - Historical documentation (64 files) for reference only
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and component overview |

### Quick Shortcuts
- 🚀 **Interactive API Docs** (live try-it-out): http://localhost:8001/docs
- 📊 **Dashboard**: http://localhost:3010
- 💻 **Source Code**: See [backend/](backend/) and [frontend/](frontend/)
- 📚 **All Docs**: See [docs/](docs/) directory

---

## ⚙️ Configuration

Copy `.env.example` to `.env`:

```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=data_quality
POSTGRES_USER=dq_user
POSTGRES_PASSWORD=change-me-with-a-32-char-random-password
PGADMIN_PASSWORD=change-me-before-enabling-pgadmin

# API
API_PORT=8001
API_HOST=0.0.0.0

# Frontend
FRONTEND_PORT=3010

# Features
ENABLE_ANOMALY_DETECTION=true
ENABLE_DATA_PROFILING=true
```

For Docker, use `.env.docker` (auto-configured).

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for all configuration options.

---

## 🧪 Testing & Validation

```powershell
# Pre-deployment validation
.\validate-docker.ps1

# Security compliance testing
.\test-security.ps1

# Unit tests (development)
pytest tests/
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code guidelines, and pull request process.

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

## 🆘 Issues or Questions?

- 📖 Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 🐛 Open a [GitHub Issue](https://github.com/rachit0412/fabric_duckdb_soda_dataquality_checks/issues)
- 💬 See [SECURITY.md](SECURITY.md) for security questions

---

**Ready to go? Run `.\quick-start.ps1` now!**

