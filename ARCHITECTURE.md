# 🏗️ Architecture Overview

**Version:** 1.0.0 | **Last Updated:** 2026-03-31 | **Status:** Production Ready

---

## 📐 System Design Principles

1. **Security First**: Non-root containers, read-only filesystems,capability dropping
2. **Simplicity**: Monolithic container with optional microservices scalability
3. **Data Separation**: DuckDB for processing, PostgreSQL for history
4. **API-Driven**: REST-first design with programmatic access
5. **Container-Native**: Docker-first with cloud-agnostic deployment

---

## 🔧 Technology Stack

### Core Technologies
| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Server** | FastAPI 0.115.0 | REST API + UI serving (port 8000) |
| **Query Engine** | DuckDB 1.1.0 | CSV processing, Soda checks (in-memory) |
| **Quality Framework** | Soda Core 3.4.3 | Declarative data quality rules |
| **Storage** | PostgreSQL 16 | Scan history & trends (NOT user data) |
| **Runtime** | Python 3.11 | Application runtime |
| **Containerization** | Docker + Compose | Deployment & orchestration |
| **UI** | HTML5/Tailwind/Alpine.js/Chart.js | Web dashboard (no build step) |

### Optional/Integration
- **Cosmos DB**: Alternative cloud storage backend
- **SMTP/Teams**: Alert notifications
- **Azure Fabric**: Data source integration

---

## 🏛️ Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│         Data Quality Platform (Port 8000)       │
├─────────────────────────────────────────────────┤
│  Web UI  │  REST API  │  Interactive Docs      │
├──────────┴────────────┴────────────────────────┤
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐│
│  │ Scanner  │→│ Profiler │→│ Anomaly      ││
│  │ (Soda)   │  │          │  │ Detector     ││
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘│
│       │             │               │        │
│       └─────────────┼───────────────┘        │
│                     ↓                        │
│            ┌────────────────┐                │
│            │    DuckDB      │                │
│            │  (In-Memory)   │                │
│            └────────┬───────┘                │
│                     ↓                        │
│            ┌────────────────┐                │
│            │  PostgreSQL    │                │
│            │  (History DB)  │                │
│            └────────────────┘                │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐│
│  │ Reporter │  │ Alerting │  │ Storage Repo ││
│  └──────────┘  └──────────┘  └──────────────┘│
└─────────────────────────────────────────────────┘
         │              │              │
         ↓              ↓              ↓
   HTML Reports    Email/Teams   Cosmos DB
                                 (Optional)
```

---

## 📊 Data Flow

### Scan Execution Flow

```
1. REQUEST
   ↓
   API receives scan request (via UI or REST)
   
2. LOAD
   ↓
   Scanner loads CSV → DuckDB in-memory table
   
3. VALIDATE
   ↓
   Soda Core executes checks against DuckDB
   
4. ANALYZE
   ↓
   Profiler: Statistical analysis (min, max, avg, dist)
   Anomaly Detector: Z-score, IQR, pattern analysis
   
5. STORE
   ↓
   PostgreSQL: Save scan results & metrics
   
6. NOTIFY
   ↓
   Alerting: Send notifications if failures detected
   
7. REPORT
   ↓
   HTML Generator: Create interactive report
   
8. RESPOND
   ↓
   API returns: scan_id, status, report_path
```

### Data Storage Model

**DuckDB (Ephemeral)**
- Purpose: Query execution, Soda checks
- Scope: Single scan session
- Lifespan: In-memory, discarded after scan
- Content: User's CSV data

**PostgreSQL (Persistent)**
- Purpose: Scan history, trends, audit trail
- Scope: All scans across all tables
- Lifespan: Configurable retention (default 90 days)
- Content: Scan metadata, check results, NO user data

**File System (Volumes)**
- `/app/data` (read-only): CSV input files
- `/app/reports` (writable): HTML reports
- `/app/logs` (writable): Application logs

---

## 🔐 Security Architecture

### Container Security (Defense-in-Depth)

| Layer | Protection | Impact |
|-------|------------|--------|
| **User Context** | Non-root (UID 1000) | Cannot escalate to root |
| **Filesystem** | Read-only root | Cannot modify code |
| **Capabilities** | Dropped (except NET_BIND_SERVICE) | Limited system calls |
| **Privileges** | no-new-privileges | No setuid exploits |
| **Resources** | CPU/Memory limits | Prevent DoS |
| **Network** | PostgreSQL internal-only | Isolated from host |
| **Temp Storage** | tmpfs with noexec | No execution from /tmp |

**Attack Scenario: Container Compromised**
- ❌ Cannot access host filesystem
- ❌ Cannot become root
- ❌ Cannot modify application
- ❌ Cannot persist backdoors
- ❌ Cannot exhaust resources
- ✅ Host system remains protected

**See:** [SECURITY.md](SECURITY.md) for detailed security guide

---

## 🐳 Deployment Architecture

### Container Configuration

**API Container (`data-quality-api`)**
- Base: `python:3.11-slim`
- User: `appuser:appuser` (UID 1000)
- Ports: `8000:8000`
- Volumes: `./data:/app/data:ro`, `./reports:/app/reports`, `./logs:/app/logs`
- Resources: 2 CPU cores, 2GB RAM
- Security: Read-only FS, dropped caps, no-new-privileges

**Database Container (`postgres`)**
- Base: `postgres:16-alpine`
- User: `postgres` (non-root)
- Network: Internal only (no host exposure)
- Volumes: `postgres_data:/var/lib/postgresql/data`
- Resources: 1 CPU core, 1GB RAM
- Security: Minimal capabilities, isolated network

**Network**
- Type: Custom bridge (`dq-network`)
- Subnet: `172.28.0.0/16`
- Isolation: Containers communicate internally
- Exposure: Only API port 8000 exposed to host

---

## 📁 Code Organization

```
src/
├── __init__.py              # Version: 1.0.0
├── api/
│   └── server.py            # FastAPI app (2.0.0)
├── core/
│   ├── scanner.py           # DuckDB + Soda integration
│   ├── profiler.py          # Statistical analysis
│   └── anomaly_detector.py  # AI anomaly detection
├── storage/
│   ├── postgres_repository.py  # Primary storage
│   └── cosmos_repository.py    # Optional cloud storage
├── notifications/
│   └── alerting.py          # Email/Teams alerts
├── reporting/
│   └── html_generator.py    # Report generation
├── config/
│   └── settings.py          # Environment config
└── utils/
    └── logging.py           # Structured logging
