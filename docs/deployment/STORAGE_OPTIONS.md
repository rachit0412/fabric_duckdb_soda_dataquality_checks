# 🗄️ Storage Backend Options

The Data Quality Platform supports **multiple storage backends** for historical tracking. Choose the one that best fits your needs.

---

## 📊 Comparison Table

| Feature | PostgreSQL ⭐ | Azure Cosmos DB | SQLite | CSV/Files |
|---------|--------------|-----------------|---------|-----------|
| **Cost** | Free/Low | $24+/month | Free | Free |
| **Setup** | Simple | Moderate | Trivial | Trivial |
| **Performance** | Excellent | Excellent | Good | Poor |
| **Scalability** | High | Very High | Low | Very Low |
| **Querying** | SQL | SQL-like | SQL | Limited |
| **Hosting** | Anywhere | Azure only | Local | Local |
| **Best For** | Production | Enterprise Azure | Dev/Test | Testing |

**⭐ Recommended: PostgreSQL** - Best balance of cost, performance, and flexibility

---

## 1️⃣ PostgreSQL (Default - Recommended)

### Why PostgreSQL?
- ✅ **Free & Open Source** - No licensing costs
- ✅ **Mature & Reliable** - 30+ years of development
- ✅ **Powerful** - Advanced SQL, JSON support, full-text search
- ✅ **Flexible Hosting** - Azure, AWS, Docker, on-premise, managed services
- ✅ **Cost-Effective** - $5-20/month for small instances
- ✅ **Strong Community** - Excellent documentation and support

### Setup

#### Option A: Docker (Fastest for Testing)
```bash
# Start PostgreSQL in Docker
docker run -d \
  --name postgres-dq \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=data_quality \
  -p 5432:5432 \
  postgres:16

# Configure in .env
STORAGE_BACKEND=postgresql
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=data_quality
POSTGRES_USER=postgres
POSTGRES_PASSWORD=mypassword
```

#### Option B: Azure Database for PostgreSQL
```bash
# Create via Azure CLI
az postgres flexible-server create \
  --resource-group myResourceGroup \
  --name dq-postgres-server \
  --location eastus \
  --admin-user dbadmin \
  --admin-password 'YourSecurePassword!' \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32

# Configure in .env
STORAGE_BACKEND=postgresql
POSTGRES_HOST=dq-postgres-server.postgres.database.azure.com
POSTGRES_PORT=5432
POSTGRES_DB=data_quality
POSTGRES_USER=dbadmin
POSTGRES_PASSWORD=YourSecurePassword!
POSTGRES_SSLMODE=require
```

**Cost**: ~$15-30/month for small workloads

#### Option C: Install Locally (Windows)
```powershell
# Install via winget
winget install PostgreSQL.PostgreSQL

# Or download from: https://www.postgresql.org/download/windows/

# Configure in .env
STORAGE_BACKEND=postgresql
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=data_quality
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
```

### Verify Connection
```python
# test_postgres.py
from src.storage.postgres_repository import PostgreSQLRepository

repo = PostgreSQLRepository()
if repo.connection:
    print("✅ PostgreSQL connected!")
    tables = repo.get_all_tables_summary()
    print(f"   Monitoring {len(tables)} tables")
else:
    print("❌ PostgreSQL not connected")
```

---

## 2️⃣ Azure Cosmos DB (Alternative)

### Why Cosmos DB?
- ✅ **Global Distribution** - Multi-region replication
- ✅ **Automatic Scaling** - Handles any workload
- ✅ **Azure Native** - Integrated with Azure services
- ✅ **SLA Guarantees** - 99.999% availability
- ❌ **Cost** - Can be expensive ($24+/month minimum)
- ❌ **Azure Only** - Requires Azure subscription

### Setup
```bash
# Create via Azure CLI
az cosmosdb create \
  --name dq-cosmos-account \
  --resource-group myResourceGroup \
  --locations regionName=eastus

# Create database and container
az cosmosdb sql database create \
  --account-name dq-cosmos-account \
  --resource-group myResourceGroup \
  --name data_quality

# Configure in .env
STORAGE_BACKEND=cosmosdb
COSMOS_ENDPOINT=https://dq-cosmos-account.documents.azure.com:443/
COSMOS_KEY=your-primary-key-here
COSMOS_DB_NAME=data_quality
COSMOS_CONTAINER_NAME=scan_results
```

**Cost**: ~$24-100/month depending on throughput

---

## 3️⃣ SQLite (Simple Local Option)

