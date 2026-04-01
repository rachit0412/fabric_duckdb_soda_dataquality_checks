# Contributing to Data Quality Platform

> **Version:** 1.0.1 | **Last Updated:** 2026-04-01

Thank you for your interest in contributing! This guide will help you get started.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Docker Desktop
- Git
- PostgreSQL (optional for local dev)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/rachit0412/fabric_duckdb_soda_dataquality_checks.git
cd fabric_duckdb_soda_dataquality_checks

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements-dev.txt

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Run tests
pytest tests/

# Start local development
python main.py --csv data/sample_data.csv --table test
```

## 📁 Project Structure

```
.
├── src/                    # Source code
│   ├── api/               # FastAPI REST API
│   ├── core/              # Business logic (scanner, profiler, anomaly detector)
│   ├── storage/           # Data persistence (PostgreSQL, Cosmos DB)
│   ├── reporting/         # Report generation
│   ├── notifications/     # Alerting service
│   ├── config/            # Configuration management
│   ├── ui/                # Web dashboard (HTML/JS/CSS)
│   └── utils/             # Utility functions
│
├── tests/                 # Test suite
├── soda_duckdb/          # Soda Core configuration
├── data/                  # Sample data files
├── docs/                  # Documentation
│   ├── deployment/        # Deployment guides
│   └── guides/            # User & developer guides
│
├── main.py               # CLI entry point
├── Dockerfile            # Container image
├── docker-compose.yml    # Container orchestration
└── requirements.txt      # Python dependencies
```

## 🔧 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

Follow these guidelines:
- **Code Style**: Follow PEP 8, use `black` for formatting
- **Type Hints**: Use type hints for all functions
- **Docstrings**: Use Google-style docstrings
- **Tests**: Write tests for new functionality

### 3. Run Quality Checks

```bash
# Format code
black src/ tests/

# Lint code
pylint src/

# Run tests
pytest tests/ --cov=src

# Type checking (if mypy installed)
mypy src/
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature description"
```

**Commit Message Format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Build/tooling changes

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

## 🧪 Testing Guidelines

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_scanner.py

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test
pytest tests/test_scanner.py::test_scan_execution
```

### Writing Tests

```python
def test_scanner_detects_duplicates():
    """Test that scanner correctly identifies duplicate records."""
    # Arrange
    scanner = EnhancedDataQualityScanner()
    test_data = create_test_data_with_duplicates()
    
    # Act
    result = scanner.execute_comprehensive_scan(
        csv_path="test_data.csv",
        table_name="test_table",
        checks_path="checks.yml",
        config_path="config.yml"
    )
    
    # Assert
    assert result.status == "FAILED"
    assert any("duplicate" in check["name"].lower() 
               for check in result.check_details)
```

## 📝 Code Style

### Python Style Guide

```python
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class DataQualityScanner:
    """
    Enterprise data quality scanner.
    
    This class orchestrates data quality checks using Soda Core
    and DuckDB for high-performance analysis.
    
    Attributes:
        connection: DuckDB database connection
        profiler: Data profiling engine
        
    Example:
        >>> scanner = DataQualityScanner()
        >>> result = scanner.execute_scan("data.csv", "customers")
        >>> print(result.pass_rate)
        95.5
    """
    
    def __init__(self, connection: Optional[duckdb.DuckDBPyConnection] = None):
        """
        Initialize the scanner.
        
        Args:
            connection: Optional DuckDB connection. Creates new if None.
        """
        self.connection = connection or duckdb.connect()
        self.profiler = DataProfiler()
    
    def execute_scan(
        self, 
        csv_path: str, 
        table_name: str
    ) -> ScanResult:
        """
        Execute comprehensive data quality scan.
        
        Args:
            csv_path: Path to CSV file
            table_name: Name of table to scan
            
        Returns:
            ScanResult with pass/fail status and details
            
        Raises:
            FileNotFoundError: If CSV file doesn't exist
            ValueError: If CSV is malformed
        """
        logger.info(f"Starting scan for {table_name}")
        # Implementation...
```

### Key Principles
- **Type hints** on all function signatures
- **Docstrings** for all classes and public methods
- **Logging** instead of print statements
- **Error handling** with specific exceptions
- **Single responsibility** per function/class

## 🏗️ Architecture Guidelines

### Adding New Data Quality Checks

1. Define check in `soda_duckdb/checks.yml`:
```yaml
checks for my_table:
  - row_count > 1000
  - missing_count(email) = 0
  - duplicate_count(id) = 0
```

2. Checks run automatically via Soda Core

### Adding New Storage Backend

1. Create new repository class:
```python
# src/storage/my_repository.py
from .base_repository import BaseRepository

class MyRepository(BaseRepository):
    def save_scan_result(self, result: dict) -> str:
        # Implementation
        pass
```

2. Register in `src/storage/__init__.py`

3. Add configuration option

### Adding New API Endpoint

```python
# src/api/server.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/api/my-endpoint")
async def my_endpoint():
    """
    My new endpoint description.
    
    Returns:
        JSON response with data
    """
    return {"status": "success"}
```

## 🐛 Debugging

### Local Debugging

```python
# Add to your code
import pdb; pdb.set_trace()  # Breakpoint

# Or use debugger in VS Code/PyCharm
```

### Docker Debugging

```bash
# View logs
docker compose logs -f data-quality-api

# Connect to container
docker compose exec data-quality-api bash

# Check environment
docker compose exec data-quality-api env
```

## 📚 Documentation

### Adding Documentation

- **Code docs**: Inline docstrings
- **User guides**: `docs/guides/`
- **Deployment**: `docs/deployment/`
- **Architecture**: `ARCHITECTURE.md`

### Documentation Standards

- Clear, concise writing
- Code examples for all features
- Screenshots where helpful
- Keep updated with code changes

## 🔐 Security

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Email: security@company.com

### Security Guidelines

- Never commit secrets/passwords
- Use environment variables for config
- Validate all user inputs
- Use parameterized SQL queries
- Keep dependencies updated

## 🤝 Code Review Process

### As an Author
- Keep PRs focused and small
- Write clear PR description
- Add tests for new features
- Update documentation
- Respond to review comments

### As a Reviewer
- Be constructive and respectful
- Focus on code quality, not style
- Check for security issues
- Verify tests pass
- Approve when ready

## 📦 Release Process

1. Update version in `setup.py`
2. Update CHANGELOG.md
3. Create release branch: `release/v1.x.x`
4. Run full test suite
5. Build Docker image
6. Tag release: `git tag v1.x.x`
7. Push tag: `git push origin v1.x.x`
8. GitHub Actions creates release

## 💬 Communication

- **GitHub Issues**: Bug reports, feature requests
- **Pull Requests**: Code contributions
- **Discussions**: Questions, ideas
- **Email**: security@company.com (security only)

## 📖 Resources

- [Python Best Practices](https://docs.python-guide.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Soda Core Docs](https://docs.soda.io/)
- [DuckDB Documentation](https://duckdb.org/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## ❓ Getting Help

- Check existing [Issues](https://github.com/rachit0412/fabric_duckdb_soda_dataquality_checks/issues)
- Read [Documentation](docs/)
- Ask in [Discussions](https://github.com/rachit0412/fabric_duckdb_soda_dataquality_checks/discussions)

---

Thank you for contributing! 🎉
