"""Personal Statistics API routes."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import CacheKeys
from app.core.dependencies import (
    get_bug_stats_service,
    get_cache_service,
    get_code_stats_service,
    get_current_active_user,
    get_token_stats_service,
)
from app.core.logging import get_logger
from app.db.base import get_db
from app.db.models import Project, User
from app.schemas.common import ApiResponse
from app.schemas.stats import (
    ActivityHourData,
    HeatmapResponse,
    LanguageStat,
    PersonalBugRateResponse,
    PersonalCodeStatsResponse,
    PersonalDashboardResponse,
    PersonalTokenStatsResponse,
    RankingInfo,
    TodayStats,
    WeeklyTrend,
)
from app.services.bug_stats_service import BugStatsService
from app.services.cache_service import CacheService
from app.services.code_stats_service import CodeStatsService
from app.services.personal_stats_service import PersonalStatsService
from app.services.token_stats_service import TokenStatsService

router = APIRouter(tags=["personal-stats"])
logger = get_logger(__name__)


def generate_date_range(start_date: date, end_date: date) -> list[str]:
    """Generate a list of dates between start and end."""
    dates = []
    current = start_date
    while current <= end_date:
        dates.append(current.isoformat())
        current += timedelta(days=1)
    return dates


async def verify_user_exists(user_id: int, db: AsyncSession) -> User:
    """Verify user exists and return it."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    return user


def verify_user_access(current_user: User, target_user_id: int) -> None:
    """Verify that current user can access target user's data.

    Users can only access their own data unless they are admin.

    Args:
        current_user: The currently authenticated user.
        target_user_id: The user ID being accessed.

    Raises:
        HTTPException: 403 if user cannot access the target user's data.
    """
    # Import here to avoid circular imports
    from app.core.dependencies import is_admin

    # Allow access if user is accessing their own data
    if current_user.id == target_user_id:
        return

    # Allow access if user is admin
    if is_admin(current_user):
        return

    # Otherwise, deny access
    logger.warning(
        f"Access denied: user {current_user.id} attempted to access user {target_user_id}'s data"
    )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You can only access your own personal statistics",
    )


