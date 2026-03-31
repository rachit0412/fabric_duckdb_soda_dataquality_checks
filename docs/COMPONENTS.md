# Component Reference

> **Version:** 1.0.0 | **Generated:** 2026-03-31 23:11:34

## Architecture Overview

``
┌─────────────────────────────────────────────────────┐
│                  FastAPI Server                      │
│                  (Port 8000)                         │
└─────────────────┬───────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┐
    │             │             │             │
┌───▼────┐  ┌────▼─────┐  ┌───▼─────┐  ┌───▼─────┐
│Scanner │  │Profiler  │  │Anomaly  │  │Alerting │
│        │  │          │  │Detector │  │         │
└───┬────┘  └────┬─────┘  └───┬─────┘  └─────────┘
    │            │            │
    └────────────┼────────────┘
                 │
         ┌───────▼────────┐
         │    DuckDB      │
         │  (In-Memory)   │
         └───────┬────────┘
                 │
    ┌────────────┼────────────┐
    │                         │
┌───▼─────────┐      ┌────────▼─────┐
│ PostgreSQL  │      │   Cosmos DB  │
│ (History)   │      │  (Optional)  │
└─────────────┘      └──────────────┘
``

---

## Core Components

### ScanResult

**Purpose:** Structured scan result

**Methods:**
- `__init__()`
- `close()`


### EnhancedDataQualityScanner

**Purpose:** Enterprise-grade data quality scanner with:
    - Standard Soda checks
    - Anomaly detection
    - Data profiling
    - Historical comparison
    - Detailed reporting

**Methods:**
- `__init__()`
- `close()`


## Storage Components

### PostgreSQLRepository
Primary storage backend for scan history and trends.

**Key Methods:**
- `save_scan_result()`: Store scan results
- `get_scan_history()`: Retrieve historical scans
- `get_trend_analysis()`: Calculate trends over time
- `get_all_tables_summary()`: Dashboard summary data

### CosmosDBRepository (Optional)
Alternative storage backend for cloud-native deployments.

**Configuration:** Set `USE_COSMOSDB=true` in `.env`

---

## Data Flow

1. **Request** → API receives scan request
2. **Load** → Scanner loads CSV into DuckDB
3. **Scan** → Soda Core executes data quality checks
4. **Profile** → Profiler generates statistics
5. **Detect** → Anomaly detector analyzes data
6. **Store** → Results saved to PostgreSQL
7. **Alert** → Notifications sent if failures detected
8. **Report** → HTML report generated
9. **Response** → API returns scan results

---

