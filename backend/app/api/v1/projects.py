"""Project API routes."""


from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin_permission
from app.core.logging import get_logger
from app.db.base import get_db
from app.db.models import Project, ProjectMember, User
from app.schemas.project import (
    ProjectCreate,
    ProjectInDB,
    ProjectListResponse,
    ProjectMemberCreate,
    ProjectMemberListResponse,
    ProjectMemberResponse,
    ProjectMemberUpdate,
    ProjectResponse,
    ProjectUpdate,
)

router = APIRouter(prefix="/projects", tags=["projects"])
logger = get_logger(__name__)


@router.get(
    "",
    response_model=ProjectListResponse,
    summary="获取项目列表",
    description="获取分页的项目列表，支持按状态、阶段筛选和关键词搜索。",
    response_description="项目列表",
    responses={
        200: {
            "description": "成功获取项目列表",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": 1,
                                "name": "示例项目",
                                "code": "demo-project",
                                "description": "这是一个示例项目",
                                "stage": "development",
                                "status": "active",
                                "start_date": "2026-01-01",
                                "end_date": "2026-12-31",
                                "manager_id": 1,
                                "created_at": "2026-01-01T00:00:00",
                                "updated_at": "2026-03-31T00:00:00"
                            }
                        ],
                        "total": 50,
                        "page": 1,
                        "pageSize": 20
                    }
                }
            }
        },
        422: {"description": "参数验证错误"},
    }
)
async def list_projects(
    page: int = Query(1, ge=1, description="页码 (从1开始)", examples=[1]),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量 (1-100)", examples=[20]),
    status: str | None = Query(None, description="按状态筛选 (如: active, inactive)", examples=["active"]),
    stage: str | None = Query(None, description="按阶段筛选 (如: planning, development, testing)", examples=["development"]),
    keyword: str | None = Query(None, description="搜索关键词（匹配项目名称或代码）", examples=["demo"]),
    db: AsyncSession = Depends(get_db),
) -> ProjectListResponse:
    """Get paginated list of projects with optional filtering.

    Returns a paginated list of projects with support for filtering by status,
    stage, and keyword search on project name or code.

    Args:
        page: Page number (1-indexed, default 1)
        page_size: Number of results per page (1-100, default 20)
        status: Optional status filter (e.g., 'active', 'inactive')
        stage: Optional stage filter (e.g., 'planning', 'development', 'testing')
        keyword: Optional search keyword for project name or code
        db: Database session dependency

    Returns:
        ProjectListResponse containing:
            - items: List of projects
            - total: Total number of matching projects
            - page: Current page number
            - pageSize: Number of items per page
    """
    # Build base query
    query = select(Project)
    count_query = select(func.count()).select_from(Project)

    # Apply filters
    filters = []
    if status:
        filters.append(Project.status == status)
    if stage:
        filters.append(Project.stage == stage)
    if keyword:
        filters.append(
            (Project.name.contains(keyword)) | (Project.code.contains(keyword))
        )

    if filters:
        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)

    # Get total count
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * pageSize
    query = query.offset(offset).limit(pageSize)

    # Execute query
    result = await db.execute(query)
    projects = result.scalars().all()

    return ProjectListResponse(
        items=[ProjectInDB.model_validate(p) for p in projects],
        total=total,
        page=page,
        pageSize=pageSize,
    )