@router.get(
    "/dashboard",
    response_model=ApiResponse[PersonalDashboardResponse],
    summary="获取个人仪表板统计",
    description="获取用户仪表板的综合统计数据，包括代码统计汇总、Token使用汇总和Bug统计汇总。默认统计最近30天的数据。",
    response_description="个人仪表板统计数据",
    responses={
        200: {
            "description": "成功获取个人仪表板数据",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "user_id": 1,
                            "username": "zhangsan",
                            "code_summary": {
                                "total_commits": 42,
                                "lines_added": 1250,
                                "lines_deleted": 320
                            },
                            "token_summary": {
                                "total_tokens": 15000
                            },
                            "bug_summary": {
                                "total_bugs": 5,
                                "resolved_bugs": 3,
                                "critical_bugs": 1
                            },
                            "period_days": 30,
                            "start_date": "2026-03-01",
                            "end_date": "2026-03-31"
                        }
                    }
                }
            }
        },
        404: {"description": "User not found"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "user_id"],
                                "msg": "ensure this value is greater than 0",
                                "type": "value_error.number.not_gt"
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Internal server error"}
    }
)
async def get_personal_dashboard(
    user_id: int | None = Query(None, description="User ID (optional, defaults to current user)", gt=0, examples=[1]),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    code_stats_service: CodeStatsService = Depends(get_code_stats_service),
    token_stats_service: TokenStatsService = Depends(get_token_stats_service),
    bug_stats_service: BugStatsService = Depends(get_bug_stats_service),
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[PersonalDashboardResponse]:
    """Get personal dashboard statistics.

    This endpoint returns comprehensive statistics for the user's dashboard
    including code summary, token usage summary, and bug summary for the
    last 30 days by default.

    Args:
        user_id: User ID (optional, defaults to current user)
        current_user: Current authenticated user
        db: Database session dependency
        code_stats_service: Service for calculating code statistics
        token_stats_service: Service for calculating token usage statistics
        bug_stats_service: Service for calculating bug statistics
        cache_service: Service for caching results

    Returns:
        PersonalDashboardResponse containing:
            - user_id: User ID
            - username: User's username
            - code_summary: Dict with total_commits, lines_added, lines_deleted
            - token_summary: Dict with total_tokens
            - bug_summary: Dict with total_bugs, resolved_bugs, critical_bugs
            - period_days: Number of days in the statistics period
            - start_date: Start date of the period
            - end_date: End date of the period

    Raises:
        HTTPException: 403 if user tries to access other user's data
        HTTPException: 404 if user not found
    """
    # Use current user's ID if not specified
    target_user_id = user_id or current_user.id

    # Verify target user exists first (before access check to return 404 for non-existent users)
    # Only verify if user_id was explicitly provided (not using current user)
    if user_id is not None:
        await verify_user_exists(target_user_id, db)

    # Skip access check if accessing own data
    if user_id and user_id != current_user.id:
        verify_user_access(current_user, user_id)


    # Set default date range (last 30 days)
    end_date = date.today()
    start_date = end_date - timedelta(days=29)
    period_days = 30

    # Build cache key
    cache_key = CacheKeys.personal_stats_key(
        target_user_id, "dashboard",
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat()
    )

    # Try to get from cache
    cached_data = await cache_service.get(cache_key)
    if cached_data is not None:
        return ApiResponse(
            code=200,
            message="success (cached)",
            data=PersonalDashboardResponse(**cached_data)
        )

    # Get code statistics
    code_stats = await code_stats_service.calculate_code_stats(
        db=db,
        user_id=target_user_id,
        project_id=None,
        start_date=start_date,
        end_date=end_date,
    )

    # Get token usage statistics
    token_summary = await token_stats_service.get_user_token_usage(
        db=db,
        user_id=target_user_id,
        start_date=start_date,
        end_date=end_date,
    )

    # Get bug statistics
    bug_stats = await bug_stats_service.get_bug_stats_by_user(
        db=db,
        user_id=target_user_id,
        start_date=start_date,
        end_date=end_date,
    )

    # Get heatmap data
    personal_stats_service = PersonalStatsService()
    heatmap_data = await personal_stats_service.get_heatmap_data(
        db=db,
        user_id=target_user_id,
        days=period_days,
        metric_type="commits",
    )

    # Build response matching frontend expected structure
    # Calculate today's stats (last day in the period)
    today_code_stats = await code_stats_service.calculate_code_stats(
        db=db,
        user_id=target_user_id,
        project_id=None,
        start_date=end_date,
        end_date=end_date,
    )
    today_token_summary = await token_stats_service.get_user_token_usage(
        db=db,
        user_id=target_user_id,
        start_date=end_date,
        end_date=end_date,
    )

    today_stats = TodayStats(
        commits=today_code_stats.total_commits,
        additions=today_code_stats.total_additions,
        deletions=today_code_stats.total_deletions,
        tokens=today_token_summary.total_tokens,
        sessions=0,  # TODO: Get from session stats service
    )

    # Build weekly trend data
    weekly_dates = generate_date_range(start_date, end_date)
    commit_trends = await code_stats_service.get_commit_trends(
        db=db,
        user_id=target_user_id,
        project_id=None,
        days=period_days,
    )
    token_trends = await token_stats_service.calculate_token_trends(
        db=db,
        user_id=target_user_id,
        project_id=None,
        days=period_days,
    )

    weekly_trend = WeeklyTrend(
        dates=weekly_dates,
        commits=[trend.commit_count for trend in commit_trends[-len(weekly_dates):]],
        tokens=[trend.token_count for trend in token_trends[-len(weekly_dates):]],
    )

    # Build language stats (placeholder - would need actual language data)
    language_stats: list[LanguageStat] = []

    # Build heatmap data
    heatmap_points = [
        {"date": point["date"], "count": point["count"], "level": point["level"]}
        for point in heatmap_data.get("data", [])
    ]

    # Build ranking info
    ranking = RankingInfo(
        commits=code_stats.total_commits,
        total_users=100,  # TODO: Get actual total users count
    )

    response_data = PersonalDashboardResponse(
        today_stats=today_stats,
        weekly_trend=weekly_trend,
        language_stats=language_stats,
        heatmap_data=heatmap_points,
        ranking=ranking,
    )

    # Cache the response (use dict for cache, not serialized)
    await cache_service.set(
        cache_key,
        response_data.model_dump(by_alias=True),
        ttl=cache_service.get_stats_ttl("dashboard")
    )

    logger.info(
        "Personal dashboard retrieved",
        user_id=target_user_id,
        username=current_user.username,
        period_days=period_days,
    )

    # Return the response - FastAPI will handle serialization via response_model
    return ApiResponse(
        code=200,
        message="success",
        data=response_data
    )


@router.get(
    "/code",
    response_model=ApiResponse[PersonalCodeStatsResponse],
    summary="获取个人代码统计",
    description="获取指定用户在日期范围内的代码提交统计信息，包括总提交数、新增/删除代码行数、日均提交数等。默认统计最近30天。",
    response_description="个人代码统计数据",
    responses={
        200: {
            "description": "成功获取代码统计",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "total_commits": 42,
                            "total_prs": 0,
                            "lines_added": 1250,
                            "lines_deleted": 320,
                            "avg_commits_per_day": 1.4
                        }
                    }
                }
            }
        },
        404: {"description": "User not found"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "user_id"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        },
    }
)
async def get_personal_code_stats(
    user_id: int | None = Query(None, description="User ID (optional, defaults to current user)", gt=0, examples=[1]),
    current_user: User = Depends(get_current_active_user),
    start_date: date | None = Query(None, description="Start date (YYYY-MM-DD format)"),
    end_date: date | None = Query(None, description="End date (YYYY-MM-DD format)"),
    db: AsyncSession = Depends(get_db),
    code_stats_service: CodeStatsService = Depends(get_code_stats_service),
) -> ApiResponse[PersonalCodeStatsResponse]:
    """Get personal code statistics.

    Returns code commit statistics for the specified user within the date range,
    including total commits, lines added/deleted, and average commits per day.
    If no date range is specified, defaults to the last 30 days.

    Args:
        user_id: User ID (optional, defaults to current user)
        current_user: Current authenticated user
        start_date: Start date for statistics period (optional, defaults to 30 days ago)
        end_date: End date for statistics period (optional, defaults to today)
        db: Database session dependency
        code_stats_service: Service for calculating code statistics

    Returns:
        PersonalCodeStatsResponse containing:
            - total_commits: Total number of commits
            - total_prs: Total number of pull requests (currently 0)
            - lines_added: Total lines of code added
            - lines_deleted: Total lines of code deleted
            - avg_commits_per_day: Average commits per day

    Raises:
        HTTPException: 403 if user tries to access other user's data
        HTTPException: 404 if user not found
    """
    # Use current user's ID if not specified
    target_user_id = user_id or current_user.id

    # Verify target user exists first (before access check to return 404 for non-existent users)
    # Only verify if user_id was explicitly provided (not using current user)
    if user_id is not None:
        await verify_user_exists(target_user_id, db)

    # Skip access check if accessing own data
    if user_id and user_id != current_user.id:
        verify_user_access(current_user, user_id)

    # Set default date range (last 30 days)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=29)

    # Calculate days difference
    days_diff = (end_date - start_date).days + 1

    # Get real statistics from database
    stats = await code_stats_service.calculate_code_stats(
        db=db,
        user_id=target_user_id,
        project_id=None,
        start_date=start_date,
        end_date=end_date,
    )

    # Calculate average commits per day
    avg_commits_per_day = round(stats.total_commits / days_diff, 2) if days_diff > 0 else 0.0

    return ApiResponse(
        code=200,
        message="success",
        data=PersonalCodeStatsResponse(
            total_commits=stats.total_commits,
            total_prs=0,  # PR data not tracked in current model
            lines_added=stats.total_additions,
            lines_deleted=stats.total_deletions,
            avg_commits_per_day=avg_commits_per_day,
        )
    )


