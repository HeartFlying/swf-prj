"""Tests for Sync API Celery task triggering - TDD.

These tests verify that sync API endpoints trigger Celery tasks correctly.
"""

import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient
from unittest.mock import patch, MagicMock


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
    from httpx import ASGITransport, AsyncClient
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_celery_tasks():
    """Mock Celery tasks for testing."""
    with patch("app.api.v1.sync.sync_gitlab_commits") as mock_gitlab, \
         patch("app.api.v1.sync.sync_trae_token_usage") as mock_trae, \
         patch("app.api.v1.sync.sync_zendao_bugs") as mock_zendao:

        # Configure mocks to return a mock delay method
        mock_gitlab.delay = MagicMock(return_value=MagicMock(id="test-gitlab-task-id"))
        mock_trae.delay = MagicMock(return_value=MagicMock(id="test-trae-task-id"))
        mock_zendao.delay = MagicMock(return_value=MagicMock(id="test-zendao-task-id"))

        yield {
            "gitlab": mock_gitlab,
            "trae": mock_trae,
            "zendao": mock_zendao,
        }


class TestSyncGitLabCeleryTrigger:
    """Test cases for GitLab sync triggering Celery tasks."""

    @pytest.mark.asyncio
    async def test_sync_gitlab_triggers_celery_task(self, client: AsyncClient, mock_celery_tasks):
        """Test that sync_gitlab endpoint triggers sync_gitlab_commits Celery task."""
        sync_data = {
            "project_id": 1,
            "sync_type": "incremental_sync",
        }

        response = await client.post("/api/v1/sync/gitlab", json=sync_data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()

        # Verify unified response format
        assert "code" in data
        assert "data" in data
        assert "task_id" in data["data"]

        # Verify Celery task was called with correct arguments
        mock_celery_tasks["gitlab"].delay.assert_called_once_with(
            project_id=1,
            task_id=data["data"]["task_id"]
        )

    @pytest.mark.asyncio
    async def test_sync_gitlab_returns_queued_message(self, client: AsyncClient, mock_celery_tasks):
        """Test that sync_gitlab returns message indicating task is queued."""
        sync_data = {
            "project_id": 1,
            "sync_type": "incremental_sync",
        }

        response = await client.post("/api/v1/sync/gitlab", json=sync_data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert "queued" in data["message"].lower() or "execution" in data["message"].lower()


class TestSyncTraeCeleryTrigger:
    """Test cases for Trae sync triggering Celery tasks."""

    @pytest.mark.asyncio
    async def test_sync_trae_triggers_celery_task(self, client: AsyncClient, mock_celery_tasks):
        """Test that sync_trae endpoint triggers sync_trae_token_usage Celery task."""
        sync_data = {
            "user_id": 1,
            "sync_type": "incremental_sync",
        }

        response = await client.post("/api/v1/sync/trae", json=sync_data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert "task_id" in data

        # Verify Celery task was called with correct arguments
        mock_celery_tasks["trae"].delay.assert_called_once_with(
            user_id=1,
            task_id=data["task_id"]
        )

    @pytest.mark.asyncio
    async def test_sync_trae_returns_queued_message(self, client: AsyncClient, mock_celery_tasks):
        """Test that sync_trae returns message indicating task is queued."""
        sync_data = {
            "user_id": 1,
            "sync_type": "incremental_sync",
        }

        response = await client.post("/api/v1/sync/trae", json=sync_data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert "queued" in data["message"].lower() or "execution" in data["message"].lower()


class TestSyncZendaoCeleryTrigger:
    """Test cases for Zendao sync triggering Celery tasks."""

    @pytest.mark.asyncio
    async def test_sync_zendao_triggers_celery_task(self, client: AsyncClient, mock_celery_tasks):
        """Test that sync_zendao endpoint triggers sync_zendao_bugs Celery task."""
        sync_data = {
            "project_id": 1,
            "sync_type": "incremental_sync",
        }

        response = await client.post("/api/v1/sync/zendao", json=sync_data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert "task_id" in data

        # Verify Celery task was called with correct arguments
        mock_celery_tasks["zendao"].delay.assert_called_once_with(
            project_id=1,
            task_id=data["task_id"]
        )

    @pytest.mark.asyncio
    async def test_sync_zendao_returns_queued_message(self, client: AsyncClient, mock_celery_tasks):
        """Test that sync_zendao returns message indicating task is queued."""
        sync_data = {
            "project_id": 1,
            "sync_type": "incremental_sync",
        }

        response = await client.post("/api/v1/sync/zendao", json=sync_data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert "queued" in data["message"].lower() or "execution" in data["message"].lower()
