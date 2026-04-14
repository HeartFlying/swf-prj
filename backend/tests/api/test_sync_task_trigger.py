"""Tests for sync task trigger endpoint.

TDD Red Phase: Write tests for POST /api/v1/sync/tasks/{task_id}/trigger endpoint.
"""

from datetime import datetime
from unittest.mock import MagicMock, patch

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


class TestTriggerSyncTask:
    """Tests for POST /api/v1/sync/tasks/{task_id}/trigger endpoint."""

    @pytest.mark.asyncio
    async def test_trigger_gitlab_task(self, client: AsyncClient, session):
        """Test triggering a GitLab sync task."""
        from app.db.models import SyncTask

        # Create a GitLab sync task
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

        # Mock the celery task
        with patch("app.api.v1.sync.sync_gitlab_commits") as mock_celery_task:
            mock_celery_task.delay.return_value = None

            response = await client.post(f"/api/v1/sync/tasks/{task.id}/trigger")

        # Verify response status code
        assert response.status_code == status.HTTP_202_ACCEPTED

        # Verify unified response format
        data = response.json()
        assert "code" in data
        assert "message" in data
        assert "data" in data

        # Verify response values
        assert data["code"] == 202
        assert "triggered" in data["message"].lower() or "GitLab" in data["message"]
        assert data["data"]["task_id"] == task.id
        assert data["data"]["source"] == "gitlab"
        assert data["data"]["status"] == "running"

        # Verify celery task was called
        mock_celery_task.delay.assert_called_once()

    @pytest.mark.asyncio
    async def test_trigger_trae_task(self, client: AsyncClient, session):
        """Test triggering a Trae sync task."""
        from app.db.models import SyncTask

        # Create a Trae sync task
        task = SyncTask(
            task_type="incremental_sync",
            source_type="trae",
            status="pending",
            created_by="admin_test",
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)

        # Mock the celery task
        with patch("app.api.v1.sync.sync_trae_token_usage") as mock_celery_task:
            mock_celery_task.delay.return_value = None

            response = await client.post(f"/api/v1/sync/tasks/{task.id}/trigger")

        # Verify response status code
        assert response.status_code == status.HTTP_202_ACCEPTED

        # Verify response values
        data = response.json()
        assert data["code"] == 202
        assert data["data"]["task_id"] == task.id
        assert data["data"]["source"] == "trae"
        assert data["data"]["status"] == "running"

        # Verify celery task was called
        mock_celery_task.delay.assert_called_once()

    @pytest.mark.asyncio
    async def test_trigger_zendao_task(self, client: AsyncClient, session):
        """Test triggering a ZenTao sync task."""
        from app.db.models import SyncTask

        # Create a ZenTao sync task
        task = SyncTask(
            task_type="incremental_sync",
            source_type="zendao",
            status="pending",
            project_id=1,
            created_by="admin_test",
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)

        # Mock the celery task
        with patch("app.api.v1.sync.sync_zendao_bugs") as mock_celery_task:
            mock_celery_task.delay.return_value = None

            response = await client.post(f"/api/v1/sync/tasks/{task.id}/trigger")

        # Verify response status code
        assert response.status_code == status.HTTP_202_ACCEPTED

        # Verify response values
        data = response.json()
        assert data["code"] == 202
        assert data["data"]["task_id"] == task.id
        assert data["data"]["source"] == "zendao"
        assert data["data"]["status"] == "running"

        # Verify celery task was called
        mock_celery_task.delay.assert_called_once()

    @pytest.mark.asyncio
    async def test_trigger_task_not_found(self, client: AsyncClient):
        """Test triggering a non-existent task returns 404."""
        response = await client.post("/api/v1/sync/tasks/99999/trigger")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_trigger_task_invalid_source_type(self, client: AsyncClient, session):
        """Test triggering a task with unsupported source_type returns 500."""
        from app.db.models import SyncTask

        # Create a sync task with unsupported source_type
        task = SyncTask(
            task_type="incremental_sync",
            source_type="unknown_source",
            status="pending",
            created_by="admin_test",
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)

        response = await client.post(f"/api/v1/sync/tasks/{task.id}/trigger")

        # Should return 500 for unsupported source type
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        data = response.json()
        assert "detail" in data
        assert "unsupported" in data["detail"].lower() or "unknown" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_trigger_task_updates_status_to_running(self, client: AsyncClient, session):
        """Test that triggering a task updates its status to running."""
        from app.db.models import SyncTask

        # Create a pending GitLab sync task
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

        # Mock the celery task
        with patch("app.api.v1.sync.sync_gitlab_commits") as mock_celery_task:
            mock_celery_task.delay.return_value = None

            response = await client.post(f"/api/v1/sync/tasks/{task.id}/trigger")

        # Verify response
        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert data["data"]["status"] == "running"

    @pytest.mark.asyncio
    async def test_trigger_task_with_project_id_passed_to_celery(self, client: AsyncClient, session):
        """Test that project_id is passed to celery task for gitlab tasks."""
        from app.db.models import SyncTask

        # Create a GitLab sync task with project_id
        task = SyncTask(
            task_type="incremental_sync",
            source_type="gitlab",
            status="pending",
            project_id=42,
            created_by="admin_test",
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)

        # Mock the celery task
        with patch("app.api.v1.sync.sync_gitlab_commits") as mock_celery_task:
            mock_celery_task.delay.return_value = None

            response = await client.post(f"/api/v1/sync/tasks/{task.id}/trigger")

        # Verify response
        assert response.status_code == status.HTTP_202_ACCEPTED

        # Verify celery task was called with correct arguments
        mock_celery_task.delay.assert_called_once_with(
            project_id=42,
            task_id=task.id,
        )

    @pytest.mark.asyncio
    async def test_trigger_task_requires_admin_permission(self, session):
        """Test that triggering a task requires admin permission."""
        from fastapi import FastAPI
        from httpx import ASGITransport, AsyncClient

        app = FastAPI()

        async def override_get_db():
            yield session

        # No admin permission override - should use default behavior
        app.include_router(sync_router, prefix="/api/v1/sync")
        app.dependency_overrides[get_db] = override_get_db
        # Note: not overriding require_admin_permission

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/sync/tasks/1/trigger")

        # Should return 401 or 403 without admin permission
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
