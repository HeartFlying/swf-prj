"""Tests for sync_gitlab_mrs with SyncTask status updates.

TDD Red Phase: Write tests before implementation.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock



class TestSyncGitlabMrsStatus:
    """Test cases for sync_gitlab_mrs with status updates."""

    @pytest.fixture
    def mock_update_sync_task_status(self):
        """Fixture to mock update_sync_task_status function."""
        with patch('app.tasks.sync_tasks.update_sync_task_status', new_callable=AsyncMock) as mock:
            yield mock

    @pytest.fixture
    def mock_gitlab_data_source(self):
        """Fixture to mock GitLabDataSource."""
        with patch('app.tasks.sync_tasks.GitLabDataSource') as mock_class:
            mock_instance = MagicMock()
            mock_instance.sync_merge_requests = AsyncMock(return_value={
                "total": 5,
                "processed": 5,
                "failed": 0,
                "errors": []
            })
            mock_class.return_value = mock_instance
            yield mock_instance

    def test_sync_gitlab_mrs_accepts_task_id(self):
        """Test that sync_gitlab_mrs accepts task_id parameter."""
        from app.tasks.sync_tasks import sync_gitlab_mrs

        # Assert task function signature includes task_id
        import inspect
        sig = inspect.signature(sync_gitlab_mrs.run)
        params = list(sig.parameters.keys())

        # Should have project_id and task_id parameters
        assert 'project_id' in params
        assert 'task_id' in params

    def test_sync_gitlab_mrs_calls_update_status_running(
        self, mock_update_sync_task_status, mock_gitlab_data_source
    ):
        """Test that sync_gitlab_mrs calls update_sync_task_status with 'running' at start."""
        from app.tasks.sync_tasks import sync_gitlab_mrs

        task_id = 123

        # Call the task
        result = sync_gitlab_mrs.run(project_id=1, task_id=task_id)

        # Assert update_sync_task_status was called with 'running' status
        mock_update_sync_task_status.assert_any_call(task_id, "running")

    def test_sync_gitlab_mrs_calls_update_status_completed(
        self, mock_update_sync_task_status, mock_gitlab_data_source
    ):
        """Test that sync_gitlab_mrs calls update_sync_task_status with 'completed' on success."""
        from app.tasks.sync_tasks import sync_gitlab_mrs

        task_id = 123

        # Call the task
        result = sync_gitlab_mrs.run(project_id=1, task_id=task_id)

        # Assert update_sync_task_status was called with 'completed' status
        # and records_processed/records_failed from the result (as keyword arguments)
        mock_update_sync_task_status.assert_any_call(
            task_id, "completed", records_processed=5, records_failed=0
        )

    def test_sync_gitlab_mrs_calls_update_status_failed(
        self, mock_update_sync_task_status
    ):
        """Test that sync_gitlab_mrs calls update_sync_task_status with 'failed' on error."""
        from app.tasks.sync_tasks import sync_gitlab_mrs
        from app.services.gitlab_data_source import GitLabDataSource
        from celery.exceptions import MaxRetriesExceededError

        task_id = 123

        # Mock GitLabDataSource to raise exception
        with patch.object(GitLabDataSource, 'sync_merge_requests', new_callable=AsyncMock) as mock_sync:
            mock_sync.side_effect = Exception("GitLab API error")

            # Mock retry to raise MaxRetriesExceededError immediately
            with patch.object(sync_gitlab_mrs, 'retry') as mock_retry:
                mock_retry.side_effect = MaxRetriesExceededError()

                # Call the task
                result = sync_gitlab_mrs.run(project_id=1, task_id=task_id)

                # Assert update_sync_task_status was called with 'failed' status
                mock_update_sync_task_status.assert_any_call(
                    task_id, "failed", error_message="GitLab API error"
                )

    def test_sync_gitlab_mrs_without_task_id(self, mock_gitlab_data_source):
        """Test that sync_gitlab_mrs works without task_id (backward compatibility)."""
        from app.tasks.sync_tasks import sync_gitlab_mrs

        # Call the task without task_id
        result = sync_gitlab_mrs.run(project_id=1)

        # Should still work and return success
        assert result["status"] == "success"
        assert result["task"] == "sync_gitlab_mrs"
