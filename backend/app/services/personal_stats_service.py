"""Personal statistics service for calculating individual developer metrics.

This service provides aggregated dashboard data for individual users,
combining code stats, token usage, and bug statistics.
"""

import time
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import CodeCommit, TokenUsage, User
from app.services.bug_stats_service import BugStatsService
from app.services.code_stats_service import CodeStatsService
from app.services.token_stats_service import TokenStatsService

logger = get_logger(__name__)


class CodeSummary:
    """Code statistics summary data class."""

    def __init__(
        self,
        total_commits: int,
        lines_added: int,
        lines_deleted: int,
        avg_commits_per_day: float,
    ):
        self.total_commits = total_commits
        self.lines_added = lines_added
        self.lines_deleted = lines_deleted
        self.avg_commits_per_day = avg_commits_per_day


class TokenSummary:
    """Token usage summary data class."""

    def __init__(
        self,
        total_tokens: int,
        prompt_tokens: int,
        completion_tokens: int,
        avg_per_day: float,
    ):
        self.total_tokens = total_tokens
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.avg_per_day = avg_per_day


class BugSummary:
    """Bug statistics summary data class."""

    def __init__(
        self,
        total_bugs: int,
        critical_bugs: int,
        bug_rate: float,
        resolved_bugs: int,
    ):
        self.total_bugs = total_bugs
        self.critical_bugs = critical_bugs
        self.bug_rate = bug_rate
        self.resolved_bugs = resolved_bugs


class PersonalDashboardResult:
    """Personal dashboard result data class."""

    def __init__(
        self,
        user_id: int,
        username: str,
        code_summary: CodeSummary,
        token_summary: TokenSummary,
        bug_summary: BugSummary,
        period_days: int,
        start_date: date,
        end_date: date,
    ):
        self.user_id = user_id
        self.username = username
        self.code_summary = code_summary
        self.token_summary = token_summary
        self.bug_summary = bug_summary
        self.period_days = period_days
        self.start_date = start_date
        self.end_date = end_date

    def to_dict(self) -> dict:
        """Convert result to dictionary format."""
        return {
            "user_id": self.user_id,
            "username": self.username,
            "code_summary": {
                "total_commits": self.code_summary.total_commits,
                "lines_added": self.code_summary.lines_added,
                "lines_deleted": self.code_summary.lines_deleted,
                "avg_commits_per_day": self.code_summary.avg_commits_per_day,
            },
            "token_summary": {
                "total_tokens": self.token_summary.total_tokens,
                "prompt_tokens": self.token_summary.prompt_tokens,
                "completion_tokens": self.token_summary.completion_tokens,
                "avg_per_day": self.token_summary.avg_per_day,
            },
            "bug_summary": {
                "total_bugs": self.bug_summary.total_bugs,
                "critical_bugs": self.bug_summary.critical_bugs,
                "bug_rate": self.bug_summary.bug_rate,
                "resolved_bugs": self.bug_summary.resolved_bugs,
            },
            "period_days": self.period_days,
            "start_date": self.start_date,
            "end_date": self.end_date,
        }