```

**Design Patterns:**
- Repository Pattern (storage abstraction)
- Factory Pattern (storage provider selection)
- Strategy Pattern (anomaly detection algorithms)
- Dependency Injection (configuration management)

---

## 🚀 Scalability Considerations

### Current Architecture (Single Container)
- **Throughput**: ~1000 scans/hour per instance
- **Concurrent Scans**: CPU-bound (2 cores)
- **Database**: PostgreSQL single instance
- **Suitable For**: Small to medium deployments

### Horizontal Scaling (Future)
- **API Layer**: Deploy multiple containers behind load balancer
- **Database**: PostgreSQL replica + read-replica
- **Queue**: Add Redis + Celery for async processing
- **Cache**: Add Redis for API response caching
- **Storage**: Migrate to Cosmos DB for global distribution

### Vertical Scaling (Immediate)
```yaml
# docker-compose.yml
services:
  data-quality-api:
    deploy:
      resources:
        limits:
          cpus: '4.0'    # Increase from 2.0
          memory: 4G     # Increase from 2G
```

---

## 🔄 Integration Patterns

### Supported Integration Methods

1. **REST API** (Primary)
   - Programmatic access via HTTP
   - JSON request/response
   - See: [docs/API_REFERENCE.md](docs/API_REFERENCE.md)

2. **Python SDK** (Direct)
   ```python
   from src.core.scanner import EnhancedDataQualityScanner
   scanner = EnhancedDataQualityScanner()
   result = scanner.execute_comprehensive_scan(...)
   ```

3. **File Upload** (Web UI)
   - Drag-and-drop CSV files
   - Browser-based scanning

4. **Scheduled Jobs** (CI/CD)
   - Azure DevOps pipeline
   - GitHub Actions
   - Cron jobs

---

## 📈 Monitoring & Observability

### Built-in Monitoring
- **Health Endpoint**: `GET /api/health`
- **Logs**: JSON structured logging to `/app/logs`
- **Metrics**: Scan counts, pass rates, execution time

### External Monitoring (Recommended)
- **Application Insights**: FastAPI telemetry
- **Prometheus**: Container metrics
- **Grafana**: Dashboard visualization
- **Azure Monitor**: Cloud-native monitoring

### Log Aggregation
```bash
# View logs
docker compose logs -f data-quality-api

# Export logs
docker compose logs data-quality-api > app.log
```

---

## 🔧 Configuration Management

### Environment Variables

**Database Settings**
```env
POSTGRES_HOST=postgres      # Container name
POSTGRES_PORT=5432
POSTGRES_DB=data_quality
POSTGRES_USER=dq_user
POSTGRES_PASSWORD=***       # Use Docker secrets in prod
```

**Application Settings**
```env
ENVIRONMENT=production      # development, staging, production
API_PORT=8000
ENABLE_ANOMALY_DETECTION=true
ENABLE_DATA_PROFILING=true
```

**Alert Settings**
```env
ENABLE_EMAIL_ALERTS=false
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
RECIPIENT_EMAILS=team@example.com
```

**See:** [.env.example](.env.example) for full configuration template

---

## 🛠️ Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| **Database** | SQLite or PostgreSQL local | PostgreSQL container |
| **Secrets** | `.env` file | Docker secrets / Key Vault |
| **Logging** | DEBUG level, console | INFO level, file + external |
| **Resources** | No limits | CPU/Memory limits enforced |
| **Security** | Relaxed | Full hardening enabled |
| **TLS** | HTTP | HTTPS (reverse proxy) |
| **Auth** | None | OAuth2/API keys required |

---

## 📚 Further Reading

- **[README.md](README.md)**: Quick start guide
- **[SECURITY.md](SECURITY.md)**: Security features and hardening
- **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)**: REST API documentation (auto-generated)
- **[docs/COMPONENTS.md](docs/COMPONENTS.md)**: Component reference (auto-generated)
- **[docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)**: Command cheatsheet (auto-generated)
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Developer guide

---

**Questions? Issues?** Open an issue on GitHub or contact the Data Engineering Team.
