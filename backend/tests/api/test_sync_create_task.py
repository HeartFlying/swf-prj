"""Tests for POST /sync/tasks endpoint - Create Sync Task.

TDD流程:
1. Red: 编写测试，确保测试失败
2. Green: 实现代码，使测试通过
3. Refactor: 重构代码，保持测试通过
"""

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


class TestCreateSyncTask:
    """Test cases for POST /api/v1/sync/tasks endpoint."""

    @pytest.mark.asyncio
    async def test_create_sync_task_success(self, client: AsyncClient):
        """Test creating a sync task with valid data returns 202."""
        # Create a mock task object
        mock_task_obj = MagicMock()
        mock_task_obj.id = 123
        mock_task_obj.source_type = "gitlab"
        mock_task_obj.status = "pending"

        # Mock the sync_service.create_task to return the mock task
        async_mock_create_task = AsyncMock(return_value=mock_task_obj)

        with patch(
            "app.api.v1.sync.sync_service.create_task", async_mock_create_task
        ):
            response = await client.post(
                "/api/v1/sync/tasks",
                json={
                    "source_type": "gitlab",
                    "project_ids": [1, 2, 3],
                    "start_date": "2026-01-01",
                    "end_date": "2026-01-31",
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

        # Verify data structure
        assert data["data"] is not None, "data field should not be None"
        assert "task_id" in data["data"], "data should have 'task_id' field"
        assert "source" in data["data"], "data should have 'source' field"
        assert "status" in data["data"], "data should have 'status' field"

        # Verify data values
        assert data["data"]["source"] == "gitlab"
        assert data["data"]["status"] == "pending"
        assert isinstance(data["data"]["task_id"], int)

    @pytest.mark.asyncio
    async def test_create_sync_task_minimal_data(self, client: AsyncClient):
        """Test creating a sync task with minimal required data."""
        mock_task_obj = MagicMock()
        mock_task_obj.id = 124
        mock_task_obj.source_type = "trae"
        mock_task_obj.status = "pending"

        async_mock_create_task = AsyncMock(return_value=mock_task_obj)

        with patch(
            "app.api.v1.sync.sync_service.create_task", async_mock_create_task
        ):
            response = await client.post(
                "/api/v1/sync/tasks",
                json={
                    "source_type": "trae",
                },
            )

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert data["code"] == 202
        assert data["data"]["source"] == "trae"
        assert data["data"]["status"] == "pending"

    @pytest.mark.asyncio
    async def test_create_sync_task_invalid_source_type(self, client: AsyncClient):
        """Test creating a sync task with invalid source_type returns 422."""
        response = await client.post(
            "/api/v1/sync/tasks",
            json={
                "source_type": "invalid_source",
            },
        )

        # Should fail validation
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_create_sync_task_missing_source_type(self, client: AsyncClient):
        """Test creating a sync task without required source_type returns 422."""
        response = await client.post(
            "/api/v1/sync/tasks",
            json={
                "project_ids": [1, 2],
            },
        )

        # Should fail validation
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_create_sync_task_invalid_date_range(self, client: AsyncClient):
        """Test creating a sync task with start_date > end_date returns 422."""
        response = await client.post(
            "/api/v1/sync/tasks",
            json={
                "source_type": "gitlab",
                "start_date": "2026-12-31",
                "end_date": "2026-01-01",
            },
        )

        # Should fail validation - start_date cannot be after end_date
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_create_sync_task_all_source_types(self, client: AsyncClient):
        """Test creating sync tasks for all valid source types."""
        source_types = ["gitlab", "trae", "zendao"]

        for source_type in source_types:
            mock_task_obj = MagicMock()
            mock_task_obj.id = 100 + hash(source_type) % 100
            mock_task_obj.source_type = source_type
            mock_task_obj.status = "pending"

            async_mock_create_task = AsyncMock(return_value=mock_task_obj)

            with patch(
                "app.api.v1.sync.sync_service.create_task", async_mock_create_task
            ):
                response = await client.post(
                    "/api/v1/sync/tasks",
                    json={
                        "source_type": source_type,
                        "project_ids": [1],
                    },
                )

                assert response.status_code == status.HTTP_202_ACCEPTED, f"Failed for source_type: {source_type}"
                data = response.json()
                assert data["data"]["source"] == source_type

    @pytest.mark.asyncio
    async def test_create_sync_task_service_error(self, client: AsyncClient):
        """Test handling of service layer errors."""
        async_mock_create_task = AsyncMock(side_effect=Exception("Database error"))

        with patch(
            "app.api.v1.sync.sync_service.create_task", async_mock_create_task
        ):
            response = await client.post(
                "/api/v1/sync/tasks",
                json={
                    "source_type": "gitlab",
                },
            )

        # Should return 500 on service error
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
