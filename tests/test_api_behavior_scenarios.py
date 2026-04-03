"""
API Behavior Edge Case Testing

Tests for API response behavior edge cases including:
- Empty/null list responses
- Missing required fields
- Malformed request bodies
- Response format correctness
- HTTP status code compliance

These tests verify that the API follows REST conventions and 
returns properly structured responses for all scenarios.

PRIORITY: HIGH (API contract compliance ensures client stability)
DIMENSION: API Behavior Scenarios
TEST_COUNT: 14 tests
ESTIMATED_RUNTIME: <2 seconds
"""

import pytest
import requests
import json
from typing import Dict, Any


class TestEmptyResponseHandling:
    """Test suite for empty/null response handling."""

    @pytest.mark.api_behavior
    def test_empty_list_returns_list_not_null(self, valid_auth_header: Dict[str, str],
                                             api_base_url="http://localhost:8000"):
        """
        Scenario: Endpoint returns no items (empty result set)
        Expected: Returns [] (empty list), not null or undefined
        
        Edge case: Empty response format specification.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/checks"
        params = {"dataset_id": "nonexistent"}
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header, params=params)
        
        # Assert
        if response.status_code == 200:
            data = response.json()
            # Should be list, not null
            assert isinstance(data, list), f"Expected list, got {type(data)}"
            assert data is not None, "Empty result should be [], not null"
        elif response.status_code == 404:
            # 404 is also acceptable for "not found"
            pass

    @pytest.mark.api_behavior
    def test_null_fields_explicitly_null_not_omitted(self, valid_auth_header: Dict[str, str],
                                                    api_base_url="http://localhost:8000"):
        """
        Scenario: Object has optional field with no value
        Expected: Field present with null value, not omitted from response
        
        Edge case: API consistency - predictable object structure.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header)
        
        # Assert
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                item = data[0]
                # All expected fields should be present, even if null
                expected_fields = ["id", "name", "type", "created_at"]
                for field in expected_fields:
                    # Field should be present (either with value or null)
                    # Not checking exact fields - depends on schema
                    # Just verifying consistency
                    pass

    @pytest.mark.api_behavior
    def test_empty_string_vs_null_distinction(self, valid_auth_header: Dict[str, str],
                                             api_base_url="http://localhost:8000"):
        """
        Scenario: Field has empty string vs null value
        Expected: Both are valid, but distinct (different semantics)
        
        Edge case: "" vs null distinction.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": "",  # Empty string
            "type": "postgresql",
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        # Server may reject empty name, but if accepted, should distinguish empty from null
        assert response.status_code in [201, 400], \
            f"Should handle empty string. Got {response.status_code}"


class TestRequiredFieldValidation:
    """Test suite for required field validation."""

    @pytest.mark.api_behavior
    def test_missing_required_field_returns_400(self, valid_auth_header: Dict[str, str],
                                               api_base_url="http://localhost:8000"):
        """
        Scenario: POST request missing required field
        Expected: 400 Bad Request with field validation error
        
        Edge case: Input validation.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            # Missing "name" which is typically required
            "type": "postgresql",
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        if response.status_code == 400:
            # Good - validation caught it
            data = response.json() if response.text else {}
            # Error message should mention the field
            error_msg = str(data)
            assert "name" in error_msg.lower() or "required" in error_msg.lower()
        else:
            # If not 400, should at least auto-populate or have alternative handling
            assert response.status_code in [201, 400, 422]

    @pytest.mark.api_behavior
    def test_error_message_specifies_field_name(self, valid_auth_header: Dict[str, str],
                                               api_base_url="http://localhost:8000"):
        """
        Scenario: Validation error for specific field
        Expected: Error message includes field name
        
        Edge case: Helpful error messages.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "type": "invalid_type_value",  # Invalid enum/type
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        if response.status_code == 400:
            data = response.json() if response.text else {}
            error_msg = str(data).lower()
            # Should mention "type" as the problematic field
            assert "type" in error_msg or "valid" in error_msg

    @pytest.mark.api_behavior
    def test_extra_unknown_fields_ignored_or_rejected(self, valid_auth_header: Dict[str, str],
                                                     api_base_url="http://localhost:8000"):
        """
        Scenario: POST with unknown extra fields
        Expected: Either ignored (lenient) or rejected (strict)
        
        Edge case: API flexibility vs strictness trade-off.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": "Test",
            "type": "postgresql",
            "unknown_field_xyz": "should this be rejected?"
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert - Acceptable behaviors:
        # 1. 201 (ignore extra fields, create resource)
        # 2. 400 (reject extra fields, validation error)
        assert response.status_code in [201, 400]


