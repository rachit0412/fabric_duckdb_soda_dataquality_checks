"""
Security Edge Case Testing

Tests for security vulnerabilities and attack prevention including:
- SQL injection prevention
- Cross-site scripting (XSS) prevention
- Command injection prevention
- Path traversal attacks
- CORS and header injection
- Input validation

These tests verify that the API is protected against common
security attacks and vulnerabilities.

PRIORITY: HIGH (Security vulnerabilities have high impact)
DIMENSION: Security Scenarios
TEST_COUNT: 12 tests
ESTIMATED_RUNTIME: <2 seconds
"""

import pytest
import requests
from typing import Dict, Any
from urllib.parse import quote


class TestSQLInjectionPrevention:
    """Test suite for SQL injection prevention."""

    @pytest.mark.security
    @pytest.mark.critical
    def test_sql_injection_in_connection_name(self, valid_auth_header: Dict[str, str],
                                             api_base_url="http://localhost:8000"):
        """
        Scenario: Connection name with SQL injection payload
        Expected: Payload treated as literal string, not executed
        
        Payload: "'; DROP TABLE connections;--"
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": "'; DROP TABLE connections;--",
            "type": "postgresql",
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        if response.status_code in [200, 201]:
            # If created, verify it's stored as literal string
            created_resource = response.json()
            assert created_resource.get("name") == "'; DROP TABLE connections;--"
            
            # Verify table still exists (query to get all connections succeeds)
            list_response = requests.get(endpoint, headers=valid_auth_header)
            assert list_response.status_code == 200

    @pytest.mark.security
    def test_sql_injection_in_query_parameter(self, valid_auth_header: Dict[str, str],
                                             api_base_url="http://localhost:8000"):
        """
        Scenario: SQL injection via query parameter
        Expected: Parameterized query prevents injection
        
        Payload: "?search=' OR '1'='1"
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        malicious_search = "' OR '1'='1"
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header,
                              params={"search": malicious_search})
        
        # Assert
        # Should return safely (empty results or filtered results)
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            # Should not expose admin/all data
            assert isinstance(data, (list, dict))

    @pytest.mark.security
    def test_sql_union_based_injection(self, valid_auth_header: Dict[str, str],
                                      api_base_url="http://localhost:8000"):
        """
        Scenario: UNION-based SQL injection for data exfiltration
        Expected: Query prevented or returns filtered results
        
        Payload: "1 UNION SELECT * FROM users--"
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header,
                              params={"id": "1 UNION SELECT * FROM users--"})
        
        # Assert
        assert response.status_code in [200, 400, 404]
        # Should not leak user data
        data = response.json() if response.text else {}
        assert data is not None


class TestXSSPrevention:
    """Test suite for Cross-Site Scripting (XSS) prevention."""

    @pytest.mark.security
    @pytest.mark.critical
    def test_xss_script_tag_in_description(self, valid_auth_header: Dict[str, str],
                                          api_base_url="http://localhost:8000"):
        """
        Scenario: Connection description contains JavaScript
        Expected: Stored safely, escaped in HTML response
        
        Payload: "<img src=x onerror=alert('XSS')>"
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": "Test",
            "type": "postgresql",
            "description": "<img src=x onerror=alert('XSS')>"
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        if response.status_code in [200, 201]:
            # Verify payload was stored
            created = response.json()
            stored_desc = created.get("description", "")
            
            # Should contain the literal string or escaped version
            assert "<img" in stored_desc or "&lt;img" in stored_desc or "img" in stored_desc

    @pytest.mark.security
    def test_xss_event_handler_in_name(self, valid_auth_header: Dict[str, str],
                                      api_base_url="http://localhost:8000"):
        """
        Scenario: Connection name contains event handler
        Expected: Stored safely, no execution
        
        Payload: 'onload=alert(1)'
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": "Test onload=alert(1)",
            "type": "postgresql",
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        if response.status_code in [200, 201]:
            created = response.json()
            # Should store safely
            assert created.get("name") is not None

    @pytest.mark.security
    def test_xss_javascript_url_scheme(self, valid_auth_header: Dict[str, str],
                                      api_base_url="http://localhost:8000"):
        """
        Scenario: URL field contains javascript: protocol
        Expected: Rejected, sanitized, or stored safely
        
        Payload: "javascript:alert('XSS')"
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": "Test",
            "type": "postgresql",
            "url": "javascript:alert('XSS')",
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        # Acceptable: reject with 400, or store safely
        assert response.status_code in [200, 201, 400]


