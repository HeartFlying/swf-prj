"""Bug statistics service for calculating issue tracking metrics.

This service provides real database-backed statistics for bug records,
replacing mock data with actual SQL queries.
"""

import time
from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import BugRecord

logger = get_logger(__name__)


class UserBugStats:
    """User bug statistics data class."""

    def __init__(
        self,
        total_bugs: int,
        critical_bugs: int,
        major_bugs: int,
        resolved_bugs: int,
        open_bugs: int,
        avg_resolution_hours: float,
    ):
        self.total_bugs = total_bugs
        self.critical_bugs = critical_bugs
        self.major_bugs = major_bugs
        self.resolved_bugs = resolved_bugs
        self.open_bugs = open_bugs
        self.avg_resolution_hours = avg_resolution_hours


class ProjectBugStats:
    """Project bug statistics data class."""

    def __init__(
        self,
        total_bugs: int,
        by_severity: dict[str, int],
        by_status: dict[str, int],
        by_priority: dict[str, int],
        resolved_bugs: int,
        open_bugs: int,
    ):
        self.total_bugs = total_bugs
        self.by_severity = by_severity
        self.by_status = by_status
        self.by_priority = by_priority
        self.resolved_bugs = resolved_bugs
        self.open_bugs = open_bugs


class BugRateResult:
    """Bug rate calculation result data class."""

    def __init__(
        self,
        bug_rate: float,
        bugs_per_1000_lines: float,
        total_bugs: int,
        total_commits: int,
        trend: str,
    ):
        self.bug_rate = bug_rate
        self.bugs_per_1000_lines = bugs_per_1000_lines
        self.total_bugs = total_bugs
        self.total_commits = total_commits
        self.trend = trend


class DailyBugStats:
    """Daily bug statistics data class."""

    def __init__(
        self,
        date: date,
        created: int,
        resolved: int,
        closed: int,
    ):
        self.date = date
        self.created = created
        self.resolved = resolved
        self.closed = closed


