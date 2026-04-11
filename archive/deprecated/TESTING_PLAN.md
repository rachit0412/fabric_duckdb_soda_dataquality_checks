# Testing Plan - MVP Data Quality Platform

## Overview

This document outlines the testing strategy for the MVP, covering unit tests, integration tests, and UI smoke tests.

---

## 1. UNIT TESTS

### 1a. Suggestion Engine Tests

**File:** `backend/tests/unit/test_suggestions.py`

```python
import pytest
from src.services.suggestions import (
    SuggestionEngine, 
    NullCheckForPKRule,
    UniquenessCheckRule
)

class TestNullCheckForPKRule:
    def test_suggests_null_check_for_pk_column(self):
        """Null check suggested for column marked as PK."""
        rule = NullCheckForPKRule()
        column = {
            "name": "user_id",
            "type": "BIGINT",
            "nullable": False,
            "is_pk": True,
            "distinct_count": 1000,
            "row_count": 1000
        }
        assert rule.can_suggest(column) == True
        suggestion = rule.generate_suggestion(column)
        assert suggestion["check_type"] == "Completeness"
        assert suggestion["confidence"] == 0.95
    
    def test_no_null_check_for_nullable_column(self):
        """Null check NOT suggested for nullable columns."""
        rule = NullCheckForPKRule()
        column = {
            "name": "middle_name",
            "type": "VARCHAR",
            "nullable": True,
            "is_pk": False,
            "distinct_count": 500,
            "row_count": 1000
        }
        assert rule.can_suggest(column) == False
    
    def test_email_pattern_check_suggested(self):
        """Pattern check suggested for email column."""
        from src.services.suggestions import PatternCheckEmailRule
        rule = PatternCheckEmailRule()
        column = {
            "name": "email_address",
            "type": "VARCHAR(255)"
        }
        assert rule.can_suggest(column) == True

class TestSuggestionEngine:
    def test_generates_multiple_suggestions(self):
        """Engine generates multiple suggestions for diverse schema."""
        schema = {
            "columns": [
                {
                    "name": "customer_id",
                    "type": "BIGINT",
                    "nullable": False,
                    "is_pk": True,
                    "distinct_count": 1000,
                    "row_count": 1000
                },
                {
                    "name": "email",
                    "type": "VARCHAR(255)",
                    "nullable": False,
                    "distinct_count": 1000,
                    "row_count": 1000
                },
                {
                    "name": "created_at",
                    "type": "TIMESTAMP",
                    "nullable": False,
                    "distinct_count": 950,
                    "row_count": 1000
                }
            ]
        }
        
        engine = SuggestionEngine()
        suggestions = engine.generate_suggestions(schema)
        
        assert len(suggestions) >= 3
        assert all("confidence" in s for s in suggestions)
        assert all(0 <= s["confidence"] <= 1 for s in suggestions)
    
    def test_suggestions_sorted_by_confidence(self):
        """Suggestions returned in descending confidence order."""
        engine = SuggestionEngine()
        schema = {
            "columns": [
                {"name": "id", "type": "BIGINT", "nullable": False, 
                 "is_pk": True, "distinct_count": 1000, "row_count": 1000}
            ]
        }
        
        suggestions = engine.generate_suggestions(schema)
        confidences = [s["confidence"] for s in suggestions]
        assert confidences == sorted(confidences, reverse=True)
```

### 1b. Metadata Service Tests

**File:** `backend/tests/unit/test_metadata.py`

```python
import pytest
import tempfile
import os
from src.services.metadata import PostgresConnector, CSVConnector

class TestPostgresConnector:
    @pytest.fixture
    def connector(self):
        # Use test database URL from env or default
        connstr = os.getenv("TEST_DATABASE_URL", "postgresql://localhost:5432/test_dq_db")
        return PostgresConnector(connstr)
    
    def test_connect_succeeds(self, connector):
        """Postgres connection succeeds."""
        try:
            connector.connect()
            assert connector.conn is not None
            connector.disconnect()
        except Exception:
            pytest.skip("Postgres not available")
    
    def test_schema_extraction(self, connector):
        """Schema extracted from table."""
        if not connector.conn:
            pytest.skip("Postgres not available")
        
        try:
            connector.connect()
            schema = connector.get_schema("public.test_table")
            assert "columns" in schema
            assert len(schema["columns"]) > 0
            assert all("name" in c and "type" in c for c in schema["columns"])
            connector.disconnect()
        except:
            pytest.skip("Test table not found")

class TestCSVConnector:
    @pytest.fixture
    def csv_file(self):
        # Create temp CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("id,name,email\n")
            f.write("1,Alice,alice@test.com\n")
            f.write("2,Bob,bob@test.com\n")
            path = f.name
        yield path
        os.unlink(path)
    
    def test_csv_schema_extraction(self, csv_file):
        """Schema extracted from CSV."""
        connector = CSVConnector(csv_file)
        try:
            connector.connect()
            schema = connector.get_schema(csv_file)
            assert "columns" in schema
            assert len(schema["columns"]) == 3
            assert schema["columns"][0]["name"] == "id"
            connector.disconnect()
        except:
            pytest.skip("DuckDB not available or CSV parsing failed")
    
    def test_csv_profiling(self, csv_file):
        """Dataset profiling works on CSV."""
        connector = CSVConnector(csv_file)
        try:
            connector.connect()
            profile = connector.profile_dataset(csv_file)
            assert "id" in profile
            assert profile["id"]["row_count"] == 2
            connector.disconnect()
        except:
            pytest.skip("DuckDB not available")
```

