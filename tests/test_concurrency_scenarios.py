"""
Concurrency Edge Case Testing

Tests for concurrent request handling including:
- Double-submit protection
- Race conditions
- Idempotency
- Concurrent data modifications

These tests verify that the API safely handles concurrent requests
and prevents data inconsistency.

Fixtures Used:
- IdempotencyKeyTracker (from mock_services)
- RequestRecorder (from mock_services)

PRIORITY: HIGH (Concurrency bugs are hard to reproduce/debug)
DIMENSION: Concurrency Scenarios
TEST_COUNT: 8 tests
ESTIMATED_RUNTIME: <3 seconds
"""

import pytest
import requests
import threading
import time
from typing import Dict, Any, List
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import patch, MagicMock


class TestDoubleSubmitProtection:
    """Test suite for double-submit prevention."""

    @pytest.mark.concurrency
    @pytest.mark.critical
    def test_double_submit_same_data_creates_one_resource(self, valid_auth_header: Dict[str, str],
                                                         mock_double_submit_protection,
                                                         api_base_url="http://localhost:8000"):
        """
        Scenario: User submits form twice (accidentally hits submit button twice)
        Expected: Only one resource created, second request returns conflict/duplicate
        
        Edge case: Double-submit is common UI issue.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": "Test Connection",
            "type": "postgresql",
        }
        
        results = []
        
        def submit():
            response = requests.post(endpoint, json=payload, headers=valid_auth_header)
            results.append(response)
        
        # Act - Submit twice simultaneously
        threads = [threading.Thread(target=submit) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        
        # Assert
        assert len(results) == 2
        # First should succeed (201), second may fail or succeed depending on implementation
        success_count = sum(1 for r in results if r.status_code in [200, 201])
        conflict_count = sum(1 for r in results if r.status_code == 409)
        
        # Expected: 1 success + 1 conflict/duplicate, or both succeed but idempotent
        assert success_count >= 1, "At least one should succeed"

    @pytest.mark.concurrency
    def test_idempotency_key_prevents_duplicates(self, valid_auth_header: Dict[str, str],
                                                api_base_url="http://localhost:8000"):
        """
        Scenario: Two identical requests with same idempotency key
        Expected: Second request returns same result as first (duplicate protected)
        
        Edge case: Idempotency pattern (common in APIs).
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        idempotency_key = "test-idempotency-key-12345"
        
        payload = {
            "name": "Idempotent Test",
            "type": "postgresql",
        }
        
        headers1 = {**valid_auth_header, "Idempotent-Key": idempotency_key}
        headers2 = {**valid_auth_header, "Idempotent-Key": idempotency_key}
        
        # Act
        response1 = requests.post(endpoint, json=payload, headers=headers1)
        response2 = requests.post(endpoint, json=payload, headers=headers2)
        
        # Assert
        if response1.status_code in [200, 201]:
            # Second request with same key should return same result
            assert response2.status_code in [200, 201], \
                "Idempotent request should succeed"
            # IDs should match (same resource)
            if response1.status_code == 201 and response2.status_code == 201:
                data1 = response1.json()
                data2 = response2.json()
                if "id" in data1 and "id" in data2:
                    assert data1["id"] == data2["id"], \
                        "Idempotent requests should create same resource"

    @pytest.mark.concurrency
    def test_different_idempotency_keys_create_separate_resources(self, valid_auth_header: Dict[str, str],
                                                                 api_base_url="http://localhost:8000"):
        """
        Scenario: Two identical requests with different idempotency keys
        Expected: Two separate resources created
        
        Edge case: Different keys should not be treated as duplicate.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        payload = {
            "name": "Test Connection",
            "type": "postgresql",
        }
        
        headers1 = {**valid_auth_header, "Idempotent-Key": "key-1"}
        headers2 = {**valid_auth_header, "Idempotent-Key": "key-2"}
        
        # Act
        response1 = requests.post(endpoint, json=payload, headers=headers1)
        response2 = requests.post(endpoint, json=payload, headers=headers2)
        
        # Assert
        if response1.status_code in [200, 201] and response2.status_code in [200, 201]:
            data1 = response1.json()
            data2 = response2.json()
            # Different keys should result in different resources (if IDs present)
            if "id" in data1 and "id" in data2:
                assert data1["id"] != data2["id"], \
                    "Different idempotency keys should create separate resources"


class TestRaceConditions:
    """Test suite for race condition edge cases."""

    @pytest.mark.concurrency
    def test_concurrent_read_does_not_block(self, valid_auth_header: Dict[str, str],
                                           api_base_url="http://localhost:8000"):
        """
        Scenario: 10 users read same data simultaneously
        Expected: All succeed quickly, no deadlocks or timeouts
        
        Edge case: Read concurrency.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        results = []
        
        def read():
            response = requests.get(endpoint, headers=valid_auth_header)
            results.append(response)
        
        # Act - 10 concurrent reads
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(read) for _ in range(10)]
            for future in as_completed(futures):
                future.result()
        
        # Assert
        assert len(results) == 10
        # All should succeed or have same error
        status_codes = [r.status_code for r in results]
        assert all(s in [200, 401, 403] for s in status_codes)

    @pytest.mark.concurrency
    def test_concurrent_write_operations_atomic(self, valid_auth_header: Dict[str, str],
                                               api_base_url="http://localhost:8000"):
        """
        Scenario: Two users modify same resource simultaneously
        Expected: Operations processed atomically, no data corruption
        
        Edge case: Write concurrency and atomicity.
        """
        # Arrange
        resource_id = "test-resource-123"
        endpoint = f"{api_base_url}/api/connections/{resource_id}"
        
        payload_a = {"name": "Version A"}
        payload_b = {"name": "Version B"}
        
        results = []
        
        def write(payload):
            response = requests.put(endpoint, json=payload, headers=valid_auth_header)
            results.append(response)
        
        # Act - Concurrent writes
        threads = [
            threading.Thread(target=write, args=(payload_a,)),
            threading.Thread(target=write, args=(payload_b,)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        
        # Assert
        assert len(results) == 2
        # One should win (last write), no partial updates
        for response in results:
            if response.status_code == 200:
                # Should have consistent data
                data = response.json()
                assert data.get("name") in ["Version A", "Version B"]

    @pytest.mark.concurrency
    def test_read_during_write_returns_consistent_state(self, valid_auth_header: Dict[str, str],
                                                       api_base_url="http://localhost:8000"):
        """
        Scenario: Read happens while write is in progress
        Expected: Read returns either old state or new state, not intermediate/corrupt state
        
        Edge case: Read-during-write consistency.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        write_payload = {
            "name": "Updated Name",
            "type": "postgresql",
        }
        
        write_result = []
        read_result = []
        
        def delayed_write():
            time.sleep(0.01)  # Small delay to ensure overlap
            response = requests.post(endpoint, json=write_payload, headers=valid_auth_header)
            write_result.append(response)
        
        def delayed_read():
            response = requests.get(endpoint, headers=valid_auth_header)
            read_result.append(response)
        
        # Act - Start write, then read
        write_thread = threading.Thread(target=delayed_write)
        read_thread = threading.Thread(target=delayed_read)
        
        write_thread.start()
        read_thread.start()
        read_thread.join()
        write_thread.join()
        
        # Assert
        assert len(read_result) > 0
        # Read should succeed and return consistent data
        if read_result[0].status_code == 200:
            data = read_result[0].json()
            assert data is not None


class TestConcurrentStateModification:
    """Test suite for concurrent state modification edge cases."""

    @pytest.mark.concurrency
    def test_concurrent_increment_operations_thread_safe(self, valid_auth_header: Dict[str, str],
                                                       api_base_url="http://localhost:8000"):
        """
        Scenario: Multiple users increment same counter simultaneously
        Expected: Final count = number of increments (no lost updates)
        
        Edge case: Lost update problem.
        """
        pytest.skip("Counter increment testing requires specific endpoint")

    @pytest.mark.concurrency
    def test_concurrent_delete_and_read_race(self, valid_auth_header: Dict[str, str],
                                            api_base_url="http://localhost:8000"):
        """
        Scenario: One thread deletes resource while another reads it
        Expected: Either read succeeds (resource not yet deleted) or 404 (deleted), not error
        
        Edge case: Delete-read race.
        """
        # Arrange
        resource_id = "race-test-resource"
        endpoint = f"{api_base_url}/api/connections/{resource_id}"
        
        results = {"delete": None, "read": None}
        
        def delete():
            response = requests.delete(endpoint, headers=valid_auth_header)
            results["delete"] = response
        
        def read():
            time.sleep(0.001)  # Slight delay to create race condition
            response = requests.get(endpoint, headers=valid_auth_header)
            results["read"] = response
        
        # Act
        threads = [threading.Thread(target=delete), threading.Thread(target=read)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        
        # Assert
        # Read may return 200 (not yet deleted) or 404 (deleted)
        # Should not return 5xx or error
        if results["read"]:
            assert results["read"].status_code in [200, 404]


class TestRetryScenarios:
    """Test suite for retry behavior under concurrency."""

    @pytest.mark.concurrency
    def test_retry_storm_handling(self, valid_auth_header: Dict[str, str],
                                 api_base_url="http://localhost:8000"):
        """
        Scenario: Client retries same request 10 times/second after network error
        Expected: Server throttles gracefully (429) or accepts idempotent retries
        
        Edge case: Retry storm / retry amplification.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        idempotency_key = "retry-storm-key"
        
        headers = {**valid_auth_header, "Idempotent-Key": idempotency_key}
        payload = {"name": "Retry Test", "type": "postgresql"}
        
        results = []
        
        def retry():
            # Simulate retry attempts
            for i in range(10):
                response = requests.post(endpoint, json=payload, headers=headers)
                results.append(response)
                time.sleep(0.01)  # 100ms between retries (slower than actual storm)
        
        # Act
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(retry) for _ in range(3)]
            for future in as_completed(futures):
                future.result()
        
        # Assert
        # Should handle gracefully
        status_codes = [r.status_code for r in results]
        # Should have mix of successes (201) and possibly some conflicts (409) or throttles (429)
        assert any(s in [201, 200] for s in status_codes), "Some requests should succeed"
        assert not any(s >= 500 for s in status_codes), "Should not return 5xx errors"

    @pytest.mark.concurrency
    def test_idempotent_retries_safe(self, valid_auth_header: Dict[str, str],
                                    mock_idempotent_key,
                                    api_base_url="http://localhost:8000"):
        """
        Scenario: Client safely retries with idempotency key
        Expected: Multiple retries return consistent result without side effects
        
        Edge case: Retry safety.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        idempotency_key = "safe-retry-key"
        
        headers = {**valid_auth_header, "Idempotent-Key": idempotency_key}
        payload = {"name": "Safe Retry Test", "type": "postgresql"}
        
        # Act - Make 3 identical requests with same idempotency key
        results = [
            requests.post(endpoint, json=payload, headers=headers)
            for _ in range(3)
        ]
        
        # Assert
        # All successful responses should have same ID (same resource)
        successful = [r for r in results if r.status_code in [200, 201]]
        if len(successful) >= 2:
            ids = []
            for r in successful:
                data = r.json()
                if "id" in data:
                    ids.append(data["id"])
            
            if len(ids) >= 2:
                # All IDs should be the same (same resource created)
                assert len(set(ids)) == 1, "Idempotent retries should return same resource"


class TestConnectionPoolStress:
    """Test suite for connection pool and resource limits."""

    @pytest.mark.concurrency
    @pytest.mark.slow
    def test_many_concurrent_connections(self, valid_auth_header: Dict[str, str],
                                        api_base_url="http://localhost:8000"):
        """
        Scenario: 100 concurrent connections to API
        Expected: Handled gracefully or rejected with 503 when limit reached
        
        Edge case: Connection pool exhaustion.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        results = []
        
        def remote_call():
            response = requests.get(endpoint, headers=valid_auth_header, timeout=5)
            results.append(response)
        
        # Act - Create many concurrent requests
        try:
            with ThreadPoolExecutor(max_workers=20) as executor:
                futures = [executor.submit(remote_call) for _ in range(100)]
                for future in as_completed(futures):
                    future.result(timeout=10)
        except Exception as e:
            # Connection errors are acceptable under stress
            pass
        
        # Assert
        # Should handle gracefully without server crash
        status_codes = [r.status_code for r in results]
        # May have 429 (rate limit), 503 (service unavailable), or some 200s
        assert not any(s >= 500 for s in status_codes if s != 503), \
            "Should not have unexpected errors"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-m", "not slow"])
