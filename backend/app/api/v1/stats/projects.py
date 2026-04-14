"""Project Statistics API routes."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import CacheKeys
from app.core.dependencies import (
    get_bug_stats_service,
    get_cache_service,
    get_code_stats_service,
    get_project_stats_service,
    get_token_stats_service,
)
from app.core.logging import get_logger
from app.db.base import get_db
from app.db.models import Project, ProjectMember
from app.schemas.common import ApiResponse
from app.schemas.stats import (
    AIAdoptionResponse,
    BugTrendResponse,
    CodeRankResponse,
    CodeTrendResponse,
    CommitRankResponse,
    CommitTrend,
    LanguageDistribution,
    MemberStat,
    ProjectDashboardResponse,
    ProjectStatsResponse,
    TotalStats,
)
from app.services.bug_stats_service import BugStatsService
from app.services.cache_service import CacheService
from app.services.code_stats_service import CodeStatsService
from app.services.project_stats_service import ProjectStatsService
from app.services.token_stats_service import TokenStatsService

router = APIRouter(tags=["project-stats"])
logger = get_logger(__name__)


def generate_date_range(start_date: date, end_date: date) -> list[str]:
    """Generate a list of dates between start and end."""
    dates = []
    current = start_date
    while current <= end_date:
        dates.append(current.isoformat())
        current += timedelta(days=1)
    return dates


async def verify_project_exists(project_id: int, db: AsyncSession) -> Project:
    """Verify project exists and return it."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    return project


@router.get(
    "/{project_id}",
    response_model=ApiResponse[ProjectStatsResponse],
    summary="获取项目统计概览",
    description="获取指定项目的统计概览，包括总提交数、总Token使用量、活跃成员数、Bug数量。默认统计最近30天的数据。",
    response_description="项目统计概览数据",
    responses={
        200: {
            "description": "成功获取项目统计",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "project_id": 1,
                            "project_name": "示例项目",
                            "total_commits": 150,
                            "total_tokens": 50000,
                            "active_members": 8,
                            "bug_count": 12
                        }
                    }
                }
            }
        },
        404: {"description": "Project not found"},
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["path", "project_id"],
                                "msg": "ensure this value is greater than 0",
                                "type": "value_error.number.not_gt"
                            }
                        ]
                    }
                }
            }
        },
    }
)
async def get_project_stats(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    code_stats_service: CodeStatsService = Depends(get_code_stats_service),
    token_stats_service: TokenStatsService = Depends(get_token_stats_service),
    bug_stats_service: BugStatsService = Depends(get_bug_stats_service),
) -> ApiResponse[ProjectStatsResponse]:
    """Get project statistics overview.

    Returns an overview of project statistics including total commits,
    token usage, active member count, and bug count for the last 30 days.

    Args:
        project_id: Project ID (path parameter)
        db: Database session dependency
        code_stats_service: Service for calculating code statistics
        token_stats_service: Service for calculating token statistics
        bug_stats_service: Service for calculating bug statistics

    Returns:
        ProjectStatsResponse containing:
            - project_id: Project ID
            - project_name: Project name
            - total_commits: Total number of commits
            - total_tokens: Total token usage
            - active_members: Number of active project members
            - bug_count: Total number of bugs

    Raises:
        HTTPException: 404 if project not found
    """
    project = await verify_project_exists(project_id, db)

    # Get active member count
    member_count_result = await db.execute(
        select(func.count())
        .select_from(ProjectMember)
        .where(ProjectMember.project_id == project_id)
    )
    active_members = member_count_result.scalar() or 0

    # Get code statistics for the last 30 days
    end_date = date.today()
    start_date = end_date - timedelta(days=29)

    code_stats = await code_stats_service.calculate_code_stats(
        db=db,
        user_id=None,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
    )

    # Get token usage statistics
    token_summary = await token_stats_service.get_project_token_usage(
        db=db,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
    )

    # Get bug statistics
    bug_stats = await bug_stats_service.get_bug_stats_by_project(
        db=db,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
    )

    return ApiResponse(
        code=200,
        message="success",
        data=ProjectStatsResponse(
            project_id=project.id,
            project_name=project.name,
            total_commits=code_stats.total_commits,
            total_tokens=token_summary.total_tokens,
            active_members=active_members,
            bug_count=bug_stats.total_bugs,
        )
    )


