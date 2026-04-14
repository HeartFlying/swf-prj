"""Tests for sync data schemas - TDD.

This file tests the data schema definitions in app.schemas.sync module.
These schemas are used for unified response formatting.
"""

import pytest
from pydantic import ValidationError


class TestSyncTaskCreateData:
    """Test cases for SyncTaskCreateData schema."""

    @pytest.fixture
    def sync_task_create_data_class(self):
        """Import the SyncTaskCreateData class."""
        from app.schemas.sync import SyncTaskCreateData
        return SyncTaskCreateData

    def test_sync_task_create_data_exists(self, sync_task_create_data_class):
        """Test that SyncTaskCreateData class exists."""
        assert sync_task_create_data_class is not None

    def test_sync_task_create_data_required_fields(self, sync_task_create_data_class):
        """Test that SyncTaskCreateData has all required fields."""
        # Create a valid instance
        data = sync_task_create_data_class(
            task_id=1,
            source="gitlab",
            status="pending"
        )

        # Verify all fields are accessible
        assert data.task_id == 1
        assert data.source == "gitlab"
        assert data.status == "pending"

    def test_sync_task_create_data_field_types(self, sync_task_create_data_class):
        """Test that SyncTaskCreateData fields have correct types."""
        data = sync_task_create_data_class(
            task_id=1,
            source="gitlab",
            status="pending"
        )

        # Verify field types
        assert isinstance(data.task_id, int)
        assert isinstance(data.source, str)
        assert isinstance(data.status, str)

    def test_sync_task_create_data_missing_required_fields(self, sync_task_create_data_class):
        """Test that SyncTaskCreateData validates required fields."""
        # Missing task_id
        with pytest.raises(ValidationError) as exc_info:
            sync_task_create_data_class(
                source="gitlab",
                status="pending"
            )
        assert "task_id" in str(exc_info.value)

        # Missing source
        with pytest.raises(ValidationError) as exc_info:
            sync_task_create_data_class(
                task_id=1,
                status="pending"
            )
        assert "source" in str(exc_info.value)

        # Missing status
        with pytest.raises(ValidationError) as exc_info:
            sync_task_create_data_class(
                task_id=1,
                source="gitlab"
            )
        assert "status" in str(exc_info.value)

    def test_sync_task_create_data_serialization(self, sync_task_create_data_class):
        """Test that SyncTaskCreateData can be serialized to dict."""
        data = sync_task_create_data_class(
            task_id=1,
            source="gitlab",
            status="pending"
        )

        # Serialize to dict
        result = data.model_dump()

        # Verify serialized data
        assert result["task_id"] == 1
        assert result["source"] == "gitlab"
        assert result["status"] == "pending"