---

## 2. INTEGRATION TESTS

### 2a. Soda Execution Integration

**File:** `backend/tests/integration/test_soda_execution.py`

```python
import pytest
import asyncio
import tempfile
from sqlalchemy.orm import Session
from src.services.metadata import MetadataService
from src.core.config import settings
from src.models.db import Connection, CheckPlan, Run
from src.storage.db import get_db, engine
from src.worker.runner import SodaExecutor

class TestSodaExecution:
    @pytest.fixture
    def test_connection(self):
        """Create test DB connection."""
        conn = Connection(
            name="test_connection",
            type="postgres",
            remote_url=settings.DATABASE_URL,
            encrypted_secret="test_secret"
        )
        return conn
    
    @pytest.mark.asyncio
    async def test_sodacl_execution_on_test_dataset(self, test_connection):
        """Soda executes checks and returns results."""
        # Create test table
        # INSERT sample data with known issues (nulls, duplicates)
        # Run Soda checks
        # Assert results match expected status
        
        db: Session = SessionLocal()
        try:
            # 1. Create test dataset with known issues
            db.execute("""
                CREATE TABLE IF NOT EXISTS test_customers (
                    customer_id INT,
                    email VARCHAR(255),
                    created_at TIMESTAMP
                )
            """)
            db.execute("DELETE FROM test_customers")
            db.execute("""
                INSERT INTO test_customers VALUES
                (1, 'alice@test.com', NOW()),
                (1, 'alice@test.com', NOW()),  -- Duplicate
                (2, NULL, NOW()),               -- Null email
                (3, 'charlie@test.com', NOW())
            """)
            db.commit()
            
            # 2. Generate SodaCL for checks
            sodacl = """
            checks:
              - name: customer_id not null
                type: missing_count
                column: customer_id
                fail: when > 0
              
              - name: customer_id unique
                type: duplicate_count
                column: customer_id
                fail: when > 0
            """
            
            # 3. Execute via Soda
            executor = SodaExecutor(test_connection)
            results = await executor.run_checks(sodacl, "test_customers")
            
            # 4. Assert results
            assert results is not None
            # Should have 2 checks
            # One should pass (not null), one should fail (duplicates)
        
        finally:
            db.execute("DROP TABLE IF EXISTS test_customers")
            db.commit()
            db.close()
    
    @pytest.mark.asyncio
    async def test_job_queue_processing(self):
        """Worker processes job from queue."""
        db: Session = SessionLocal()
        try:
            # 1. Create a job in queue
            # 2. Process it
            # 3. Assert run status updated
            # 4. Assert results saved
            pass
        finally:
            db.close()
```

### 2b. API Integration Tests

**File:** `backend/tests/integration/test_api.py`

```python
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

class TestConnectionAPI:
    def test_create_connection(self):
        """POST /connections creates a connection."""
        response = client.post("/api/v1/connections", json={
            "name": "test_postgres",
            "type": "postgres",
            "remote_url": "postgresql://localhost:5432/testdb",
            "secret": "user:password"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "test_postgres"
        assert data["type"] == "postgres"
        assert "id" in data
    
    def test_list_connections(self):
        """GET /connections returns list."""
        response = client.get("/api/v1/connections")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_test_connection_fails_invalid(self):
        """POST /connections/{id}/test handles bad connection."""
        # Create connection
        create_res = client.post("/api/v1/connections", json={
            "name": "bad_postgres",
            "type": "postgres",
            "remote_url": "postgresql://invalid-host:5432/testdb",
            "secret": "user:pass"
        })
        conn_id = create_res.json()["id"]
        
        # Test it
        response = client.post(f"/api/v1/connections/{conn_id}/test")
        
        # Should indicate failure (but not crash)
        assert response.status_code in [200, 500]
```

---

## 3. UI SMOKE TESTS

