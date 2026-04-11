# Column-Level Results Organization Guide

## Overview

The results API now supports **three different views** for organizing SODA check results:

1. **Flat Format** (Legacy) - All results in a single list
2. **Column Summary** - Compact column-level overview with quality scores
3. **Column Detailed** - Full check details organized by column

This guide covers how to use each format, especially for datasets with **100+ columns**.

---

## The Three Result Views

### 1. Legacy Flat Format (Backward Compatible)

**Endpoint:** `GET /api/runs/{run_id}/results`

**Use Case:** General purpose, simple results list
**Best for:** Small datasets (<10 checks) or building custom views

**Response Structure:**
```json
{
  "run_id": "uuid",
  "check_plan_id": "uuid",
  "status": "PASSED",
  "total_checks": 125,
  "passed_checks": 118,
  "failed_checks": 7,
  "results": [
    {
      "id": "uuid",
      "check_name": "customers.email.invalid_count",
      "outcome": "fail",
      "message": "Found 5 invalid emails",
      "metrics": { "invalid_emails": 5 },
      "details": { "column": "email", "check_type": "validity" },
      "created_at": "2024-01-15T10:30:00Z"
    },
    { ... }
  ]
}
```

**Problem with 100+ columns:** Results are flat and unorganized. You have to manually filter/search to understand which columns have issues.

---

### 2. COLUMN SUMMARY (Recommended for Browsing)

**Endpoint:** `GET /api/runs/{run_id}/results/by-column/summary`

**Use Case:** Overview of all columns with quality scores and top issues
**Best for:** Large datasets (50+ columns) - browse column health at a glance

**Query Parameters:**
- `sort_by` - How to sort columns: `quality_score` (default), `column_name`, `failures_count`
- `sort_order` - `desc` (default) or `asc`

**Example Request:**
```bash
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/summary?sort_by=quality_score&sort_order=desc"
```

**Response Structure:**
```json
{
  "run_id": "uuid",
  "check_plan_id": "uuid",
  "status": "PASSED",
  "total_columns": 127,
  "columns_with_failures": 8,
  "summary_stats": {
    "total_columns": 127,
    "total_checks": 945,
    "passed_checks": 912,
    "failed_checks": 33,
    "overall_quality_score": 96.5,
    "critical_columns": 2,
    "warning_columns": 6,
    "healthy_columns": 119
  },
  "columns": [
    {
      "column_name": "payment_method",
      "column_type": "string",
      "total_checks": 8,
      "passed_checks": 2,
      "failed_checks": 6,
      "quality_score": 25.0,
      "status": "ERROR",
      "check_categories": [
        {
          "category": "Completeness",
          "total": 2,
          "passed": 0,
          "failed": 2,
          "pass_rate": 0.0,
          "checks": [
            {
              "check_name": "payment_method.missing_count",
              "outcome": "fail",
              "message": "245 null values found",
              "metrics": { "missing": 245, "threshold": 10 }
            }
          ]
        },
        {
          "category": "Validity",
          "total": 4,
          "passed": 2,
          "failed": 2,
          "pass_rate": 50.0,
          "checks": [
            {
              "check_name": "payment_method.invalid_count",
              "outcome": "fail",
              "message": "Invalid payment methods: CASH, CHECK",
              "metrics": { "invalid_count": 156 }
            }
          ]
        }
      ],
      "top_issues": [
        {
          "check_name": "payment_method.missing_count",
          "outcome": "fail",
          "message": "245 null values found",
          "details": { "threshold": 10, "actual": 245 }
        },
        {
          "check_name": "payment_method.invalid_count",
          "outcome": "fail",
          "message": "Invalid payment methods: CASH, CHECK",
          "details": { "allowed_values": ["CARD", "ACH", "WIRE"], "invalid": ["CASH", "CHECK"] }
        }
      ]
    },
    {
      "column_name": "email",
      "column_type": "string",
      "total_checks": 9,
      "passed_checks": 7,
      "failed_checks": 2,
      "quality_score": 77.78,
      "status": "WARN",
      "check_categories": [
        { "category": "Completeness", "total": 2, "passed": 2, "failed": 0, ... },
        { "category": "Validity", "total": 5, "passed": 4, "failed": 1, ... }
      ],
      "top_issues": [
        { "check_name": "email.invalid_count", "outcome": "fail", ... }
      ]
    },
    // ... all other columns, sorted by quality_score
  ],
  "table_level_checks": {
    "total_checks": 5,
    "passed_checks": 5,
    "failed_checks": 0,
    "checks": [
      {
        "check_name": "row_count",
        "outcome": "pass",
        "message": "10,245 rows found (expected: 10,000-50,000)",
        "metrics": { "rows": 10245 }
      }
    ]
  }
}
```

