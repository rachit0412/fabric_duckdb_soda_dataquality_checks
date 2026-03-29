# 📁 Enterprise Data Quality Platform - Folder Structure

## Document Information

| Property | Value |
|----------|-------|
| **Version** | 1.0.0 |
| **Last Updated** | March 30, 2026 |
| **Purpose** | Repository structure documentation |
| **Audience** | Developers, DevOps, Architects |

---

## Table of Contents

1. [Overview](#overview)
2. [Directory Tree](#directory-tree)
3. [Root Level](#root-level)
4. [Source Code (`src/`)](#source-code-src)
5. [Configuration (`soda_duckdb/`)](#configuration-soda_duckdb)
6. [Documentation](#documentation)
7. [Docker & Deployment](#docker--deployment)
8. [Data & Artifacts](#data--artifacts)
9. [File Naming Conventions](#file-naming-conventions)
10. [Best Practices](#best-practices)

---

## Overview

This repository follows **enterprise-grade Python package structure** with clear separation of concerns, modular design, and comprehensive documentation.

### Design Principles

✅ **Modularity**: Loosely coupled components  
✅ **Testability**: Clear boundaries for testing  
✅ **Discoverability**: Intuitive file organization  
✅ **Scalability**: Easy to extend and maintain  
✅ **Documentation**: Comprehensive guides at every level  

---

## Directory Tree

```
fabric_duckdb_soda_dataquality_checks/
│
├── 📂 src/                                # Source code (Python package)
│   ├── 📂 api/                            # REST API layer
│   │   ├── __init__.py
│   │   ├── server.py                      # FastAPI application
│   │   ├── models.py                      # Pydantic request/response models
│   │   └── routes/                        # API route modules (future)
│   │
│   ├── 📂 core/                           # Business logic core
│   │   ├── __init__.py
│   │   ├── scanner.py                     # Main data quality scanner
│   │   ├── profiler.py                    # Data profiling engine
│   │   └── anomaly_detector.py            # Anomaly detection algorithms
│   │
│   ├── 📂 storage/                        # Data persistence layer
│   │   ├── __init__.py
│   │   ├── base_repository.py             # Abstract repository interface
│   │   ├── postgres_repository.py         # PostgreSQL implementation
│   │   └── cosmos_repository.py           # Azure Cosmos DB implementation
│   │
│   ├── 📂 reporting/                      # Report generation
│   │   ├── __init__.py
│   │   └── html_generator.py              # HTML report builder
│   │
│   ├── 📂 notifications/                  # Alerting system
│   │   ├── __init__.py
│   │   └── alerting.py                    # Multi-channel alerts
│   │
│   ├── 📂 config/                         # Configuration management
│   │   ├── __init__.py
│   │   └── settings.py                    # Environment settings
│   │
│   └── 📂 ui/                             # User interface
│       ├── dashboard.html                 # Main dashboard UI
│       └── UI_PREVIEW.md                  # UI design documentation
│
├── 📂 soda_duckdb/                        # Soda Core configuration
│   ├── checks.yml                         # Data quality rules
│   ├── config.yml                         # Soda engine configuration
│   ├── data_quality_results.csv           # Sample results
│   └── report.txt                         # Sample text report
│
├── 📂 scripts/                            # Utility & management scripts
│   ├── init_db.sql                        # Database schema initialization
│   ├── manage.ps1                         # Docker management (PowerShell)
│   ├── quick-start.ps1                    # Quick start script
│   ├── start-postgres.ps1                 # PostgreSQL startup
│   └── test_quick.py                      # Quick health check script
│
├── 📂 tests/                              # Test suite
│   ├── __init__.py
│   ├── conftest.py                        # Pytest fixtures
│   ├── test_scanner.py                    # Scanner tests
│   ├── test_profiler.py                   # Profiler tests
│   ├── test_anomaly_detector.py           # Anomaly detector tests
│   ├── test_storage.py                    # Storage layer tests
│   └── test_api.py                        # API endpoint tests
│
├── 📂 data/                               # Input data (sample/test)
│   ├── sample_data.csv                    # Sample dataset
│   └── README.md                          # Data directory documentation
│
├── 📂 reports/                            # Generated reports (runtime)
│   ├── data_quality_report_YYYYMMDD.html
│   └── .gitkeep
│
├── 📂 logs/                               # Application logs (runtime)
│   ├── dq_platform.log
│   └── .gitkeep
│
├── 📂 docker/                             # Docker configuration
│   ├── Dockerfile                         # Production image
│   ├── Dockerfile.dev                     # Development image
│   └── nginx.conf                         # Nginx configuration (if needed)
│
├── 📂 docs/                               # Additional documentation
│   ├── API.md                             # API documentation
│   ├── DEPLOYMENT.md                      # Deployment guide
│   └── CONTRIBUTING.md                    # Contribution guidelines
│
├── 📂 .github/                            # GitHub workflows (future)
│   └── workflows/
│       ├── ci.yml                         # CI pipeline
│       └── cd.yml                         # CD pipeline
│
├── 📄 .env.example                        # Environment template
├── 📄 .env                                # Environment variables (git-ignored)
├── 📄 .gitignore                          # Git ignore rules
├── 📄 .dockerignore                       # Docker ignore rules
│
├── 📄 requirements.txt                    # Production dependencies
├── 📄 requirements-dev.txt                # Development dependencies
├── 📄 setup.py                            # Package setup (pip installable)
├── 📄 pyproject.toml                      # Modern Python project config
│
├── 📄 docker-compose.yml                  # Docker orchestration (production)
├── 📄 docker-compose.dev.yml              # Docker orchestration (development)
├── 📄 docker-compose.postgres.yml         # PostgreSQL standalone
│
├── 📄 README.md                           # Project overview
├── 📄 ARCHITECTURE.md                     # System architecture document
├── 📄 FOLDER_STRUCTURE.md                 # This document
├── 📄 CONTAINERIZATION.md                 # Docker deployment guide
├── 📄 DOCKER_SETUP.md                     # Docker basics
├── 📄 POSTGRES_SETUP.md                   # PostgreSQL setup guide
├── 📄 STORAGE_OPTIONS.md                  # Storage backend comparison
├── 📄 TESTING.md                          # Testing guide
├── 📄 UI_GUIDE.md                         # UI usage documentation
├── 📄 README-CONTAINER.md                 # Container quick reference
│
└── 📄 LICENSE                             # Software license

```

---

## Root Level

### Core Files

| File | Purpose | Owner |
|------|---------|-------|
| **README.md** | Project overview, quick start guide | Team Lead |
| **ARCHITECTURE.md** | System architecture documentation | Architect |
| **FOLDER_STRUCTURE.md** | Repository structure (this file) | Tech Lead |
| **LICENSE** | Software licensing terms | Legal |
| **.gitignore** | Git exclusion patterns | DevOps |
| **.dockerignore** | Docker exclude patterns | DevOps |
| **.env.example** | Environment template | DevOps |
| **.env** | Environment variables (git-ignored) | Local |

### Python Config Files

| File | Purpose | Standard |
|------|---------|----------|
| **requirements.txt** | Production dependencies | PEP 440 |
| **requirements-dev.txt** | Development dependencies | PEP 440 |
| **setup.py** | Package installation config | PEP 517 |
| **pyproject.toml** | Modern Python project metadata | PEP 518 |

### Docker Files

| File | Purpose | Environment |
|------|---------|-------------|
| **Dockerfile** | Production container image | Production |
| **docker-compose.yml** | Multi-container orchestration | Production |
| **docker-compose.dev.yml** | Development environment | Development |
| **docker-compose.postgres.yml** | Database standalone | Testing |

### Documentation Files

| File | Purpose |
|------|---------|
| **CONTAINERIZATION.md** | Docker deployment comprehensive guide |
| **DOCKER_SETUP.md** | Docker getting started |
| **POSTGRES_SETUP.md** | PostgreSQL configuration |
| **STORAGE_OPTIONS.md** | Storage backend comparison |
| **TESTING.md** | Testing strategy and examples |
| **UI_GUIDE.md** | Dashboard usage guide |
| **README-CONTAINER.md** | Container quick reference |

---

## Source Code (`src/`)

The `src/` directory contains the **main application code** structured as a Python package.

### Why `src/` Layout?

✅ **Separation**: Clearly separates source from tests/docs/config  
✅ **Import Clarity**: Prevents accidental imports from project root  
✅ **Distribution**: Easier to package for PyPI  
✅ **Best Practice**: Recommended by Python Packaging Authority  

### Module Breakdown

#### 📂 `src/api/` - REST API Layer

**Purpose**: HTTP interface for the platform

```
src/api/
├── __init__.py              # Package initialization
├── server.py                # FastAPI application & routes
└── models.py                # Pydantic request/response schemas
```

**Key Components**:

| File | Responsibility | Lines of Code |
|------|---------------|---------------|
| **server.py** | FastAPI app, endpoints, startup/shutdown | 300-400 |
| **models.py** | Type-safe API contracts (Pydantic) | 100-150 |

**Dependencies**:
- FastAPI 0.115.0
- Uvicorn 0.32.0
- Pydantic 2.10.0

**Example**:
```python
# src/api/server.py
from fastapi import FastAPI, HTTPException
from .models import ScanRequest, ScanResponse

app = FastAPI(title="Data Quality Platform API")

@app.post("/api/scan", response_model=ScanResponse)
async def run_scan(request: ScanRequest):
    ...
```

#### 📂 `src/core/` - Business Logic Core

**Purpose**: Core data quality intelligence

```
src/core/
├── __init__.py              # Package exports
├── scanner.py               # Main orchestration engine
├── profiler.py              # Statistical profiling
└── anomaly_detector.py      # Outlier detection algorithms
```

**Key Components**:

| File | Responsibility | Key Classes |
|------|---------------|-------------|
| **scanner.py** | Orchestrate scans, integrate Soda Core | `EnhancedDataQualityScanner` |
| **profiler.py** | Calculate statistics, distributions | `DataProfiler` |
| **anomaly_detector.py** | Identify outliers, patterns | `AnomalyDetector` |

**Dependencies**:
- Soda Core 3.4.3
- DuckDB 1.1.0
- Pandas 2.2.0
- NumPy 1.26.4
- SciPy 1.14.0

**Example**:
```python
# src/core/scanner.py
class EnhancedDataQualityScanner:
    def __init__(self, profiler, anomaly_detector):
        self.profiler = profiler
        self.anomaly_detector = anomaly_detector
    
    def execute_comprehensive_scan(self, table_name, csv_path):
        # Load → Scan → Profile → Detect
        ...
```

#### 📂 `src/storage/` - Data Persistence Layer

**Purpose**: Abstraction for multiple backends

```
src/storage/
├── __init__.py                  # Package exports
├── base_repository.py           # Abstract interface (ABC)
├── postgres_repository.py       # PostgreSQL implementation
└── cosmos_repository.py         # Azure Cosmos DB implementation
```

**Design Pattern**: Repository Pattern

| File | Responsibility | Database |
|------|---------------|----------|
| **base_repository.py** | `BaseRepository` abstract class | N/A |
| **postgres_repository.py** | PostgreSQL CRUD operations | PostgreSQL 16 |
| **cosmos_repository.py** | Cosmos DB NoSQL operations | Azure Cosmos DB |

**Dependencies**:
- psycopg2-binary 2.9.9 (PostgreSQL)
- azure-cosmos 4.7.0 (Cosmos DB)

**Example**:
```python
# src/storage/base_repository.py
from abc import ABC, abstractmethod

class BaseRepository(ABC):
    @abstractmethod
    def save_scan_result(self, scan_result: dict) -> str:
        """Save scan result, return ID"""
        pass
    
    @abstractmethod
    def get_scan_history(self, table_name: str, limit: int) -> list:
        """Retrieve historical scans"""
        pass
```

#### 📂 `src/reporting/` - Report Generation

**Purpose**: Generate human-readable reports

```
src/reporting/
├── __init__.py
└── html_generator.py         # HTML report with Chart.js
```

**Key Features**:
- Executive summary
- Interactive charts (Chart.js)
- Profiling statistics
- Anomaly highlights
- Standalone HTML (no dependencies)

**Dependencies**:
- Jinja2 3.1.2 (templating)

#### 📂 `src/notifications/` - Alerting System

**Purpose**: Multi-channel notifications

```
src/notifications/
├── __init__.py
└── alerting.py              # Email, Teams, etc.
```

**Supported Channels**:
- ✅ Email (SMTP)
- ✅ Microsoft Teams (Webhook)
- 🔮 Slack (Future)
- 🔮 PagerDuty (Future)

**Dependencies**:
- smtplib (built-in)
- requests 2.31.0

#### 📂 `src/config/` - Configuration Management

**Purpose**: Centralized settings

```
src/config/
├── __init__.py
└── settings.py              # Environment-based configuration
```

**Key Features**:
- Environment variable loading
- Type-safe settings (Pydantic)
- Defaults for dev/prod
- Secrets management

**Dependencies**:
- python-dotenv 1.0.0
- Pydantic 2.10.0

**Example**:
```python
# src/config/settings.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:pass@localhost/db"
    STORAGE_BACKEND: str = "postgresql"
    API_PORT: int = 8000
    
    class Config:
        env_file = ".env"
        
settings = Settings()
```

#### 📂 `src/ui/` - User Interface

**Purpose**: Web dashboard frontend

```
src/ui/
├── dashboard.html           # Single-page dashboard
└── UI_PREVIEW.md            # Design documentation
```

**Technology Stack**:
- HTML5 (semantic markup)
- Tailwind CSS 3.x (styling)
- Alpine.js 3.x (reactivity)
- Chart.js 4.4.0 (visualizations)
- Lucide Icons (iconography)

**Features**:
- Real-time metrics
- Interactive charts
- Table management
- Recent activity feed
- Auto-refresh (30s)
- Mobile responsive

**No Build Required**: Pure HTML/JS/CSS served statically

---

## Configuration (`soda_duckdb/`)

**Purpose**: Soda Core data quality rules and configuration

```
soda_duckdb/
├── checks.yml               # Data quality rules (YAML)
├── config.yml               # Soda engine configuration
├── data_quality_results.csv # Sample results
└── report.txt               # Sample text output
```

### File Details

#### `checks.yml` - Data Quality Rules

**Format**: YAML  
**Purpose**: Define data quality checks per table

**Example**:
```yaml
checks for customer_data:
  - row_count > 0
  - missing_count(customer_id) = 0
  - duplicate_count(customer_id) = 0
  - invalid_count(email) = 0:
      valid format: email
  - avg(age) between 18 and 120
```

**Reference**: [Soda Core Checks Documentation](https://docs.soda.io/soda-core/checks.html)

#### `config.yml` - Soda Configuration

**Format**: YAML  
**Purpose**: Configure Soda Core engine

**Example**:
```yaml
data_source duckdb_datasource:
  type: duckdb
  connection:
    database: ":memory:"
```

---

## Documentation

### Documentation Strategy

| Type | Location | Format | Audience |
|------|----------|--------|----------|
| **Overview** | README.md | Markdown | Everyone |
| **Architecture** | ARCHITECTURE.md | Markdown | Architects, Senior Devs |
| **API Reference** | /docs endpoint | Swagger/ReDoc | API Consumers |
| **Deployment** | CONTAINERIZATION.md | Markdown | DevOps |
| **Code Comments** | Inline | Docstrings | Developers |
| **UI Guide** | UI_GUIDE.md | Markdown | End Users |

### Documentation Files

| File | Purpose | Length |
|------|---------|--------|
| **README.md** | Quick start, overview | 5-10 pages |
| **ARCHITECTURE.md** | System design, patterns | 30-40 pages |
| **FOLDER_STRUCTURE.md** | Repository organization | 20-30 pages |
| **CONTAINERIZATION.md** | Docker deployment | 15-20 pages |
| **TESTING.md** | Test strategy | 10-15 pages |
| **UI_GUIDE.md** | Dashboard usage | 40-50 pages |

### Inline Documentation Standards

**Python Docstrings** (Google Style):

```python
def execute_comprehensive_scan(self, table_name: str, csv_path: str) -> dict:
    """
    Execute a comprehensive data quality scan.
    
    Performs Soda Core checks, statistical profiling, and anomaly detection
    on the specified CSV file.
    
    Args:
        table_name (str): Name of the table/dataset being scanned
        csv_path (str): Absolute path to the CSV file
    
    Returns:
        dict: Comprehensive scan results including:
            - pass_rate (float): Percentage of passing checks
            - check_results (list): Individual check outcomes
            - profiling_results (dict): Statistical profiles
            - anomalies (list): Detected anomalies
    
    Raises:
        FileNotFoundError: If csv_path does not exist
        ValueError: If CSV is malformed or empty
    
    Example:
        >>> scanner = EnhancedDataQualityScanner()
        >>> results = scanner.execute_comprehensive_scan(
        ...     "customers", 
        ...     "/data/customers.csv"
        ... )
        >>> print(results['pass_rate'])
        95.5
    """
    ...
```

---

## Docker & Deployment

### Docker Files

```
./
├── Dockerfile                      # Production image
├── docker-compose.yml              # Production orchestration
├── docker-compose.dev.yml          # Development orchestration
└── docker-compose.postgres.yml     # PostgreSQL standalone
```

#### `Dockerfile` - Production Image

**Base Image**: `python:3.11-slim`  
**Multi-stage**: No (single stage for simplicity)  
**Size**: ~500 MB

**Structure**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY src/ src/
COPY soda_duckdb/ soda_duckdb/
COPY .env .

EXPOSE 8000

CMD ["uvicorn", "src.api.server:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### `docker-compose.yml` - Production Orchestration

**Services**:
1. **postgres**: PostgreSQL 16 database (port 5432)
2. **data-quality-api**: FastAPI application (port 8000)
3. **pgadmin**: Optional database admin (port 5050)

**Networks**: `dq-network` (bridge mode)

**Volumes**:
- `postgres_data`: Database persistence
- `./logs`: Application logs
- `./reports`: Generated reports
- `./data`: Input data (read-only)

**Example**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: dq_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: data_quality
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - dq-network

  data-quality-api:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://dq_user:${DB_PASSWORD}@postgres:5432/data_quality
    volumes:
      - ./logs:/app/logs
      - ./reports:/app/reports
      - ./data:/app/data:ro
    networks:
      - dq-network

volumes:
  postgres_data:

networks:
  dq-network:
    driver: bridge
```

### Management Scripts

```
scripts/
├── manage.ps1               # Docker Compose wrapper (PowerShell)
├── quick-start.ps1          # One-command startup
├── start-postgres.ps1       # PostgreSQL only
└── init_db.sql              # Database schema DDL
```

**Purpose**: Simplify Docker operations for Windows users

**Example Usage**:
```powershell
# Start all services
.\scripts\manage.ps1 up

# View logs
.\scripts\manage.ps1 logs api

# Stop all services
.\scripts\manage.ps1 down
```

---

## Data & Artifacts

### Runtime Directories

These directories are generated at runtime and excluded from version control:

```
data/                   # Input CSV files
├── sample_data.csv
└── README.md

reports/                # Generated HTML reports
├── data_quality_report_20260330_143000.html
└── .gitkeep

logs/                   # Application logs
├── dq_platform.log
└── .gitkeep
```

### `.gitkeep` Files

**Purpose**: Preserve empty directories in Git

Git does not track empty directories. `.gitkeep` is a convention to force tracking:

```bash
# Create empty log directory and preserve in Git
mkdir logs
touch logs/.gitkeep
git add logs/.gitkeep
```

### `.gitignore` Configuration

```gitignore
# Runtime artifacts
logs/*.log
reports/*.html
data/*.csv

# Python
__pycache__/
*.py[cod]
*.so
*.egg-info/
dist/
build/

# Environment
.env
.venv/
venv/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
```

---

## File Naming Conventions

### General Rules

| Type | Convention | Example |
|------|-----------|---------|
| **Python Modules** | `snake_case` | `anomaly_detector.py` |
| **Python Classes** | `PascalCase` | `DataProfiler` |
| **Python Functions** | `snake_case` | `execute_scan()` |
| **Config Files** | `lowercase.ext` | `checks.yml` |
| **Documentation** | `UPPERCASE.md` | `README.md`, `ARCHITECTURE.md` |
| **Scripts** | `kebab-case.ext` | `quick-start.ps1` |

### Python Import Standards

**Absolute Imports** (preferred):
```python
from src.core.scanner import EnhancedDataQualityScanner
from src.storage.postgres_repository import PostgresRepository
```

**Relative Imports** (within package):
```python
# Inside src/api/server.py
from ..core.scanner import EnhancedDataQualityScanner
from .models import ScanRequest
```

### Type Hints

**Always use type hints** for function signatures:

```python
from typing import List, Dict, Optional

def get_scan_history(
    self, 
    table_name: str, 
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Get historical scan results."""
    ...
```

---

## Best Practices

### 1. **Package Installation**

Make the `src/` directory installable:

**`setup.py`**:
```python
from setuptools import setup, find_packages

setup(
    name="data-quality-platform",
    version="1.0.0",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    install_requires=[
        "fastapi==0.115.0",
        "soda-core==3.4.3",
        # ... other dependencies
    ],
)
```

**Install in editable mode**:
```bash
pip install -e .
```

Benefits:
- Clean imports: `from core.scanner import ...`
- IDE autocomplete works properly
- Easier testing

### 2. **Environment Management**

**Use `.env` for configuration** (never commit):

```bash
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/db
STORAGE_BACKEND=postgresql
LOG_LEVEL=INFO
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

**Provide `.env.example`** (committed to Git):

```bash
# .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/db
STORAGE_BACKEND=postgresql
LOG_LEVEL=INFO
SMTP_SERVER=
SMTP_PORT=587
```

### 3. **Dependency Management**

**Separate production and development dependencies**:

**`requirements.txt`** (production):
```
soda-core==3.4.3
duckdb==1.1.0
fastapi==0.115.0
psycopg2-binary==2.9.9
```

**`requirements-dev.txt`** (development):
```
-r requirements.txt
pytest==7.4.3
pytest-cov==4.1.0
black==23.12.0
pylint==3.0.3
```

**Install**:
```bash
# Production
pip install -r requirements.txt

# Development
pip install -r requirements-dev.txt
```

### 4. **Testing Structure**

**Mirror the `src/` structure in `tests/`**:

```
tests/
├── test_scanner.py          # Tests for src/core/scanner.py
├── test_profiler.py         # Tests for src/core/profiler.py
├── test_postgres_repo.py    # Tests for src/storage/postgres_repository.py
└── test_api.py              # Tests for src/api/server.py
```

**Use descriptive test names**:

```python
def test_scanner_detects_missing_values_correctly():
    """Test that scanner correctly identifies missing values."""
    ...

def test_postgres_repository_saves_scan_results():
    """Test PostgreSQL repository save operation."""
    ...
```

### 5. **Logging Strategy**

**Use Python's built-in logging**:

```python
import logging

logger = logging.getLogger(__name__)

def execute_scan(self, table_name: str):
    logger.info(f"Starting scan for table: {table_name}")
    try:
        result = self._perform_scan()
        logger.info(f"Scan completed successfully: {result['pass_rate']}% pass rate")
        return result
    except Exception as e:
        logger.error(f"Scan failed for {table_name}: {e}", exc_info=True)
        raise
```

**Configure logging centrally**:

```python
# src/config/logging_config.py
import logging.config

LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        },
    },
    'handlers': {
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'level': 'INFO',
            'formatter': 'standard',
            'filename': 'logs/dq_platform.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
        },
    },
    'root': {
        'level': 'INFO',
        'handlers': ['file'],
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
```

### 6. **Code Quality Tools**

**Pre-commit Hooks** (`.pre-commit-config.yaml`):

```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.12.0
    hooks:
      - id: black
        language_version: python3.11
  
  - repo: https://github.com/pycqa/pylint
    rev: v3.0.3
    hooks:
      - id: pylint
        args: [--max-line-length=100]
```

**Usage**:
```bash
# Install pre-commit
pip install pre-commit

# Setup hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

### 7. **Version Control**

**Branching Strategy** (Git Flow):

```
main                    # Production-ready code
├── develop             # Integration branch
│   ├── feature/xxx     # Feature branches
│   ├── bugfix/xxx      # Bug fixes
│   └── hotfix/xxx      # Emergency fixes
```

**Commit Message Format**:

```
feat: Add PostgreSQL repository implementation
fix: Correct anomaly detection Z-score calculation
docs: Update architecture documentation
test: Add tests for data profiler
refactor: Simplify scanner orchestration logic
```

---

## Quick Reference

### Common Operations

| Task | Command |
|------|---------|
| **Install dependencies** | `pip install -r requirements-dev.txt` |
| **Run tests** | `pytest tests/` |
| **Run API server** | `uvicorn src.api.server:app --reload` |
| **Build Docker image** | `docker build -t data-quality-api .` |
| **Start containers** | `docker-compose up -d` |
| **View logs** | `docker-compose logs -f api` |
| **Format code** | `black src/ tests/` |
| **Lint code** | `pylint src/` |
| **Generate coverage** | `pytest --cov=src tests/` |

### Port Reference

| Service | Port | URL |
|---------|------|-----|
| **API + UI** | 8000 | http://localhost:8000 |
| **API Docs** | 8000 | http://localhost:8000/docs |
| **PostgreSQL** | 5432 | postgresql://localhost:5432 |
| **pgAdmin** | 5050 | http://localhost:5050 |

---

## Continuous Improvement

### Periodic Reviews

**Quarterly Review Checklist**:

- [ ] Remove unused dependencies
- [ ] Update package versions
- [ ] Refactor technical debt
- [ ] Update documentation
- [ ] Review security vulnerabilities (`pip audit`)
- [ ] Optimize Dockerfile layers
- [ ] Review .gitignore patterns

### Metrics to Track

- **Code Coverage**: Target >80%
- **Build Time**: Keep <2 minutes
- **Image Size**: Target <500 MB
- **Test Execution**: Keep <30 seconds
- **Documentation Freshness**: Update monthly

---

## Appendix: Full File Manifest

### Python Modules (30+ files)

| Path | Purpose | LOC |
|------|---------|-----|
| `src/api/server.py` | FastAPI application | 350 |
| `src/api/models.py` | Pydantic models | 120 |
| `src/core/scanner.py` | Main scanner logic | 450 |
| `src/core/profiler.py` | Data profiling | 280 |
| `src/core/anomaly_detector.py` | Anomaly detection | 320 |
| `src/storage/base_repository.py` | Repository interface | 80 |
| `src/storage/postgres_repository.py` | PostgreSQL implementation | 400 |
| `src/storage/cosmos_repository.py` | Cosmos DB implementation | 380 |
| `src/reporting/html_generator.py` | Report generation | 350 |
| `src/notifications/alerting.py` | Alerting service | 280 |
| `src/config/settings.py` | Configuration | 120 |
| `src/ui/dashboard.html` | Web dashboard | 600 |

### Documentation (15+ files)

- README.md
- ARCHITECTURE.md
- FOLDER_STRUCTURE.md
- CONTAINERIZATION.md
- DOCKER_SETUP.md
- POSTGRES_SETUP.md
- STORAGE_OPTIONS.md
- TESTING.md
- UI_GUIDE.md
- README-CONTAINER.md
- src/ui/UI_PREVIEW.md

### Configuration (10+ files)

- .env.example
- .gitignore
- .dockerignore
- requirements.txt
- requirements-dev.txt
- setup.py
- pyproject.toml
- soda_duckdb/checks.yml
- soda_duckdb/config.yml
- docker-compose.yml

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-03-30 | Initial folder structure documentation | Data Engineering Team |

---

**Next Review**: June 2026  
**Owner**: Technical Lead  
**Status**: Production Ready