### Why SQLite?
- ✅ **Zero Setup** - Just a file
- ✅ **Perfect for Testing** - No server needed
- ✅ **Built into Python** - No installation
- ❌ **Not for Production** - Limited concurrency
- ❌ **No Remote Access** - Local file only

### Implementation
```python
# src/storage/sqlite_repository.py
import sqlite3
from datetime import datetime

class SQLiteRepository:
    def __init__(self, db_path="data_quality.db"):
        self.connection = sqlite3.connect(db_path)
        self._ensure_schema()
    
    def _ensure_schema(self):
        self.connection.execute("""
        CREATE TABLE IF NOT EXISTS data_quality_scans (
            scan_id TEXT PRIMARY KEY,
            timestamp TEXT,
            table_name TEXT,
            pass_rate REAL,
            status TEXT,
            check_details TEXT
        )
        """)
    
    # ... same methods as PostgreSQL
```

### Configure
```bash
STORAGE_BACKEND=sqlite
SQLITE_PATH=data_quality.db
```

---

## 4️⃣ No Storage (Ephemeral)

### Why No Storage?
- ✅ **Simplest** - No database needed
- ✅ **Fastest Setup** - Works immediately
- ❌ **No History** - Data lost after scan
- ❌ **No Trends** - Can't analyze over time

### Configure
```bash
STORAGE_BACKEND=none
```

Scans will run but no history will be saved.

---

## 🎯 Recommendations

### For Development/Testing
```bash
# Option 1: PostgreSQL in Docker (Recommended)
docker run -d --name postgres-dq -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:16
STORAGE_BACKEND=postgresql

# Option 2: SQLite
STORAGE_BACKEND=sqlite

# Option 3: No storage
STORAGE_BACKEND=none
```

### For Production
```bash
# Option 1: PostgreSQL on Azure (Best Value)
# Azure Database for PostgreSQL Flexible Server
# Cost: ~$15-30/month
STORAGE_BACKEND=postgresql

# Option 2: Cosmos DB (Enterprise Scale)
# Cost: $24+/month
STORAGE_BACKEND=cosmosdb
```

### For Large Enterprise
```bash
# Cosmos DB with global distribution
STORAGE_BACKEND=cosmosdb
COSMOS_ENDPOINT=...
# Multi-region replication enabled
```

---

## 🔧 Migration

### From Cosmos DB to PostgreSQL
```python
# migrate_cosmos_to_postgres.py
from src.storage.cosmos_repository import CosmosDBRepository
from src.storage.postgres_repository import PostgreSQLRepository

cosmos = CosmosDBRepository()
postgres = PostgreSQLRepository()

# Get all tables
for table in cosmos.get_all_tables_summary():
    table_name = table['table_name']
    print(f"Migrating {table_name}...")
    
    # Get history
    history = cosmos.get_scan_history(table_name, days=365)
    
    # Save to PostgreSQL
    for scan in history:
        # Convert and save...
        pass

print("✅ Migration complete!")
```

---

## 💰 Cost Comparison (Monthly)

| Storage | Small (Testing) | Medium (Production) | Large (Enterprise) |
|---------|----------------|--------------------|--------------------|
| **PostgreSQL** | $0 (Docker) | $15-30 | $50-200 |
| **Cosmos DB** | $24+ | $50-200 | $500+ |
| **SQLite** | $0 | N/A | N/A |
| **No Storage** | $0 | N/A | N/A |

---

## 🚀 Getting Started

### Quick Start with PostgreSQL (Recommended)

```bash
# 1. Start PostgreSQL
docker run -d --name postgres-dq \
  -e POSTGRES_PASSWORD=change-me-with-a-32-char-random-password \
  -e POSTGRES_DB=data_quality \
  -p 5432:5432 \
  postgres:16

# 2. Configure
cat > .env << EOF
STORAGE_BACKEND=postgresql
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=data_quality
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me-with-a-32-char-random-password
EOF

# 3. Install Python dependency
pip install psycopg2-binary

# 4. Run your first scan
python main.py scan --csv test_data.csv --table test

# 5. Check history
python main.py history --table test
```

---

## 📚 Additional Resources

- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Azure Database for PostgreSQL**: https://docs.microsoft.com/azure/postgresql/
- **Cosmos DB Documentation**: https://docs.microsoft.com/azure/cosmos-db/
- **SQLite Documentation**: https://www.sqlite.org/docs.html

---

**💡 Tip**: Start with PostgreSQL in Docker for development, then move to Azure Database for PostgreSQL for production. It's the best balance of cost, performance, and simplicity!
