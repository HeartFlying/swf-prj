"""Tests for sync_trae_token_usage with SyncTask status updates.

TDD Red Phase: Write tests before implementation.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock



class TestSyncTraeTokenUsageStatus:
    """Test cases for sync_trae_token_usage with status updates."""

    @pytest.fixture
    def mock_update_sync_task_status(self):
        """Fixture to mock update_sync_task_status function."""
        with patch('app.tasks.sync_tasks.update_sync_task_status', new_callable=AsyncMock) as mock:
            yield mock

    @pytest.fixture
    def mock_trae_data_source(self):
        """Fixture to mock TraeDataSource."""
        with patch('app.tasks.sync_tasks.TraeDataSource') as mock_class:
            mock_instance = MagicMock()
            mock_instance.sync_token_usage = AsyncMock(return_value={
                "total": 5,
                "processed": 5,
                "failed": 0,
                "errors": []
            })
            mock_class.return_value = mock_instance
            yield mock_instance

    def test_sync_trae_token_usage_accepts_task_id(self):
        """Test that sync_trae_token_usage accepts task_id parameter."""
        from app.tasks.sync_tasks import sync_trae_token_usage

        # Assert task function signature includes task_id
        import inspect
        sig = inspect.signature(sync_trae_token_usage.run)
        params = list(sig.parameters.keys())

        # Should have user_id and task_id parameters
        assert 'user_id' in params
        assert 'task_id' in params

    def test_sync_trae_token_usage_calls_update_status_running(
        self, mock_update_sync_task_status, mock_trae_data_source
    ):
        """Test that sync_trae_token_usage calls update_sync_task_status with 'running' at start."""
        from app.tasks.sync_tasks import sync_trae_token_usage

        task_id = 123

        # Call the task
        result = sync_trae_token_usage.run(user_id=1, task_id=task_id)

        # Assert update_sync_task_status was called with 'running' status
        mock_update_sync_task_status.assert_any_call(task_id, "running")

    def test_sync_trae_token_usage_calls_update_status_completed(
        self, mock_update_sync_task_status, mock_trae_data_source
    ):
        """Test that sync_trae_token_usage calls update_sync_task_status with 'completed' on success."""
        from app.tasks.sync_tasks import sync_trae_token_usage

        task_id = 123

        # Call the task
        result = sync_trae_token_usage.run(user_id=1, task_id=task_id)

        # Assert update_sync_task_status was called with 'completed' status
        # and records_processed/records_failed from the result (as keyword arguments)
        mock_update_sync_task_status.assert_any_call(
            task_id, "completed", records_processed=5, records_failed=0
        )

    def test_sync_trae_token_usage_calls_update_status_failed(
        self, mock_update_sync_task_status
    ):
        """Test that sync_trae_token_usage calls update_sync_task_status with 'failed' on error."""
        from app.tasks.sync_tasks import sync_trae_token_usage
        from app.services.trae_data_source import TraeDataSource
        from celery.exceptions import MaxRetriesExceededError

        task_id = 123

        # Mock TraeDataSource to raise exception
        with patch.object(TraeDataSource, 'sync_token_usage', new_callable=AsyncMock) as mock_sync:
            mock_sync.side_effect = Exception("Trae API error")

            # Mock retry to raise MaxRetriesExceededError immediately
            with patch.object(sync_trae_token_usage, 'retry') as mock_retry:
                mock_retry.side_effect = MaxRetriesExceededError()

                # Call the task - it should return error result when MaxRetriesExceededError is raised
                try:
                    result = sync_trae_token_usage.run(user_id=1, task_id=task_id)
                except MaxRetriesExceededError:
                    pass  # Expected, continue to check mock calls

                # Assert update_sync_task_status was called with 'failed' status
                mock_update_sync_task_status.assert_any_call(
                    task_id, "failed", error_message="Trae API error"
                )

    def test_sync_trae_token_usage_without_task_id(self, mock_trae_data_source):
        """Test that sync_trae_token_usage works without task_id (backward compatibility)."""
        from app.tasks.sync_tasks import sync_trae_token_usage

        # Call the task without task_id
        result = sync_trae_token_usage.run(user_id=1)

        # Should still work and return success
        assert result["status"] == "success"
        assert result["task"] == "sync_trae_token_usage"