@router.post(
    "",
    response_model=ProjectInDB,
    status_code=status.HTTP_201_CREATED,
    summary="创建新项目",
    description="创建新项目。需要管理员权限。",
    response_description="创建的项目",
    responses={
        201: {
            "description": "项目创建成功",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "示例项目",
                        "code": "demo-project",
                        "description": "这是一个示例项目",
                        "stage": "development",
                        "status": "active",
                        "start_date": "2026-01-01",
                        "end_date": "2026-12-31",
                        "manager_id": 1,
                        "created_at": "2026-03-31T10:00:00",
                        "updated_at": "2026-03-31T10:00:00"
                    }
                }
            }
        },
        401: {"description": "未授权访问"},
        403: {"description": "权限不足（需要管理员权限）"},
        409: {"description": "项目代码已存在"},
        422: {"description": "参数验证错误"},
    }
)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> ProjectInDB:
    """Create a new project.

    Creates a new project with the provided data. Requires admin permission.
    Project code must be unique.

    Args:
        project_data: Project creation data including name, code, description, etc.
        db: Database session dependency
        current_user: Current authenticated admin user

    Returns:
        ProjectInDB containing the created project details

    Raises:
        HTTPException: 409 if project code already exists
        HTTPException: 403 if user doesn't have admin permission
    """
    # Check for duplicate code
    existing = await db.execute(
        select(Project).where(Project.code == project_data.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Project with code '{project_data.code}' already exists",
        )

    # Create project
    project = Project(**project_data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)

    logger.info(
        "Project created",
        project_id=project.id,
        project_name=project.name,
        project_code=project.code,
        created_by=current_user.username if current_user else None,
    )

    return ProjectInDB.model_validate(project)


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="获取项目详情",
    description="获取指定项目的详细信息，包括项目成员列表。",
    response_description="项目详情",
    responses={
        200: {
            "description": "成功获取项目详情",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "示例项目",
                        "code": "demo-project",
                        "description": "这是一个示例项目",
                        "stage": "development",
                        "status": "active",
                        "start_date": "2026-01-01",
                        "end_date": "2026-12-31",
                        "manager_id": 1,
                        "created_at": "2026-01-01T00:00:00",
                        "updated_at": "2026-03-31T00:00:00",
                        "members": [
                            {
                                "id": 1,
                                "project_id": 1,
                                "user_id": 1,
                                "role": "owner",
                                "username": "zhangsan",
                                "email": "zhangsan@example.com"
                            }
                        ]
                    }
                }
            }
        },
        404: {"description": "项目不存在"},
        422: {"description": "参数验证错误"},
    }
)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    """Get project details by ID.

    Returns detailed information about a specific project including its members.

    Args:
        project_id: Project ID (path parameter)
        db: Database session dependency

    Returns:
        ProjectResponse containing project details and member list

    Raises:
        HTTPException: 404 if project not found
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    # Get members with user details
    members_result = await db.execute(
        select(ProjectMember, User)
        .join(User, ProjectMember.user_id == User.id)
        .where(ProjectMember.project_id == project_id)
    )
    members = []
    for member, user in members_result.all():
        member_data = ProjectMemberResponse.model_validate(member)
        member_data.username = user.username
        member_data.email = user.email
        members.append(member_data)

    # Build response manually to avoid lazy loading issues
    return ProjectResponse(
        id=project.id,
        name=project.name,
        code=project.code,
        description=project.description,
        stage=project.stage,
        status=project.status,
        start_date=project.start_date,
        end_date=project.end_date,
        manager_id=project.manager_id,
        created_at=project.created_at,
        updated_at=project.updated_at,
        members=members,
    )


@router.put(
    "/{project_id}",
    response_model=ProjectInDB,
    summary="更新项目",
    description="更新指定项目的信息。需要管理员权限。",
    response_description="更新后的项目",
    responses={
        200: {
            "description": "项目更新成功",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "示例项目（已更新）",
                        "code": "demo-project",
                        "description": "更新后的描述",
                        "stage": "testing",
                        "status": "active",
                        "start_date": "2026-01-01",
                        "end_date": "2026-12-31",
                        "manager_id": 1,
                        "created_at": "2026-01-01T00:00:00",
                        "updated_at": "2026-03-31T12:00:00"
                    }
                }
            }
        },
        401: {"description": "未授权访问"},
        403: {"description": "权限不足（需要管理员权限）"},
        404: {"description": "项目不存在"},
        409: {"description": "项目代码已存在"},
        422: {"description": "参数验证错误"},
    }
)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> ProjectInDB:
    """Update an existing project.

    Updates the specified project with the provided data. Requires admin permission.
    Project code must remain unique if changed.

    Args:
        project_id: Project ID (path parameter)
        project_data: Project update data (partial updates supported)
        db: Database session dependency
        current_user: Current authenticated admin user

    Returns:
        ProjectInDB containing the updated project details

    Raises:
        HTTPException: 404 if project not found
        HTTPException: 409 if new project code already exists
        HTTPException: 403 if user doesn't have admin permission
    """
    # Get existing project
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    # Check for duplicate code if updating code
    if project_data.code and project_data.code != project.code:
        existing = await db.execute(
            select(Project).where(
                (Project.code == project_data.code) & (Project.id != project_id)
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Project with code '{project_data.code}' already exists",
            )

    # Update fields
    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)

    logger.info(
        "Project updated",
        project_id=project.id,
        project_name=project.name,
        updated_by=current_user.username if current_user else None,
    )

    return ProjectInDB.model_validate(project)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除项目",
    description="删除指定项目。需要管理员权限。此操作不可恢复。",
    response_description="无内容",
    responses={
        204: {"description": "项目删除成功"},
        401: {"description": "未授权访问"},
        403: {"description": "权限不足（需要管理员权限）"},
        404: {"description": "项目不存在"},
    }
)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> None:
    """Delete a project.

    Permanently deletes the specified project. Requires admin permission.
    This action cannot be undone.

    Args:
        project_id: Project ID (path parameter)
        db: Database session dependency
        current_user: Current authenticated admin user

    Raises:
        HTTPException: 404 if project not found
        HTTPException: 403 if user doesn't have admin permission
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    await db.delete(project)
    await db.commit()

    logger.info(
        "Project deleted",
        project_id=project_id,
        project_name=project.name if project else None,
        deleted_by=current_user.username if current_user else None,
    )


