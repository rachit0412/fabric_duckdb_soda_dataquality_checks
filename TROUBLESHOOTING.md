# Troubleshooting Guide

**Version:** 1.0.1 | **Last Updated:** 2026-04-01

## Common Issues & Solutions

### Issue: "Scan is not working"

**Symptoms:**
- File uploads but scan doesn't execute
- No results shown after clicking "Run Scan"
- API returns no data or error

**Root Causes & Solutions:**

#### 1. Docker Container Configuration Path Issue
**Error:** `Path "/lakehouse/default/Files/soda_duckdb/checks.yml" does not exist`

**Fix:** Ensure `docker-compose.yml` has correct environment variables:
```yaml
environment:
  LAKEHOUSE_PATH: /app
  SODA_CONFIG_PATH: /app/soda_duckdb/config.yml
  SODA_CHECKS_PATH: /app/soda_duckdb/checks.yml
```

**Action:**
```bash
# Check current environment
docker exec dq-platform-api env | grep SODA

# If incorrect, update docker-compose.yml and rebuild
docker compose down
docker compose up -d
```

#### 2. API Service Not Running or Unhealthy
**Error:** `curl: (7) Failed to connect to localhost port 8000`

**Check:**
```bash
# Verify container is running
docker ps | grep dq-platform-api

# Check service health
docker exec dq-platform-api curl http://localhost:8000/api/health

# View logs
docker logs dq-platform-api --tail 50
```

**Fix:**
```bash
# Restart API service
docker restart dq-platform-api

# Or full rebuild
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### 3. Database Connection Failed
**Error:** `SQLALCHEMY_WARN: Could not connect to postgres`

**Check:**
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker logs dq-postgres --tail 30

# Test connection
docker exec dq-postgres psql -U postgres -d data_quality -c "SELECT 1"
```

**Fix:**
```bash
# Restart database
docker restart dq-postgres

# Wait for it to be ready
sleep 5
docker compose up -d --no-deps dq-platform-api  # Restart API to reconnect
```

---

### Issue: "Old UI showing even after changes"

**Symptoms:**
- Made code changes but old interface still appears
- Button clicks don't work
- Old features still visible

**Root Causes & Solutions:**

#### 1. Browser Cache Issue
**Cache in browser memory and storage**

**Fix:**
```
Chrome/Edge:
- Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
- Select "All time"
- Check: Cookies, Cached images, Cached files
- Click "Clear data"

Firefox:
- Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
- Select "Everything"
- Click "Clear Now"

Safari:
- Preferences → Privacy
- Manage Website Data
- Click "Remove All"
```

Or use hard refresh:
```
Chrome/Edge/Firefox: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
Safari: Cmd+Option+R
```

#### 2. Container Build Outdated
**Old code still in Docker image**

**Fix:**
```bash
# Full rebuild without cache
docker compose down
docker compose build --no-cache
docker compose up -d

# Wait for services to start
sleep 30

# Clear browser cache (see above)
# Then refresh page
```

#### 3. Frontend Service Not Updated
**Check:**
```bash
# Verify frontend rebuilt
docker logs dq-platform-frontend | grep "npm build\|Compiled"

# Check running code version
curl -s http://localhost:3000 | grep -i "version\|data quality"
```

**Fix:**
```bash
# Rebuild just frontend
docker compose build --no-cache dq-platform-frontend
docker compose up -d dq-platform-frontend
```

---

### Issue: "File uploaded but results are empty"

**Symptoms:**
- File upload succeeds
- Scan shows "completed" status
- But results show 0 checks or no data

**Root Causes & Solutions:**

#### 1. CSV File Format Issue
**Problem:** CSV file incompatible or malformed

**Fix:**
```bash
# Verify CSV format
head -5 your_file.csv

# Expected format (header + data)
CustomerID,Name,Email,Age
1,John,john@example.com,30
2,Jane,jane@example.com,28
```

**Check file encoding:**
```bash
# Should be UTF-8
file your_file.csv

# Convert if needed
iconv -f ISO-8859-1 -t UTF-8 your_file.csv > your_file_utf8.csv
```

#### 2. No Quality Checks Selected
**Problem:** User didn't select any rules before scanning

**Fix:**
```
In the UI:
1. Go to "Select Rules" section
2. Check at least one rule (volume, completeness, etc.)
3. Verify it shows "X/5 selected"
4. Click "RUN SCAN"
```

#### 3. Soda Checks Configuration Missing/Invalid
**Check:**
```bash
# Verify checks file exists in container
docker exec dq-platform-api ls -la /app/soda_duckdb/checks.yml

# View contents
docker exec dq-platform-api cat /app/soda_duckdb/checks.yml
```

**Fix:**
```bash
# Rebuild to copy files fresh
docker compose down
docker compose build --no-cache
docker compose up -d

# Verify
docker exec dq-platform-api ls -la /app/soda_duckdb/
```

---

### Issue: "Port already in use"

**Symptoms:**
- `docker compose up` fails
- "Address already in use" error
- Cannot start containers

**Error Message:**
```
ERROR: bind: address already in use
```

**Fix:**

Option 1: Find and stop the process
```bash
# Linux/Mac - Find what's using port 8000
lsof -i :8000

# Kill the process (replace PID)
kill -9 <PID>
```

