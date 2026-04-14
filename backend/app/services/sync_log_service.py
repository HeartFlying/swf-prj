"""Sync Log Service Module

Manages sync log operations using database persistence.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import SyncLog

logger = logging.getLogger(__name__)


class SyncLogService:
    """Service for managing sync log operations.

    Provides methods to create, query sync logs using
    the database for persistence.
    """

    async def create_log(
        self,
        db: AsyncSession,
        task_id: int,
        level: str,
        message: str,
        details: Optional[dict] = None,
    ) -> SyncLog:
        """Create a new sync log entry.

        Args:
            db: Database session
            task_id: ID of the associated sync task
            level: Log level (debug, info, warning, error, critical)
            message: Log message
            details: Optional additional details as dictionary

        Returns:
            Created SyncLog instance
        """
        log = SyncLog(
            task_id=task_id,
            level=level,
            message=message,
            details=details or {},
        )

        db.add(log)
        await db.commit()
        await db.refresh(log)

        return log

    async def list_logs(
        self,
        db: AsyncSession,
        task_id: Optional[int] = None,
        level: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[SyncLog]:
        """List sync logs with optional filtering.

        Args:
            db: Database session
            task_id: Optional task ID filter
            level: Optional log level filter
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            List of SyncLog instances
        """
        query = select(SyncLog)

        if task_id:
            query = query.where(SyncLog.task_id == task_id)
        if level:
            query = query.where(SyncLog.level == level)

        query = query.order_by(SyncLog.created_at.desc())
        query = query.limit(limit).offset(offset)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def count_logs(
        self,
        db: AsyncSession,
        task_id: Optional[int] = None,
        level: Optional[str] = None,
    ) -> int:
        """Count sync logs with optional filtering.

        Args:
            db: Database session
            task_id: Optional task ID filter
            level: Optional log level filter

        Returns:
            Total count of matching logs
        """
        query = select(func.count()).select_from(SyncLog)

        if task_id:
            query = query.where(SyncLog.task_id == task_id)
        if level:
            query = query.where(SyncLog.level == level)

        result = await db.execute(query)
        return result.scalar() or 0

    async def get_logs_by_task(
        self,
        db: AsyncSession,
        task_id: int,
        limit: int = 100,
    ) -> list[SyncLog]:
        """Get all logs for a specific task.

        Args:
            db: Database session
            task_id: Task ID to get logs for
            limit: Maximum number of results

        Returns:
            List of SyncLog instances for the task
        """
        return await self.list_logs(db, task_id=task_id, limit=limit)

    async def clear_old_logs(
        self,
        db: AsyncSession,
        days: int = 30,
    ) -> int:
        """Clear logs older than specified days.

        Args:
            db: Database session
            days: Number of days to keep logs for

        Returns:
            Number of logs deleted
        """
        from sqlalchemy import delete

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        query = (
            delete(SyncLog)
            .where(SyncLog.created_at < cutoff_date)
        )

        result = await db.execute(query)
        await db.commit()

        deleted_count = result.rowcount
        logger.info(f"Cleared {deleted_count} old sync logs (older than {days} days)")

        return deleted_count
