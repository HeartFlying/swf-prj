"""Tests for sync API endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient

from app.api.v1.sync import router as sync_router
from app.core.dependencies import require_admin_permission
from app.db.base import get_db


@pytest.fixture
def app(session) -> FastAPI:
    """Create test FastAPI app with routes and overridden dependencies."""
    from fastapi import FastAPI

    app = FastAPI()

    async def override_get_db():
        yield session

    async def override_require_admin():
        """Mock admin permission check."""
        from app.db.models import User

        mock_user = MagicMock(spec=User)
        mock_user.username = "admin_test"
        return mock_user

    app.include_router(sync_router, prefix="/api/v1/sync")
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_admin_permission] = override_require_admin

    return app


@pytest.fixture
async def client(app: FastAPI) -> AsyncClient:
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestSyncZendaoEndpoint:
    """Tests for sync_zendao endpoint with unified response format."""

    @pytest.mark.asyncio
    async def test_sync_zendao_returns_unified_response_format(
        self,
        client: AsyncClient,
    ):
        """Test that sync_zendao returns ApiResponse[SyncTaskCreateData] format."""

        # Create a mock task object
        mock_task_obj = MagicMock()
        mock_task_obj.id = 123

        # Mock the sync_service.create_task to return the mock task
        async_mock_create_task = AsyncMock(return_value=mock_task_obj)

        # Mock the celery task to avoid actual execution
        with patch("app.api.v1.sync.sync_zendao_bugs") as mock_celery_task:
            mock_celery_task.delay.return_value = None

            with patch(
                "app.api.v1.sync.sync_service.create_task", async_mock_create_task
            ):
                response = await client.post(
                    "/api/v1/sync/zendao",
                    json={
                        "project_id": 1,
                        "sync_type": "incremental_sync",
                    },
                )

                # Debug: print response if not 202
                if response.status_code != 202:
                    print(f"Response status: {response.status_code}")
                    print(f"Response body: {response.text}")

        # Verify response status code
        assert response.status_code == status.HTTP_202_ACCEPTED

        # Verify response structure (unified format)
        data = response.json()
        assert "code" in data, "Response should have 'code' field"
        assert "message" in data, "Response should have 'message' field"
        assert "data" in data, "Response should have 'data' field"

        # Verify code is 202
        assert data["code"] == 202, f"Expected code 202, got {data['code']}"

        # Verify message
        assert (
            "ZenTao" in data["message"] or "zendao" in data["message"].lower()
        ), f"Message should mention ZenTao, got: {data['message']}"

        # Verify data structure
        assert data["data"] is not None, "data field should not be None"
        assert "task_id" in data["data"], "data should have 'task_id' field"
        assert "source" in data["data"], "data should have 'source' field"
        assert "status" in data["data"], "data should have 'status' field"

        # Verify data values
        assert data["data"]["source"] == "zendao"
        assert data["data"]["status"] == "pending"
        assert isinstance(data["data"]["task_id"], int)


def assert_api_response_format(response_data: dict, expected_data_fields: list[str] | None = None):
    """Helper function to verify unified API response format.

    Args:
        response_data: The JSON response from API
        expected_data_fields: List of expected fields in the data object
    """
    assert "code" in response_data, "Response must contain 'code' field"
    assert "message" in response_data, "Response must contain 'message' field"
    assert "data" in response_data, "Response must contain 'data' field"

    assert isinstance(response_data["code"], int), "'code' must be an integer"
    assert isinstance(response_data["message"], str), "'message' must be a string"
    assert isinstance(response_data["data"], dict), "'data' must be a dictionary"

    if expected_data_fields:
        for field in expected_data_fields:
            assert field in response_data["data"], f"Data must contain '{field}' field"


class TestGetSyncStatus:
    """Test cases for GET /api/v1/sync/status endpoint with unified response format."""

    @pytest.mark.asyncio
    async def test_get_sync_status_returns_unified_response_format(
        self, client: AsyncClient, session
    ):
        """Test that get_sync_status returns ApiResponse[SyncStatusData] format."""
        from datetime import datetime

        from app.db.models import SyncTask

        # Create some sync tasks to have data in the response
        for i in range(3):
            task = SyncTask(
                task_type="incremental_sync",
                source_type="gitlab" if i % 2 == 0 else "trae",
                status="completed",
                project_id=1 if i % 2 == 0 else None,
                records_processed=100 * i,
                records_failed=0,
                created_by="admin_test",
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
            )
            session.add(task)
        await session.commit()

        response = await client.get("/api/v1/sync/status")

        # Verify response status code
        assert response.status_code == status.HTTP_200_OK

        # Verify unified response format
        data = response.json()
        assert_api_response_format(data, [
            "isRunning",
            "lastSyncAt",
            "pendingTasks",
        ])

        # Verify data types and values
        assert data["code"] == 200
        assert data["message"] == "Sync status retrieved successfully"
        assert isinstance(data["data"]["isRunning"], bool)
        assert isinstance(data["data"]["lastSyncAt"], (str, type(None)))
        assert isinstance(data["data"]["pendingTasks"], int)

    @pytest.mark.asyncio
    async def test_get_sync_status_empty_database(self, client: AsyncClient):
        """Test get_sync_status when no tasks exist."""
        response = await client.get("/api/v1/sync/status")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert_api_response_format(data, ["isRunning", "lastSyncAt", "pendingTasks"])
        assert data["code"] == 200
        assert data["message"] == "Sync status retrieved successfully"
        assert data["data"]["isRunning"] == False
        assert data["data"]["lastSyncAt"] is None
        assert data["data"]["pendingTasks"] == 0


class TestCancelSyncTask:
    """Test cases for POST /api/v1/sync/tasks/{task_id}/cancel endpoint with unified response format."""

    @pytest.mark.asyncio
    async def test_cancel_sync_task_returns_unified_response_format(
        self, client: AsyncClient, session
    ):
        """Test that cancel_sync_task returns ApiResponse[SyncTaskCreateData] format."""
        from datetime import datetime

        from app.db.models import SyncTask

        # Create a sync task to cancel
        task = SyncTask(
            task_type="incremental_sync",
            source_type="gitlab",
            status="pending",
            project_id=1,
            created_by="admin_test",
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)

        response = await client.post(f"/api/v1/sync/tasks/{task.id}/cancel")

        # Verify response status code
        assert response.status_code == status.HTTP_200_OK

        # Verify unified response format
        data = response.json()
        assert_api_response_format(data, [
            "task_id",
            "source",
            "status",
        ])

        # Verify data types and values
        assert data["code"] == 200
        assert data["message"] == "Sync task cancelled successfully"
        assert data["data"]["task_id"] == task.id
        assert data["data"]["source"] == "gitlab"
        assert data["data"]["status"] == "cancelled"

    @pytest.mark.asyncio
    async def test_cancel_sync_task_not_found(self, client: AsyncClient):
        """Test cancel_sync_task with non-existent task ID returns 400 Bad Request.

        Note: The service raises ValueError for non-existent tasks, which is
        converted to 400 Bad Request by the endpoint.
        """
        response = await client.post("/api/v1/sync/tasks/99999/cancel")

        # ValueError from service is converted to 400 Bad Request
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not found" in response.json()["detail"].lower()


class TestGetSyncTaskDetail:
    """Test cases for GET /api/v1/sync/tasks/{task_id} endpoint with unified response format."""

    @pytest.mark.asyncio
    async def test_get_sync_task_detail_success(self, client: AsyncClient, session):
        """Test getting sync task detail with unified response format."""
        from datetime import datetime

        from app.db.models import SyncTask

        # Create a sync task
        task = SyncTask(
            task_type="incremental_sync",
            source_type="gitlab",
            status="completed",
            project_id=1,
            records_processed=150,
            records_failed=5,
            error_message=None,
            created_by="admin_test",
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)

        response = await client.get(f"/api/v1/sync/tasks/{task.id}")

        # Verify response status code
        assert response.status_code == status.HTTP_200_OK

        # Verify unified response format
        data = response.json()
        assert_api_response_format(data, [
            "id",
            "taskType",
            "sourceType",
            "status",
            "recordsProcessed",
            "recordsFailed",
            "createdAt",
        ])

        # Verify data types and values
        assert data["code"] == 200
        assert data["message"] == "Sync task retrieved successfully"
        assert data["data"]["id"] == task.id
        assert data["data"]["taskType"] == "incremental_sync"
        assert data["data"]["sourceType"] == "gitlab"
        assert data["data"]["status"] == "completed"
        assert data["data"]["projectId"] == 1
        assert data["data"]["recordsProcessed"] == 150
        assert data["data"]["recordsFailed"] == 5
        assert data["data"]["errorMessage"] is None
        # Verify optional fields that frontend expects
        assert "userId" in data["data"]
        assert "progress" in data["data"]

    @pytest.mark.asyncio
    async def test_get_sync_task_detail_not_found(self, client: AsyncClient):
        """Test getting non-existent sync task returns 404."""
        response = await client.get("/api/v1/sync/tasks/99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()


class TestGetSyncTaskLogs:
    """Test cases for GET /api/v1/sync/tasks/{task_id}/logs endpoint with unified response format."""

    @pytest.mark.asyncio
    async def test_get_sync_task_logs_success(self, client: AsyncClient, session):
        """Test getting sync logs for a specific task with new endpoint path."""
        from datetime import datetime

        from app.db.models import SyncLog, SyncTask

        # Create a sync task
        task = SyncTask(
            task_type="incremental_sync",
            source_type="gitlab",
            status="completed",
            project_id=1,
            records_processed=100,
            records_failed=0,
            created_by="admin_test",
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)

        # Create some sync logs for this task
        for i in range(5):
            log = SyncLog(
                task_id=task.id,
                level="info" if i % 2 == 0 else "error",
                message=f"Test log message {i}",
                details={"index": i},
            )
            session.add(log)
        await session.commit()

        # Test the new endpoint path
        response = await client.get(f"/api/v1/sync/tasks/{task.id}/logs")

        # Verify response status code
        assert response.status_code == status.HTTP_200_OK

        # Verify unified response format
        data = response.json()
        assert_api_response_format(data, [
            "items",
            "total",
            "page",
            "pageSize",
        ])

        # Verify data types and values
        assert data["code"] == 200
        assert data["message"] == "Sync logs retrieved successfully"
        assert isinstance(data["data"]["items"], list)
        assert len(data["data"]["items"]) == 5
        assert data["data"]["total"] == 5
        assert data["data"]["page"] == 1
        assert data["data"]["pageSize"] == 20

        # Verify log item structure
        for log_item in data["data"]["items"]:
            assert "id" in log_item
            assert "task_id" in log_item
            assert "level" in log_item
            assert "message" in log_item
            assert "created_at" in log_item

    @pytest.mark.asyncio
    async def test_get_sync_task_logs_not_found(self, client: AsyncClient):
        """Test getting sync logs for non-existent task returns 404."""
        response = await client.get("/api/v1/sync/tasks/99999/logs")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_sync_task_logs_with_pagination(self, client: AsyncClient, session):
        """Test getting sync logs with pagination parameters."""
        from datetime import datetime

        from app.db.models import SyncLog, SyncTask

        # Create a sync task
        task = SyncTask(
            task_type="incremental_sync",
            source_type="gitlab",
            status="completed",
            project_id=1,
            records_processed=100,
            records_failed=0,
            created_by="admin_test",
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)

        # Create 25 sync logs for this task
        for i in range(25):
            log = SyncLog(
                task_id=task.id,
                level="info",
                message=f"Test log message {i}",
            )
            session.add(log)
        await session.commit()

        # Test with page=2 and pageSize=10
        response = await client.get(f"/api/v1/sync/tasks/{task.id}/logs?page=2&pageSize=10")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"]["page"] == 2
        assert data["data"]["pageSize"] == 10
        assert data["data"]["total"] == 25
        assert len(data["data"]["items"]) == 10

    @pytest.mark.asyncio
    async def test_get_sync_task_logs_with_level_filter(self, client: AsyncClient, session):
        """Test getting sync logs with level filter."""
        from datetime import datetime

        from app.db.models import SyncLog, SyncTask

        # Create a sync task
        task = SyncTask(
            task_type="incremental_sync",
            source_type="gitlab",
            status="completed",
            project_id=1,
            records_processed=100,
            records_failed=0,
            created_by="admin_test",
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)

        # Create logs with different levels
        for i in range(3):
            log = SyncLog(
                task_id=task.id,
                level="error",
                message=f"Error log {i}",
            )
            session.add(log)
        for i in range(5):
            log = SyncLog(
                task_id=task.id,
                level="info",
                message=f"Info log {i}",
            )
            session.add(log)
        await session.commit()

        # Test with level filter
        response = await client.get(f"/api/v1/sync/tasks/{task.id}/logs?level=error")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"]["total"] == 3
        for log_item in data["data"]["items"]:
            assert log_item["level"] == "error"

    @pytest.mark.asyncio
    async def test_get_sync_task_logs_empty_result(self, client: AsyncClient, session):
        """Test getting sync logs for task with no logs."""
        from datetime import datetime

        from app.db.models import SyncTask

        # Create a sync task without any logs
        task = SyncTask(
            task_type="incremental_sync",
            source_type="gitlab",
            status="completed",
            project_id=1,
            records_processed=100,
            records_failed=0,
            created_by="admin_test",
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)

        response = await client.get(f"/api/v1/sync/tasks/{task.id}/logs")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert_api_response_format(data, ["items", "total", "page", "pageSize"])
        assert data["data"]["items"] == []
        assert data["data"]["total"] == 0


class TestListSyncTasks:
    """Test cases for GET /api/v1/sync/tasks endpoint with unified response format."""

    @pytest.mark.asyncio
    async def test_list_sync_tasks_success(self, client: AsyncClient, session):
        """Test listing sync tasks with unified response format."""
        from datetime import datetime

        from app.db.models import SyncTask

        # Create sample sync tasks
        for i in range(3):
            task = SyncTask(
                task_type="incremental_sync",
                source_type="gitlab" if i % 2 == 0 else "trae",
                status="completed",
                project_id=1 if i % 2 == 0 else None,
                records_processed=100 * i,
                records_failed=0,
                created_by="admin_test",
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
            )
            session.add(task)
        await session.commit()

        response = await client.get("/api/v1/sync/tasks")

        # Verify response status code
        assert response.status_code == status.HTTP_200_OK

        # Verify unified response format
        data = response.json()
        assert_api_response_format(data, [
            "items",
            "total",
            "page",
            "pageSize",
        ])

        # Verify data types and values
        assert data["code"] == 200
        assert data["message"] == "Sync tasks retrieved successfully"
        assert isinstance(data["data"]["items"], list)
        assert isinstance(data["data"]["total"], int)
        assert isinstance(data["data"]["page"], int)
        assert isinstance(data["data"]["pageSize"], int)
        assert data["data"]["page"] == 1
        assert data["data"]["pageSize"] == 20

    @pytest.mark.asyncio
    async def test_list_sync_tasks_empty_result(self, client: AsyncClient):
        """Test listing sync tasks when no tasks exist."""
        response = await client.get("/api/v1/sync/tasks")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert_api_response_format(data, ["items", "total", "page", "pageSize"])
        assert data["data"]["items"] == []
        assert data["data"]["total"] == 0

    @pytest.mark.asyncio
    async def test_list_sync_tasks_with_camel_case_params(self, client: AsyncClient, session):
        """Test listing sync tasks with camelCase query parameters (frontend compatibility)."""
        from datetime import datetime

        from app.db.models import SyncTask

        # Create sample sync tasks with different source types
        for i in range(5):
            task = SyncTask(
                task_type="incremental_sync",
                source_type="gitlab" if i % 2 == 0 else "trae",
                status="completed" if i < 3 else "running",
                project_id=1 if i % 2 == 0 else None,
                records_processed=100 * i,
                records_failed=0,
                created_by="admin_test",
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow() if i < 3 else None,
            )
            session.add(task)
        await session.commit()

        # Test with sourceType filter (camelCase)
        response = await client.get("/api/v1/sync/tasks?sourceType=gitlab")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert all(item["sourceType"] == "gitlab" for item in data["data"]["items"])

        # Test with status filter
        response = await client.get("/api/v1/sync/tasks?status=running")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert all(item["status"] == "running" for item in data["data"]["items"])

        # Test combined filters
        response = await client.get("/api/v1/sync/tasks?sourceType=gitlab&status=completed")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert all(item["sourceType"] == "gitlab" and item["status"] == "completed"
                   for item in data["data"]["items"])

    @pytest.mark.asyncio
    async def test_list_sync_tasks_response_has_camel_case_fields(self, client: AsyncClient, session):
        """Test that sync task items have camelCase field names (frontend compatibility)."""
        from datetime import datetime

        from app.db.models import SyncTask

        # Create a sync task
        task = SyncTask(
            task_type="incremental_sync",
            source_type="gitlab",
            status="completed",
            project_id=1,
            records_processed=150,
            records_failed=5,
            error_message="Test error",
            created_by="admin_test",
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
        )
        session.add(task)
        await session.commit()

        response = await client.get("/api/v1/sync/tasks")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify response structure
        assert len(data["data"]["items"]) == 1
        item = data["data"]["items"][0]

        # Verify camelCase field names (matching frontend SyncTask interface)
        assert "id" in item
        assert "taskType" in item, "Expected camelCase 'taskType' field"
        assert "sourceType" in item, "Expected camelCase 'sourceType' field"
        assert "projectId" in item, "Expected camelCase 'projectId' field"
        assert "recordsProcessed" in item, "Expected camelCase 'recordsProcessed' field"
        assert "recordsFailed" in item, "Expected camelCase 'recordsFailed' field"
        assert "errorMessage" in item, "Expected camelCase 'errorMessage' field"
        assert "startedAt" in item, "Expected camelCase 'startedAt' field"
        assert "completedAt" in item, "Expected camelCase 'completedAt' field"
        assert "createdAt" in item, "Expected camelCase 'createdAt' field"
        assert "status" in item

        # Verify values
        assert item["taskType"] == "incremental_sync"
        assert item["sourceType"] == "gitlab"
        assert item["projectId"] == 1
        assert item["recordsProcessed"] == 150
        assert item["recordsFailed"] == 5
        assert item["errorMessage"] == "Test error"
