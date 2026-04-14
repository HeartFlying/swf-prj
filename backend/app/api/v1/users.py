"""Users API endpoints.

TDD Green Phase: Implement users API endpoints to make tests pass.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import (
    Permissions,
    get_current_user,
    get_db,
    require_admin_permission,
)
from app.core.logging import get_logger
from app.core.security import get_password_hash, verify_password
from app.db.models import ProjectMember, Role, User
from app.schemas import (
    ChangePasswordRequest,
    ProjectInDB,
    UserCreate,
    UserListResponse,
    UserProfileUpdate,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])
logger = get_logger(__name__)


# Note: UserResponse.from_user(user) is now used instead of build_user_response
# This ensures consistent user response building across the codebase


@router.get("", response_model=UserListResponse)
async def get_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin_permission)],
    page: int = Query(1, ge=1, description="Page number"),
    pageSize: int = Query(100, ge=1, le=1000, alias="pageSize"),
    keyword: str | None = Query(None, max_length=100),
    role: str | None = Query(None, max_length=50),
    status: str | None = Query(None, max_length=50),
) -> UserListResponse:
    """Get list of users with search and filter support.

    Args:
        db: Database session.
        current_user: Current authenticated user.
        page: Page number (1-indexed).
        pageSize: Number of users per page.
        keyword: Search keyword for username or email.
        role: Filter by role name.
        status: Filter by status ("active" or "inactive").

    Returns:
        User list with pagination info.
    """
    offset = (page - 1) * pageSize

    # DEBUG: Log request parameters
    logger.debug(
        "get_users called",
        page=page,
        page_size=pageSize,
        offset=offset,
        keyword=keyword,
        role=role,
        status=status,
        current_user_id=current_user.id if current_user else None,
    )

    # Build base query with filters
    query = select(User).options(selectinload(User.role))
    count_query = select(func.count(User.id))

    # Apply keyword filter (search username or email)
    if keyword:
        keyword_filter = or_(
            User.username.ilike(f"%{keyword}%"),
            User.email.ilike(f"%{keyword}%"),
        )
        query = query.where(keyword_filter)
        count_query = count_query.where(keyword_filter)

    # Apply role filter
    if role:
        query = query.join(Role).where(Role.name == role)
        count_query = count_query.join(Role).where(Role.name == role)

    # Apply status filter
    if status:
        is_active = status.lower() == "active"
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)

    # Get total count using SQL COUNT function for better performance
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # DEBUG: Log total count
    logger.debug("get_users total count", total=total)

    # Get paginated users with role
    result = await db.execute(
        query.offset(offset).limit(pageSize)
    )
    users = result.scalars().all()

    # DEBUG: Log raw users data
    logger.debug(
        "get_users raw users from DB",
        users_count=len(users),
        users_data=[
            {
                "id": u.id,
                "username": u.username,
                "role_id": u.role_id,
                "role": u.role.name if u.role else None,
            }
            for u in users
        ],
    )

    response_items = [UserResponse.from_user(user) for user in users]

    # DEBUG: Log response items
    logger.debug(
        "get_users response items",
        items_count=len(response_items),
        items_data=[
            {
                "id": item.id,
                "username": item.username,
                "role": item.role.model_dump() if item.role else None,
            }
            for item in response_items
        ],
    )

    return UserListResponse(
        items=response_items,
        total=total,
        page=page,
        pageSize=pageSize,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin_permission)],
) -> UserResponse:
    """Create a new user.

    Args:
        user_data: User creation data.
        db: Database session.
        current_user: Current authenticated user.

    Returns:
        Created user.

    Raises:
        HTTPException: If username or email already exists.
    """
    # Check if username already exists
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists",
        )

    # Create new user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        department=user_data.department,
        is_active=True,
        role_id=user_data.role_id,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info(
        "User created",
        user_id=new_user.id,
        username=new_user.username,
        created_by=current_user.username if current_user else None,
    )

    return UserResponse.from_user(new_user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Get user by ID.

    Args:
        user_id: User ID.
        db: Database session.
        current_user: Current authenticated user.

    Returns:
        User.

    Raises:
        HTTPException: If user not found.
    """
    # Get user with role
    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserResponse.from_user(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Update user.

    Args:
        user_id: User ID.
        user_data: User update data.
        db: Database session.
        current_user: Current authenticated user.

    Returns:
        Updated user.

    Raises:
        HTTPException: If user not found or permission denied.
    """
    # Load current user's role to check permissions
    from app.db.models import Role as RoleModel

    result = await db.execute(select(RoleModel).where(RoleModel.id == current_user.role_id))
    current_user_role = result.scalar_one_or_none()
    current_user_permissions = current_user_role.permissions if current_user_role else []
    is_current_user_admin = Permissions.ALL in current_user_permissions or Permissions.ADMIN in current_user_permissions

    # Check permission - admin can update any user, regular users can only update themselves
    if not is_current_user_admin and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: cannot modify other users",
        )

    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Update fields
    if user_data.email is not None:
        user.email = user_data.email
    if user_data.department is not None:
        user.department = user_data.department

    # Only admin can update is_active and role_id
    if user_data.is_active is not None:
        if not is_current_user_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: only admin can change active status",
            )
        user.is_active = user_data.is_active

    if user_data.role_id is not None:
        if not is_current_user_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: only admin can change role",
            )
        user.role_id = user_data.role_id

    await db.commit()

    # Refresh user and load role
    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.id == user.id)
    )
    user = result.scalar_one()

    logger.info(
        "User updated",
        user_id=user.id,
        username=user.username,
        updated_by=current_user.username if current_user else None,
    )

    return UserResponse.from_user(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin_permission)],
) -> None:
    """Delete user.

    Args:
        user_id: User ID.
        db: Database session.
        current_user: Current authenticated user (must be admin).

    Raises:
        HTTPException: If user not found or permission denied.
    """
    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent admin from deleting themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    await db.delete(user)
    await db.commit()

    logger.info(
        "User deleted",
        user_id=user_id,
        username=user.username,
        deleted_by=current_user.username if current_user else None,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Get current authenticated user information.

    Args:
        current_user: Current authenticated user from token.

    Returns:
        Current user information.
    """
    return UserResponse.from_user(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_data: UserProfileUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Update current user profile.

    Args:
        user_data: Profile update data.
        db: Database session.
        current_user: Current authenticated user.

    Returns:
        Updated user information.
    """
    # Update fields
    if user_data.email is not None:
        # Check if email is already used by another user
        result = await db.execute(
            select(User).where(
                (User.email == user_data.email) & (User.id != current_user.id)
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another user",
            )
        current_user.email = user_data.email

    if user_data.department is not None:
        current_user.department = user_data.department

    if user_data.avatar is not None:
        current_user.avatar = user_data.avatar

    await db.commit()

    # Refresh current_user and load role
    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.id == current_user.id)
    )
    refreshed_user = result.scalar_one()

    logger.info(
        "User profile updated",
        user_id=refreshed_user.id,
        username=refreshed_user.username,
    )

    return UserResponse.from_user(refreshed_user)


@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_current_user_password(
    password_data: ChangePasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Change current user password.

    Args:
        password_data: Old and new password data.
        db: Database session.
        current_user: Current authenticated user.

    Raises:
        HTTPException: If old password is incorrect.
    """
    # Verify old password
    if not verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password",
        )

    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    await db.commit()

    logger.info(
        "Password changed",
        user_id=current_user.id,
        username=current_user.username,
    )


@router.get("/me/projects", response_model=list[ProjectInDB])
async def get_current_user_projects(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ProjectInDB]:
    """Get projects for current user.

    Args:
        db: Database session.
        current_user: Current authenticated user.

    Returns:
        List of projects the user is a member of.
    """
    from app.db.models import Project

    # Get projects where user is a member
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(ProjectMember.user_id == current_user.id)
        .where(Project.status == "active")
    )
    projects = result.scalars().all()

    # Convert to response format using Pydantic schema
    return [ProjectInDB.model_validate(project) for project in projects]
