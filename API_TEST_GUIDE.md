# Column Results API - Test Guide

## Quick Start

### Prerequisites
```bash
# Start your API server
cd /workspaces/fabric_duckdb_soda_dataquality_checks
docker-compose up -d postgres
python backend/src/api/server.py  # or: uvicorn backend.src.api.server:app --reload

# Test that API is running
curl http://localhost:8000/api/health
```

---

## Test Scenario Setup

### 1. Create a Test Connection
```bash
curl -X POST http://localhost:8000/api/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_customers_db",
    "type": "postgres",
    "remote_url": "postgres://user:pass@localhost:5432/testdb"
  }'

# Response includes connection_id
```

### 2. Upload Test Data & Profile
```bash
curl -X POST http://localhost:8000/api/connections/{connection_id}/profile \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_name": "customers"
  }'

# Response includes metadata_snapshot_id
```

### 3. Create Check Plan
```bash
curl -X POST http://localhost:8000/api/check-plans \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Data Validation",
    "metadata_snapshot_id": "{metadata_snapshot_id}",
    "checks": [
      {
        "column": "email",
        "check_type": "missing_count",
        "threshold": 5
      },
      {
        "column": "email",
        "check_type": "invalid_count",
        "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
      },
      {
        "column": "payment_method",
        "check_type": "missing_count",
        "threshold": 10
      },
      {
        "column": "payment_method",
        "check_type": "validity_check",
        "allowed_values": ["CARD", "ACH", "WIRE"]
      },
      {
        "check_type": "row_count",
        "min": 1000,
        "max": 100000
      }
    ]
  }'

# Response includes check_plan_id
```

### 4. Execute Check Plan (Create Run)
```bash
curl -X POST http://localhost:8000/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "check_plan_id": "{check_plan_id}",
    "environment": "dev"
  }'

# Response includes run_id
```

---

## Test the New Endpoints

### TEST 1: Classic Flat Results (Baseline)

#### Request
```bash
curl -X GET http://localhost:8000/api/runs/{run_id}/results
```

#### Expected Response (partial)
```json
{
  "run_id": "uuid",
  "check_plan_id": "uuid",
  "status": "PASSED",
  "total_checks": 5,
  "passed_checks": 4,
  "failed_checks": 1,
  "results": [
    {
      "id": "uuid",
      "check_name": "email.missing_count",
      "outcome": "pass",
      "message": "No missing values",
      "metrics": {
        "missing": 0,
        "threshold": 5
      }
    },
    {
      "id": "uuid",
      "check_name": "email.invalid_count",
      "outcome": "fail",
      "message": "3 invalid emails found",
      "metrics": {
        "invalid": 3
      }
    },
    // ... more results
  ]
}
```

✅ **Verify:**
- [ ] Total 5 results in list
- [ ] Check names are present
- [ ] Outcomes are pass/fail
- [ ] Metrics are populated

---

### TEST 2: Column Summary (NEW - MAIN FEATURE)

#### Request
```bash
curl -X GET "http://localhost:8000/api/runs/{run_id}/results/by-column/summary"
```

#### Expected Response
```json
{
  "run_id": "uuid",
  "check_plan_id": "uuid",
  "status": "PASSED",
  "total_columns": 2,
  "columns_with_failures": 1,
  "summary_stats": {
    "total_columns": 2,
    "total_checks": 5,
    "passed_checks": 4,
    "failed_checks": 1,
    "overall_quality_score": 80.0,
    "critical_columns": 0,
    "warning_columns": 1,
    "healthy_columns": 1
  },
  "columns": [
    {
      "column_name": "email",
      "column_type": "string",
      "total_checks": 2,
      "passed_checks": 1,
      "failed_checks": 1,
      "quality_score": 50.0,
      "status": "FAIL",
      "check_categories": [
        {
          "category": "Completeness",
          "total": 1,
          "passed": 1,
          "failed": 0,
          "pass_rate": 100.0,
          "checks": [...]
        },
        {
          "category": "Validity",
          "total": 1,
          "passed": 0,
          "failed": 1,
          "pass_rate": 0.0,
          "checks": [...]
        }
      ],
      "top_issues": [
        {
          "check_name": "email.invalid_count",
          "outcome": "fail",
          "message": "3 invalid emails found",
          "details": {"invalid": 3}
        }
      ]
    },
    {
      "column_name": "payment_method",
      "total_checks": 2,
      "passed_checks": 2,
      "failed_checks": 0,
      "quality_score": 100.0,
      "status": "PASS",
      "check_categories": [...],
      "top_issues": null
    }
  ],
  "table_level_checks": {
    "total_checks": 1,
    "passed_checks": 1,
    "failed_checks": 0,
    "checks": [
      {
        "check_name": "row_count",
        "outcome": "pass",
        "message": "10,245 rows found"
      }
    ]
  }
}
```

