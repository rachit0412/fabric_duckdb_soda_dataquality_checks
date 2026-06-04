# 🚀 Quick Setup with PostgreSQL

## 3-Minute Setup

### Step 1: Start PostgreSQL (Choose One)

#### Option A: Docker (Easiest)
```bash
docker run -d \
  --name postgres-dq \
    -e POSTGRES_PASSWORD=change-me-with-a-32-char-random-password \
  -e POSTGRES_DB=data_quality \
  -p 5432:5432 \
  postgres:16

# Verify it's running
docker ps | grep postgres-dq
```

#### Option B: Use Existing PostgreSQL
```bash
# Connect to your existing PostgreSQL server
# Just note the host, port, database, user, and password
```

---

### Step 2: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit .env and set:
STORAGE_BACKEND=postgresql
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=data_quality
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me-with-a-32-char-random-password
```

---

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

This installs PostgreSQL driver (psycopg2-binary) and other dependencies.

---

### Step 4: Test It!

```bash
# Run quick test
python test_quick.py
```

Expected output:
```
✅ PostgreSQL connected
✅ Schema initialized
✅ Scan completed
✅ Results saved to database
```

---

## ✅ Verify Setup

### Test Database Connection

```python
# test_postgres_connection.py
from src.storage.postgres_repository import PostgreSQLRepository

print("Testing PostgreSQL connection...")
repo = PostgreSQLRepository()

if repo.connection:
    print("✅ Connected to PostgreSQL!")
    print(f"   Database: {repo.config.database}")
    print(f"   Host: {repo.config.host}")
    
    # Test saving data
    # ... your scan result here
    
    # Test querying
    tables = repo.get_all_tables_summary()
    print(f"   Monitoring {len(tables)} tables")
    
    repo.close()
else:
    print("❌ Failed to connect")
    print("   Check your .env configuration")
```

Run:
```bash
python test_postgres_connection.py
```

---

## 🎯 Run Your First Scan

```bash
# Scan with database storage
python main.py scan --csv test_data.csv --table my_table --report report.html

# Check what was saved
python main.py history --table my_table

# View trends
python main.py trends --table my_table
```

---

## 📊 Query Your Data

### Using Python
```python
from src.storage.postgres_repository import PostgreSQLRepository

repo = PostgreSQLRepository()

# Get recent history
history = repo.get_scan_history("my_table", days=30)
print(f"Found {len(history)} scans")

# Get trends
trends = repo.get_trend_analysis("my_table", days=7)
print(f"Pass rate trend: {trends['trend']}")

# Get all monitored tables
summary = repo.get_all_tables_summary()
for table in summary:
    print(f"{table['table_name']}: {table['avg_pass_rate']:.1%}")

repo.close()
```

### Using SQL Directly
```bash
# Connect with psql
docker exec -it postgres-dq psql -U postgres -d data_quality

# Or use any PostgreSQL client
```

```sql
-- View all scans
SELECT scan_id, timestamp, table_name, status, pass_rate
FROM data_quality_scans
ORDER BY timestamp DESC
LIMIT 10;

-- Get average pass rate by table
SELECT 
    table_name,
    COUNT(*) as scan_count,
    AVG(pass_rate) as avg_pass_rate,
    MAX(timestamp) as last_scan
FROM data_quality_scans
GROUP BY table_name;

-- Find failing scans
SELECT *
FROM data_quality_scans
WHERE status = 'FAILED'
ORDER BY timestamp DESC;

-- Get trend for specific table
SELECT 
    DATE(timestamp) as scan_date,
    AVG(pass_rate) as daily_avg_pass_rate
FROM data_quality_scans
WHERE table_name = 'my_table'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY scan_date;
```

---

## 🔧 Troubleshooting

### "Connection refused"
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check port is accessible
telnet localhost 5432

# Check firewall rules
```

### "Authentication failed"
```bash
# Verify credentials in .env match what you set
# For Docker: check docker run command

# Reset Docker password
docker stop postgres-dq
docker rm postgres-dq
docker run -d --name postgres-dq -e POSTGRES_PASSWORD=newpass -p 5432:5432 postgres:16
```

### "Database does not exist"
```bash
# Create database manually
docker exec -it postgres-dq psql -U postgres -c "CREATE DATABASE data_quality;"

# Or let the app create it
# (it will create tables automatically)
```

---

## 🎊 You're Ready!

PostgreSQL is now configured and ready to track all your data quality scans:

- ✅ Historical tracking enabled
- ✅ Trend analysis available
- ✅ SQL queries for reporting
- ✅ Cost-effective solution
- ✅ Works anywhere (Docker, Azure, AWS, on-premise)

**Next Steps:**
1. Run scans on your real data
2. View trends over time
3. Build dashboards with the data
4. Set up automated scheduling

---

## 💡 Tips

- **Backups**: Use `pg_dump` to backup your data
- **Performance**: Add more indexes if queries are slow
- **Scaling**: Move to Azure Database for PostgreSQL for production
- **Monitoring**: Use pg_stat_statements to monitor query performance

See [STORAGE_OPTIONS.md](STORAGE_OPTIONS.md) for more hosting options and comparisons!
