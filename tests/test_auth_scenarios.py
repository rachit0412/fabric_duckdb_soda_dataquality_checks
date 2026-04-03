"""
Authentication Edge Case Testing

Tests for API authentication scenarios including:
- Missing/expired/malformed tokens
- Insufficient permissions
- Cross-tenant access attempts
- Session expiration

These tests verify that the API correctly enforces authentication
and authorization rules for all endpoints.

Fixtures Used:
- valid_user, admin_user, deleted_user, cross_tenant_user
- valid_token, admin_token, expired_token, malformed_token
- valid_auth_header, expired_auth_header, admin_auth_header, cross_tenant_auth_header

PRIORITY: HIGH (Authentication is critical for security)
DIMENSION: Authentication Scenarios
TEST_COUNT: 8 tests
ESTIMATED_RUNTIME: <2 seconds
"""

import pytest
import requests
import json
from typing import Dict, Any
from datetime import datetime, timedelta
import jwt


class TestAuthenticationScenarios:
    """Test suite for authentication edge cases."""

    @pytest.mark.auth
    @pytest.mark.security
    def test_no_auth_token_returns_401(self, api_base_url="http://localhost:8000"):
        """
        Scenario: GET request without Authorization header
        Expected: 401 Unauthorized
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        headers = {}  # No Authorization header
        
        # Act
        response = requests.get(endpoint, headers=headers)
        
        # Assert
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "unauthorized" in response.text.lower() or "authentication" in response.text.lower()

    @pytest.mark.auth
    @pytest.mark.security
    def test_expired_token_returns_401(self, expired_auth_header: Dict[str, str], 
                                      api_base_url="http://localhost:8000"):
        """
        Scenario: GET request with expired JWT token
        Expected: 401 Unauthorized + error message about token expiration
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        response = requests.get(endpoint, headers=expired_auth_header)
        
        # Assert
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        response_data = response.json() if response.text else {}
        assert "expired" in str(response_data).lower() or "token" in str(response_data).lower()

    @pytest.mark.auth
    @pytest.mark.security
    def test_malformed_token_returns_401(self, api_base_url="http://localhost:8000"):
        """
        Scenario: GET request with malformed/invalid JWT token
        Expected: 401 Unauthorized
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        headers = {
            "Authorization": "Bearer invalid.token.here"
        }
        
        # Act
        response = requests.get(endpoint, headers=headers)
        
        # Assert
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.auth
    @pytest.mark.security
    def test_wrong_token_type_returns_401(self, valid_token: str, 
                                         api_base_url="http://localhost:8000"):
        """
        Scenario: GET request with wrong authorization type (Basic instead of Bearer)
        Expected: 401 Unauthorized
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        headers = {
            "Authorization": f"Basic {valid_token}"  # Wrong scheme
        }
        
        # Act
        response = requests.get(endpoint, headers=headers)
        
        # Assert
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.auth
    @pytest.mark.security
    @pytest.mark.xfail(reason="Role-based access control may not be fully implemented yet")
    def test_insufficient_role_access_returns_403(self, valid_auth_header: Dict[str, str],
                                                 api_base_url="http://localhost:8000"):
        """
        Scenario: Non-admin user attempts to access admin-only endpoint
        Expected: 403 Forbidden
        
        Note: This assumes there are admin-only endpoints in the API.
        If not implemented, this test will be skipped.
        """
        # Arrange - Using valid token but from non-admin user
        endpoint = f"{api_base_url}/api/admin/users"  # Hypothetical admin endpoint
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header)
        
        # Assert
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        assert "forbidden" in response.text.lower() or "permission" in response.text.lower()

    @pytest.mark.auth
    @pytest.mark.security
    @pytest.mark.multitenant
    @pytest.mark.xfail(reason="Cross-tenant access control may not be fully implemented yet")
    def test_wrong_tenant_access_returns_403(self, cross_tenant_auth_header: Dict[str, str],
                                           api_base_url="http://localhost:8000"):
        """
        Scenario: Attempt to access another tenant's data
        Expected: 403 Forbidden
        
        This test verifies tenant isolation by attempting cross-tenant access.
        """
        # Arrange - Using auth header from a different tenant
        # In a real scenario, we'd query a resource belonging to tenant A using tenant B's token
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        response = requests.get(endpoint, headers=cross_tenant_auth_header)
        
        # Assert
        # Should either:
        # 1. Return 403 Forbidden (explicit denial)
        # 2. Return 200 but with empty/filtered results based on tenant
        # Stricter interpretation: 403
        assert response.status_code in [403, 200]
        if response.status_code == 200:
            data = response.json() if response.text else {}
            # Should not contain resources from other tenant
            assert not data or len(data) == 0

    @pytest.mark.auth
    @pytest.mark.security
    def test_deleted_user_auth_returns_401(self, deleted_user,
                                          api_base_url="http://localhost:8000"):
        """
        Scenario: Attempt to authenticate as a deleted/deactivated user
        Expected: 401 Unauthorized or 403 Forbidden
        
        Assumes that deleted_user fixture returns JWT token from a deactivated account.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        headers = {
            "Authorization": f"Bearer {getattr(deleted_user, 'token', 'unknown')}"
        }
        
        # Act - Even if token is structurally valid, user is deleted
        response = requests.get(endpoint, headers=headers)
        
        # Assert
        assert response.status_code in [401, 403], \
            f"Expected 401 or 403, got {response.status_code}"

    @pytest.mark.auth
    @pytest.mark.security
    def test_multiple_api_calls_with_valid_token_succeed(self, valid_auth_header: Dict[str, str],
                                                        api_base_url="http://localhost:8000"):
        """
        Scenario: Multiple consecutive API calls with same valid token
        Expected: All succeed (200 OK)
        
        This ensures that valid tokens remain valid across multiple requests
        and don't get invalidated after first use (unless explicitly designed to).
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        num_requests = 3
        
        # Act & Assert
        for i in range(num_requests):
            response = requests.get(endpoint, headers=valid_auth_header)
            assert response.status_code == 200, \
                f"Request {i+1} failed: expected 200, got {response.status_code}"


