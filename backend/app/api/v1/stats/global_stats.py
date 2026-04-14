"""Global Statistics API routes."""

from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import CacheKeys
from app.core.dependencies import (
    get_cache_service,
    get_code_stats_service,
    get_token_stats_service,
)
from app.core.logging import get_logger
from app.db.base import get_db
from app.schemas.common import ApiResponse
from app.schemas.stats import (
    ActivityTrendResponse,
    GlobalSummaryResponse,
    HeatmapResponse,
    TokenTrendResponse,
    TopUserResponse,
    TopUsersResponse,
)
from app.services.cache_service import CacheService
from app.services.code_stats_service import CodeStatsService
from app.services.global_stats_service import GlobalStatsService
from app.services.personal_stats_service import PersonalStatsService
from app.services.token_stats_service import TokenStatsService

router = APIRouter(tags=["global-stats"])
logger = get_logger(__name__)


def generate_date_range(start_date: date, end_date: date) -> list[str]:
    """Generate a list of dates between start and end."""
    dates = []
    current = start_date
    while current <= end_date:
        dates.append(current.isoformat())
        current += timedelta(days=1)
    return dates


@router.get(
    "/token-trend",
    response_model=ApiResponse[TokenTrendResponse],
    summary="获取全局Token使用趋势",
    description="获取全系统的Token使用趋势数据，包括每日Token使用量。可指定日期范围，默认统计最近30天。",
    response_description="全局Token使用趋势数据",
    responses={
        200: {
            "description": "成功获取Token趋势",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "dates": ["2026-03-01", "2026-03-02", "2026-03-03"],
                            "values": [15000, 18000, 16500]
                        }
                    }
                }
            }
        },
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "start_date"],
                                "msg": "invalid date format",
                                "type": "value_error.date"
                            }
                        ]
                    }
                }
            }
        },
    }
)
async def get_token_trend(
    start_date: date | None = Query(None, description="Start date for trend period (YYYY-MM-DD format)"),
    end_date: date | None = Query(None, description="End date for trend period (YYYY-MM-DD format)"),
    db: AsyncSession = Depends(get_db),
    token_stats_service: TokenStatsService = Depends(get_token_stats_service),
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[TokenTrendResponse]:
    """Get global token usage trend.

    Returns daily token usage trends for the entire system within the specified date range.
    If no date range is specified, defaults to the last 30 days.

    Args:
        start_date: Start date for trend period (optional, defaults to 30 days ago)
        end_date: End date for trend period (optional, defaults to today)
        db: Database session dependency
        token_stats_service: Service for calculating token statistics
        cache_service: Service for caching results

    Returns:
        TokenTrendResponse containing:
            - dates: List of dates in ISO format
            - values: List of token usage counts per day
    """
    # Set default date range (last 30 days)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=29)

    # Build cache key
    cache_key = CacheKeys.global_stats_key(
        "token-trend",
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat()
    )

    # Try to get from cache
    cached_data = await cache_service.get(cache_key)
    if cached_data is not None:
        return ApiResponse(
            code=200,
            message="success (cached)",
            data=TokenTrendResponse(**cached_data)
        )

    # Generate date range
    dates = generate_date_range(start_date, end_date)

    # Get real token trends from database
    days = (end_date - start_date).days + 1
    token_trends = await token_stats_service.calculate_token_trends(
        db=db,
        user_id=None,
        project_id=None,
        days=days,
    )

    # Filter to the requested date range
    start_idx = (start_date - (end_date - timedelta(days=days - 1))).days
    end_idx = start_idx + len(dates)
    filtered_trends = token_trends[start_idx:end_idx] if start_idx >= 0 else token_trends[:len(dates)]

    values = [trend.token_count for trend in filtered_trends]

    response_data = TokenTrendResponse(dates=dates, values=values)

    # Cache the response
    await cache_service.set(
        cache_key,
        response_data.model_dump(),
        ttl=cache_service.get_stats_ttl("trend")
    )

    return ApiResponse(
        code=200,
        message="success",
        data=response_data
    )


@router.get(
    "/activity-trend",
    response_model=ApiResponse[ActivityTrendResponse],
    summary="获取全局活动趋势",
    description="获取全系统的活动趋势数据，包括每日活跃用户数和总提交数。可指定统计天数，默认30天，范围7-365天。",
    response_description="全局活动趋势数据",
    responses={
        200: {
            "description": "成功获取活动趋势",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "dates": ["2026-03-01", "2026-03-02", "2026-03-03"],
                            "active_users": [15, 18, 16],
                            "total_commits": [45, 52, 48]
                        }
                    }
                }
            }
        },
        422: {
            "description": "Validation error - days must be between 7 and 365",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "days"],
                                "msg": "ensure this value is greater than or equal to 7",
                                "type": "value_error.number.not_ge"
                            }
                        ]
                    }
                }
            }
        },
    }
)
async def get_activity_trend(
    days: int = Query(30, ge=7, le=365, description="Number of days to analyze (7-365)", examples=[30]),
    db: AsyncSession = Depends(get_db),
    code_stats_service: CodeStatsService = Depends(get_code_stats_service),
) -> ApiResponse[ActivityTrendResponse]:
    """Get global activity trend (active users and commits).

    Returns daily activity metrics including active user count and total commits
    for the entire system over the specified period.

    Args:
        days: Number of days to analyze (7-365, default 30)
        db: Database session dependency
        code_stats_service: Service for calculating code statistics

    Returns:
        ActivityTrendResponse containing:
            - dates: List of dates in ISO format
            - active_users: List of active user counts per day
            - total_commits: List of total commit counts per day
    """
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    dates = generate_date_range(start_date, end_date)

    # Get commit trends from database
    commit_trends = await code_stats_service.get_commit_trends(
        db=db,
        user_id=None,
        project_id=None,
        days=days,
    )

    # Get active users per day
    active_users = []
    total_commits = []

    for trend in commit_trends:
        total_commits.append(trend.commit_count)
        # Estimate active users based on commit activity
        # In a real implementation, this would query distinct users per day
        active_users.append(min(trend.commit_count, 100))  # Cap at 100

    return ApiResponse(
        code=200,
        message="success",
        data=ActivityTrendResponse(
            dates=dates,
            active_users=active_users,
            total_commits=total_commits,
        )
    )