class PersonalStatsService:
    """Service for calculating personal dashboard statistics.

    This service aggregates data from code_stats_service, token_stats_service,
    and bug_stats_service to provide a comprehensive dashboard for individual users.
    """

    def __init__(self):
        self.code_service = CodeStatsService()
        self.token_service = TokenStatsService()
        self.bug_service = BugStatsService()

    async def get_personal_dashboard(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 30,
    ) -> PersonalDashboardResult:
        """Get personal dashboard statistics for a user.

        Args:
            db: Database session
            user_id: User ID to get statistics for
            days: Number of days to analyze (default: 30)

        Returns:
            PersonalDashboardResult with aggregated statistics
        """
        start_time = time.time()

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        # Get user info
        from sqlalchemy import select
        user_result = await db.execute(
            select(User.username).where(User.id == user_id)
        )
        username = user_result.scalar() or ""

        # Get code statistics
        code_stats = await self.code_service.calculate_code_stats(
            db=db,
            user_id=user_id,
            project_id=None,
            start_date=start_date,
            end_date=end_date,
        )

        # Calculate avg commits per day
        avg_commits_per_day = round(code_stats.total_commits / days, 2) if days > 0 else 0.0

        code_summary = CodeSummary(
            total_commits=code_stats.total_commits,
            lines_added=code_stats.total_additions,
            lines_deleted=code_stats.total_deletions,
            avg_commits_per_day=avg_commits_per_day,
        )

        # Get token statistics
        token_stats = await self.token_service.get_user_token_usage(
            db=db,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
        )

        # Calculate avg tokens per day
        avg_tokens_per_day = round(token_stats.total_tokens / days, 2) if days > 0 else 0.0

        # Note: TokenUsage model doesn't have prompt_tokens and completion_tokens fields
        # Using total_tokens as placeholder for these values
        token_summary = TokenSummary(
            total_tokens=token_stats.total_tokens,
            prompt_tokens=token_stats.total_tokens,  # Placeholder
            completion_tokens=token_stats.total_tokens,  # Placeholder
            avg_per_day=avg_tokens_per_day,
        )

        # Get bug statistics
        bug_stats = await self.bug_service.get_bug_stats_by_user(
            db=db,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
        )

        # Calculate bug rate (bugs per 100 commits, or 0 if no commits)
        bug_rate = round(bug_stats.total_bugs / code_stats.total_commits, 4) if code_stats.total_commits > 0 else 0.0

        bug_summary = BugSummary(
            total_bugs=bug_stats.total_bugs,
            critical_bugs=bug_stats.critical_bugs,
            bug_rate=bug_rate,
            resolved_bugs=bug_stats.resolved_bugs,
        )

        result = PersonalDashboardResult(
            user_id=user_id,
            username=username,
            code_summary=code_summary,
            token_summary=token_summary,
            bug_summary=bug_summary,
            period_days=days,
            start_date=start_date,
            end_date=end_date,
        )

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "Generated personal dashboard",
            user_id=user_id,
            username=username,
            days=days,
            total_commits=code_summary.total_commits,
            total_tokens=token_summary.total_tokens,
            duration_ms=duration_ms,
        )

        return result

    def _calculate_level(self, count: int, metric_type: str = "commits") -> int:
        """Calculate activity level (0-4) based on count.

        Args:
            count: Activity count
            metric_type: Type of metric ("commits" or "tokens")

        Returns:
            Activity level (0-4)
        """
        if count == 0:
            return 0

        if metric_type == "tokens":
            # Token thresholds
            if count < 1000:
                return 1
            elif count < 5000:
                return 2
            elif count < 10000:
                return 3
            else:
                return 4
        else:
            # Commit thresholds (default)
            if count == 1:
                return 1
            elif count <= 3:
                return 2
            elif count <= 5:
                return 3
            else:
                return 4

    async def get_heatmap_data(
        self,
        db: AsyncSession,
        user_id: int | None = None,
        days: int = 30,
        metric_type: str = "commits",
    ) -> dict:
        """Get heatmap data for user activity visualization.

        Returns daily activity data formatted for heatmap visualization,
        similar to GitHub's contribution graph.

        Args:
            db: Database session
            user_id: User ID to get statistics for
            days: Number of days to analyze (default: 30)
            metric_type: Type of metric to visualize ("commits" or "tokens")

        Returns:
            Dictionary with heatmap data:
            {
                "user_id": int or 0 for global,
                "data": [
                    {"date": "YYYY-MM-DD", "count": int, "level": int},
                    ...
                ],
                "total_days": int,
                "start_date": "YYYY-MM-DD",
                "end_date": "YYYY-MM-DD"
            }
        """
        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        # Initialize data structure with all dates
        data = []
        date_counts = {}

        if metric_type == "tokens":
            # Query token usage data
            query = select(
                TokenUsage.usage_date.label("activity_date"),
                func.sum(TokenUsage.token_count).label("total_count"),
            ).where(
                TokenUsage.usage_date >= start_date,
                TokenUsage.usage_date <= end_date,
            )

            # Add user filter if specified
            if user_id is not None:
                query = query.where(TokenUsage.user_id == user_id)

            query = query.group_by(TokenUsage.usage_date)
            result = await db.execute(query)
        else:
            # Query commit data (default)
            start_datetime = datetime.combine(start_date, datetime.min.time())
            end_datetime = datetime.combine(end_date, datetime.max.time())

            query = select(
                func.date(CodeCommit.commit_time).label("activity_date"),
                func.count(CodeCommit.id).label("total_count"),
            ).where(
                CodeCommit.commit_time >= start_datetime,
                CodeCommit.commit_time <= end_datetime,
            )

            # Add user filter if specified
            if user_id is not None:
                query = query.where(CodeCommit.user_id == user_id)

            query = query.group_by(func.date(CodeCommit.commit_time))
            result = await db.execute(query)

        rows = result.all()

        # Build lookup dictionary
        for row in rows:
            # Handle both string and date types (SQLite returns string)
            if isinstance(row.activity_date, str):
                activity_date = datetime.strptime(row.activity_date, "%Y-%m-%d").date()
            else:
                activity_date = row.activity_date
            date_counts[activity_date] = row.total_count or 0

        # Fill in all dates
        current = start_date
        while current <= end_date:
            count = date_counts.get(current, 0)
            level = self._calculate_level(count, metric_type)
            data.append({
                "date": current.isoformat(),
                "count": count,
                "level": level,
            })
            current += timedelta(days=1)

        return {
            "user_id": user_id,
            "data": data,
            "total_days": days,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        }
