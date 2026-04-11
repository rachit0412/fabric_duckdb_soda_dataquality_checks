# 📖 Operations Runbook

**Version:** 1.0.0  
**Updated:** 2026-04-11  
**Audience:** DevOps, Site Reliability Engineers, Operations Teams

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Incident Response](#incident-response)
3. [Common Tasks](#common-tasks)
4. [Troubleshooting](#troubleshooting)
5. [Monitoring Dashboard](#monitoring-dashboard)
6. [Escalation Procedures](#escalation-procedures)

---

## Daily Operations

### Morning Checklist

**Time: 09:00 AM**

```bash
# 1. Verify all services are running
docker compose ps
# Expected: All services in "Up" state

# 2. Check health endpoints
curl http://localhost:8000/health
# Expected: {"status": "ok", "version": "1.0.0", "database": "connected"}

# 3. Monitor resource usage
docker stats --no-stream

# 4. Check for errors in overnight logs
docker compose logs --since 12h | grep ERROR

# 5. Verify database connectivity
docker exec dq-postgres psql -U postgres data_quality -c "SELECT 1;"
```

### Backup Operations

**Time: 02:00 AM (automated) + Manual backup on urgent updates**

```bash
# Manual backup (before major changes)
docker exec dq-postgres pg_dump -U postgres data_quality | \
  gzip > ./backups/backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Verify backup was created
ls -lh ./backups/ | head -5

# Upload to cloud storage (optional)
aws s3 cp ./backups/backup-*.sql.gz s3://my-backup-bucket/dq-platform/

# List recent backups
ls -lt ./backups/ | head -10
```

### Database Maintenance

**Time: Sunday 23:00 (weekly)**

```bash
# 1. Vacuum and analyze (runs overnight)
docker exec dq-postgres psql -U postgres data_quality -c "VACUUM ANALYZE;"

# 2. Reindex if necessary (runs overnight)
docker exec dq-postgres psql -U postgres data_quality -c "REINDEX DATABASE data_quality CONCURRENTLY;"

# 3. Check for unused indexes
docker exec dq-postgres psql -U postgres data_quality << 'EOF'
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
EOF

# 4. Monitor table sizes growth
docker exec dq-postgres psql -U postgres data_quality << 'EOF'
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
EOF
```

### Log Rotation

```bash
# Check log sizes
du -sh logs/*

# Archive old logs (>30 days)
find logs/ -name "*.log" -mtime +30 -exec gzip {} \;

# Upload archived logs to S3
aws s3 sync logs/archive/ s3://my-log-bucket/dq-platform/logs/
```

---

## Incident Response

### P1: API Down / Services Not Running

**SLA: Restore within 30 minutes**

```bash
# STEP 1: Triage (1 min)
echo "=== CHECK SERVICE STATUS ==="
docker compose ps
docker compose logs --tail 50

# STEP 2: Identify the issue
if docker ps | grep -q "Exited"; then
  echo "SERVICES CRASHED - Check logs:"
  docker compose logs | tail -100 | grep ERROR
fi

# STEP 3: Quick fix attempts
# Attempt 1: Restart services
docker compose restart

# Wait 60 seconds for startup
sleep 60

# Check health
curl http://localhost:8000/health

# If still down, move to STEP 4
if [ $? -ne 0 ]; then
  echo "RESTART FAILED - Moving to recovery"
  
  # STEP 4: Stop and do full recovery
  docker compose down
  
  # Check for corrupted database
  docker compose up -d postgres
  sleep 20
  docker exec dq-postgres pg_isready -U postgres
  
  # Restore from backup if needed
  echo "RESTORING DATABASE FROM BACKUP if available"
  
  docker compose up -d
  sleep 30
  
  # Verify health
  curl http://localhost:8000/health
fi
```

**Escalation:**
- If health check still fails after 15 min: Page on-call engineer
- If database is corrupted: Restore from backup (documented in DATABASE.md)

### P2: High API Latency (>10 seconds)

**SLA: Investigate within 5 minutes**

```bash
# STEP 1: Check resource usage
echo "=== RESOURCE USAGE ==="
docker stats --no-stream

# If CPU or memory > 90%:
# - Check for runaway processes
ps aux | grep -E "python|node" | sort -k3 -rn | head -10

# STEP 2: Check database performance
echo "=== SLOW DATABASE QUERIES ==="
docker exec dq-postgres psql -U postgres data_quality -c \
  "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# STEP 3: Check for hanging connections
echo "=== DATABASE CONNECTIONS ==="
docker exec dq-postgres psql -U postgres data_quality -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# STEP 4: Check running jobs
echo "=== ACTIVE CHECK EXECUTIONS ==="
docker exec dq-postgres psql -U postgres data_quality -c \
  "SELECT id, status, started_at FROM runs WHERE status IN ('pending', 'running') LIMIT 10;"

# STEP 5: Mitigation
# Kill slow queries if necessary
# docker exec dq-postgres psql -U postgres data_quality -c \
#   "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query_start < NOW() - INTERVAL '5 minutes';"

# Scale if necessary
# docker service scale dq-platform_data-quality-api=3

# Monitor after fix
watch -n 5 'curl -s http://localhost:8000/health | jq'
```

### P3: Database Disk Space Full

**SLA: Mitigate within 30 minutes**

```bash
# STEP 1: Check disk usage
echo "=== DISK USAGE ==="
df -h /data

# STEP 2: Identify large tables
echo "=== LARGEST TABLES ==="
docker exec dq-postgres psql -U postgres data_quality << 'EOF'
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
EOF

# STEP 3: Archive old data
# Option A: Archive check results older than 90 days
docker exec dq-postgres psql -U postgres data_quality << 'EOF'
-- Create archive table
CREATE TABLE check_results_archive AS
SELECT * FROM check_results
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete from main table
DELETE FROM check_results
WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum to reclaim space
VACUUM ANALYZE;
EOF

# Option B: Manual vacuum
docker exec dq-postgres psql -U postgres data_quality -c "VACUUM FULL;"

# STEP 4: Monitor recovery
df -h /data
```

### P4: Data Corruption / Query Failures

**SLA: Restore from backup within 1 hour**

```bash
# STEP 1: Verify data integrity
echo "=== CHECK DATA INTEGRITY ==="
docker exec dq-postgres psql -U postgres data_quality << 'EOF'
-- Check for orphaned records
SELECT 'check_plans without connection' as issue, COUNT(*) as count
FROM check_plans cp
LEFT JOIN connections c ON cp.connection_id = c.id
WHERE c.id IS NULL;

SELECT 'runs without check_plan' as issue, COUNT(*) as count
FROM runs r
LEFT JOIN check_plans cp ON r.check_plan_id = cp.id
WHERE cp.id IS NULL;
EOF

# STEP 2: If corruption detected, restore from backup
echo "=== RESTORE FROM BACKUP ==="
# List available backups
ls -lt ./backups/ | head -5

# STEP 3: Perform restore
BACKUP_FILE=$(ls -t ./backups/*.sql.gz | head -1)
echo "Restoring from: $BACKUP_FILE"

# Stop services
docker compose down

# Restore database
gunzip -c $BACKUP_FILE | \
  docker exec -i dq-postgres psql -U postgres data_quality

# Restart services
docker compose up -d

# Verify restoration
sleep 30
curl http://localhost:8000/health
```

---

## Common Tasks

### Add a New Data Source

```bash
# 1. Verify connectivity (if remote database)
psql -h <HOST> -U <USER> -d <DATABASE> -c "SELECT 1;"

# 2. Register via API
curl -X POST http://localhost:8000/api/v1/connections/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-new-source",
    "type": "postgres",
    "remote_url": "postgresql://user:pass@host:5432/database"
  }'

# 3. Test connection
curl -X POST http://localhost:8000/api/v1/connections/{connection_id}/test

# 4. Profile metadata (extract schema)
curl -X POST http://localhost:8000/api/v1/metadata/profile \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "{connection_id}",
    "dataset_identifier": "table_name"
  }'
```

### Disable / Archive Old Data Sources

```bash
# Soft delete: Mark as disabled (doesn't break historical data)
docker exec dq-postgres psql -U postgres data_quality << 'EOF'
UPDATE connections
SET updated_at = NOW()
WHERE name = 'old-source-name';

DELETE FROM connections
WHERE name = 'old-source-name';
EOF

# Note: This cascades to:
# - Metadata snapshots
# - Check plans
# - Runs and results (all preserved for audit trail)
```

### Rerun a Failed Check

```bash
# 1. Get the failed run ID
docker exec dq-postgres psql -U postgres data_quality << 'EOF'
SELECT id, check_plan_id, error_message
FROM runs
WHERE status = 'failed'
ORDER BY created_at DESC LIMIT 1;
EOF

# 2. Get the check plan
RUN_ID="<id-from-step-1>"
CHECK_PLAN_ID=$(docker exec dq-postgres psql -U postgres data_quality -t -c \
  "SELECT check_plan_id FROM runs WHERE id = '$RUN_ID';")

# 3. Re-execute the check
curl -X POST http://localhost:8000/api/v1/runs/ \
  -H "Content-Type: application/json" \
  -d "{\"check_plan_id\": \"$CHECK_PLAN_ID\"}"

# 4. Monitor progress
watch -n 5 "curl -s http://localhost:8000/api/v1/runs/<new-run-id> | jq '.status'"
```

### Export Results for Analysis

```bash
# Export as CSV
docker exec dq-postgres psql -U postgres data_quality -c \
  "COPY (
    SELECT r.id, r.status, cr.check_name, cr.status as check_status, cr.created_at
    FROM runs r
    LEFT JOIN check_results cr ON r.id = cr.run_id
    WHERE r.created_at > NOW() - INTERVAL '7 days'
    ORDER BY r.created_at DESC
  ) TO STDOUT WITH CSV HEADER" > results-7days.csv

# Export as JSON
docker exec dq-postgres psql -U postgres data_quality -c \
  "SELECT (row_to_json(t.*))::text FROM (
    SELECT r.*, json_agg(cr.*) as results
    FROM runs r
    LEFT JOIN check_results cr ON r.id = cr.run_id
    WHERE r.created_at > NOW() - INTERVAL '7 days'
    GROUP BY r.id
  ) t;" > results-7days.json
```

---

## Troubleshooting

### Error: "Database connection refused"

```bash
# 1. Verify postgres is running
docker compose ps postgres

# 2. If not running, start it
docker compose up -d postgres

# 3. Wait for it to be ready
docker exec dq-postgres pg_isready -U postgres

# 4. Verify credentials in docker-compose.yml
docker compose config | grep -A 5 "POSTGRES_"

# 5. Test manual connection
docker exec dq-postgres psql -U postgres -d data_quality -c "SELECT 1;"
```

### Error: "API requests timeout after 60 seconds"

```bash
# 1. Check if checks are running
docker exec dq-postgres psql -U postgres data_quality -c \
  "SELECT id, status, started_at FROM runs WHERE status = 'running';"

# 2. If check was running for >2 hours, something is stuck
docker exec dq-postgres psql -U postgres data_quality -c \
  "UPDATE runs SET status = 'failed', error_message = 'Timeout'
   WHERE status = 'running' AND started_at < NOW() - INTERVAL '2 hours';"

# 3. Check for database locks
docker exec dq-postgres psql -U postgres data_quality -c \
  "SELECT pid, mode, blocking_pids FROM pg_locks;"

# 4. If necessary, kill the long-running query
docker exec dq-postgres psql -U postgres data_quality -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE query_start < NOW() - INTERVAL '30 minutes';"
```

### Error: "Duplicate key value violates unique constraint"

```bash
# 1. Identify the constraint
# Example: UNIQUE (connection_id, dataset_identifier, version)

# 2. Check existing data
docker exec dq-postgres psql -U postgres data_quality -c \
  "SELECT connection_id, dataset_identifier, version, COUNT(*)
   FROM metadata_snapshots
   GROUP BY connection_id, dataset_identifier, version
   HAVING COUNT(*) > 1;"

# 3. Delete duplicates (keep most recent)
docker exec dq-postgres psql -U postgres data_quality << 'EOF'
DELETE FROM metadata_snapshots
WHERE id NOT IN (
  SELECT MAX(id)
  FROM metadata_snapshots
  GROUP BY connection_id, dataset_identifier, version
);
EOF
```

### Error: "File uploaded exceeds maximum size (100MB)"

```bash
# Option 1: Use streaming API (for large files)
# Split file and upload in chunks (TODO: implement in v1.1)

# Option 2: Increase limit in .env
MAX_UPLOAD_SIZE_MB=500
# Restart API: docker compose restart data-quality-api

# Option 3: Upload to external storage and register connection
# aws s3 cp large-file.csv s3://my-bucket/
# Register as remote PostgreSQL / S3 connection
```

### API responds but frontend doesn't load

```bash
# 1. Check CORS configuration
curl -I -H "Origin: http://localhost:3000" http://localhost:8000/

# 2. Check frontend build
docker compose logs frontend | tail -50

# 3. Verify frontend can reach API
docker exec -it frontend curl http://localhost:8000/health

# 4. Check console errors (browser DevTools)
# Open http://localhost:3000 and check Console tab

# 5. If 404 on assets, rebuilding frontend may help
docker compose restart frontend
```

---

## Monitoring Dashboard

### Real-Time Monitoring

```bash
# Watch service health (updates every 5 seconds)
watch -n 5 'curl -s http://localhost:8000/health | jq'

# Watch resource usage
watch -n 5 'docker stats --no-stream'

# Watch running checks
watch -n 5 'docker exec dq-postgres psql -U postgres data_quality -c \
  "SELECT id, status, started_at, NOW() - started_at as duration 
   FROM runs WHERE status IN (\"running\", \"pending\") 
   ORDER BY started_at DESC LIMIT 5;"'
```

### Prometheus Metrics (if enabled)

```bash
# Metrics available at:
# http://localhost:8000/metrics

# Sample key metrics:
# api_requests_total - Total API requests
# api_request_duration_seconds - Request latency
# database_connections - Active connections
# check_execution_duration_seconds - Check execution time

# Scrape metrics for local analysis
curl http://localhost:8000/metrics > metrics-$(date +%Y%m%d-%H%M%S).txt
```

---

## Escalation Procedures

### Escalation Decision Tree

```
Issue Detected
    │
    ├─ Can restart service in 2 min? ──→ YES ──→ Restart & monitor
    │                                      │
    │                                      └─→ Is health check green? ──→ YES ──→ All Clear
    │                                                                       │
    │                                                                       └─→ NO ──→ Continue to Step 2
    │
    └─ NO ──→ Step 1: Check logs + identify root cause (5 min max)
                   │
                   ├─ Database issue? ──→ Check DB health, run REPAIR command
                   ├─ Disk space? ──→ Archive data, expand volume
                   ├─ Memory leak? ──→ Restart service, monitor memory
                   └─ Unknown? ──→ Escalate to L2

    Step 2: If not resolved in 10 min ──→ Page L2/On-Call Engineer
           (Send: Issue summary + logs + diagnostic output)

    Step 3: If not resolved in 30 min ──→ Page Team Lead / SRE
           (Send: Same + attempted fixes + current status)
```

### Emergency Contact

```
L1 Support: On-Call Rotation
Phone: +1 (XXX) XXX-XXXX
Slack: #data-quality-incidents

L2 Backend Engineer
Phone: +1 (XXX) XXX-XXXX
Slack: @backend-oncall

L3 SRE Lead
Phone: +1 (XXX) XXX-XXXX
Slack: @sre-lead

Page via: PagerDuty (escalation policy: DataQuality-Support)
```

---

**Last Updated:** 2026-04-11  
**Maintained By:** Operations Team  
**Next Review:** 2026-05-11