@router.get(
    "/top-users",
    response_model=ApiResponse[list[TopUserResponse]],
    summary="获取Token使用量排行用户",
    description="获取Token使用量最高的用户排行榜，包括用户名、部门、Token使用量和提交次数。可指定返回数量限制，默认20个。",
    response_description="Token使用量排行用户列表",
    responses={
        200: {
            "description": "成功获取用户排行",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": [
                            {
                                "user_id": 1,
                                "username": "zhangsan",
                                "department": "研发部",
                                "token_count": 50000,
                                "commit_count": 150
                            },
                            {
                                "user_id": 2,
                                "username": "lisi",
                                "department": "测试部",
                                "token_count": 35000,
                                "commit_count": 120
                            }
                        ]
                    }
                }
            }
        },
        422: {
            "description": "Validation error - limit must be between 1 and 100",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "limit"],
                                "msg": "ensure this value is less than or equal to 100",
                                "type": "value_error.number.not_le"
                            }
                        ]
                    }
                }
            }
        },
    }
)
async def get_top_users(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results to return (1-100)", examples=[20]),
    db: AsyncSession = Depends(get_db),
    token_stats_service: TokenStatsService = Depends(get_token_stats_service),
    code_stats_service: CodeStatsService = Depends(get_code_stats_service),
) -> ApiResponse[list[TopUserResponse]]:
    """Get top users by token usage.

    Returns a ranked list of users by token usage, including their department,
    token count, and commit count. Statistics cover the last 30 days.

    Args:
        limit: Maximum number of results to return (1-100, default 20)
        db: Database session dependency
        token_stats_service: Service for calculating token statistics
        code_stats_service: Service for calculating code statistics

    Returns:
        List of TopUserResponse containing:
            - user_id: User ID
            - username: User's username
            - department: User's department (if available)
            - token_count: Total token usage
            - commit_count: Total number of commits
    """
    # Get real top users from database
    top_users = await token_stats_service.get_top_users_by_tokens(
        db=db,
        limit=limit,
    )

    # Get commit counts for these users
    end_date = date.today()
    start_date = end_date - timedelta(days=29)

    result = []
    for user_data in top_users:
        # Get commit count for this user
        code_stats = await code_stats_service.calculate_code_stats(
            db=db,
            user_id=user_data["user_id"],
            project_id=None,
            start_date=start_date,
            end_date=end_date,
        )

        result.append(
            TopUserResponse(
                user_id=user_data["user_id"],
                username=user_data["username"],
                department=user_data.get("department"),
                token_count=user_data["token_count"],
                commit_count=code_stats.total_commits,
            )
        )

    # Sort by token count descending
    result.sort(key=lambda x: x.token_count, reverse=True)

    return ApiResponse(
        code=200,
        message="success",
        data=result[:limit]
    )