✅ **Verify:**
- [ ] summary_stats contains totals
- [ ] overall_quality_score is 80 (4 passed / 5 total)
- [ ] 2 columns returned (email, payment_method)
- [ ] email has quality_score 50 (1/2 checks pass)
- [ ] payment_method has quality_score 100 (2/2 checks pass)
- [ ] email has "FAIL" status, payment_method has "PASS"
- [ ] email top_issues contains invalid_count failure
- [ ] Table-level checks are separated

#### Test Sorting

**By quality score (worst first):**
```bash
curl -X GET "http://localhost:8000/api/runs/{run_id}/results/by-column/summary?sort_by=quality_score&sort_order=asc"
```
✅ Verify: email (50%) comes before payment_method (100%)

**By column name:**
```bash
curl -X GET "http://localhost:8000/api/runs/{run_id}/results/by-column/summary?sort_by=column_name&sort_order=asc"
```
✅ Verify: email comes before payment_method alphabetically

**By failures count:**
```bash
curl -X GET "http://localhost:8000/api/runs/{run_id}/results/by-column/summary?sort_by=failures_count&sort_order=desc"
```
✅ Verify: email (1 failure) comes before payment_method (0 failures)

---

### TEST 3: Column Detailed (NEW - DEEP DIVE)

#### Request - Get All Columns
```bash
curl -X GET "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed"
```

#### Expected Response
```json
{
  "run_id": "uuid",
  "check_plan_id": "uuid",
  "status": "PASSED",
  "summary_stats": {
    "total_columns": 2,
    "total_checks": 5,
    "passed_checks": 4,
    "failed_checks": 1,
    "overall_quality_score": 80.0
  },
  "columns": {
    "email": [
      {
        "id": "uuid",
        "check_name": "email.missing_count",
        "outcome": "pass",
        "message": "No missing values",
        "metrics": {"missing": 0},
        "details": {"column": "email", "check_type": "completeness"},
        "failed_rows": null
      },
      {
        "id": "uuid",
        "check_name": "email.invalid_count",
        "outcome": "fail",
        "message": "3 invalid emails found",
        "metrics": {"invalid": 3},
        "details": {"column": "email", "check_type": "validity"},
        "failed_rows": [
          {"row_id": 1245, "email": "user@invalid"},
          {"row_id": 3421, "email": "no-domain@"},
          {"row_id": 5678, "email": "duplicate@@example.com"}
        ]
      }
    ],
    "payment_method": [
      {
        "id": "uuid",
        "check_name": "payment_method.missing_count",
        "outcome": "pass",
        "message": "No missing values",
        ...
      },
      {
        "id": "uuid",
        "check_name": "payment_method.validity_check",
        "outcome": "pass",
        "message": "All values in allowed list",
        ...
      }
    ]
  },
  "table_level_checks": [
    {
      "id": "uuid",
      "check_name": "row_count",
      "outcome": "pass",
      "message": "10,245 rows found"
    }
  ]
}
```

✅ **Verify:**
- [ ] Results organized by column name
- [ ] Each column has array of CheckResultResponse objects
- [ ] email has 2 results, payment_method has 2 results
- [ ] Invalid email rows show sample failing data
- [ ] Table-level checks are in separate array

#### Request - Filter by Column Name
```bash
curl -X GET "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed?column_filter=email"
```

✅ **Verify:**
- [ ] Only email column in response
- [ ] payment_method is not included

#### Request - Limit Columns
```bash
curl -X GET "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed?limit_columns=1"
```

✅ **Verify:**
- [ ] Only 1 column in response
- [ ] Other columns excluded

#### Request - Combine Filters
```bash
curl -X GET "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed?column_filter=payment&limit_columns=5"
```

✅ **Verify:**
- [ ] Only columns matching "payment" (case-insensitive)
- [ ] Limited to 5 results

---

## Performance Tests

### Test 1: Response Time for Summary
```bash
time curl "http://localhost:8000/api/runs/{run_id}/results/by-column/summary"
```

Expected: <300ms for 100+ columns

### Test 2: Response Time for Detailed (Limited)
```bash
time curl "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed?limit_columns=10"
```

Expected: <200ms with limit

### Test 3: Response Time for Detailed (All)
```bash
time curl "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed"
```

Expected: <1s for reasonable column count

---

## Error Handling Tests

### Test 1: Invalid Run ID
```bash
curl -X GET "http://localhost:8000/api/runs/invalid-uuid/results/by-column/summary"
```

Expected: 404 Not Found

### Test 2: No Results
```bash
# Create new run with empty check plan
curl -X POST http://localhost:8000/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "check_plan_id": "{empty_plan_id}",
    "environment": "test"
  }'

# Then query results
curl -X GET "http://localhost:8000/api/runs/{empty_run_id}/results/by-column/summary"
```

