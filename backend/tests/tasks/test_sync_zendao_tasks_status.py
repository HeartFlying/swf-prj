"""Tests for sync_zendao_tasks with SyncTask status updates.

TDD Red Phase: Write tests before implementation.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock



class TestSyncZendaoTasksStatus:
    """Test cases for sync_zendao_tasks with status updates."""

    @pytest.fixture
    def mock_update_sync_task_status(self):
        """Fixture to mock update_sync_task_status function."""
        with patch('app.tasks.sync_tasks.update_sync_task_status', new_callable=AsyncMock) as mock:
            yield mock

    @pytest.fixture
    def mock_zendao_data_source(self):
        """Fixture to mock ZenTaoDataSource."""
        with patch('app.tasks.sync_tasks.ZenTaoDataSource') as mock_class:
            mock_instance = MagicMock()
            mock_instance.sync_tasks = AsyncMock(return_value={
                "total": 12,
                "processed": 12,
                "failed": 0,
                "errors": []
            })
            mock_class.return_value = mock_instance
            yield mock_instance

    def test_sync_zendao_tasks_accepts_task_id(self):
        """Test that sync_zendao_tasks accepts task_id parameter."""
        from app.tasks.sync_tasks import sync_zendao_tasks

        # Assert task function signature includes task_id
        import inspect
        sig = inspect.signature(sync_zendao_tasks.run)
        params = list(sig.parameters.keys())

        # Should have project_id and task_id parameters
        assert 'project_id' in params
        assert 'task_id' in params

    def test_sync_zendao_tasks_calls_update_status_running(
        self, mock_update_sync_task_status, mock_zendao_data_source
    ):
        """Test that sync_zendao_tasks calls update_sync_task_status with 'running' at start."""
        from app.tasks.sync_tasks import sync_zendao_tasks

        task_id = 123

        # Call the task
        result = sync_zendao_tasks.run(project_id=789, task_id=task_id)

        # Assert update_sync_task_status was called with 'running' status
        mock_update_sync_task_status.assert_any_call(task_id, "running")

    def test_sync_zendao_tasks_calls_update_status_completed(
        self, mock_update_sync_task_status, mock_zendao_data_source
    ):
        """Test that sync_zendao_tasks calls update_sync_task_status with 'completed' on success."""
        from app.tasks.sync_tasks import sync_zendao_tasks

        task_id = 123

        # Call the task
        result = sync_zendao_tasks.run(project_id=789, task_id=task_id)

        # Assert update_sync_task_status was called with 'completed' status
        # and records_processed/records_failed from the result (as keyword arguments)
        mock_update_sync_task_status.assert_any_call(
            task_id, "completed", records_processed=12, records_failed=0
        )

    def test_sync_zendao_tasks_calls_update_status_failed(
        self, mock_update_sync_task_status
    ):
        """Test that sync_zendao_tasks calls update_sync_task_status with 'failed' on error."""
        from app.tasks.sync_tasks import sync_zendao_tasks
        from app.services.zendao_data_source import ZenTaoDataSource
        from celery.exceptions import MaxRetriesExceededError

        task_id = 123

        # Mock ZenTaoDataSource to raise exception
        with patch.object(ZenTaoDataSource, 'sync_tasks', new_callable=AsyncMock) as mock_sync:
            mock_sync.side_effect = Exception("ZenTao API error")

            # Mock retry to raise MaxRetriesExceededError immediately
            with patch.object(sync_zendao_tasks, 'retry') as mock_retry:
                mock_retry.side_effect = MaxRetriesExceededError()

                # Call the task
                result = sync_zendao_tasks.run(project_id=789, task_id=task_id)

                # Assert update_sync_task_status was called with 'failed' status
                mock_update_sync_task_status.assert_any_call(
                    task_id, "failed", error_message="ZenTao API error"
                )

    def test_sync_zendao_tasks_without_task_id(self, mock_zendao_data_source):
        """Test that sync_zendao_tasks works without task_id (backward compatibility)."""
        from app.tasks.sync_tasks import sync_zendao_tasks

        # Call the task without task_id
        result = sync_zendao_tasks.run(project_id=789)

        # Should still work and return success
        assert result["status"] == "success"
        assert result["task"] == "sync_zendao_tasks"
