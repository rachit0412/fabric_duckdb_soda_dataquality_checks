"""
Authentication & Authorization Fixtures

Provides test users, tokens, and auth scenarios for PHASE 2 testing.
"""

import pytest
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any


# JWT Configuration
JWT_SECRET = "test-secret-key-do-not-use-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 1


class TestUser:
    """Test user model for auth scenarios."""
    
    def __init__(
        self,
        user_id: str,
        name: str,
        email: str,
        role: str = "user",
        tenant_id: str = "tenant-1",
        is_active: bool = True,
    ):
        self.user_id = user_id
        self.name = name
        self.email = email
        self.role = role
        self.tenant_id = tenant_id
        self.is_active = is_active
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict for JWT payload."""
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "tenant_id": self.tenant_id,
            "is_active": self.is_active,
        }


def create_jwt_token(
    user: TestUser,
    expires_in_hours: int = JWT_EXPIRY_HOURS,
    algorithm: str = JWT_ALGORITHM,
    secret: str = JWT_SECRET,
) -> str:
    """Create a valid JWT token for testing."""
    payload = user.to_dict()
    payload["exp"] = datetime.utcnow() + timedelta(hours=expires_in_hours)
    payload["iat"] = datetime.utcnow()
    return jwt.encode(payload, secret, algorithm=algorithm)


def create_expired_jwt_token(user: TestUser) -> str:
    """Create an expired JWT token."""
    return create_jwt_token(user, expires_in_hours=-1)


def create_malformed_token() -> str:
    """Create a malformed JWT token (invalid signature)."""
    user = TestUser("user-1", "Test User", "test@example.com")
    payload = user.to_dict()
    payload["exp"] = datetime.utcnow() + timedelta(hours=1)
    # Encode with wrong secret to make signature invalid
    return jwt.encode(payload, "wrong-secret", algorithm=JWT_ALGORITHM)


# Test Users
VALID_USER = TestUser(
    user_id="user-1",
    name="Alice User",
    email="alice@example.com",
    role="user",
    tenant_id="tenant-1",
    is_active=True,
)

ADMIN_USER = TestUser(
    user_id="admin-1",
    name="Admin User",
    email="admin@example.com",
    role="admin",
    tenant_id="tenant-1",
    is_active=True,
)

DELETED_USER = TestUser(
    user_id="user-deleted",
    name="Deleted User",
    email="deleted@example.com",
    role="user",
    tenant_id="tenant-1",
    is_active=False,
)

CROSS_TENANT_USER = TestUser(
    user_id="user-2",
    name="Bob User",
    email="bob@example.com",
    role="user",
    tenant_id="tenant-2",  # Different tenant
    is_active=True,
)


# ============================================================================
# Pytest Fixtures
# ============================================================================


@pytest.fixture
def valid_user() -> TestUser:
    """Fixture: Regular active user."""
    return VALID_USER


@pytest.fixture
def admin_user() -> TestUser:
    """Fixture: Administrator user."""
    return ADMIN_USER


@pytest.fixture
def deleted_user() -> TestUser:
    """Fixture: Deactivated user (former employee)."""
    return DELETED_USER


@pytest.fixture
def cross_tenant_user() -> TestUser:
    """Fixture: User from different tenant."""
    return CROSS_TENANT_USER


@pytest.fixture
def valid_token(valid_user: TestUser) -> str:
    """Fixture: Valid, non-expired JWT token."""
    return create_jwt_token(valid_user)


@pytest.fixture
def admin_token(admin_user: TestUser) -> str:
    """Fixture: Valid admin JWT token."""
    return create_jwt_token(admin_user)


@pytest.fixture
def expired_token(valid_user: TestUser) -> str:
    """Fixture: Expired JWT token."""
    return create_expired_jwt_token(valid_user)


@pytest.fixture
def malformed_token() -> str:
    """Fixture: JWT with invalid signature."""
    return create_malformed_token()


@pytest.fixture
def malformed_authorization_header() -> Dict[str, str]:
    """Fixture: Headers with malformed authorization."""
    return {
        "Authorization": "InvalidFormat token-goes-here",
        "Content-Type": "application/json",
    }


@pytest.fixture
def basic_auth_header() -> Dict[str, str]:
    """Fixture: Headers with Basic auth instead of Bearer."""
    return {
        "Authorization": "Basic dXNlcjpwYXNz",  # user:pass in base64
        "Content-Type": "application/json",
    }


@pytest.fixture
def valid_auth_header(valid_token: str) -> Dict[str, str]:
    """Fixture: Valid Bearer token authorization header."""
    return {
        "Authorization": f"Bearer {valid_token}",
        "Content-Type": "application/json",
    }


@pytest.fixture
def admin_auth_header(admin_token: str) -> Dict[str, str]:
    """Fixture: Valid admin authorization header."""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }


@pytest.fixture
def expired_auth_header(expired_token: str) -> Dict[str, str]:
    """Fixture: Expired bearer token authorization header."""
    return {
        "Authorization": f"Bearer {expired_token}",
        "Content-Type": "application/json",
    }


@pytest.fixture
def cross_tenant_auth_header(cross_tenant_user: TestUser) -> Dict[str, str]:
    """Fixture: Valid token but different tenant."""
    token = create_jwt_token(cross_tenant_user)
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


@pytest.fixture
def tenant_context() -> Dict[str, str]:
    """Fixture: Tenant context headers."""
    return {
        "X-Tenant-ID": "tenant-1",
        "Content-Type": "application/json",
    }


@pytest.fixture
def wrong_tenant_context() -> Dict[str, str]:
    """Fixture: Tenant context for different tenant."""
    return {
        "X-Tenant-ID": "tenant-2",
        "Content-Type": "application/json",
    }


@pytest.fixture
def null_tenant_context() -> Dict[str, str]:
    """Fixture: Missing tenant context."""
    return {
        "Content-Type": "application/json",
    }