Expected: 
- 200 OK with empty columns array
- summary_stats all zeros

### Test 3: Valid Connection Error
```bash
curl -X GET "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed?column_filter=nonexistent"
```

Expected: 200 OK with empty columns dict

---

## Validation Checklist

### ✅ Code Quality
- [ ] Models validate without errors
- [ ] Endpoints parse correctly
- [ ] Helper functions are called
- [ ] Error handling works

### ✅ Functionality
- [ ] Summary endpoint returns column organization
- [ ] Quality score calculated correctly
- [ ] Check categories assigned properly
- [ ] Sorting works for all 3 options
- [ ] Filtering works (column_filter parameter)
- [ ] Limiting works (limit_columns parameter)

### ✅ Performance
- [ ] Summary <300ms
- [ ] Detailed <200ms with filtering
- [ ] Response sizes reasonable

### ✅ Backward Compatibility
- [ ] Flat endpoint still works
- [ ] Old clients unaffected
- [ ] Database unchanged

### ✅ Data Accuracy
- [ ] Quality scores correct
- [ ] Check counts correct
- [ ] Status badges correct
- [ ] Top issues identified properly

---

## Integration Test Script

```python
import requests
import json
from datetime import datetime

API_BASE = "http://localhost:8000/api"

def test_column_results(run_id):
    """Test all new column-level endpoints"""
    
    print(f"\n🧪 Testing Column Results API for run {run_id}")
    
    # Test 1: Summary
    print("\n1️⃣  Testing Summary Endpoint")
    response = requests.get(f"{API_BASE}/runs/{run_id}/results/by-column/summary")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    summary = response.json()
    
    print(f"   ✅ Total columns: {summary['total_columns']}")
    print(f"   ✅ Overall quality: {summary['summary_stats']['overall_quality_score']}%")
    print(f"   ✅ Critical columns: {summary['summary_stats']['critical_columns']}")
    
    # Test 2: Sorting
    print("\n2️⃣  Testing Sorting")
    response = requests.get(
        f"{API_BASE}/runs/{run_id}/results/by-column/summary",
        params={'sort_by': 'quality_score', 'sort_order': 'asc'}
    )
    assert response.status_code == 200
    sorted_summary = response.json()
    
    scores = [c['quality_score'] for c in sorted_summary['columns']]
    assert scores == sorted(scores), "Sort order incorrect"
    print(f"   ✅ Sorting by quality score: {scores[:3]}...")
    
    # Test 3: Detailed
    print("\n3️⃣  Testing Detailed Endpoint")
    response = requests.get(f"{API_BASE}/runs/{run_id}/results/by-column/detailed")
    assert response.status_code == 200
    detailed = response.json()
    
    print(f"   ✅ Total columns detailed: {len(detailed['columns'])}")
    
    # Test 4: Filtering
    print("\n4️⃣  Testing Column Filter")
    if detailed['columns']:
        first_col = list(detailed['columns'].keys())[0]
        response = requests.get(
            f"{API_BASE}/runs/{run_id}/results/by-column/detailed",
            params={'column_filter': first_col}
        )
        assert response.status_code == 200
        filtered = response.json()
        assert first_col in filtered['columns']
        print(f"   ✅ Filtered to column: {first_col}")
    
    # Test 5: Limiting
    print("\n5️⃣  Testing Limit Columns")
    response = requests.get(
        f"{API_BASE}/runs/{run_id}/results/by-column/detailed",
        params={'limit_columns': 2}
    )
    assert response.status_code == 200
    limited = response.json()
    assert len(limited['columns']) <= 2
    print(f"   ✅ Limited to {len(limited['columns'])} columns")
    
    print("\n✅ All tests passed!")

# Run tests
if __name__ == "__main__":
    run_id = "your-run-id-here"
    test_column_results(run_id)
```

---

## Troubleshooting

### Problem: Empty columns in response

**Solution:** Check if checks have column information in details

```python
# Verify check structure
result = db.query(CheckResult).first()
print(f"details: {result.details}")
# Should contain "column": "column_name"
```

### Problem: Wrong quality score

**Solution:** Verify calculation
```python
# Quality score should be (passed / total) * 100
passed = sum(1 for r in results if r.outcome == 'pass')
total = len(results)
expected_score = (passed / total) * 100
```

### Problem: Slow response time

**Solution:** Use filtering/limiting
```bash
# Instead of:
/results/by-column/detailed

# Use:
/results/by-column/detailed?limit_columns=10
/results/by-column/summary
```

---

## Next Steps

1. ✅ Run all tests above
2. ✅ Verify response structures match documentation
3. ✅ Test with your actual dataset
4. ✅ Integrate into dashboard
5. ✅ Monitor performance with real data
