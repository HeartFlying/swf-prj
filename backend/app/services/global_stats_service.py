"""Global statistics service for calculating system-wide metrics.

This service provides methods to query and aggregate global statistics
data from the database, supporting dashboard and reporting features.
"""

import time
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import BugRecord, CodeCommit, Project, TokenUsage, User

logger = get_logger(__name__)


class GlobalStatsService:
    """Service for calculating global statistics.

    This service provides methods to query system-wide aggregated statistics
    including user counts, project counts, commit counts, token usage, etc.
    """

    async def get_top_users(
        self,
        db: AsyncSession,
        limit: int = 20,
        days: int = 30,
        sort_by: str = "tokens",
    ) -> list[dict]:
        """Get top users by token usage or commit count.

        Args:
            db: Database session
            limit: Maximum number of results to return
            days: Number of days to look back for statistics
            sort_by: Sort criteria - "tokens" or "commits"

        Returns:
            List of dictionaries containing user statistics:
                - user_id: User ID
                - username: User's username
                - department: User's department
                - token_count: Total token usage in the period
                - commit_count: Total commit count in the period
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        # Build token count subquery
        token_count_sq = (
            select(func.sum(TokenUsage.token_count))
            .where(TokenUsage.user_id == User.id)
            .where(TokenUsage.usage_date >= start_date)
            .where(TokenUsage.usage_date <= end_date)
            .scalar_subquery()
        )

        # Build commit count subquery
        commit_count_sq = (
            select(func.count(CodeCommit.id))
            .where(CodeCommit.user_id == User.id)
            .where(func.date(CodeCommit.commit_time) >= start_date)
            .where(func.date(CodeCommit.commit_time) <= end_date)
            .scalar_subquery()
        )

        # Determine order by clause based on sort_by parameter
        if sort_by == "commits":
            order_by_clause = func.coalesce(commit_count_sq, 0).desc()
        else:  # default to tokens
            order_by_clause = func.coalesce(token_count_sq, 0).desc()

        # Query to get top users with both token and commit counts
        result = await db.execute(
            select(
                User.id.label("user_id"),
                User.username,
                User.department,
                func.coalesce(token_count_sq, 0).label("token_count"),
                func.coalesce(commit_count_sq, 0).label("commit_count"),
            )
            .where(User.is_active.is_(True))
            .order_by(order_by_clause)
            .limit(limit)
        )

        rows = result.all()

        return [
            {
                "user_id": row.user_id,
                "username": row.username,
                "department": row.department,
                "token_count": int(row.token_count) if row.token_count else 0,
                "commit_count": int(row.commit_count) if row.commit_count else 0,
            }
            for row in rows
        ]

    async def get_global_summary(
        self,
        db: AsyncSession,
        days: int = 30,
    ) -> dict:
        """Get global summary statistics.

        Args:
            db: Database session
            days: Number of days to look back for statistics

        Returns:
            Dictionary containing global statistics:
                - total_users: Total number of active users
                - total_projects: Total number of active projects
                - total_commits: Total commit count in the period
                - total_tokens: Total token usage in the period
                - total_bugs: Total bug count
                - active_users_today: Number of active users today
                - period_days: The period in days
        """
        start_time = time.time()
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)
        today_start = datetime.combine(end_date, datetime.min.time())
        today_end = datetime.combine(end_date, datetime.max.time())

        # Get total active users
        users_result = await db.execute(
            select(func.count(User.id)).where(User.is_active.is_(True))
        )
        total_users = users_result.scalar() or 0

        # Get total active projects
        projects_result = await db.execute(
            select(func.count(Project.id)).where(Project.status == "active")
        )
        total_projects = projects_result.scalar() or 0

        # Get total commits in period
        commits_result = await db.execute(
            select(func.count(CodeCommit.id))
            .where(func.date(CodeCommit.commit_time) >= start_date)
            .where(func.date(CodeCommit.commit_time) <= end_date)
        )
        total_commits = commits_result.scalar() or 0

        # Get total tokens in period
        tokens_result = await db.execute(
            select(func.coalesce(func.sum(TokenUsage.token_count), 0))
            .where(TokenUsage.usage_date >= start_date)
            .where(TokenUsage.usage_date <= end_date)
        )
        total_tokens = tokens_result.scalar() or 0

        # Get total bugs
        bugs_result = await db.execute(
            select(func.count(BugRecord.id))
        )
        total_bugs = bugs_result.scalar() or 0

        # Get active users today (users with commits today)
        active_users_result = await db.execute(
            select(func.count(func.distinct(CodeCommit.user_id)))
            .where(CodeCommit.commit_time >= today_start)
            .where(CodeCommit.commit_time <= today_end)
        )
        active_users_today = active_users_result.scalar() or 0

        summary = {
            "total_users": total_users,
            "total_projects": total_projects,
            "total_commits": total_commits,
            "total_tokens": total_tokens,
            "total_bugs": total_bugs,
            "active_users_today": active_users_today,
            "period_days": days,
        }

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "Retrieved global summary",
            days=days,
            total_users=total_users,
            total_projects=total_projects,
            total_commits=total_commits,
            duration_ms=duration_ms,
        )

        return summary
