"""Sync Task Service Module

Manages sync task lifecycle using database persistence.
Replaces the previous in-memory storage with proper database records.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.error_codes import ErrorCode
from app.core.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)
from app.core.logging import get_logger
from app.db.models import SyncTask

logger = get_logger(__name__)


class SyncTaskNotFoundError(ValueError):
    """Raised when a sync task is not found."""

    def __init__(self, task_id: int):
        super().__init__(f"Sync task {task_id} not found")


class SyncTaskInvalidStateError(ValueError):
    """Raised when a sync task is in an invalid state for an operation."""

    def __init__(self, task_id: int, current_status: str, expected_status: str):
        super().__init__(
            f"Cannot cancel task with status {current_status}"
        )


class SyncTaskService:
    """Service for managing sync task lifecycle.

    Provides methods to create, update, and query sync tasks using
    the database for persistence.
    """

    async def create_task(
        self,
        db: AsyncSession,
        task_type: str,
        source_type: str,
        project_id: Optional[int] = None,
        user_id: Optional[int] = None,
        parent_task_id: Optional[int] = None,
        created_by: Optional[str] = None,
    ) -> SyncTask:
        """Create a new sync task.

        Args:
            db: Database session
            task_type: Type of sync task (full_sync, incremental_sync, config_sync)
            source_type: Data source type (gitlab, trae, zendao)
            project_id: Optional project ID for project-specific sync
            user_id: Optional user ID for user-specific sync
            parent_task_id: Optional parent task ID for child tasks
            created_by: Optional username of task creator

        Returns:
            Created SyncTask instance

        Raises:
            ValidationException: If task_type or source_type is invalid
        """
        # Validate task type
        valid_task_types = ["full_sync", "incremental_sync", "config_sync"]
        if task_type not in valid_task_types:
            raise ValidationException(
                message=f"Invalid task_type: {task_type}. Must be one of: {valid_task_types}",
                field="task_type",
                code=ErrorCode.INVALID_INPUT,
            )

        # Validate source type (allow test sources for testing)
        valid_source_types = ["gitlab", "trae", "zendao", "failing", "test_source"]
        if source_type not in valid_source_types:
            raise ValidationException(
                message=f"Invalid source_type: {source_type}. Must be one of: {valid_source_types}",
                field="source_type",
                code=ErrorCode.INVALID_INPUT,
            )

        task = SyncTask(
            task_type=task_type,
            source_type=source_type,
            project_id=project_id,
            parent_task_id=parent_task_id,
            status="pending",
            records_processed=0,
            records_failed=0,
            created_by=created_by,
        )

        db.add(task)
        await db.commit()
        await db.refresh(task)

        logger.info(
            f"Created sync task: id={task.id}, type={task_type}, "
            f"source={source_type}, project={project_id}"
        )

        return task

    async def start_task(self, db: AsyncSession, task_id: int) -> SyncTask:
        """Mark a task as started.

        Args:
            db: Database session
            task_id: ID of the task to start

        Returns:
            Updated SyncTask instance

        Raises:
            SyncTaskNotFoundError: If task not found
            SyncTaskInvalidStateError: If task is not in pending state
        """
        task = await self.get_task(db, task_id)
        if not task:
            raise SyncTaskNotFoundError(task_id)

        if task.status != "pending":
            raise SyncTaskInvalidStateError(
                task_id=task_id,
                current_status=task.status,
                expected_status="pending",
            )

        task.status = "running"
        task.started_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(task)

        logger.info(f"Started sync task: id={task_id}")

        return task

    async def complete_task(
        self,
        db: AsyncSession,
        task_id: int,
        records_processed: int = 0,
        records_failed: int = 0,
        error_message: Optional[str] = None,
    ) -> SyncTask:
        """Mark a task as completed.

        Args:
            db: Database session
            task_id: ID of the task to complete
            records_processed: Number of records successfully processed
            records_failed: Number of records that failed
            error_message: Optional error message if task partially failed

        Returns:
            Updated SyncTask instance

        Raises:
            SyncTaskNotFoundError: If task not found
            SyncTaskInvalidStateError: If task is not in running state
        """
        task = await self.get_task(db, task_id)
        if not task:
            raise SyncTaskNotFoundError(task_id)

        if task.status != "running":
            raise SyncTaskInvalidStateError(
                task_id=task_id,
                current_status=task.status,
                expected_status="running",
            )

        task.status = "completed" if records_failed == 0 else "failed"
        task.completed_at = datetime.now(timezone.utc)
        task.records_processed = records_processed
        task.records_failed = records_failed
        task.error_message = error_message

        await db.commit()
        await db.refresh(task)

        logger.info(
            f"Completed sync task: id={task_id}, "
            f"processed={records_processed}, failed={records_failed}"
        )

        return task

    async def fail_task(
        self,
        db: AsyncSession,
        task_id: int,
        error_message: str,
    ) -> SyncTask:
        """Mark a task as failed.

        Args:
            db: Database session
            task_id: ID of the task to fail
            error_message: Error message describing the failure

        Returns:
            Updated SyncTask instance

        Raises:
            SyncTaskNotFoundError: If task not found
        """
        task = await self.get_task(db, task_id)
        if not task:
            raise SyncTaskNotFoundError(task_id)

        task.status = "failed"
        task.completed_at = datetime.now(timezone.utc)
        task.error_message = error_message

        await db.commit()
        await db.refresh(task)

        logger.error(f"Failed sync task: id={task_id}, error={error_message}")

        return task

    async def cancel_task(self, db: AsyncSession, task_id: int) -> SyncTask:
        """Cancel a pending or running task.

        Args:
            db: Database session
            task_id: ID of the task to cancel

        Returns:
            Updated SyncTask instance

        Raises:
            SyncTaskNotFoundError: If task not found
            SyncTaskInvalidStateError: If task cannot be cancelled
        """
        task = await self.get_task(db, task_id)
        if not task:
            raise SyncTaskNotFoundError(task_id)

        if task.status not in ["pending", "running"]:
            raise SyncTaskInvalidStateError(
                task_id=task_id,
                current_status=task.status,
                expected_status="pending or running",
            )

        task.status = "cancelled"
        task.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(task)

        logger.info(f"Cancelled sync task: id={task_id}")

        return task

    async def get_task(self, db: AsyncSession, task_id: int) -> Optional[SyncTask]:
        """Get a task by ID.

        Args:
            db: Database session
            task_id: ID of the task to retrieve

        Returns:
            SyncTask instance or None if not found
        """
        result = await db.execute(select(SyncTask).where(SyncTask.id == task_id))
        return result.scalar_one_or_none()

    async def list_tasks(
        self,
        db: AsyncSession,
        status: Optional[str] = None,
        source_type: Optional[str] = None,
        project_id: Optional[int] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[SyncTask]:
        """List sync tasks with optional filtering.

        Args:
            db: Database session
            status: Optional status filter
            source_type: Optional source type filter
            project_id: Optional project ID filter
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            List of SyncTask instances
        """
        query = select(SyncTask)

        if status:
            query = query.where(SyncTask.status == status)
        if source_type:
            query = query.where(SyncTask.source_type == source_type)
        if project_id:
            query = query.where(SyncTask.project_id == project_id)

        query = query.order_by(SyncTask.created_at.desc())
        query = query.limit(limit).offset(offset)

        result = await db.execute(query)
        return result.scalars().all()

    async def get_recent_tasks(
        self,
        db: AsyncSession,
        source_type: Optional[str] = None,
        hours: int = 24,
    ) -> list[SyncTask]:
        """Get tasks created within the last N hours.

        Args:
            db: Database session
            source_type: Optional source type filter
            hours: Number of hours to look back

        Returns:
            List of SyncTask instances
        """
        since = datetime.now(timezone.utc) - timedelta(hours=hours)

        query = select(SyncTask).where(SyncTask.created_at >= since)

        if source_type:
            query = query.where(SyncTask.source_type == source_type)

        query = query.order_by(SyncTask.created_at.desc())

        result = await db.execute(query)
        return result.scalars().all()
