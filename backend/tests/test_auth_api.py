"""Tests for authentication API endpoints.

TDD Red Phase: Write tests before implementation.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_db
from app.core.security import create_access_token, create_refresh_token, get_password_hash
from app.db.models import Role, User
from app.main import app


@pytest.fixture
async def client(session: AsyncSession):
    """Create an async test client with overridden database dependency."""
    # Override the get_db dependency to use the test session
    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # Clean up overrides after test
    app.dependency_overrides.clear()


class TestLoginEndpoint:
    """Tests for POST /api/v1/auth/login endpoint."""

    async def test_login_with_valid_credentials(self, client: AsyncClient, session: AsyncSession):
        """Test login with valid credentials returns tokens in TokenRefreshResponse format."""
        # Create test user
        user = User(
            username="api_login_user",
            email="api_login@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "api_login_user", "password": "testpass123"},
        )

        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200
        data = result["data"]
        # Verify TokenRefreshResponse format (camelCase)
        assert "accessToken" in data
        assert "refreshToken" in data
        assert "tokenType" in data
        assert "expiresIn" in data
        assert "user" in data
        assert data["tokenType"] == "bearer"
        # Verify user data is present
        user_data = data["user"]
        assert user_data["id"] == user.id
        assert user_data["username"] == user.username
        assert user_data["email"] == user.email

    async def test_login_with_invalid_credentials(self, client: AsyncClient):
        """Test login with invalid credentials returns 401."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "wronguser", "password": "wrongpass"},
        )

        assert response.status_code == 401
        result = response.json()
        assert result["code"] == 401

    async def test_login_with_missing_username(self, client: AsyncClient):
        """Test login with missing username returns 422."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"password": "testpass123"},
        )

        assert response.status_code == 422

    async def test_login_with_missing_password(self, client: AsyncClient):
        """Test login with missing password returns 422."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "testuser"},
        )

        assert response.status_code == 422


class TestRefreshEndpoint:
    """Tests for POST /api/v1/auth/refresh endpoint."""

    async def test_refresh_with_valid_token(self, client: AsyncClient, session: AsyncSession):
        """Test refresh with valid refresh token returns new access token."""
        # Create test user
        user = User(
            username="api_refresh_user",
            email="api_refresh@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        refresh_token = create_refresh_token({"sub": str(user.id)})

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": refresh_token},
            )

        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200
        data = result["data"]
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_refresh_with_invalid_token(self, client: AsyncClient):
        """Test refresh with invalid token returns 401."""
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
        )

        assert response.status_code == 401
        result = response.json()
        assert result["code"] == 401

    async def test_refresh_with_missing_token(self, client: AsyncClient):
        """Test refresh with missing token returns 422."""
        response = await client.post(
            "/api/v1/auth/refresh",
            json={},
        )

        assert response.status_code == 422


