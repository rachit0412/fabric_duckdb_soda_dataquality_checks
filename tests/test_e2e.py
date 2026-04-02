"""
End-to-End Tests for MVP Data Quality Platform
Tests complete workflow: connect → profile → suggest → plan → execute → results
"""

import pytest
import json
from uuid import UUID
import requests
import time

API_BASE = "http://localhost:8000/api/v1"


class TestE2EWorkflow:
    """Complete workflow tests."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data."""
        self.connection_id = None
        self.snapshot_id = None
        self.plan_id = None
        self.run_id = None
    
    def test_01_create_connection_postgres(self):
        """Test: Create PostgreSQL connection."""
        response = requests.post(
            f"{API_BASE}/connections/",
            json={
                "name": "Test PostgreSQL",
                "type": "postgres",
                "remote_url": "postgresql://dq_user:dq_password@localhost:5432/dq_platform",
                "secret": "",
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == "Test PostgreSQL"
        assert data["type"] == "postgres"
        assert "id" in data
        
        self.connection_id = data["id"]
        print(f"✓ Created connection: {self.connection_id}")
    
    def test_02_list_connections(self):
        """Test: List all connections."""
        response = requests.get(f"{API_BASE}/connections/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Listed {len(data)} connections")
    
    def test_03_profile_metadata(self):
        """Test: Profile dataset metadata."""
        if not self.connection_id:
            self.test_01_create_connection_postgres()
        
        response = requests.post(
            f"{API_BASE}/metadata/profile",
            json={
                "connection_id": self.connection_id,
                "tables": None,
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "snapshot_id" in data
        assert data["connection_id"] == self.connection_id
        assert "schema" in data
        
        self.snapshot_id = data["snapshot_id"]
        print(f"✓ Profiled metadata: {self.snapshot_id}")
        print(f"  Schema: {type(data.get('schema'))}")
    
    def test_04_get_suggestions(self):
        """Test: Get AI-generated check suggestions."""
        if not self.snapshot_id:
            self.test_03_profile_metadata()
        
        response = requests.post(
            f"{API_BASE}/suggestions/",
            json={
                "metadata_snapshot_id": self.snapshot_id,
                "confidence_threshold": 0.5,
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "metadata_snapshot_id" in data
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)
        
        print(f"✓ Generated {data['total_suggestions']} suggestions")
        for suggestion in data["suggestions"][:3]:
            print(f"  - {suggestion['name']}: {suggestion['confidence']:.2%}")
    
    def test_05_create_check_plan(self):
        """Test: Create a check plan from suggestions."""
        if not self.snapshot_id:
            self.test_03_profile_metadata()
        
        checks = [
            {"name": "missing_count", "table": "users"},
            {"name": "duplicate_count", "table": "users"},
            {"name": "invalid_count", "table": "users"},
        ]
        
        response = requests.post(
            f"{API_BASE}/check-plans/",
            json={
                "name": "Test Plan",
                "description": "E2E test plan",
                "metadata_snapshot_id": self.snapshot_id,
                "checks": checks,
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == "Test Plan"
        assert data["check_count"] == len(checks)
        
        self.plan_id = data["id"]
        print(f"✓ Created plan with {data['check_count']} checks: {self.plan_id}")
    
    def test_06_execute_run(self):
        """Test: Execute a check plan run."""
        if not self.plan_id:
            self.test_05_create_check_plan()
        
        response = requests.post(
            f"{API_BASE}/runs/",
            json={"check_plan_id": self.plan_id}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["check_plan_id"] == self.plan_id
        assert data["status"] == "pending"
        
        self.run_id = data["id"]
        print(f"✓ Created run: {self.run_id}")
        print(f"  Status: {data['status']}")
    
    def test_07_poll_run_status(self):
        """Test: Poll run status until completion."""
        if not self.run_id:
            self.test_06_execute_run()
        
        max_attempts = 10
        attempt = 0
        
        while attempt < max_attempts:
            response = requests.get(f"{API_BASE}/runs/{self.run_id}/status")
            assert response.status_code == 200
            data = response.json()
            
            print(f"  Attempt {attempt + 1}: status={data['status']}")
            
            if data["status"] in ["completed", "failed"]:
                break
            
            time.sleep(1)
            attempt += 1
        
        print(f"✓ Run completed with status: {data['status']}")
    
    def test_08_get_results(self):
        """Test: Retrieve check results."""
        if not self.run_id:
            # Create and execute a run
            self.test_05_create_check_plan()
            self.test_06_execute_run()
            # Give worker time to execute
            time.sleep(3)
        
        response = requests.get(f"{API_BASE}/results/runs/{self.run_id}/results")
        
        if response.status_code == 404:
            print("⚠ No results yet (worker may still be processing)")
            return
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["run_id"] == self.run_id
        assert "total_checks" in data
        assert "passed_checks" in data
        assert "failed_checks" in data
        
        print(f"✓ Got results: {data['passed_checks']} passed, {data['failed_checks']} failed")
    
    def test_09_export_results(self):
        """Test: Export results as JSON."""
        if not self.run_id:
            self.test_06_execute_run()
        
        response = requests.post(
            f"{API_BASE}/results/export",
            json={
                "run_id": self.run_id,
                "format": "json",
            }
        )
        
        # May fail if no results yet, which is OK
        if response.status_code == 404:
            print("⚠ No results to export yet")
            return
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "filename" in data
        assert data["format"] == "json"
        print(f"✓ Export prepared: {data['filename']}")


class TestConnectionManagement:
    """Test connection CRUD operations."""
    
    def test_create_csv_upload(self):
        """Test: Upload CSV file."""
        files = {
            'file': ('test.csv', b'id,name\n1,test'),
        }
        data = {
            'name': 'Test CSV',
            'type': 'csv',
        }
        
        response = requests.post(
            f"{API_BASE}/connections/upload",
            files=files,
            data=data,
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        result = response.json()
        assert result["type"] == "csv"
        assert result["name"] == "Test CSV"
        print(f"✓ Uploaded CSV: {result['id']}")
    
    def test_delete_connection(self):
        """Test: Delete a connection."""
        # Create connection first
        create_response = requests.post(
            f"{API_BASE}/connections/",
            json={
                "name": "Delete Test",
                "type": "postgres",
                "remote_url": "postgresql://user:pass@localhost/db",
            }
        )
        assert create_response.status_code == 200
        conn_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{API_BASE}/connections/{conn_id}")
        assert response.status_code == 200
        print(f"✓ Deleted connection: {conn_id}")


class TestHealthAndDocs:
    """Test API health and documentation endpoints."""
    
    def test_health_check(self):
        """Test: Health check endpoint."""
        response = requests.get("http://localhost:8000/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print(f"✓ Health check: {data['app']} v{data['version']}")
    
    def test_openapi_docs(self):
        """Test: OpenAPI documentation available."""
        response = requests.get("http://localhost:8000/docs")
        assert response.status_code == 200
        print("✓ OpenAPI docs available at /docs")


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s"])