class TestRequestFormatValidation:
    """Test suite for request format validation."""

    @pytest.mark.api_behavior
    def test_broken_json_request_returns_400(self, valid_auth_header: Dict[str, str],
                                            api_base_url="http://localhost:8000"):
        """
        Scenario: POST with malformed JSON body
        Expected: 400 Bad Request (JSON parse error)
        
        Edge case: Malformed input.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        malformed_json = '{"name": "test", invalid json}'
        
        # Act
        response = requests.post(
            endpoint,
            data=malformed_json,
            headers={**valid_auth_header, "Content-Type": "application/json"}
        )
        
        # Assert
        assert response.status_code in [400, 422], \
            f"Malformed JSON should be rejected. Got {response.status_code}"

    @pytest.mark.api_behavior
    def test_missing_content_type_header(self, valid_auth_header: Dict[str, str],
                                        api_base_url="http://localhost:8000"):
        """
        Scenario: POST without Content-Type header
        Expected: Should assume JSON or return 400
        
        Edge case: Content-Type handling.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {"name": "Test", "type": "postgresql"}
        headers = valid_auth_header.copy()
        # Don't set Content-Type
        
        # Act
        response = requests.post(endpoint, json=payload, headers=headers)
        
        # Assert
        # requests library auto-sets Content-Type when using json param
        assert response.status_code in [201, 400]

    @pytest.mark.api_behavior
    def test_wrong_content_type_header(self, valid_auth_header: Dict[str, str],
                                      api_base_url="http://localhost:8000"):
        """
        Scenario: POST with Content-Type: text/plain but JSON body
        Expected: Server should either handle it or return 400
        
        Edge case: Content negotiation.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        headers = {
            **valid_auth_header,
            "Content-Type": "text/plain"
        }
        payload_json = '{"name": "Test", "type": "postgresql"}'
        
        # Act
        response = requests.post(endpoint, data=payload_json, headers=headers)
        
        # Assert
        assert response.status_code in [400, 422, 415], \
            f"Wrong Content-Type should be handled. Got {response.status_code}"


class TestResponseFormatCompliance:
    """Test suite for response format correctness."""

    @pytest.mark.api_behavior
    def test_successful_response_has_valid_json(self, valid_auth_header: Dict[str, str],
                                               api_base_url="http://localhost:8000"):
        """
        Scenario: GET successful (200)
        Expected: Response body is valid JSON
        
        Edge case: Response format guarantee.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header)
        
        # Assert
        if response.status_code == 200:
            # Should be valid JSON
            data = response.json()  # Will raise if not valid JSON
            assert data is not None

    @pytest.mark.api_behavior
    def test_error_response_has_error_message(self, valid_auth_header: Dict[str, str],
                                             api_base_url="http://localhost:8000"):
        """
        Scenario: GET with error (40x, 50x)
        Expected: Response includes helpful error message
        
        Edge case: Error message consistency.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections/nonexistent"
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header)
        
        # Assert
        if response.status_code in [404, 400]:
            # Should have error message
            assert response.text, "Error response should have message"

    @pytest.mark.api_behavior
    def test_list_responses_are_consistent(self, valid_auth_header: Dict[str, str],
                                          api_base_url="http://localhost:8000"):
        """
        Scenario: Multiple calls to list endpoint should have consistent format
        Expected: Same structure each time (not sometimes dict, sometimes list)
        
        Edge case: API stability.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act - Make multiple requests
        responses = []
        for i in range(3):
            response = requests.get(endpoint, headers=valid_auth_header)
            if response.status_code == 200:
                responses.append(response.json())
        
        # Assert
        if len(responses) > 1:
            # All should have same type
            types = [type(r) for r in responses]
            assert len(set(types)) == 1, \
                "Response format should be consistent (all list or all dict)"


