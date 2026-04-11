## Execution Engine (M4)

**Phase:** M4 (4 days) | **Status:** COMPLETE | **Commit:** [details below]

### Overview

M4 implements the **Execution Engine** for asynchronous check execution:

- **POST /runs/{check_plan_id}/execute** - Start background check execution
- **GET /runs/{run_id}/status** - Poll execution progress (non-blocking)
- **GET /runs/{run_id}/results** - Get aggregated pass/fail/warning results
- **GET /checks/{check_plan_id}/runs** - Execution history for check plan

### Architecture

#### Async Execution Model
```python
# Request: Queue execution (immediate return)
POST /runs/{check_plan_id}/execute
→ Creates Run record in PENDING state
→ Queues background task
→ Returns run_id for polling

# Poll for status (non-blocking)
GET /runs/{run_id}/status
→ Returns: status, percent_complete, duration_seconds

# Final results after completion
GET /runs/{run_id}/results
→ Returns: aggregated summary + individual check results
```

#### Result Aggregation
```json
{
  "summary": {
    "total_checks": 8,
    "passed": 7,
    "failed": 0,
    "warning": 1,
    "pass_rate_percent": 87.5
  }
}
```

### Key Implementation Details

#### Run Status States
- `pending`: Queued, waiting to start
- `running`: Currently executing checks
- `success`: All checks passed
- `failed`: One or more checks failed
- `warning`: Some checks with warnings
- `cancelled`: Manually cancelled

#### Background Job Execution
- Uses FastAPI `BackgroundTasks`
- Async/await pattern for non-blocking execution
- SessionLocal for background database access
- Simulated check execution (real Soda integration in production)

#### Result Storage
```sql
CREATE TABLE check_results (
  id UUID PRIMARY KEY,
  run_id UUID REFERENCES runs(id),
  check_name VARCHAR,
  check_type VARCHAR,
  status VARCHAR,  -- passed, failed, warning
  message TEXT,
  details JSONB,   -- full check output
  created_at TIMESTAMP
);
```

---

**Version:** 1.0.0  
**Last Updated:** 2026-04-11
