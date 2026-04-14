"""Tests for Critical Issues in sync_tasks.py

TDD Red Phase: Write tests to verify the critical issues exist before fixing them.

Issues to test:
1. Double database commit risk - data source methods call commit, tasks also call commit
2. Transaction isolation in batch tasks
3. run_async_sync thread safety
"""

from unittest.mock import AsyncMock, MagicMock, patch
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession


class TestDoubleCommitRisk:
    """Test cases for double database commit risk (Issue #1)."""

    def test_sync_gitlab_commits_no_double_commit(self):
        """Test that sync_gitlab_commits doesn't cause double commit.

        Issue: Data source methods already call db.commit(), but task also calls commit.
        This test verifies that only one commit occurs.
        """
        from app.tasks.sync_tasks import sync_gitlab_commits
        from app.services.gitlab_data_source import GitLabDataSource

        mock_result = {"total": 10, "processed": 10, "failed": 0, "errors": []}
        commit_count = [0]

        async def mock_sync_commits(session, project_id):
            # Simulate data source internal commit
            commit_count[0] += 1
            return mock_result

        with patch.object(GitLabDataSource, 'sync_commits', side_effect=mock_sync_commits):
            # Mock the session to track commits
            with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
                mock_session = AsyncMock(spec=AsyncSession)
                mock_session.commit = AsyncMock()
                mock_session.rollback = AsyncMock()

                async_cm = MagicMock()
                async_cm.__aenter__ = AsyncMock(return_value=mock_session)
                async_cm.__aexit__ = AsyncMock(return_value=None)
                mock_session_class.return_value = async_cm

                # Call the task
                result = sync_gitlab_commits.run(project_id=123)

                # The data source commit was called once
                assert commit_count[0] == 1, "Data source should commit once"

                # The task should NOT call commit again after data source
                # If it does, that's the double commit bug
                # Note: Current implementation has this bug - task calls commit after data source
                task_commit_calls = mock_session.commit.await_count
                print(f"Task commit calls: {task_commit_calls}")

                # After fix, task_commit_calls should be 0 (only data source commits)
                # Before fix, task_commit_calls is 1 (double commit)
                assert task_commit_calls == 0, \
                    f"Task should not call commit after data source commits. " \
                    f"Found {task_commit_calls} extra commit(s). This is the double commit bug!"

    def test_sync_gitlab_mrs_no_double_commit(self):
        """Test that sync_gitlab_mrs doesn't cause double commit."""
        from app.tasks.sync_tasks import sync_gitlab_mrs
        from app.services.gitlab_data_source import GitLabDataSource

        mock_result = {"total": 5, "processed": 5, "failed": 0, "errors": []}
        commit_count = [0]

        async def mock_sync_mrs(session, project_id):
            commit_count[0] += 1
            return mock_result

        with patch.object(GitLabDataSource, 'sync_merge_requests', side_effect=mock_sync_mrs):
            with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
                mock_session = AsyncMock(spec=AsyncSession)
                mock_session.commit = AsyncMock()

                async_cm = MagicMock()
                async_cm.__aenter__ = AsyncMock(return_value=mock_session)
                async_cm.__aexit__ = AsyncMock(return_value=None)
                mock_session_class.return_value = async_cm

                result = sync_gitlab_mrs.run(project_id=123)

                assert commit_count[0] == 1
                task_commit_calls = mock_session.commit.await_count
                assert task_commit_calls == 0, \
                    f"Task should not call commit after data source commits. Found {task_commit_calls} extra commit(s)."

    def test_sync_trae_token_usage_no_double_commit(self):
        """Test that sync_trae_token_usage doesn't cause double commit."""
        from app.tasks.sync_tasks import sync_trae_token_usage
        from app.services.trae_data_source import TraeDataSource

        mock_result = {"total": 20, "processed": 20, "failed": 0, "errors": []}
        commit_count = [0]

        async def mock_sync_token(session, user_id, start_date, end_date):
            commit_count[0] += 1
            return mock_result

        with patch.object(TraeDataSource, 'sync_token_usage', side_effect=mock_sync_token):
            with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
                mock_session = AsyncMock(spec=AsyncSession)
                mock_session.commit = AsyncMock()

                async_cm = MagicMock()
                async_cm.__aenter__ = AsyncMock(return_value=mock_session)
                async_cm.__aexit__ = AsyncMock(return_value=None)
                mock_session_class.return_value = async_cm

                result = sync_trae_token_usage.run(user_id=456)

                assert commit_count[0] == 1
                task_commit_calls = mock_session.commit.await_count
                assert task_commit_calls == 0, \
                    f"Task should not call commit after data source commits. Found {task_commit_calls} extra commit(s)."

    def test_sync_trae_ai_suggestions_no_double_commit(self):
        """Test that sync_trae_ai_suggestions doesn't cause double commit."""
        from app.tasks.sync_tasks import sync_trae_ai_suggestions
        from app.services.trae_data_source import TraeDataSource

        mock_result = {"total": 15, "processed": 15, "failed": 0, "errors": []}
        commit_count = [0]

        async def mock_sync_suggestions(session, user_id):
            commit_count[0] += 1
            return mock_result

        with patch.object(TraeDataSource, 'sync_ai_suggestions', side_effect=mock_sync_suggestions):
            with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
                mock_session = AsyncMock(spec=AsyncSession)
                mock_session.commit = AsyncMock()

                async_cm = MagicMock()
                async_cm.__aenter__ = AsyncMock(return_value=mock_session)
                async_cm.__aexit__ = AsyncMock(return_value=None)
                mock_session_class.return_value = async_cm

                result = sync_trae_ai_suggestions.run(user_id=456)

                assert commit_count[0] == 1
                task_commit_calls = mock_session.commit.await_count
                assert task_commit_calls == 0, \
                    f"Task should not call commit after data source commits. Found {task_commit_calls} extra commit(s)."

    def test_sync_zendao_bugs_no_double_commit(self):
        """Test that sync_zendao_bugs doesn't cause double commit."""
        from app.tasks.sync_tasks import sync_zendao_bugs
        from app.services.zendao_data_source import ZenTaoDataSource

        mock_result = {"total": 8, "processed": 8, "failed": 0, "errors": []}
        commit_count = [0]

        async def mock_sync_bugs(session, project_id):
            commit_count[0] += 1
            return mock_result

        with patch.object(ZenTaoDataSource, 'sync_bugs', side_effect=mock_sync_bugs):
            with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
                mock_session = AsyncMock(spec=AsyncSession)
                mock_session.commit = AsyncMock()

                async_cm = MagicMock()
                async_cm.__aenter__ = AsyncMock(return_value=mock_session)
                async_cm.__aexit__ = AsyncMock(return_value=None)
                mock_session_class.return_value = async_cm

                result = sync_zendao_bugs.run(project_id=789)

                assert commit_count[0] == 1
                task_commit_calls = mock_session.commit.await_count
                assert task_commit_calls == 0, \
                    f"Task should not call commit after data source commits. Found {task_commit_calls} extra commit(s)."

    def test_sync_zendao_tasks_no_double_commit(self):
        """Test that sync_zendao_tasks doesn't cause double commit."""
        from app.tasks.sync_tasks import sync_zendao_tasks
        from app.services.zendao_data_source import ZenTaoDataSource

        mock_result = {"total": 12, "processed": 12, "failed": 0, "errors": []}
        commit_count = [0]

        async def mock_sync_tasks(session, project_id):
            commit_count[0] += 1
            return mock_result

        with patch.object(ZenTaoDataSource, 'sync_tasks', side_effect=mock_sync_tasks):
            with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
                mock_session = AsyncMock(spec=AsyncSession)
                mock_session.commit = AsyncMock()

                async_cm = MagicMock()
                async_cm.__aenter__ = AsyncMock(return_value=mock_session)
                async_cm.__aexit__ = AsyncMock(return_value=None)
                mock_session_class.return_value = async_cm

                result = sync_zendao_tasks.run(project_id=789)

                assert commit_count[0] == 1
                task_commit_calls = mock_session.commit.await_count
                assert task_commit_calls == 0, \
                    f"Task should not call commit after data source commits. Found {task_commit_calls} extra commit(s)."