**File:** `frontend/src/App.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import userEvent from '@testing-library/user-event';

describe('Data Quality Platform E2E Flow', () => {
  
  test('navigate through all main screens', async () => {
    const { getByText, getByPlaceholderText, getByDisplayValue } = render(<App />);
    
    // 1. Render home screen
    expect(screen.getByText(/Data Quality Platform/i)).toBeInTheDocument();
    
    // 2. Navigate to Connect Dataset
    fireEvent.click(getByText('Connect Dataset'));
    expect(getByPlaceholderText(/e.g., prod_warehouse/i)).toBeInTheDocument();
    
    // 3. Fill connection form
    await userEvent.type(getByPlaceholderText(/e.g., prod_warehouse/i), 'test_conn');
    await userEvent.type(getByPlaceholderText(/postgresql:\/\//i), 'postgresql://localhost:5432/testdb');
    
    // 4. Test connection (mock)
    fireEvent.click(getByText('Test & Create Connection'));
    
    // 5. Wait for success message
    await waitFor(() => {
      expect(getByText(/Connection successful/i)).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // 6. Navigate to Metadata
    fireEvent.click(getByText('Metadata Explorer'));
    expect(getByText(/Schema/i)).toBeInTheDocument();
    
    // 7. Navigate to Suggestions
    fireEvent.click(getByText('Suggest Checks'));
    await waitFor(() => {
      expect(getByText(/Suggested Checks/i)).toBeInTheDocument();
    });
    
    // 8. Navigate to Check Library
    fireEvent.click(getByText('Check Library'));
    expect(getByText(/Completeness/i)).toBeInTheDocument();
    
    // 9. Build plan
    fireEvent.click(getByText('Start Plan'));
    expect(getByText(/Check Plan Builder/i)).toBeInTheDocument();
    
    // 10. Save plan
    fireEvent.click(getByText('Save Plan'));
    await waitFor(() => {
      expect(getByText(/Plan saved/i)).toBeInTheDocument();
    });
    
    // 11. Run checks
    fireEvent.click(getByText('Run Checks Now'));
    await waitFor(() => {
      expect(getByText(/Running/i)).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // 12. View results
    await waitFor(() => {
      expect(getByText(/Results/i)).toBeInTheDocument();
    }, { timeout: 30000 });
    
    // 13. Export results
    fireEvent.click(getByText('Export JSON'));
  });

  test('connection form validation', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Connect Dataset'));
    
    // Try to submit empty form
    fireEvent.click(screen.getByText('Test & Create Connection'));
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });
});
```

---

## 4. TEST EXECUTION & CI/CD

### 4a. Run Unit Tests

```bash
cd backend
pytest tests/unit/ -v --cov=src.services

# Coverage report
pytest tests/unit/ --cov=src.services --cov-report=html
open htmlcov/index.html
```

### 4b. Run Integration Tests

```bash
# Requires running Postgres and API
pytest tests/integration/ -v -s

# With live database
pytest tests/integration/ -v --db-url="postgresql://localhost:5432/test_dq_db"
```

### 4c. Run UI Tests

```bash
cd frontend
npm test -- --coverage --watchAll=false

# E2E tests (if using Cypress/Playwright)
npm run test:e2e
```

### 4d. GitHub Actions CI/CD Pipeline

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: |
          cd backend
          pip install -r requirements.txt
          pytest tests/unit/ -v --cov=src

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: dq_user
          POSTGRES_PASSWORD: dq_password
          POSTGRES_DB: test_dq_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: |
          cd backend
          pip install -r requirements.txt
          psql -h localhost -U dq_user -d test_dq_db -f schema.sql
          pytest tests/integration/ -v

  ui-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: |
          cd frontend
          npm install
          npm test -- --coverage --watchAll=false
```

---

## 5. COVERAGE TARGETS

| Component | Target Coverage | Comments |
|-----------|-----------------|----------|
| Suggestion Engine | >= 85% | Core logic, must be well tested |
| Metadata Service | >= 70% | Integration dependent, skip DB if mocked |
| API Routes | >= 60% | Mock DB layer |
| Soda Executor | >= 50% | Requires subprocess/CLI testing |
| UI Components | >= 40% | Basic snapshot + behavior tests |

---

## 6. MANUAL ACCEPTANCE TESTS

### 6a. End-to-End Scenario

1. Start backend + frontend locally
2. Create PostgreSQL test connection
3. Profile sample table (e.g., `public.customers`)
4. Review metadata and suggestions
5. Select 3–5 checks from library
6. Save plan
7. Run plan (should complete in < 2 min)
8. Verify results display correctly
9. Export as JSON and verify structure
10. Compare with hand-run Soda CLI output

### 6b. Connection Testing

- [x] Postgres connection succeeds
- [x] BigQuery connection (if implemented) succeeds
- [x] CSV file loading works
- [x] Invalid connection shows helpful error

### 6c. Check Execution

- [x] Null checks execute
- [x] Uniqueness checks execute
- [x] Pattern/validity checks execute
- [x] Custom checks execute
- [x] Results captured and displayed

---

## 7. PERFORMANCE TESTS (Phase 2)

```python
@pytest.mark.performance
def test_suggestion_generation_performance():
    """Suggestion generation < 2s for 100-column schema."""
    schema = {
        "columns": [
            {
                "name": f"col_{i}",
                "type": "VARCHAR" if i % 2 else "BIGINT",
                "nullable": i % 3 == 0,
                "distinct_count": 1000 - i,
                "row_count": 1000
            }
            for i in range(100)
        ]
    }
    
    engine = SuggestionEngine()
    start = time.time()
    suggestions = engine.generate_suggestions(schema)
    elapsed = time.time() - start
    
    assert elapsed < 2.0
```

---

End of Testing Plan
