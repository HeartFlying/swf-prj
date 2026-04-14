"""FastAPI dependencies for the application.

TDD Green Phase: Implement dependencies to make tests pass.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.base import AsyncSessionLocal
from app.db.models import User
from app.services.auth_service import get_user_by_id, validate_token
from app.services.token_stats_service import TokenStatsService
from app.services.code_stats_service import CodeStatsService
from app.services.bug_stats_service import BugStatsService
from app.services.personal_stats_service import PersonalStatsService
from app.services.project_stats_service import ProjectStatsService
from app.services.cache_service import CacheService

# Import auth service functions for dependency injection
from app.services import auth_service as auth_service_module

logger = get_logger(__name__)


# RBAC Permission Constants
class Permissions:
    """Permission constants for RBAC."""

    ALL = "*"  # Super admin - all permissions
    ADMIN = "admin"  # Admin access
    READ = "read"  # Read access
    WRITE = "write"  # Write access
    DELETE = "delete"  # Delete access
    USER_MANAGE = "user:manage"  # Manage users
    PROJECT_MANAGE = "project:manage"  # Manage projects
    SYNC_EXECUTE = "sync:execute"  # Execute sync operations


# Role-based permission mapping
ROLE_PERMISSIONS = {
    "superadmin": [Permissions.ALL],
    "admin": [
        Permissions.ADMIN,
        Permissions.READ,
        Permissions.WRITE,
        Permissions.DELETE,
        Permissions.USER_MANAGE,
        Permissions.PROJECT_MANAGE,
        Permissions.SYNC_EXECUTE,
    ],
    "manager": [
        Permissions.READ,
        Permissions.WRITE,
        Permissions.PROJECT_MANAGE,
    ],
    "user": [Permissions.READ],
}


def has_permission(user: User, permission: str) -> bool:
    """Check if user has a specific permission.

    Args:
        user: The user to check.
        permission: The permission to check for.

    Returns:
        True if user has the permission, False otherwise.
    """
    if not user:
        return False

    # Try to get role permissions - handle lazy loading
    try:
        if not user.role:
            return False
        user_permissions = user.role.permissions or []
    except Exception:
        # If role is not loaded, we can't determine permissions
        return False

    # Super admin has all permissions
    if Permissions.ALL in user_permissions:
        return True

    # Check specific permission
    return permission in user_permissions


def is_admin(user: User) -> bool:
    """Check if user is an admin.

    Args:
        user: The user to check.

    Returns:
        True if user is admin or super admin, False otherwise.
    """
    if not user:
        return False

    # Try to get role permissions - handle lazy loading
    try:
        if not user.role:
            return False
        user_permissions = user.role.permissions or []
    except Exception:
        # If role is not loaded, we can't determine admin status
        return False

    # Super admin or admin permission
    return Permissions.ALL in user_permissions or Permissions.ADMIN in user_permissions


def can_modify_user(current_user: User, target_user_id: int) -> bool:
    """Check if current user can modify target user.

    Args:
        current_user: The current authenticated user.
        target_user_id: The ID of the user to modify.

    Returns:
        True if modification is allowed, False otherwise.
    """
    # Admin can modify any user
    if is_admin(current_user):
        return True

    # Users can modify their own data
    return current_user.id == target_user_id


async def require_admin_permission(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Require admin permission for the endpoint.

    Args:
        current_user: The current authenticated user.
        db: Database session for loading user role.

    Returns:
        The user if they have admin permission.

    Raises:
        HTTPException: If user is not an admin (403).
    """
    # Load user with role to check permissions
    from sqlalchemy import select
    from app.db.models import Role

    result = await db.execute(
        select(Role).where(Role.id == current_user.role_id)
    )
    role = result.scalar_one_or_none()

    if not role:
        logger.warning(
            f"Permission denied: user '{current_user.username}' has no role assigned"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: admin access required",
        )

    user_permissions = role.permissions or []

    # Check for admin permissions
    if Permissions.ALL not in user_permissions and Permissions.ADMIN not in user_permissions:
        logger.warning(
            f"Permission denied: user '{current_user.username}' does not have admin privileges"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: admin access required",
        )

    return current_user


async def require_permission(permission: str):
    """Create a dependency that requires a specific permission.

    Args:
        permission: The permission required to access the endpoint.

    Returns:
        A dependency function that checks for the required permission.
    """

    async def check_permission(
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> User:
        """Check if user has required permission.

        Args:
            current_user: The current authenticated and active user.

        Returns:
            The user if they have the required permission.

        Raises:
            HTTPException: If user lacks the required permission (403).
        """
        if not has_permission(current_user, permission):
            logger.warning(
                f"Permission denied: user '{current_user.username}' "
                f"lacks permission '{permission}'"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}",
            )

        return current_user

    return check_permission

# Security scheme for JWT token
security = HTTPBearer(auto_error=False)


async def get_db() -> AsyncSession:
    """Get database session dependency."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


class CommonQueryParams:
    """Common query parameters for list endpoints."""

    def __init__(self, skip: int = 0, limit: int = 100):
        self.skip = skip
        self.limit = limit


# Type alias for common parameters
CommonParams = Annotated[CommonQueryParams, Depends()]


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(security)
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Get current user from JWT token.

    Args:
        credentials: HTTP Authorization credentials containing the Bearer token.
        db: Database session for user lookup.

    Returns:
        The authenticated User object.

    Raises:
        HTTPException: If authentication fails (401) or user not found (401).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Check if credentials exist
    if not credentials:
        logger.warning("Authentication failed: no credentials provided")
        raise credentials_exception

    token = credentials.credentials

    # Validate the token
    payload = await validate_token(token)
    if not payload:
        raise credentials_exception

    # Extract user ID from token
    user_id_str = payload.get("sub")
    if not user_id_str:
        logger.warning("Authentication failed: no subject in token")
        raise credentials_exception

    try:
        user_id = int(user_id_str)
    except ValueError:
        logger.warning(f"Authentication failed: invalid user ID format '{user_id_str}'")
        raise credentials_exception

    # Fetch user from database with role loaded
    user = await get_user_by_id(db, user_id, load_role=True)
    if not user:
        logger.warning(f"Authentication failed: user {user_id} not found")
        raise credentials_exception

    logger.debug(f"User '{user.username}' authenticated successfully")
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Get current active user.

    Args:
        current_user: The current authenticated user.

    Returns:
        The user if active.

    Raises:
        HTTPException: If user is inactive (403).
    """
    if not current_user.is_active:
        logger.warning(f"Access denied: user '{current_user.username}' is inactive")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return current_user


# Type aliases for common dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentActiveUser = Annotated[User, Depends(get_current_active_user)]
DBSession = Annotated[AsyncSession, Depends(get_db)]


# Service dependencies
def get_token_stats_service() -> TokenStatsService:
    """Get token stats service dependency."""
    return TokenStatsService()


def get_code_stats_service() -> CodeStatsService:
    """Get code stats service dependency."""
    return CodeStatsService()


def get_bug_stats_service() -> BugStatsService:
    """Get bug stats service dependency."""
    return BugStatsService()


def get_personal_stats_service() -> PersonalStatsService:
    """Get personal stats service dependency."""
    return PersonalStatsService()


def get_project_stats_service() -> ProjectStatsService:
    """Get project stats service dependency."""
    return ProjectStatsService()


def get_cache_service() -> CacheService:
    """Get cache service dependency."""
    return CacheService()


# Auth service dependencies - provide module access through dependency injection
def get_auth_service() -> type:
    """Get auth service module dependency.

    Returns:
        The auth_service module for accessing auth functions.
    """
    return auth_service_module