@router.get(
    "/{project_id}/code-rank",
    response_model=ApiResponse[list[CodeRankResponse]],
    summary="获取项目代码量排行",
    description="获取项目成员的代码量排行榜，按代码行数排序。可指定返回数量限制。",
    response_description="项目成员代码量排行列表",
    responses={
        200: {
            "description": "成功获取代码量排行",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": [
                            {
                                "user_id": 1,
                                "username": "zhangsan",
                                "lines_added": 2500,
                                "lines_deleted": 500,
                                "total_lines": 2000
                            },
                            {
                                "user_id": 2,
                                "username": "lisi",
                                "lines_added": 1800,
                                "lines_deleted": 300,
                                "total_lines": 1500
                            }
                        ]
                    }
                }
            }
        },
        404: {"description": "Project not found"},
        422: {
            "description": "Validation error",
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
async def get_project_code_rank(
    project_id: int,
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results to return (1-100)", examples=[20]),
    db: AsyncSession = Depends(get_db),
    code_stats_service: CodeStatsService = Depends(get_code_stats_service),
) -> ApiResponse[list[CodeRankResponse]]:
    """Get code line ranking for project members.

    Returns a ranked list of project members by code contribution,
    including lines added, deleted, and net total.

    Args:
        project_id: Project ID (path parameter)
        limit: Maximum number of results to return (1-100, default 20)
        db: Database session dependency
        code_stats_service: Service for calculating code statistics

    Returns:
        List of CodeRankResponse containing:
            - user_id: User ID
            - username: User's username
            - lines_added: Lines of code added
            - lines_deleted: Lines of code deleted
            - total_lines: Net lines (added - deleted)

    Raises:
        HTTPException: 404 if project not found
    """
    await verify_project_exists(project_id, db)

    # Get real code ranking from database
    rankings = await code_stats_service.get_user_code_ranking(
        db=db,
        project_id=project_id,
        limit=limit,
    )

    return ApiResponse(
        code=200,
        message="success",
        data=[
            CodeRankResponse(
                user_id=rank["user_id"],
                username=rank["username"],
                lines_added=rank["lines_added"],
                lines_deleted=rank["lines_deleted"],
                total_lines=rank["total_lines"],
            )
            for rank in rankings
        ]
    )


@router.get(
    "/{project_id}/bug-trend",
    response_model=ApiResponse[BugTrendResponse],
    summary="获取项目Bug趋势",
    description="获取指定项目在日期范围内的Bug趋势数据，包括每日创建的Bug数和解决的Bug数。默认统计最近30天。",
    response_description="项目Bug趋势数据",
    responses={
        200: {
            "description": "成功获取Bug趋势",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "dates": ["2026-03-01", "2026-03-02", "2026-03-03"],
                            "created": [2, 1, 3],
                            "resolved": [1, 2, 1]
                        }
                    }
                }
            }
        },
        404: {"description": "Project not found"},
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
async def get_project_bug_trend(
    project_id: int,
    start_date: date | None = Query(None, description="Start date (YYYY-MM-DD format)"),
    end_date: date | None = Query(None, description="End date (YYYY-MM-DD format)"),
    db: AsyncSession = Depends(get_db),
    bug_stats_service: BugStatsService = Depends(get_bug_stats_service),
) -> ApiResponse[BugTrendResponse]:
    """Get bug trend for a project.

    Returns daily bug creation and resolution trends for the specified project
    within the date range. If no date range is specified, defaults to the last 30 days.

    Args:
        project_id: Project ID (path parameter)
        start_date: Start date for trend period (optional, defaults to 30 days ago)
        end_date: End date for trend period (optional, defaults to today)
        db: Database session dependency
        bug_stats_service: Service for calculating bug statistics

    Returns:
        BugTrendResponse containing:
            - dates: List of dates in ISO format
            - created: List of bugs created per day
            - resolved: List of bugs resolved per day

    Raises:
        HTTPException: 404 if project not found
    """
    await verify_project_exists(project_id, db)

    # Set default date range (last 30 days)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=29)

    dates = generate_date_range(start_date, end_date)

    # Get real bug trends from database
    days = (end_date - start_date).days + 1
    bug_trends = await bug_stats_service.get_bug_trends(
        db=db,
        project_id=project_id,
        days=days,
    )

    # Filter to the requested date range
    start_idx = (start_date - (end_date - timedelta(days=days - 1))).days
    end_idx = start_idx + len(dates)
    filtered_trends = bug_trends[start_idx:end_idx] if start_idx >= 0 else bug_trends[:len(dates)]

    created = [trend.created for trend in filtered_trends]
    resolved = [trend.resolved for trend in filtered_trends]

    return ApiResponse(
        code=200,
        message="success",
        data=BugTrendResponse(dates=dates, created=created, resolved=resolved)
    )


@router.get(
    "/{project_id}/commit-rank",
    response_model=ApiResponse[list[CommitRankResponse]],
    summary="获取项目提交数排行",
    description="获取项目成员在指定日期范围内的提交数排行榜。可指定返回数量限制和日期范围，默认统计最近30天。",
    response_description="项目成员提交数排行列表",
    responses={
        200: {
            "description": "成功获取提交数排行",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": [
                            {
                                "user_id": 1,
                                "username": "zhangsan",
                                "commit_count": 45,
                                "avg_commits_per_day": 1.5
                            },
                            {
                                "user_id": 2,
                                "username": "lisi",
                                "commit_count": 32,
                                "avg_commits_per_day": 1.07
                            }
                        ]
                    }
                }
            }
        },
        404: {"description": "Project not found"},
        422: {
            "description": "Validation error",
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
async def get_project_commit_rank(
    project_id: int,
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results to return (1-100)", examples=[20]),
    start_date: date | None = Query(None, description="Start date (YYYY-MM-DD format)"),
    end_date: date | None = Query(None, description="End date (YYYY-MM-DD format)"),
    db: AsyncSession = Depends(get_db),
    code_stats_service: CodeStatsService = Depends(get_code_stats_service),
) -> ApiResponse[list[CommitRankResponse]]:
    """Get commit count ranking for project members.

    Returns users ranked by commit count within the specified date range.
    If no date range is specified, defaults to the last 30 days.

    Args:
        project_id: Project ID (path parameter)
        limit: Maximum number of results to return (1-100, default 20)
        start_date: Start date for ranking period (optional, defaults to 30 days ago)
        end_date: End date for ranking period (optional, defaults to today)
        db: Database session dependency
        code_stats_service: Service for calculating code statistics

    Returns:
        List of CommitRankResponse containing:
            - user_id: User ID
            - username: User's username
            - commit_count: Total number of commits
            - avg_commits_per_day: Average commits per day

    Raises:
        HTTPException: 404 if project not found
    """
    await verify_project_exists(project_id, db)

    # Set default date range (last 30 days) if not provided
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=29)

    # Get commit ranking from service
    rankings = await code_stats_service.get_commit_ranking(
        db=db,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )

    return ApiResponse(
        code=200,
        message="success",
        data=[
            CommitRankResponse(
                user_id=rank["user_id"],
                username=rank["username"],
                commit_count=rank["commit_count"],
                avg_commits_per_day=rank["avg_commits_per_day"],
            )
            for rank in rankings
        ]
    )


@router.get(
    "/{project_id}/ai-adoption",
    response_model=ApiResponse[list[AIAdoptionResponse]],
    summary="获取项目AI采纳率趋势",
    description="获取指定项目的AI采纳率趋势数据，包括每日AI建议数、接受数和采纳率。可指定统计天数，默认30天，范围7-365天。",
    response_description="项目AI采纳率趋势列表",
    responses={
        200: {
            "description": "成功获取AI采纳率趋势",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": [
                            {
                                "date": "2026-03-01",
                                "adoption_rate": 85.5,
                                "ai_suggestions": 20,
                                "accepted_suggestions": 17
                            },
                            {
                                "date": "2026-03-02",
                                "adoption_rate": 90.0,
                                "ai_suggestions": 10,
                                "accepted_suggestions": 9
                            }
                        ]
                    }
                }
            }
        },
        404: {"description": "Project not found"},
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
async def get_project_ai_adoption(
    project_id: int,
    days: int = Query(30, ge=7, le=365, description="Number of days to analyze (7-365)", examples=[30]),
    db: AsyncSession = Depends(get_db),
    code_stats_service: CodeStatsService = Depends(get_code_stats_service),
) -> ApiResponse[list[AIAdoptionResponse]]:
    """Get AI adoption rate for a project.

    Returns daily AI adoption metrics for the specified project over the given period.
    AI adoption rate is calculated as the percentage of AI suggestions that were accepted.

    Args:
        project_id: Project ID (path parameter)
        days: Number of days to analyze (7-365, default 30)
        db: Database session dependency
        code_stats_service: Service for calculating code statistics

    Returns:
        List of AIAdoptionResponse containing:
            - date: Date in ISO format
            - adoption_rate: AI suggestion adoption rate (0-100)
            - ai_suggestions: Number of AI suggestions made
            - accepted_suggestions: Number of AI suggestions accepted

    Raises:
        HTTPException: 404 if project not found
    """
    await verify_project_exists(project_id, db)

    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    dates = generate_date_range(start_date, end_date)

    # Get commit trends to calculate AI adoption
    commit_trends = await code_stats_service.get_commit_trends(
        db=db,
        user_id=None,
        project_id=project_id,
        days=days,
    )

    # Create adoption data based on AI-generated commits
    adoption_data = []
    for i, date_str in enumerate(dates):
        if i < len(commit_trends):
            trend = commit_trends[i]
            # For now, estimate AI suggestions based on commit data
            # In a real implementation, this would query AISuggestion table
            ai_suggestions = trend.commit_count
            accepted_suggestions = trend.commit_count  # Assume all commits are accepted
            adoption_rate = 100.0 if ai_suggestions > 0 else 0.0
        else:
            ai_suggestions = 0
            accepted_suggestions = 0
            adoption_rate = 0.0

        adoption_data.append(
            AIAdoptionResponse(
                date=date_str,
                adoption_rate=round(adoption_rate, 2),
                ai_suggestions=ai_suggestions,
                accepted_suggestions=accepted_suggestions,
            )
        )

    return ApiResponse(
        code=200,
        message="success",
        data=adoption_data
    )


@router.get(
    "/{project_id}/code-trend",
    response_model=ApiResponse[CodeTrendResponse],
    summary="获取项目代码趋势",
    description="获取指定项目在日期范围内的代码行数趋势数据，包括每日新增、删除和累计代码行数。默认统计最近30天。",
    response_description="项目代码趋势数据",
    responses={
        200: {
            "description": "成功获取代码趋势",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "dates": ["2026-03-01", "2026-03-02", "2026-03-03"],
                            "total_lines": [100000, 101200, 102500],
                            "additions": [1200, 1500, 1800],
                            "deletions": [300, 200, 500]
                        }
                    }
                }
            }
        },
        404: {"description": "Project not found"},
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
async def get_project_code_trend(
    project_id: int,
    start_date: date | None = Query(None, description="Start date (YYYY-MM-DD format)"),
    end_date: date | None = Query(None, description="End date (YYYY-MM-DD format)"),
    db: AsyncSession = Depends(get_db),
    code_stats_service: CodeStatsService = Depends(get_code_stats_service),
) -> ApiResponse[CodeTrendResponse]:
    """Get code trend for a project.

    Returns daily code line statistics (additions, deletions, total lines)
    for the specified project within the date range.
    If no date range is specified, defaults to the last 30 days.

    Args:
        project_id: Project ID (path parameter)
        start_date: Start date for trend period (optional, defaults to 30 days ago)
        end_date: End date for trend period (optional, defaults to today)
        db: Database session dependency
        code_stats_service: Service for calculating code statistics

    Returns:
        CodeTrendResponse containing:
            - dates: List of dates in ISO format
            - total_lines: Cumulative total lines of code
            - additions: Lines added per day
            - deletions: Lines deleted per day

    Raises:
        HTTPException: 404 if project not found
    """
    await verify_project_exists(project_id, db)

    # Set default date range (last 30 days)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=29)

    days = (end_date - start_date).days + 1
    dates = generate_date_range(start_date, end_date)

    # Get commit trends with line statistics from database
    commit_trends = await code_stats_service.get_commit_trends(
        db=db,
        user_id=None,
        project_id=project_id,
        days=days,
    )

    # Extract line statistics
    additions = [trend.lines_added for trend in commit_trends]
    deletions = [trend.lines_deleted for trend in commit_trends]

    # Calculate cumulative total lines
    # Start with a base value and accumulate daily changes
    total_lines = []
    base_total = 100000  # Base line count - in production this could be queried from DB
    current_total = base_total

    for i in range(len(additions)):
        current_total += additions[i] - deletions[i]
        total_lines.append(current_total)

    return ApiResponse(
        code=200,
        message="success",
        data=CodeTrendResponse(
            dates=dates,
            total_lines=total_lines,
            additions=additions,
            deletions=deletions,
        )
    )


