"""
Mock Services & Failure Fixtures

Provides mocked services to simulate failures, timeouts, and edge cases
for testing resilience and error handling during PHASE 2 testing.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import time
from typing import Callable, Any
from contextlib import contextmanager


# ============================================================================
# Service Mock Fixtures
# ============================================================================


@pytest.fixture
def mock_database_unavailable(monkeypatch):
    """Fixture: Mock database as unavailable (connection fails)."""
    def mock_connection(*args, **kwargs):
        raise Exception("Database connection refused: Connection refused")
    
    monkeypatch.setattr("src.storage.db.engine.connect", mock_connection)
    return mock_connection


@pytest.fixture
def mock_slow_api(monkeypatch):
    """Fixture: Mock API endpoint with 10s latency."""
    def slow_request(*args, **kwargs):
        time.sleep(10)
        return Mock(status_code=200, json=lambda: {"status": "ok"})
    
    monkeypatch.setattr("requests.get", slow_request)
    monkeypatch.setattr("requests.post", slow_request)
    return slow_request


@pytest.fixture
def mock_api_timeout(monkeypatch):
    """Fixture: Mock API endpoint that times out."""
    def timeout_request(*args, **kwargs):
        raise TimeoutError("Connection timed out after 30s")
    
    monkeypatch.setattr("requests.get", timeout_request)
    monkeypatch.setattr("requests.post", timeout_request)
    return timeout_request


@pytest.fixture
def mock_network_failure(monkeypatch):
    """Fixture: Mock network completely unavailable."""
    def network_error(*args, **kwargs):
        raise ConnectionError("Network is unreachable")
    
    monkeypatch.setattr("requests.get", network_error)
    monkeypatch.setattr("requests.post", network_error)
    return network_error


@pytest.fixture
def mock_dns_failure(monkeypatch):
    """Fixture: Mock DNS resolution failure."""
    def dns_error(*args, **kwargs):
        raise OSError("Name or service not known")
    
    monkeypatch.setattr("requests.get", dns_error)
    monkeypatch.setattr("requests.post", dns_error)
    return dns_error


@pytest.fixture
def mock_corrupted_database(monkeypatch):
    """Fixture: Mock database with corrupted records."""
    def query_with_corruption(*args, **kwargs):
        return Mock(status_code=500, text="Corrupt data detected")
    
    monkeypatch.setattr("src.storage.db.session.query", query_with_corruption)
    return query_with_corruption


@pytest.fixture
def mock_partial_outage(monkeypatch):
    """Fixture: Mock where suggestions API is down but metadata works."""
    def suggestions_down(*args, **kwargs):
        if "suggestions" in str(args):
            raise ConnectionError("Suggestions service unavailable")
        return Mock(status_code=200, json=lambda: {})
    
    monkeypatch.setattr("requests.post", suggestions_down)
    return suggestions_down


# ============================================================================
# Latency Simulation Fixtures
# ============================================================================


@pytest.fixture
def simulate_high_latency():
    """Fixture: Context manager to simulate high latency requests."""
    @contextmanager
    def _simulate(latency_seconds: float = 5):
        original_sleep = time.sleep
        
        def slow_sleep(seconds):
            if seconds > 0:
                original_sleep(latency_seconds)
            else:
                original_sleep(seconds)
        
        with patch("time.sleep", side_effect=slow_sleep):
            yield
    
    return _simulate


@pytest.fixture
def simulate_packet_loss():
    """Fixture: Simulate packet loss (10% failed requests)."""
    import random
    
    request_count = {"count": 0}
    
    def mock_request_with_loss(*args, **kwargs):
        request_count["count"] += 1
        if random.random() < 0.1:  # 10% loss
            raise ConnectionError("Packet loss: request failed")
        return Mock(status_code=200, json=lambda: {"status": "ok"})
    
    return mock_request_with_loss


# ============================================================================
# Response Mock Fixtures
# ============================================================================


@pytest.fixture
def mock_empty_response():
    """Fixture: API returns empty response."""
    return Mock(
        status_code=200,
        json=lambda: {"connections": [], "total": 0},
        text="",
    )


@pytest.fixture
def mock_malformed_json_response():
    """Fixture: API returns malformed JSON."""
    response = Mock()
    response.status_code = 200
    response.json.side_effect = ValueError("Invalid JSON: Expecting value")
    response.text = "{invalid json}"
    return response


@pytest.fixture
def mock_500_error_response():
    """Fixture: API returns 500 Internal Server Error."""
    return Mock(
        status_code=500,
        json=lambda: {
            "error": "Internal Server Error",
            "message": "Unexpected error occurred",
            "timestamp": "2026-04-03T12:00:00Z",
        },
        text="Internal Server Error",
    )


@pytest.fixture
def mock_429_rate_limited_response():
    """Fixture: API returns 429 Too Many Requests."""
    return Mock(
        status_code=429,
        json=lambda: {
            "error": "Rate Limited",
            "message": "Too many requests. Retry after 60 seconds.",
            "retry_after": 60,
        },
        headers={"Retry-After": "60"},
        text="Rate Limited",
    )


@pytest.fixture
def mock_403_forbidden_response():
    """Fixture: API returns 403 Forbidden."""
    return Mock(
        status_code=403,
        json=lambda: {
            "error": "Forbidden",
            "message": "You do not have permission to access this resource.",
        },
        text="Forbidden",
    )


@pytest.fixture
def mock_400_bad_request_response():
    """Fixture: API returns 400 Bad Request with validation errors."""
    return Mock(
        status_code=400,
        json=lambda: {
            "error": "Validation Error",
            "message": "Invalid request",
            "details": {
                "name": "This field is required.",
                "connection_string": "Invalid format.",
            },
        },
        text="Bad Request",
    )


# ============================================================================
# Circuit Breaker & Retry Mocks
# ============================================================================


class CircuitBreakerMock:
    """Mock circuit breaker for testing failure cascading."""
    
    def __init__(self, failure_threshold: int = 5):
        self.failure_threshold = failure_threshold
        self.failure_count = 0
        self.is_open = False
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function through circuit breaker."""
        if self.is_open:
            raise Exception("Circuit breaker is OPEN")
        
        try:
            result = func(*args, **kwargs)
            self.failure_count = 0  # Reset on success
            return result
        except Exception as e:
            self.failure_count += 1
            if self.failure_count >= self.failure_threshold:
                self.is_open = True
            raise e
    
    def reset(self):
        """Reset circuit breaker."""
        self.failure_count = 0
        self.is_open = False