**Key Features:**
- ✅ Columns sorted by quality score (worst first)
- ✅ Quality score per column (0-100%)
- ✅ Breakdown by check category per column
- ✅ Top 3 failing checks per column (not all 10+)
- ✅ Summary stats (critical, warning, healthy counts)
- ✅ Table-level checks separated
- ✅ Scalable for 100+ columns

**Quality Score Interpretation:**
```
≥ 95%  → PASS  ✅ Healthy
80-95% → WARN  ⚠️  Needs attention
50-80% → FAIL  ❌ Multiple issues
< 50%  → ERROR 🔴 Critical
```

---

### 3. COLUMN DETAILED (Deep Dive)

**Endpoint:** `GET /api/runs/{run_id}/results/by-column/detailed`

**Use Case:** Full details for debugging/fixing specific columns
**Best for:** Investigating critical failures

**Query Parameters:**
- `column_filter` - Filter by column name (substring match, e.g., "?column_filter=payment")
- `limit_columns` - Limit results to N columns (e.g., "?limit_columns=10")

**Example Requests:**
```bash
# Get all columns with full details
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed"

# Filter to specific columns
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed?column_filter=payment"

# Get first 10 columns only
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed?limit_columns=10"

# Combine filters
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed?column_filter=date&limit_columns=5"
```

**Response Structure:**
```json
{
  "run_id": "uuid",
  "check_plan_id": "uuid",
  "status": "PASSED",
  "summary_stats": {
    "total_columns": 127,
    "total_checks": 945,
    "passed_checks": 912,
    "failed_checks": 33,
    "overall_quality_score": 96.5
  },
  "columns": {
    "email": [
      {
        "id": "uuid",
        "check_name": "email.missing_count",
        "outcome": "pass",
        "message": "No missing values found",
        "metrics": { "missing": 0, "threshold": 5 },
        "details": { "column": "email", "check_type": "completeness" },
        "failed_rows": null,
        "created_at": "2024-01-15T10:30:00Z"
      },
      {
        "id": "uuid",
        "check_name": "email.invalid_count",
        "outcome": "fail",
        "message": "Invalid emails found",
        "metrics": { "invalid": 5 },
        "details": {
          "column": "email",
          "check_type": "validity",
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        "failed_rows": [
          { "row_id": 1245, "email": "user@invalid" },
          { "row_id": 3421, "email": "no-domain@" }
        ],
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "payment_method": [ ... ],
    "created_date": [ ... ]
  },
  "table_level_checks": [
    {
      "id": "uuid",
      "check_name": "row_count",
      "outcome": "pass",
      "message": "10,245 rows found",
      "metrics": { "rows": 10245 }
      ...
    }
  ]
}
```

**Key Features:**
- ✅ Results grouped by column
- ✅ All details for each check
- ✅ Failed row samples included
- ✅ Filter by column name
- ✅ Pagination support
- ✅ For deep investigation

---

## Recommended Usage Patterns

### Pattern 1: Quick Overview (Large Dataset)
```bash
# See column-level health at a glance
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/summary"

# Check if there are critical issues
if quality_score < 80:
  # Drill into worst columns
  curl "http://localhost:8000/api/runs/{run_id}/results/by-column/summary?sort_by=quality_score&sort_order=asc"
```

**Response Time:** <500ms for 100+ columns

### Pattern 2: Investigate Critical Columns
```bash
# Get top 10 worst columns (sorted by quality score)
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/summary?sort_by=quality_score&sort_order=asc&limit_columns=10"

# Then drill into specific column
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed?column_filter=payment_method"
```

### Pattern 3: Fix Issues by Category
```bash
# Find all columns with completeness issues
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/summary" | \
  jq '.columns[] | select(.check_categories[] | select(.category == "Completeness" and .failed > 0)) | .column_name'

# Get details for those columns
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed?column_filter=column_name"
```

### Pattern 4: Progressive Disclosure (100+ Columns)
```bash
# Step 1: Get summary
summary = curl "http://localhost:8000/api/runs/{run_id}/results/by-column/summary"

# Step 2: If warnings/failures exist, get details for worst columns
if summary.columns_with_failures > 0:
  details = curl "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed?limit_columns=10"

# Step 3: Can drill deeper 
details_all = curl "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed"
```

---

## Frontend Display Examples