@router.get(
    "/{project_id}/members",
    response_model=ProjectMemberListResponse | list[ProjectMemberResponse],
    summary="获取项目成员列表",
    description="获取指定项目的成员列表，包含用户详细信息。设置simple=true返回数组格式。",
    response_description="项目成员列表",
    responses={
        200: {
            "description": "成功获取成员列表",
            "content": {
                "application/json": {
                    "examples": {
                        "paginated": {
                            "summary": "分页响应 (simple=false)",
                            "value": {
                                "items": [
                                    {
                                        "id": 1,
                                        "project_id": 1,
                                        "user_id": 1,
                                        "role": "owner",
                                        "username": "zhangsan",
                                        "email": "zhangsan@example.com"
                                    },
                                    {
                                        "id": 2,
                                        "project_id": 1,
                                        "user_id": 2,
                                        "role": "developer",
                                        "username": "lisi",
                                        "email": "lisi@example.com"
                                    }
                                ],
                                "total": 8,
                                "page": 1,
                                "pageSize": 20
                            }
                        },
                        "simple": {
                            "summary": "数组响应 (simple=true)",
                            "value": [
                                {
                                    "id": 1,
                                    "project_id": 1,
                                    "user_id": 1,
                                    "role": "owner",
                                    "username": "zhangsan",
                                    "email": "zhangsan@example.com"
                                },
                                {
                                    "id": 2,
                                    "project_id": 1,
                                    "user_id": 2,
                                    "role": "developer",
                                    "username": "lisi",
                                    "email": "lisi@example.com"
                                }
                            ]
                        }
                    }
                }
            }
        },
        404: {"description": "项目不存在"},
        422: {"description": "参数验证错误"},
    }
)
async def list_project_members(
    project_id: int,
    page: int = Query(1, ge=1, description="页码 (从1开始)", examples=[1]),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量 (1-100)", examples=[20]),
    simple: bool = Query(False, description="返回简单数组格式而非分页结构", examples=[False]),
    db: AsyncSession = Depends(get_db),
) -> ProjectMemberListResponse | list[ProjectMemberResponse]:
    """Get members of a project.

    Returns a paginated list of project members with user details.
    When simple=true, returns an array of members without pagination.

    Args:
        project_id: Project ID (path parameter)
        page: Page number (1-indexed, default 1)
        page_size: Number of results per page (1-100, default 20)
        simple: If true, return array instead of paginated response
        db: Database session dependency

    Returns:
        ProjectMemberListResponse or list[ProjectMemberResponse] containing:
            - items: List of project members with user info (paginated)
            - total: Total number of members (paginated)
            - page: Current page number (paginated)
            - pageSize: Number of items per page (paginated)
            - or simple array of members

    Raises:
        HTTPException: 404 if project not found
    """
    # Check project exists
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    # Build base query for members
    base_query = (
        select(ProjectMember, User)
        .join(User, ProjectMember.user_id == User.id)
        .where(ProjectMember.project_id == project_id)
    )

    if simple:
        # Simple mode: return all members as array
        members_result = await db.execute(base_query)

        members = []
        for member, user in members_result.all():
            member_data = ProjectMemberResponse.model_validate(member)
            member_data.username = user.username
            member_data.email = user.email
            members.append(member_data)

        return members

    # Paginated mode: return paginated response
    # Get total count
    count_result = await db.execute(
        select(func.count())
        .select_from(ProjectMember)
        .where(ProjectMember.project_id == project_id)
    )
    total = count_result.scalar() or 0

    # Get members with user details (paginated)
    offset = (page - 1) * pageSize
    members_result = await db.execute(
        base_query.offset(offset).limit(pageSize)
    )

    members = []
    for member, user in members_result.all():
        member_data = ProjectMemberResponse.model_validate(member)
        member_data.username = user.username
        member_data.email = user.email
        members.append(member_data)

    return ProjectMemberListResponse(
        items=members,
        total=total,
        page=page,
        pageSize=pageSize,
    )