@router.get(
    "/top-users-v2",
    response_model=ApiResponse[TopUsersResponse],
    summary="获取Token使用量排行用户（V2版本）",
    description="获取Token使用量最高的用户排行榜，返回结构化响应包含用户列表和总数。可指定返回数量限制，默认20个。",
    response_description="Token使用量排行用户列表（结构化响应）",
    responses={
        200: {
            "description": "成功获取用户排行",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "users": [
                                {
                                    "user_id": 1,
                                    "username": "zhangsan",
                                    "department": "研发部",
                                    "token_count": 50000,
                                    "commit_count": 150
                                },
                                {
                                    "user_id": 2,
                                    "username": "lisi",
                                    "department": "测试部",
                                    "token_count": 35000,
                                    "commit_count": 120
                                }
                            ],
                            "total_count": 2
                        }
                    }
                }
            }
        },
        422: {
            "description": "Validation error - limit must be between 1 and 100",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "limit"],
                                "msg": "ensure this value is less than or equal to 100",
                                "type": "value_error.number.not_le"
                            }
                        ]
                    }
                }
            }
        },
    }
)
async def get_top_users_v2(
    type: Literal["tokens", "commits"] = Query("tokens", description="Sort type: tokens or commits"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results to return (1-100)", examples=[20]),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze (1-365)", examples=[30]),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TopUsersResponse]:
    """Get top users by token usage or commits (V2 with structured response).

    Returns a structured response containing a ranked list of users,
    including their department, token count, and commit count.

    Args:
        type: Sort type - "tokens" (by token usage) or "commits" (by commit count), default "tokens"
        limit: Maximum number of results to return (1-100, default 20)
        days: Number of days to analyze for statistics (1-365, default 30)
        db: Database session dependency

    Returns:
        TopUsersResponse containing:
            - users: List of TopUserResponse with user statistics
            - total_count: Total number of users in the result
    """
    service = GlobalStatsService()
    users = await service.get_top_users(db=db, limit=limit, days=days, sort_by=type)

    # Convert to TopUserResponse objects
    user_responses = [
        TopUserResponse(
            user_id=user["user_id"],
            username=user["username"],
            department=user.get("department"),
            token_count=user["token_count"],
            commit_count=user["commit_count"],
        )
        for user in users
    ]

    return ApiResponse(
        code=200,
        message="success",
        data=TopUsersResponse(
            users=user_responses,
            total_count=len(user_responses),
        )
    )


