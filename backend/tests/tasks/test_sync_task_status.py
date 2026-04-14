"""Tests for update_sync_task_status helper function."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.tasks.sync_tasks import update_sync_task_status


class TestUpdateSyncTaskStatus:
    """Test suite for update_sync_task_status function."""

    @pytest.fixture
    def mock_session(self):
        """Create a mock async session."""
        session = AsyncMock(spec=AsyncSession)
        session.commit = AsyncMock()
        session.rollback = AsyncMock()
        return session

    @pytest.fixture
    def mock_async_session_local(self, mock_session):
        """Mock AsyncSessionLocal to return mock session."""
        with patch("app.tasks.sync_tasks.AsyncSessionLocal") as mock:
            # Create async context manager mock
            async_cm = MagicMock()
            async_cm.__aenter__ = AsyncMock(return_value=mock_session)
            async_cm.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = async_cm
            yield mock

    @pytest.fixture
    def mock_service(self):
        """Create a mock SyncTaskService."""
        with patch("app.tasks.sync_tasks.SyncTaskService") as mock_cls:
            mock_instance = MagicMock()
            mock_instance.start_task = AsyncMock()
            mock_instance.complete_task = AsyncMock()
            mock_instance.fail_task = AsyncMock()
            mock_cls.return_value = mock_instance
            yield mock_instance

    async def test_update_status_to_running(
        self, mock_async_session_local, mock_session, mock_service
    ):
        """Test updating task status to running."""
        await update_sync_task_status(
            task_id=1,
            status="running",
        )

        # Verify start_task was called
        mock_service.start_task.assert_called_once_with(mock_session, 1)
        mock_session.commit.assert_called_once()

    async def test_update_status_to_completed(
        self, mock_async_session_local, mock_session, mock_service
    ):
        """Test updating task status to completed."""
        await update_sync_task_status(
            task_id=1,
            status="completed",
            records_processed=100,
            records_failed=5,
        )

        # Verify complete_task was called with correct arguments
        mock_service.complete_task.assert_called_once_with(
            mock_session,
            1,
            records_processed=100,
            records_failed=5,
            error_message=None,
        )
        mock_session.commit.assert_called_once()

    async def test_update_status_to_completed_with_error_message(
        self, mock_async_session_local, mock_session, mock_service
    ):
        """Test updating task status to completed with error message."""
        error_msg = "Partial failure occurred"
        await update_sync_task_status(
            task_id=1,
            status="completed",
            records_processed=90,
            records_failed=10,
            error_message=error_msg,
        )

        # Verify complete_task was called with error message
        mock_service.complete_task.assert_called_once_with(
            mock_session,
            1,
            records_processed=90,
            records_failed=10,
            error_message=error_msg,
        )

    async def test_update_status_to_failed(
        self, mock_async_session_local, mock_session, mock_service
    ):
        """Test updating task status to failed."""
        error_msg = "Test error message"
        await update_sync_task_status(
            task_id=1,
            status="failed",
            records_processed=50,
            records_failed=10,
            error_message=error_msg,
        )

        # Verify fail_task was called with correct arguments
        mock_service.fail_task.assert_called_once_with(
            mock_session,
            1,
            error_message=error_msg,
        )
        mock_session.commit.assert_called_once()

    async def test_update_status_to_failed_without_error_message(
        self, mock_async_session_local, mock_session, mock_service
    ):
        """Test updating task status to failed without error message."""
        await update_sync_task_status(
            task_id=1,
            status="failed",
        )

        # Verify fail_task was called with default error message
        mock_service.fail_task.assert_called_once_with(
            mock_session,
            1,
            error_message="Task failed",
        )

    async def test_update_nonexistent_task(
        self, mock_async_session_local, mock_session, mock_service
    ):
        """Test updating status of non-existent task handles gracefully."""
        # Simulate ValueError (task not found)
        mock_service.start_task.side_effect = ValueError("Sync task 99999 not found")

        # Should not raise exception, just log warning and rollback
        await update_sync_task_status(
            task_id=99999,
            status="running",
        )

        mock_session.rollback.assert_called_once()

    async def test_update_status_invalid_status(
        self, mock_async_session_local, mock_session, mock_service
    ):
        """Test updating task with invalid status."""
        # Should not raise exception for invalid status, just log warning
        await update_sync_task_status(
            task_id=1,
            status="invalid_status",
        )

        # No service method should be called
        mock_service.start_task.assert_not_called()
        mock_service.complete_task.assert_not_called()
        mock_service.fail_task.assert_not_called()
        mock_session.commit.assert_not_called()

    async def test_update_status_with_none_task_id(
        self, mock_async_session_local, mock_session, mock_service
    ):
        """Test updating task with None task_id does nothing."""
        await update_sync_task_status(
            task_id=None,
            status="running",
        )

        # AsyncSessionLocal should not be called
        mock_async_session_local.assert_not_called()

    async def test_update_status_generic_exception(
        self, mock_async_session_local, mock_session, mock_service
    ):
        """Test that generic exceptions are handled gracefully."""
        # Simulate a generic exception
        mock_service.start_task.side_effect = Exception("Database connection failed")

        # Should not raise exception
        await update_sync_task_status(
            task_id=1,
            status="running",
        )

        mock_session.rollback.assert_called_once()
