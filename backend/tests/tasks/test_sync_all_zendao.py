"""Tests for sync_all_zendao with child SyncTask creation.

TDD: Test that sync_all_zendao creates child SyncTasks for each project.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.db.models import Project, SyncTask
from app.tasks.sync_tasks import sync_all_zendao


class TestSyncAllZendaoChildTasks:
    """Test sync_all_zendao creates child SyncTasks for each project."""

    @pytest.mark.asyncio
    async def test_sync_all_zendao_accepts_parent_task_id(self, session):
        """Test that sync_all_zendao accepts parent_task_id parameter."""
        # Create test projects with ZenTao IDs
        project1 = Project(
            name="Test Project 1",
            code="TEST1",
            zendao_project_id=101,
        )
        project2 = Project(
            name="Test Project 2",
            code="TEST2",
            zendao_project_id=102,
        )
        session.add_all([project1, project2])
        await session.commit()

        # Mock AsyncSessionLocal to return our test session
        async def mock_session_local():
            return session

        # Mock ZenTaoDataSource
        mock_result = {"total": 5, "processed": 5, "failed": 0, "errors": []}

        with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
            mock_session_class.return_value = MagicMock(
                __aenter__=AsyncMock(return_value=session),
                __aexit__=AsyncMock(return_value=None)
            )

            with patch('app.tasks.sync_tasks.ZenTaoDataSource') as mock_ds_class:
                mock_ds = MagicMock()
                mock_ds.sync_bugs = AsyncMock(return_value=mock_result)
                mock_ds.sync_tasks = AsyncMock(return_value=mock_result)
                mock_ds_class.return_value = mock_ds

                with patch('app.tasks.sync_tasks.SyncTaskService') as mock_service_class:
                    mock_service = MagicMock()
                    mock_service.create_task = AsyncMock(return_value=SyncTask(
                        id=100,
                        task_type="full_sync",
                        source_type="zendao",
                        project_id=1,
                        status="pending",
                    ))
                    mock_service.start_task = AsyncMock()
                    mock_service.complete_task = AsyncMock()
                    mock_service_class.return_value = mock_service

                    # Call with parent_task_id - should not raise TypeError
                    result = sync_all_zendao.run(parent_task_id=999)

                    # Should succeed
                    assert result["status"] == "success"
                    assert result["task"] == "sync_all_zendao"

    @pytest.mark.asyncio
    async def test_sync_all_zendao_creates_child_sync_tasks(self, session):
        """Test that sync_all_zendao creates child SyncTask for each project."""
        # Create test projects with ZenTao IDs
        project1 = Project(
            name="Test Project 1",
            code="TEST1",
            zendao_project_id=101,
        )
        project2 = Project(
            name="Test Project 2",
            code="TEST2",
            zendao_project_id=102,
        )
        session.add_all([project1, project2])
        await session.commit()

        # Track created tasks
        created_tasks = []

        async def mock_create_task(*args, **kwargs):
            task = SyncTask(
                id=len(created_tasks) + 100,  # Simulate auto-increment
                task_type=kwargs.get("task_type", "full_sync"),
                source_type=kwargs.get("source_type", "zendao"),
                project_id=kwargs.get("project_id"),
                status="pending",
            )
            created_tasks.append(task)
            return task

        # Mock ZenTaoDataSource
        mock_result = {"total": 5, "processed": 5, "failed": 0, "errors": []}

        with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
            mock_session_class.return_value = MagicMock(
                __aenter__=AsyncMock(return_value=session),
                __aexit__=AsyncMock(return_value=None)
            )

            with patch('app.tasks.sync_tasks.ZenTaoDataSource') as mock_ds_class:
                mock_ds = MagicMock()
                mock_ds.sync_bugs = AsyncMock(return_value=mock_result)
                mock_ds.sync_tasks = AsyncMock(return_value=mock_result)
                mock_ds_class.return_value = mock_ds

                with patch('app.tasks.sync_tasks.SyncTaskService') as mock_service_class:
                    mock_service = MagicMock()
                    mock_service.create_task = AsyncMock(side_effect=mock_create_task)
                    mock_service.start_task = AsyncMock()
                    mock_service.complete_task = AsyncMock()
                    mock_service_class.return_value = mock_service

                    # Run the task
                    result = sync_all_zendao.run(parent_task_id=1)

                    # Assert child tasks were created for each project
                    assert len(created_tasks) == 2, f"Expected 2 child tasks, got {len(created_tasks)}"

                    # Verify task properties
                    for task in created_tasks:
                        assert task.task_type == "full_sync"
                        assert task.source_type == "zendao"
                        assert task.project_id in [project1.id, project2.id]

    @pytest.mark.asyncio
    async def test_child_task_status_updated_to_running(self, session):
        """Test that child task status is updated to running."""
        # Create test project
        project = Project(
            name="Test Project",
            code="TEST",
            zendao_project_id=101,
        )
        session.add(project)
        await session.commit()

        status_updates = []

        async def mock_start_task(db, task_id):
            status_updates.append(("running", task_id))

        mock_result = {"total": 5, "processed": 5, "failed": 0, "errors": []}

        with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
            mock_session_class.return_value = MagicMock(
                __aenter__=AsyncMock(return_value=session),
                __aexit__=AsyncMock(return_value=None)
            )

            with patch('app.tasks.sync_tasks.ZenTaoDataSource') as mock_ds_class:
                mock_ds = MagicMock()
                mock_ds.sync_bugs = AsyncMock(return_value=mock_result)
                mock_ds.sync_tasks = AsyncMock(return_value=mock_result)
                mock_ds_class.return_value = mock_ds

                with patch('app.tasks.sync_tasks.SyncTaskService') as mock_service_class:
                    mock_service = MagicMock()
                    mock_service.create_task = AsyncMock(return_value=SyncTask(
                        id=100,
                        task_type="full_sync",
                        source_type="zendao",
                        project_id=project.id,
                        status="pending",
                    ))
                    mock_service.start_task = AsyncMock(side_effect=mock_start_task)
                    mock_service.complete_task = AsyncMock()
                    mock_service_class.return_value = mock_service

                    # Run the task
                    sync_all_zendao.run(parent_task_id=1)

                    # Assert status was updated to running
                    assert len(status_updates) == 1
                    assert status_updates[0][0] == "running"

    @pytest.mark.asyncio
    async def test_child_task_status_updated_to_completed(self, session):
        """Test that child task status is updated to completed on success."""
        # Create test project
        project = Project(
            name="Test Project",
            code="TEST",
            zendao_project_id=101,
        )
        session.add(project)
        await session.commit()

        completed_calls = []

        async def mock_complete_task(db, task_id, records_processed=0, records_failed=0, error_message=None):
            completed_calls.append({
                "task_id": task_id,
                "records_processed": records_processed,
                "records_failed": records_failed,
            })

        mock_result = {"total": 10, "processed": 10, "failed": 0, "errors": []}

        with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
            mock_session_class.return_value = MagicMock(
                __aenter__=AsyncMock(return_value=session),
                __aexit__=AsyncMock(return_value=None)
            )

            with patch('app.tasks.sync_tasks.ZenTaoDataSource') as mock_ds_class:
                mock_ds = MagicMock()
                mock_ds.sync_bugs = AsyncMock(return_value=mock_result)
                mock_ds.sync_tasks = AsyncMock(return_value=mock_result)
                mock_ds_class.return_value = mock_ds

                with patch('app.tasks.sync_tasks.SyncTaskService') as mock_service_class:
                    mock_service = MagicMock()
                    mock_service.create_task = AsyncMock(return_value=SyncTask(
                        id=100,
                        task_type="full_sync",
                        source_type="zendao",
                        project_id=project.id,
                        status="pending",
                    ))
                    mock_service.start_task = AsyncMock()
                    mock_service.complete_task = AsyncMock(side_effect=mock_complete_task)
                    mock_service_class.return_value = mock_service

                    # Run the task
                    sync_all_zendao.run(parent_task_id=1)

                    # Assert complete_task was called
                    assert len(completed_calls) == 1
                    assert completed_calls[0]["records_processed"] == 20  # 10 bugs + 10 tasks

    @pytest.mark.asyncio
    async def test_child_task_status_updated_to_failed(self, session):
        """Test that child task status is updated to failed on error."""
        # Create test project
        project = Project(
            name="Test Project",
            code="TEST",
            zendao_project_id=101,
        )
        session.add(project)
        await session.commit()

        failed_calls = []

        async def mock_fail_task(db, task_id, error_message=""):
            failed_calls.append({
                "task_id": task_id,
                "error_message": error_message,
            })

        with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
            mock_session_class.return_value = MagicMock(
                __aenter__=AsyncMock(return_value=session),
                __aexit__=AsyncMock(return_value=None)
            )

            with patch('app.tasks.sync_tasks.ZenTaoDataSource') as mock_ds_class:
                mock_ds = MagicMock()
                mock_ds.sync_bugs = AsyncMock(side_effect=Exception("ZenTao API error"))
                mock_ds_class.return_value = mock_ds

                with patch('app.tasks.sync_tasks.SyncTaskService') as mock_service_class:
                    mock_service = MagicMock()
                    mock_service.create_task = AsyncMock(return_value=SyncTask(
                        id=100,
                        task_type="full_sync",
                        source_type="zendao",
                        project_id=project.id,
                        status="pending",
                    ))
                    mock_service.start_task = AsyncMock()
                    mock_service.fail_task = AsyncMock(side_effect=mock_fail_task)
                    mock_service_class.return_value = mock_service

                    # Run the task
                    result = sync_all_zendao.run(parent_task_id=1)

                    # Assert fail_task was called
                    assert len(failed_calls) == 1
                    assert "ZenTao API error" in failed_calls[0]["error_message"]

    @pytest.mark.asyncio
    async def test_syncs_bugs_and_tasks_for_each_project(self, session):
        """Test that both bugs and tasks are synced for each project."""
        # Create test projects
        project1 = Project(
            name="Test Project 1",
            code="TEST1",
            zendao_project_id=101,
        )
        project2 = Project(
            name="Test Project 2",
            code="TEST2",
            zendao_project_id=102,
        )
        session.add_all([project1, project2])
        await session.commit()

        bugs_calls = []
        tasks_calls = []

        async def mock_sync_bugs(session, project_id):
            bugs_calls.append(project_id)
            return {"total": 5, "processed": 5, "failed": 0, "errors": []}

        async def mock_sync_tasks(session, project_id):
            tasks_calls.append(project_id)
            return {"total": 3, "processed": 3, "failed": 0, "errors": []}

        with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
            mock_session_class.return_value = MagicMock(
                __aenter__=AsyncMock(return_value=session),
                __aexit__=AsyncMock(return_value=None)
            )

            with patch('app.tasks.sync_tasks.ZenTaoDataSource') as mock_ds_class:
                mock_ds = MagicMock()
                mock_ds.sync_bugs = AsyncMock(side_effect=mock_sync_bugs)
                mock_ds.sync_tasks = AsyncMock(side_effect=mock_sync_tasks)
                mock_ds_class.return_value = mock_ds

                with patch('app.tasks.sync_tasks.SyncTaskService') as mock_service_class:
                    mock_service = MagicMock()
                    mock_service.create_task = AsyncMock(return_value=SyncTask(
                        id=100,
                        task_type="full_sync",
                        source_type="zendao",
                        project_id=1,
                        status="pending",
                    ))
                    mock_service.start_task = AsyncMock()
                    mock_service.complete_task = AsyncMock()
                    mock_service_class.return_value = mock_service

                    # Run the task
                    result = sync_all_zendao.run(parent_task_id=1)

                    # Assert both bugs and tasks were synced for each project
                    assert len(bugs_calls) == 2
                    assert len(tasks_calls) == 2
                    assert 101 in bugs_calls
                    assert 102 in bugs_calls
                    assert 101 in tasks_calls
                    assert 102 in tasks_calls

    @pytest.mark.asyncio
    async def test_skips_projects_without_zendao_id(self, session):
        """Test that projects without zendao_project_id are skipped."""
        # Create test projects - one with ZenTao, one without
        project_with = Project(
            name="With ZenTao",
            code="WITH",
            zendao_project_id=101,
        )
        project_without = Project(
            name="Without ZenTao",
            code="WITHOUT",
            zendao_project_id=None,
        )
        session.add_all([project_with, project_without])
        await session.commit()

        created_tasks = []

        async def mock_create_task(*args, **kwargs):
            created_tasks.append(kwargs.get("project_id"))
            return SyncTask(
                id=100,
                task_type="full_sync",
                source_type="zendao",
                project_id=kwargs.get("project_id"),
                status="pending",
            )

        mock_result = {"total": 5, "processed": 5, "failed": 0, "errors": []}

        with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
            mock_session_class.return_value = MagicMock(
                __aenter__=AsyncMock(return_value=session),
                __aexit__=AsyncMock(return_value=None)
            )

            with patch('app.tasks.sync_tasks.ZenTaoDataSource') as mock_ds_class:
                mock_ds = MagicMock()
                mock_ds.sync_bugs = AsyncMock(return_value=mock_result)
                mock_ds.sync_tasks = AsyncMock(return_value=mock_result)
                mock_ds_class.return_value = mock_ds

                with patch('app.tasks.sync_tasks.SyncTaskService') as mock_service_class:
                    mock_service = MagicMock()
                    mock_service.create_task = AsyncMock(side_effect=mock_create_task)
                    mock_service.start_task = AsyncMock()
                    mock_service.complete_task = AsyncMock()
                    mock_service_class.return_value = mock_service

                    # Run the task
                    result = sync_all_zendao.run(parent_task_id=1)

                    # Assert only one child task was created (for project with ZenTao)
                    assert len(created_tasks) == 1
                    assert created_tasks[0] == project_with.id
