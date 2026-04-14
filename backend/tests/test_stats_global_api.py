"""Tests for Global Stats API - TDD Red Phase.

These tests define the expected behavior of the global statistics API endpoints.
"""

from datetime import date, timedelta

import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient
from sqlalchemy import select

from app.db.models import User


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


class TestTokenTrend:
    """Test cases for GET /api/v1/stats/global/token-trend endpoint."""

    @pytest.mark.asyncio
    async def test_token_trend_success(self, client: AsyncClient):
        """Test getting token usage trend."""
        response = await client.get("/api/v1/stats/global/token-trend")

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
        assert "values" in data
        assert isinstance(data["dates"], list)
        assert isinstance(data["values"], list)
        assert len(data["dates"]) == len(data["values"])

    @pytest.mark.asyncio
    async def test_token_trend_with_date_range(self, client: AsyncClient):
        """Test getting token trend with date range."""
        start_date = (date.today() - timedelta(days=30)).isoformat()
        end_date = date.today().isoformat()

        response = await client.get(
            f"/api/v1/stats/global/token-trend?start_date={start_date}&end_date={end_date}"
        )

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert "data" in result
        data = result["data"]
        assert "dates" in data
        assert "values" in data


class TestActivityTrend:
    """Test cases for GET /api/v1/stats/global/activity-trend endpoint."""

    @pytest.mark.asyncio
    async def test_activity_trend_success(self, client: AsyncClient):
        """Test getting activity trend."""
        response = await client.get("/api/v1/stats/global/activity-trend")

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
        assert "active_users" in data
        assert "total_commits" in data
        assert isinstance(data["dates"], list)
        assert isinstance(data["active_users"], list)
        assert isinstance(data["total_commits"], list)


class TestTopUsers:
    """Test cases for GET /api/v1/stats/global/top-users endpoint."""

    @pytest.mark.asyncio
    async def test_top_users_success(self, client: AsyncClient):
        """Test getting top users."""
        response = await client.get("/api/v1/stats/global/top-users")

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
        # Should return at most 20 users
        assert len(data) <= 20

        if data:
            # Check required fields
            user = data[0]
            assert "user_id" in user
            assert "username" in user
            assert "token_count" in user
            assert "commit_count" in user

    @pytest.mark.asyncio
    async def test_top_users_limit(self, client: AsyncClient):
        """Test top users with custom limit."""
        response = await client.get("/api/v1/stats/global/top-users?limit=5")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert "data" in result
        data = result["data"]
        assert len(data) <= 5

    @pytest.mark.asyncio
    async def test_top_users_invalid_limit(self, client: AsyncClient):
        """Test top users with invalid limit."""
        response = await client.get("/api/v1/stats/global/top-users?limit=abc")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestGlobalHeatmap:
    """Test cases for GET /api/v1/stats/global/heatmap endpoint."""

    @pytest.mark.asyncio
    async def test_heatmap_success(self, client: AsyncClient):
        """Test getting global heatmap data."""
        response = await client.get("/api/v1/stats/global/heatmap")

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
        assert "data" in data
        assert isinstance(data["data"], list)

        # Check heatmap data point structure
        if data["data"]:
            point = data["data"][0]
            assert "date" in point
            assert "count" in point
            assert "level" in point

    @pytest.mark.asyncio
    async def test_heatmap_with_user_id(self, client: AsyncClient, session):
        """Test getting heatmap data with user_id filter."""
        # Create a test user first
        user = User(
            id=1,
            username="testuser",
            email="test@example.com",
            password_hash="hashed_password",
            department="Engineering",
            is_active=True
        )
        session.add(user)
        await session.commit()

        response = await client.get("/api/v1/stats/global/heatmap?user_id=1")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert "data" in result
        data = result["data"]
        assert "data" in data

    @pytest.mark.asyncio
    async def test_heatmap_with_date_range(self, client: AsyncClient):
        """Test getting heatmap data with date range."""
        start_date = (date.today() - timedelta(days=30)).isoformat()
        end_date = date.today().isoformat()

        response = await client.get(
            f"/api/v1/stats/global/heatmap?start_date={start_date}&end_date={end_date}"
        )

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert "data" in result
        data = result["data"]
        assert "data" in data
        assert "start_date" in data
        assert "end_date" in data

    @pytest.mark.asyncio
    async def test_heatmap_with_all_params(self, client: AsyncClient, session):
        """Test getting heatmap data with all query parameters."""
        # Create a test user first
        user = User(
            id=1,
            username="testuser",
            email="test@example.com",
            password_hash="hashed_password",
            is_active=True
        )
        session.add(user)
        await session.commit()

        start_date = (date.today() - timedelta(days=30)).isoformat()
        end_date = date.today().isoformat()

        response = await client.get(
            f"/api/v1/stats/global/heatmap?user_id=1&start_date={start_date}&end_date={end_date}"
        )

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert "data" in result
        data = result["data"]
        assert "data" in data

    @pytest.mark.asyncio
    async def test_heatmap_invalid_date_format(self, client: AsyncClient):
        """Test heatmap with invalid date format."""
        response = await client.get(
            "/api/v1/stats/global/heatmap?start_date=invalid-date"
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
