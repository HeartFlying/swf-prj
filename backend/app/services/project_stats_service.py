"""Project statistics service for calculating project-level metrics.

This service provides aggregated dashboard data for projects,
combining code stats, token usage, bug statistics, and contributor rankings.
"""

import time
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import CodeCommit, Project, ProjectMember, User
from app.services.bug_stats_service import BugStatsService
from app.services.code_stats_service import CodeStatsService
from app.services.token_stats_service import TokenStatsService

logger = get_logger(__name__)


class OverviewSummary:
    """Project overview statistics summary data class."""

    def __init__(
        self,
        total_commits: int,
        total_tokens: int,
        active_members: int,
        bug_count: int,
    ):
        self.total_commits = total_commits
        self.total_tokens = total_tokens
        self.active_members = active_members
        self.bug_count = bug_count


class BugTrendSummary:
    """Bug trend summary data class."""

    def __init__(
        self,
        total: int,
        critical: int,
        resolved: int,
        trend_direction: str,
    ):
        self.total = total
        self.critical = critical
        self.resolved = resolved
        self.trend_direction = trend_direction


class ProjectDashboardResult:
    """Project dashboard result data class."""

    def __init__(
        self,
        project_id: int,
        project_name: str,
        overview: OverviewSummary,
        top_contributors: list[dict],
        bug_summary: BugTrendSummary,
        period_days: int,
        start_date: date,
        end_date: date,
    ):
        self.project_id = project_id
        self.project_name = project_name
        self.overview = overview
        self.top_contributors = top_contributors
        self.bug_summary = bug_summary
        self.period_days = period_days
        self.start_date = start_date
        self.end_date = end_date

    def to_dict(self) -> dict:
        """Convert result to dictionary format."""
        return {
            "project_id": self.project_id,
            "project_name": self.project_name,
            "overview": {
                "total_commits": self.overview.total_commits,
                "total_tokens": self.overview.total_tokens,
                "active_members": self.overview.active_members,
                "bug_count": self.overview.bug_count,
            },
            "top_contributors": self.top_contributors,
            "bug_summary": {
                "total": self.bug_summary.total,
                "critical": self.bug_summary.critical,
                "resolved": self.bug_summary.resolved,
                "trend_direction": self.bug_summary.trend_direction,
            },
            "period_days": self.period_days,
            "start_date": self.start_date,
            "end_date": self.end_date,
        }


class ProjectStatsService:
    """Service for calculating project dashboard statistics.

    This service aggregates data from code_stats_service, token_stats_service,
    and bug_stats_service to provide a comprehensive dashboard for projects.
    """

    def __init__(self):
        self.code_service = CodeStatsService()
        self.token_service = TokenStatsService()
        self.bug_service = BugStatsService()

    async def get_project_dashboard(
        self,
        db: AsyncSession,
        project_id: int,
        days: int = 30,
    ) -> ProjectDashboardResult:
        """Get project dashboard statistics.

        Args:
            db: Database session
            project_id: Project ID to get statistics for
            days: Number of days to analyze (default: 30)

        Returns:
            ProjectDashboardResult with aggregated statistics
        """
        start_time = time.time()

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        # Get project info
        project_result = await db.execute(
            select(Project.name).where(Project.id == project_id)
        )
        project_name = project_result.scalar() or ""

        # Get active member count
        member_count_result = await db.execute(
            select(func.count())
            .select_from(ProjectMember)
            .where(ProjectMember.project_id == project_id)
        )
        active_members = member_count_result.scalar() or 0

        # Get code statistics
        code_stats = await self.code_service.calculate_code_stats(
            db=db,
            user_id=None,
            project_id=project_id,
            start_date=start_date,
            end_date=end_date,
        )

        # Get token usage statistics
        token_summary = await self.token_service.get_project_token_usage(
            db=db,
            project_id=project_id,
            start_date=start_date,
            end_date=end_date,
        )

        # Get bug statistics
        bug_stats = await self.bug_service.get_bug_stats_by_project(
            db=db,
            project_id=project_id,
            start_date=start_date,
            end_date=end_date,
        )

        overview = OverviewSummary(
            total_commits=code_stats.total_commits,
            total_tokens=token_summary.total_tokens,
            active_members=active_members,
            bug_count=bug_stats.total_bugs,
        )

        # Get top contributors (by commit count)
        top_contributors = await self._get_top_contributors(
            db=db,
            project_id=project_id,
            start_date=start_date,
            end_date=end_date,
        )

        # Determine trend direction
        trend_direction = self._calculate_bug_trend(bug_stats)

        bug_summary = BugTrendSummary(
            total=bug_stats.total_bugs,
            critical=bug_stats.by_severity.get("critical", 0),
            resolved=bug_stats.resolved_bugs,
            trend_direction=trend_direction,
        )

        result = ProjectDashboardResult(
            project_id=project_id,
            project_name=project_name,
            overview=overview,
            top_contributors=top_contributors,
            bug_summary=bug_summary,
            period_days=days,
            start_date=start_date,
            end_date=end_date,
        )

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "Generated project dashboard",
            project_id=project_id,
            project_name=project_name,
            days=days,
            total_commits=overview.total_commits,
            active_members=overview.active_members,
            duration_ms=duration_ms,
        )

        return result

    async def _get_top_contributors(
        self,
        db: AsyncSession,
        project_id: int,
        start_date: date,
        end_date: date,
        limit: int = 10,
    ) -> list[dict]:
        """Get top contributors for a project.

        Args:
            db: Database session
            project_id: Project ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            limit: Maximum number of results

        Returns:
            List of dictionaries with contributor data
        """
        from datetime import datetime

        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        # Query for top contributors by commit count and lines changed
        result = await db.execute(
            select(
                User.id.label("user_id"),
                User.username,
                func.count(CodeCommit.id).label("commit_count"),
                func.coalesce(func.sum(CodeCommit.additions), 0).label("lines_added"),
                func.coalesce(func.sum(CodeCommit.deletions), 0).label("lines_deleted"),
            )
            .join(CodeCommit, User.id == CodeCommit.user_id)
            .where(
                CodeCommit.project_id == project_id,
                CodeCommit.commit_time >= start_datetime,
                CodeCommit.commit_time <= end_datetime,
            )
            .group_by(User.id, User.username)
            .order_by(func.count(CodeCommit.id).desc())
            .limit(limit)
        )

        rows = result.all()

        return [
            {
                "user_id": row.user_id,
                "username": row.username,
                "commit_count": row.commit_count,
                "lines_changed": int(row.lines_added or 0) + int(row.lines_deleted or 0),
            }
            for row in rows
        ]

    def _calculate_bug_trend(self, bug_stats) -> str:
        """Calculate bug trend direction.

        Args:
            bug_stats: ProjectBugStats object

        Returns:
            Trend direction string: "improving", "worsening", or "stable"
        """
        total_bugs = bug_stats.total_bugs
        resolved_bugs = bug_stats.resolved_bugs
        open_bugs = bug_stats.open_bugs

        if total_bugs == 0:
            return "stable"

        resolution_rate = resolved_bugs / total_bugs if total_bugs > 0 else 0

        if resolution_rate > 0.8 and open_bugs < resolved_bugs:
            return "improving"
        elif open_bugs > resolved_bugs:
            return "worsening"
        else:
            return "stable"
