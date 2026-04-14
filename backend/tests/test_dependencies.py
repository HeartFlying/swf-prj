"""Tests for FastAPI dependencies - TDD Red Phase."""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash
from app.db.models import User


class TestDatabaseDependency:
    """Test cases for database dependency."""

    @pytest.fixture
    def app(self):
        """Create test app with database dependency."""
        from app.core.dependencies import get_db

        app = FastAPI()

        @app.get("/test/db")
        async def test_db(db=Depends(get_db)):
            return {"db_type": type(db).__name__}

        return app

    @pytest.fixture
    def client(self, app):
        return TestClient(app)

    @pytest.mark.asyncio
    async def test_get_db_yields_session(self):
        """Test get_db yields an async session."""
        from sqlalchemy.ext.asyncio import AsyncSession

        from app.core.dependencies import get_db

        # Get the generator
        db_gen = get_db()
        db = await db_gen.__anext__()

        assert isinstance(db, AsyncSession)

        # Clean up
        try:
            await db_gen.__anext__()
        except StopAsyncIteration:
            pass


class TestCurrentUserDependency:
    """Test cases for current user dependency."""

    def test_get_current_user_exists(self):
        """Test get_current_user dependency exists."""
        from app.core.dependencies import get_current_user

        assert callable(get_current_user)

    def test_get_current_active_user_exists(self):
        """Test get_current_active_user dependency exists."""
        from app.core.dependencies import get_current_active_user

        assert callable(get_current_active_user)

    async def test_get_current_user_with_valid_token(self, session: AsyncSession):
        """Test get_current_user with valid token returns user."""
        from app.core.dependencies import get_current_user

        # Create test user
        user = User(
            username="dep_test_user",
            email="dep_test@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        # Create valid token
        token = create_access_token({"sub": str(user.id), "username": user.username})
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        with patch("app.core.dependencies.validate_token", AsyncMock(return_value={"sub": str(user.id)})):
            result = await get_current_user(credentials, session)

        assert result is not None
        assert result.id == user.id
        assert result.username == "dep_test_user"

    async def test_get_current_user_without_credentials(self, session: AsyncSession):
        """Test get_current_user without credentials raises 401."""
        from app.core.dependencies import get_current_user

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(None, session)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_get_current_user_with_invalid_token(self, session: AsyncSession):
        """Test get_current_user with invalid token raises 401."""
        from app.core.dependencies import get_current_user

        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token")

        with patch("app.core.dependencies.validate_token", AsyncMock(return_value=None)):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(credentials, session)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_get_current_user_with_nonexistent_user(self, session: AsyncSession):
        """Test get_current_user with non-existent user raises 401."""
        from app.core.dependencies import get_current_user

        token = create_access_token({"sub": "99999", "username": "nonexistent"})
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        with patch("app.core.dependencies.validate_token", AsyncMock(return_value={"sub": "99999"})):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(credentials, session)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_get_current_active_user_with_active_user(self, session: AsyncSession):
        """Test get_current_active_user with active user returns user."""
        from app.core.dependencies import get_current_active_user

        # Create active test user
        user = User(
            username="active_user",
            email="active@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        result = await get_current_active_user(user)

        assert result is not None
        assert result.id == user.id
        assert result.is_active is True

    async def test_get_current_active_user_with_inactive_user(self, session: AsyncSession):
        """Test get_current_active_user with inactive user raises 403."""
        from app.core.dependencies import get_current_active_user

        # Create inactive test user
        user = User(
            username="inactive_user",
            email="inactive@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=False,
        )
        session.add(user)
        await session.commit()

        with pytest.raises(HTTPException) as exc_info:
            await get_current_active_user(user)

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


class TestPermissionDependencies:
    """Test cases for permission dependencies."""

    def test_require_permission_exists(self):
        """Test require_permission dependency factory exists."""
        from app.core.dependencies import require_permission

        assert callable(require_permission)

    def test_require_permission_creates_dependency(self):
        """Test require_permission creates a dependency."""
        from app.core.dependencies import require_permission

        # Create a permission dependency
        require_admin = require_permission("admin")
        assert callable(require_admin)

    async def test_require_permission_with_super_admin(self, session: AsyncSession):
        """Test require_permission with super admin (all permissions)."""
        from app.core.dependencies import require_permission
        from app.db.models import Role

        # Create role with all permissions
        role = Role(name="superadmin", permissions=["*"])
        session.add(role)
        await session.commit()

        # Create user with super admin role
        user = User(
            username="superadmin_user",
            email="superadmin@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
            role_id=role.id,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        require_admin = require_permission("admin")
        result = await require_admin(user)

        assert result is not None
        assert result.id == user.id

    async def test_require_permission_with_specific_permission(self, session: AsyncSession):
        """Test require_permission with specific permission."""
        from app.core.dependencies import require_permission
        from app.db.models import Role

        # Create role with specific permission
        role = Role(name="admin", permissions=["admin", "read"])
        session.add(role)
        await session.commit()

        # Create user with admin role
        user = User(
            username="admin_user",
            email="admin@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
            role_id=role.id,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        require_admin = require_permission("admin")
        result = await require_admin(user)

        assert result is not None
        assert result.id == user.id

    async def test_require_permission_without_permission(self, session: AsyncSession):
        """Test require_permission without required permission raises 403."""
        from app.core.dependencies import require_permission
        from app.db.models import Role

        # Create role without admin permission
        role = Role(name="user", permissions=["read"])
        session.add(role)
        await session.commit()

        # Create user with user role
        user = User(
            username="normal_user",
            email="user@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
            role_id=role.id,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        require_admin = require_permission("admin")

        with pytest.raises(HTTPException) as exc_info:
            await require_admin(user)

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


class TestCommonParameters:
    """Test cases for common query parameters."""

    def test_common_parameters_exists(self):
        """Test CommonQueryParams class exists."""
        from app.core.dependencies import CommonQueryParams

        params = CommonQueryParams()
        assert hasattr(params, "skip")
        assert hasattr(params, "limit")

    def test_common_parameters_defaults(self):
        """Test CommonQueryParams has correct defaults."""
        from app.core.dependencies import CommonQueryParams

        params = CommonQueryParams()
        assert params.skip == 0
        assert params.limit == 100

    def test_common_parameters_custom_values(self):
        """Test CommonQueryParams accepts custom values."""
        from app.core.dependencies import CommonQueryParams

        params = CommonQueryParams(skip=10, limit=50)
        assert params.skip == 10
        assert params.limit == 50