@router.get(
    "/tokens",
    response_model=ApiResponse[PersonalTokenStatsResponse],
    summary="获取个人Token使用统计",
    description="获取指定用户在日期范围内的Token使用统计信息，包括总Token使用量、Prompt/Completion Token使用量、日均使用量等。默认统计最近30天。",
    response_description="个人Token使用统计数据",
    responses={
        200: {
            "description": "成功获取Token使用统计",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "total_tokens": 15000,
                            "prompt_tokens": 9000,
                            "completion_tokens": 6000,
                            "avg_tokens_per_day": 500.0
                        }
                    }
                }
            }
        },
        404: {"description": "User not found"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "user_id"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        },
    }
)
async def get_personal_token_stats(
    user_id: int | None = Query(None, description="User ID (optional, defaults to current user)", gt=0, examples=[1]),
    current_user: User = Depends(get_current_active_user),
    start_date: date | None = Query(None, description="Start date (YYYY-MM-DD format)"),
    end_date: date | None = Query(None, description="End date (YYYY-MM-DD format)"),
    db: AsyncSession = Depends(get_db),
    token_stats_service: TokenStatsService = Depends(get_token_stats_service),
) -> ApiResponse[PersonalTokenStatsResponse]:
    """Get personal token usage statistics.

    Returns token usage statistics for the specified user within the date range,
    including total tokens, prompt/completion breakdown, and daily average.
    If no date range is specified, defaults to the last 30 days.

    Args:
        user_id: User ID (optional, defaults to current user)
        current_user: Current authenticated user
        start_date: Start date for statistics period (optional, defaults to 30 days ago)
        end_date: End date for statistics period (optional, defaults to today)
        db: Database session dependency
        token_stats_service: Service for calculating token statistics

    Returns:
        PersonalTokenStatsResponse containing:
            - total_tokens: Total token usage
            - prompt_tokens: Prompt token usage (estimated as 60% of total)
            - completion_tokens: Completion token usage (estimated as 40% of total)
            - avg_tokens_per_day: Average tokens used per day

    Raises:
        HTTPException: 403 if user tries to access other user's data
        HTTPException: 404 if user not found
    """
    # Use current user's ID if not specified
    target_user_id = user_id or current_user.id

    # Verify target user exists first (before access check to return 404 for non-existent users)
    # Only verify if user_id was explicitly provided (not using current user)
    if user_id is not None:
        await verify_user_exists(target_user_id, db)

    # Skip access check if accessing own data
    if user_id and user_id != current_user.id:
        verify_user_access(current_user, user_id)

    # Set default date range (last 30 days)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=29)

    # Calculate days difference
    days_diff = (end_date - start_date).days + 1

    # Get real token usage from database
    token_summary = await token_stats_service.get_user_token_usage(
        db=db,
        user_id=target_user_id,
        start_date=start_date,
        end_date=end_date,
    )

    # Split total tokens into prompt/completion (60/40 split as estimate)
    total_tokens = token_summary.total_tokens
    prompt_tokens = int(total_tokens * 0.6)
    completion_tokens = total_tokens - prompt_tokens

    # Calculate average tokens per day
    avg_tokens_per_day = round(total_tokens / days_diff, 2) if days_diff > 0 else 0.0

    return ApiResponse(
        code=200,
        message="success",
        data=PersonalTokenStatsResponse(
            total_tokens=total_tokens,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            avg_tokens_per_day=avg_tokens_per_day,
        )
    )


