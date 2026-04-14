"""Tests for Personal Dashboard API endpoint.

TDD Red Phase: These tests define the expected behavior of the
GET /api/v1/stats/personal/dashboard endpoint.

The endpoint should return data matching the frontend PersonalDashboard type:
{
  todayStats: { commits, additions, deletions, tokens, sessions }
  weeklyTrend: { dates, commits, tokens }
  languageStats: { language, lines, percentage }[]
  heatmapData: { date, count, level }[]
  ranking: { commits, totalUsers }
}
"""

from datetime import date, timedelta

import pytest
from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient

from app.api.v1.stats.personal import router as personal_stats_router
from app.core.dependencies import get_current_active_user
from app.db.base import get_db


@pytest.fixture
def app(session) -> FastAPI:
    """Create test FastAPI app with personal stats routes."""
    from fastapi import FastAPI

    from app.db.models import User

    app = FastAPI()

    async def override_get_db():
        yield session

    async def override_get_current_active_user():
        """Override get_current_active_user to return a mock user."""
        user = User(
            id=1,
            username="testuser",
            email="test@example.com",
            password_hash="hashed_password",
            is_active=True,
        )
        return user

    app.include_router(personal_stats_router, prefix="/api/v1/stats/personal")
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user

    return app


@pytest.fixture
async def client(app: FastAPI) -> AsyncClient:
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def test_user(session):
    """Create a test user."""
    from app.db.models import User

    user = User(
        username="testdashboard",
        email="dashboard@test.com",
        password_hash="hashed_password",
        department="Engineering",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture
async def test_project(session):
    """Create a test project."""
    from app.db.models import Project

    project = Project(
        name="Dashboard Test Project",
        code="DASH001",
        description="Test project for dashboard API",
        stage="研发",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


@pytest.fixture
async def test_code_commits(session, test_user, test_project):
    """Create test code commits."""
    from datetime import datetime
    from app.db.models import CodeCommit

    base_date = date.today() - timedelta(days=5)
    commits = []

    for i in range(5):
        commit = CodeCommit(
            user_id=test_user.id,
            project_id=test_project.id,
            commit_hash=f"dash{i}def123456789",
            additions=100,
            deletions=20,
            language="python",
            file_count=3,
            commit_message=f"Dashboard commit {i+1}",
            commit_time=datetime.combine(base_date + timedelta(days=i), datetime.min.time()),
            is_ai_generated=False,
        )
        session.add(commit)
        commits.append(commit)

    await session.commit()
    return commits


@pytest.fixture
async def test_token_usage(session, test_user, test_project):
    """Create test token usage records."""
    from app.db.models import TokenUsage

    base_date = date.today() - timedelta(days=5)
    records = []

    for i in range(5):
        record = TokenUsage(
            user_id=test_user.id,
            project_id=test_project.id,
            platform="trae",
            token_count=1000,
            api_calls=10,
            usage_date=base_date + timedelta(days=i),
            model="gpt-4",
            cost=0.5,
        )
        session.add(record)
        records.append(record)

    await session.commit()
    return records


class TestPersonalDashboardAPI:
    """Tests for GET /api/v1/stats/personal/dashboard endpoint."""

    @pytest.mark.asyncio
    async def test_get_dashboard_success(self, client: AsyncClient, test_user):
        """Test getting personal dashboard successfully."""
        response = await client.get(f"/api/v1/stats/personal/dashboard?user_id={test_user.id}")

        assert response.status_code == 200
        result = response.json()

        # Verify unified response format (ApiResponse wrapper)
        assert "code" in result
        assert "message" in result
        assert "data" in result
        assert result["code"] == 200
        assert result["message"] == "success"

        # Verify data content matches frontend expected PersonalDashboard structure
        data = result["data"]

        # todayStats structure
        assert "todayStats" in data
        today_stats = data["todayStats"]
        assert "commits" in today_stats
        assert "additions" in today_stats
        assert "deletions" in today_stats
        assert "tokens" in today_stats
        assert "sessions" in today_stats

        # weeklyTrend structure
        assert "weeklyTrend" in data
        weekly_trend = data["weeklyTrend"]
        assert "dates" in weekly_trend
        assert "commits" in weekly_trend
        assert "tokens" in weekly_trend
        assert isinstance(weekly_trend["dates"], list)
        assert isinstance(weekly_trend["commits"], list)
        assert isinstance(weekly_trend["tokens"], list)

        # languageStats structure
        assert "languageStats" in data
        assert isinstance(data["languageStats"], list)

        # heatmapData structure
        assert "heatmapData" in data
        assert isinstance(data["heatmapData"], list)

        # ranking structure
        assert "ranking" in data
        ranking = data["ranking"]
        assert "commits" in ranking
        assert "totalUsers" in ranking

    @pytest.mark.asyncio
    async def test_get_dashboard_with_date_range(self, client: AsyncClient, test_user):
        """Test getting personal dashboard with custom date range."""
        start_date = (date.today() - timedelta(days=30)).isoformat()
        end_date = date.today().isoformat()

        response = await client.get(
            f"/api/v1/stats/personal/dashboard?user_id={test_user.id}&startDate={start_date}&endDate={end_date}"
        )

        assert response.status_code == 200
        result = response.json()
        assert "data" in result
        data = result["data"]
        assert "todayStats" in data
        assert "weeklyTrend" in data

    @pytest.mark.asyncio
    async def test_get_dashboard_user_not_found(self, client: AsyncClient):
        """Test getting dashboard for non-existent user returns 404."""
        response = await client.get("/api/v1/stats/personal/dashboard?user_id=99999")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_dashboard_missing_user_id(self, client: AsyncClient):
        """Test getting dashboard without user_id defaults to current user."""
        response = await client.get("/api/v1/stats/personal/dashboard")

        # User ID is optional, defaults to current user
        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200
        assert "data" in result

    @pytest.mark.asyncio
    async def test_get_dashboard_with_data(
        self, client: AsyncClient, test_user, test_code_commits, test_token_usage
    ):
        """Test getting personal dashboard with actual data."""
        response = await client.get(f"/api/v1/stats/personal/dashboard?user_id={test_user.id}")

        assert response.status_code == 200
        result = response.json()
        data = result["data"]

        # Verify weekly trend has data
        weekly_trend = data["weeklyTrend"]
        assert len(weekly_trend["dates"]) > 0
        assert len(weekly_trend["commits"]) > 0
        assert len(weekly_trend["tokens"]) > 0

        # Verify heatmap data exists
        assert isinstance(data["heatmapData"], list)

    @pytest.mark.asyncio
    async def test_get_dashboard_empty_data(self, client: AsyncClient, test_user):
        """Test getting dashboard for user with no data."""
        response = await client.get(f"/api/v1/stats/personal/dashboard?user_id={test_user.id}")

        assert response.status_code == 200
        result = response.json()
        data = result["data"]

        # Verify structure exists even with empty data
        assert "todayStats" in data
        assert "weeklyTrend" in data
        assert "languageStats" in data
        assert "heatmapData" in data
        assert "ranking" in data

        # Verify todayStats has zero values
        today_stats = data["todayStats"]
        assert today_stats["commits"] == 0
        assert today_stats["additions"] == 0
        assert today_stats["deletions"] == 0
        assert today_stats["tokens"] == 0
        assert today_stats["sessions"] == 0
