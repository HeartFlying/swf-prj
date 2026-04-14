"""Cache Management API routes.

Provides endpoints for managing cache, including clearing cache
and viewing cache statistics. Admin only.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import require_admin_permission
from app.db.models import User
from app.schemas.common import ApiResponse
from app.services.cache_service import CacheService, get_cache_service

router = APIRouter(tags=["cache"])


@router.get(
    "/stats",
    response_model=ApiResponse[dict],
    summary="获取缓存统计信息",
    description="获取缓存系统的统计信息，包括缓存键数量、命中率等。需要管理员权限。",
    response_description="缓存统计信息",
    responses={
        200: {
            "description": "成功获取缓存统计",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "enabled": True,
                            "keys_count": 150,
                            "stats_keys": 80,
                            "dashboard_keys": 40,
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
    }
)
async def get_cache_stats(
    current_user: User = Depends(require_admin_permission),
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[dict]:
    """Get cache statistics.

    Returns statistics about the cache system including key counts
    and cache status.

    Args:
        current_user: Current authenticated admin user
        cache_service: Cache service instance

    Returns:
        Cache statistics dictionary
    """
    stats = await cache_service.get_cache_stats()
    return ApiResponse(
        code=200,
        message="success",
        data=stats,
    )


@router.post(
    "/clear",
    response_model=ApiResponse[dict],
    summary="清除缓存",
    description="清除指定类型的缓存。支持清除所有缓存、用户缓存、项目缓存或统计缓存。需要管理员权限。",
    response_description="清除结果",
    responses={
        200: {
            "description": "缓存清除成功",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "Cache cleared successfully",
                        "data": {
                            "cleared_keys": 50,
                            "cache_type": "stats"
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        422: {
            "description": "Invalid cache type",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Invalid cache type. Must be one of: all, stats, user, project, dashboard, trend"
                    }
                }
            }
        },
    }
)
async def clear_cache(
    cache_type: str = Query("all", description="Type of cache to clear (all, stats, user, project, dashboard, trend). Defaults to 'all'."),
    user_id: int | None = Query(None, description="User ID (required when cache_type=user)"),
    project_id: int | None = Query(None, description="Project ID (required when cache_type=project)"),
    current_user: User = Depends(require_admin_permission),
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[dict]:
    """Clear cache by type.

    Clears specific types of cache based on the cache_type parameter.

    Args:
        cache_type: Type of cache to clear (all, stats, user, project, dashboard, trend). Defaults to 'all'.
        user_id: User ID (required for user cache type)
        project_id: Project ID (required for project cache type)
        current_user: Current authenticated admin user
        cache_service: Cache service instance

    Returns:
        Dictionary with number of cleared keys

    Raises:
        HTTPException: If cache_type is invalid or required parameters are missing
    """
    valid_types = ["all", "stats", "user", "project", "dashboard", "trend"]

    if cache_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid cache type. Must be one of: {', '.join(valid_types)}"
        )

    cleared_keys = 0

    if cache_type == "all":
        # Clear all cache types
        cleared_keys += await cache_service.clear_stats_cache()
        cleared_keys += await cache_service.clear_dashboard_cache()
        cleared_keys += await cache_service.clear_trend_cache()
    elif cache_type == "stats":
        cleared_keys = await cache_service.clear_stats_cache()
    elif cache_type == "user":
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="user_id is required when cache_type=user"
            )
        cleared_keys = await cache_service.clear_user_cache(user_id)
    elif cache_type == "project":
        if project_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="project_id is required when cache_type=project"
            )
        cleared_keys = await cache_service.clear_project_cache(project_id)
    elif cache_type == "dashboard":
        cleared_keys = await cache_service.clear_dashboard_cache()
    elif cache_type == "trend":
        cleared_keys = await cache_service.clear_trend_cache()

    return ApiResponse(
        code=200,
        message="Cache cleared successfully",
        data={
            "cleared_keys": cleared_keys,
            "cache_type": cache_type,
        }
    )


@router.post(
    "/clear-pattern",
    response_model=ApiResponse[dict],
    summary="按模式清除缓存",
    description="根据指定的键模式清除缓存。支持通配符 *。需要管理员权限。",
    response_description="清除结果",
    responses={
        200: {
            "description": "缓存清除成功",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "Cache cleared successfully",
                        "data": {
                            "cleared_keys": 10,
                            "pattern": "stats:user:123:*"
                        }
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - admin permission required"},
        422: {
            "description": "Invalid pattern",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Pattern is required"
                    }
                }
            }
        },
    }
)
async def clear_cache_by_pattern(
    pattern: str = Query(..., description="Cache key pattern to clear (supports wildcards *)"),
    current_user: User = Depends(require_admin_permission),
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[dict]:
    """Clear cache by key pattern.

    Clears cache entries matching the specified pattern.

    Args:
        pattern: Cache key pattern (e.g., "stats:user:123:*")
        current_user: Current authenticated admin user
        cache_service: Cache service instance

    Returns:
        Dictionary with number of cleared keys

    Raises:
        HTTPException: If pattern is empty
    """
    if not pattern:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Pattern is required"
        )

    cleared_keys = await cache_service.delete_pattern(pattern)

    return ApiResponse(
        code=200,
        message="Cache cleared successfully",
        data={
            "cleared_keys": cleared_keys,
            "pattern": pattern,
        }
    )


@router.get(
    "/health",
    response_model=ApiResponse[dict],
    summary="检查缓存服务健康状态",
    description="检查Redis缓存服务的连接状态。",
    response_description="缓存健康状态",
    responses={
        200: {
            "description": "缓存服务正常",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "Cache service is healthy",
                        "data": {
                            "status": "healthy",
                            "enabled": True
                        }
                    }
                }
            }
        },
        503: {
            "description": "缓存服务不可用",
            "content": {
                "application/json": {
                    "example": {
                        "code": 503,
                        "message": "Cache service is unavailable",
                        "data": {
                            "status": "unhealthy",
                            "enabled": False
                        }
                    }
                }
            }
        },
    }
)
async def cache_health(
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[dict]:
    """Check cache service health.

    Returns the health status of the cache service.

    Args:
        cache_service: Cache service instance

    Returns:
        Dictionary with cache health status
    """
    is_enabled = cache_service.is_enabled

    if not is_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": 503,
                "message": "Cache service is unavailable",
                "data": {
                    "status": "unhealthy",
                    "enabled": False,
                }
            }
        )

    return ApiResponse(
        code=200,
        message="Cache service is healthy",
        data={
            "status": "healthy",
            "enabled": True,
        }
    )
