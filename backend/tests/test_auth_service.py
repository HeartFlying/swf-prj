"""Tests for authentication service.

TDD Red Phase: Write tests before implementation.
"""

from datetime import datetime
from unittest.mock import AsyncMock, patch

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, get_password_hash
from app.db.models import User


class TestAuthenticateUser:
    """Tests for authenticate_user function."""

    async def test_authenticate_user_with_valid_credentials(self, session: AsyncSession):
        """Test authenticating with valid credentials returns user."""
        from app.services.auth_service import authenticate_user

        # Create test user
        user = User(
            username="auth_test_user",
            email="auth_test@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        result = await authenticate_user(session, "auth_test_user", "testpass123")

        assert result is not None
        assert result.id == user.id
        assert result.username == "auth_test_user"

    async def test_authenticate_user_with_invalid_password(self, session: AsyncSession):
        """Test authenticating with invalid password returns None."""
        from app.services.auth_service import authenticate_user

        # Create test user
        user = User(
            username="auth_invalid_pass",
            email="auth_invalid@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        result = await authenticate_user(session, "auth_invalid_pass", "wrongpassword")

        assert result is None

    async def test_authenticate_user_with_nonexistent_username(self, session: AsyncSession):
        """Test authenticating with non-existent username returns None."""
        from app.services.auth_service import authenticate_user

        result = await authenticate_user(session, "nonexistent", "password")

        assert result is None

    async def test_authenticate_user_updates_last_login(self, session: AsyncSession):
        """Test that successful authentication updates last_login_at."""
        from app.services.auth_service import authenticate_user

        # Create test user
        user = User(
            username="auth_last_login",
            email="auth_lastlogin@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        result = await authenticate_user(session, "auth_last_login", "testpass123")

        assert result is not None
        assert result.last_login_at is not None
        assert isinstance(result.last_login_at, datetime)


class TestGetUserById:
    """Tests for get_user_by_id function."""

    async def test_get_user_by_id_with_existing_user(self, session: AsyncSession):
        """Test getting an existing user by ID."""
        from app.services.auth_service import get_user_by_id

        # Create test user
        user = User(
            username="get_by_id_user",
            email="getbyid@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        result = await get_user_by_id(session, user.id)

        assert result is not None
        assert result.id == user.id
        assert result.username == "get_by_id_user"

    async def test_get_user_by_id_with_nonexistent_user(self, session: AsyncSession):
        """Test getting a non-existent user returns None."""
        from app.services.auth_service import get_user_by_id

        result = await get_user_by_id(session, 99999)

        assert result is None


class TestValidateToken:
    """Tests for validate_token function."""

    async def test_validate_token_with_valid_token(self, session: AsyncSession):
        """Test validating a valid token returns payload."""
        from app.services.auth_service import validate_token

        # Create test user
        user = User(
            username="validate_token_user",
            email="validate@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        token = create_access_token({"sub": str(user.id), "username": user.username})

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            result = await validate_token(token)

        assert result is not None
        assert result["sub"] == str(user.id)
        assert result["username"] == user.username

    async def test_validate_token_with_invalid_token(self):
        """Test validating an invalid token returns None."""
        from app.services.auth_service import validate_token

        result = await validate_token("invalid.token.here")

        assert result is None

    async def test_validate_token_with_blacklisted_token(self):
        """Test validating a blacklisted token returns None."""
        from app.services.auth_service import validate_token

        token = create_access_token({"sub": "1", "username": "test"})

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=True)):
            result = await validate_token(token)

        assert result is None


class TestLoginUser:
    """Tests for login_user function."""

    async def test_login_user_returns_tokens(self, session: AsyncSession):
        """Test successful login returns access and refresh tokens."""
        from app.services.auth_service import login_user

        # Create test user
        user = User(
            username="login_test_user",
            email="login_test@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        result = await login_user(session, "login_test_user", "testpass123")

        assert result is not None
        assert "access_token" in result
        assert "refresh_token" in result
        assert "token_type" in result
        assert result["token_type"] == "bearer"

    async def test_login_user_returns_none_for_invalid_credentials(self, session: AsyncSession):
        """Test login with invalid credentials returns None."""
        from app.services.auth_service import login_user

        result = await login_user(session, "nonexistent", "wrongpass")

        assert result is None

    async def test_login_user_tokens_contain_user_data(self, session: AsyncSession):
        """Test that tokens contain correct user data."""
        from app.core.security import decode_token
        from app.services.auth_service import login_user

        # Create test user
        user = User(
            username="login_token_data",
            email="login_token@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        result = await login_user(session, "login_token_data", "testpass123")

        assert result is not None

        # Decode and verify access token
        access_payload = decode_token(result["access_token"])
        assert access_payload["sub"] == str(user.id)
        assert access_payload["username"] == user.username

        # Decode and verify refresh token
        refresh_payload = decode_token(result["refresh_token"])
        assert refresh_payload["sub"] == str(user.id)


class TestRefreshAccessToken:
    """Tests for refresh_access_token function."""

    async def test_refresh_access_token_returns_new_token(self, session: AsyncSession):
        """Test refreshing a valid refresh token returns new access token."""
        from app.core.security import decode_token
        from app.services.auth_service import refresh_access_token

        # Create test user
        user = User(
            username="refresh_test_user",
            email="refresh_test@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        refresh_token = create_refresh_token({"sub": str(user.id)})

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            result = await refresh_access_token(session, refresh_token)

        assert result is not None
        assert "access_token" in result
        assert "token_type" in result
        assert result["token_type"] == "bearer"

        # Verify the new token is valid
        payload = decode_token(result["access_token"])
        assert payload["sub"] == str(user.id)
        assert payload["username"] == user.username

    async def test_refresh_access_token_with_invalid_token(self, session: AsyncSession):
        """Test refreshing with invalid token returns None."""
        from app.services.auth_service import refresh_access_token

        result = await refresh_access_token(session, "invalid.token.here")

        assert result is None

    async def test_refresh_access_token_for_nonexistent_user(self, session: AsyncSession):
        """Test refreshing token for non-existent user returns None."""
        from app.services.auth_service import refresh_access_token

        refresh_token = create_refresh_token({"sub": "99999"})

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            result = await refresh_access_token(session, refresh_token)

        assert result is None

    async def test_refresh_access_token_for_inactive_user(self, session: AsyncSession):
        """Test refreshing token for inactive user returns None."""
        from app.services.auth_service import refresh_access_token

        # Create inactive test user
        user = User(
            username="refresh_inactive_user",
            email="refresh_inactive@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=False,
        )
        session.add(user)
        await session.commit()

        refresh_token = create_refresh_token({"sub": str(user.id)})

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            result = await refresh_access_token(session, refresh_token)

        assert result is None

    async def test_refresh_access_token_with_blacklisted_token(self, session: AsyncSession):
        """Test refreshing with blacklisted token returns None."""
        from app.services.auth_service import refresh_access_token

        # Create test user
        user = User(
            username="refresh_blacklisted_user",
            email="refresh_blacklisted@example.com",
            password_hash=get_password_hash("testpass123"),
            department="IT",
            is_active=True,
        )
        session.add(user)
        await session.commit()

        refresh_token = create_refresh_token({"sub": str(user.id)})

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=True)):
            result = await refresh_access_token(session, refresh_token)

        assert result is None


class TestLogout:
    """Tests for logout function."""

    async def test_logout_with_valid_tokens(self):
        """Test logout with valid tokens blacklists them."""
        from app.services.auth_service import logout

        access_token = create_access_token({"sub": "1"})
        refresh_token = create_refresh_token({"sub": "1"})

        with patch("app.services.auth_service.TokenBlacklist.blacklist_token", AsyncMock(return_value=True)):
            result = await logout(access_token, refresh_token)

        assert result is True

    async def test_logout_with_only_access_token(self):
        """Test logout with only access token."""
        from app.services.auth_service import logout

        access_token = create_access_token({"sub": "1"})

        with patch("app.services.auth_service.TokenBlacklist.blacklist_token", AsyncMock(return_value=True)):
            result = await logout(access_token)

        assert result is True

    async def test_logout_blacklist_failure(self):
        """Test logout when blacklisting fails."""
        from app.services.auth_service import logout

        access_token = create_access_token({"sub": "1"})

        with patch("app.services.auth_service.TokenBlacklist.blacklist_token", AsyncMock(return_value=False)):
            result = await logout(access_token)

        assert result is False
