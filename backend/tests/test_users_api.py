"""Tests for users API endpoints.

TDD Red Phase: Write tests before implementation.
"""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.core.security import create_access_token, get_password_hash
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


@pytest.fixture
async def admin_token(session: AsyncSession) -> str:
    """Create an admin user and return token."""
    # Create admin role first
    admin_role = Role(
        name="admin",
        description="Administrator",
        permissions=["*"],  # Super admin permissions
    )
    session.add(admin_role)
    await session.commit()
    await session.refresh(admin_role)

    user = User(
        username="admin_user",
        email="admin@example.com",
        password_hash=get_password_hash("adminpass123"),
        department="IT",
        is_active=True,
        role_id=admin_role.id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return create_access_token({"sub": str(user.id), "username": user.username})


@pytest.fixture
async def auth_client(client: AsyncClient, admin_token: str):
    """Create an authenticated client with mocked token blacklist."""
    with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
        yield client, admin_token


class TestGetUsers:
    """Tests for GET /api/v1/users endpoint."""

    async def test_get_users_list(self, client: AsyncClient, session: AsyncSession, admin_token: str):
        """Test getting list of users."""
        # Create test users
        for i in range(3):
            user = User(
                username=f"list_user_{i}",
                email=f"list_user_{i}@example.com",
                password_hash=get_password_hash("testpass123"),
                department="IT",
                is_active=True,
            )
            session.add(user)
        await session.commit()

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.get(
                "/api/v1/users",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200
        data = result["data"]
        assert isinstance(data, dict)
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "pageSize" in data
        assert isinstance(data["items"], list)
        assert len(data["items"]) >= 3
        assert data["total"] >= 3
        assert data["page"] == 1
        assert data["pageSize"] == 100

    async def test_get_users_without_auth(self, client: AsyncClient):
        """Test getting users without authentication returns 401."""
        response = await client.get("/api/v1/users")

        assert response.status_code == 401


class TestCreateUser:
    """Tests for POST /api/v1/users endpoint."""

    async def test_create_user_success(self, client: AsyncClient, admin_token: str):
        """Test creating a new user."""
        user_data = {
            "username": "new_test_user",
            "email": "new_test@example.com",
            "password": "newpass123",
            "department": "Engineering",
        }

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/users",
                json=user_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 201
        result = response.json()
        assert result["code"] == 201 or result["code"] == 200  # Accept both
        data = result["data"]
        assert data["username"] == user_data["username"]
        assert data["email"] == user_data["email"]
        assert data["department"] == user_data["department"]
        assert "password_hash" not in data

    async def test_create_user_duplicate_username(self, client: AsyncClient, session: AsyncSession, admin_token: str):
        """Test creating user with duplicate username returns 400."""
        # Create existing user
        existing = User(
            username="existing_user",
            email="existing@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(existing)
        await session.commit()

        user_data = {
            "username": "existing_user",
            "email": "new_email@example.com",
            "password": "newpass123",
            "department": "Engineering",
        }

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/users",
                json=user_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 400

    async def test_create_user_without_auth(self, client: AsyncClient):
        """Test creating user without authentication returns 401."""
        user_data = {
            "username": "unauthorized_user",
            "email": "unauthorized@example.com",
            "password": "newpass123",
            "department": "Engineering",
        }

        response = await client.post("/api/v1/users", json=user_data)

        assert response.status_code == 401


class TestGetUser:
    """Tests for GET /api/v1/users/{id} endpoint."""

    async def test_get_user_by_id(self, client: AsyncClient, session: AsyncSession, admin_token: str):
        """Test getting user by ID."""
        user = User(
            username="get_by_id_user",
            email="get_by_id@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.get(
                f"/api/v1/users/{user.id}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200
        data = result["data"]
        assert data["id"] == user.id
        assert data["username"] == user.username
        assert "password_hash" not in data

    async def test_get_user_not_found(self, client: AsyncClient, admin_token: str):
        """Test getting non-existent user returns 404."""
        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.get(
                "/api/v1/users/99999",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 404

    async def test_get_user_without_auth(self, client: AsyncClient):
        """Test getting user without authentication returns 401."""
        response = await client.get("/api/v1/users/1")

        assert response.status_code == 401


class TestUpdateUser:
    """Tests for PUT /api/v1/users/{id} endpoint."""

    async def test_update_user_success(self, client: AsyncClient, session: AsyncSession, admin_token: str):
        """Test updating user."""
        user = User(
            username="update_user",
            email="update@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        update_data = {
            "email": "updated_email@example.com",
            "department": "Updated Department",
        }

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.put(
                f"/api/v1/users/{user.id}",
                json=update_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200
        data = result["data"]
        assert data["email"] == update_data["email"]
        assert data["department"] == update_data["department"]

    async def test_update_user_not_found(self, client: AsyncClient, admin_token: str):
        """Test updating non-existent user returns 404."""
        update_data = {
            "email": "updated@example.com",
        }

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.put(
                "/api/v1/users/99999",
                json=update_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 404

    async def test_update_user_without_auth(self, client: AsyncClient):
        """Test updating user without authentication returns 401."""
        update_data = {
            "email": "updated@example.com",
        }

        response = await client.put("/api/v1/users/1", json=update_data)

        assert response.status_code == 401


class TestDeleteUser:
    """Tests for DELETE /api/v1/users/{id} endpoint."""

    async def test_delete_user_success(self, client: AsyncClient, session: AsyncSession, admin_token: str):
        """Test deleting user."""
        user = User(
            username="delete_user",
            email="delete@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.delete(
                f"/api/v1/users/{user.id}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 204

        # Verify user is deleted
        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            get_response = await client.get(
                f"/api/v1/users/{user.id}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
        assert get_response.status_code == 404

    async def test_delete_user_not_found(self, client: AsyncClient, admin_token: str):
        """Test deleting non-existent user returns 404."""
        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.delete(
                "/api/v1/users/99999",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 404

    async def test_delete_user_without_auth(self, client: AsyncClient):
        """Test deleting user without authentication returns 401."""
        response = await client.delete("/api/v1/users/1")

        assert response.status_code == 401
