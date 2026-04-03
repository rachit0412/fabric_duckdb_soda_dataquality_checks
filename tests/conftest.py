"""
Pytest Configuration and Fixture Registration

Registers all fixtures from the fixtures package for use across the test suite.
"""

import sys
from pathlib import Path

# Add fixtures to pytest's fixture discovery
# Use relative imports from the fixtures package
pytest_plugins = [
    'fixtures.auth_fixtures',
    'fixtures.data_fixtures',
    'fixtures.mock_services',
]


def pytest_configure(config):
    """Register custom pytest markers."""
    config.addinivalue_line(
        "markers", "auth: authentication and authorization tests"
    )
    config.addinivalue_line(
        "markers", "security: security and vulnerability tests"
    )
    config.addinivalue_line(
        "markers", "multitenant: multitenant isolation tests"
    )
    config.addinivalue_line(
        "markers", "data_quality: data quality and validation tests"
    )
    config.addinivalue_line(
        "markers", "ui_state: UI state and UX tests"
    )
    config.addinivalue_line(
        "markers", "frontend: frontend-specific tests"
    )
    config.addinivalue_line(
        "markers", "api_behavior: API behavior and contract tests"
    )
    config.addinivalue_line(
        "markers", "concurrency: concurrency and parallelism tests"
    )
    config.addinivalue_line(
        "markers", "resilience: resilience and fault tolerance tests"
    )
    config.addinivalue_line(
        "markers", "critical: critical/high-priority tests"
    )
    config.addinivalue_line(
        "markers", "slow: slow-running tests to skip in CI"
    )
    config.addinivalue_line(
        "markers", "xfail: tests expected to fail or skip"
    )
    config.addinivalue_line(
        "markers", "flaky: tests that may fail intermittently"
    )
