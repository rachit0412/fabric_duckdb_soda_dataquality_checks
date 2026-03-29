# Complete Setup Guide for Data Quality Platform

## ⚠️ Prerequisites Missing
Your system needs Python and PostgreSQL to run the data quality platform.

---

## 🐍 Step 1: Install Python (Required)

### Method A: Official Python Installer (Recommended)

1. **Download Python 3.11 or 3.12:**
   - Go to: https://www.python.org/downloads/windows/
   - Click "Download Python 3.12.x" (latest stable)

2. **Install Python:**
   - ✅ **IMPORTANT:** Check "Add Python to PATH" on first screen!
   - Click "Install Now"
   - Wait 2-3 minutes
   - Click "Close"

3. **Verify Installation:**
   ```powershell
   # Open NEW PowerShell window (important!)
   python --version
   # Should show: Python 3.12.x
   
   pip --version
   # Should show: pip 24.x
   ```

### Method B: Using Scoop (You Already Have Scoop)

Since you already have Scoop installed:

```powershell
scoop install python
python --version
```

---

## 💾 Step 2: Choose Your Database Option

### Option A: No Database (Test Scanning Only - Fastest)

**Best for:** Quick testing, understanding the platform

1. Already configured in `.env`!
2. Skip to Step 3

**Limitations:** No historical tracking, no trends, no API history endpoints

---

### Option B: Install PostgreSQL (Recommended for Full Features)

**Best for:** Production use, historical tracking, trend analysis

#### Windows Installer Method:

1. **Download:**
   - https://www.postgresql.org/download/windows/
   - Download PostgreSQL 16

2. **Install:**
   - Run installer
   - Password: `test123` (remember this!)
   - Port: `5432`
   - Install everything (5 minutes)

3. **Create Database:**
   ```powershell
   # Open SQL Shell (psql) from Start menu
   # Press Enter for all prompts, then enter password: test123
   
   CREATE DATABASE data_quality;
   \q
   ```

4. **Update `.env`:**
   ```env
   STORAGE_BACKEND=postgresql
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=data_quality
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=test123
   ```

---

### Option C: Use Free Cloud PostgreSQL (No Installation)

**Best for:** No local installation, testing from anywhere

1. **Go to ElephantSQL:**
   - https://www.elephantsql.com/
   - Sign up (free)
   - Create Instance → "Tiny Turtle" (FREE - 20MB)

2. **Get Connection Details:**
   - Copy: Server, User, Password, Database

3. **Update `.env`:**
   ```env
   STORAGE_BACKEND=postgresql
   POSTGRES_HOST=<from ElephantSQL>
   POSTGRES_PORT=5432
   POSTGRES_DB=<from ElephantSQL>
   POSTGRES_USER=<from ElephantSQL>
   POSTGRES_PASSWORD=<from ElephantSQL>
   ```

---

## 📦 Step 3: Install Dependencies

After Python is installed:

```powershell
# Navigate to project folder
cd "c:\Users\rachitgupta5\OneDrive - KPMG\Apps\fabric_duckdb_soda_dataquality_checks"

# Install all dependencies
pip install -r requirements.txt

# This installs:
# - Soda Core (data quality checks)
# - DuckDB (SQL engine)
# - FastAPI (REST API)
# - PostgreSQL driver (if using database)
# - And 20+ other packages
```

Expected output:
```
Successfully installed soda-core-3.4.3 duckdb-1.1.0 fastapi-0.109.0 ...
```

---

## ✅ Step 4: Test Everything

### Quick Test (No Sample Data Needed)

```powershell
python test_quick.py
```

Expected output:
```
✅ Configuration loaded
✅ Scanner initialized  
✅ Report generator ready
[✅ Database connected]  # Only if using PostgreSQL
✅ All systems operational!
```

### Full Test with Sample Data

```powershell
# Generate sample data
jupyter nbconvert --to notebook --execute nb_dataquality_sampledata_generator.ipynb

# Run data quality scan
python main.py scan --csv sample_data.csv --table test_data --report report.html

# Open report
start report.html
```

---

## 🎯 What You Get

### With Database (PostgreSQL):
- ✅ Data quality scanning
- ✅ Statistical profiling  
- ✅ Anomaly detection
- ✅ Interactive HTML reports
- ✅ Historical tracking (30/60/90 days)
- ✅ Trend analysis
- ✅ REST API with history endpoints
- ✅ SQL queries for custom reports
- ✅ Email/Teams alerts

### Without Database (none):
- ✅ Data quality scanning
- ✅ Statistical profiling
- ✅ Anomaly detection
- ✅ Interactive HTML reports
- ❌ No historical tracking
- ❌ No trend analysis
- ❌ Limited API features

---

## 🚀 Quick Commands After Setup

```powershell
# Scan a CSV file
python main.py scan --csv mydata.csv --table users

# Start REST API server
python main.py api

# View scan history (requires database)
python main.py history --table users --days 30

# View trends (requires database)
python main.py trends --table users
```

---

## 🆘 Troubleshooting

### "Python was not found"
- Close PowerShell and open a NEW window
- Or restart your computer
- Run: `$env:Path` to verify Python is in PATH

### "pip install failed"
```powershell
# Upgrade pip first
python -m pip install --upgrade pip

# Try again
pip install -r requirements.txt
```

### "Can't connect to PostgreSQL"
```powershell
# Test connection
Test-NetConnection -ComputerName localhost -Port 5432

# Check if PostgreSQL service is running
Get-Service -Name postgresql*
```

### "Permission denied" errors
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell → "Run as Administrator"
```

---

## 💡 Recommendations

**For First-Time Setup:**
1. Install Python (Method A - Official Installer)
2. Skip database (use `STORAGE_BACKEND=none`)
3. Install dependencies
4. Test with `test_quick.py`
5. Generate sample data and run scan
6. Set up PostgreSQL later when ready

**For Production Use:**
1. Install Python
2. Install PostgreSQL (local or cloud)
3. Configure `.env` with database settings
4. Set up automated scheduling
5. Configure alerts (Email/Teams)

---

## 📚 Next Steps

After setup:
1. Read [README.md](README.md) for feature overview
2. Read [TESTING.md](TESTING.md) for comprehensive testing guide
3. Read [GETTING_STARTED.md](GETTING_STARTED.md) for quick verification
4. Read [STORAGE_OPTIONS.md](STORAGE_OPTIONS.md) for database options

Ready to make your data quality checks enterprise-grade! 🎉