@pytest.fixture
def circuit_breaker_mock():
    """Fixture: Circuit breaker that opens after N failures."""
    return CircuitBreakerMock(failure_threshold=3)


# ============================================================================
# Request/Response Recording Fixtures
# ============================================================================


class RequestRecorder:
    """Records all HTTP requests for inspection."""
    
    def __init__(self):
        self.requests = []
        self.responses = []
    
    def record_request(self, method: str, url: str, **kwargs):
        """Record an HTTP request."""
        self.requests.append({
            "method": method,
            "url": url,
            "kwargs": kwargs,
            "timestamp": time.time(),
        })
    
    def record_response(self, status_code: int, response_data: dict):
        """Record an HTTP response."""
        self.responses.append({
            "status_code": status_code,
            "data": response_data,
            "timestamp": time.time(),
        })
    
    def get_requests_to(self, url_fragment: str) -> list:
        """Get all requests matching URL fragment."""
        return [r for r in self.requests if url_fragment in r["url"]]
    
    def clear(self):
        """Clear all recordings."""
        self.requests.clear()
        self.responses.clear()


@pytest.fixture
def request_recorder():
    """Fixture: Records all HTTP requests/responses."""
    return RequestRecorder()


# ============================================================================
# Database State Mocks
# ============================================================================


@pytest.fixture
def mock_orphaned_records(monkeypatch):
    """Fixture: Database has orphaned records (parent deleted, child exists)."""
    def query_factory(*args, **kwargs):
        query_mock = Mock()
        query_mock.filter.return_value.all.return_value = [
            Mock(id=1, parent_id=999, data="orphan-1"),  # parent_id doesn't exist
            Mock(id=2, parent_id=999, data="orphan-2"),
        ]
        return query_mock
    
    monkeypatch.setattr("src.storage.db.session.query", query_factory)
    return query_factory


@pytest.fixture
def mock_corrupted_metadata(monkeypatch):
    """Fixture: Database has corrupted metadata (invalid JSON, etc.)."""
    def query_factory(*args, **kwargs):
        query_mock = Mock()
        query_mock.filter.return_value.first.return_value = Mock(
            id=1,
            metadata="{invalid json}",  # Corrupted
        )
        return query_mock
    
    monkeypatch.setattr("src.storage.db.session.query", query_factory)
    return query_factory


# ============================================================================
# Concurrency Mocks
# ============================================================================


class IdempotencyKeyTracker:
    """Tracks idempotency keys and returns cached results."""
    
    def __init__(self):
        self.cache = {}
        self.request_count = {}
    
    def handle_request(self, idempotency_key: str, func: Callable, *args, **kwargs) -> Any:
        """Process request with idempotency."""
        if idempotency_key in self.cache:
            # Return cached result
            return self.cache[idempotency_key]
        
        # Execute function
        result = func(*args, **kwargs)
        
        # Cache result
        self.cache[idempotency_key] = result
        self.request_count[idempotency_key] = self.request_count.get(idempotency_key, 0) + 1
        
        return result
    
    def get_request_count(self, idempotency_key: str) -> int:
        """Get number of times key was used."""
        return self.request_count.get(idempotency_key, 0)
    
    def clear(self):
        """Clear cache."""
        self.cache.clear()
        self.request_count.clear()


@pytest.fixture
def idempotency_tracker():
    """Fixture: Tracks idempotency key requests."""
    return IdempotencyKeyTracker()


@pytest.fixture
def mock_double_submit_protection():
    """Fixture: API protects against double submits."""
    submitted = {"ids": set()}
    
    def is_duplicate(request_id: str) -> bool:
        if request_id in submitted["ids"]:
            return True
        submitted["ids"].add(request_id)
        return False
    
    return is_duplicate
