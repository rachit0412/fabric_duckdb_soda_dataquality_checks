#!/usr/bin/env pwsh
# Automated Documentation Generator
# Extracts API endpoints, classes, and configurations from source code
# and updates documentation files automatically

param(
    [switch]$Force,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "🔄 Automated Documentation Generator" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SrcDir = "src"
$DocsDir = "docs"
$OutputFile = "$DocsDir/API_REFERENCE.md"

# Extract version from source
function Get-ProjectVersion {
    $initFile = Get-Content "$SrcDir/__init__.py" -Raw
    if ($initFile -match '__version__\s*=\s*"([^"]+)"') {
        return $Matches[1]
    }
    return "1.0.0"
}

# Extract API endpoints
function Get-APIEndpoints {
    $serverFile = "$SrcDir/api/server.py"
    $content = Get-Content $serverFile -Raw
    
    $endpoints = @()
    
    # Match FastAPI route decorators
    $pattern = '@app\.(get|post|put|delete|patch)\("([^"]+)"[^\)]*\)\s+(?:async\s+)?def\s+(\w+)'
    $matches = [regex]::Matches($content, $pattern)
    
    foreach ($match in $matches) {
        $endpoints += [PSCustomObject]@{
            Method = $match.Groups[1].Value.ToUpper()
            Path = $match.Groups[2].Value
            Function = $match.Groups[3].Value
        }
    }
    
    return $endpoints
}

# Extract classes and methods
function Get-ClassStructure {
    param([string]$FilePath)
    
    $content = Get-Content $FilePath -Raw
    $classes = @()
    
    # Match class definitions
    $classPattern = 'class\s+(\w+)(?:\([^\)]*\))?:\s*(?:"""([^"]*)""")?'
    $classMatches = [regex]::Matches($content, $classPattern)
    
    foreach ($classMatch in $classMatches) {
        $className = $classMatch.Groups[1].Value
        $docstring = $classMatch.Groups[2].Value.Trim()
        
        # Find methods for this class
        $methodPattern = "def\s+(\w+)\(self[^\)]*\):"
        $methodMatches = [regex]::Matches($content, $methodPattern)
        
        $methods = @()
        foreach ($methodMatch in $methodMatches) {
            # Verify method is within this class (simple heuristic)
            if ($methodMatch.Index -gt $classMatch.Index) {
                $methods += $methodMatch.Groups[1].Value
            }
        }
        
        $classes += [PSCustomObject]@{
            Name = $className
            Description = $docstring
            Methods = $methods
        }
    }
    
    return $classes
}

# Generate API Reference
function Generate-APIReference {
    param([string]$Version)
    
    Write-Host "📝 Generating API Reference..." -ForegroundColor Green
    
    $endpoints = Get-APIEndpoints
    
    $content = @"
# API Reference

> **Version:** $Version | **Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [HTTP Endpoints](#http-endpoints)
- [Request/Response Models](#requestresponse-models)
- [Error Codes](#error-codes)

---

## Overview

The Data Quality Platform exposes a RESTful API for programmatic access to data quality scanning, monitoring, and reporting capabilities.

**Base URL:** ``http://localhost:8000``

**Content Type:** ``application/json``

---

## Authentication

Currently, the API does not require authentication for local development. For production deployments, implement one of:
- API Keys via headers
- OAuth2/JWT tokens
- Client certificates (mTLS)

See [SECURITY.md](SECURITY.md) for production security best practices.

---

## HTTP Endpoints

### Health & Status

#### GET /api/health
Check API health and service status.

**Response:**
````json
{
  "status": "healthy",
  "timestamp": "2026-03-31T10:00:00Z",
  "version": "$Version",
  "database": "connected"
}
````

---

### Data Quality Scans

"@

    # Add endpoints
    foreach ($endpoint in $endpoints | Sort-Object Path) {
        $content += @"

#### $($endpoint.Method) $($endpoint.Path)
Function: ``$($endpoint.Function)``

"@
        
        # Add specific descriptions based on endpoint
        switch ($endpoint.Path) {
            "/api/scan" {
                $content += @"
Execute a data quality scan with Soda Core checks.

**Request:**
````json
{
  "table_name": "my_table",
  "csv_path": "data/my_data.csv",
  "checks_path": "soda_duckdb/checks.yml",
  "config_path": "soda_duckdb/config.yml"
}
````

**Response:**
````json
{
  "scan_id": "uuid",
  "status": "pass|fail|warn",
  "checks_passed": 10,
  "checks_failed": 2,
  "report_path": "reports/scan_uuid.html"
}
````

"@
            }
            "/api/upload-scan" {
                $content += @"
Upload CSV file and scan in one operation.

**Request:** ``multipart/form-data``
- ``file``: CSV file
- ``table_name``: Table identifier
- ``checks``: JSON array of Soda checks

**Response:** Same as ``/api/scan``

"@
            }
            "/api/dynamic-scan" {
                $content += @"
Run scan with dynamically generated checks (no YAML files needed).

**Request:**
````json
{
  "table_name": "my_table",
  "csv_path": "data/my_data.csv",
  "checks": [
    {
      "type": "row_count",
      "operator": ">",
      "value": 0
    },
    {
      "type": "missing_count",
      "column": "email",
      "operator": "=",
      "value": 0
    }
  ]
}
````

"@
            }
            "/api/history/{table_name}" {
                $content += @"
Retrieve scan history for a specific table.

**Parameters:**
- ``table_name``: Table identifier (path)
- ``days``: Number of days to look back (query, default: 30)

**Response:**
````json
{
  "table_name": "my_table",
  "scans": [
    {
      "scan_id": "uuid",
      "timestamp": "2026-03-31T10:00:00Z",
      "status": "pass",
      "checks_passed": 10,
      "checks_failed": 0
    }
  ]
}
````

"@
            }
            "/api/trends/{table_name}" {
                $content += @"
Get trend analysis for a table's data quality metrics.

**Parameters:**
- ``table_name``: Table identifier
- ``days``: Days to analyze (default: 7)

**Response:** Time-series data for pass rates, check counts, and anomalies.

"@
            }
            "/api/summary" {
                $content += @"
Get summary of all tables and their latest scan results.

**Response:**
````json
{
  "total_tables": 5,
  "healthy_tables": 4,
  "warning_tables": 1,
  "failed_tables": 0,
  "tables": [...]
}
````

"@
            }
        }
        
        $content += "---`n`n"
    }
    
    # Add models section
    $content += @"

## Request/Response Models

### ScanRequest
````python
{
  "table_name": str,          # Required
  "csv_path": str,            # Required
  "checks_path": str,         # Optional (default: soda_duckdb/checks.yml)
  "config_path": str          # Optional (default: soda_duckdb/config.yml)
}
````

### SodaCheck
````python
{
  "type": str,               # row_count, missing_count, duplicate_count, schema
  "column": str,             # Optional, for column-specific checks
  "operator": str,           # >, <, =, >=, <=, !=
  "value": Any               # Threshold value
}
````

### ScanResponse
````python
{
  "scan_id": str,
  "table_name": str,
  "status": str,             # pass, fail, warn, error
  "timestamp": str,
  "checks_passed": int,
  "checks_failed": int,
  "checks_warned": int,
  "total_checks": int,
  "report_path": str,
  "anomalies": List[Dict],
  "profile": Dict
}
````

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Database connection failed |

**Error Response Format:**
````json
{
  "detail": "Error message description",
  "status_code": 400,
  "timestamp": "2026-03-31T10:00:00Z"
}
````

---

## Code Examples

### Python
````python
import requests

# Run a scan
response = requests.post('http://localhost:8000/api/scan', json={
    "table_name": "customers",
    "csv_path": "data/customers.csv"
})

result = response.json()
print(f"Scan {result['scan_id']}: {result['status']}")
````

### PowerShell
````powershell
$body = @{
    table_name = "customers"
    csv_path = "data/customers.csv"
} | ConvertTo-Json

Invoke-RestMethod -Method Post ``
    -Uri "http://localhost:8000/api/scan" ``
    -Body $body ``
    -ContentType "application/json"
````

### cURL
````bash
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "table_name": "customers",
    "csv_path": "data/customers.csv"
  }'
````

---

**For interactive API testing, visit:** http://localhost:8000/docs (Swagger UI)

"@
    
    return $content
}

# Generate Component Documentation
function Generate-ComponentDocs {
    param([string]$Version)
    
    Write-Host "📚 Generating Component Documentation..." -ForegroundColor Green
    
    # Core Components
    $scanner = Get-ClassStructure "$SrcDir/core/scanner.py"
    $profiler = Get-ClassStructure "$SrcDir/core/profiler.py"
    $anomaly = Get-ClassStructure "$SrcDir/core/anomaly_detector.py"
    
    # Storage Components
    $postgres = Get-ClassStructure "$SrcDir/storage/postgres_repository.py"
    $cosmos = Get-ClassStructure "$SrcDir/storage/cosmos_repository.py"
    
    $content = @"
# Component Reference

> **Version:** $Version | **Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Architecture Overview

````
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
````

---

## Core Components

"@
    
    foreach ($class in $scanner) {
        $content += @"

### $($class.Name)

**Purpose:** $($class.Description)

**Methods:**
"@
        foreach ($method in $class.Methods) {
            $content += "`n- ``$method()``"
        }
        $content += "`n`n"
    }
    
    $content += @"

## Storage Components

### PostgreSQLRepository
Primary storage backend for scan history and trends.

**Key Methods:**
- ``save_scan_result()``: Store scan results
- ``get_scan_history()``: Retrieve historical scans
- ``get_trend_analysis()``: Calculate trends over time
- ``get_all_tables_summary()``: Dashboard summary data

### CosmosDBRepository (Optional)
Alternative storage backend for cloud-native deployments.

**Configuration:** Set ``USE_COSMOSDB=true`` in ``.env``

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

"@
    
    return $content
}

# Generate Quick Reference
function Generate-QuickReference {
    param([string]$Version)
    
    $content = @"
# Quick Reference Card

## 🚀 Start Platform
````powershell
.\quick-start.ps1
````

## 🌐 Access Points
- **Dashboard:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Health:** http://localhost:8000/api/health

## 📊 Run Scan (API)
````python
POST http://localhost:8000/api/scan
{
  "table_name": "customers",
  "csv_path": "data/customers.csv"
}
````

## 🔧 Configuration
Edit ``.env`` file:
````bash
# Database
POSTGRES_HOST=localhost
POSTGRES_DB=data_quality

# Alerts
ENABLE_EMAIL_ALERTS=true
SMTP_SERVER=smtp.gmail.com

# API
API_PORT=8000
````

## 📁 Directory Structure
````
src/
├── api/           # FastAPI server
├── core/          # Scanner, profiler, anomaly detection
├── storage/       # PostgreSQL, Cosmos DB
├── notifications/ # Alerting service
└── reporting/     # HTML report generator

data/              # CSV input files (read-only in container)
reports/           # HTML reports (writable)
logs/              # Application logs (writable)
````

## 🐳 Docker Commands
````bash
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
````

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
*Generated: $(Get-Date -Format "yyyy-MM-dd")* | *Version: $Version*
"@
    
    return $content
}

# Main execution
try {
    $version = Get-ProjectVersion
    Write-Host "📦 Project Version: $version" -ForegroundColor Yellow
    Write-Host ""
    
    # Ensure docs directory exists
    if (-not (Test-Path $DocsDir)) {
        New-Item -ItemType Directory -Path $DocsDir | Out-Null
    }
    
    # Generate API Reference
    $apiRefContent = Generate-APIReference -Version $version
    $apiRefContent | Out-File -FilePath $OutputFile -Encoding UTF8
    Write-Host "✅ Generated: $OutputFile" -ForegroundColor Green
    
    # Generate Component Documentation
    $componentContent = Generate-ComponentDocs -Version $version
    $componentContent | Out-File -FilePath "$DocsDir/COMPONENTS.md" -Encoding UTF8
    Write-Host "✅ Generated: $DocsDir/COMPONENTS.md" -ForegroundColor Green
    
    # Generate Quick Reference
    $quickRefContent = Generate-QuickReference -Version $version
    $quickRefContent | Out-File -FilePath "$DocsDir/QUICK_REFERENCE.md" -Encoding UTF8
    Write-Host "✅ Generated: $DocsDir/QUICK_REFERENCE.md" -ForegroundColor Green
    
    # Update version in README
    if (Test-Path "README.md") {
        $readme = Get-Content "README.md" -Raw
        $readme = $readme -replace 'Version:\*\*\s+\d+\.\d+\.\d+', "Version:** $version"
        $readme = $readme -replace 'Generated:\*\*\s+\d{4}-\d{2}-\d{2}', "Generated:** $(Get-Date -Format 'yyyy-MM-dd')"
        $readme | Out-File -FilePath "README.md" -Encoding UTF8
        Write-Host "✅ Updated: README.md (version stamp)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "🎉 Documentation generation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Generated files:" -ForegroundColor Cyan
    Write-Host "  - docs/API_REFERENCE.md" -ForegroundColor White
    Write-Host "  - docs/COMPONENTS.md" -ForegroundColor White
    Write-Host "  - docs/QUICK_REFERENCE.md" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Tip: Add this script to your pre-commit hook for automatic updates" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}