class TestSyncTaskDetailData:
    """Test cases for SyncTaskDetailData schema."""

    @pytest.fixture
    def sync_task_detail_data_class(self):
        """Import the SyncTaskDetailData class."""
        from app.schemas.sync import SyncTaskDetailData
        return SyncTaskDetailData

    def test_sync_task_detail_data_exists(self, sync_task_detail_data_class):
        """Test that SyncTaskDetailData class exists."""
        assert sync_task_detail_data_class is not None

    def test_sync_task_detail_data_required_fields(self, sync_task_detail_data_class):
        """Test that SyncTaskDetailData has all required fields."""
        # Create a valid instance with all required fields
        data = sync_task_detail_data_class(
            id=1,
            task_type="gitlab_commits",
            source_type="gitlab",
            status="completed",
            created_at="2024-01-01T00:00:00"
        )

        # Verify all required fields are accessible
        assert data.id == 1
        assert data.task_type == "gitlab_commits"
        assert data.source_type == "gitlab"
        assert data.status == "completed"
        assert data.created_at == "2024-01-01T00:00:00"

    def test_sync_task_detail_data_optional_fields(self, sync_task_detail_data_class):
        """Test that SyncTaskDetailData optional fields work correctly."""
        # Create instance with optional fields
        data = sync_task_detail_data_class(
            id=1,
            task_type="gitlab_commits",
            source_type="gitlab",
            status="completed",
            project_id=123,
            started_at="2024-01-01T10:00:00",
            completed_at="2024-01-01T11:00:00",
            records_processed=100,
            records_failed=5,
            error_message=None,
            created_at="2024-01-01T00:00:00"
        )

        # Verify optional fields
        assert data.project_id == 123
        assert data.started_at == "2024-01-01T10:00:00"
        assert data.completed_at == "2024-01-01T11:00:00"
        assert data.records_processed == 100
        assert data.records_failed == 5
        assert data.error_message is None

    def test_sync_task_detail_data_default_values(self, sync_task_detail_data_class):
        """Test that SyncTaskDetailData has correct default values."""
        data = sync_task_detail_data_class(
            id=1,
            task_type="gitlab_commits",
            source_type="gitlab",
            status="pending",
            created_at="2024-01-01T00:00:00"
        )

        # Verify default values
        assert data.records_processed == 0
        assert data.records_failed == 0
        assert data.project_id is None
        assert data.started_at is None
        assert data.completed_at is None
        assert data.error_message is None

    def test_sync_task_detail_data_serialization(self, sync_task_detail_data_class):
        """Test that SyncTaskDetailData can be serialized to dict."""
        data = sync_task_detail_data_class(
            id=1,
            task_type="gitlab_commits",
            source_type="gitlab",
            status="completed",
            project_id=123,
            started_at="2024-01-01T10:00:00",
            completed_at="2024-01-01T11:00:00",
            records_processed=100,
            records_failed=5,
            created_at="2024-01-01T00:00:00"
        )

        # Serialize to dict
        result = data.model_dump()

        # Verify serialized data
        assert result["id"] == 1
        assert result["task_type"] == "gitlab_commits"
        assert result["source_type"] == "gitlab"
        assert result["status"] == "completed"
        assert result["project_id"] == 123
        assert result["records_processed"] == 100
        assert result["records_failed"] == 5


class TestSyncTaskListData:
    """Test cases for SyncTaskListData schema."""

    @pytest.fixture
    def sync_task_list_data_class(self):
        """Import the SyncTaskListData class."""
        from app.schemas.sync import SyncTaskListData
        return SyncTaskListData

    @pytest.fixture
    def sync_task_in_db_class(self):
        """Import the SyncTaskInDB class."""
        from app.schemas.sync import SyncTaskInDB
        return SyncTaskInDB

    def test_sync_task_list_data_exists(self, sync_task_list_data_class):
        """Test that SyncTaskListData class exists."""
        assert sync_task_list_data_class is not None

    def test_sync_task_list_data_required_fields(self, sync_task_list_data_class, sync_task_in_db_class):
        """Test that SyncTaskListData has all required fields."""
        from datetime import datetime

        # Create task items
        task1 = sync_task_in_db_class(
            id=1,
            task_type="gitlab_commits",
            source_type="gitlab",
            status="completed",
            created_at=datetime.now()
        )
        task2 = sync_task_in_db_class(
            id=2,
            task_type="trae_token",
            source_type="trae",
            status="pending",
            created_at=datetime.now()
        )

        # Create list data
        data = sync_task_list_data_class(
            items=[task1, task2],
            total=2,
            page=1,
            pageSize=10
        )

        # Verify all fields are accessible
        assert len(data.items) == 2
        assert data.total == 2
        assert data.page == 1
        assert data.pageSize == 10

    def test_sync_task_list_data_field_types(self, sync_task_list_data_class, sync_task_in_db_class):
        """Test that SyncTaskListData fields have correct types."""
        from datetime import datetime

        task = sync_task_in_db_class(
            id=1,
            task_type="gitlab_commits",
            source_type="gitlab",
            status="completed",
            created_at=datetime.now()
        )

        data = sync_task_list_data_class(
            items=[task],
            total=1,
            page=1,
            pageSize=10
        )

        # Verify field types
        assert isinstance(data.items, list)
        assert isinstance(data.total, int)
        assert isinstance(data.page, int)
        assert isinstance(data.pageSize, int)

    def test_sync_task_list_data_empty_items(self, sync_task_list_data_class):
        """Test that SyncTaskListData works with empty items."""
        data = sync_task_list_data_class(
            items=[],
            total=0,
            page=1,
            pageSize=10
        )

        assert data.items == []
        assert data.total == 0

    def test_sync_task_list_data_serialization(self, sync_task_list_data_class, sync_task_in_db_class):
        """Test that SyncTaskListData can be serialized to dict."""
        from datetime import datetime

        task = sync_task_in_db_class(
            id=1,
            task_type="gitlab_commits",
            source_type="gitlab",
            status="completed",
            created_at=datetime.now()
        )

        data = sync_task_list_data_class(
            items=[task],
            total=1,
            page=1,
            pageSize=10
        )

        # Serialize to dict
        result = data.model_dump()

        # Verify serialized data
        assert "items" in result
        assert result["total"] == 1
        assert result["page"] == 1
        assert result["pageSize"] == 10


