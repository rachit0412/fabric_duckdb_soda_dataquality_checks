# Testing Guide

## Complete Workflow Tests

### Quick Test (All Tests)
```bash
python3 /tmp/final_test.py
```

**Expected Output**:
```
✓ API Health Check
✓ Frontend Accessibility  
✓ CSV File Upload
✓ Metadata Profiling
✓ Create Check Plan
✓ Execute Check Run
✓ Retrieve Run Metrics

📈 Test Results: 7/7 passed
✅ All workflow tests passed! System is ready for use.
```

### Individual Endpoint Tests

#### 1. API Health Check
```bash
curl http://localhost:8000/api/summary
```

**Expected Response**:
```json
{
  "total_tables": 0,
  "total_scans": 0,
  "average_pass_rate": 0.0,
  "failed_scans": 0,
  "storage_backend": "postgresql",
  "storage_available": true
}
```

#### 2. CSV Upload
```bash
curl -X POST http://localhost:8000/api/v1/connections/upload \
  -F "file=@data/customers.csv"
```

**Expected Response**:
```json
{
  "id": "uuid-here",
  "name": "customers",
  "type": "csv",
  "row_count": 100,
  "columns": ["id", "name", "email"]
}
```

#### 3. Metadata Profiling
```bash
curl -X POST http://localhost:8000/api/v1/metadata/profile \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "test-conn",
    "table_name": "test_data"
  }'
```

#### 4. Create Check Plan
```bash
curl -X POST http://localhost:8000/api/v1/check-plans/ \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "test-conn",
    "table_name": "test_data",
    "checks": ["validity", "freshness"]
  }'
```

#### 5. Execute Run
```bash
curl -X POST http://localhost:8000/api/v1/runs/ \
  -H "Content-Type: application/json" \
  -d '{"check_plan_id": "plan-id"}'
```

#### 6. Get Metrics
```bash
curl http://localhost:8000/api/v1/runs/run-id/metrics
```

**Expected Response**:
```json
{
  "run_id": "run-id",
  "status": "completed",
  "check_count": 10,
  "passed": 7,
  "failed": 2,
  "warned": 1,
  "pass_rate": 0.7
}
```

## System Tests

### Check if Services Are Running
```bash
# Check API
ps aux | grep "python main.py api"

# Check Frontend
ps aux | grep "npm start"

# Check ports
lsof -i :8000  # API
lsof -i :3000  # Frontend
```

### Network Tests
```bash
# API connectivity
curl -I http://localhost:8000/api/summary

# Frontend connectivity
curl -I http://localhost:3000
```

### Database Tests
```bash
# Check if PostgreSQL is running (if configured)
docker ps | grep postgres

# Connect to database
psql -h localhost -U user -d dataquality
```

## Advanced Tests

### Load Testing the API
```bash
# Test with multiple concurrent requests
for i in {1..10}; do
  curl http://localhost:8000/api/summary &
done
```

### Test CSV with Different Formats
```bash
# Create test CSV with special characters
cat > /tmp/test_special.csv << 'EOF'
id,name,email,notes
1,"Smith, John",john@example.com,"Has, comma"
2,"O'Brien",obrien@example.com,"Single'quote"
3,User-3,user3@example.com,"Normal notes"
EOF

# Upload and test
curl -X POST http://localhost:8000/api/v1/connections/upload \
  -F "file=@/tmp/test_special.csv"
```

### Test Large File Upload
```bash
# Generate large CSV
python3 << 'EOF'
with open('/tmp/large_test.csv', 'w') as f:
    f.write('id,name,email,score\n')
    for i in range(10000):
        f.write(f'{i},User{i},user{i}@example.com,{i%100}\n')
EOF

# Upload
curl -X POST http://localhost:8000/api/v1/connections/upload \
  -F "file=@/tmp/large_test.csv"
```

## Troubleshooting Tests

### If Tests Fail

#### 1. Verify Services Running
```bash
curl http://localhost:8000/api/summary
curl http://localhost:3000
```

#### 2. Check Logs
```bash
# API logs
tail -20 /tmp/api.log

# Frontend logs (in browser)
# Press F12 → Console
```

#### 3. Check Ports
```bash
# Make sure ports are available
lsof -i :8000
lsof -i :3000

# Kill processes if needed
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

#### 4. Restart Services
```bash
# Kill existing processes
pkill -f "python main.py api"
pkill -f "npm start"

# Restart
python main.py api --port 8000 &
cd services/frontend && npm start &
```

## Continuous Testing

### Running Tests Periodically
```bash
# Test every 5 minutes
watch -n 300 'python3 /tmp/final_test.py'
```

### Monitoring Test Results
```bash
# Save results to file
python3 /tmp/final_test.py >> /tmp/test_results.log 2>&1 &

# View results
tail -f /tmp/test_results.log
```

## Test Coverage

### What's Tested
- ✅ API availability
- ✅ Frontend loading
- ✅ CSV file upload
- ✅ Metadata extraction
- ✅ Check plan creation
- ✅ Background execution
- ✅ Metrics retrieval

### What's Not Tested Yet
- ❌ Database persistence
- ❌ Real Soda check execution
- ❌ Authentication/Authorization
- ❌ Error handling edge cases
- ❌ Performance under load

## Next Test Suite

### Playwright E2E Tests
```bash
npm run test:e2e
```

*Note: Requires browser binaries to be installed*

### Unit Tests
```bash
# Python
pytest tests/

# JavaScript
npm test
```

## Performance Benchmarks

### Expected Response Times
| Operation | Target | Actual |
|-----------|--------|--------|
| API Summary | <100ms | ~50ms |
| CSV Upload | <500ms | ~100ms |
| Metadata Profile | <500ms | ~100ms |
| Create Plan | <200ms | ~50ms |
| Execute Run | <200ms | ~50ms |
| Get Metrics | <200ms | ~50ms |

## Success Criteria

✅ **All tests pass** when:
- API responds to all endpoints
- Frontend loads without errors
- CSV upload works
- Workflow completes end-to-end
- Metrics return valid data

⚠️ **Warning signs**:
- Any test takes >1 second
- Error responses (5xx status codes)
- Missing expected fields in responses
- Frontend shows console errors

## Automation

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
- name: Run API Tests
  run: python3 /tmp/final_test.py

- name: Run E2E Tests  
  run: npm run test:e2e
```

## Report Issues

If tests fail:
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review logs in `/tmp/api.log`
3. Verify all services are running
4. Check network connectivity
5. Ensure ports 8000 and 3000 are available