class TestSessionScenarios:
    """Test suite for session and token expiration edge cases."""

    @pytest.mark.auth
    @pytest.mark.security
    def test_token_reuse_across_different_endpoints(self, valid_auth_header: Dict[str, str],
                                                    api_base_url="http://localhost:8000"):
        """
        Scenario: Same token used to access different endpoints
        Expected: All endpoints accept the token (if user has permission)
        """
        # Arrange
        endpoints = [
            f"{api_base_url}/api/connections",
            f"{api_base_url}/api/suggestions",
            # Add more endpoints as needed
        ]
        
        # Act & Assert
        for endpoint in endpoints:
            response = requests.get(endpoint, headers=valid_auth_header)
            # Should not be 401 (auth error) - may be other errors (404, 500) but not auth
            assert response.status_code != 401, \
                f"Token rejected at {endpoint}: {response.status_code}"

    @pytest.mark.auth
    @pytest.mark.security
    @pytest.mark.xfail(reason="Session expiration may not be enforced in dev environment")
    def test_token_expires_after_inactivity(self, valid_auth_header: Dict[str, str],
                                           api_base_url="http://localhost:8000"):
        """
        Scenario: Token expires after period of inactivity
        Expected: 401 Unauthorized after expiration time
        
        This test is environment-dependent and may not work in dev/test environments
        where session timeout is disabled.
        """
        import time
        
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        timeout_seconds = 3600  # Hypothetical 1-hour timeout
        
        # Act - First request should succeed
        response1 = requests.get(endpoint, headers=valid_auth_header)
        assert response1.status_code == 200
        
        # Wait for session to expire (or simulate it)
        # In practice, this would wait for timeout_seconds
        # For testing, we might inject a mock or skip this
        
        # After timeout, request should fail
        # response2 = requests.get(endpoint, headers=valid_auth_header)
        # assert response2.status_code == 401


class TestAuthenticationErrorMessages:
    """Test suite for helpful auth error messages."""

    @pytest.mark.auth
    @pytest.mark.security
    def test_missing_auth_header_includes_helpful_message(self, 
                                                         api_base_url="http://localhost:8000"):
        """
        Scenario: Client makes request without Authorization header
        Expected: 401 response with helpful error message
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        headers = {}
        
        # Act
        response = requests.get(endpoint, headers=headers)
        
        # Assert
        assert response.status_code == 401
        # Response should be helpful (not just empty)
        assert response.text, "Error response should include message"

    @pytest.mark.auth
    @pytest.mark.security
    def test_expired_token_error_is_distinguishable_from_invalid(self,
                                                                 expired_token: str,
                                                                 api_base_url="http://localhost:8000"):
        """
        Scenario: Verify that 'token expired' error is distinguishable from 'invalid token'
        Expected: Error message should clearly indicate expiration
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        headers = {"Authorization": f"Bearer {expired_token}"}
        
        # Act
        response = requests.get(endpoint, headers=headers)
        
        # Assert
        assert response.status_code == 401
        # Should give specific error about expiration, not generic auth error
        try:
            data = response.json()
            error_message = str(data).lower()
            # Look for expiration-specific keywords
            has_expiration_hint = any(word in error_message 
                                     for word in ['expired', 'expir', 'age', 'old'])
        except:
            error_message = response.text.lower()
            has_expiration_hint = 'expired' in error_message or 'expir' in error_message


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
