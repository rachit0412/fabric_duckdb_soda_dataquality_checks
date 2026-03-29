# Data Directory

This directory is mounted into the Docker container for scanning data files.

## Usage

### Place Your Data Files Here

```
data/
├── customers.csv
├── orders.csv
├── products.csv
└── transactions.csv
```

### Scan Files from Container

The API can access files in this directory:

```python
# Using API
POST http://localhost:8000/api/scan
{
  "csv_path": "/app/data/customers.csv",
  "table_name": "customers",
  "checks_path": "/app/soda_duckdb/checks.yml"
}
```

Or via command line in container:

```powershell
# Execute scan in container
docker exec dq-platform-api python main.py scan --csv /app/data/customers.csv --table customers
```

## Directory Structure

- Mount point in container: `/app/data`
- Host directory: `./data`
- Access mode: Read-only (for security)

## Security Notes

- This directory is mounted read-only in production
- Don't store sensitive credentials here
- Large files (>1GB) may impact container performance
- Use `.gitignore` to exclude data files from git

## Sample Data

To generate sample data for testing:

```powershell
# Run the sample data generator notebook
jupyter nbconvert --to notebook --execute nb_dataquality_sampledata_generator.ipynb

# Or create a simple CSV
echo "id,name,email" > data/test.csv
echo "1,John,john@example.com" >> data/test.csv
```

## Best Practices

1. **Organize by domain**: `data/sales/`, `data/finance/`, etc.
2. **Use meaningful names**: `customer_master_2026.csv` not `file1.csv`
3. **Keep files reasonably sized**: Split large files if possible
4. **Document schemas**: Add README files for complex datasets
5. **Clean up old files**: Remove files after validation
