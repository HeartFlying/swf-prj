"""Tests for sync_gitlab unified response format - TDD Red Phase.

These tests verify that the sync_gitlab endpoint uses the unified ApiResponse format.

统一响应格式:
{
    "code": 202,
    "message": "GitLab sync task created and queued for execution.",
    "data": {
        "task_id": 1,
        "source": "gitlab",
        "status": "pending"
    }
}
"""

from unittest.mock import patch, MagicMock

import pytest
from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def app(session) -> FastAPI:
    """Create test FastAPI app with routes and overridden dependencies."""
    from fastapi import FastAPI

    from app.api.v1.sync import router as sync_router
    from app.db.base import get_db
    from app.core.dependencies import require_admin_permission

    app = FastAPI()

    async def override_get_db():
        yield session

    # Create a mock admin user
    async def override_require_admin():
        from app.db.models import User, Role
        mock_role = Role(id=1, name="admin", permissions=["*"])
        mock_user = User(
            id=1,
            username="test_admin",
            email="test@example.com",
            role_id=1,
            is_active=True
        )
        mock_user.role = mock_role
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


@pytest.fixture
def mock_celery_tasks():
    """Mock Celery tasks for testing."""
    with patch("app.api.v1.sync.sync_gitlab_commits") as mock_gitlab:
        # Configure mocks to return a mock delay method
        mock_gitlab.delay = MagicMock(return_value=MagicMock(id="test-gitlab-task-id"))
        yield mock_gitlab


class TestSyncGitLabUnifiedResponse:
    """Test cases for POST /api/v1/sync/gitlab endpoint with unified response format."""

    @pytest.mark.asyncio
    async def test_sync_gitlab_unified_response_format(self, client: AsyncClient, mock_celery_tasks):
        """Test that sync_gitlab returns unified ApiResponse format."""
        sync_data = {
            "project_id": 1,
            "sync_type": "incremental_sync",
        }

        response = await client.post("/api/v1/sync/gitlab", json=sync_data)

        # Verify response status code
        assert response.status_code == status.HTTP_202_ACCEPTED

        # Verify response structure (unified format)
        data = response.json()

        # Verify unified response format
        assert "code" in data, "Response must contain 'code' field"
        assert "message" in data, "Response must contain 'message' field"
        assert "data" in data, "Response must contain 'data' field"

        # Verify code is 202 (Accepted)
        assert data["code"] == 202, f"Expected code 202, got {data['code']}"

        # Verify message
        assert data["message"] == "GitLab sync task created and queued for execution.", \
            f"Unexpected message: {data.get('message')}"

        # Verify data is a dictionary
        assert isinstance(data["data"], dict), "'data' must be a dictionary"

        # Verify data fields
        assert "task_id" in data["data"], "data must contain 'task_id' field"
        assert "source" in data["data"], "data must contain 'source' field"
        assert "status" in data["data"], "data must contain 'status' field"

        # Verify data values
        assert isinstance(data["data"]["task_id"], int), "task_id must be an integer"
        assert data["data"]["source"] == "gitlab", f"Expected source 'gitlab', got {data['data'].get('source')}"
        assert data["data"]["status"] == "pending", f"Expected status 'pending', got {data['data'].get('status')}"

    @pytest.mark.asyncio
    async def test_sync_gitlab_response_without_project_id(self, client: AsyncClient, mock_celery_tasks):
        """Test sync_gitlab with empty body returns unified format."""
        response = await client.post("/api/v1/sync/gitlab", json={})

        # Verify response status code
        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()

        # Verify unified response format
        assert "code" in data
        assert "message" in data
        assert "data" in data

        # Verify data structure
        assert isinstance(data["data"], dict)
        assert "task_id" in data["data"]
        assert "source" in data["data"]
        assert "status" in data["data"]

        assert data["data"]["source"] == "gitlab"
        assert data["data"]["status"] == "pending"

    @pytest.mark.asyncio
    async def test_sync_gitlab_old_format_should_fail(self, client: AsyncClient, mock_celery_tasks):
        """Test that old flat response format is no longer used.

        Old format was:
        {
            "task_id": 1,
            "source": "gitlab",
            "status": "pending",
            "message": "..."
        }

        New format wraps these in 'data':
        {
            "code": 202,
            "message": "...",
            "data": {
                "task_id": 1,
                "source": "gitlab",
                "status": "pending"
            }
        }
        """
        sync_data = {
            "project_id": 1,
            "sync_type": "incremental_sync",
        }

        response = await client.post("/api/v1/sync/gitlab", json=sync_data)

        # Verify response status code
        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()

        # Old format had task_id at top level - new format should NOT have this
        # (it should be in data.task_id instead)
        if "task_id" in data and "data" not in data:
            pytest.fail("Endpoint is still using old flat response format. "
                       "Expected unified ApiResponse format with 'code', 'message', 'data' fields.")

        # Verify new format is used
        assert "data" in data, "New format must have 'data' field"
        assert "code" in data, "New format must have 'code' field"
