# Quick Reference: Column-Level Results API

## Three Ways to Get Results

### 1️⃣ Old Flat Format (Unchanged)
```bash
GET /api/runs/{run_id}/results
```
**Returns:** All results in a flat list  
**Use:** Backward compatibility, custom filtering  
**Performance:** ~100-500ms depending on check count  

---

### 2️⃣ NEW - Column Summary (⭐ Recommended for Large Datasets)
```bash
GET /api/runs/{run_id}/results/by-column/summary
```

**Perfect for:** Seeing which columns need attention  
**Returns:** Column health scores, top 3 issues per column  
**Performance:** <300ms even for 1000+ columns  

**Example:**
```bash
# See all columns sorted by worst quality first
curl "http://localhost:8000/api/runs/abc-123/results/by-column/summary?sort_by=quality_score&sort_order=asc"
```

**Response includes:**
- ✅ Overall quality score (0-100%)
- ✅ Critical/Warning/Healthy column counts
- ✅ Quality score per column
- ✅ Check breakdown by category per column
- ✅ Top 3 failing checks per column

---

### 3️⃣ NEW - Column Detailed (Deep Investigation)
```bash
GET /api/runs/{run_id}/results/by-column/detailed
```

**Perfect for:** Debugging specific columns  
**Returns:** All check details grouped by column  
**Performance:** <200ms with filtering  

**Query Parameters:**
```bash
?column_filter=email          # Only show "email" column
?limit_columns=10             # Only show first 10 columns
?column_filter=date&limit_columns=5  # Combine filters
```

**Example:**
```bash
# Deep dive into email column
curl "http://localhost:8000/api/runs/abc-123/results/by-column/detailed?column_filter=email"
```

---

## Browser Quick View

### Show me the problem columns
```bash
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/summary?sort_by=quality_score&sort_order=asc"
```

Parse and display columns with `quality_score < 80`

### Show me all columns sorted alphabetically
```bash
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/summary?sort_by=column_name&sort_order=asc"
```

### Show me columns with most failures
```bash
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/summary?sort_by=failures_count&sort_order=desc"
```

---

## Response Structure

### Summary Endpoint Response
```json
{
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
      "column_name": "email",
      "quality_score": 77.78,
      "status": "WARN",
      "total_checks": 9,
      "passed_checks": 7,
      "failed_checks": 2,
      "check_categories": [
        {
          "category": "Completeness",
          "total": 2,
          "passed": 2,
          "failed": 0,
          "pass_rate": 100.0
        },
        {
          "category": "Validity",
          "total": 5,
          "passed": 4,
          "failed": 1,
          "pass_rate": 80.0
        }
      ],
      "top_issues": [
        {
          "check_name": "email.invalid_count",
          "outcome": "fail",
          "message": "5 invalid emails found"
        }
      ]
    },
    // ... more columns
  ]
}
```

### Detailed Endpoint Response
```json
{
  "summary_stats": { ... },
  "columns": {
    "email": [
      {
        "id": "uuid",
        "check_name": "email.invalid_count",
        "outcome": "fail",
        "message": "5 invalid emails found",
        "metrics": {"invalid": 5},
        "failed_rows": [
          {"row_id": 1245, "email": "user@invalid"},
          {"row_id": 3421, "email": "no-domain@"}
        ]
      },
      {
        "id": "uuid",
        "check_name": "email.missing_count",
        "outcome": "pass",
        "message": "No missing values"
      }
    ]
  }
}
```

---

## Status & Quality Score

```
Quality Score ≥ 95%   →  PASS   ✅ Healthy
Quality Score 80-95%  →  WARN   ⚠️  Attention needed
Quality Score 50-80%  →  FAIL   ❌ Multiple issues
Quality Score < 50%   →  ERROR  🔴 Critical
```

---

## Common Tasks

### Task 1: Find Columns with Issues
```bash
# Get summary
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/summary"

# Filter programmatically:
# columns_with_issues = [c for c in response['columns'] if c['quality_score'] < 80]
```

### Task 2: Get Details for One Column
```bash
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/detailed?column_filter=payment_method"
```

### Task 3: Show Top 10 Worst Columns
```bash
curl "http://localhost:8000/api/runs/{run_id}/results/by-column/summary?sort_by=quality_score&sort_order=asc&limit_columns=10"
```

### Task 4: Check Completeness Issues
```bash
# Get summary, filter to columns with Completeness failures
# Look at check_categories → find "Completeness" with failed > 0
```

### Task 5: Export Column Summary
```bash
# Get summary and convert to CSV
response = requests.get(f"{API}/runs/{run_id}/results/by-column/summary")
df = pd.DataFrame([
  {
    'column_name': c['column_name'],
    'quality_score': c['quality_score'],
    'status': c['status'],
    'total_checks': c['total_checks'],
    'failed_checks': c['failed_checks']
  }
  for c in response['columns']
])
df.to_csv('column_quality.csv')
```

---

## Performance Tips

| Need | Endpoint | Parameters | Speed |
|------|----------|-----------|-------|
| Browse 100+ cols | Summary | — | <300ms |
| Find worst cols | Summary | sort_by=quality_score | <300ms |
| Investigate col X | Detailed | column_filter=X | <200ms |
| Get first 10 cols | Summary | sort_by=quality_score&limit_columns=10 | <100ms |
| Export summaries | Summary | — | <500ms |

**Pro tips:**
- Always use Summary endpoint for first pass
- Use column_filter to narrow Detailed results
- Use limit_columns to paginate large results
- Sort by quality_score to prioritize fixes

---

## Backward Compatibility

✅ Old `/results` endpoint still works unchanged  
✅ Flat format available for existing integrations  
✅ New endpoints are additions, not replacements  
✅ Database schema unchanged  

---

## Example: Dashboard Integration

```javascript
// Fetch column summary
const response = await fetch(`/api/runs/${runId}/results/by-column/summary`);
const data = await response.json();

// Display stats
document.getElementById('overall-score').textContent = 
  data.summary_stats.overall_quality_score + '%';

// Display column health grid
const columns = data.columns
  .sort((a, b) => a.quality_score - b.quality_score)  // Worst first
  .slice(0, 10);  // Show top 10

columns.forEach(col => {
  const healthBar = createHealthBar(col.quality_score);
  addToGrid(col.column_name, col.status, healthBar, col.top_issues);
});
```

---

## Summary

| View | Endpoint | Use | Speed |
|------|----------|-----|-------|
| **Flat** | `/results` | Custom logic | Variable |
| **Summary** ⭐ | `/results/by-column/summary` | Dashboard/Overview | <300ms |
| **Detailed** | `/results/by-column/detailed` | Investigation | <200ms |

**For 100+ columns:** Use Summary endpoint with sorting/filtering. It's optimized for browsing large schemas.
