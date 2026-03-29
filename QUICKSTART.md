# 🚀 Quick Start Guide

## 5-Minute Setup

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
```

### Step 3: Run Your First Scan
```python
from src.core.scanner import EnhancedDataQualityScanner
from src.utils.logging import setup_logging

setup_logging(log_level="INFO")
scanner = EnhancedDataQualityScanner()

result = scanner.execute_comprehensive_scan(
    csv_path="path/to/your/data.csv",
    table_name="my_table",
    checks_path="soda_duckdb/checks.yml",
    config_path="soda_duckdb/config.yml"
)

print(f"Status: {result.status}, Pass Rate: {result.pass_rate:.1%}")
```

### Step 4: View the Report
Open the generated HTML report in your browser to see:
- ✅ Interactive charts
- 📊 Statistical analysis
- 🔍 Anomaly highlights
- 📈 Data profiling

## Next Steps

1. **Customize Checks**: Edit `soda_duckdb/checks.yml` for your data
2. **Enable Cosmos DB**: Set up Azure Cosmos DB for historical tracking
3. **Configure Alerts**: Add Teams webhook or SMTP settings
4. **Deploy API**: Run `python -m src.api.server` for REST API

## Common Commands

```bash
# Run examples
python examples/usage_examples.py

# Start API server
python -m src.api.server

# Run tests
pytest tests/ -v

# Build Docker image
docker build -t data-quality-platform .

# Run with Docker Compose
docker-compose up -d
```

## Troubleshooting

**Issue**: Can't connect to Cosmos DB
- Check `COSMOS_ENDPOINT` and `COSMOS_KEY` in `.env`
- Verify network access to Azure

**Issue**: Scans are slow
- Reduce `MAX_PROFILE_ROWS` for large datasets
- Enable DuckDB parallelism

**Issue**: No alerts sent
- Verify SMTP settings or Teams webhook URL
- Check `ALERTING_ENABLED=true` in `.env`

## Need Help?

📧 support@your-company.com
📚 See full documentation in README.md
