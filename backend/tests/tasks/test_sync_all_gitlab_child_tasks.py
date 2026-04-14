"""Tests for sync_all_gitlab with child SyncTask creation.

TDD Red Phase: Write tests before implementation.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Project


class TestSyncAllGitlabChildTasks:
    """Test cases for sync_all_gitlab with child task creation."""

    @pytest.fixture
    def mock_sync_task_service(self):
        """Fixture to mock SyncTaskService."""
        with patch('app.tasks.sync_tasks.SyncTaskService') as mock_class:
            mock_instance = MagicMock()
            # Mock create_task to return a task with incrementing ID
            task_counter = [0]

            async def mock_create_task(*args, **kwargs):
                task_counter[0] += 1
                task = MagicMock()
                task.id = task_counter[0]
                task.task_type = kwargs.get('task_type', 'incremental_sync')
                task.source_type = kwargs.get('source_type', 'gitlab')
                task.project_id = kwargs.get('project_id')
                task.status = 'pending'
                return task

            mock_instance.create_task = AsyncMock(side_effect=mock_create_task)
            mock_instance.start_task = AsyncMock()
            mock_instance.complete_task = AsyncMock()
            mock_instance.fail_task = AsyncMock()
            mock_class.return_value = mock_instance
            yield mock_instance

    @pytest.fixture
    def mock_gitlab_data_source(self):
        """Fixture to mock GitLabDataSource."""
        with patch('app.tasks.sync_tasks.GitLabDataSource') as mock_class:
            mock_instance = MagicMock()
            mock_instance.sync_all = AsyncMock(return_value={
                "commits": {"processed": 10, "failed": 0},
                "merge_requests": {"processed": 5, "failed": 0},
                "total_processed": 15,
            })
            mock_class.return_value = mock_instance
            yield mock_instance

    @pytest.fixture
    def mock_projects(self):
        """Fixture to create mock projects."""
        projects = []
        for i in range(1, 3):  # Create 2 mock projects
            project = MagicMock(spec=Project)
            project.id = i
            project.gitlab_repo_id = f"repo_{i}"
            projects.append(project)
        return projects

    @pytest.fixture
    def mock_session_with_projects(self, mock_projects):
        """Fixture to mock session with projects."""
        with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock:
            session = AsyncMock(spec=AsyncSession)
            session.commit = AsyncMock()

            # Mock execute to return projects
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = mock_projects
            session.execute = AsyncMock(return_value=mock_result)

            # Create async context manager
            async_cm = MagicMock()
            async_cm.__aenter__ = AsyncMock(return_value=session)
            async_cm.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = async_cm

            yield session

    def test_sync_all_gitlab_accepts_parent_task_id(self):
        """Test that sync_all_gitlab accepts parent_task_id parameter."""
        from app.tasks.sync_tasks import sync_all_gitlab

        # Assert task function signature includes parent_task_id
        import inspect
        sig = inspect.signature(sync_all_gitlab.run)
        params = list(sig.parameters.keys())

        # Should have parent_task_id parameter
        assert 'parent_task_id' in params

    def test_sync_all_gitlab_creates_child_tasks(
        self, mock_sync_task_service, mock_gitlab_data_source, mock_session_with_projects
    ):
        """Test that sync_all_gitlab creates child tasks for each project."""
        from app.tasks.sync_tasks import sync_all_gitlab

        parent_task_id = 100

        # Call the task
        result = sync_all_gitlab.run(parent_task_id=parent_task_id)

        # Assert create_task was called for each project (2 projects)
        assert mock_sync_task_service.create_task.call_count == 2

        # Verify the calls were made with correct parameters
        calls = mock_sync_task_service.create_task.call_args_list
        for i, c in enumerate(calls):
            args, kwargs = c
            assert kwargs['task_type'] == 'incremental_sync'
            assert kwargs['source_type'] == 'gitlab'
            assert kwargs['project_id'] == i + 1  # Project IDs are 1 and 2
            assert kwargs['created_by'] == 'sync_all_gitlab'

    def test_sync_all_gitlab_starts_child_tasks(
        self, mock_sync_task_service, mock_gitlab_data_source, mock_session_with_projects
    ):
        """Test that sync_all_gitlab starts each child task before syncing."""
        from app.tasks.sync_tasks import sync_all_gitlab

        parent_task_id = 100

        # Call the task
        result = sync_all_gitlab.run(parent_task_id=parent_task_id)

        # Assert start_task was called for each child task (2 projects)
        assert mock_sync_task_service.start_task.call_count == 2

        # Verify start_task was called with correct task IDs (1 and 2)
        calls = mock_sync_task_service.start_task.call_args_list
        task_ids = [c.args[1] for c in calls]  # Second arg is task_id
        assert 1 in task_ids
        assert 2 in task_ids

    def test_sync_all_gitlab_completes_child_tasks_on_success(
        self, mock_sync_task_service, mock_gitlab_data_source, mock_session_with_projects
    ):
        """Test that sync_all_gitlab completes child tasks on successful sync."""
        from app.tasks.sync_tasks import sync_all_gitlab

        parent_task_id = 100

        # Call the task
        result = sync_all_gitlab.run(parent_task_id=parent_task_id)

        # Assert complete_task was called for each child task (2 projects)
        assert mock_sync_task_service.complete_task.call_count == 2

        # Verify complete_task was called with records_processed
        calls = mock_sync_task_service.complete_task.call_args_list
        for c in calls:
            args, kwargs = c
            assert 'records_processed' in kwargs
            assert kwargs['records_processed'] == 15  # Total from mock

    def test_sync_all_gitlab_fails_child_tasks_on_error(
        self, mock_sync_task_service, mock_session_with_projects
    ):
        """Test that sync_all_gitlab fails child tasks on sync error."""
        from app.tasks.sync_tasks import sync_all_gitlab
        from app.services.gitlab_data_source import GitLabDataSource

        parent_task_id = 100

        # Mock GitLabDataSource to raise exception
        with patch.object(GitLabDataSource, 'sync_all', new_callable=AsyncMock) as mock_sync:
            mock_sync.side_effect = Exception("GitLab API error")

            # Call the task
            result = sync_all_gitlab.run(parent_task_id=parent_task_id)

            # Assert fail_task was called for each child task (2 projects)
            assert mock_sync_task_service.fail_task.call_count == 2

            # Verify fail_task was called with error message
            calls = mock_sync_task_service.fail_task.call_args_list
            for c in calls:
                args, kwargs = c
                assert 'error_message' in kwargs
                assert 'GitLab API error' in kwargs['error_message']

    def test_sync_all_gitlab_returns_child_task_results(
        self, mock_sync_task_service, mock_gitlab_data_source, mock_session_with_projects
    ):
        """Test that sync_all_gitlab returns results with child task info."""
        from app.tasks.sync_tasks import sync_all_gitlab

        parent_task_id = 100

        # Call the task
        result = sync_all_gitlab.run(parent_task_id=parent_task_id)

        # Assert result contains child task information
        assert result['status'] == 'success'
        assert result['task'] == 'sync_all_gitlab'
        assert 'child_tasks' in result
        assert len(result['child_tasks']) == 2

        # Verify each child task result
        for child in result['child_tasks']:
            assert 'task_id' in child
            assert 'project_id' in child
            assert 'status' in child

    def test_sync_all_gitlab_without_parent_task_id(
        self, mock_sync_task_service, mock_gitlab_data_source, mock_session_with_projects
    ):
        """Test that sync_all_gitlab works without parent_task_id (creates child tasks anyway)."""
        from app.tasks.sync_tasks import sync_all_gitlab

        # Call the task without parent_task_id
        result = sync_all_gitlab.run()

        # Should still create child tasks
        assert mock_sync_task_service.create_task.call_count == 2

        # Should still return success
        assert result['status'] == 'success'

    def test_sync_all_gitlab_partial_failure(
        self, mock_sync_task_service, mock_session_with_projects
    ):
        """Test that sync_all_gitlab handles partial failures correctly."""
        from app.tasks.sync_tasks import sync_all_gitlab
        from app.services.gitlab_data_source import GitLabDataSource

        parent_task_id = 100

        # Mock sync_all to succeed for first project, fail for second
        call_count = [0]

        async def mock_sync_all(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return {"total_processed": 10}
            raise Exception("GitLab API error for project 2")

        with patch.object(GitLabDataSource, 'sync_all', new_callable=AsyncMock, side_effect=mock_sync_all):
            # Call the task
            result = sync_all_gitlab.run(parent_task_id=parent_task_id)

            # One task should complete, one should fail
            assert mock_sync_task_service.complete_task.call_count == 1
            assert mock_sync_task_service.fail_task.call_count == 1

            # Result should indicate partial success
            assert result['status'] == 'partial_success'