Option 2: Use different ports
Edit `docker-compose.yml`:
```yaml
ports:
  - "9000:8000"      # Use 9000 instead of 8000
  - "4000:3000"      # Use 4000 instead of 3000
  - "6432:5432"      # Use 6432 instead of 5432
```

Then access at:
- Frontend: http://localhost:4000
- API: http://localhost:9000

---

### Issue: "Freshness checks failing"

**Symptoms:**
- "Could not evaluate freshness: max(SignupDate) is not a datetime: str"
- Freshness checks always marked as failed

**Root Cause:**
Date columns stored as TEXT instead of DATETIME

**Fix:**

Option 1: Cast in CSV before upload
```bash
# Create new CSV with proper date format
# Ensure dates are in YYYY-MM-DD format
```

Option 2: Update Soda checks to handle text dates
Edit `soda_duckdb/checks.yml`:
```yaml
checks for customers:
  - freshness(SignupDate) > 30 days:
      valid format: "%Y-%m-%d"
```

Option 3: Skip freshness checks for now
Edit `soda_duckdb/checks.yml`:
Comment out freshness checks (prefix with `#`)

---

### Issue: "Database disk quota exceeded"

**Symptoms:**
- Scan fails after many iterations
- "Disk quota exceeded" error
- PostgreSQL won't store results

**Fix:**

Check disk space:
```bash
# Check container volume
docker exec dq-postgres df -h

# Or from host
df -h | grep postgres
```

Solutions:

1. **Clear old scans**
```bash
# Connect to database
docker exec -it dq-postgres psql -U postgres -d data_quality

# In psql:
DELETE FROM scan_results WHERE timestamp < NOW() - INTERVAL '30 days';
VACUUM;
```

2. **Increase volume size** (if using volumes)
```yaml
deploy:
  resources:
    limits:
      storage: 100GB  # Increase limit
```

3. **Clean up container logs**
```bash
# Docker cleanup
docker system prune

# Reduce log retention
# In docker-compose.yml:
logging:
  options:
    max-size: "5m"    # Smaller size
    max-file: "2"     # Fewer files
```

---

### Issue: "Memory usage very high"

**Symptoms:**
- System gets very slow during scans
- Docker container eats all available RAM
- "Out of memory" error

**Check Memory Usage:**
```bash
# Check container memory
docker stats dq-platform-api

# Check system memory
free -h  # Linux
vm_stat  # Mac
```

**Fix:**

1. **Set resource limits** in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G      # Limit to 2GB
    reservations:
      memory: 512M    # Reserve 512MB
```

2. **Restart and rebuild**
```bash
docker compose down
docker compose up -d
```

3. **Clear database cache**
```bash
docker exec dq-platform-api python -c "import gc; gc.collect()"
```

---

### Issue: "Frontend can't connect to API"

**Symptoms:**
- "Cannot connect to API" message in UI
- Status shows "⚠️ Offline"
- Network errors in browser console

**Check:**

```bash
# From browser console (F12)
fetch('http://localhost:8000/api/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

**Fix:**

1. **Check CORS settings**
Edit `src/api/server.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or list specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. **Verify API is running**
```bash
curl http://localhost:8000/api/health
```

3. **Check frontend configuration**
Edit `services/frontend/src/App.js`:
```javascript
const getApiUrl = () => {
  return process.env.REACT_APP_API_URL || 'http://localhost:8000';
};
```

---

## Debug Mode

### Enable Verbose Logging

**API:**
```bash
# In docker-compose.yml for API service:
environment:
  LOG_LEVEL: DEBUG
  PYTHONUNBUFFERED: 1
```

**Frontend:**
```bash
# In services/frontend/.env:
REACT_APP_DEBUG=true
```

**View logs:**
```bash
docker logs dq-platform-api -f  # Follow API logs
docker logs dq-platform-frontend -f  # Follow frontend logs
```

### Collect Diagnostics

```bash
# Save all logs for analysis
docker compose logs > logs.txt

# Docker system info
docker system info > docker-info.txt

# Container details
docker ps -a > containers.txt
docker images > images.txt

# File a bug with these files
```

---

## Performance Tips

1. **Limit CSV file size**: Keep under 100 MB for scans
2. **Select only needed rules**: Skip unused quality checks
3. **Clear old scans**: Delete results older than 30 days
4. **Optimize database**: Run `VACUUM` occasionally
5. **Monitor resources**: Use `docker stats` to track usage

---

## Still Stuck?

1. **Check logs:**
   ```bash
   docker logs dq-platform-api --tail 100
   docker logs dq-platform-frontend
   docker logs dq-postgres
   ```

2. **Verify configuration:**
   ```bash
   docker compose config | grep -A10 "environment:"
   ```

3. **Reset everything:**
   ```bash
   docker compose down -v  # Delete volumes
   docker compose build --no-cache
   docker compose up -d
   ```

4. **Check API docs:**
   ```
   http://localhost:8000/docs  # Swagger UI
   http://localhost:8000/redoc # ReDoc
   ```

5. **File an issue:**
   ```
   GitHub: https://github.com/rachit0412/fabric_duckdb_soda_dataquality_checks/issues
   Include:
   - Error message
   - Steps to reproduce
   - docker logs output
   - docker ps output
   ```

---

**Version:** 1.0.1  
**Last Updated:** 2026-04-01