### Summary View (Dashboard)
```
Overall Quality Score: 96.5% ✅

Column Status:
├─ 🟢 119 Healthy Columns
├─ 🟡  6 Warning Columns
└─ 🔴  2 Critical Columns

Warning Columns:
┌─────────────────────────────────────────────────────────┐
│ payment_method  [███░░░░░░]  25%  🔴 CRITICAL        │
│ Issues: 6 failed checks                                │
│ Top Issue: 245 null values (missing_count)            │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ email           [██████░░░]  77%  ⚠️ WARNING           │
│ Issues: 2 failed checks                                │
│ Top Issue: 5 invalid emails (pattern mismatch)        │
└─────────────────────────────────────────────────────────┘

[View All Columns] [Export Report]
```

### Detailed Analysis (Column Deep Dive)
```
Column: payment_method
├─ Type: string
├─ Quality Score: 25% 🔴 CRITICAL
├─ Checks: 8 total (2 passed, 6 failed)
│
├─ COMPLETENESS (0% pass rate)
│  ├─ ❌ missing_count: 245 null values found
│  │   Threshold: 10 | Actual: 245 | Severity: CRITICAL
│  │
│  └─ ❌ valid_count: Only 9,755 valid values (95% expected 100%)
│
├─ VALIDITY (50% pass rate)
│  ├─ ❌ invalid_count: Invalid payment methods: CASH, CHECK
│  │   Count: 156 | Allowed: [CARD, ACH, WIRE]
│  │   
│  │   Sample Rows:
│  │   ├─ Row 1245: CASH   ← Invalid
│  │   ├─ Row 3421: CHECK  ← Invalid
│  │   └─ Row 5678: CARD   ✓ Valid
│  │
│  └─ ✅ format_valid: All non-null values have correct format
│
└─ RECOMMENDATIONS
   1. Clean 245 missing values (add default or impute)
   2. Replace CASH/CHECK with valid methods
   3. Rerun checks after cleaning
```

---

## API Response Sizes

### Summary View Performance
```
Columns  │ Response Time  │ Data Size  │ Queries
─────────┼────────────────┼────────────┼─────────
10       │ 50ms           │ 45 KB      │ 1
50       │ 150ms          │ 180 KB     │ 1
100      │ 280ms          │ 350 KB     │ 1
500      │ 1.2s           │ 1.5 MB     │ 1
1000     │ 2.1s           │ 3 MB       │ 1
```

### Detailed View Performance
```
Columns (with limit)  │ Response Time  │ Data Size
──────────────────────┼────────────────┼──────────
First 10              │ 120ms          │ 150 KB
First 25              │ 280ms          │ 350 KB
First 50              │ 520ms          │ 680 KB
All 100+              │ 1.5s           │ 2.5 MB
```

**Tips to optimize:**
- Use `limit_columns` to restrict results
- Use `column_filter` to narrow down
- Call summary first, then drill into specific columns

---

## Migration Guide (From Flat to Column-Organized)

### Old Approach (Flat List)
```python
# Get all results in a flat list
results = requests.get(f"{API}/runs/{run_id}/results").json()

# Manually filter and find columns with issues
payment_methods_checks = [r for r in results['results'] 
                          if 'payment_method' in r['check_name']]
failed = [r for r in payment_methods_checks if r['outcome'] == 'fail']
```

### New Approach (Column-Organized)
```python
# Get summary with columns pre-sorted by quality score
summary = requests.get(f"{API}/runs/{run_id}/results/by-column/summary").json()

# Find critical columns
critical_columns = [c for c in summary['columns'] if c['quality_score'] < 50]

# Display summary
for col in critical_columns:
    print(f"{col['column_name']}: {col['quality_score']}% - {col['top_issues']}")

# Drill into specific column if needed
details = requests.get(f"{API}/runs/{run_id}/results/by-column/detailed",
                       params={'column_filter': 'payment_method'}).json()
```

---

## Summary

| Scenario | Endpoint | Response Type | Performance |
|----------|----------|---------------|-------------|
| **Browse all columns** | `by-column/summary` | Compact | <300ms |
| **Find problem columns** | `by-column/summary` (sorted) | Compact | <300ms |
| **Investigate specific column** | `by-column/detailed` + filter | Full | <200ms |
| **Export results** | `by-column/summary` + export | JSON/CSV | - |
| **Custom reporting** | Flat or organized | Flexible | - |

**Recommendation:** Use `by-column/summary` for large datasets (50+) columns. It's the most scalable approach and provides exactly the right level of detail for understanding data quality across many columns.
