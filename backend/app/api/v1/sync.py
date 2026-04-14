"""Data Synchronization API routes.

Provides endpoints for managing data sync tasks from external sources
(GitLab, Trae, ZenTao) to the local database.
"""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_cache_service, require_admin_permission
from app.core.logging import get_logger
from app.db.base import get_db
from app.db.models import User
from app.schemas.common import ApiResponse
from app.schemas.sync import (
    SyncGitLabRequest,
    SyncLogListResponse,
    SyncLogResponse,
    SyncTaskCreate,
    SyncTaskCreateData,
    SyncTaskDetailData,
    SyncTaskInDB,
    SyncTaskListData,
    SyncTraeRequest,
    SyncZendaoRequest,
)
from app.services.cache_service import CacheService
from app.services.sync_log_service import SyncLogService
from app.services.sync_service import SyncService
from app.services.sync_task_service import SyncTaskService
from app.tasks import (
    sync_gitlab_commits,
    sync_trae_token_usage,
    sync_zendao_bugs,
)

router = APIRouter(tags=["sync"])
logger = get_logger(__name__)


@router.post(
    "/gitlab",
    response_model=ApiResponse[SyncTaskCreateData],
    status_code=status.HTTP_202_ACCEPTED,
    summary="触发GitLab数据同步",
    description="创建GitLab数据同步任务，包括代码提交、合并请求和成员信息。任务将异步执行。需要管理员权限。",
    response_description="同步任务创建成功",
    responses={
        202: {
            "description": "同步任务已创建并排队",
            "content": {
                "application/json": {
                    "example": {
                        "code": 202,
                        "message": "GitLab sync task created and queued for execution.",
                        "data": {
                            "task_id": 123,
                            "source": "gitlab",
                            "status": "pending"
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "project_id"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Internal server error"},
    }
)
async def sync_gitlab(
    sync_data: SyncGitLabRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[SyncTaskCreateData]:
    """Trigger GitLab data synchronization.

    Creates a new sync task for GitLab data. The task will be executed
    asynchronously to fetch commits, merge requests, and members.

    Args:
        sync_data: Sync configuration including project_id and sync_type
        db: Database session
        current_user: Current authenticated admin user
        cache_service: Service for cache invalidation

    Returns:
        Sync task creation response with task_id

    Raises:
        HTTPException: If project not found or sync task creation fails
    """
    try:
        task = await sync_service.create_task(
            db=db,
            task_type=sync_data.sync_type,
            source_type="gitlab",
            project_id=sync_data.project_id,
            created_by=current_user.username,
        )

        # Clear project cache if project_id is specified
        if sync_data.project_id:
            await cache_service.clear_project_cache(sync_data.project_id)

        # Trigger Celery task
        sync_gitlab_commits.delay(project_id=sync_data.project_id, task_id=task.id)

        logger.info(
            "GitLab sync task created",
            task_id=task.id,
            project_id=sync_data.project_id,
            sync_type=sync_data.sync_type,
            created_by=current_user.username if current_user else None,
        )

        return ApiResponse(
            code=202,
            message="GitLab sync task created and queued for execution.",
            data=SyncTaskCreateData(
                task_id=task.id,
                source="gitlab",
                status="pending"
            )
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create sync task: {str(e)}",
        )


@router.post(
    "/trae",
    response_model=ApiResponse[SyncTaskCreateData],
    status_code=status.HTTP_202_ACCEPTED,
    summary="触发Trae数据同步",
    description="创建Trae AI平台数据同步任务，包括Token使用量和AI建议数据。任务将异步执行。需要管理员权限。",
    response_description="同步任务创建成功",
    responses={
        202: {
            "description": "同步任务已创建并排队",
            "content": {
                "application/json": {
                    "example": {
                        "code": 202,
                        "message": "Trae sync task created and queued for execution.",
                        "data": {
                            "task_id": 124,
                            "source": "trae",
                            "status": "pending"
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "sync_type"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Internal server error"},
    }
)
async def sync_trae(
    sync_data: SyncTraeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[SyncTaskCreateData]:
    """Trigger Trae data synchronization.

    Creates a new sync task for Trae AI platform data including
    token usage and AI suggestions.

    Args:
        sync_data: Sync configuration including user_id and date range
        db: Database session
        current_user: Current authenticated admin user
        cache_service: Service for cache invalidation

    Returns:
        Sync task creation response with task_id

    Raises:
        HTTPException: If sync task creation fails
    """
    try:
        task = await sync_service.create_task(
            db=db,
            task_type=sync_data.sync_type,
            source_type="trae",
            user_id=sync_data.user_id,
            created_by=current_user.username,
        )

        # Clear user cache if user_id is specified
        if sync_data.user_id:
            await cache_service.clear_user_cache(sync_data.user_id)

        # Trigger Celery task
        sync_trae_token_usage.delay(user_id=sync_data.user_id, task_id=task.id)

        logger.info(
            "Trae sync task created",
            task_id=task.id,
            user_id=sync_data.user_id,
            sync_type=sync_data.sync_type,
            created_by=current_user.username if current_user else None,
        )

        return ApiResponse(
            code=202,
            message="Trae sync task created and queued for execution.",
            data=SyncTaskCreateData(task_id=task.id, source="trae", status="pending")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create sync task: {str(e)}",
        )


@router.post(
    "/zendao",
    response_model=ApiResponse[SyncTaskCreateData],
    status_code=status.HTTP_202_ACCEPTED,
    summary="触发ZenTao数据同步",
    description="创建ZenTao缺陷跟踪系统数据同步任务，包括Bug数据。任务将异步执行。需要管理员权限。",
    response_description="同步任务创建成功",
    responses={
        202: {
            "description": "同步任务已创建并排队",
            "content": {
                "application/json": {
                    "example": {
                        "code": 202,
                        "message": "ZenTao sync task created and queued for execution.",
                        "data": {
                            "task_id": 125,
                            "source": "zendao",
                            "status": "pending"
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "project_id"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Internal server error"},
    }
)
async def sync_zendao(
    sync_data: SyncZendaoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[SyncTaskCreateData]:
    """Trigger ZenTao data synchronization.

    Creates a new sync task for ZenTao bug tracking data.

    Args:
        sync_data: Sync configuration including project_id and product_id
        db: Database session
        current_user: Current authenticated admin user
        cache_service: Service for cache invalidation

    Returns:
        Sync task creation response with task_id

    Raises:
        HTTPException: If sync task creation fails
    """
    try:
        task = await sync_service.create_task(
            db=db,
            task_type=sync_data.sync_type,
            source_type="zendao",
            project_id=sync_data.project_id,
            created_by=current_user.username,
        )

        # Clear project cache if project_id is specified
        if sync_data.project_id:
            await cache_service.clear_project_cache(sync_data.project_id)

        # Trigger Celery task
        sync_zendao_bugs.delay(project_id=sync_data.project_id, task_id=task.id)

        logger.info(
            "ZenTao sync task created",
            task_id=task.id,
            project_id=sync_data.project_id,
            sync_type=sync_data.sync_type,
            created_by=current_user.username if current_user else None,
        )

        return ApiResponse(
            code=202,
            message="ZenTao sync task created and queued for execution.",
            data=SyncTaskCreateData(task_id=task.id, source="zendao", status="pending")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create sync task: {str(e)}",
        )


@router.post(
    "/tasks",
    response_model=ApiResponse[SyncTaskCreateData],
    status_code=status.HTTP_202_ACCEPTED,
    summary="创建同步任务",
    description="创建一个新的同步任务，支持指定来源类型、项目ID列表和日期范围。任务将异步执行。需要管理员权限。",
    response_description="同步任务创建成功",
    responses={
        202: {
            "description": "同步任务已创建并排队",
            "content": {
                "application/json": {
                    "example": {
                        "code": 202,
                        "message": "Sync task created and queued for execution.",
                        "data": {
                            "task_id": 123,
                            "source": "gitlab",
                            "status": "pending"
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "source_type"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Internal server error"},
    }
)
async def create_sync_task(
    task_data: SyncTaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> ApiResponse[SyncTaskCreateData]:
    """Create a new sync task.

    Creates a sync task with the specified parameters. The task will be
    executed asynchronously. If project_ids is provided, a parent task
    will be created with child tasks for each project.

    Args:
        task_data: Sync task creation data including source_type,
                   optional project_ids, and date range
        db: Database session
        current_user: Current authenticated admin user

    Returns:
        Sync task creation response with task_id

    Raises:
        HTTPException: If sync task creation fails
    """
    try:
        # Use the first project_id if provided, otherwise None
        project_id = task_data.project_ids[0] if task_data.project_ids else None

        task = await sync_service.create_task(
            db=db,
            task_type="incremental_sync",
            source_type=task_data.source_type,
            project_id=project_id,
            created_by=current_user.username,
        )

        logger.info(
            "Sync task created",
            task_id=task.id,
            source_type=task_data.source_type,
            project_id=project_id,
            created_by=current_user.username if current_user else None,
        )

        return ApiResponse(
            code=202,
            message="Sync task created and queued for execution.",
            data=SyncTaskCreateData(
                task_id=task.id,
                source=task_data.source_type,
                status="pending"
            )
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create sync task: {str(e)}",
        )


@router.get(
    "/tasks",
    response_model=ApiResponse[SyncTaskListData],
    summary="获取同步任务列表",
    description="获取同步任务的分页列表，支持按状态和来源类型筛选。需要管理员权限。",
    response_description="同步任务列表",
    responses={
        200: {
            "description": "成功获取任务列表",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "Sync tasks retrieved successfully",
                        "data": {
                            "items": [
                                {
                                    "id": 123,
                                    "task_type": "incremental_sync",
                                    "source_type": "gitlab",
                                    "status": "completed",
                                    "project_id": 1,
                                    "records_processed": 150,
                                    "records_failed": 0,
                                    "created_at": "2026-03-31T10:00:00"
                                }
                            ],
                            "total": 50,
                            "page": 1,
                            "page_size": 20
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "page"],
                                "msg": "ensure this value is greater than or equal to 1",
                                "type": "value_error.number.not_ge"
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Internal server error"},
    }
)
async def list_sync_tasks(
    page: int = Query(1, ge=1, description="Page number (1-indexed)", examples=[1]),
    pageSize: int = Query(20, ge=1, le=100, description="Number of results per page", examples=[20]),
    status: Optional[str] = Query(None, description="Filter by status (pending, running, completed, failed, cancelled)"),
    source_type: Optional[str] = Query(None, description="Filter by source type (gitlab, trae, zendao)"),
    sourceType: Optional[str] = Query(None, description="Filter by source type (camelCase alias for frontend compatibility)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> ApiResponse[SyncTaskListData]:
    """Get list of sync tasks.

    Returns paginated list of sync tasks with optional filtering.

    Args:
        page: Page number (1-indexed)
        page_size: Number of results per page
        status: Optional status filter
        source_type: Optional source type filter (snake_case)
        sourceType: Optional source type filter (camelCase alias for frontend)
        db: Database session
        current_user: Current authenticated admin user

    Returns:
        Paginated list of sync tasks
    """
    # Use sourceType (camelCase) if provided, otherwise fall back to source_type
    effective_source_type = sourceType if sourceType is not None else source_type

    try:
        tasks = await sync_task_service.list_tasks(
            db=db,
            status=status,
            source_type=effective_source_type,
            limit=pageSize,
            offset=(page - 1) * pageSize,
        )

        # Get total count
        from sqlalchemy import func, select
        from app.db.models import SyncTask

        count_query = select(func.count()).select_from(SyncTask)
        if status:
            count_query = count_query.where(SyncTask.status == status)
        if effective_source_type:
            count_query = count_query.where(SyncTask.source_type == effective_source_type)

        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        return ApiResponse(
            code=200,
            message="Sync tasks retrieved successfully",
            data=SyncTaskListData(
                items=[SyncTaskInDB.model_validate(t) for t in tasks],
                total=total,
                page=page,
                pageSize=pageSize,
            )
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list sync tasks: {str(e)}",
        )


@router.get(
    "/tasks/{task_id}",
    response_model=ApiResponse[SyncTaskDetailData],
    summary="获取同步任务详情",
    description="获取指定同步任务的详细信息，包括任务状态、处理记录数、错误信息等。需要管理员权限。",
    response_description="同步任务详情",
    responses={
        200: {
            "description": "成功获取任务详情",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "Sync task retrieved successfully",
                        "data": {
                            "id": 123,
                            "task_type": "incremental_sync",
                            "source_type": "gitlab",
                            "status": "completed",
                            "project_id": 1,
                            "started_at": "2026-03-31T10:00:00",
                            "completed_at": "2026-03-31T10:05:30",
                            "records_processed": 150,
                            "records_failed": 0,
                            "error_message": None,
                            "created_at": "2026-03-31T09:55:00"
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        404: {"description": "Task not found"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["path", "task_id"],
                                "msg": "ensure this value is greater than 0",
                                "type": "value_error.number.not_gt"
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Internal server error"},
    }
)
async def get_sync_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> ApiResponse[SyncTaskDetailData]:
    """Get sync task details.

    Returns detailed information about a specific sync task.

    Args:
        task_id: ID of the sync task
        db: Database session
        current_user: Current authenticated admin user

    Returns:
        Detailed sync task information

    Raises:
        HTTPException: If task not found
    """
    try:
        task_status = await sync_service.get_task_status(db, task_id)

        if not task_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sync task {task_id} not found",
            )

        return ApiResponse(
            code=200,
            message="Sync task retrieved successfully",
            data=SyncTaskDetailData(**task_status)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sync task: {str(e)}",
        )


@router.post(
    "/tasks/{task_id}/cancel",
    response_model=ApiResponse[SyncTaskCreateData],
    summary="取消同步任务",
    description="取消一个待执行或正在执行的同步任务。需要管理员权限。",
    response_description="取消后的任务信息",
    responses={
        200: {
            "description": "任务取消成功",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "Sync task cancelled successfully",
                        "data": {
                            "task_id": 123,
                            "source": "gitlab",
                            "status": "cancelled"
                        }
                    }
                }
            }
        },
        400: {"description": "Task cannot be cancelled (may already be completed or failed)"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["path", "task_id"],
                                "msg": "ensure this value is greater than 0",
                                "type": "value_error.number.not_gt"
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Internal server error"},
    }
)
async def cancel_sync_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> ApiResponse[SyncTaskCreateData]:
    """Cancel a pending or running sync task.

    Args:
        task_id: ID of the task to cancel
        db: Database session
        current_user: Current authenticated admin user

    Returns:
        Updated task information

    Raises:
        HTTPException: If task not found or cannot be cancelled
    """
    try:
        task = await sync_task_service.cancel_task(db, task_id)

        return ApiResponse(
            code=200,
            message="Sync task cancelled successfully",
            data=SyncTaskCreateData(
                task_id=task.id,
                source=task.source_type,
                status=task.status
            )
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel sync task: {str(e)}",
        )


@router.post(
    "/tasks/{task_id}/trigger",
    response_model=ApiResponse[SyncTaskCreateData],
    status_code=status.HTTP_202_ACCEPTED,
    summary="触发同步任务",
    description="根据任务ID触发已存在的同步任务执行。根据任务的source_type调用对应的Celery任务。需要管理员权限。",
    response_description="同步任务触发成功",
    responses={
        202: {
            "description": "同步任务已触发",
            "content": {
                "application/json": {
                    "example": {
                        "code": 202,
                        "message": "Sync task triggered successfully.",
                        "data": {
                            "task_id": 123,
                            "source": "gitlab",
                            "status": "running"
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        404: {"description": "Task not found"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["path", "task_id"],
                                "msg": "ensure this value is greater than 0",
                                "type": "value_error.number.not_gt"
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Internal server error - unsupported source type"},
    }
)
async def trigger_sync_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> ApiResponse[SyncTaskCreateData]:
    """Trigger an existing sync task by ID.

    Retrieves the sync task by ID and triggers the corresponding Celery task
    based on the task's source_type (gitlab, trae, or zendao).

    Args:
        task_id: ID of the sync task to trigger
        db: Database session
        current_user: Current authenticated admin user

    Returns:
        Sync task trigger response with task_id and status

    Raises:
        HTTPException: If task not found (404) or source type is unsupported (500)
    """
    try:
        # Get the task from database
        task = await sync_task_service.get_task(db, task_id)

        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sync task {task_id} not found",
            )

        # Start the task (update status to running)
        task = await sync_task_service.start_task(db, task_id)

        # Trigger the appropriate Celery task based on source_type
        if task.source_type == "gitlab":
            sync_gitlab_commits.delay(project_id=task.project_id, task_id=task.id)
        elif task.source_type == "trae":
            sync_trae_token_usage.delay(task_id=task.id)
        elif task.source_type == "zendao":
            sync_zendao_bugs.delay(project_id=task.project_id, task_id=task.id)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unsupported source type: {task.source_type}",
            )

        logger.info(
            "Sync task triggered",
            task_id=task.id,
            source_type=task.source_type,
            triggered_by=current_user.username if current_user else None,
        )

        return ApiResponse(
            code=202,
            message="Sync task triggered successfully.",
            data=SyncTaskCreateData(
                task_id=task.id,
                source=task.source_type,
                status=task.status
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger sync task: {str(e)}",
        )


@router.get(
    "/tasks/{task_id}/logs",
    response_model=ApiResponse[SyncLogListResponse],
    summary="获取同步任务日志",
    description="获取指定同步任务的日志列表，支持分页和日志级别筛选。需要管理员权限。",
    response_description="同步任务日志列表",
    responses={
        200: {
            "description": "成功获取任务日志",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "Sync logs retrieved successfully",
                        "data": {
                            "items": [
                                {
                                    "id": 1,
                                    "task_id": 123,
                                    "level": "info",
                                    "message": "Starting GitLab sync for project 1",
                                    "details": {"project_id": 1},
                                    "created_at": "2026-03-31T10:00:00"
                                }
                            ],
                            "total": 100,
                            "page": 1,
                            "pageSize": 20
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        404: {"description": "Task not found"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["path", "task_id"],
                                "msg": "ensure this value is greater than 0",
                                "type": "value_error.number.not_gt"
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Internal server error"},
    }
)
async def get_sync_task_logs(
    task_id: int,
    page: int = Query(1, ge=1, description="Page number (1-indexed)", examples=[1]),
    pageSize: int = Query(20, ge=1, le=100, description="Number of results per page", examples=[20]),
    level: Optional[str] = Query(None, description="Filter by log level (debug, info, warning, error, critical)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> ApiResponse[SyncLogListResponse]:
    """Get sync logs for a specific task.

    Returns paginated list of sync logs for the specified task.

    Args:
        task_id: ID of the sync task
        page: Page number (1-indexed)
        pageSize: Number of results per page
        level: Optional log level filter
        db: Database session
        current_user: Current authenticated admin user

    Returns:
        Paginated list of sync logs for the task

    Raises:
        HTTPException: If task not found
    """
    try:
        # First check if task exists
        task = await sync_task_service.get_task(db, task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sync task {task_id} not found",
            )

        # Get logs for this task
        logs = await sync_log_service.list_logs(
            db=db,
            task_id=task_id,
            level=level,
            limit=pageSize,
            offset=(page - 1) * pageSize,
        )

        # Get total count
        total = await sync_log_service.count_logs(
            db=db,
            task_id=task_id,
            level=level,
        )

        return ApiResponse(
            code=200,
            message="Sync logs retrieved successfully",
            data=SyncLogListResponse(
                items=[SyncLogResponse.model_validate(log) for log in logs],
                total=total,
                page=page,
                pageSize=pageSize,
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sync task logs: {str(e)}",
        )


# Initialize services
sync_service = SyncService()
sync_task_service = SyncTaskService()
sync_log_service = SyncLogService()


@router.get(
    "/logs",
    response_model=ApiResponse[SyncLogListResponse],
    summary="获取同步日志列表",
    description="获取同步日志的分页列表，支持按任务ID和日志级别筛选。需要管理员权限。",
    response_description="同步日志列表",
    responses={
        200: {
            "description": "成功获取日志列表",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "Sync logs retrieved successfully",
                        "data": {
                            "items": [
                                {
                                    "id": 1,
                                    "task_id": 123,
                                    "level": "info",
                                    "message": "Starting GitLab sync for project 1",
                                    "details": {"project_id": 1},
                                    "created_at": "2026-03-31T10:00:00"
                                }
                            ],
                            "total": 100,
                            "page": 1,
                            "page_size": 20
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "page"],
                                "msg": "ensure this value is greater than or equal to 1",
                                "type": "value_error.number.not_ge"
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Internal server error"},
    }
)
async def list_sync_logs(
    page: int = Query(1, ge=1, description="Page number (1-indexed)", examples=[1]),
    pageSize: int = Query(20, ge=1, le=100, description="Number of results per page", examples=[20]),
    task_id: Optional[int] = Query(None, description="Filter by task ID"),
    level: Optional[str] = Query(None, description="Filter by log level (debug, info, warning, error, critical)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> ApiResponse[SyncLogListResponse]:
    """Get sync logs.

    Returns paginated list of sync logs with optional filtering.

    Args:
        page: Page number (1-indexed)
        page_size: Number of results per page
        task_id: Optional task ID filter
        level: Optional log level filter
        db: Database session
        current_user: Current authenticated admin user

    Returns:
        Paginated list of sync logs
    """
    try:
        # Get logs with filtering
        logs = await sync_log_service.list_logs(
            db=db,
            task_id=task_id,
            level=level,
            limit=pageSize,
            offset=(page - 1) * pageSize,
        )

        # Get total count
        total = await sync_log_service.count_logs(
            db=db,
            task_id=task_id,
            level=level,
        )

        return ApiResponse(
            code=200,
            message="Sync logs retrieved successfully",
            data=SyncLogListResponse(
                items=[SyncLogResponse.model_validate(log) for log in logs],
                total=total,
                page=page,
                pageSize=pageSize,
            )
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list sync logs: {str(e)}",
        )


@router.get(
    "/status",
    response_model=ApiResponse[dict],
    summary="获取同步系统状态",
    description="获取同步系统的整体状态，包括是否有运行中任务、最后同步时间和待处理任务数。需要管理员权限。",
    response_description="同步系统状态",
    responses={
        200: {
            "description": "成功获取同步状态",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "Sync status retrieved successfully",
                        "data": {
                            "isRunning": False,
                            "lastSyncAt": "2026-03-31T12:00:00",
                            "pendingTasks": 0
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        500: {"description": "Internal server error"},
    }
)
async def get_sync_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_permission),
) -> ApiResponse[dict]:
    """Get overall sync system status.

    Returns sync status with isRunning, lastSyncAt, and pendingTasks.

    Args:
        db: Database session
        current_user: Current authenticated admin user

    Returns:
        Sync system status summary
    """
    try:
        # Get running tasks
        running_tasks = await sync_task_service.list_tasks(
            db=db, status="running", limit=10
        )
        is_running = len(running_tasks) > 0

        # Get pending tasks
        pending_tasks_list = await sync_task_service.list_tasks(
            db=db, status="pending", limit=100
        )
        pending_tasks = len(pending_tasks_list)

        # Get last completed task for lastSyncAt
        completed_tasks = await sync_task_service.list_tasks(
            db=db, status="completed", limit=1
        )
        last_sync_at = None
        if completed_tasks:
            last_completed = completed_tasks[0]
            if last_completed.completed_at:
                last_sync_at = last_completed.completed_at.isoformat()
            elif last_completed.started_at:
                last_sync_at = last_completed.started_at.isoformat()

        return ApiResponse(
            code=200,
            message="Sync status retrieved successfully",
            data={
                "isRunning": is_running,
                "lastSyncAt": last_sync_at,
                "pendingTasks": pending_tasks,
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sync status: {str(e)}",
        )