class BugStatsService:
    """Service for calculating bug statistics.

    This service provides methods to query and aggregate bug record data
    from the database, supporting user-level, project-level, and global statistics.
    """

    async def get_bug_stats_by_user(
        self,
        db: AsyncSession,
        user_id: int,
        start_date: date,
        end_date: date,
    ) -> UserBugStats:
        """Get bug statistics for a user within a date range.

        Args:
            db: Database session
            user_id: User ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            UserBugStats with aggregated statistics
        """
        start_time = time.time()
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        # Get total bugs assigned to user
        total_result = await db.execute(
            select(func.count(BugRecord.id))
            .where(BugRecord.assignee_id == user_id)
            .where(BugRecord.created_at >= start_datetime)
            .where(BugRecord.created_at <= end_datetime)
        )
        total_bugs = total_result.scalar() or 0

        # Get critical bugs
        critical_result = await db.execute(
            select(func.count(BugRecord.id))
            .where(BugRecord.assignee_id == user_id)
            .where(BugRecord.severity == "critical")
            .where(BugRecord.created_at >= start_datetime)
            .where(BugRecord.created_at <= end_datetime)
        )
        critical_bugs = critical_result.scalar() or 0

        # Get major bugs
        major_result = await db.execute(
            select(func.count(BugRecord.id))
            .where(BugRecord.assignee_id == user_id)
            .where(BugRecord.severity == "major")
            .where(BugRecord.created_at >= start_datetime)
            .where(BugRecord.created_at <= end_datetime)
        )
        major_bugs = major_result.scalar() or 0

        # Get resolved bugs
        resolved_result = await db.execute(
            select(func.count(BugRecord.id))
            .where(BugRecord.assignee_id == user_id)
            .where(BugRecord.status.in_(["resolved", "closed"]))
            .where(BugRecord.created_at >= start_datetime)
            .where(BugRecord.created_at <= end_datetime)
        )
        resolved_bugs = resolved_result.scalar() or 0

        # Get open bugs
        open_result = await db.execute(
            select(func.count(BugRecord.id))
            .where(BugRecord.assignee_id == user_id)
            .where(BugRecord.status.in_(["new", "assigned", "active"]))
            .where(BugRecord.created_at >= start_datetime)
            .where(BugRecord.created_at <= end_datetime)
        )
        open_bugs = open_result.scalar() or 0

        # Calculate average resolution time for resolved bugs
        # Using extract('epoch' ...) for PostgreSQL compatibility
        avg_resolution_result = await db.execute(
            select(
                func.avg(
                    extract('epoch', BugRecord.resolved_at) - extract('epoch', BugRecord.created_at)
                ).label("avg_seconds")
            )
            .where(BugRecord.assignee_id == user_id)
            .where(BugRecord.status.in_(["resolved", "closed"]))
            .where(BugRecord.resolved_at.isnot(None))
            .where(BugRecord.created_at >= start_datetime)
            .where(BugRecord.created_at <= end_datetime)
        )

        avg_seconds = avg_resolution_result.scalar()
        avg_resolution_hours = (avg_seconds / 3600) if avg_seconds else 0.0

        stats = UserBugStats(
            total_bugs=total_bugs,
            critical_bugs=critical_bugs,
            major_bugs=major_bugs,
            resolved_bugs=resolved_bugs,
            open_bugs=open_bugs,
            avg_resolution_hours=round(avg_resolution_hours, 2),
        )

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "Calculated user bug stats",
            user_id=user_id,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            total_bugs=total_bugs,
            duration_ms=duration_ms,
        )

        return stats

    async def get_bug_stats_by_project(
        self,
        db: AsyncSession,
        project_id: int,
        start_date: date,
        end_date: date,
    ) -> ProjectBugStats:
        """Get bug statistics for a project within a date range.

        Args:
            db: Database session
            project_id: Project ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            ProjectBugStats with aggregated statistics
        """
        start_time = time.time()
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        # Get total bugs
        total_result = await db.execute(
            select(func.count(BugRecord.id))
            .where(BugRecord.project_id == project_id)
            .where(BugRecord.created_at >= start_datetime)
            .where(BugRecord.created_at <= end_datetime)
        )
        total_bugs = total_result.scalar() or 0

        # Get bugs by severity
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

        # Get bugs by status
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

        # Get bugs by priority
        priority_result = await db.execute(
            select(
                BugRecord.priority,
                func.count(BugRecord.id).label("count"),
            )
            .where(BugRecord.project_id == project_id)
            .where(BugRecord.created_at >= start_datetime)
            .where(BugRecord.created_at <= end_datetime)
            .where(BugRecord.priority.isnot(None))
            .group_by(BugRecord.priority)
        )
        by_priority = {row.priority: row.count for row in priority_result.all()}

        # Get resolved bugs
        resolved_bugs = by_status.get("resolved", 0) + by_status.get("closed", 0)

        # Get open bugs
        open_bugs = (
            by_status.get("new", 0)
            + by_status.get("assigned", 0)
            + by_status.get("active", 0)
        )

        stats = ProjectBugStats(
            total_bugs=total_bugs,
            by_severity=by_severity,
            by_status=by_status,
            by_priority=by_priority,
            resolved_bugs=resolved_bugs,
            open_bugs=open_bugs,
        )

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "Calculated project bug stats",
            project_id=project_id,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            total_bugs=total_bugs,
            duration_ms=duration_ms,
        )

        return stats

    async def calculate_bug_rate(
        self,
        db: AsyncSession,
        project_id: int,
        days: int = 30,
    ) -> BugRateResult:
        """Calculate bug rate for a project.

        Args:
            db: Database session
            project_id: Project ID to filter by
            days: Number of days to analyze

        Returns:
            BugRateResult with bug rate metrics
        """
        from app.db.models import CodeCommit

        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # Get total bugs in period
        bug_result = await db.execute(
            select(func.count(BugRecord.id))
            .where(BugRecord.project_id == project_id)
            .where(BugRecord.created_at >= start_date)
            .where(BugRecord.created_at <= end_date)
        )
        total_bugs = bug_result.scalar() or 0

        # Get total commits in period
        commit_result = await db.execute(
            select(func.count(CodeCommit.id))
            .where(CodeCommit.project_id == project_id)
            .where(CodeCommit.commit_time >= start_date)
            .where(CodeCommit.commit_time <= end_date)
        )
        total_commits = commit_result.scalar() or 0

        # Calculate bug rate (bugs per commit)
        bug_rate = round(total_bugs / total_commits, 4) if total_commits > 0 else 0.0

        # Calculate bugs per 1000 lines (estimated from commits)
        # Assuming average 100 lines per commit
        estimated_lines = total_commits * 100
        bugs_per_1000_lines = (
            round((total_bugs / estimated_lines) * 1000, 2)
            if estimated_lines > 0
            else 0.0
        )

        # Determine trend by comparing with previous period
        prev_start = start_date - timedelta(days=days)
        prev_bug_result = await db.execute(
            select(func.count(BugRecord.id))
            .where(BugRecord.project_id == project_id)
            .where(BugRecord.created_at >= prev_start)
            .where(BugRecord.created_at < start_date)
        )
        prev_bugs = prev_bug_result.scalar() or 0

        if total_bugs < prev_bugs:
            trend = "improving"
        elif total_bugs > prev_bugs:
            trend = "worsening"
        else:
            trend = "stable"

        return BugRateResult(
            bug_rate=bug_rate,
            bugs_per_1000_lines=bugs_per_1000_lines,
            total_bugs=total_bugs,
            total_commits=total_commits,
            trend=trend,
        )

    async def get_bug_trends(
        self,
        db: AsyncSession,
        project_id: Optional[int],
        days: int,
    ) -> list[DailyBugStats]:
        """Get daily bug trends for the specified number of days.

        Args:
            db: Database session
            project_id: Optional project ID to filter by
            days: Number of days to look back

        Returns:
            List of DailyBugStats objects
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

        # Get created bugs by date
        created_result = await db.execute(
            select(
                func.date(BugRecord.created_at).label("bug_date"),
                func.count(BugRecord.id).label("count"),
            )
            .where(*conditions)
            .group_by(func.date(BugRecord.created_at))
        )
        # Convert string dates from SQLite to date objects
        def parse_date(date_val):
            if isinstance(date_val, str):
                from datetime import datetime as dt
                return dt.strptime(date_val, "%Y-%m-%d").date()
            return date_val

        created_by_date = {parse_date(row.bug_date): row.count for row in created_result.all()}

        # Get resolved bugs by date
        resolved_conditions = conditions.copy()
        resolved_result = await db.execute(
            select(
                func.date(BugRecord.resolved_at).label("bug_date"),
                func.count(BugRecord.id).label("count"),
            )
            .where(BugRecord.resolved_at.isnot(None))
            .where(BugRecord.status.in_(["resolved", "closed"]))
            .where(*resolved_conditions)
            .group_by(func.date(BugRecord.resolved_at))
        )
        resolved_by_date = {parse_date(row.bug_date): row.count for row in resolved_result.all()}

        # Get closed bugs by date
        closed_conditions = conditions.copy()
        closed_result = await db.execute(
            select(
                func.date(BugRecord.closed_at).label("bug_date"),
                func.count(BugRecord.id).label("count"),
            )
            .where(BugRecord.closed_at.isnot(None))
            .where(*closed_conditions)
            .group_by(func.date(BugRecord.closed_at))
        )
        closed_by_date = {parse_date(row.bug_date): row.count for row in closed_result.all()}

        # Fill in the date range
        trends = []
        current = start_date
        while current <= end_date:
            trends.append(
                DailyBugStats(
                    date=current,
                    created=created_by_date.get(current, 0),
                    resolved=resolved_by_date.get(current, 0),
                    closed=closed_by_date.get(current, 0),
                )
            )
            current += timedelta(days=1)

        return trends

    async def get_user_bug_summary(
        self,
        db: AsyncSession,
        user_id: int,
        project_id: Optional[int] = None,
    ) -> dict:
        """Get a summary of bugs for a user.

        Args:
            db: Database session
            user_id: User ID to filter by
            project_id: Optional project ID to filter by

        Returns:
            Dictionary with bug summary data
        """
        # Build conditions
        conditions = [BugRecord.assignee_id == user_id]
        if project_id is not None:
            conditions.append(BugRecord.project_id == project_id)

        # Get total bugs
        total_result = await db.execute(
            select(func.count(BugRecord.id)).where(*conditions)
        )
        total_bugs = total_result.scalar() or 0

        # Get critical bugs
        critical_result = await db.execute(
            select(func.count(BugRecord.id))
            .where(*conditions)
            .where(BugRecord.severity == "critical")
        )
        critical_bugs = critical_result.scalar() or 0

        # Get resolved bugs
        resolved_result = await db.execute(
            select(func.count(BugRecord.id))
            .where(*conditions)
            .where(BugRecord.status.in_(["resolved", "closed"]))
        )
        resolved_bugs = resolved_result.scalar() or 0

        return {
            "total_bugs": total_bugs,
            "critical_bugs": critical_bugs,
            "resolved_bugs": resolved_bugs,
        }