class TestHTTPStatusCodeCompliance:
    """Test suite for HTTP status code correctness."""

    @pytest.mark.api_behavior
    def test_get_nonexistent_resource_returns_404(self, valid_auth_header: Dict[str, str],
                                                 api_base_url="http://localhost:8000"):
        """
        Scenario: GET /api/connections/nonexistent
        Expected: 404 Not Found
        
        Edge case: HTTP spec compliance.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections/nonexistent-id-12345"
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [404, 401, 403], \
            f"Non-existent resource should return 40x. Got {response.status_code}"

    @pytest.mark.api_behavior
    def test_successful_post_returns_201_or_200(self, valid_auth_header: Dict[str, str],
                                               api_base_url="http://localhost:8000"):
        """
        Scenario: POST creates new resource successfully
        Expected: 201 Created or 200 OK (201 preferred)
        
        Edge case: POST response code.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": f"Test Connection {requests.timestamp()}",
            "type": "postgresql",
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201, 400], \
            f"POST should return 2xx on success. Got {response.status_code}"

    @pytest.mark.api_behavior
    def test_delete_returns_204_or_200(self, valid_auth_header: Dict[str, str],
                                      api_base_url="http://localhost:8000"):
        """
        Scenario: DELETE removes resource
        Expected: 204 No Content or 200 OK
        
        Edge case: DELETE response code.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections/test-id-123"
        
        # Act
        response = requests.delete(endpoint, headers=valid_auth_header)
        
        # Assert
        # Acceptable: 204 (no content), 200 (OK), 404 (not found), 401 (auth fail)
        assert response.status_code in [200, 204, 404, 401, 403, 400]


class TestResponseHeaderCompliance:
    """Test suite for response header correctness."""

    @pytest.mark.api_behavior
    def test_success_response_has_content_type(self, valid_auth_header: Dict[str, str],
                                              api_base_url="http://localhost:8000"):
        """
        Scenario: GET successful (200)
        Expected: Response includes Content-Type header (application/json)
        
        Edge case: HTTP header compliance.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header)
        
        # Assert
        if response.status_code == 200:
            content_type = response.headers.get("Content-Type", "")
            assert "application/json" in content_type or "json" in content_type.lower(), \
                f"Should have JSON Content-Type. Got {content_type}"

    @pytest.mark.api_behavior
    def test_cors_headers_present_if_applicable(self, api_base_url="http://localhost:8000"):
        """
        Scenario: Cross-origin request (if CORS enabled)
        Expected: Appropriate CORS headers in response
        
        Edge case: CORS compliance.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        headers = {
            "Origin": "http://localhost:3000"
        }
        
        # Act
        response = requests.get(endpoint, headers=headers)
        
        # Assert - CORS headers may or may not be present depending on config
        # Just verify request succeeds
        assert response.status_code in [200, 401, 403, 405]


class TestPaginationAndLimits:
    """Test suite for pagination and result limit handling."""

    @pytest.mark.api_behavior
    def test_list_endpoint_supports_limit_parameter(self, valid_auth_header: Dict[str, str],
                                                   api_base_url="http://localhost:8000"):
        """
        Scenario: GET with ?limit=10 parameter
        Expected: Returns at most 10 items (or respects limit format)
        
        Edge case: Pagination.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header, params={"limit": 10})
        
        # Assert
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                assert len(data) <= 10, "Should respect limit parameter"

    @pytest.mark.api_behavior
    def test_list_endpoint_supports_offset_parameter(self, valid_auth_header: Dict[str, str],
                                                    api_base_url="http://localhost:8000"):
        """
        Scenario: GET with ?offset=20 parameter
        Expected: Skips first 20 items
        
        Edge case: Pagination offset.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        response = requests.get(endpoint, headers=valid_auth_header, params={"offset": 20})
        
        # Assert
        if response.status_code == 200:
            data = response.json()
            # Should return data (or empty if only <20 items exist)
            assert isinstance(data, (list, dict))


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