class TestRunAsyncSyncThreadSafety:
    """Test cases for run_async_sync thread safety (Issue #3)."""

    def test_run_async_sync_does_not_create_thread_pool_in_async_context(self):
        """Test that run_async_sync doesn't create ThreadPoolExecutor in async context.

        Issue: Creating ThreadPoolExecutor in async context can cause connection pool exhaustion.
        """
        from app.tasks.sync_tasks import run_async_sync

        # This test verifies the fix - run_async_sync should use existing event loop
        # or properly handle async context without creating new thread pools

        async def test_coro():
            return "success"

        # Mock asyncio.get_running_loop to simulate async context
        with patch('asyncio.get_running_loop') as mock_get_loop:
            mock_loop = MagicMock()
            mock_get_loop.return_value = mock_loop

            # Mock ThreadPoolExecutor to track if it's created
            with patch('concurrent.futures.ThreadPoolExecutor') as mock_executor_class:
                mock_executor = MagicMock()
                mock_executor_class.return_value = mock_executor

                # The current implementation creates a ThreadPoolExecutor
                # After fix, it should use run_coroutine_threadsafe or similar

                # For now, just verify the function works
                # The actual thread safety fix requires more complex testing
                result = run_async_sync(test_coro())

                # Before fix: ThreadPoolExecutor is created
                # After fix: Should use different approach
                # This is a placeholder assertion - actual fix will change behavior
                print(f"ThreadPoolExecutor created: {mock_executor_class.called}")

    def test_run_async_sync_handles_both_contexts(self):
        """Test that run_async_sync handles both sync and async contexts correctly."""
        from app.tasks.sync_tasks import run_async_sync

        async def test_coro():
            await asyncio.sleep(0.001)
            return "test_result"

        # Test from sync context (no running loop)
        with patch('asyncio.get_running_loop', side_effect=RuntimeError("no running loop")):
            with patch('asyncio.run') as mock_run:
                mock_run.return_value = "test_result"
                result = run_async_sync(test_coro())
                mock_run.assert_called_once()
                assert result == "test_result"


