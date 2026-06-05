# 🎯 Enterprise Data Quality Platform

> **Workflow-driven data quality operations for source onboarding, metadata profiling, plan creation, execution, and analysis**

**Version:** 1.0.1 | **Generated:** 2026-04-01 | [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🚀 Quick Start (60 seconds)

```powershell
# 1. Start Docker Desktop (if not running)

# 2. Deploy (one command)
.\quick-start.ps1

# 3. Open application
# Local: http://localhost:3010
# Codespaces: http://127.0.0.1:3002
```

**Ready!** You now have:**
- ✅ Web application for source setup, metadata profiling, plan creation, execution, and analysis
- ✅ FastAPI REST API on port 8001
- ✅ PostgreSQL for history + DuckDB for execution and file processing
- ✅ Production security (non-root, read-only FS, hardened)

---

## 📌 v1.0.1 Features (Production Ready)

### ✨ Workflow-Driven Data Quality
- **Source Registration**: Upload CSV or Parquet files, or create database connections for reuse
- **Metadata Profiling**: Parse schema, null ratios, value ranges, and candidate columns before plan creation
- **Baseline Checks**: Start from core quality rules such as volume, completeness, uniqueness, validity, and freshness
- **AI Suggestions**: Generate additional checks from profiled metadata
- **Prebuilt Rule Patterns**: Add Soda and Great Expectations rule patterns to the final plan
- **Plan Execution**: Run assembled plans and persist outcomes for results and trend analysis

### 🎨 Web Application
- **Guided Workflow**: Move from connections to metadata, AI suggestions, plans, runs, results, and graphs
- **Responsive UI**: Modern React dashboard with workflow pages and reusable source records
- **Plan-Centric Execution**: Build plans from baseline, AI-generated, and prebuilt rule patterns
- **Detailed Results**: Inspect pass or fail counts, rule outcomes, and historical execution records
- **Trend Views**: Review graphs, per-column quality signals, and plan pass-rate trends

### 🛠️ REST API
- **FastAPI** on port 8001 with interactive Swagger docs
- **Workflow Endpoints**: `/api/v1/connections`, `/api/v1/metadata`, `/api/v1/suggestions`, `/api/v1/check-plans`, `/api/v1/runs`, `/api/v1/results`, `/api/v1/visualization`
- **Programmatic Access**: REST endpoints for the same source-to-analysis workflow exposed in the UI
- **Historical Analytics**: Retrieve run results, metrics, and trend data for downstream reporting

### 🔐 Security
- Non-root execution (UID 1000), read-only filesystem, dropped Linux capabilities
- Network isolation, resource limits, no host compromise
- See [SECURITY.md](SECURITY.md) for details

---

## 📊 Quick Decision: Which Feature Do I Need?

| Use Case | Tool | Details |
|----------|------|---------|
| I want the workflow UI | Open `http://localhost:3010` | Source setup, metadata, plans, runs, results, and graphs |
| I want REST API | Call `http://localhost:8001/docs` | Swagger UI, live try-it-out |
| I want to automate plan execution | Use API route groups | Connections, metadata, suggestions, plans, runs, results, visualization |
| I want historical data + trends | Query PostgreSQL | Runs, results, and trend data are persisted for analysis |
| I want production deployment | Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Docker, orchestration, monitoring |

---

## 📊 Architecture

```
┌────────────────────────────────────────────────┐
│          FastAPI Workflow API (8001)          │
│  ┌────────────┐  ┌────────────┐               │
│  │Connections │→ │ Metadata   │               │
│  └─────┬──────┘  └─────┬──────┘               │
│        │               │                      │
│        ↓               ↓                      │
│  ┌────────────┐  ┌────────────┐               │
│  │Suggestions │→ │ Check Plans│→ Runs         │
│  └────────────┘  └─────┬──────┘    │          │
│                         │           ↓          │
│                    ┌────────────┐  ┌────────┐ │
│                    │ DuckDB     │→ │Results │ │
│                    │ Execution  │  └────┬───┘ │
│                    └─────┬──────┘       ↓     │
│                          ↓            Graphs  │
│                    ┌────────────┐  & Analysis │
│                    │PostgreSQL  │             │
│                    │History     │             │
│                    └────────────┘             │
└────────────────────────────────────────────────┘

React Application (Port 3010) ↔ FastAPI Workflow API
```

**Key Points:**
- **DuckDB** = Primary execution engine for file-based and connected-source checks
- **PostgreSQL** = Stores connections, metadata snapshots, plans, runs, and historical outcomes
- **FastAPI** = Exposes the workflow API for connections, metadata, suggestions, plans, execution, results, and visualization
- **React** = Guides the end-to-end workflow from source setup to graphs and analysis

For detailed architecture, see [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 🛠️ Usage

### Web Dashboard (Easiest)
1. Navigate to `http://localhost:3010`
2. Upload a CSV or Parquet file, or create a database connection
3. Profile metadata to inspect schema, null patterns, and candidate columns
4. Generate AI suggestions and combine them with baseline and prebuilt Soda or Great Expectations rule patterns
5. Build and execute a check plan
6. Review results, graphs, and analysis outcomes

### REST API
Use the workflow route groups exposed under `/api/v1/`:

- `connections` for file upload and connection management
- `metadata` for profiling registered sources
- `suggestions` for AI-generated rule recommendations
- `check-plans` for storing executable plans
- `runs` and `results` for execution status and rule outcomes
- `visualization` for metrics and pass-rate trends

See [docs/API.md](docs/API.md) for all endpoints.

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

Use the Python API when you need lower-level execution outside the workflow UI.

---

## Docker Commands

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

