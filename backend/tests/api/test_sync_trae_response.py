"""Tests for sync_trae endpoint unified response format - TDD.

This test verifies that the sync_trae endpoint returns ApiResponse[SyncTaskCreateData] format.
"""

import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient


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

    # Create a mock admin user for testing
    async def override_require_admin():
        from app.db.models import User, Role
        # Return a mock user with admin permissions
        role = Role(id=1, name="admin", permissions=["*"])
        user = User(id=1, username="admin", email="admin@test.com", role_id=1)
        user.role = role
        return user

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


class TestSyncTraeUnifiedResponse:
    """Test cases for POST /api/v1/sync/trae endpoint with unified response format."""

    @pytest.mark.asyncio
    async def test_sync_trae_returns_unified_response_format(self, client: AsyncClient, monkeypatch):
        """Test that sync_trae returns ApiResponse[SyncTaskCreateData] format."""
        # Mock the celery task to avoid actual execution
        monkeypatch.setattr("app.api.v1.sync.sync_trae_token_usage.delay", lambda **kwargs: None)

        sync_data = {
            "user_id": 1,
            "sync_type": "incremental_sync",
        }

        response = await client.post("/api/v1/sync/trae", json=sync_data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()

        # Verify unified response format: ApiResponse[SyncTaskCreateData]
        assert "code" in data, "Response should have 'code' field"
        assert "message" in data, "Response should have 'message' field"
        assert "data" in data, "Response should have 'data' field"

        # Verify code is 202 (Accepted)
        assert data["code"] == 202, f"Expected code=202, got {data.get('code')}"

        # Verify message
        assert data["message"] == "Trae sync task created and queued for execution."

        # Verify data contains SyncTaskCreateData fields
        task_data = data["data"]
        assert "task_id" in task_data, "data should have 'task_id' field"
        assert "source" in task_data, "data should have 'source' field"
        assert "status" in task_data, "data should have 'status' field"

        # Verify data values
        assert task_data["source"] == "trae"
        assert task_data["status"] == "pending"
        assert isinstance(task_data["task_id"], int)

    @pytest.mark.asyncio
    async def test_sync_trae_empty_body_returns_unified_format(self, client: AsyncClient, monkeypatch):
        """Test that sync_trae with empty body returns unified response format."""
        # Mock the celery task to avoid actual execution
        monkeypatch.setattr("app.api.v1.sync.sync_trae_token_usage.delay", lambda **kwargs: None)

        response = await client.post("/api/v1/sync/trae", json={})

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()

        # Verify unified response format
        assert "code" in data
        assert "message" in data
        assert "data" in data

        # Verify code is 202
        assert data["code"] == 202

        # Verify data structure
        task_data = data["data"]
        assert task_data["source"] == "trae"
        assert task_data["status"] == "pending"