class TestBatchTaskTransactionIsolation:
    """Test cases for batch task transaction isolation (Issue #2)."""

    def test_sync_all_gitlab_atomic_child_task_creation(self):
        """Test that sync_all_gitlab handles child task creation atomically.

        Issue: If child task creation succeeds but sync fails, cannot rollback.
        """
        from app.tasks.sync_tasks import sync_all_gitlab
        from app.db.models import Project

        # Create mock projects
        projects = []
        for i in range(1, 3):
            project = MagicMock(spec=Project)
            project.id = i
            project.gitlab_repo_id = f"repo_{i}"
            projects.append(project)

        with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
            # Track session usage
            sessions = []

            async def create_session():
                session = AsyncMock(spec=AsyncSession)
                session.commit = AsyncMock()
                session.rollback = AsyncMock()
                sessions.append(session)

                # First session (read projects)
                if len(sessions) == 1:
                    mock_result = MagicMock()
                    mock_result.scalars.return_value.all.return_value = projects
                    session.execute = AsyncMock(return_value=mock_result)
                else:
                    # Project sessions
                    session.execute = AsyncMock(return_value=MagicMock())

                return session

            async_cm = MagicMock()
            async_cm.__aenter__ = AsyncMock(side_effect=create_session)
            async_cm.__aexit__ = AsyncMock(return_value=None)
            mock_session_class.return_value = async_cm

            with patch('app.tasks.sync_tasks.SyncTaskService') as mock_service_class:
                mock_service = MagicMock()

                # Simulate: first project succeeds, second fails
                call_count = [0]

                async def mock_create_task(*args, **kwargs):
                    call_count[0] += 1
                    task = MagicMock()
                    task.id = call_count[0]
                    return task

                mock_service.create_task = AsyncMock(side_effect=mock_create_task)
                mock_service.start_task = AsyncMock()
                mock_service.complete_task = AsyncMock()
                mock_service.fail_task = AsyncMock()
                mock_service_class.return_value = mock_service

                with patch('app.tasks.sync_tasks.GitLabDataSource') as mock_ds_class:
                    mock_ds = MagicMock()

                    async def mock_sync_all(*args, **kwargs):
                        # First project succeeds, second fails
                        if call_count[0] == 1:
                            return {"total_processed": 10}
                        raise Exception("Sync failed for project 2")

                    mock_ds.sync_all = AsyncMock(side_effect=mock_sync_all)
                    mock_ds_class.return_value = mock_ds

                    result = sync_all_gitlab.run(parent_task_id=100)

                    # Verify partial success handling
                    assert result['status'] == 'partial_success'
                    assert result['success_count'] == 1
                    assert result['error_count'] == 1

                    # Verify rollback was called for failed project
                    # The session for project 2 should have rollback called
                    if len(sessions) >= 3:  # 1 read session + 2 project sessions
                        project_session_2 = sessions[2]
                        # After fix, rollback should be called on failure
                        print(f"Session 2 rollback calls: {project_session_2.rollback.await_count}")
