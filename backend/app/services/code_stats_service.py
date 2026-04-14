"""Code statistics service for calculating commit and code metrics.

This service provides real database-backed statistics for code commits,
replacing mock data with actual SQL queries.
"""

import time
from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import Integer, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import CodeCommit, User

logger = get_logger(__name__)


class DailyCommitStats:
    """Daily commit statistics data class."""

    def __init__(
        self,
        date: date,
        commit_count: int,
        lines_added: int,
        lines_deleted: int,
    ):
        self.date = date
        self.commit_count = commit_count
        self.lines_added = lines_added
        self.lines_deleted = lines_deleted


class CodeStatsResult:
    """Code statistics result data class."""

    def __init__(
        self,
        total_commits: int,
        total_additions: int,
        total_deletions: int,
        file_count: int,
        ai_generated_commits: int,
    ):
        self.total_commits = total_commits
        self.total_additions = total_additions
        self.total_deletions = total_deletions
        self.file_count = file_count
        self.ai_generated_commits = ai_generated_commits


class CodeStatsService:
    """Service for calculating code commit statistics.

    This service provides methods to query and aggregate code commit data
    from the database, supporting both user-level and project-level statistics.
    """

    async def get_user_commits(
        self,
        db: AsyncSession,
        user_id: int,
        start_date: date,
        end_date: date,
    ) -> list[CodeCommit]:
        """Get all commits for a user within a date range.

        Args:
            db: Database session
            user_id: User ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            List of CodeCommit objects
        """
        start_time = time.time()
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        result = await db.execute(
            select(CodeCommit)
            .where(CodeCommit.user_id == user_id)
            .where(CodeCommit.commit_time >= start_datetime)
            .where(CodeCommit.commit_time <= end_datetime)
            .order_by(CodeCommit.commit_time.desc())
        )

        commits = list(result.scalars().all())
        duration_ms = int((time.time() - start_time) * 1000)

        logger.info(
            "Retrieved user commits",
            user_id=user_id,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            commit_count=len(commits),
            duration_ms=duration_ms,
        )

        return commits

    async def get_project_commits(
        self,
        db: AsyncSession,
        project_id: int,
        start_date: date,
        end_date: date,
    ) -> list[CodeCommit]:
        """Get all commits for a project within a date range.

        Args:
            db: Database session
            project_id: Project ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            List of CodeCommit objects
        """
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        result = await db.execute(
            select(CodeCommit)
            .where(CodeCommit.project_id == project_id)
            .where(CodeCommit.commit_time >= start_datetime)
            .where(CodeCommit.commit_time <= end_datetime)
            .order_by(CodeCommit.commit_time.desc())
        )

        return list(result.scalars().all())

    async def calculate_code_stats(
        self,
        db: AsyncSession,
        user_id: Optional[int],
        project_id: Optional[int],
        start_date: date,
        end_date: date,
    ) -> CodeStatsResult:
        """Calculate aggregated code statistics.

        Args:
            db: Database session
            user_id: Optional user ID to filter by
            project_id: Optional project ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            CodeStatsResult with aggregated statistics
        """
        start_time = time.time()
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        # Build base query
        query = select(
            func.count(CodeCommit.id).label("total_commits"),
            func.coalesce(func.sum(CodeCommit.additions), 0).label("total_additions"),
            func.coalesce(func.sum(CodeCommit.deletions), 0).label("total_deletions"),
            func.coalesce(func.sum(CodeCommit.file_count), 0).label("file_count"),
            func.sum(func.cast(CodeCommit.is_ai_generated, Integer)).label("ai_generated_commits"),
        ).where(
            CodeCommit.commit_time >= start_datetime,
            CodeCommit.commit_time <= end_datetime,
        )

        # Apply filters
        if user_id is not None:
            query = query.where(CodeCommit.user_id == user_id)
        if project_id is not None:
            query = query.where(CodeCommit.project_id == project_id)

        result = await db.execute(query)
        row = result.one()

        stats = CodeStatsResult(
            total_commits=row.total_commits or 0,
            total_additions=int(row.total_additions) if row.total_additions else 0,
            total_deletions=int(row.total_deletions) if row.total_deletions else 0,
            file_count=int(row.file_count) if row.file_count else 0,
            ai_generated_commits=row.ai_generated_commits or 0,
        )

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "Calculated code stats",
            user_id=user_id,
            project_id=project_id,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            total_commits=stats.total_commits,
            duration_ms=duration_ms,
        )

        return stats

    async def get_language_distribution(
        self,
        db: AsyncSession,
        project_id: Optional[int],
    ) -> dict[str, int]:
        """Get code language distribution.

        Args:
            db: Database session
            project_id: Optional project ID to filter by

        Returns:
            Dictionary mapping language to commit count
        """
        query = (
            select(
                CodeCommit.language,
                func.count(CodeCommit.id).label("commit_count"),
            )
            .group_by(CodeCommit.language)
        )

        if project_id is not None:
            query = query.where(CodeCommit.project_id == project_id)

        result = await db.execute(query)
        rows = result.all()

        return {row.language: row.commit_count for row in rows}

    async def get_commit_trends(
        self,
        db: AsyncSession,
        user_id: Optional[int],
        project_id: Optional[int],
        days: int,
    ) -> list[DailyCommitStats]:
        """Get daily commit trends for the specified number of days.

        Args:
            db: Database session
            user_id: Optional user ID to filter by
            project_id: Optional project ID to filter by
            days: Number of days to look back

        Returns:
            List of DailyCommitStats objects
        """
        start_time = time.time()
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        # Build query for daily aggregation using date function
        query = (
            select(
                func.date(CodeCommit.commit_time).label("commit_date"),
                func.count(CodeCommit.id).label("commit_count"),
                func.coalesce(func.sum(CodeCommit.additions), 0).label("lines_added"),
                func.coalesce(func.sum(CodeCommit.deletions), 0).label("lines_deleted"),
            )
            .where(
                CodeCommit.commit_time >= start_datetime,
                CodeCommit.commit_time <= end_datetime,
            )
            .group_by(func.date(CodeCommit.commit_time))
            .order_by(func.date(CodeCommit.commit_time))
        )

        if user_id is not None:
            query = query.where(CodeCommit.user_id == user_id)
        if project_id is not None:
            query = query.where(CodeCommit.project_id == project_id)

        result = await db.execute(query)
        rows = result.all()

        # Create a lookup dictionary for database results
        # Convert string dates from SQLite to date objects
        db_data = {}
        for row in rows:
            # Handle both string and date types (SQLite returns string)
            if isinstance(row.commit_date, str):
                from datetime import datetime as dt
                commit_date = dt.strptime(row.commit_date, "%Y-%m-%d").date()
            else:
                commit_date = row.commit_date
            db_data[commit_date] = DailyCommitStats(
                date=commit_date,
                commit_count=row.commit_count,
                lines_added=int(row.lines_added) if row.lines_added else 0,
                lines_deleted=int(row.lines_deleted) if row.lines_deleted else 0,
            )

        # Fill in missing dates with zero values
        trends = []
        current = start_date
        while current <= end_date:
            if current in db_data:
                trends.append(db_data[current])
            else:
                trends.append(
                    DailyCommitStats(
                        date=current,
                        commit_count=0,
                        lines_added=0,
                        lines_deleted=0,
                    )
                )
            current += timedelta(days=1)

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "Retrieved commit trends",
            user_id=user_id,
            project_id=project_id,
            days=days,
            data_points=len(trends),
            duration_ms=duration_ms,
        )

        return trends

    async def get_commit_ranking(
        self,
        db: AsyncSession,
        project_id: int,
        start_date: date,
        end_date: date,
        limit: int = 20,
    ) -> list[dict]:
        """Get user commit count ranking for a project.

        Args:
            db: Database session
            project_id: Project ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            limit: Maximum number of results

        Returns:
            List of dictionaries with user ranking data:
            [
                {
                    "user_id": 1,
                    "username": "xxx",
                    "commit_count": 10,
                    "avg_commits_per_day": 0.5
                }
            ]
        """
        # Calculate days for avg_commits_per_day
        days = (end_date - start_date).days + 1

        # Convert dates to datetime for comparison with commit_time
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        # Build query with JOIN to get username
        result = await db.execute(
            select(
                User.id.label("user_id"),
                User.username,
                func.count(CodeCommit.id).label("commit_count"),
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
                "avg_commits_per_day": row.commit_count / days if days > 0 else 0.0,
            }
            for row in rows
        ]

    async def get_user_code_ranking(
        self,
        db: AsyncSession,
        project_id: int,
        limit: int = 20,
    ) -> list[dict]:
        """Get user code contribution ranking for a project.

        Args:
            db: Database session
            project_id: Project ID to filter by
            limit: Maximum number of results

        Returns:
            List of dictionaries with user ranking data
        """
        result = await db.execute(
            select(
                User.id.label("user_id"),
                User.username,
                func.coalesce(func.sum(CodeCommit.additions), 0).label("lines_added"),
                func.coalesce(func.sum(CodeCommit.deletions), 0).label("lines_deleted"),
            )
            .join(CodeCommit, User.id == CodeCommit.user_id)
            .where(CodeCommit.project_id == project_id)
            .group_by(User.id, User.username)
            .order_by(func.sum(CodeCommit.additions).desc())
            .limit(limit)
        )

        rows = result.all()

        return [
            {
                "user_id": row.user_id,
                "username": row.username,
                "lines_added": int(row.lines_added) if row.lines_added else 0,
                "lines_deleted": int(row.lines_deleted) if row.lines_deleted else 0,
                "total_lines": int(row.lines_added or 0) - int(row.lines_deleted or 0),
            }
            for row in rows
        ]
