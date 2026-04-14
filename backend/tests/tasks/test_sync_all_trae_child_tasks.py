"""Tests for sync_all_trae with child SyncTask creation.

TDD Red Phase: Write tests before implementation.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User


class TestSyncAllTraeChildTasks:
    """Test cases for sync_all_trae with child task creation."""

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
                task.task_type = kwargs.get('task_type', 'full_sync')
                task.source_type = kwargs.get('source_type', 'trae')
                task.user_id = kwargs.get('user_id')
                task.status = 'pending'
                return task

            mock_instance.create_task = AsyncMock(side_effect=mock_create_task)
            mock_instance.start_task = AsyncMock()
            mock_instance.complete_task = AsyncMock()
            mock_instance.fail_task = AsyncMock()
            mock_class.return_value = mock_instance
            yield mock_instance

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
            mock_instance.sync_ai_suggestions = AsyncMock(return_value={
                "total": 3,
                "processed": 3,
                "failed": 0,
                "errors": []
            })
            mock_class.return_value = mock_instance
            yield mock_instance

    @pytest.fixture
    def mock_users(self):
        """Fixture to create mock users."""
        users = []
        for i in range(1, 3):  # Create 2 mock users
            user = MagicMock(spec=User)
            user.id = i
            user.is_active = True
            users.append(user)
        return users

    @pytest.fixture
    def mock_session_with_users(self, mock_users):
        """Fixture to mock session with users."""
        with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock:
            session = AsyncMock(spec=AsyncSession)
            session.commit = AsyncMock()

            # Mock execute to return users
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = mock_users
            session.execute = AsyncMock(return_value=mock_result)

            # Create async context manager
            async_cm = MagicMock()
            async_cm.__aenter__ = AsyncMock(return_value=session)
            async_cm.__aexit__ = AsyncMock(return_value=None)
            mock.return_value = async_cm

            yield session

    def test_sync_all_trae_accepts_parent_task_id(self):
        """Test that sync_all_trae accepts parent_task_id parameter."""
        from app.tasks.sync_tasks import sync_all_trae

        # Assert task function signature includes parent_task_id
        import inspect
        sig = inspect.signature(sync_all_trae.run)
        params = list(sig.parameters.keys())

        # Should have parent_task_id parameter
        assert 'parent_task_id' in params

    def test_sync_all_trae_creates_child_tasks(
        self, mock_sync_task_service, mock_trae_data_source, mock_session_with_users
    ):
        """Test that sync_all_trae creates child tasks for each user."""
        from app.tasks.sync_tasks import sync_all_trae

        parent_task_id = 100

        # Call the task
        result = sync_all_trae.run(parent_task_id=parent_task_id)

        # Assert create_task was called for each user (2 users)
        assert mock_sync_task_service.create_task.call_count == 2

        # Verify the calls were made with correct parameters
        calls = mock_sync_task_service.create_task.call_args_list
        for i, c in enumerate(calls):
            args, kwargs = c
            assert kwargs['task_type'] == 'full_sync'
            assert kwargs['source_type'] == 'trae'
            assert kwargs['user_id'] == i + 1  # User IDs are 1 and 2

    def test_sync_all_trae_starts_child_tasks(
        self, mock_sync_task_service, mock_trae_data_source, mock_session_with_users
    ):
        """Test that sync_all_trae starts each child task before syncing."""
        from app.tasks.sync_tasks import sync_all_trae

        parent_task_id = 100

        # Call the task
        result = sync_all_trae.run(parent_task_id=parent_task_id)

        # Assert start_task was called for each child task (2 users)
        assert mock_sync_task_service.start_task.call_count == 2

        # Verify start_task was called with correct task IDs (1 and 2)
        calls = mock_sync_task_service.start_task.call_args_list
        task_ids = [c.args[1] for c in calls]  # Second arg is task_id
        assert 1 in task_ids
        assert 2 in task_ids

    def test_sync_all_trae_completes_child_tasks_on_success(
        self, mock_sync_task_service, mock_trae_data_source, mock_session_with_users
    ):
        """Test that sync_all_trae completes child tasks on successful sync."""
        from app.tasks.sync_tasks import sync_all_trae

        parent_task_id = 100

        # Call the task
        result = sync_all_trae.run(parent_task_id=parent_task_id)

        # Assert complete_task was called for each child task (2 users)
        assert mock_sync_task_service.complete_task.call_count == 2

        # Verify complete_task was called with records_processed
        calls = mock_sync_task_service.complete_task.call_args_list
        for c in calls:
            args, kwargs = c
            assert 'records_processed' in kwargs
            assert kwargs['records_processed'] == 8  # 5 token + 3 ai suggestions

    def test_sync_all_trae_fails_child_tasks_on_error(
        self, mock_sync_task_service, mock_session_with_users
    ):
        """Test that sync_all_trae fails child tasks on sync error."""
        from app.tasks.sync_tasks import sync_all_trae
        from app.services.trae_data_source import TraeDataSource

        parent_task_id = 100

        # Mock TraeDataSource to raise exception
        with patch.object(TraeDataSource, 'sync_token_usage', new_callable=AsyncMock) as mock_sync:
            mock_sync.side_effect = Exception("Trae API error")

            # Call the task
            result = sync_all_trae.run(parent_task_id=parent_task_id)

            # Assert fail_task was called for each child task (2 users)
            assert mock_sync_task_service.fail_task.call_count == 2

            # Verify fail_task was called with error message
            calls = mock_sync_task_service.fail_task.call_args_list
            for c in calls:
                args, kwargs = c
                assert 'error_message' in kwargs
                assert 'Trae API error' in kwargs['error_message']

    def test_sync_all_trae_returns_child_task_results(
        self, mock_sync_task_service, mock_trae_data_source, mock_session_with_users
    ):
        """Test that sync_all_trae returns results with child task info."""
        from app.tasks.sync_tasks import sync_all_trae

        parent_task_id = 100

        # Call the task
        result = sync_all_trae.run(parent_task_id=parent_task_id)

        # Assert result contains child task information
        assert result['status'] == 'success'
        assert result['task'] == 'sync_all_trae'
        assert 'results' in result
        assert len(result['results']) == 2

        # Verify each result has child_task_id
        for user_result in result['results']:
            assert 'child_task_id' in user_result
            assert user_result['child_task_id'] is not None

    def test_sync_all_trae_without_parent_task_id(
        self, mock_sync_task_service, mock_trae_data_source, mock_session_with_users
    ):
        """Test that sync_all_trae works without parent_task_id (no child tasks created)."""
        from app.tasks.sync_tasks import sync_all_trae

        # Call the task without parent_task_id
        result = sync_all_trae.run()

        # Should NOT create child tasks when no parent_task_id provided
        mock_sync_task_service.create_task.assert_not_called()

        # Should still return success
        assert result['status'] == 'success'
        assert result['users_count'] == 2

    def test_sync_all_trae_partial_failure(
        self, mock_sync_task_service, mock_session_with_users
    ):
        """Test that sync_all_trae handles partial failures correctly."""
        from app.tasks.sync_tasks import sync_all_trae
        from app.services.trae_data_source import TraeDataSource

        parent_task_id = 100

        # Mock sync_token_usage to succeed for first user, fail for second
        call_count = [0]

        async def mock_sync_token_usage(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return {"processed": 5}
            raise Exception("Trae API error for user 2")

        with patch.object(TraeDataSource, 'sync_token_usage', new_callable=AsyncMock, side_effect=mock_sync_token_usage):
            # Call the task
            result = sync_all_trae.run(parent_task_id=parent_task_id)

            # One task should complete, one should fail
            assert mock_sync_task_service.complete_task.call_count == 1
            assert mock_sync_task_service.fail_task.call_count == 1

            # Result should still be success (individual failures tracked per user)
            assert result['status'] == 'success'
            assert result['users_count'] == 2
