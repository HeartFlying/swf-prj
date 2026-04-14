"""Tests for SyncTaskService.

TDD Red Phase: Write tests before implementation.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

# Use 'session' fixture from conftest.py
# Rename 'db' to 'session' in all test methods

from app.services.sync_task_service import SyncTaskService


@pytest.fixture
def sync_task_service():
    """Fixture for SyncTaskService instance."""
    return SyncTaskService()


class TestSyncTaskService:
    """Test cases for SyncTaskService."""

    async def test_create_task(self, session: AsyncSession, sync_task_service):
        """Test creating a new sync task."""
        # Act
        task = await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
            project_id=1,
            created_by="admin",
        )

        # Assert
        assert task.id is not None
        assert task.task_type == "full_sync"
        assert task.source_type == "gitlab"
        assert task.project_id == 1
        assert task.status == "pending"
        assert task.records_processed == 0
        assert task.records_failed == 0
        assert task.created_by == "admin"
        assert task.created_at is not None

    async def test_start_task(self, session: AsyncSession, sync_task_service):
        """Test starting a sync task."""
        # Arrange
        task = await sync_task_service.create_task(
            db=session,
            task_type="incremental_sync",
            source_type="trae",
        )

        # Act
        started_task = await sync_task_service.start_task(session, task.id)

        # Assert
        assert started_task.status == "running"
        assert started_task.started_at is not None

    async def test_start_task_not_found(self, session: AsyncSession, sync_task_service):
        """Test starting a non-existent task raises error."""
        # Act & Assert
        with pytest.raises(ValueError, match="Sync task 99999 not found"):
            await sync_task_service.start_task(session, 99999)

    async def test_complete_task_success(self, session: AsyncSession, sync_task_service):
        """Test completing a successful sync task."""
        # Arrange
        task = await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )
        await sync_task_service.start_task(session, task.id)

        # Act
        completed_task = await sync_task_service.complete_task(
            db=session,
            task_id=task.id,
            records_processed=100,
            records_failed=0,
        )

        # Assert
        assert completed_task.status == "completed"
        assert completed_task.records_processed == 100
        assert completed_task.records_failed == 0
        assert completed_task.completed_at is not None
        assert completed_task.error_message is None

    async def test_complete_task_with_failures(self, session: AsyncSession, sync_task_service):
        """Test completing a sync task with some failures."""
        # Arrange
        task = await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )
        await sync_task_service.start_task(session, task.id)

        # Act
        completed_task = await sync_task_service.complete_task(
            db=session,
            task_id=task.id,
            records_processed=90,
            records_failed=10,
            error_message="Some records failed to process",
        )

        # Assert
        assert completed_task.status == "failed"
        assert completed_task.records_processed == 90
        assert completed_task.records_failed == 10
        assert completed_task.error_message == "Some records failed to process"

    async def test_fail_task(self, session: AsyncSession, sync_task_service):
        """Test marking a task as failed."""
        # Arrange
        task = await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="zendao",
        )
        await sync_task_service.start_task(session, task.id)

        # Act
        failed_task = await sync_task_service.fail_task(
            db=session,
            task_id=task.id,
            error_message="Connection timeout",
        )

        # Assert
        assert failed_task.status == "failed"
        assert failed_task.error_message == "Connection timeout"
        assert failed_task.completed_at is not None

    async def test_cancel_task_pending(self, session: AsyncSession, sync_task_service):
        """Test cancelling a pending task."""
        # Arrange
        task = await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )

        # Act
        cancelled_task = await sync_task_service.cancel_task(session, task.id)

        # Assert
        assert cancelled_task.status == "cancelled"
        assert cancelled_task.completed_at is not None

    async def test_cancel_task_running(self, session: AsyncSession, sync_task_service):
        """Test cancelling a running task."""
        # Arrange
        task = await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )
        await sync_task_service.start_task(session, task.id)

        # Act
        cancelled_task = await sync_task_service.cancel_task(session, task.id)

        # Assert
        assert cancelled_task.status == "cancelled"

    async def test_cancel_task_completed_raises_error(self, session: AsyncSession, sync_task_service):
        """Test cancelling a completed task raises error."""
        # Arrange
        task = await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )
        await sync_task_service.start_task(session, task.id)
        await sync_task_service.complete_task(session, task.id, records_processed=10)

        # Act & Assert
        with pytest.raises(ValueError, match="Cannot cancel task with status completed"):
            await sync_task_service.cancel_task(session, task.id)

    async def test_get_task(self, session: AsyncSession, sync_task_service):
        """Test getting a task by ID."""
        # Arrange
        created_task = await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )

        # Act
        fetched_task = await sync_task_service.get_task(session, created_task.id)

        # Assert
        assert fetched_task is not None
        assert fetched_task.id == created_task.id
        assert fetched_task.task_type == "full_sync"

    async def test_get_task_not_found(self, session: AsyncSession, sync_task_service):
        """Test getting a non-existent task returns None."""
        # Act
        task = await sync_task_service.get_task(session, 99999)

        # Assert
        assert task is None

    async def test_list_tasks(self, session: AsyncSession, sync_task_service):
        """Test listing tasks."""
        # Arrange
        for i in range(5):
            await sync_task_service.create_task(
                db=session,
                task_type="full_sync",
                source_type="gitlab",
                project_id=i + 1,
            )

        # Act
        tasks = await sync_task_service.list_tasks(session, limit=10)

        # Assert
        assert len(tasks) == 5

    async def test_list_tasks_with_status_filter(self, session: AsyncSession, sync_task_service):
        """Test listing tasks with status filter."""
        # Arrange
        task1 = await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )
        await sync_task_service.start_task(session, task1.id)

        task2 = await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="trae",
        )

        # Act
        running_tasks = await sync_task_service.list_tasks(session, status="running")
        pending_tasks = await sync_task_service.list_tasks(session, status="pending")

        # Assert
        assert len(running_tasks) == 1
        assert len(pending_tasks) == 1

    async def test_list_tasks_with_source_filter(self, session: AsyncSession, sync_task_service):
        """Test listing tasks with source type filter."""
        # Arrange
        await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )
        await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="trae",
        )

        # Act
        gitlab_tasks = await sync_task_service.list_tasks(session, source_type="gitlab")

        # Assert
        assert len(gitlab_tasks) == 1
        assert gitlab_tasks[0].source_type == "gitlab"

    async def test_list_tasks_pagination(self, session: AsyncSession, sync_task_service):
        """Test task list pagination."""
        # Arrange
        for i in range(10):
            await sync_task_service.create_task(
                db=session,
                task_type="full_sync",
                source_type="gitlab",
            )

        # Act
        page1 = await sync_task_service.list_tasks(session, limit=5, offset=0)
        page2 = await sync_task_service.list_tasks(session, limit=5, offset=5)

        # Assert
        assert len(page1) == 5
        assert len(page2) == 5

    async def test_get_recent_tasks(self, session: AsyncSession, sync_task_service):
        """Test getting recent tasks."""
        # Arrange
        await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )

        # Act
        recent_tasks = await sync_task_service.get_recent_tasks(session, hours=24)

        # Assert
        assert len(recent_tasks) >= 1

    async def test_get_recent_tasks_with_source_filter(self, session: AsyncSession, sync_task_service):
        """Test getting recent tasks with source filter."""
        # Arrange
        await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )
        await sync_task_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="trae",
        )

        # Act
        recent_gitlab = await sync_task_service.get_recent_tasks(
            session, source_type="gitlab", hours=24
        )

        # Assert
        assert len(recent_gitlab) == 1
        assert recent_gitlab[0].source_type == "gitlab"
