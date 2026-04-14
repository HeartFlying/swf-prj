"""Optimized code statistics service with pagination and performance improvements.

This module provides optimized versions of code statistics queries
with pagination support and improved performance for large datasets.
"""

from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CodeCommit, User
from app.utils.pagination import (
    PaginationParams,
    PaginatedResult,
    create_paginated_response,
    paginate_query,
)
from app.utils.performance import timed_query


class OptimizedCodeStatsService:
    """Optimized service for calculating code commit statistics.

    This service provides methods with improved performance for large datasets,
    including pagination support and optimized SQL queries.
    """

    async def get_user_commits_paginated(
        self,
        db: AsyncSession,
        user_id: int,
        start_date: date,
        end_date: date,
        params: PaginationParams,
    ) -> PaginatedResult[CodeCommit]:
        """Get paginated commits for a user within a date range.

        Args:
            db: Database session
            user_id: User ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            params: Pagination parameters

        Returns:
            PaginatedResult with CodeCommit objects
        """
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        query = (
            select(CodeCommit)
            .where(CodeCommit.user_id == user_id)
            .where(CodeCommit.commit_time >= start_datetime)
            .where(CodeCommit.commit_time <= end_datetime)
            .order_by(CodeCommit.commit_time.desc())
        )

        items, total = await paginate_query(db, query, params)
        return create_paginated_response(items, total, params)

    async def get_project_commits_paginated(
        self,
        db: AsyncSession,
        project_id: int,
        start_date: date,
        end_date: date,
        params: PaginationParams,
    ) -> PaginatedResult[CodeCommit]:
        """Get paginated commits for a project within a date range.

        Args:
            db: Database session
            project_id: Project ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            params: Pagination parameters

        Returns:
            PaginatedResult with CodeCommit objects
        """
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        query = (
            select(CodeCommit)
            .where(CodeCommit.project_id == project_id)
            .where(CodeCommit.commit_time >= start_datetime)
            .where(CodeCommit.commit_time <= end_datetime)
            .order_by(CodeCommit.commit_time.desc())
        )

        items, total = await paginate_query(db, query, params)
        return create_paginated_response(items, total, params)

    async def get_commit_ranking_paginated(
        self,
        db: AsyncSession,
        project_id: int,
        start_date: date,
        end_date: date,
        params: PaginationParams,
    ) -> PaginatedResult[dict]:
        """Get paginated user commit count ranking for a project.

        Args:
            db: Database session
            project_id: Project ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            params: Pagination parameters

        Returns:
            PaginatedResult with user ranking data
        """
        days = (end_date - start_date).days + 1
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        # Build base query
        base_query = (
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
        )

        # Get total count for pagination
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination
        paginated_query = base_query.offset(params.offset).limit(params.limit)
        result = await db.execute(paginated_query)
        rows = result.all()

        items = [
            {
                "user_id": row.user_id,
                "username": row.username,
                "commit_count": row.commit_count,
                "avg_commits_per_day": row.commit_count / days if days > 0 else 0.0,
            }
            for row in rows
        ]

        return create_paginated_response(items, total, params)

    async def get_language_distribution_optimized(
        self,
        db: AsyncSession,
        project_id: Optional[int],
    ) -> dict[str, int]:
        """Get optimized code language distribution.

        Uses a more efficient query for large datasets.

        Args:
            db: Database session
            project_id: Optional project ID to filter by

        Returns:
            Dictionary mapping language to commit count
        """
        with timed_query("language_distribution"):
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

    async def get_commit_trends_optimized(
        self,
        db: AsyncSession,
        user_id: Optional[int],
        project_id: Optional[int],
        days: int,
    ) -> list[dict]:
        """Get optimized daily commit trends.

        Uses batch fetching for improved performance with large date ranges.

        Args:
            db: Database session
            user_id: Optional user ID to filter by
            project_id: Optional project ID to filter by
            days: Number of days to look back

        Returns:
            List of daily commit statistics dictionaries
        """
        from app.services.code_stats_service import DailyCommitStats

        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        with timed_query("commit_trends"):
            # Build optimized query using composite indexes
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

        # Create lookup dictionary for database results
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

        return trends