@router.get(
    "/bugs",
    response_model=ApiResponse[PersonalBugRateResponse],
    summary="获取个人Bug率统计",
    description="获取指定用户的Bug统计数据，包括Bug总数、严重Bug数、Bug率（每1000行代码的Bug数）、已解决Bug数。可指定项目筛选，默认统计最近30天。",
    response_description="个人Bug率统计数据",
    responses={
        200: {
            "description": "成功获取Bug统计",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "total_bugs": 5,
                            "critical_bugs": 1,
                            "bug_rate": 4.0,
                            "resolved_bugs": 3
                        }
                    }
                }
            }
        },
        404: {"description": "User or project not found"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "user_id"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        },
    }
)
async def get_personal_bug_rate(
    user_id: int | None = Query(None, description="User ID (optional, defaults to current user)", gt=0, examples=[1]),
    current_user: User = Depends(get_current_active_user),
    project_id: int | None = Query(None, description="Optional project ID to filter bugs by specific project", gt=0, examples=[1]),
    start_date: date | None = Query(None, description="Start date (YYYY-MM-DD format)"),
    end_date: date | None = Query(None, description="End date (YYYY-MM-DD format)"),
    db: AsyncSession = Depends(get_db),
    bug_stats_service: BugStatsService = Depends(get_bug_stats_service),
    code_stats_service: CodeStatsService = Depends(get_code_stats_service),
) -> ApiResponse[PersonalBugRateResponse]:
    """Get personal bug rate statistics.

    Returns bug statistics for the specified user, including total bugs,
    critical bugs, bug rate (bugs per 1000 lines of code), and resolved bugs.
    Optionally filter by project and date range. Statistics cover the last 30 days by default.

    Args:
        user_id: User ID (optional, defaults to current user)
        current_user: Current authenticated user
        project_id: Optional project ID to filter bugs by specific project
        start_date: Start date for statistics period (optional, defaults to 30 days ago)
        end_date: End date for statistics period (optional, defaults to today)
        db: Database session dependency
        bug_stats_service: Service for calculating bug statistics
        code_stats_service: Service for calculating code statistics (used for bug rate)

    Returns:
        PersonalBugRateResponse containing:
            - total_bugs: Total number of bugs
            - critical_bugs: Number of critical severity bugs
            - bug_rate: Bugs per 1000 lines of code
            - resolved_bugs: Number of resolved bugs

    Raises:
        HTTPException: 403 if user tries to access other user's data
        HTTPException: 404 if user or project not found
    """
    # Use current user's ID if not specified
    target_user_id = user_id or current_user.id

    # Verify target user exists first (before access check to return 404 for non-existent users)
    # Only verify if user_id was explicitly provided (not using current user)
    if user_id is not None:
        await verify_user_exists(target_user_id, db)

    # Skip access check if accessing own data
    if user_id and user_id != current_user.id:
        verify_user_access(current_user, user_id)

    # If project_id is provided, verify project exists
    if project_id:
        project_result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        if not project_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID {project_id} not found",
            )

    # Set default date range (last 30 days) if not provided
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=29)

    bug_stats = await bug_stats_service.get_bug_stats_by_user(
        db=db,
        user_id=target_user_id,
        start_date=start_date,
        end_date=end_date,
    )

    # Calculate bug rate (bugs per 1000 lines of code)
    # Estimate lines of code from commits (assuming 100 lines per commit on average)
    code_stats = await code_stats_service.calculate_code_stats(
        db=db,
        user_id=target_user_id,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
    )

    estimated_lines = code_stats.total_additions
    bug_rate = (
        round((bug_stats.total_bugs / estimated_lines) * 1000, 2)
        if estimated_lines > 0
        else 0.0
    )

    return ApiResponse(
        code=200,
        message="success",
        data=PersonalBugRateResponse(
            total_bugs=bug_stats.total_bugs,
            critical_bugs=bug_stats.critical_bugs,
            bug_rate=bug_rate,
            resolved_bugs=bug_stats.resolved_bugs,
        )
    )