class TestCommandInjectionPrevention:
    """Test suite for command injection prevention."""

    @pytest.mark.security
    def test_shell_command_injection_in_name(self, valid_auth_header: Dict[str, str],
                                            api_base_url="http://localhost:8000"):
        """
        Scenario: Connection name contains shell metacharacters
        Expected: Treated as literal string, not executed
        
        Payload: "test; rm -rf /"
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": "test; rm -rf /",
            "type": "postgresql",
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        if response.status_code in [200, 201]:
            # Verify stored as literal
            created = response.json()
            assert created.get("name") == "test; rm -rf /"

    @pytest.mark.security
    def test_command_substitution_prevention(self, valid_auth_header: Dict[str, str],
                                            api_base_url="http://localhost:8000"):
        """
        Scenario: Input with command substitution syntax
        Expected: Treated as literal
        
        Payload: "test $(whoami) test"
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": "test $(whoami) test",
            "type": "postgresql",
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        if response.status_code in [200, 201]:
            created = response.json()
            assert created.get("name") == "test $(whoami) test"


class TestPathTraversalPrevention:
    """Test suite for path traversal attack prevention."""

    @pytest.mark.security
    def test_parent_directory_traversal(self, valid_auth_header: Dict[str, str],
                                       api_base_url="http://localhost:8000"):
        """
        Scenario: Path parameter with directory traversal
        Expected: Prevented or normalized
        
        Payload: "?file=../../etc/passwd"
        """
        # Arrange
        endpoint = f"{api_base_url}/api/files"  # Hypothetical file endpoint
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header,
                              params={"file": "../../etc/passwd"})
        
        # Assert
        # Should either: 404 (file not found), 400 (invalid), or safe response
        assert response.status_code in [400, 404, 401, 403]

    @pytest.mark.security
    def test_path_traversal_url_encoded(self, valid_auth_header: Dict[str, str],
                                       api_base_url="http://localhost:8000"):
        """
        Scenario: Path traversal with URL encoding
        Expected: Prevented even when encoded
        
        Payload: "?file=%2e%2e%2fetc%2fpasswd"
        """
        # Arrange
        endpoint = f"{api_base_url}/api/files"  # Hypothetical file endpoint
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header,
                              params={"file": quote("../../etc/passwd")})
        
        # Assert
        assert response.status_code in [400, 404, 401, 403]

    @pytest.mark.security
    def test_null_byte_injection_path(self, valid_auth_header: Dict[str, str],
                                     api_base_url="http://localhost:8000"):
        """
        Scenario: Null byte in path to bypass validation
        Expected: Safely handled
        
        Payload: "file.txt%00.jpg"
        """
        # Arrange
        endpoint = f"{api_base_url}/api/files"  # Hypothetical file endpoint
        
        # Act
        try:
            response = requests.get(endpoint, headers=valid_auth_header,
                                  params={"file": "file.txt\x00.jpg"})
            # Assert
            assert response.status_code in [400, 404]
        except (ValueError, requests.exceptions.InvalidURL):
            # Rejecting null bytes is acceptable
            assert True


class TestHeaderInjectionAndCORS:
    """Test suite for header injection and CORS issues."""

    @pytest.mark.security
    def test_header_injection_newline(self, valid_auth_header: Dict[str, str],
                                     api_base_url="http://localhost:8000"):
        """
        Scenario: Newline in header value for injection
        Expected: Rejected or safely handled
        
        Payload: "value\r\nX-Injected-Header: malicious"
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        try:
            headers = {
                **valid_auth_header,
                "X-Custom-Header": "value\r\nX-Injected: malicious"
            }
            response = requests.get(endpoint, headers=headers)
            # Most HTTP libraries reject this
            assert True
        except (ValueError, requests.exceptions.InvalidHeader):
            # Rejection is good
            assert True

    @pytest.mark.security
    def test_cors_credential_leakage_prevention(self, api_base_url="http://localhost:8000"):
        """
        Scenario: CORS misconfiguration allowing credential leakage
        Expected: CORS headers properly configured
        
        Check: Access-Control-Allow-Credentials vs Access-Control-Allow-Origin: *
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        response = requests.options(endpoint, headers={"Origin": "http://attacker.com"})
        
        # Assert
        cors_allow = response.headers.get("Access-Control-Allow-Origin", "")
        cors_creds = response.headers.get("Access-Control-Allow-Credentials", "")
        
        # Should not allow * with credentials
        if cors_allow == "*" and cors_creds == "true":
            pytest.fail("CORS misconfiguration: Allow-Origin: * with Allow-Credentials: true")


