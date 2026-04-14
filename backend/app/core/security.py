"""Security utilities for authentication and authorization.

TDD Green Phase: Implement security functions to make tests pass.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import jwt

from app.core.config import settings


def _truncate_password(password: str) -> bytes:
    """Truncate password to 72 bytes for bcrypt compatibility."""
    password_bytes = password.encode("utf-8")
    # bcrypt has a 72-byte limit
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    return password_bytes


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password.

    Args:
        plain_password: The plain text password to verify.
        hashed_password: The hashed password to compare against.

    Returns:
        True if the password matches, False otherwise.
    """
    plain_bytes = _truncate_password(plain_password)
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(plain_bytes, hashed_bytes)


def get_password_hash(password: str) -> str:
    """Generate a hash for a password.

    Args:
        password: The plain text password to hash.

    Returns:
        The hashed password.
    """
    password_bytes = _truncate_password(password)
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token.

    Args:
        data: The data to encode in the token.
        expires_delta: Optional custom expiration time. Defaults to ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        The encoded JWT token.
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return encoded_jwt


def create_refresh_token(data: dict[str, Any]) -> str:
    """Create a JWT refresh token with longer expiration.

    Args:
        data: The data to encode in the token.

    Returns:
        The encoded JWT refresh token.
    """
    to_encode = data.copy()
    expire = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return encoded_jwt


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token.

    Args:
        token: The JWT token to decode.

    Returns:
        The decoded token payload.

    Raises:
        JWTError: If the token is invalid or expired.
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return payload