@router.get(
    "/heatmap",
    response_model=ApiResponse[HeatmapResponse],
    summary="获取个人提交热力图数据",
    description="获取用户提交记录的热力图数据，用于展示用户在指定时间段内的活跃度。支持按提交数或Token使用量统计。默认统计最近30天。",
    response_description="个人热力图数据",
    responses={
        200: {
            "description": "成功获取热力图数据",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "user_id": 1,
                            "data": [
                                {"date": "2026-03-01", "count": 3, "level": 1},
                                {"date": "2026-03-02", "count": 8, "level": 3},
                                {"date": "2026-03-03", "count": 0, "level": 0},
                            ],
                            "total_days": 30,
                            "start_date": "2026-03-01",
                            "end_date": "2026-03-30"
                        }
                    }
                }
            }
        },
        404: {"description": "User not found"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "user_id"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        },
    }
)
async def get_personal_heatmap(
    user_id: int | None = Query(None, description="User ID (optional, defaults to current user)", gt=0, examples=[1]),
    current_user: User = Depends(get_current_active_user),
    days: int = Query(30, description="Number of days to analyze (default: 30)", ge=1, le=365, examples=[30]),
    metric_type: str = Query("commits", description="Metric type for heatmap (commits or tokens)", examples=["commits"]),
    db: AsyncSession = Depends(get_db),
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[HeatmapResponse]:
    """Get personal heatmap data for activity visualization.

    Returns daily activity data formatted for heatmap visualization,
    similar to GitHub's contribution graph.

    Args:
        user_id: User ID (optional, defaults to current user)
        current_user: Current authenticated user
        days: Number of days to analyze (default: 30, max: 365)
        metric_type: Type of metric to visualize ("commits" or "tokens")
        db: Database session dependency
        cache_service: Service for caching results

    Returns:
        HeatmapResponse containing:
            - user_id: User ID
            - data: List of daily activity data points with date, count, and level
            - total_days: Number of days in the statistics period
            - start_date: Start date of the period (YYYY-MM-DD)
            - end_date: End date of the period (YYYY-MM-DD)

    Raises:
        HTTPException: 403 if user tries to access other user's data
        HTTPException: 404 if user not found
    """
    # Use current user's ID if not specified
    target_user_id = user_id or current_user.id

    # Verify target user exists first (before access check to return 404 for non-existent users)
    # Only verify if user_id was explicitly provided (not using current user)
    if user_id is not None:
        await verify_user_exists(target_user_id, db)

    # Skip access check if accessing own data
    if user_id and user_id != current_user.id:
        verify_user_access(current_user, user_id)

    # Build cache key
    cache_key = CacheKeys.personal_stats_key(
        target_user_id, "heatmap",
        days=days,
        metric_type=metric_type
    )

    # Try to get from cache
    cached_data = await cache_service.get(cache_key)
    if cached_data is not None:
        return ApiResponse(
            code=200,
            message="success (cached)",
            data=HeatmapResponse(**cached_data)
        )

    # Get heatmap data
    personal_stats_service = PersonalStatsService()
    heatmap_data = await personal_stats_service.get_heatmap_data(
        db=db,
        user_id=target_user_id,
        days=days,
        metric_type=metric_type,
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


@router.get(
    "/activity-hours",
    response_model=ApiResponse[list[ActivityHourData]],
    summary="获取个人活跃时段统计",
    description="获取用户在一天24小时内各时段的活动分布情况，用于展示活跃时段图表。默认统计最近30天。",
    response_description="个人活跃时段统计数据",
    responses={
        200: {
            "description": "成功获取活跃时段数据",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": [
                            {"hour": 0, "count": 5},
                            {"hour": 1, "count": 2},
                            {"hour": 9, "count": 45},
                            {"hour": 10, "count": 62},
                            {"hour": 14, "count": 58},
                            {"hour": 15, "count": 70},
                        ]
                    }
                }
            }
        },
        404: {"description": "User not found"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["query", "user_id"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        },
    }
)
async def get_personal_activity_hours(
    user_id: int | None = Query(None, description="User ID (optional, defaults to current user)", gt=0, examples=[1]),
    current_user: User = Depends(get_current_active_user),
    start_date: date | None = Query(None, description="Start date (YYYY-MM-DD format)"),
    end_date: date | None = Query(None, description="End date (YYYY-MM-DD format)"),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[list[ActivityHourData]]:
    """Get personal activity hours distribution.

    Returns the distribution of user activity across 24 hours of the day,
    showing which hours the user is most active. Useful for visualizing
    coding patterns and peak productivity hours.

    Args:
        user_id: User ID (optional, defaults to current user)
        current_user: Current authenticated user
        start_date: Start date for statistics period (optional, defaults to 30 days ago)
        end_date: End date for statistics period (optional, defaults to today)
        db: Database session dependency

    Returns:
        List of ActivityHourData containing:
            - hour: Hour of day (0-23)
            - count: Number of activities in that hour

    Raises:
        HTTPException: 403 if user tries to access other user's data
        HTTPException: 404 if user not found
    """
    # Use current user's ID if not specified
    target_user_id = user_id or current_user.id

    # Verify target user exists first (before access check to return 404 for non-existent users)
    # Only verify if user_id was explicitly provided (not using current user)
    if user_id is not None:
        await verify_user_exists(target_user_id, db)

    # Skip access check if accessing own data
    if user_id and user_id != current_user.id:
        verify_user_access(current_user, user_id)

    # Set default date range (last 30 days)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=29)

    # Initialize activity counts for all 24 hours
    activity_counts = {hour: 0 for hour in range(24)}

    # Get code commit activity by hour
    from sqlalchemy import extract, func
    from app.db.models import CodeCommit

    result = await db.execute(
        select(
            extract('hour', CodeCommit.commit_time).label('hour'),
            func.count(CodeCommit.id).label('count')
        )
        .where(CodeCommit.user_id == target_user_id)
        .where(func.date(CodeCommit.commit_time) >= start_date)
        .where(func.date(CodeCommit.commit_time) <= end_date)
        .group_by(extract('hour', CodeCommit.commit_time))
    )

    # Aggregate counts by hour
    for row in result.all():
        hour = int(row.hour) if row.hour is not None else 0
        if 0 <= hour < 24:
            activity_counts[hour] += row.count

    # Build response data
    response_data = [
        ActivityHourData(hour=hour, count=activity_counts[hour])
        for hour in range(24)
    ]

    logger.info(
        "Personal activity hours retrieved",
        user_id=target_user_id,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
    )

    return ApiResponse(
        code=200,
        message="success",
        data=response_data
    )
