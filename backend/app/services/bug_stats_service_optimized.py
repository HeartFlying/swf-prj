"""Optimized bug statistics service with pagination support.

This module provides optimized versions of bug statistics queries
with pagination support for large datasets.
"""

from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BugRecord
from app.utils.pagination import (
    PaginationParams,
    PaginatedResult,
    create_paginated_response,
)
from app.utils.performance import timed_query


class OptimizedBugStatsService:
    """Optimized service for calculating bug statistics.

    This service provides methods with improved performance for large datasets,
    including pagination support and optimized SQL queries.
    """

    async def get_user_bugs_paginated(
        self,
        db: AsyncSession,
        user_id: int,
        start_date: date,
        end_date: date,
        params: PaginationParams,
        status: Optional[str] = None,
    ) -> PaginatedResult[BugRecord]:
        """Get paginated bug records for a user.

        Args:
            db: Database session
            user_id: User ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            params: Pagination parameters
            status: Optional status filter

        Returns:
            PaginatedResult with BugRecord objects
        """
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        query = (
            select(BugRecord)
            .where(BugRecord.assignee_id == user_id)
            .where(BugRecord.created_at >= start_datetime)
            .where(BugRecord.created_at <= end_datetime)
            .order_by(BugRecord.created_at.desc())
        )

        if status:
            query = query.where(BugRecord.status == status)

        items, total = await paginate_query(db, query, params)
        return create_paginated_response(items, total, params)

    async def get_project_bugs_paginated(
        self,
        db: AsyncSession,
        project_id: int,
        start_date: date,
        end_date: date,
        params: PaginationParams,
        severity: Optional[str] = None,
        status: Optional[str] = None,
    ) -> PaginatedResult[BugRecord]:
        """Get paginated bug records for a project.

        Args:
            db: Database session
            project_id: Project ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            params: Pagination parameters
            severity: Optional severity filter
            status: Optional status filter

        Returns:
            PaginatedResult with BugRecord objects
        """
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        query = (
            select(BugRecord)
            .where(BugRecord.project_id == project_id)
            .where(BugRecord.created_at >= start_datetime)
            .where(BugRecord.created_at <= end_datetime)
            .order_by(BugRecord.created_at.desc())
        )

        if severity:
            query = query.where(BugRecord.severity == severity)
        if status:
            query = query.where(BugRecord.status == status)

        items, total = await paginate_query(db, query, params)
        return create_paginated_response(items, total, params)

    async def get_bug_stats_by_user_optimized(
        self,
        db: AsyncSession,
        user_id: int,
        start_date: date,
        end_date: date,
    ) -> dict:
        """Get optimized bug statistics for a user.

        Uses a single query with conditional aggregation for better performance.

        Args:
            db: Database session
            user_id: User ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            Dictionary with aggregated statistics
        """
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        with timed_query("bug_stats_by_user"):
            result = await db.execute(
                select(
                    func.count(BugRecord.id).label("total_bugs"),
                    func.sum(func.cast(BugRecord.severity == "critical", func.Integer)).label("critical_bugs"),
                    func.sum(func.cast(BugRecord.severity == "major", func.Integer)).label("major_bugs"),
                    func.sum(func.cast(BugRecord.status.in_(["resolved", "closed"]), func.Integer)).label("resolved_bugs"),
                    func.sum(func.cast(BugRecord.status.in_(["new", "assigned", "active"]), func.Integer)).label("open_bugs"),
                    func.avg(
                        extract('epoch', BugRecord.resolved_at) - extract('epoch', BugRecord.created_at)
                    ).filter(BugRecord.resolved_at.isnot(None)).label("avg_resolution_seconds"),
                )
                .where(BugRecord.assignee_id == user_id)
                .where(BugRecord.created_at >= start_datetime)
                .where(BugRecord.created_at <= end_datetime)
            )

            row = result.one()

        avg_resolution_hours = (row.avg_resolution_seconds / 3600) if row.avg_resolution_seconds else 0.0

        return {
            "total_bugs": row.total_bugs or 0,
            "critical_bugs": row.critical_bugs or 0,
            "major_bugs": row.major_bugs or 0,
            "resolved_bugs": row.resolved_bugs or 0,
            "open_bugs": row.open_bugs or 0,
            "avg_resolution_hours": round(avg_resolution_hours, 2),
        }

    async def get_bug_stats_by_project_optimized(
        self,
        db: AsyncSession,
        project_id: int,
        start_date: date,
        end_date: date,
    ) -> dict:
        """Get optimized bug statistics for a project.

        Uses batch aggregation for better performance.

        Args:
            db: Database session
            project_id: Project ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            Dictionary with aggregated statistics
        """
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        with timed_query("bug_stats_by_project"):
            # Get total and status breakdown in one query
            status_result = await db.execute(
                select(
                    BugRecord.status,
                    func.count(BugRecord.id).label("count"),
                )
                .where(BugRecord.project_id == project_id)
                .where(BugRecord.created_at >= start_datetime)
                .where(BugRecord.created_at <= end_datetime)
                .group_by(BugRecord.status)
            )
            by_status = {row.status: row.count for row in status_result.all()}

            # Get severity breakdown
            severity_result = await db.execute(
                select(
                    BugRecord.severity,
                    func.count(BugRecord.id).label("count"),
                )
                .where(BugRecord.project_id == project_id)
                .where(BugRecord.created_at >= start_datetime)
                .where(BugRecord.created_at <= end_datetime)
                .group_by(BugRecord.severity)
            )
            by_severity = {row.severity: row.count for row in severity_result.all()}

        total_bugs = sum(by_status.values())
        resolved_bugs = by_status.get("resolved", 0) + by_status.get("closed", 0)
        open_bugs = (
            by_status.get("new", 0)
            + by_status.get("assigned", 0)
            + by_status.get("active", 0)
        )

        return {
            "total_bugs": total_bugs,
            "by_severity": by_severity,
            "by_status": by_status,
            "resolved_bugs": resolved_bugs,
            "open_bugs": open_bugs,
        }

    async def get_bug_trends_optimized(
        self,
        db: AsyncSession,
        project_id: Optional[int],
        days: int,
    ) -> list[dict]:
        """Get optimized daily bug trends.

        Args:
            db: AsyncSession
            project_id: Optional project ID to filter by
            days: Number of days to look back

        Returns:
            List of daily bug statistics dictionaries
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        # Build base conditions
        conditions = [
            BugRecord.created_at >= start_datetime,
            BugRecord.created_at <= end_datetime,
        ]
        if project_id is not None:
            conditions.append(BugRecord.project_id == project_id)

        with timed_query("bug_trends"):
            # Get created bugs by date
            created_result = await db.execute(
                select(
                    func.date(BugRecord.created_at).label("bug_date"),
                    func.count(BugRecord.id).label("count"),
                )
                .where(*conditions)
                .group_by(func.date(BugRecord.created_at))
            )

            def parse_date(date_val):
                if isinstance(date_val, str):
                    from datetime import datetime as dt
                    return dt.strptime(date_val, "%Y-%m-%d").date()
                return date_val

            created_by_date = {parse_date(row.bug_date): row.count for row in created_result.all()}

            # Get resolved bugs by date
            resolved_result = await db.execute(
                select(
                    func.date(BugRecord.resolved_at).label("bug_date"),
                    func.count(BugRecord.id).label("count"),
                )
                .where(BugRecord.resolved_at.isnot(None))
                .where(BugRecord.status.in_(["resolved", "closed"]))
                .where(*conditions)
                .group_by(func.date(BugRecord.resolved_at))
            )
            resolved_by_date = {parse_date(row.bug_date): row.count for row in resolved_result.all()}

        # Fill in the date range
        trends = []
        current = start_date
        while current <= end_date:
            trends.append({
                "date": current,
                "created": created_by_date.get(current, 0),
                "resolved": resolved_by_date.get(current, 0),
            })
            current += timedelta(days=1)

        return trends


async def paginate_query(
    session: AsyncSession,
    query: select,
    params: PaginationParams,
) -> tuple[list, int]:
    """Helper function to execute paginated query.

    Args:
        session: Database session
        query: SQLAlchemy select query
        params: Pagination parameters

    Returns:
        Tuple of (items list, total count)
    """
    from sqlalchemy import func

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    paginated_query = query.offset(params.offset).limit(params.limit)
    result = await session.execute(paginated_query)
    items = list(result.scalars().all())

    return items, total
