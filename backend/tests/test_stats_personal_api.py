"""Tests for Personal Stats API - TDD Red Phase.

These tests define the expected behavior of the personal statistics API endpoints.
"""

from datetime import date, timedelta

import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient


@pytest.fixture
def app(session) -> FastAPI:
    """Create test FastAPI app with routes and overridden dependencies."""
    from fastapi import FastAPI

    from app.api.v1.stats.personal import router as personal_stats_router
    from app.core.dependencies import get_current_active_user, get_db

    app = FastAPI()

    async def override_get_db():
        yield session

    app.include_router(personal_stats_router, prefix="/api/v1/stats/personal")
    app.dependency_overrides[get_db] = override_get_db

    return app


@pytest.fixture
async def client(app: FastAPI) -> AsyncClient:
    """Create async test client."""
    from httpx import ASGITransport, AsyncClient
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def sample_user(session):
    """Create a sample user for testing."""
    import uuid

    from app.db.models import User

    unique_id = str(uuid.uuid4())[:8]
    user = User(
        username=f"testuser{unique_id}",
        email=f"test{unique_id}@example.com",
        password_hash="hashed_password",
        department="研发一部",
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


class TestPersonalDashboard:
    """Test cases for GET /api/v1/stats/personal/dashboard endpoint."""

    @pytest.mark.asyncio
    async def test_personal_dashboard_success(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting personal dashboard statistics."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(f"/api/v1/stats/personal/dashboard?user_id={sample_user.id}")

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            # Verify unified response format
            assert "code" in result
            assert "message" in result
            assert "data" in result
            assert result["code"] == 200
            assert result["message"] == "success"

            # Verify data content
            data = result["data"]
            assert "todayStats" in data
            assert "weeklyTrend" in data
            assert "languageStats" in data
            assert "heatmapData" in data
            assert "ranking" in data
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_personal_dashboard_user_not_found(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting dashboard for non-existent user."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get("/api/v1/stats/personal/dashboard?user_id=99999")

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_personal_dashboard_missing_user_id(self, client: AsyncClient):
        """Test getting dashboard without user_id."""
        response = await client.get("/api/v1/stats/personal/dashboard")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestPersonalCodeStats:
    """Test cases for GET /api/v1/stats/personal/code endpoint."""

    @pytest.mark.asyncio
    async def test_personal_code_stats_success(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting personal code statistics."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(f"/api/v1/stats/personal/code?user_id={sample_user.id}")

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            # Verify unified response format
            assert "code" in result
            assert "message" in result
            assert "data" in result
            assert result["code"] == 200
            assert result["message"] == "success"

            # Verify data content
            data = result["data"]
            assert "total_commits" in data
            assert "total_prs" in data
            assert "lines_added" in data
            assert "lines_deleted" in data
            assert "avg_commits_per_day" in data
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_personal_code_stats_with_date_range(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting personal code stats with date range."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            start_date = (date.today() - timedelta(days=30)).isoformat()
            end_date = date.today().isoformat()

            response = await client.get(
                f"/api/v1/stats/personal/code?user_id={sample_user.id}&start_date={start_date}&end_date={end_date}"
            )

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            assert "data" in result
            data = result["data"]
            assert "total_commits" in data
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_personal_code_stats_user_not_found(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting code stats for non-existent user."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get("/api/v1/stats/personal/code?user_id=99999")

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_personal_code_stats_missing_user_id(self, client: AsyncClient):
        """Test getting code stats without user_id."""
        response = await client.get("/api/v1/stats/personal/code")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestPersonalTokenStats:
    """Test cases for GET /api/v1/stats/personal/tokens endpoint."""

    @pytest.mark.asyncio
    async def test_personal_token_stats_success(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting personal token statistics."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(f"/api/v1/stats/personal/tokens?user_id={sample_user.id}")

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            # Verify unified response format
            assert "code" in result
            assert "message" in result
            assert "data" in result
            assert result["code"] == 200
            assert result["message"] == "success"

            # Verify data content
            data = result["data"]
            assert "total_tokens" in data
            assert "prompt_tokens" in data
            assert "completion_tokens" in data
            assert "avg_tokens_per_day" in data
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_personal_token_stats_user_not_found(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting token stats for non-existent user."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get("/api/v1/stats/personal/tokens?user_id=99999")

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]


class TestPersonalBugRate:
    """Test cases for GET /api/v1/stats/personal/bugs endpoint."""

    @pytest.mark.asyncio
    async def test_personal_bug_rate_success(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting personal bug rate statistics."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(f"/api/v1/stats/personal/bugs?user_id={sample_user.id}")

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            # Verify unified response format
            assert "code" in result
            assert "message" in result
            assert "data" in result
            assert result["code"] == 200
            assert result["message"] == "success"

            # Verify data content
            data = result["data"]
            assert "total_bugs" in data
            assert "critical_bugs" in data
            assert "bug_rate" in data
            assert "resolved_bugs" in data
            assert data["bug_rate"] >= 0
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_personal_bug_rate_with_project(self, app: FastAPI, client: AsyncClient, sample_user, session):
        """Test getting personal bug rate for specific project."""
        import uuid

        from app.core.dependencies import get_current_active_user
        from app.db.models import Project

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            unique_id = str(uuid.uuid4())[:8]
            project = Project(
                name="测试项目",
                code=f"TEST{unique_id}",
                stage="研发",
                status="active",
            )
            session.add(project)
            await session.commit()
            await session.refresh(project)

            response = await client.get(
                f"/api/v1/stats/personal/bugs?user_id={sample_user.id}&project_id={project.id}"
            )

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            assert "data" in result
            data = result["data"]
            assert "total_bugs" in data
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_personal_bug_rate_user_not_found(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting bug rate for non-existent user."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get("/api/v1/stats/personal/bugs?user_id=99999")

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_personal_bug_rate_with_date_range(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting personal bug rate with custom date range."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            start_date = (date.today() - timedelta(days=30)).isoformat()
            end_date = date.today().isoformat()

            response = await client.get(
                f"/api/v1/stats/personal/bugs?user_id={sample_user.id}&start_date={start_date}&end_date={end_date}"
            )

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            assert "data" in result
            data = result["data"]
            assert "total_bugs" in data
            assert "critical_bugs" in data
            assert "bug_rate" in data
            assert "resolved_bugs" in data
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_personal_bug_rate_project_not_found(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting bug rate with non-existent project."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(
                f"/api/v1/stats/personal/bugs?user_id={sample_user.id}&project_id=99999"
            )

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]


class TestPersonalActivityHours:
    """Test cases for GET /api/v1/stats/personal/activity-hours endpoint."""

    @pytest.mark.asyncio
    async def test_personal_activity_hours_success(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting personal activity hours statistics."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(f"/api/v1/stats/personal/activity-hours?user_id={sample_user.id}")

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            # Verify unified response format
            assert "code" in result
            assert "message" in result
            assert "data" in result
            assert result["code"] == 200
            assert result["message"] == "success"

            # Verify data content
            data = result["data"]
            assert isinstance(data, list)
            assert len(data) == 24  # 24 hours in a day
            for hour_data in data:
                assert "hour" in hour_data
                assert "count" in hour_data
                assert 0 <= hour_data["hour"] <= 23
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_personal_activity_hours_user_not_found(self, app: FastAPI, client: AsyncClient, sample_user):
        """Test getting activity hours for non-existent user."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return sample_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get("/api/v1/stats/personal/activity-hours?user_id=99999")

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]