class TestLogoutEndpoint:
    """Tests for POST /api/v1/auth/logout endpoint."""

    async def test_logout_with_valid_tokens(self, client: AsyncClient, session: AsyncSession):
        """Test logout with valid tokens returns success."""
        # Create test user
        user = User(
            username="api_logout_user",
            email="api_logout@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        access_token = create_access_token({"sub": str(user.id), "username": user.username})
        refresh_token = create_refresh_token({"sub": str(user.id)})

        with patch("app.services.auth_service.TokenBlacklist.blacklist_token", AsyncMock(return_value=True)):
            response = await client.post(
                "/api/v1/auth/logout",
                headers={"Authorization": f"Bearer {access_token}"},
                json={"refresh_token": refresh_token},
            )

        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200

    async def test_logout_without_token(self, client: AsyncClient):
        """Test logout without token returns 401."""
        response = await client.post(
            "/api/v1/auth/logout",
            json={},
        )

        assert response.status_code == 401

    async def test_logout_with_invalid_token(self, client: AsyncClient):
        """Test logout with invalid token still succeeds (token is blacklisted regardless)."""
        # The logout endpoint accepts any token and blacklists it
        # This is intentional - you should be able to logout with any token
        with patch("app.services.auth_service.TokenBlacklist.blacklist_token", AsyncMock(return_value=True)):
            response = await client.post(
                "/api/v1/auth/logout",
                headers={"Authorization": "Bearer invalid.token"},
                json={},
            )

        # Logout succeeds even with invalid token (token gets blacklisted)
        assert response.status_code == 200

    async def test_logout_with_only_access_token(self, client: AsyncClient, session: AsyncSession):
        """Test logout with only access token (no refresh token)."""
        # Create test user
        user = User(
            username="api_logout_access_only",
            email="api_logout_access@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        access_token = create_access_token({"sub": str(user.id), "username": user.username})

        with patch("app.services.auth_service.TokenBlacklist.blacklist_token", AsyncMock(return_value=True)):
            response = await client.post(
                "/api/v1/auth/logout",
                headers={"Authorization": f"Bearer {access_token}"},
                json={},
            )

        assert response.status_code == 200


class TestMeEndpoint:
    """Tests for GET /api/v1/auth/me endpoint."""

    async def test_get_current_user_with_valid_token(self, client: AsyncClient, session: AsyncSession):
        """Test getting current user with valid token returns user info."""
        # Create test user
        user = User(
            username="api_me_user",
            email="api_me@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        token = create_access_token({"sub": str(user.id), "username": user.username})

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200
        data = result["data"]
        assert data["id"] == user.id
        assert data["username"] == user.username
        assert data["email"] == user.email
        assert "password_hash" not in data

    async def test_get_current_user_without_token(self, client: AsyncClient):
        """Test getting current user without token returns 401."""
        response = await client.get("/api/v1/auth/me")

        assert response.status_code == 401

    async def test_get_current_user_with_invalid_token(self, client: AsyncClient):
        """Test getting current user with invalid token returns 401."""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )

        assert response.status_code == 401

    async def test_get_current_user_with_expired_token(self, client: AsyncClient):
        """Test getting current user with expired token returns 401."""
        # Create an expired token manually
        expire = datetime.now(UTC) - timedelta(minutes=1)
        data = {"sub": "1", "username": "testuser", "exp": expire}
        expired_token = jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        assert response.status_code == 401

    async def test_get_current_user_with_inactive_user(self, client: AsyncClient, session: AsyncSession):
        """Test getting current user with inactive user returns 403."""
        # Create inactive test user
        user = User(
            username="api_inactive_user",
            email="api_inactive@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=False,
        )
        session.add(user)
        await session.commit()

        token = create_access_token({"sub": str(user.id), "username": user.username})

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 403

    async def test_get_current_user_returns_role_info(self, client: AsyncClient, session: AsyncSession):
        """Test getting current user returns role information."""
        # Create test role
        role = Role(
            name="admin",
            description="Administrator role",
            permissions=["read", "write", "admin"],
        )
        session.add(role)
        await session.flush()

        # Create test user with role
        user = User(
            username="api_me_user_with_role",
            email="api_me_role@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
            role_id=role.id,
        )
        session.add(user)
        await session.commit()

        token = create_access_token({"sub": str(user.id), "username": user.username})

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200
        data = result["data"]
        assert data["id"] == user.id
        assert data["username"] == user.username
        assert data["role_id"] == role.id
        # Verify role information is returned
        assert data["role"] is not None
        assert data["role"]["id"] == role.id
        assert data["role"]["name"] == role.name
        assert data["role"]["description"] == role.description
        assert data["role"]["permissions"] == role.permissions

    async def test_get_current_user_without_role(self, client: AsyncClient, session: AsyncSession):
        """Test getting current user without role returns null role."""
        # Create test user without role
        user = User(
            username="api_me_user_no_role",
            email="api_me_no_role@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
            role_id=None,
        )
        session.add(user)
        await session.commit()

        token = create_access_token({"sub": str(user.id), "username": user.username})

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200
        data = result["data"]
        assert data["id"] == user.id
        assert data["role_id"] is None
        assert data["role"] is None
