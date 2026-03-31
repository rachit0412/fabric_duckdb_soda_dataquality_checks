# 🏗️ Enterprise Data Quality Platform - System Architecture

## Document Information

| Property | Value |
|----------|-------|
| **Version** | 1.0.0 |
| **Last Updated** | March 30, 2026 |
| **Owner** | Data Engineering Team |
| **Status** | Production Ready |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Patterns](#architecture-patterns)
4. [Component Architecture](#component-architecture)
5. [Data Flow](#data-flow)
6. [Deployment Architecture](#deployment-architecture)
7. [Security Architecture](#security-architecture)
8. [Integration Architecture](#integration-architecture)
9. [Scalability & Performance](#scalability--performance)
10. [Disaster Recovery](#disaster-recovery)

---

## Executive Summary

The Enterprise Data Quality Platform is a **production-grade, containerized solution** designed to monitor, validate, and report on data quality across enterprise data systems. Built with modern microservices principles, it provides real-time monitoring, historical tracking, and intelligent alerting capabilities.

### Key Characteristics

- **Deployment Model**: Containerized microservices (Docker)
- **Architecture Style**: Event-driven, RESTful API-first
- **Database**: PostgreSQL (primary), Azure Cosmos DB (optional)
- **Runtime**: Python 3.11+, FastAPI, DuckDB
- **UI**: HTML5/CSS3/JavaScript (embedded, no build required)
- **Portability**: Cloud-agnostic (runs on Azure, AWS, on-premise)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Enterprise Data Quality Platform                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Presentation Layer                        │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│ │
│  │  │  Web Dashboard │  │   REST API     │  │  API Docs      ││ │
│  │  │  (HTML/JS/CSS) │  │  (FastAPI)     │  │  (Swagger)     ││ │
│  │  │  Port: 8000    │  │  Port: 8000    │  │  Port: 8000    ││ │
│  │  └────────────────┘  └────────────────┘  └────────────────┘│ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                │                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Application Layer                         │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │  Core Services                                        │  │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │ │
│  │  │  │   Scanner   │  │  Profiler   │  │  Anomaly    │  │  │ │
│  │  │  │   Engine    │  │   Engine    │  │  Detector   │  │  │ │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │  Supporting Services                                  │  │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │ │
│  │  │  │   Report    │  │  Alerting   │  │  Storage    │  │  │ │
│  │  │  │  Generator  │  │   Service   │  │ Repository  │  │  │ │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                │                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Data Layer                                │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│ │
│  │  │  PostgreSQL    │  │   DuckDB       │  │   File System  ││ │
│  │  │  (Primary DB)  │  │  (Query Engine)│  │  (Reports/Logs)││ │
│  │  │  Port: 5432    │  │  (In-Memory)   │  │  (Volumes)     ││ │
│  │  └────────────────┘  └────────────────┘  └────────────────┘│ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
     ┌────────────────────────────────────────────────────┐
     │             External Integrations                  │
     │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
     │  │  Email   │  │  Teams   │  │  Azure Cosmos DB ││
     │  │  (SMTP)  │  │(Webhook) │  │   (Optional)     ││
     │  └──────────┘  └──────────┘  └──────────────────┘│
     └────────────────────────────────────────────────────┘
```

### System Components

| Component | Technology | Purpose | Port |
|-----------|-----------|---------|------|
| **Web UI** | HTML5, Alpine.js, Tailwind CSS, Chart.js | Real-time dashboard | 8000 |
| **API Server** | Python 3.11, FastAPI, Uvicorn | REST API endpoints | 8000 |
| **Scanner Engine** | Python, Soda Core 3.4.3, DuckDB 1.1.0 | Data quality validation | - |
| **Database** | PostgreSQL 16 | Historical scan storage | 5432 |
| **Profiler** | Python, Pandas, NumPy | Statistical analysis | - |
| **Anomaly Detector** | Python, SciPy | Outlier detection | - |
| **Report Generator** | Python, Jinja2, Chart.js | HTML report creation | - |
| **Alerting Service** | Python, SMTP, HTTP webhooks | Multi-channel notifications | - |

---

## Architecture Patterns

### 1. **Repository Pattern**

**Purpose**: Abstraction layer for data persistence

```python
┌─────────────────────┐
│  Application Code   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Repository Interface│  (Abstract base class)
└─────────┬───────────┘
          │
    ┌─────┴──────┐
    │            │
    ▼            ▼
┌───────────┐  ┌────────────────┐
│PostgreSQL │  │  Cosmos DB     │
│Repository │  │  Repository    │
└───────────┘  └────────────────┘
```

**Benefits**:
- Swappable storage backends
- Simplified testing with mocks
- Database-agnostic business logic

**Implementation**: `src/storage/`

### 2. **Strategy Pattern**

**Purpose**: Interchangeable algorithms for anomaly detection

```python
┌────────────────────┐
│  Anomaly Detector  │
└────────┬───────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌─────────┐  ┌──────────┐
│ Z-Score │  │   IQR    │
│Strategy │  │ Strategy │
└─────────┘  └──────────┘
```

**Benefits**:
- Easy addition of new detection algorithms
- Runtime algorithm selection
- Isolated algorithm logic

**Implementation**: `src/core/anomaly_detector.py`

### 3. **Dependency Injection**

**Purpose**: Loose coupling and testability

```python
class EnhancedDataQualityScanner:
    def __init__(self, 
                 profiler: DataProfiler = None,
                 anomaly_detector: AnomalyDetector = None):
        self.profiler = profiler or DataProfiler()
        self.anomaly_detector = anomaly_detector or AnomalyDetector()
```

**Benefits**:
- Testable components
- Flexible composition
- Easy mocking

### 4. **API-First Design**

**Purpose**: Contract-first development

```
┌──────────────┐
│  OpenAPI     │  (API Specification)
│  Spec        │
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌──────┐ ┌──────┐
│ FastAPI │ │Swagger│
└──────┘ └──────┘
```

**Benefits**:
- Auto-generated documentation
- Type-safe contracts
- Client generation capability

**Implementation**: `src/api/server.py`

### 5. **Event-Driven Architecture (Async)**

**Purpose**: Non-blocking operations

```python
@app.post("/api/scan")
async def run_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    # Immediate response
    scan_result = scanner.execute_scan(...)
    
    # Background processing
    background_tasks.add_task(storage_repo.save_scan_result, scan_result)
    background_tasks.add_task(alerting_service.process_scan_result, scan_result)
    
    return ScanResponse(...)
```

**Benefits**:
- Fast API responses
- Better resource utilization
- Scalable background processing

---

## Component Architecture

### Core Services Layer

#### 1. Scanner Engine (`src/core/scanner.py`)

**Responsibility**: Orchestrate data quality scans

```
┌─────────────────────────────────────────┐
│         EnhancedDataQualityScanner      │
├─────────────────────────────────────────┤
│ + execute_comprehensive_scan()          │
│ + load_csv()                            │
│ + run_soda_scan()                       │
│ + add_profiling()                       │
│ + add_anomaly_detection()               │
└─────────────────────────────────────────┘
         │
         ├─── Uses ───▶ DuckDB (SQL engine)
         ├─── Uses ───▶ Soda Core (checks)
         ├─── Uses ───▶ DataProfiler
         └─── Uses ───▶ AnomalyDetector
```

**Key Methods**:
- `execute_comprehensive_scan()`: Main entry point
- `run_soda_scan()`: Execute Soda Core checks
- `add_profiling()`: Statistical profiling
- `add_anomaly_detection()`: Outlier detection

**Dependencies**:
- Soda Core 3.4.3
- DuckDB 1.1.0
- Pandas 2.2.0

#### 2. Profiler Engine (`src/core/profiler.py`)

**Responsibility**: Statistical data profiling

```
┌─────────────────────────────────────────┐
│           DataProfiler                  │
├─────────────────────────────────────────┤
│ + profile_dataframe()                   │
│ + _calculate_numeric_stats()            │
│ + _calculate_categorical_stats()        │
│ + _calculate_datetime_stats()           │
└─────────────────────────────────────────┘
```

**Metrics Calculated**:
- **Numeric**: mean, median, std dev, min, max, quartiles
- **Categorical**: unique values, top values, frequencies
- **Datetime**: date range, patterns
- **All Types**: null counts, completeness

#### 3. Anomaly Detector (`src/core/anomaly_detector.py`)

**Responsibility**: Identify data quality anomalies

```
┌─────────────────────────────────────────┐
│          AnomalyDetector                │
├─────────────────────────────────────────┤
│ + detect_anomalies()                    │
│ + _zscore_method()                      │
│ + _iqr_method()                         │
│ + _pattern_detection()                  │
└─────────────────────────────────────────┘
```

**Detection Methods**:
- **Z-Score**: Statistical outliers (3 sigma)
- **IQR**: Interquartile range method
- **Pattern**: Regex/format violations

**Dependencies**:
- SciPy 1.14.0
- NumPy 1.26.4

### Supporting Services Layer

#### 4. Report Generator (`src/reporting/html_generator.py`)

**Responsibility**: Create interactive HTML reports

```
┌─────────────────────────────────────────┐
│        HTMLReportGenerator              │
├─────────────────────────────────────────┤
│ + generate_report()                     │
│ + _build_html()                         │
│ + _generate_charts()                    │
│ + _format_summary()                     │
└─────────────────────────────────────────┘
```

**Output**: Standalone HTML file with:
- Executive summary
- Pass/fail status
- Check-by-check results
- Interactive charts (Chart.js)
- Profiling statistics
- Anomaly highlights

#### 5. Alerting Service (`src/notifications/alerting.py`)

**Responsibility**: Multi-channel notifications

```
┌─────────────────────────────────────────┐
│          AlertingService                │
├─────────────────────────────────────────┤
│ + process_scan_result()                 │
│ + send_email_alert()                    │
│ + send_teams_alert()                    │
│ + _should_alert()                       │
└─────────────────────────────────────────┘
```

**Channels**:
- **Email**: SMTP with HTML formatting
- **Microsoft Teams**: Webhook integration
- **Extensible**: Easy to add Slack, PagerDuty, etc.

**Trigger Logic**:
- Failed scans
- Pass rate below threshold
- Anomaly count exceeds limit

#### 6. Storage Repository (`src/storage/`)

**Responsibility**: Persistence abstraction

```
┌─────────────────────────────────────────┐
│      BaseRepository (ABC)               │
└─────────────┬───────────────────────────┘
              │
      ┌───────┴────────┐
      │                │
┌─────▼──────┐  ┌──────▼──────────┐
│PostgreSQL  │  │  CosmosDB       │
│Repository  │  │  Repository     │
└────────────┘  └─────────────────┘
```

**Operations**:
- `save_scan_result()`: Store scan execution
- `get_scan_history()`: Query historical scans
- `get_trend_analysis()`: Calculate trends
- `get_all_tables_summary()`: Dashboard data

### API Layer

#### 7. REST API Server (`src/api/server.py`)

**Responsibility**: HTTP interface

```
┌─────────────────────────────────────────┐
│            FastAPI App                  │
├─────────────────────────────────────────┤
│ Endpoints:                              │
│ GET  /                  → Dashboard UI  │
│ GET  /api/health       → Health check   │
│ POST /api/scan         → Run scan       │
│ GET  /api/history/{t}  → Scan history   │
│ GET  /api/trends/{t}   → Trend analysis │
│ GET  /api/summary      → Dashboard data │
│ GET  /docs             → Swagger UI     │
└─────────────────────────────────────────┘
```

**Features**:
- **Auto-documentation**: Swagger/ReDoc
- **Type validation**: Pydantic models
- **Async support**: Non-blocking I/O
- **Background tasks**: Async processing
- **CORS**: Configurable cross-origin

### Presentation Layer

#### 8. Web Dashboard (`src/ui/dashboard.html`)

**Responsibility**: User interface

```
┌─────────────────────────────────────────┐
│         Web Dashboard (SPA)             │
├─────────────────────────────────────────┤
│ Components:                             │
│ • Real-time metrics cards               │
│ • Interactive charts (Chart.js)         │
│ • Tables overview                       │
│ • Recent activity feed                  │
│ • Auto-refresh (30s interval)           │
└─────────────────────────────────────────┘
```

**Technology Stack**:
- **HTML5**: Semantic markup
- **Tailwind CSS**: Utility-first styling
- **Alpine.js**: Reactive data binding
- **Chart.js**: Interactive visualizations
- **Lucide Icons**: Modern iconography

**No Build Required**: Pure HTML/JS/CSS

---

## Data Flow

### 1. Data Quality Scan Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ CSV File │────▶│  DuckDB  │────▶│   Soda   │────▶│  Scan    │
│          │     │  Engine  │     │   Core   │     │  Result  │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                         │
                 ┌───────────────────────────────────────┤
                 │                                       │
                 ▼                                       ▼
         ┌──────────────┐                        ┌──────────────┐
         │  Profiler    │                        │   Anomaly    │
         │  (Stats)     │                        │   Detector   │
         └──────┬───────┘                        └──────┬───────┘
                │                                       │
                └───────────────┬───────────────────────┘
                                ▼
                      ┌──────────────────┐
                     │  Enhanced Result  │
                      └────────┬─────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
               ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │PostgreSQL│   │  Reports │   │ Alerting │
        └──────────┘   └──────────┘   └──────────┘
```

### 2. API Request Flow

```
User/System
    │
    │ HTTP Request
    ▼
┌─────────────────┐
│  FastAPI Server │
└────────┬────────┘
         │
         │ Route to Handler
         ▼
┌─────────────────┐
│  Request Model  │ (Pydantic validation)
└────────┬────────┘
         │
         │ Business Logic
         ▼
┌─────────────────┐
│  Core Services  │ (Scanner, Storage, etc.)
└────────┬────────┘
         │
         │ Background Tasks (async)
         ▼
┌─────────────────┐
│ Response Model  │
└────────┬────────┘
         │
         │ HTTP Response
         ▼
    User/System
```

### 3. Dashboard Data Flow

```
Browser
   │
   │ GET /
   ▼
┌─────────────────┐
│  FastAPI Server │
│  (Static HTML)  │
└────────┬────────┘
         │
         │ HTML + JS
         ▼
    Browser
         │
         │ XHR: GET /api/summary
         ▼
┌─────────────────┐
│  API Endpoint   │
└────────┬────────┘
         │
         │ Query
         ▼
┌─────────────────┐
│  PostgreSQL DB  │
└────────┬────────┘
         │
         │ JSON Response
         ▼
    Browser
         │
         │ Render Charts/Tables
         ▼
    Dashboard UI
```

---

## Deployment Architecture

### Container Architecture

```
Docker Host
├── dq-postgres (Container)
│   ├── Image: postgres:16-alpine
│   ├── Port: 5432
│   ├── Volume: postgres_data
│   └── Network: dq-network
│
├── dq-platform-api (Container)
│   ├── Image: data-quality-api:latest
│   ├── Port: 8000
│   ├── Volumes:
│   │   ├── ./logs → /app/logs
│   │   ├── ./reports → /app/reports
│   │   └── ./data → /app/data (ro)
│   └── Network: dq-network
│
└── dq-pgadmin (Optional Container)
    ├── Image: dpage/pgadmin4:latest
    ├── Port: 5050
    ├── Volume: pgadmin_data
    └── Network: dq-network
```

### Network Architecture

```
┌─────────────────────────────────────────────────┐
│          Docker Network: dq-network             │
│             (Bridge Mode)                       │
│                                                 │
│  ┌───────────────┐      ┌──────────────────┐  │
│  │  PostgreSQL   │◀────▶│    API Server     │  │
│  │  172.20.0.2   │      │   172.20.0.3      │  │
│  └───────────────┘      └──────────────────┘  │
│         ▲                       ▲              │
│         │                       │              │
│         │      ┌────────────────┘              │
│         │      │                               │
│         │      ▼                               │
│     ┌──────────────┐                          │
│     │   pgAdmin    │                          │
│     │ 172.20.0.4   │                          │
│     └──────────────┘                          │
│                                                 │
└─────────────────────────────────────────────────┘
                    │
                    │ Port Mapping
                    ▼
┌───────────────────────────────────────────────── ─┐
│              Host Machine                          │
│  Port 8000  → API + UI                            │
│  Port 5432  → PostgreSQL                          │
│  Port 5050  → pgAdmin (optional)                  │
└────────────────────────────────────────────────────┘
```

### Deployment Environments

| Environment | Infrastructure | Database | URL |
|-------------|---------------|----------|-----|
| **Local Development** | Docker Desktop | PostgreSQL (container) | http://localhost:8000 |
| **CI/CD** | GitHub Actions / Azure DevOps | PostgreSQL (container) | N/A |
| **Azure Production** | Azure Container Apps | Azure Database for PostgreSQL | https://dq.company.com |
| **Kubernetes** | AKS / EKS | PostgreSQL (managed) | https://dq.company.com |

---

## Security Architecture

### 1. Network Security

```
Internet
    │
    │ HTTPS (TLS 1.3)
    ▼
┌─────────────────┐
│ Azure Front Door│ (WAF, DDoS protection)
└────────┬────────┘
         │
         │ Private Endpoint
         ▼
┌─────────────────┐
│  Container App  │ (Internal network)
└────────┬────────┘
         │
         │ Private Link
         ▼
┌─────────────────┐
│  PostgreSQL     │ (No public access)
└─────────────────┘
```

### 2. Authentication & Authorization

**Current State**: Open (development)

**Production Requirements**:
- Azure AD integration
- API key authentication
- Role-based access control (RBAC)
- JWT token validation

**Future Implementation**:
```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

@app.get("/api/scan", dependencies=[Depends(verify_token)])
async def run_scan(...):
    ...
```

### 3. Data Security

- **Encryption at Rest**: PostgreSQL TDE
- **Encryption in Transit**: TLS 1.3
- **Secrets Management**: Azure Key Vault / Docker Secrets
- **PII Protection**: Configurable masking

### 4. Container Security

- **Base Images**: Official, verified images only
- **User Permissions**: Non-root containers
- **Vulnerability Scanning**: Trivy, Snyk
- **Immutable Containers**: No runtime modifications

---

## Integration Architecture

### 1. Data Sources

```
Data Sources
├── CSV Files (Primary)
│   └── Mounted volume: /app/data
├── Microsoft Fabric Lakehouse
│   └── CSV export to mounted storage
├── Azure Blob Storage (Future)
│   └── Direct connector
└── SQL Databases (Future)
    └── JDBC/ODBC connectors
```

### 2. Notification Channels

```
Alerting Service
├── Email (SMTP)
│   └── Office 365, Gmail, Custom
├── Microsoft Teams
│   └── Incoming Webhook
├── Slack (Future)
│   └── Webhook integration
└── PagerDuty (Future)
    └── Events API v2
```

### 3. Storage Backends

```
Storage Repository Interface
├── PostgreSQL (Default)
│   ├── Azure Database for PostgreSQL
│   ├── AWS RDS
│   └── On-premise PostgreSQL
├── Azure Cosmos DB (Optional)
│   └── NoSQL API
└── SQLite (Development)
    └── Local file-based
```

---

## Scalability & Performance

### Horizontal Scaling

```
Load Balancer
      │
      ├──▶ API Instance 1
      ├──▶ API Instance 2
      ├──▶ API Instance 3
      └──▶ API Instance N
           │
           ▼
      PostgreSQL
    (Connection Pool)
```

**Strategy**: Stateless API servers

### Performance Optimizations

1. **DuckDB**: In-memory columnar queries (10-100x faster than Pandas)
2. **Connection Pooling**: PostgreSQL connection reuse
3. **Async I/O**: FastAPI async/await
4. **Background Tasks**: Non-blocking operations
5. **Caching**: Dashboard summary caching (30s TTL)
6. **Indexes**: PostgreSQL on timestamp, table_name, status

### Capacity Planning

| Metric | Small | Medium | Large |
|--------|-------|--------|-------|
| **Scans/Day** | 100 | 1,000 | 10,000+ |
| **Tables Monitored** | 10 | 100 | 1,000+ |
| **API Instances** | 1 | 2-3 | 5-10 |
| **PostgreSQL** | 2 vCPU | 4 vCPU | 8+ vCPU |
| **Storage** | 10 GB | 100 GB | 1 TB+ |

---

## Disaster Recovery

### Backup Strategy

```
PostgreSQL
    │
    ├─── Daily Full Backup → Azure Blob Storage (Retention: 30 days)
    ├─── Hourly Incremental → Azure Blob Storage (Retention: 7 days)
    └─── WAL Archiving → Continuous replication
```

### Recovery Objectives

- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 1 hour

### High Availability

```
┌─────────────────────────────────────────┐
│        Azure Container Apps             │
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │ API  │  │ API  │  │ API  │          │
│  │  1   │  │  2   │  │  3   │          │
│  └──────┘  └──────┘  └──────┘          │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Azure Database for PostgreSQL          │
│  ┌──────────┐        ┌──────────┐      │
│  │ Primary  │───────▶│ Replica  │      │
│  │  (RW)    │        │   (RO)   │      │
│  └──────────┘        └──────────┘      │
└─────────────────────────────────────────┘
```

**Features**:
- Auto-scaling (Container Apps)
- Read replicas (PostgreSQL)
- Automatic failover
- Multi-region deployment

---

## Technology Stack Summary

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Python | 3.11+ | Application runtime |
| **API Framework** | FastAPI | 0.115.0 | REST API server |
| **Web Server** | Uvicorn | 0.32.0 | ASGI server |
| **Query Engine** | DuckDB | 1.1.0 | In-memory SQL |
| **Data Quality** | Soda Core | 3.4.3 | Rule engine |
| **Database** | PostgreSQL | 16 | Primary datastore |
| **UI Framework** | Alpine.js | 3.x | Reactive UI |
| **Styling** | Tailwind CSS | 3.x | Utility CSS |
| **Charts** | Chart.js | 4.4.0 | Visualizations |
| **Containerization** | Docker | 20+ | Deployment |

### Dependencies

```
Production:
├── soda-core==3.4.3
├── duckdb==1.1.0
├── fastapi==0.115.0
├── uvicorn==0.32.0
├── psycopg2-binary==2.9.9
├── pandas==2.2.0
├── numpy==1.26.4
├── scipy==1.14.0
├── pydantic==2.10.0
└── python-dotenv==1.0.0

Development:
├── pytest==7.4.3
├── pytest-asyncio==0.21.1
├── pytest-cov==4.1.0
├── black==23.12.0
└── pylint==3.0.3
```

---

## Appendices

### A. API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Web dashboard UI |
| GET | `/api/health` | Health check |
| POST | `/api/scan` | Execute data quality scan |
| GET | `/api/history/{table}` | Get scan history |
| GET | `/api/trends/{table}` | Get trend analysis |
| GET | `/api/summary` | Dashboard summary data |
| GET | `/docs` | Swagger API documentation |
| GET | `/redoc` | ReDoc API documentation |

### B. Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `.env` | Environment variables | Project root |
| `soda_duckdb/checks.yml` | Data quality rules | soda_duckdb/ |
| `soda_duckdb/config.yml` | Soda configuration | soda_duckdb/ |
| `docker-compose.yml` | Container orchestration | Project root |
| `Dockerfile` | Container image definition | Project root |

### C. Monitoring & Observability

**Metrics to Monitor**:
- API response time (p50, p95, p99)
- Scan execution time
- Database connection pool usage
- Container CPU/memory usage
- Error rate by endpoint
- Scan success/failure rate

**Tools**:
- Azure Monitor
- Application Insights
- PostgreSQL pg_stat_statements
- Docker stats

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-03-30 | Initial architecture document | Data Engineering Team |

---

**Document Status**: Production Ready  
**Review Cycle**: Quarterly  
**Next Review**: June 2026
