"""Tests for Project Stats API - TDD Red Phase.

These tests define the expected behavior of the project statistics API endpoints.
"""

from datetime import date, timedelta

import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient


@pytest.fixture
def app(session) -> FastAPI:
    """Create test FastAPI app with routes and overridden dependencies."""
    from fastapi import FastAPI

    from app.api.v1.stats.projects import router as project_stats_router
    from app.db.base import get_db

    app = FastAPI()

    async def override_get_db():
        yield session

    app.include_router(project_stats_router, prefix="/api/v1/stats/projects")
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
async def sample_project(session):
    """Create a sample project for testing."""
    import uuid

    from app.db.models import Project

    unique_id = str(uuid.uuid4())[:8]
    project = Project(
        name="测试项目",
        code=f"TEST{unique_id}",
        description="这是一个测试项目",
        stage="研发",
        status="active",
        start_date=date(2024, 1, 1),
        end_date=date(2024, 12, 31),
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


class TestProjectStatsOverview:
    """Test cases for GET /api/v1/stats/projects/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_project_stats_success(self, client: AsyncClient, sample_project):
        """Test getting project statistics."""
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}")

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
        assert data["project_id"] == sample_project.id
        assert data["project_name"] == sample_project.name
        assert "total_commits" in data
        assert "total_tokens" in data
        assert "active_members" in data
        assert "bug_count" in data

    @pytest.mark.asyncio
    async def test_project_stats_not_found(self, client: AsyncClient):
        """Test getting stats for non-existent project."""
        response = await client.get("/api/v1/stats/projects/99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestProjectCodeRank:
    """Test cases for GET /api/v1/stats/projects/{id}/code-rank endpoint."""

    @pytest.mark.asyncio
    async def test_code_rank_success(self, client: AsyncClient, sample_project):
        """Test getting project code rank."""
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/code-rank")

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

        if data:
            rank = data[0]
            assert "user_id" in rank
            assert "username" in rank
            assert "lines_added" in rank
            assert "lines_deleted" in rank
            assert "total_lines" in rank

    @pytest.mark.asyncio
    async def test_code_rank_project_not_found(self, client: AsyncClient):
        """Test getting code rank for non-existent project."""
        response = await client.get("/api/v1/stats/projects/99999/code-rank")

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestProjectBugTrend:
    """Test cases for GET /api/v1/stats/projects/{id}/bug-trend endpoint."""

    @pytest.mark.asyncio
    async def test_bug_trend_success(self, client: AsyncClient, sample_project):
        """Test getting project bug trend."""
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/bug-trend")

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
        assert "dates" in data
        assert "created" in data
        assert "resolved" in data
        assert isinstance(data["dates"], list)
        assert isinstance(data["created"], list)
        assert isinstance(data["resolved"], list)
        assert len(data["dates"]) == len(data["created"]) == len(data["resolved"])

    @pytest.mark.asyncio
    async def test_bug_trend_with_date_range(self, client: AsyncClient, sample_project):
        """Test getting bug trend with date range."""
        start_date = (date.today() - timedelta(days=30)).isoformat()
        end_date = date.today().isoformat()

        response = await client.get(
            f"/api/v1/stats/projects/{sample_project.id}/bug-trend?start_date={start_date}&end_date={end_date}"
        )

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert "data" in result
        data = result["data"]
        assert "dates" in data
        assert "created" in data
        assert "resolved" in data


class TestProjectAIAdoption:
    """Test cases for GET /api/v1/stats/projects/{id}/ai-adoption endpoint."""

    @pytest.mark.asyncio
    async def test_ai_adoption_success(self, client: AsyncClient, sample_project):
        """Test getting project AI adoption rate."""
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/ai-adoption")

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

        if data:
            adoption = data[0]
            assert "date" in adoption
            assert "adoption_rate" in adoption
            assert "ai_suggestions" in adoption
            assert "accepted_suggestions" in adoption
            assert 0 <= adoption["adoption_rate"] <= 100

    @pytest.mark.asyncio
    async def test_ai_adoption_project_not_found(self, client: AsyncClient):
        """Test getting AI adoption for non-existent project."""
        response = await client.get("/api/v1/stats/projects/99999/ai-adoption")

        assert response.status_code == status.HTTP_404_NOT_FOUND