@router.get(
    "/{project_id}/dashboard",
    response_model=ApiResponse[ProjectDashboardResponse],
    summary="获取项目仪表板统计",
    description="获取项目仪表板的综合统计数据，包括项目概览（提交数、Token使用量、成员数、Bug数）、成员活跃度排行、Bug趋势摘要。可指定统计天数，默认30天。",
    response_description="项目仪表板统计数据",
    responses={
        200: {
            "description": "成功获取项目仪表板数据",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "message": "success",
                        "data": {
                            "project_id": 1,
                            "project_name": "示例项目",
                            "overview": {
                                "total_commits": 150,
                                "total_tokens": 50000,
                                "active_members": 8,
                                "bug_count": 12
                            },
                            "top_contributors": [
                                {"user_id": 1, "username": "zhangsan", "commit_count": 45},
                                {"user_id": 2, "username": "lisi", "commit_count": 32}
                            ],
                            "bug_summary": {
                                "total_bugs": 12,
                                "resolved_bugs": 8,
                                "trend_direction": "decreasing"
                            },
                            "period_days": 30,
                            "start_date": "2026-03-01",
                            "end_date": "2026-03-31"
                        }
                    }
                }
            }
        },
        404: {"description": "Project not found"},
        422: {
            "description": "Validation error - days must be between 7 and 365",
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
async def get_project_dashboard(
    project_id: int,
    days: int = Query(30, ge=7, le=365, description="Number of days for statistics (7-365)", examples=[30]),
    db: AsyncSession = Depends(get_db),
    project_stats_service: ProjectStatsService = Depends(get_project_stats_service),
    code_stats_service: CodeStatsService = Depends(get_code_stats_service),
    cache_service: CacheService = Depends(get_cache_service),
) -> ApiResponse[ProjectDashboardResponse]:
    """Get project dashboard statistics.

    Returns comprehensive dashboard data for a project including:
    - Overview statistics (commits, tokens, members, bugs)
    - Top contributors ranking
    - Bug summary with trend direction

    Args:
        project_id: Project ID (path parameter)
        days: Number of days for statistics (7-365, default 30)
        db: Database session dependency
        project_stats_service: Service for calculating project statistics
        code_stats_service: Service for calculating code statistics
        cache_service: Service for caching results

    Returns:
        ProjectDashboardResponse containing:
            - project_id: Project ID
            - project_name: Project name
            - total_stats: TotalStats with commits, contributors, lines_of_code, pull_requests
            - member_stats: List of MemberStat with user contribution details
            - language_distribution: List of LanguageDistribution
            - commit_trend: CommitTrend with dates and commits arrays

    Raises:
        HTTPException: 404 if project not found
    """
    await verify_project_exists(project_id, db)

    # Build cache key
    cache_key = CacheKeys.project_stats_key(project_id, "dashboard", days=days)

    # Try to get from cache
    cached_data = await cache_service.get(cache_key)
    if cached_data is not None:
        return ApiResponse(
            code=200,
            message="success (cached)",
            data=ProjectDashboardResponse(**cached_data)
        )

    # Get dashboard data from service
    result = await project_stats_service.get_project_dashboard(
        db=db,
        project_id=project_id,
        days=days,
    )

    # Build response matching frontend expected structure
    # Get commit trends for the chart
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)
    dates = generate_date_range(start_date, end_date)

    commit_trends = await code_stats_service.get_commit_trends(
        db=db,
        user_id=None,
        project_id=project_id,
        days=days,
    )

    commit_trend = CommitTrend(
        dates=dates,
        commits=[trend.commit_count for trend in commit_trends[-len(dates):]],
    )

    # Build member stats from top contributors
    member_stats: list[MemberStat] = []
    for contributor in result.top_contributors:
        member_stats.append(MemberStat(
            user_id=contributor.get("user_id", 0),
            username=contributor.get("username", ""),
            commits=contributor.get("commit_count", 0),
            additions=0,  # TODO: Get from code stats
            deletions=0,  # TODO: Get from code stats
            tokens=0,  # TODO: Get from token stats
        ))

    # Build total stats
    overview = result.to_dict().get("overview", {})
    total_stats = TotalStats(
        commits=overview.get("total_commits", 0),
        contributors=len(result.top_contributors),
        lines_of_code=0,  # TODO: Calculate from code stats
        pull_requests=0,  # TODO: Get from PR stats
    )

    # Language distribution (placeholder)
    language_distribution: list[LanguageDistribution] = []

    response_data = ProjectDashboardResponse(
        project_id=result.project_id,
        project_name=result.project_name,
        total_stats=total_stats,
        member_stats=member_stats,
        language_distribution=language_distribution,
        commit_trend=commit_trend,
    )

    # Cache the response
    await cache_service.set(
        cache_key,
        response_data.model_dump(),
        ttl=cache_service.get_stats_ttl("dashboard")
    )

    logger.info(
        "Project dashboard retrieved",
        project_id=project_id,
        project_name=result.project_name,
        period_days=days,
    )

    return ApiResponse(
        code=200,
        message="success",
        data=response_data
    )
