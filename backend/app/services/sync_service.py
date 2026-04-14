"""Sync Service Module

Main service for orchestrating data synchronization from external sources.
Provides high-level methods for creating and executing sync tasks.
"""

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.error_codes import ErrorCode
from app.core.exceptions import (
    AppException,
    NotFoundException,
)
from app.core.logging import get_logger
from app.db.models import Project, SyncTask
from app.services.data_source_interface import DataSourceInterface
from app.services.sync_task_service import SyncTaskService

logger = get_logger(__name__)


class SyncServiceError(AppException):
    """Base exception for sync service errors."""

    def __init__(
        self,
        message: str,
        code: ErrorCode = ErrorCode.SYNC_ERROR,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(
            message=message,
            status_code=500,
            code=code,
            details=details,
        )


class DataSourceNotFoundError(NotFoundException):
    """Raised when a data source is not found."""

    def __init__(self, source_type: str):
        # Override to provide custom message format expected by tests
        from app.core.exceptions import AppException

        AppException.__init__(
            self,
            message=f"Data source not found: {source_type}",
            status_code=404,
            code=ErrorCode.DATA_SOURCE_NOT_FOUND,
            details={"resource": "DataSource", "identifier": source_type},
        )


class SyncExecutionError(SyncServiceError):
    """Raised when sync execution fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code=ErrorCode.SYNC_EXECUTION_ERROR,
            details=details,
        )


class SyncTaskNotFoundError(NotFoundException):
    """Raised when a sync task is not found."""

    def __init__(self, task_id: int):
        # Override to provide custom message format
        from app.core.exceptions import AppException

        AppException.__init__(
            self,
            message=f"Sync task {task_id} not found",
            status_code=404,
            code=ErrorCode.SYNC_TASK_NOT_FOUND,
            details={"resource": "SyncTask", "identifier": task_id},
        )


class SyncService:
    """Main service for data synchronization.

    Orchestrates the sync process by:
    1. Creating sync tasks
    2. Executing data source operations
    3. Managing task lifecycle
    4. Handling errors and retries

    Example:
        sync_service = SyncService()

        # Create and execute a sync task
        task = await sync_service.create_task(
            db=db,
            task_type="incremental_sync",
            source_type="gitlab",
            project_id=1
        )

        result = await sync_service.execute_task(
            db=db,
            task_id=task.id,
            data_source=gitlab_data_source
        )
    """

    def __init__(self):
        """Initialize sync service."""
        self.task_service = SyncTaskService()
        self._data_sources: dict[str, DataSourceInterface] = {}

    def register_data_source(
        self, source_type: str, data_source: DataSourceInterface
    ) -> None:
        """Register a data source for use in sync operations.

        Args:
            source_type: Type identifier for the data source
            data_source: Data source implementation instance
        """
        self._data_sources[source_type] = data_source
        logger.info(f"Registered data source: {source_type}")

    def get_data_source(self, source_type: str) -> DataSourceInterface:
        """Get a registered data source.

        Args:
            source_type: Type identifier for the data source

        Returns:
            Data source implementation instance

        Raises:
            DataSourceNotFoundError: If data source not registered
        """
        if source_type not in self._data_sources:
            raise DataSourceNotFoundError(source_type)
        return self._data_sources[source_type]

    async def create_task(
        self,
        db: AsyncSession,
        task_type: str,
        source_type: str,
        project_id: Optional[int] = None,
        user_id: Optional[int] = None,
        created_by: Optional[str] = None,
    ) -> SyncTask:
        """Create a new sync task.

        Args:
            db: Database session
            task_type: Type of sync (full_sync, incremental_sync, config_sync)
            source_type: Data source type (gitlab, trae, zendao)
            project_id: Optional project ID for project-specific sync
            user_id: Optional user ID for user-specific sync
            created_by: Optional username of task creator

        Returns:
            Created SyncTask instance
        """
        return await self.task_service.create_task(
            db=db,
            task_type=task_type,
            source_type=source_type,
            project_id=project_id,
            user_id=user_id,
            created_by=created_by,
        )

    async def execute_task(
        self,
        db: AsyncSession,
        task_id: int,
        data_source: Optional[DataSourceInterface] = None,
        **kwargs: Any,
    ) -> dict:
        """Execute a sync task.

        Args:
            db: Database session
            task_id: ID of the task to execute
            data_source: Optional data source instance (if not provided, will be looked up)
            **kwargs: Additional parameters passed to data source

        Returns:
            Sync result summary

        Raises:
            SyncTaskNotFoundError: If task not found
            SyncExecutionError: If task execution fails
        """
        # Get task
        task = await self.task_service.get_task(db, task_id)
        if not task:
            raise SyncExecutionError(f"Sync task {task_id} not found")

        # Get data source
        if data_source is None:
            data_source = self.get_data_source(task.source_type)

        # Mark task as started
        await self.task_service.start_task(db, task_id)

        try:
            # Determine sync parameters
            sync_params = await self._prepare_sync_params(
                db=db,
                task=task,
                **kwargs,
            )

            # Execute sync
            result = await data_source.sync(db=db, **sync_params)

            # Mark task as completed
            await self.task_service.complete_task(
                db=db,
                task_id=task_id,
                records_processed=result.get("processed", 0),
                records_failed=result.get("failed", 0),
                error_message="; ".join(result.get("errors", []))
                if result.get("errors")
                else None,
            )

            logger.info(
                f"Sync task {task_id} completed: "
                f"processed={result.get('processed', 0)}, "
                f"failed={result.get('failed', 0)}"
            )

            return result

        except Exception as e:
            logger.exception(f"Sync task {task_id} failed: {e}")

            # Mark task as failed
            await self.task_service.fail_task(
                db=db,
                task_id=task_id,
                error_message=str(e),
            )

            if isinstance(e, AppException):
                raise

            raise SyncExecutionError(
                message=f"Sync task {task_id} failed: {e}",
                details={"task_id": task_id, "source_type": task.source_type},
            ) from e

    async def _prepare_sync_params(
        self,
        db: AsyncSession,
        task: SyncTask,
        **kwargs: Any,
    ) -> dict:
        """Prepare sync parameters based on task type.

        Args:
            db: Database session
            task: Sync task instance
            **kwargs: Additional parameters

        Returns:
            Dictionary of sync parameters
        """
        params = {
            "project_id": task.project_id,
        }

        # For incremental sync, determine 'since' timestamp
        if task.task_type == "incremental_sync":
            since = await self._get_last_sync_time(db, task)
            if since:
                params["since"] = since

        # Override with any provided kwargs
        params.update(kwargs)

        return params

    async def _get_last_sync_time(
        self, db: AsyncSession, task: SyncTask
    ) -> Optional[datetime]:
        """Get the last successful sync time for incremental sync.

        Prioritizes project.last_sync_at fields over task completed_at.

        Args:
            db: Database session
            task: Current sync task

        Returns:
            Last successful sync datetime or None
        """
        # First, check if task has a project_id
        if task.project_id:
            # Query Project table to get the specific last_sync_at field
            result = await db.execute(
                select(Project).where(Project.id == task.project_id)
            )
            project = result.scalar_one_or_none()

            if project:
                # Select the appropriate field based on source_type
                sync_time = None
                if task.source_type == "gitlab":
                    sync_time = project.gitlab_last_sync_at
                elif task.source_type == "zendao":
                    sync_time = project.zendao_last_sync_at
                else:
                    sync_time = project.last_sync_at

                # If the field has a value, return it directly
                if sync_time:
                    return sync_time

        # Fall back to querying recent completed tasks
        recent_tasks = await self.task_service.list_tasks(
            db=db,
            status="completed",
            source_type=task.source_type,
            project_id=task.project_id,
            limit=1,
        )

        if recent_tasks:
            return recent_tasks[0].completed_at

        return None

    async def sync_project(
        self,
        db: AsyncSession,
        project_id: int,
        source_type: str,
        sync_type: str = "incremental_sync",
        created_by: Optional[str] = None,
    ) -> dict:
        """High-level method to sync a project from a specific source.

        Args:
            db: Database session
            project_id: Project ID to sync
            source_type: Data source type
            sync_type: Sync type (full_sync or incremental_sync)
            created_by: Optional username of creator

        Returns:
            Sync result summary
        """
        # Create task
        task = await self.create_task(
            db=db,
            task_type=sync_type,
            source_type=source_type,
            project_id=project_id,
            created_by=created_by,
        )

        # Execute task
        # Note: Data sources are responsible for updating project.last_sync_at
        # and source-specific timestamps (e.g., gitlab_last_sync_at)
        result = await self.execute_task(db=db, task_id=task.id)

        return result

    async def _update_project_sync_timestamp(
        self,
        db: AsyncSession,
        project_id: int,
        source_type: str,
    ) -> None:
        """Update project sync timestamp fields after successful sync.

        Args:
            db: Database session
            project_id: Project ID to update
            source_type: Data source type (gitlab, zendao, etc.)
        """
        # Get project
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()

        if not project:
            logger.warning(f"Project {project_id} not found, cannot update sync timestamp")
            return

        # Update timestamps
        now = datetime.now(timezone.utc)
        project.last_sync_at = now

        # Update source-specific timestamp
        if source_type == "gitlab":
            project.gitlab_last_sync_at = now
        elif source_type == "zendao":
            project.zendao_last_sync_at = now

        await db.commit()
        logger.info(
            f"Updated sync timestamp for project {project_id} "
            f"(source: {source_type}): {now.isoformat()}"
        )

    async def get_task_status(self, db: AsyncSession, task_id: int) -> Optional[dict]:
        """Get the status of a sync task.

        Args:
            db: Database session
            task_id: Task ID to check

        Returns:
            Task status dictionary or None if not found
        """
        task = await self.task_service.get_task(db, task_id)
        if not task:
            return None

        # Calculate progress based on records_processed (assuming some total)
        # For now, return None if task is pending/running, 100 if completed, 0 if failed
        progress = None
        if task.status == "completed":
            progress = 100
        elif task.status == "failed":
            progress = 0
        elif task.status == "running":
            # Could calculate based on records_processed vs estimated total
            progress = None  # Unknown until we have total estimate

        return {
            "id": task.id,
            "task_type": task.task_type,
            "source_type": task.source_type,
            "status": task.status,
            "project_id": task.project_id,
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat()
            if task.completed_at
            else None,
            "records_processed": task.records_processed,
            "records_failed": task.records_failed,
            "error_message": task.error_message,
            "created_at": task.created_at.isoformat(),
            # Frontend compatibility fields
            "user_id": None,  # created_by is string username, not user_id
            "progress": progress,
        }

    async def list_recent_tasks(
        self,
        db: AsyncSession,
        source_type: Optional[str] = None,
        hours: int = 24,
    ) -> list[dict]:
        """List recent sync tasks.

        Args:
            db: Database session
            source_type: Optional source type filter
            hours: Number of hours to look back

        Returns:
            List of task status dictionaries
        """
        tasks = await self.task_service.get_recent_tasks(
            db=db,
            source_type=source_type,
            hours=hours,
        )

        return [
            {
                "id": task.id,
                "task_type": task.task_type,
                "source_type": task.source_type,
                "status": task.status,
                "records_processed": task.records_processed,
                "records_failed": task.records_failed,
                "created_at": task.created_at.isoformat(),
            }
            for task in tasks
        ]