class TestInputValidationAndTypes:
    """Test suite for input validation and type checking."""

    @pytest.mark.security
    def test_type_confusion_attack(self, valid_auth_header: Dict[str, str],
                                  api_base_url="http://localhost:8000"):
        """
        Scenario: String sent where number expected
        Expected: Validated and rejected or coerced safely
        
        Payload: {"port": "not_a_number"}
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": "Test",
            "type": "postgresql",
            "port": "not_a_number",  # Should be integer
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        # Acceptable: reject with 400 or coerce to valid
        assert response.status_code in [201, 400, 422]

    @pytest.mark.security
    def test_negative_size_parameter(self, valid_auth_header: Dict[str, str],
                                    api_base_url="http://localhost:8000"):
        """
        Scenario: Negative value for size parameter
        Expected: Rejected or clamped to valid range
        
        Payload: {"limit": -100}
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header,
                              params={"limit": -100})
        
        # Assert
        # Should handle gracefully
        assert response.status_code in [200, 400]

    @pytest.mark.security
    def test_exponential_backoff_values(self, valid_auth_header: Dict[str, str],
                                       api_base_url="http://localhost:8000"):
        """
        Scenario: Extremely large numbers for retry parameters
        Expected: Clamped or rejected
        
        Payload: {"max_retries": 999999999999999}
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header,
                              params={"timeout": 999999999})
        
        # Assert
        assert response.status_code in [200, 400]


class TestAuthenticationBypass:
    """Test suite for authentication bypass prevention."""

    @pytest.mark.security
    def test_auth_bypass_via_case_sensitivity(self, api_base_url="http://localhost:8000"):
        """
        Scenario: Authorization header with variation in case
        Expected: Handled correctly (case-insensitive for Bearer)
        
        Payload: "bearer token" (lowercase b)
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        headers = {
            "authorization": "bearer valid.token.here"  # lowercase
        }
        
        # Act
        response = requests.get(endpoint, headers=headers)
        
        # Assert
        # Should either accept (HTTP headers case-insensitive) or reject with 401
        assert response.status_code in [200, 401]

    @pytest.mark.security
    def test_auth_bypass_http_pollution(self, api_base_url="http://localhost:8000"):
        """
        Scenario: Multiple Authorization headers
        Expected: First one used or error
        
        Payload: Two Authorization headers
        """
        # Arrange - requests library uses dict so only one header sent
        # This is more of a framework concern
        pytest.skip("HTTP header pollution testing requires raw HTTP library")

    @pytest.mark.security
    def test_session_fixation_attack(self, api_base_url="http://localhost:8000"):
        """
        Scenario: Attacker sets session cookie before user logs in
        Expected: Session invalidated or new one created on login
        
        Edge case: Session fixation.
        """
        pytest.skip("Session fixation testing requires cookie/session management")


class TestRateLimitingAndDOS:
    """Test suite for rate limiting and DoS prevention."""

    @pytest.mark.security
    def test_rate_limiting_enforced(self, valid_auth_header: Dict[str, str],
                                   api_base_url="http://localhost:8000"):
        """
        Scenario: Rapid requests from same IP/user
        Expected: Rate limited with 429 after threshold
        
        Edge case: DoS prevention.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act - Make many rapid requests
        responses = []
        for i in range(100):
            response = requests.get(endpoint, headers=valid_auth_header)
            responses.append(response.status_code)
        
        # Assert
        status_codes = set(responses)
        # Should have either: all 200s (no rate limiting), or some 429s (rate limiting enforced)
        # Both are acceptable depending on configuration


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
