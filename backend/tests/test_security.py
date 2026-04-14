"""Tests for security module.

TDD Red Phase: Write tests before implementation.
"""

from datetime import UTC, datetime, timedelta

import pytest
from jose import jwt

from app.core.config import settings


class TestPasswordHashing:
    """Tests for password hashing functions."""

    def test_get_password_hash_returns_string(self):
        """Test that get_password_hash returns a string."""
        from app.core.security import get_password_hash

        password = "testpassword123"
        hashed = get_password_hash(password)

        assert isinstance(hashed, str)
        assert len(hashed) > 0

    def test_get_password_hash_returns_different_hashes_for_same_password(self):
        """Test that hashing the same password twice produces different results."""
        from app.core.security import get_password_hash

        password = "testpassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        assert hash1 != hash2

    def test_verify_password_with_correct_password(self):
        """Test verifying password with correct password returns True."""
        from app.core.security import get_password_hash, verify_password

        password = "testpassword123"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_with_incorrect_password(self):
        """Test verifying password with incorrect password returns False."""
        from app.core.security import get_password_hash, verify_password

        password = "testpassword123"
        wrong_password = "wrongpassword"
        hashed = get_password_hash(password)

        assert verify_password(wrong_password, hashed) is False


class TestAccessToken:
    """Tests for access token functions."""

    def test_create_access_token_returns_string(self):
        """Test that create_access_token returns a string."""
        from app.core.security import create_access_token

        data = {"sub": "testuser"}
        token = create_access_token(data)

        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_contains_correct_data(self):
        """Test that created token contains the correct data."""
        from app.core.security import create_access_token, decode_token

        data = {"sub": "testuser", "user_id": 1}
        token = create_access_token(data)
        decoded = decode_token(token)

        assert decoded["sub"] == "testuser"
        assert decoded["user_id"] == 1

    def test_create_access_token_has_expiration(self):
        """Test that created token has expiration claim."""
        from app.core.security import create_access_token, decode_token

        data = {"sub": "testuser"}
        token = create_access_token(data)
        decoded = decode_token(token)

        assert "exp" in decoded

    def test_create_access_token_with_custom_expiry(self):
        """Test creating token with custom expiration time."""
        from app.core.security import create_access_token, decode_token

        data = {"sub": "testuser"}
        expires = timedelta(minutes=5)
        token = create_access_token(data, expires_delta=expires)
        decoded = decode_token(token)

        assert "exp" in decoded


class TestRefreshToken:
    """Tests for refresh token functions."""

    def test_create_refresh_token_returns_string(self):
        """Test that create_refresh_token returns a string."""
        from app.core.security import create_refresh_token

        data = {"sub": "testuser"}
        token = create_refresh_token(data)

        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_refresh_token_contains_correct_data(self):
        """Test that created refresh token contains the correct data."""
        from app.core.security import create_refresh_token, decode_token

        data = {"sub": "testuser", "user_id": 1}
        token = create_refresh_token(data)
        decoded = decode_token(token)

        assert decoded["sub"] == "testuser"
        assert decoded["user_id"] == 1

    def test_create_refresh_token_has_expiration(self):
        """Test that created refresh token has expiration claim."""
        from app.core.security import create_refresh_token, decode_token

        data = {"sub": "testuser"}
        token = create_refresh_token(data)
        decoded = decode_token(token)

        assert "exp" in decoded

    def test_refresh_token_has_longer_expiry_than_access_token(self):
        """Test that refresh token has longer expiration than access token."""
        from app.core.security import create_access_token, create_refresh_token, decode_token

        data = {"sub": "testuser"}
        access_token = create_access_token(data)
        refresh_token = create_refresh_token(data)

        access_decoded = decode_token(access_token)
        refresh_decoded = decode_token(refresh_token)

        access_exp = datetime.fromtimestamp(access_decoded["exp"], tz=UTC)
        refresh_exp = datetime.fromtimestamp(refresh_decoded["exp"], tz=UTC)

        assert refresh_exp > access_exp


class TestDecodeToken:
    """Tests for token decoding."""

    def test_decode_valid_token(self):
        """Test decoding a valid token."""
        from app.core.security import create_access_token, decode_token

        data = {"sub": "testuser", "user_id": 1}
        token = create_access_token(data)
        decoded = decode_token(token)

        assert decoded["sub"] == "testuser"
        assert decoded["user_id"] == 1

    def test_decode_invalid_token_raises_error(self):
        """Test decoding an invalid token raises error."""
        from jose import JWTError

        from app.core.security import decode_token

        with pytest.raises(JWTError):
            decode_token("invalid.token.here")

    def test_decode_expired_token_raises_error(self):
        """Test decoding an expired token raises error."""
        from jose import ExpiredSignatureError

        from app.core.security import decode_token

        # Create an expired token manually
        expire = datetime.now(UTC) - timedelta(minutes=1)
        data = {"sub": "testuser", "exp": expire}
        token = jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        with pytest.raises(ExpiredSignatureError):
            decode_token(token)

    def test_decode_token_with_wrong_secret_raises_error(self):
        """Test decoding token with wrong secret raises error."""
        from jose import JWTError, jwt

        from app.core.security import create_access_token

        data = {"sub": "testuser"}
        token = create_access_token(data)

        # Try to decode with wrong secret
        with pytest.raises(JWTError):
            jwt.decode(token, "wrong-secret", algorithms=[settings.ALGORITHM])