@router.post(
    "/{project_id}/members",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="添加项目成员",
    description="向指定项目添加成员。需要管理员权限。",
    response_description="添加的成员信息",
    responses={
        201: {
            "description": "成员添加成功",
            "content": {
                "application/json": {
                    "example": {
                        "id": 3,
                        "project_id": 1,
                        "user_id": 3,
                        "role": "developer",
                        "username": "wangwu",
                        "email": "wangwu@example.com"
                    }
                }
            }
        },
        401: {"description": "未授权访问"},
        403: {"description": "权限不足（需要管理员权限）"},
        404: {"description": "项目或用户不存在"},
        409: {"description": "用户已是项目成员"},
        422: {"description": "参数验证错误"},
    }
)
async def add_project_member(
    project_id: int,
    member_data: ProjectMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> ProjectMemberResponse:
    """Add a member to a project.

    Adds a user as a member to the specified project. Requires admin permission.

    Args:
        project_id: Project ID (path parameter)
        member_data: Member creation data including user_id and role
        db: Database session dependency
        current_user: Current authenticated admin user

    Returns:
        ProjectMemberResponse containing the created membership details

    Raises:
        HTTPException: 404 if project or user not found
        HTTPException: 409 if user is already a member
        HTTPException: 403 if user doesn't have admin permission
    """
    # Check project exists
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    # Check user exists
    user_result = await db.execute(
        select(User).where(User.id == member_data.user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {member_data.user_id} not found",
        )

    # Check if already a member
    existing = await db.execute(
        select(ProjectMember).where(
            (ProjectMember.project_id == project_id)
            & (ProjectMember.user_id == member_data.user_id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this project",
        )

    # Create membership
    member = ProjectMember(
        project_id=project_id,
        user_id=member_data.user_id,
        role=member_data.role,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    response = ProjectMemberResponse.model_validate(member)
    response.username = user.username
    response.email = user.email
    return response


@router.delete(
    "/{project_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除项目成员",
    description="从指定项目中删除成员。需要管理员权限。",
    response_description="无内容",
    responses={
        204: {"description": "成员删除成功"},
        401: {"description": "未授权访问"},
        403: {"description": "权限不足（需要管理员权限）"},
        404: {"description": "项目或成员不存在"},
    }
)
async def remove_project_member(
    project_id: int,
    member_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> None:
    """Remove a member from a project.

    Removes the specified member from the project. Requires admin permission.

    Args:
        project_id: Project ID (path parameter)
        member_id: Member ID (path parameter)
        db: Database session dependency
        current_user: Current authenticated admin user

    Raises:
        HTTPException: 404 if project or member not found
        HTTPException: 403 if user doesn't have admin permission
    """
    # Check project exists
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    # Check member exists
    member_result = await db.execute(
        select(ProjectMember).where(
            (ProjectMember.id == member_id) &
            (ProjectMember.project_id == project_id)
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member with ID {member_id} not found in project",
        )

    await db.delete(member)
    await db.commit()

    logger.info(
        "Project member removed",
        project_id=project_id,
        member_id=member_id,
        removed_by=current_user.username if current_user else None,
    )


@router.put(
    "/{project_id}/members/{member_id}",
    response_model=ProjectMemberResponse,
    summary="更新项目成员角色",
    description="更新指定项目中成员的角色。需要管理员权限。",
    response_description="更新后的成员信息",
    responses={
        200: {
            "description": "成员角色更新成功",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "project_id": 1,
                        "user_id": 2,
                        "role": "maintainer",
                        "username": "lisi",
                        "email": "lisi@example.com",
                        "joined_at": "2026-01-01T00:00:00"
                    }
                }
            }
        },
        401: {"description": "未授权访问"},
        403: {"description": "权限不足（需要管理员权限）"},
        404: {"description": "项目或成员不存在"},
        422: {"description": "参数验证错误"},
    }
)
async def update_project_member(
    project_id: int,
    member_id: int,
    data: ProjectMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> ProjectMemberResponse:
    """Update project member role.

    Updates the role of a member in the specified project. Requires admin permission.

    Args:
        project_id: Project ID (path parameter)
        member_id: Member ID (path parameter) - this is the ProjectMember.id
        data: Update data containing the new role
        db: Database session dependency
        current_user: Current authenticated admin user

    Returns:
        ProjectMemberResponse containing the updated membership details

    Raises:
        HTTPException: 404 if project or member not found
        HTTPException: 403 if user doesn't have admin permission
    """
    # Check project exists
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    # Check member exists - note: member_id is the ProjectMember.id
    member_result = await db.execute(
        select(ProjectMember, User)
        .join(User, ProjectMember.user_id == User.id)
        .where(
            (ProjectMember.id == member_id) &
            (ProjectMember.project_id == project_id)
        )
    )
    row = member_result.one_or_none()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member with ID {member_id} not found in project",
        )

    member, user = row

    # Update role
    member.role = data.role
    await db.commit()
    await db.refresh(member)

    logger.info(
        "Project member role updated",
        project_id=project_id,
        member_id=member_id,
        user_id=member.user_id,
        new_role=data.role,
        updated_by=current_user.username if current_user else None,
    )

    # Build response with user details
    response = ProjectMemberResponse.model_validate(member)
    response.username = user.username
    response.email = user.email
    return response
