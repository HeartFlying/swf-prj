"""Authentication API endpoints.

TDD Green Phase: Implement auth API endpoints to make tests pass.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_auth_service, get_current_active_user, get_db
from app.core.logging import get_logger
from app.db.models import User
from app.schemas import (
    LoginRequest,
    LogoutRequest,
    LogoutResponse,
    RefreshTokenRequest,
    TokenRefreshResponse,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = get_logger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


@router.post("/login", response_model=TokenRefreshResponse)
async def login(
    request: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    auth_svc: Annotated[type, Depends(get_auth_service)],
) -> TokenRefreshResponse:
    """Login endpoint to get access and refresh tokens.

    Accepts JSON body with username and password.

    Args:
        request: JSON body with username and password.
        db: Database session.
        auth_svc: Auth service module.

    Returns:
        Token response with access and refresh tokens.

    Raises:
        HTTPException: If authentication fails.
    """
    user = request.username
    pwd = request.password

    result = await auth_svc.login_user(db, user, pwd)

    if not result:
        logger.warning(f"Login failed for user '{user}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(f"User '{user}' logged in successfully")

    # Build user response using unified method
    user_response = None
    if result.get("user"):
        from app.db.models import User

        user_data = result["user"]
        # Create a temporary User model instance for from_user method
        temp_user = User(
            id=user_data["id"],
            username=user_data["username"],
            email=user_data["email"],
            password_hash="",  # Not needed for response
            department=user_data.get("department", ""),
            is_active=user_data.get("is_active", True),
            role_id=user_data.get("role_id"),
        )
        # Attach role if present
        role_data = user_data.get("role")
        if role_data:
            from app.db.models import Role

            temp_user.role = Role(
                id=role_data["id"],
                name=role_data["name"],
                description=role_data.get("description"),
                permissions=role_data.get("permissions", []),
            )
        user_response = UserResponse.from_user(temp_user)

    # Build response dict that middleware will wrap in standard format
    # Use camelCase to match TokenRefreshResponse schema
    return {
        "accessToken": result["access_token"],
        "refreshToken": result["refresh_token"],
        "tokenType": result["token_type"],
        "expiresIn": result.get("expires_in", 3600),
        "user": user_response.model_dump(by_alias=True) if user_response else None,
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    auth_svc: Annotated[type, Depends(get_auth_service)],
) -> TokenResponse:
    """Refresh access token using refresh token.

    Args:
        request: Refresh token request.
        db: Database session.
        auth_svc: Auth service module.

    Returns:
        New access token response.

    Raises:
        HTTPException: If refresh token is invalid.
    """
    result = await auth_svc.refresh_access_token(db, request.refresh_token)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(
        access_token=result["access_token"],
        token_type=result["token_type"],
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout_endpoint(
    request: LogoutRequest,
    token: Annotated[str, Depends(oauth2_scheme)],
    auth_svc: Annotated[type, Depends(get_auth_service)],
) -> LogoutResponse:
    """Logout endpoint to invalidate tokens.

    Args:
        request: Logout request with optional refresh token.
        token: Current access token from Authorization header.
        auth_svc: Auth service module.

    Returns:
        Logout success message.

    Raises:
        HTTPException: If logout fails.
    """
    success = await auth_svc.logout(token, request.refresh_token)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout",
        )

    return LogoutResponse(message="Successfully logged out")


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> UserResponse:
    """Get current user information.

    Args:
        current_user: Current authenticated user.

    Returns:
        User information.
    """
    return UserResponse.from_user(current_user)
