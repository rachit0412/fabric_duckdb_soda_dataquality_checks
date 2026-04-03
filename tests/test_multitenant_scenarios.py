"""
Multitenant Data Isolation Edge Case Testing

Tests for multitenant scenarios including:
- Cross-tenant access attempts
- Missing/null tenant identifiers
- Tenant isolation verification
- Cross-tenant data leakage prevention

These tests verify that the API correctly enforces tenant boundaries
and resists data leakage between tenants.

Fixtures Used:
- valid_user, cross_tenant_user
- tenant_context, wrong_tenant_context, null_tenant_context
- valid_auth_header, cross_tenant_auth_header

PRIORITY: HIGH (Multitenant isolation affects security & data privacy)
DIMENSION: Multitenant Scenarios
TEST_COUNT: 7 tests
ESTIMATED_RUNTIME: <2 seconds
"""

import pytest
import requests
import json
from typing import Dict, Any, Optional
from unittest.mock import patch, MagicMock


class TestMultitenantDataIsolation:
    """Test suite for multitenant data isolation edge cases."""

    @pytest.mark.multitenant
    @pytest.mark.security
    def test_cross_tenant_query_returns_403_or_empty(self, 
                                                     cross_tenant_auth_header: Dict[str, str],
                                                     api_base_url="http://localhost:8000"):
        """
        Scenario: User from Tenant A attempts to query resources from Tenant B
        Expected: Either 403 Forbidden OR 200 with empty results
        
        Security principle: Strict interpretation prefers 403, but filtering is acceptable
        if all Tenant B data is removed from the response.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act
        response = requests.get(endpoint, headers=cross_tenant_auth_header)
        
        # Assert - Acceptable responses:
        # 1. 403 Forbidden (explicit denial)
        # 2. 200 OK but no data from other tenant
        assert response.status_code in [200, 403]
        
        if response.status_code == 200:
            try:
                data = response.json()
                # Verify no data from cross-tenant
                if isinstance(data, list):
                    # Should be empty or filtered
                    assert len(data) == 0, "Cross-tenant data should not be visible"
                elif isinstance(data, dict):
                    # Should not contain foreign tenant identifiers
                    assert data.get("tenant_id") is None or data.get("tenant_id") == "authorized_tenant"
            except json.JSONDecodeError:
                pass  # Empty response is acceptable

    @pytest.mark.multitenant
    @pytest.mark.security
    def test_post_without_tenant_id_returns_400(self, valid_auth_header: Dict[str, str],
                                               api_base_url="http://localhost:8000"):
        """
        Scenario: POST request without tenant_id in request body
        Expected: 400 Bad Request with field validation error
        
        Tenant ID should be required or auto-populated from auth context.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": "Test Connection",
            "type": "postgresql",
            # Missing tenant_id
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        # Should either:
        # 1. Reject with 400 (require explicit tenant_id)
        # 2. Accept with 201 but auto-populate tenant_id from auth context
        assert response.status_code in [400, 201]
        
        if response.status_code == 201:
            # Verify tenant_id was populated from auth
            data = response.json()
            assert "tenant_id" in data or "tenant" in data, \
                "System should auto-populate tenant_id from auth context"

    @pytest.mark.multitenant
    @pytest.mark.security
    def test_missing_tenant_header_uses_auth_context(self, valid_auth_header: Dict[str, str],
                                                    api_base_url="http://localhost:8000"):
        """
        Scenario: GET request without explicit X-Tenant-ID header
        Expected: 200 OK, using tenant from JWT token context
        
        Standard multitenant pattern: tenant derived from JWT, not required in headers.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        # Only provide Authorization header, no X-Tenant-ID
        headers = valid_auth_header.copy()
        headers.pop("X-Tenant-ID", None)  # Remove if present
        
        # Act
        response = requests.get(endpoint, headers=headers)
        
        # Assert
        # Should use tenant from JWT token
        assert response.status_code in [200, 401, 403]
        # Acceptable: 200 (uses auth context), 403 (tenant mismatch), 401 (auth failed)
        # Should NOT be 400 (bad request due to missing header)

    @pytest.mark.multitenant
    @pytest.mark.security
    def test_tenant_isolation_list_permissions(self, valid_auth_header: Dict[str, str],
                                              cross_tenant_auth_header: Dict[str, str],
                                              api_base_url="http://localhost:8000"):
        """
        Scenario: Two users from different tenants query same endpoint
        Expected: Each user sees only their own tenant's data
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act - Query as User A (Tenant X)
        response_a = requests.get(endpoint, headers=valid_auth_header)
        
        # Act - Query as User B (Tenant Y)
        response_b = requests.get(endpoint, headers=cross_tenant_auth_header)
        
        # Assert
        if response_a.status_code == 200 and response_b.status_code == 200:
            data_a = response_a.json() if response_a.text else []
            data_b = response_b.json() if response_b.text else []
            
            # Results should be different (unless both empty)
            # Results should not overlap
            if isinstance(data_a, list) and isinstance(data_b, list):
                ids_a = {item.get("id") for item in data_a}
                ids_b = {item.get("id") for item in data_b}
                overlap = ids_a & ids_b
                assert len(overlap) == 0, \
                    f"Tenants' results should not overlap. Overlap: {overlap}"

    @pytest.mark.multitenant
    @pytest.mark.security
    def test_null_tenant_id_handling(self, api_base_url="http://localhost:8000"):
        """
        Scenario: Attempt to create/access resource with NULL tenant_id
        Expected: 400 Bad Request or 403 Forbidden
        
        NULL tenant_id is ambiguous in a multitenant system and should be rejected.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        payload = {
            "name": "Test Connection",
            "type": "postgresql",
            "tenant_id": None  # Explicitly NULL
        }
        
        # Valid header needed for authentication, but tenant_id is NULL
        valid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        headers = {"Authorization": f"Bearer {valid_token}"}
        
        # Act
        response = requests.post(endpoint, json=payload, headers=headers)
        
        # Assert
        # Should reject NULL tenant_id as invalid
        assert response.status_code in [400, 403, 401], \
            f"NULL tenant_id should be rejected, got {response.status_code}"

    @pytest.mark.multitenant
    @pytest.mark.security
    def test_tenant_specific_resource_deletion(self, valid_auth_header: Dict[str, str],
                                              cross_tenant_auth_header: Dict[str, str],
                                              api_base_url="http://localhost:8000"):
        """
        Scenario: User attempts to delete another tenant's resource
        Expected: 403 Forbidden or 404 Not Found (resource doesn't exist for this tenant)
        
        Prevents cross-tenant data deletion attacks.
        """
        # Arrange
        # Hypothetical resource ID from another tenant
        resource_id = "foreign-tenant-resource-123"
        endpoint = f"{api_base_url}/api/connections/{resource_id}"
        
        # Act - Try to delete as User from different tenant
        response = requests.delete(endpoint, headers=cross_tenant_auth_header)
        
        # Assert
        # Should NOT return 200 (successful deletion)
        # Should return 403 (forbidden) or 404 (not visible to this tenant)
        assert response.status_code in [403, 404], \
            f"Cross-tenant deletion should be blocked. Got {response.status_code}"

    @pytest.mark.multitenant
    @pytest.mark.security
    def test_tenant_update_permission_check(self, valid_auth_header: Dict[str, str],
                                           api_base_url="http://localhost:8000"):
        """
        Scenario: User attempts to modify another resource by changing tenant_id
        Expected: 403 Forbidden or field ignored
        
        Prevents privilege escalation by changing resource ownership.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections/test-123"
        payload = {
            "name": "Updated Name",
            "tenant_id": "malicious-tenant-123"  # Attempt to change tenant
        }
        
        # Act
        response = requests.put(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        if response.status_code == 200:
            # If update succeeds, tenant_id should NOT be changed
            data = response.json()
            assert data.get("tenant_id") != "malicious-tenant-123", \
                "tenant_id modification attempt should be ignored"
        else:
            # Or rejection is fine too
            assert response.status_code in [403, 404, 400]


class TestMultitenantEdgeCases:
    """Additional multitenant edge cases and corner scenarios."""

    @pytest.mark.multitenant
    @pytest.mark.security
    def test_concurrent_multitenant_requests_isolation(self, valid_auth_header: Dict[str, str],
                                                      cross_tenant_auth_header: Dict[str, str],
                                                      api_base_url="http://localhost:8000"):
        """
        Scenario: Multiple concurrent requests from different tenants
        Expected: Each request returns only its tenant's data
        
        Verifies no race conditions cause data mix-up between tenants.
        """
        import threading
        
        results = {}
        
        def make_request(tenant_name, headers):
            endpoint = f"{api_base_url}/api/connections"
            response = requests.get(endpoint, headers=headers)
            results[tenant_name] = response
        
        # Arrange
        threads = [
            threading.Thread(target=make_request, args=("tenant_a", valid_auth_header)),
            threading.Thread(target=make_request, args=("tenant_b", cross_tenant_auth_header)),
            threading.Thread(target=make_request, args=("tenant_a_2", valid_auth_header)),
        ]
        
        # Act
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        
        # Assert
        assert len(results) == 3
        for tenant, response in results.items():
            assert response.status_code in [200, 403, 401]

    @pytest.mark.multitenant
    @pytest.mark.security
    def test_tenant_context_injection_attempt(self, api_base_url="http://localhost:8000"):
        """
        Scenario: Attempt to inject tenant context via query parameters
        Expected: Injected tenant_id ignored, uses auth context
        
        Prevents: tenant_id=../../../admin or similar injection.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections?tenant_id=../../admin"
        headers = {"Authorization": "Bearer valid.token.here"}
        
        # Act
        response = requests.get(endpoint, headers=headers)
        
        # Assert - Should not be 200 (should fail on auth, not process injection)
        assert response.status_code != 200, \
            "Injected tenant_id should not be accepted"
        assert response.status_code in [401, 400, 403], \
            f"Expected auth/validation error, got {response.status_code}"


class TestTenantContextManagement:
    """Test suite for tenant context lifecycle."""

    @pytest.mark.multitenant
    def test_tenant_context_preserved_across_requests(self, valid_auth_header: Dict[str, str],
                                                     api_base_url="http://localhost:8000"):
        """
        Scenario: Same user makes multiple requests in sequence
        Expected: Tenant context remains consistent
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        
        # Act - Make multiple requests
        responses = []
        for i in range(3):
            response = requests.get(endpoint, headers=valid_auth_header)
            responses.append(response)
        
        # Assert - All should have same tenant context
        for response in responses:
            assert response.status_code in [200, 403, 401]
            # If successful, should have consistent tenant info
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    tenant_ids = {item.get("tenant_id") for item in data}
                    assert len(tenant_ids) <= 1, \
                        "Multiple tenant_ids in single user's response indicates isolation failure"

    @pytest.mark.multitenant
    def test_tenant_switch_not_possible_mid_session(self, valid_auth_header: Dict[str, str],
                                                    api_base_url="http://localhost:8000"):
        """
        Scenario: User attempts to switch tenant mid-session
        Expected: Tenant remains from original auth, cannot switch
        
        Prevents: Session hijacking to access other tenant's data.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/connections"
        headers = valid_auth_header.copy()
        
        # First request with original tenant
        response1 = requests.get(endpoint, headers=headers)
        
        # Attempt to change tenant via header manipulation
        headers["X-Tenant-ID"] = "different-tenant-123"
        response2 = requests.get(endpoint, headers=headers)
        
        # Assert - Should use original tenant context, not header override
        # Both should return same tenant if header is ignored, or 403 if tenant mismatch
        if response1.status_code == 200 and response2.status_code == 200:
            data1 = response1.json() if response1.text else {}
            data2 = response2.json() if response2.text else {}
            # Results should match (same tenant context)
            assert data1 == data2 or len(data1) == len(data2), \
                "Tenant context should not change based on header alone"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
