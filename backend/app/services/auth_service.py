"""Authentication service module.

Provides user authentication, token management, and session handling.
"""

from datetime import datetime
from typing import Any

from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.core.error_codes import ErrorCode
from app.core.exceptions import (
    AuthenticationException,
    NotFoundException,
)
from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.db.models import User
from app.db.redis import TokenBlacklist

logger = get_logger(__name__)


class UserNotFoundError(NotFoundException):
    """Raised when a user is not found."""

    def __init__(self, identifier: str | int):
        if isinstance(identifier, int):
            super().__init__(
                resource="User",
                identifier=identifier,
                code=ErrorCode.USER_NOT_FOUND,
            )
        else:
            super().__init__(
                resource="User",
                identifier=identifier,
                code=ErrorCode.USER_NOT_FOUND,
            )


class InvalidCredentialsError(AuthenticationException):
    """Raised when credentials are invalid."""

    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(
            message=message,
            code=ErrorCode.INVALID_CREDENTIALS,
        )


class TokenValidationError(AuthenticationException):
    """Raised when token validation fails."""

    def __init__(self, message: str = "Token validation failed"):
        super().__init__(
            message=message,
            code=ErrorCode.TOKEN_INVALID,
        )


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User | None:
    """Authenticate a user with username and password.

    Args:
        db: Database session.
        username: The username to authenticate.
        password: The plain text password to verify.

    Returns:
        The User object if authentication succeeds, None otherwise.
    """
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user:
        logger.warning(f"Authentication failed: user '{username}' not found")
        return None

    if not verify_password(password, user.password_hash):
        logger.warning(f"Authentication failed: invalid password for user '{username}'")
        return None

    # Update last login time (use naive datetime for database compatibility)
    user.last_login_at = datetime.utcnow()
    await db.commit()
    logger.info(f"User '{username}' authenticated successfully")

    return user


async def authenticate_user_or_raise(db: AsyncSession, username: str, password: str) -> User:
    """Authenticate a user with username and password, raising exception on failure.

    Args:
        db: Database session.
        username: The username to authenticate.
        password: The plain text password to verify.

    Returns:
        The User object if authentication succeeds.

    Raises:
        InvalidCredentialsError: If authentication fails.
    """
    user = await authenticate_user(db, username, password)
    if not user:
        raise InvalidCredentialsError("Invalid username or password")
    return user


async def get_user_by_id(db: AsyncSession, user_id: int, load_role: bool = False) -> User | None:
    """Get a user by their ID.

    Args:
        db: Database session.
        user_id: The user ID to look up.
        load_role: Whether to eagerly load the role relationship.

    Returns:
        The User object if found, None otherwise.
    """
    query = select(User).where(User.id == user_id)
    if load_role:
        query = query.options(joinedload(User.role))
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_user_by_id_or_raise(db: AsyncSession, user_id: int) -> User:
    """Get a user by their ID, raising exception if not found.

    Args:
        db: Database session.
        user_id: The user ID to look up.

    Returns:
        The User object if found.

    Raises:
        UserNotFoundError: If user not found.
    """
    user = await get_user_by_id(db, user_id)
    if not user:
        raise UserNotFoundError(user_id)
    return user


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    """Get a user by their username.

    Args:
        db: Database session.
        username: The username to look up.

    Returns:
        The User object if found, None otherwise.
    """
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_username_or_raise(db: AsyncSession, username: str) -> User:
    """Get a user by their username, raising exception if not found.

    Args:
        db: Database session.
        username: The username to look up.

    Returns:
        The User object if found.

    Raises:
        UserNotFoundError: If user not found.
    """
    user = await get_user_by_username(db, username)
    if not user:
        raise UserNotFoundError(username)
    return user


async def validate_token(token: str) -> dict[str, Any] | None:
    """Validate a JWT token and return its payload.

    Args:
        token: The JWT token to validate.

    Returns:
        The decoded token payload if valid, None otherwise.
    """
    try:
        # Check if token is blacklisted
        if await TokenBlacklist.is_blacklisted(token):
            logger.warning("Token validation failed: token is blacklisted")
            return None

        # Decode and validate token
        payload = decode_token(token)
        return payload

    except JWTError as e:
        logger.warning(f"Token validation failed: {e}")
        return None


async def login_user(
    db: AsyncSession, username: str, password: str
) -> dict[str, Any] | None:
    """Login a user and return tokens with user info.

    Args:
        db: Database session.
        username: The username to login.
        password: The plain text password.

    Returns:
        Dictionary with access_token, refresh_token, token_type, and user if successful,
        None otherwise.
    """
    from sqlalchemy.orm import joinedload

    # Load user with role in single query
    result = await db.execute(
        select(User).options(joinedload(User.role)).where(User.username == username)
    )
    user = result.scalar_one_or_none()

    if not user:
        return None

    if not verify_password(password, user.password_hash):
        logger.warning(f"Authentication failed: invalid password for user '{username}'")
        return None

    # Check if user is active
    if not user.is_active:
        logger.warning(f"Authentication failed: user '{username}' is inactive")
        return None

    # Update last login time
    user.last_login_at = datetime.utcnow()
    await db.commit()

    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username}
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Build user data dict
    user_data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "department": user.department or "",
        "is_active": user.is_active,
        "role_id": user.role_id,
    }

    # Add role info if available
    if user.role:
        user_data["role"] = {
            "id": user.role.id,
            "name": user.role.name,
            "description": user.role.description,
            "permissions": user.role.permissions or [],
        }

    logger.info(f"User '{username}' logged in successfully")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user_data,
    }


async def refresh_access_token(
    db: AsyncSession, refresh_token: str
) -> dict[str, str] | None:
    """Refresh an access token using a refresh token.

    Args:
        db: Database session.
        refresh_token: The refresh token to use.

    Returns:
        Dictionary with new access_token and token_type if successful,
        None otherwise.
    """
    try:
        # Check if refresh token is blacklisted
        if await TokenBlacklist.is_blacklisted(refresh_token):
            logger.warning("Token refresh failed: refresh token is blacklisted")
            return None

        payload = decode_token(refresh_token)
        user_id = int(payload.get("sub", 0))

        if not user_id:
            logger.warning("Token refresh failed: no subject in token")
            return None

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            logger.warning(f"Token refresh failed: user {user_id} not found")
            return None

        if not user.is_active:
            logger.warning(f"Token refresh failed: user {user_id} is inactive")
            return None

        new_access_token = create_access_token(
            data={"sub": str(user.id), "username": user.username}
        )

        logger.info(f"Access token refreshed for user {user_id}")
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
        }

    except JWTError as e:
        logger.warning(f"Token refresh failed: invalid token - {e}")
        return None


async def logout(access_token: str, refresh_token: str | None = None) -> bool:
    """Logout a user by blacklisting their tokens.

    Args:
        access_token: The access token to blacklist.
        refresh_token: Optional refresh token to blacklist.

    Returns:
        True if logout was successful, False otherwise.
    """
    try:
        # Calculate token expiration times for Redis TTL
        access_token_ttl = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        refresh_token_ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60

        # Blacklist access token
        access_result = await TokenBlacklist.blacklist_token(access_token, access_token_ttl)

        # Blacklist refresh token if provided
        refresh_result = True
        if refresh_token:
            refresh_result = await TokenBlacklist.blacklist_token(
                refresh_token, refresh_token_ttl
            )

        if access_result and refresh_result:
            logger.info("User logged out successfully")
            return True
        else:
            logger.error("Failed to blacklist tokens during logout")
            return False

    except Exception as e:
        logger.error(f"Unexpected error during logout: {e}")
        return False
