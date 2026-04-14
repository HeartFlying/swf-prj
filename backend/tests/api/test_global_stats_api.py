"""Tests for Global Stats API - TDD.

These tests define the expected behavior of the global statistics API endpoints.
"""


import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient


@pytest.fixture
def app(session) -> FastAPI:
    """Create test FastAPI app with routes and overridden dependencies."""
    from fastapi import FastAPI

    from app.api.v1.stats.global_stats import router as global_stats_router
    from app.db.base import get_db

    app = FastAPI()

    async def override_get_db():
        yield session

    app.include_router(global_stats_router, prefix="/api/v1/stats/global")
    app.dependency_overrides[get_db] = override_get_db

    return app


@pytest.fixture
async def client(app: FastAPI) -> AsyncClient:
    """Create async test client."""
    from httpx import ASGITransport, AsyncClient
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestTopUsersV2:
    """Test cases for GET /api/v1/stats/global/top-users-v2 endpoint."""

    @pytest.mark.asyncio
    async def test_top_users_v2_success(self, client: AsyncClient):
        """Test getting top users v2."""
        response = await client.get("/api/v1/stats/global/top-users-v2")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Check standardized response structure
        assert "code" in result
        assert "message" in result
        assert "data" in result
        assert result["code"] == 200

        # Check data structure
        data = result["data"]
        assert "users" in data
        assert "total_count" in data
        assert isinstance(data["users"], list)
        assert isinstance(data["total_count"], int)
        assert len(data["users"]) == data["total_count"]

    @pytest.mark.asyncio
    async def test_top_users_v2_with_limit(self, client: AsyncClient):
        """Test top users v2 with custom limit."""
        response = await client.get("/api/v1/stats/global/top-users-v2?limit=5")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        data = result["data"]
        assert len(data["users"]) <= 5
        assert data["total_count"] <= 5

    @pytest.mark.asyncio
    async def test_top_users_v2_with_days(self, client: AsyncClient):
        """Test top users v2 with custom days parameter."""
        response = await client.get("/api/v1/stats/global/top-users-v2?days=7")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert "code" in result
        data = result["data"]
        assert "users" in data
        assert "total_count" in data

    @pytest.mark.asyncio
    async def test_top_users_v2_invalid_limit(self, client: AsyncClient):
        """Test top users v2 with invalid limit."""
        response = await client.get("/api/v1/stats/global/top-users-v2?limit=abc")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_top_users_v2_limit_too_high(self, client: AsyncClient):
        """Test top users v2 with limit exceeding maximum."""
        response = await client.get("/api/v1/stats/global/top-users-v2?limit=200")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestGlobalSummary:
    """Test cases for GET /api/v1/stats/global/summary endpoint."""

    @pytest.mark.asyncio
    async def test_global_summary_success(self, client: AsyncClient):
        """Test getting global summary."""
        response = await client.get("/api/v1/stats/global/summary")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Check standardized response structure
        assert "code" in result
        assert "message" in result
        assert "data" in result
        assert result["code"] == 200

        # Check all required fields in data
        data = result["data"]
        assert "total_users" in data
        assert "total_projects" in data
        assert "total_commits" in data
        assert "total_tokens" in data
        assert "total_bugs" in data
        assert "active_users_today" in data
        assert "period_days" in data

        # Check types
        assert isinstance(data["total_users"], int)
        assert isinstance(data["total_projects"], int)
        assert isinstance(data["total_commits"], int)
        assert isinstance(data["total_tokens"], int)
        assert isinstance(data["total_bugs"], int)
        assert isinstance(data["active_users_today"], int)
        assert isinstance(data["period_days"], int)

        # period_days should default to 30
        assert data["period_days"] == 30

    @pytest.mark.asyncio
    async def test_global_summary_with_days(self, client: AsyncClient):
        """Test global summary with custom days parameter."""
        response = await client.get("/api/v1/stats/global/summary?days=7")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert result["data"]["period_days"] == 7

    @pytest.mark.asyncio
    async def test_global_summary_invalid_days(self, client: AsyncClient):
        """Test global summary with invalid days parameter."""
        response = await client.get("/api/v1/stats/global/summary?days=abc")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_global_summary_days_too_high(self, client: AsyncClient):
        """Test global summary with days exceeding maximum."""
        response = await client.get("/api/v1/stats/global/summary?days=500")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_global_summary_days_too_low(self, client: AsyncClient):
        """Test global summary with days below minimum."""
        response = await client.get("/api/v1/stats/global/summary?days=0")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