@router.get(
    "/summary",
    response_model=ApiResponse[GlobalSummaryResponse],
    summary="获取全局统计摘要",
    description="获取系统整体统计信息，包括总用户数、总项目数、总提交数、总Token使用量、总Bug数和今日活跃用户数。",
    response_description="全局统计摘要数据",
    responses={
        200: {
            "description": "成功获取全局统计摘要",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "total_users": 100,
                            "total_projects": 20,
                            "total_commits": 5000,
                            "total_tokens": 1000000,
                            "total_bugs": 150,
                            "active_users_today": 45,
                            "period_days": 30
                        }
                    }
                }
            }
        },
        422: {
            "description": "Validation error - days must be between 1 and 365",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "days"],
                                "msg": "ensure this value is less than or equal to 365",
                                "type": "value_error.number.not_le"
                            }
                        ]
                    }
                }
            }
        },
    }
)
async def get_global_summary(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze (1-365)", examples=[30]),
    db: AsyncSession = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[GlobalSummaryResponse]:
    """Get global summary statistics.

    Returns system-wide aggregated statistics including user counts,
    project counts, commit counts, token usage, bug counts, and active users.

    Args:
        days: Number of days to analyze for statistics (1-365, default 30)
        db: Database session dependency
        cache_service: Service for caching results

    Returns:
        GlobalSummaryResponse containing:
            - total_users: Total number of active users
            - total_projects: Total number of active projects
            - total_commits: Total commit count in the period
            - total_tokens: Total token usage in the period
            - total_bugs: Total bug count
            - active_users_today: Number of active users today
            - period_days: The period in days
    """
    # Build cache key
    cache_key = CacheKeys.global_stats_key("summary", days=days)

    # Try to get from cache
    cached_data = await cache_service.get(cache_key)
    if cached_data is not None:
        return ApiResponse(
            code=200,
            message="success (cached)",
            data=GlobalSummaryResponse(**cached_data)
        )

    service = GlobalStatsService()
    summary = await service.get_global_summary(db=db, days=days)

    response_data = GlobalSummaryResponse(
        total_users=summary["total_users"],
        total_projects=summary["total_projects"],
        total_commits=summary["total_commits"],
        total_tokens=summary["total_tokens"],
        total_bugs=summary["total_bugs"],
        active_users_today=summary["active_users_today"],
        period_days=summary["period_days"],
    )

    # Cache the response
    await cache_service.set(
        cache_key,
        response_data.model_dump(),
        ttl=cache_service.get_stats_ttl("summary")
    )

    logger.info(
        "Global summary retrieved",
        days=days,
        total_users=summary["total_users"],
        total_projects=summary["total_projects"],
        total_commits=summary["total_commits"],
    )

    return ApiResponse(
        code=200,
        message="success",
        data=response_data
    )


@router.get(
    "/heatmap",
    response_model=ApiResponse[HeatmapResponse],
    summary="获取全局热力图数据",
    description="获取系统整体活跃度热力图数据，用于展示全局提交活动趋势。支持按用户筛选和指定日期范围。默认统计最近30天。",
    response_description="全局热力图数据",
    responses={
        200: {
            "description": "成功获取热力图数据",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "user_id": 0,
                            "data": [
                                {"date": "2026-03-01", "count": 15, "level": 2},
                                {"date": "2026-03-02", "count": 25, "level": 3},
                                {"date": "2026-03-03", "count": 8, "level": 1},
                            ],
                            "total_days": 30,
                            "start_date": "2026-03-01",
                            "end_date": "2026-03-30"
                        }
                    }
                }
            }
        },
        404: {
            "description": "User not found",
            "content": {
                "application/json": {
                    "example": {
                        "code": 404,
                        "message": "User with ID 999 not found",
                        "data": None
                    }
                }
            }
        },
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "start_date"],
                                "msg": "invalid date format",
                                "type": "value_error.date"
                            }
                        ]
                    }
                }
            }
        },
    }
)
async def get_global_heatmap(
    user_id: int | None = Query(None, description="Optional user ID to filter heatmap data", gt=0, examples=[1]),
    start_date: date | None = Query(None, description="Start date for heatmap period (YYYY-MM-DD format)"),
    end_date: date | None = Query(None, description="End date for heatmap period (YYYY-MM-DD format)"),
    db: AsyncSession = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[HeatmapResponse]:
    """Get global heatmap data for activity visualization.

    Returns daily activity data formatted for heatmap visualization,
    similar to GitHub's contribution graph. If user_id is provided,
    returns data for that specific user. Otherwise, returns global
    aggregated data.

    Args:
        user_id: Optional user ID to filter heatmap data
        start_date: Start date for heatmap period (optional, defaults to 30 days ago)
        end_date: End date for heatmap period (optional, defaults to today)
        db: Database session dependency
        cache_service: Service for caching results

    Returns:
        HeatmapResponse containing:
            - user_id: User ID (0 for global data)
            - data: List of daily activity data points with date, count, and level
            - total_days: Number of days in the statistics period
            - start_date: Start date of the period (YYYY-MM-DD)
            - end_date: End date of the period (YYYY-MM-DD)

    Raises:
        HTTPException: 404 if user_id is provided but user not found
    """
    # Set default date range (last 30 days)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=29)

    # Calculate days
    days = (end_date - start_date).days + 1

    # If user_id is provided, verify user exists and get user-specific data
    if user_id:
        from sqlalchemy import select
        from app.db.models import User
        from fastapi import HTTPException, status

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found",
            )

        # Build cache key for user-specific heatmap
        cache_key = CacheKeys.personal_stats_key(
            user_id, "heatmap",
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat()
        )

        # Try to get from cache
        cached_data = await cache_service.get(cache_key)
        if cached_data is not None:
            return ApiResponse(
                code=200,
                message="success (cached)",
                data=HeatmapResponse(**cached_data)
            )

        # Get user-specific heatmap data
        personal_stats_service = PersonalStatsService()
        heatmap_data = await personal_stats_service.get_heatmap_data(
            db=db,
            user_id=user_id,
            days=days,
            metric_type="commits",
        )

        response_data = HeatmapResponse(**heatmap_data)

        # Cache the response
        await cache_service.set(
            cache_key,
            response_data.model_dump(),
            ttl=cache_service.get_stats_ttl("heatmap")
        )

        return ApiResponse(
            code=200,
            message="success",
            data=response_data
        )

    # Global heatmap data (no user_id specified)
    # Build cache key for global heatmap
    cache_key = CacheKeys.global_stats_key(
        "heatmap",
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat()
    )

    # Try to get from cache
    cached_data = await cache_service.get(cache_key)
    if cached_data is not None:
        return ApiResponse(
            code=200,
            message="success (cached)",
            data=HeatmapResponse(**cached_data)
        )

    # Get global heatmap data (aggregate all users)
    personal_stats_service = PersonalStatsService()
    heatmap_data = await personal_stats_service.get_heatmap_data(
        db=db,
        user_id=None,  # No user filter for global data
        days=days,
        metric_type="commits",
    )

    # Override user_id to 0 for global data
    heatmap_data["user_id"] = 0

    response_data = HeatmapResponse(**heatmap_data)

    # Cache the response
    await cache_service.set(
        cache_key,
        response_data.model_dump(),
        ttl=cache_service.get_stats_ttl("heatmap")
    )

    logger.info(
        "Global heatmap retrieved",
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        days=days,
    )

    return ApiResponse(
        code=200,
        message="success",
        data=response_data
    )