class TestSyncStatusData:
    """Test cases for SyncStatusData schema."""

    @pytest.fixture
    def sync_status_data_class(self):
        """Import the SyncStatusData class."""
        from app.schemas.sync import SyncStatusData
        return SyncStatusData

    def test_sync_status_data_exists(self, sync_status_data_class):
        """Test that SyncStatusData class exists."""
        assert sync_status_data_class is not None

    def test_sync_status_data_required_fields(self, sync_status_data_class):
        """Test that SyncStatusData has all required fields."""
        # Create a valid instance
        data = sync_status_data_class(
            recent_tasks={
                "gitlab": 5,
                "trae": 3,
                "zendao": 2
            },
            running_tasks=[
                {"task_id": 1, "source": "gitlab", "status": "running"}
            ],
            last_updated="2024-01-01T12:00:00"
        )

        # Verify all fields are accessible
        assert data.recent_tasks["gitlab"] == 5
        assert data.recent_tasks["trae"] == 3
        assert len(data.running_tasks) == 1
        assert data.last_updated == "2024-01-01T12:00:00"

    def test_sync_status_data_field_types(self, sync_status_data_class):
        """Test that SyncStatusData fields have correct types."""
        data = sync_status_data_class(
            recent_tasks={"gitlab": 5},
            running_tasks=[],
            last_updated="2024-01-01T12:00:00"
        )

        # Verify field types
        assert isinstance(data.recent_tasks, dict)
        assert isinstance(data.running_tasks, list)
        assert isinstance(data.last_updated, str)

    def test_sync_status_data_empty_running_tasks(self, sync_status_data_class):
        """Test that SyncStatusData works with empty running tasks."""
        data = sync_status_data_class(
            recent_tasks={},
            running_tasks=[],
            last_updated="2024-01-01T12:00:00"
        )

        assert data.recent_tasks == {}
        assert data.running_tasks == []

    def test_sync_status_data_multiple_running_tasks(self, sync_status_data_class):
        """Test that SyncStatusData works with multiple running tasks."""
        data = sync_status_data_class(
            recent_tasks={
                "gitlab": 10,
                "trae": 5
            },
            running_tasks=[
                {"task_id": 1, "source": "gitlab", "progress": 50},
                {"task_id": 2, "source": "trae", "progress": 75}
            ],
            last_updated="2024-01-01T12:00:00"
        )

        assert len(data.running_tasks) == 2
        assert data.running_tasks[0]["task_id"] == 1
        assert data.running_tasks[1]["progress"] == 75

    def test_sync_status_data_serialization(self, sync_status_data_class):
        """Test that SyncStatusData can be serialized to dict."""
        data = sync_status_data_class(
            recent_tasks={"gitlab": 5, "trae": 3},
            running_tasks=[{"task_id": 1, "source": "gitlab"}],
            last_updated="2024-01-01T12:00:00"
        )

        # Serialize to dict
        result = data.model_dump()

        # Verify serialized data
        assert result["recent_tasks"] == {"gitlab": 5, "trae": 3}
        assert result["last_updated"] == "2024-01-01T12:00:00"
        assert len(result["running_tasks"]) == 1
