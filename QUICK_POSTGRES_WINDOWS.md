# Quick PostgreSQL Setup for Windows

## Method 1: Windows Installer (Recommended - 5 minutes)

### Step 1: Download PostgreSQL
1. Go to: https://www.postgresql.org/download/windows/
2. Click "Download the installer"
3. Download **PostgreSQL 16** for Windows

### Step 2: Install
1. Run the installer (`postgresql-16.x-windows-x64.exe`)
2. Default installation directory: OK
3. Select components: PostgreSQL Server, pgAdmin 4, Command Line Tools
4. **Set password**: `test123` (remember this!)
5. Port: `5432` (default)
6. Locale: Default
7. Click Next → Install → Wait 3-5 minutes

### Step 3: Create Database
Open Windows Start → search "SQL Shell (psql)"

```sql
-- Login (press Enter for defaults, then enter password: test123)
Password for user postgres: test123

-- Create database
CREATE DATABASE data_quality;

-- Verify
\l
```

You should see `data_quality` in the list.

### Step 4: Configure Your App
Edit `.env` file:
```env
STORAGE_BACKEND=postgresql
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=data_quality
POSTGRES_USER=postgres
POSTGRES_PASSWORD=test123
```

### Step 5: Test
```powershell
pip install -r requirements.txt
python test_quick.py
```

---

## Method 2: Use Free Cloud PostgreSQL (No Installation)

### ElephantSQL (Free Tier - 20MB)
1. Go to: https://www.elephantsql.com/
2. Sign up (free account)
3. Create new instance → "Tiny Turtle" (free)
4. Note the connection URL: `postgres://user:pass@host/database`

Edit `.env`:
```env
STORAGE_BACKEND=postgresql
POSTGRES_HOST=<from URL>
POSTGRES_PORT=5432
POSTGRES_DB=<from URL>
POSTGRES_USER=<from URL>
POSTGRES_PASSWORD=<from URL>
```

### Azure Database for PostgreSQL (Free Trial)
1. Create Azure free account
2. Create "Azure Database for PostgreSQL flexible server"
3. Basic tier: ~$15/month (free for 12 months with trial)

---

## Method 3: Fix Docker Desktop

If you prefer Docker:

1. **Find Docker Desktop:**
   - Search Windows Start menu for "Docker Desktop"
   - Or reinstall from: https://www.docker.com/products/docker-desktop/

2. **Start Docker Desktop:**
   - Right-click system tray → Docker Desktop → Restart
   - Wait for "Docker Desktop is running" message

3. **Run PostgreSQL:**
   ```powershell
   docker run -d --name postgres-dq -e POSTGRES_PASSWORD=test123 -e POSTGRES_DB=data_quality -p 5432:5432 postgres:16
   ```

---

## ✅ Verify Connection

After setup, test connection:

```powershell
# Test with psql (if installed)
psql -h localhost -U postgres -d data_quality

# Or test with Python
python -c "from src.storage.postgres_repository import PostgreSQLRepository; repo = PostgreSQLRepository(); print('✅ Connected!' if repo.connection else '❌ Failed')"
```

---

## 🎯 Next Steps

Once PostgreSQL is running:
```powershell
# Install dependencies
pip install -r requirements.txt

# Run quick test
python test_quick.py

# Run your first scan
python main.py scan --csv test_data.csv --table my_table
```

---

## 💡 Recommendation

**For Testing/Development:** Use **Windows PostgreSQL Installer** (Method 1)
- No Docker needed
- Easy to manage
- Full PostgreSQL features
- Free

**For Production:** Use **Azure Database for PostgreSQL** or **AWS RDS**
- Managed service
- Automatic backups
- High availability
- ~$15-50/month
