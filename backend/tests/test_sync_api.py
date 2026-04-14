"""Tests for Sync API - TDD Red Phase.

These tests define the expected behavior of the data synchronization API endpoints.
"""


import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient



@pytest.fixture
def app(session) -> FastAPI:
    """Create test FastAPI app with routes and overridden dependencies."""
    from fastapi import FastAPI

    from app.api.v1.sync import router as sync_router
    from app.core.dependencies import require_admin_permission
    from app.db.base import get_db

    app = FastAPI()

    async def override_get_db():
        yield session

    # Mock admin permission - returns a simple object with required attributes
    class MockAdminUser:
        id = 1
        username = "admin_test"
        email = "admin@test.com"
        role = "admin"
        is_active = True

    async def override_require_admin():
        return MockAdminUser()

    app.include_router(sync_router, prefix="/api/v1/sync")
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_admin_permission] = override_require_admin

    return app


@pytest.fixture
async def client(app: FastAPI) -> AsyncClient:
    """Create async test client."""
    from httpx import ASGITransport, AsyncClient
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestSyncGitLab:
    """Test cases for POST /api/v1/sync/gitlab endpoint."""

    @pytest.mark.asyncio
    async def test_sync_gitlab_success(self, client: AsyncClient):
        """Test triggering GitLab sync with unified response format."""
        from unittest.mock import patch

        with patch("app.api.v1.sync.sync_gitlab_commits") as mock_task:
            mock_task.delay.return_value = None

            sync_data = {
                "project_ids": [1, 2, 3],
                "start_date": "2024-01-01",
                "end_date": "2024-12-31",
            }

            response = await client.post("/api/v1/sync/gitlab", json=sync_data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        # Verify unified response format
        assert "code" in data
        assert "message" in data
        assert "data" in data
        assert data["code"] == 202
        # Verify data structure
        assert "task_id" in data["data"]
        assert data["data"]["status"] == "pending"
        assert data["data"]["source"] == "gitlab"

    @pytest.mark.asyncio
    async def test_sync_gitlab_empty_body(self, client: AsyncClient):
        """Test triggering GitLab sync with empty body (sync all)."""
        from unittest.mock import patch

        with patch("app.api.v1.sync.sync_gitlab_commits") as mock_task:
            mock_task.delay.return_value = None

            response = await client.post("/api/v1/sync/gitlab", json={})

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        # Verify unified response format
        assert "code" in data
        assert "data" in data
        assert "task_id" in data["data"]
        assert data["data"]["status"] == "pending"


class TestSyncTrae:
    """Test cases for POST /api/v1/sync/trae endpoint."""

    @pytest.mark.asyncio
    async def test_sync_trae_success(self, client: AsyncClient):
        """Test triggering Trae sync with unified response format."""
        from unittest.mock import patch

        with patch("app.api.v1.sync.sync_trae_token_usage") as mock_task:
            mock_task.delay.return_value = None

            sync_data = {
                "user_ids": [1, 2],
                "start_date": "2024-01-01",
            }

            response = await client.post("/api/v1/sync/trae", json=sync_data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        # Verify unified response format
        assert "code" in data
        assert "message" in data
        assert "data" in data
        assert data["code"] == 202
        # Verify data structure
        assert "task_id" in data["data"]
        assert data["data"]["status"] == "pending"
        assert data["data"]["source"] == "trae"


class TestSyncZendao:
    """Test cases for POST /api/v1/sync/zendao endpoint."""

    @pytest.mark.asyncio
    async def test_sync_zendao_success(self, client: AsyncClient):
        """Test triggering Zendao sync with unified response format."""
        from unittest.mock import patch

        with patch("app.api.v1.sync.sync_zendao_bugs") as mock_task:
            mock_task.delay.return_value = None

            sync_data = {
                "project_ids": [1],
            }

            response = await client.post("/api/v1/sync/zendao", json=sync_data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        # Verify unified response format
        assert "code" in data
        assert "message" in data
        assert "data" in data
        assert data["code"] == 202
        # Verify data structure
        assert "task_id" in data["data"]
        assert data["data"]["status"] == "pending"
        assert data["data"]["source"] == "zendao"


class TestSyncTasks:
    """Test cases for GET /api/v1/sync/tasks endpoint."""

    @pytest.mark.asyncio
    async def test_list_sync_tasks(self, client: AsyncClient):
        """Test listing sync tasks with unified response format."""
        response = await client.get("/api/v1/sync/tasks")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        # Verify unified response format
        assert "code" in result
        assert "message" in result
        assert "data" in result
        assert result["code"] == 200
        # Verify data structure
        data = result["data"]
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_sync_tasks_with_filter(self, client: AsyncClient):
        """Test listing sync tasks with filter."""
        response = await client.get("/api/v1/sync/tasks?status=pending&source_type=gitlab")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        # Verify unified response format
        assert "code" in result
        assert "data" in result
        data = result["data"]
        assert isinstance(data["items"], list)
        # All returned items should match the filter
        for item in data["items"]:
            assert item["status"] == "pending"
            assert item["source_type"] == "gitlab"

    @pytest.mark.asyncio
    async def test_list_sync_tasks_pagination(self, client: AsyncClient):
        """Test sync tasks pagination."""
        response = await client.get("/api/v1/sync/tasks?page=1&pageSize=5")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        # Verify unified response format
        assert "code" in result
        assert "data" in result
        data = result["data"]
        assert data["page"] == 1
        assert data["pageSize"] == 5


class TestSyncLogs:
    """Test cases for GET /api/v1/sync/logs endpoint."""

    @pytest.mark.asyncio
    async def test_list_sync_logs(self, client: AsyncClient):
        """Test listing sync logs with unified response format."""
        response = await client.get("/api/v1/sync/logs")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        # Verify unified response format
        assert "code" in result
        assert "message" in result
        assert "data" in result
        assert result["code"] == 200
        # Verify data structure
        data = result["data"]
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_sync_logs_with_task_id(self, client: AsyncClient):
        """Test listing sync logs for specific task."""
        response = await client.get("/api/v1/sync/logs?task_id=1")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        # Verify unified response format
        assert "code" in result
        assert "data" in result
        data = result["data"]
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_sync_logs_with_level(self, client: AsyncClient):
        """Test listing sync logs with level filter."""
        response = await client.get("/api/v1/sync/logs?level=error")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        # Verify unified response format
        assert "code" in result
        assert "data" in result
        data = result["data"]
        assert isinstance(data["items"], list)
        # All returned items should have level >= error
        for item in data["items"]:
            assert item["level"] in ["error", "critical"]


class TestGetSyncTask:
    """Test cases for GET /api/v1/sync/tasks/{task_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_sync_task_success(self, client: AsyncClient):
        """Test getting sync task details with unified response format."""
        from unittest.mock import patch

        # Mock the celery task to avoid actual execution
        with patch("app.api.v1.sync.sync_gitlab_commits") as mock_task:
            mock_task.delay.return_value = None

            # First create a task
            sync_data = {"project_id": 1}
            create_response = await client.post("/api/v1/sync/gitlab", json=sync_data)
            assert create_response.status_code == status.HTTP_202_ACCEPTED
            task_id = create_response.json()["data"]["task_id"]

        # Get the task details
        response = await client.get(f"/api/v1/sync/tasks/{task_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify unified response format
        assert "code" in data
        assert "message" in data
        assert "data" in data
        assert data["code"] == 200
        assert data["message"] == "Sync task retrieved successfully"

        # Verify data structure
        task_data = data["data"]
        assert "id" in task_data
        assert "task_type" in task_data
        assert "source_type" in task_data
        assert "status" in task_data
        assert task_data["id"] == task_id
        assert task_data["source_type"] == "gitlab"

    @pytest.mark.asyncio
    async def test_get_sync_task_not_found(self, client: AsyncClient):
        """Test getting non-existent sync task."""
        response = await client.get("/api/v1/sync/tasks/99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND
