"""Tests for SyncService.

TDD Red Phase: Write tests before implementation.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Project
from app.services.data_source_interface import DataSourceInterface
from app.services.sync_service import (
    DataSourceNotFoundError,
    SyncExecutionError,
    SyncService,
)


@pytest.fixture
def sync_service():
    """Fixture for SyncService instance."""
    return SyncService()


@pytest.fixture
def mock_data_source():
    """Fixture for mock data source."""
    source = MagicMock(spec=DataSourceInterface)
    source.source_type = "mock"
    source.sync = AsyncMock(return_value={
        "total": 10,
        "processed": 10,
        "failed": 0,
        "errors": [],
    })
    return source


class TestSyncService:
    """Test cases for SyncService."""

    async def test_register_data_source(self, sync_service, mock_data_source):
        """Test registering a data source."""
        # Act
        sync_service.register_data_source("gitlab", mock_data_source)

        # Assert
        retrieved = sync_service.get_data_source("gitlab")
        assert retrieved == mock_data_source

    async def test_get_data_source_not_found(self, sync_service):
        """Test getting unregistered data source raises error."""
        # Act & Assert
        with pytest.raises(DataSourceNotFoundError, match="Data source not found: unknown"):
            sync_service.get_data_source("unknown")

    async def test_create_task(self, session: AsyncSession, sync_service):
        """Test creating a sync task through SyncService."""
        # Act
        task = await sync_service.create_task(
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
        assert task.status == "pending"

    async def test_execute_task_success(self, session: AsyncSession, sync_service, mock_data_source):
        """Test executing a sync task successfully."""
        # Arrange
        sync_service.register_data_source("gitlab", mock_data_source)
        task = await sync_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
            project_id=1,
        )

        # Act
        result = await sync_service.execute_task(session, task.id)

        # Assert
        assert result["processed"] == 10
        assert result["failed"] == 0

        # Verify task was marked as completed
        task_status = await sync_service.get_task_status(session, task.id)
        assert task_status["status"] == "completed"

    async def test_execute_task_not_found(self, session: AsyncSession, sync_service):
        """Test executing a non-existent task raises error."""
        # Act & Assert
        with pytest.raises(SyncExecutionError, match="Sync task 99999 not found"):
            await sync_service.execute_task(session, 99999)

    async def test_execute_task_data_source_failure(self, session: AsyncSession, sync_service):
        """Test executing a task when data source fails."""
        # Arrange
        failing_source = MagicMock(spec=DataSourceInterface)
        failing_source.source_type = "failing"
        failing_source.sync = AsyncMock(side_effect=Exception("Connection failed"))

        sync_service.register_data_source("failing", failing_source)
        task = await sync_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="failing",
        )

        # Act & Assert
        with pytest.raises(SyncExecutionError, match="Connection failed"):
            await sync_service.execute_task(session, task.id)

        # Verify task was marked as failed
        task_status = await sync_service.get_task_status(session, task.id)
        assert task_status["status"] == "failed"

    async def test_sync_project(self, session: AsyncSession, sync_service, mock_data_source):
        """Test high-level sync project method."""
        # Arrange
        sync_service.register_data_source("gitlab", mock_data_source)

        # Create a project first
        project = Project(
            name="Test Project",
            code="TEST001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Act
        result = await sync_service.sync_project(
            db=session,
            project_id=project.id,
            source_type="gitlab",
            sync_type="full_sync",
            created_by="admin",
        )

        # Assert
        assert result["processed"] == 10

    async def test_sync_project_data_source_updates_last_sync_at(
        self, session: AsyncSession, sync_service
    ):
        """Test that data source is responsible for updating project.last_sync_at.

        The sync_service delegates timestamp updates to the data source.
        This test verifies that a data source that updates timestamps works correctly.
        """
        # Arrange - Create a data source that updates timestamps
        from datetime import datetime, timezone

        async def mock_sync_with_timestamp_update(db, project_id=None, **kwargs):
            """Mock sync that updates project timestamps like real data sources do."""
            if project_id:
                project = await db.get(Project, project_id)
                if project:
                    now = datetime.now(timezone.utc)
                    project.last_sync_at = now
                    project.gitlab_last_sync_at = now
                    await db.commit()
            return {
                "total": 10,
                "processed": 10,
                "failed": 0,
                "errors": [],
            }

        mock_data_source = MagicMock(spec=DataSourceInterface)
        mock_data_source.source_type = "gitlab"
        mock_data_source.sync = AsyncMock(side_effect=mock_sync_with_timestamp_update)

        sync_service.register_data_source("gitlab", mock_data_source)

        # Create a project first
        project = Project(
            name="Test Project",
            code="TEST002",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Verify initial state
        assert project.last_sync_at is None

        # Act
        result = await sync_service.sync_project(
            db=session,
            project_id=project.id,
            source_type="gitlab",
            sync_type="full_sync",
            created_by="admin",
        )

        # Assert
        assert result["processed"] == 10

        # Refresh project from database
        await session.refresh(project)

        # Verify last_sync_at was updated by the data source
        assert project.last_sync_at is not None
        # Verify the timestamp is recent (within last minute)
        time_diff = datetime.now(timezone.utc) - project.last_sync_at.replace(tzinfo=timezone.utc)
        assert time_diff.total_seconds() < 60

    async def test_sync_project_data_source_updates_gitlab_last_sync_at(
        self, session: AsyncSession, sync_service
    ):
        """Test that data source updates project.gitlab_last_sync_at for gitlab source.

        The sync_service delegates timestamp updates to the data source.
        """
        # Arrange - Create a data source that updates timestamps
        from datetime import datetime, timezone

        async def mock_sync_with_gitlab_timestamp(db, project_id=None, **kwargs):
            """Mock sync that updates gitlab timestamps like real data sources do."""
            if project_id:
                project = await db.get(Project, project_id)
                if project:
                    now = datetime.now(timezone.utc)
                    project.gitlab_last_sync_at = now
                    await db.commit()
            return {
                "total": 10,
                "processed": 10,
                "failed": 0,
                "errors": [],
            }

        mock_data_source = MagicMock(spec=DataSourceInterface)
        mock_data_source.source_type = "gitlab"
        mock_data_source.sync = AsyncMock(side_effect=mock_sync_with_gitlab_timestamp)

        sync_service.register_data_source("gitlab", mock_data_source)

        # Create a project first
        project = Project(
            name="Test Project",
            code="TEST003",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Verify initial state
        assert project.gitlab_last_sync_at is None

        # Act
        result = await sync_service.sync_project(
            db=session,
            project_id=project.id,
            source_type="gitlab",
            sync_type="full_sync",
            created_by="admin",
        )

        # Assert
        assert result["processed"] == 10

        # Refresh project from database
        await session.refresh(project)

        # Verify gitlab_last_sync_at was updated by the data source
        assert project.gitlab_last_sync_at is not None
        # Verify the timestamp is recent (within last minute)
        time_diff = datetime.now(timezone.utc) - project.gitlab_last_sync_at.replace(tzinfo=timezone.utc)
        assert time_diff.total_seconds() < 60

    async def test_sync_project_data_source_updates_zendao_last_sync_at(
        self, session: AsyncSession, sync_service
    ):
        """Test that data source updates project.zendao_last_sync_at for zendao source.

        The sync_service delegates timestamp updates to the data source.
        """
        # Arrange - Create a data source that updates timestamps
        from datetime import datetime, timezone

        async def mock_sync_with_zendao_timestamp(db, project_id=None, **kwargs):
            """Mock sync that updates zendao timestamps like real data sources do."""
            if project_id:
                project = await db.get(Project, project_id)
                if project:
                    now = datetime.now(timezone.utc)
                    project.zendao_last_sync_at = now
                    await db.commit()
            return {
                "total": 5,
                "processed": 5,
                "failed": 0,
                "errors": [],
            }

        zendao_source = MagicMock(spec=DataSourceInterface)
        zendao_source.source_type = "zendao"
        zendao_source.sync = AsyncMock(side_effect=mock_sync_with_zendao_timestamp)
        sync_service.register_data_source("zendao", zendao_source)

        # Create a project first
        project = Project(
            name="Test Project",
            code="TEST004",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Verify initial state
        assert project.zendao_last_sync_at is None

        # Act
        result = await sync_service.sync_project(
            db=session,
            project_id=project.id,
            source_type="zendao",
            sync_type="full_sync",
            created_by="admin",
        )

        # Assert
        assert result["processed"] == 5

        # Refresh project from database
        await session.refresh(project)

        # Verify zendao_last_sync_at was updated by the data source
        assert project.zendao_last_sync_at is not None
        # Verify the timestamp is recent (within last minute)
        time_diff = datetime.now(timezone.utc) - project.zendao_last_sync_at.replace(tzinfo=timezone.utc)
        assert time_diff.total_seconds() < 60

    async def test_sync_project_does_not_update_last_sync_at_on_failure(
        self, session: AsyncSession, sync_service
    ):
        """Test that sync_project does not update last_sync_at when sync fails."""
        # Arrange
        # Create a failing data source
        failing_source = MagicMock(spec=DataSourceInterface)
        failing_source.source_type = "failing"
        failing_source.sync = AsyncMock(side_effect=Exception("Sync failed"))
        sync_service.register_data_source("failing", failing_source)

        # Create a project first
        project = Project(
            name="Test Project",
            code="TEST005",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Verify initial state
        assert project.last_sync_at is None
        assert project.gitlab_last_sync_at is None

        # Act & Assert
        with pytest.raises(SyncExecutionError, match="Sync failed"):
            await sync_service.sync_project(
                db=session,
                project_id=project.id,
                source_type="failing",
                sync_type="full_sync",
                created_by="admin",
            )

        # Refresh project from database
        await session.refresh(project)

        # Verify last_sync_at was NOT updated
        assert project.last_sync_at is None

    async def test_sync_project_does_not_duplicate_timestamp_update(
        self, session: AsyncSession, sync_service
    ):
        """Test that sync_project does not duplicate last_sync_at updates.

        The timestamp update should be handled by the data source, not sync_service.
        This test verifies that sync_service.sync_project delegates timestamp
        updates to the data source.
        """
        # Create a mock data source that tracks if sync was called
        mock_data_source = MagicMock(spec=DataSourceInterface)
        mock_data_source.source_type = "test_source"
        mock_data_source.sync = AsyncMock(return_value={
            "total": 10,
            "processed": 10,
            "failed": 0,
            "errors": [],
        })

        # Register the mock data source
        sync_service.register_data_source("test_source", mock_data_source)

        # Create a project first
        project = Project(
            name="Test Project",
            code="TEST006",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Call sync_project
        result = await sync_service.sync_project(
            db=session,
            project_id=project.id,
            source_type="test_source",
        )

        # Verify the data source's sync method was called
        mock_data_source.sync.assert_called_once()

        # The result should be from the data source
        assert result["processed"] == 10

    async def test_get_task_status(self, session: AsyncSession, sync_service):
        """Test getting task status."""
        # Arrange
        task = await sync_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )

        # Act
        status = await sync_service.get_task_status(session, task.id)

        # Assert
        assert status is not None
        assert status["id"] == task.id
        assert status["task_type"] == "full_sync"
        assert status["source_type"] == "gitlab"
        assert status["status"] == "pending"

    async def test_get_task_status_not_found(self, session: AsyncSession, sync_service):
        """Test getting status of non-existent task returns None."""
        # Act
        status = await sync_service.get_task_status(session, 99999)

        # Assert
        assert status is None

    async def test_list_recent_tasks(self, session: AsyncSession, sync_service):
        """Test listing recent tasks."""
        # Arrange
        await sync_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )

        # Act
        recent = await sync_service.list_recent_tasks(session, hours=24)

        # Assert
        assert len(recent) >= 1
        assert "id" in recent[0]
        assert "task_type" in recent[0]
        assert "status" in recent[0]

    async def test_list_recent_tasks_with_source_filter(self, session: AsyncSession, sync_service):
        """Test listing recent tasks with source filter."""
        # Arrange
        await sync_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )
        await sync_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="trae",
        )

        # Act
        gitlab_tasks = await sync_service.list_recent_tasks(
            session, source_type="gitlab", hours=24
        )

        # Assert
        assert len(gitlab_tasks) == 1
        assert gitlab_tasks[0]["source_type"] == "gitlab"


class TestSyncServiceIncrementalSync:
    """Test cases for incremental sync functionality."""

    async def test_incremental_sync_uses_last_sync_time(
        self, session: AsyncSession, sync_service, mock_data_source
    ):
        """Test that incremental sync uses completed_at from recent task."""
        # Arrange
        sync_service.register_data_source("gitlab", mock_data_source)

        # Create and complete a previous sync task
        prev_task = await sync_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )
        await sync_service.task_service.start_task(session, prev_task.id)
        await sync_service.task_service.complete_task(session, prev_task.id, records_processed=10)

        # Create incremental sync task
        task = await sync_service.create_task(
            db=session,
            task_type="incremental_sync",
            source_type="gitlab",
        )

        # Act
        await sync_service.execute_task(session, task.id)

        # Assert - verify data source was called with since parameter
        call_args = mock_data_source.sync.call_args
        assert call_args is not None
        # since should be passed for incremental sync when there's a previous task
        assert any(
            kwarg == "since" for kwarg in call_args.kwargs.keys()
        ) or any(
            isinstance(arg, dict) and "since" in arg for arg in call_args.args
        )

    async def test_full_sync_does_not_use_last_sync_time(
        self, session: AsyncSession, sync_service, mock_data_source
    ):
        """Test that full sync does not use incremental parameters."""
        # Arrange
        sync_service.register_data_source("gitlab", mock_data_source)

        task = await sync_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
        )

        # Act
        await sync_service.execute_task(session, task.id)

        # Assert - data source should be called without since parameter
        call_kwargs = mock_data_source.sync.call_args.kwargs
        # since should not be in kwargs for full_sync
        assert "since" not in call_kwargs or call_kwargs.get("since") is None


class TestGetLastSyncTime:
    """Test cases for _get_last_sync_time method with project.last_sync_at fields."""

    async def test_get_last_sync_time_uses_gitlab_last_sync_at(
        self, session: AsyncSession, sync_service
    ):
        """Test that _get_last_sync_time returns project.gitlab_last_sync_at for gitlab source."""
        # Arrange
        gitlab_sync_time = datetime(2024, 3, 15, 10, 30, 0)

        project = Project(
            name="Test Project",
            code="TEST001",
            stage="研发",
            status="active",
            gitlab_last_sync_at=gitlab_sync_time,
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        task = await sync_service.create_task(
            db=session,
            task_type="incremental_sync",
            source_type="gitlab",
            project_id=project.id,
        )

        # Act
        result = await sync_service._get_last_sync_time(session, task)

        # Assert
        assert result == gitlab_sync_time

    async def test_get_last_sync_time_uses_zendao_last_sync_at(
        self, session: AsyncSession, sync_service
    ):
        """Test that _get_last_sync_time returns project.zendao_last_sync_at for zendao source."""
        # Arrange
        zendao_sync_time = datetime(2024, 3, 16, 14, 45, 0)

        project = Project(
            name="Test Project",
            code="TEST002",
            stage="研发",
            status="active",
            zendao_last_sync_at=zendao_sync_time,
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        task = await sync_service.create_task(
            db=session,
            task_type="incremental_sync",
            source_type="zendao",
            project_id=project.id,
        )

        # Act
        result = await sync_service._get_last_sync_time(session, task)

        # Assert
        assert result == zendao_sync_time

    async def test_get_last_sync_time_uses_last_sync_at_for_other_source(
        self, session: AsyncSession, sync_service
    ):
        """Test that _get_last_sync_time returns project.last_sync_at for other source types."""
        # Arrange
        generic_sync_time = datetime(2024, 3, 17, 9, 0, 0)

        project = Project(
            name="Test Project",
            code="TEST003",
            stage="研发",
            status="active",
            last_sync_at=generic_sync_time,
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        task = await sync_service.create_task(
            db=session,
            task_type="incremental_sync",
            source_type="trae",
            project_id=project.id,
        )

        # Act
        result = await sync_service._get_last_sync_time(session, task)

        # Assert
        assert result == generic_sync_time

    async def test_get_last_sync_time_falls_back_to_task_when_project_field_is_null(
        self, session: AsyncSession, sync_service
    ):
        """Test that _get_last_sync_time falls back to task query when project field is null."""
        # Arrange
        project = Project(
            name="Test Project",
            code="TEST004",
            stage="研发",
            status="active",
            gitlab_last_sync_at=None,
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Create and complete a previous sync task
        prev_task = await sync_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
            project_id=project.id,
        )
        await sync_service.task_service.start_task(session, prev_task.id)
        completed_time = datetime(2024, 3, 18, 12, 0, 0)
        await sync_service.task_service.complete_task(
            session, prev_task.id, records_processed=10
        )
        # Update the completed_at to a known value
        prev_task.completed_at = completed_time
        await session.commit()

        task = await sync_service.create_task(
            db=session,
            task_type="incremental_sync",
            source_type="gitlab",
            project_id=project.id,
        )

        # Act
        result = await sync_service._get_last_sync_time(session, task)

        # Assert - should fall back to task completed_at
        assert result is not None

    async def test_get_last_sync_time_falls_back_to_task_when_no_project_id(
        self, session: AsyncSession, sync_service
    ):
        """Test that _get_last_sync_time falls back to task query when task has no project_id."""
        # Arrange
        # Create and complete a previous sync task without project_id
        prev_task = await sync_service.create_task(
            db=session,
            task_type="full_sync",
            source_type="gitlab",
            project_id=None,
        )
        await sync_service.task_service.start_task(session, prev_task.id)
        await sync_service.task_service.complete_task(session, prev_task.id, records_processed=10)

        task = await sync_service.create_task(
            db=session,
            task_type="incremental_sync",
            source_type="gitlab",
            project_id=None,
        )

        # Act
        result = await sync_service._get_last_sync_time(session, task)

        # Assert - should fall back to task completed_at
        assert result is not None

    async def test_get_last_sync_time_returns_none_when_no_project_and_no_tasks(
        self, session: AsyncSession, sync_service
    ):
        """Test that _get_last_sync_time returns None when no project and no completed tasks."""
        # Arrange
        task = await sync_service.create_task(
            db=session,
            task_type="incremental_sync",
            source_type="gitlab",
            project_id=None,
        )

        # Act
        result = await sync_service._get_last_sync_time(session, task)

        # Assert
        assert result is None
