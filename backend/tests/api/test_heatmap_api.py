"""Tests for Heatmap API - TDD.

These tests define the expected behavior of the heatmap API endpoint.
"""

from datetime import date, datetime, timedelta

import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient

from app.core.dependencies import get_current_active_user


@pytest.fixture
def app(session) -> FastAPI:
    """Create test FastAPI app with routes and overridden dependencies."""
    from fastapi import FastAPI

    from app.api.v1.stats.personal import router as personal_stats_router
    from app.db.base import get_db

    app = FastAPI()

    async def override_get_db():
        yield session

    async def override_get_current_active_user():
        """Override get_current_active_user to return a mock user."""
        from app.db.models import User
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
        username=f"heatmapuser{unique_id}",
        email=f"heatmap{unique_id}@example.com",
        password_hash="hashed_password",
        department="研发一部",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture
async def sample_project(session):
    """Create a sample project for testing."""
    import uuid

    from app.db.models import Project

    unique_id = str(uuid.uuid4())[:8]
    project = Project(
        name="热力图测试项目",
        code=f"HEAT{unique_id}",
        stage="研发",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


@pytest.fixture
async def sample_commits(session, sample_user, sample_project):
    """Create sample commits for heatmap testing."""
    from app.db.models import CodeCommit

    base_date = date.today() - timedelta(days=5)
    commits = []

    # Day 1: 3 commits
    for i in range(3):
        commit = CodeCommit(
            user_id=sample_user.id,
            project_id=sample_project.id,
            commit_hash=f"day1_{i}abcdef123456",
            additions=50,
            deletions=10,
            language="python",
            file_count=2,
            commit_message=f"Day 1 Commit {i+1}",
            commit_time=datetime.combine(base_date, datetime.min.time()),
            is_ai_generated=False,
        )
        session.add(commit)
        commits.append(commit)

    # Day 3: 6 commits (high activity)
    for i in range(6):
        commit = CodeCommit(
            user_id=sample_user.id,
            project_id=sample_project.id,
            commit_hash=f"day3_{i}abcdef123456",
            additions=100,
            deletions=20,
            language="python",
            file_count=3,
            commit_message=f"Day 3 Commit {i+1}",
            commit_time=datetime.combine(base_date + timedelta(days=2), datetime.min.time()),
            is_ai_generated=False,
        )
        session.add(commit)
        commits.append(commit)

    await session.commit()
    return commits


class TestPersonalHeatmap:
    """Test cases for GET /api/v1/stats/personal/heatmap endpoint."""

    @pytest.mark.asyncio
    async def test_heatmap_success(self, client: AsyncClient, sample_user):
        """Test getting personal heatmap data."""
        response = await client.get(f"/api/v1/stats/personal/heatmap?user_id={sample_user.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["code"] == 200
        assert data["message"] == "success"
        assert "data" in data

        heatmap_data = data["data"]
        assert "user_id" in heatmap_data
        assert "data" in heatmap_data
        assert "total_days" in heatmap_data
        assert "start_date" in heatmap_data
        assert "end_date" in heatmap_data
        assert heatmap_data["user_id"] == sample_user.id
        assert heatmap_data["total_days"] == 30

    @pytest.mark.asyncio
    async def test_heatmap_with_commits(self, client: AsyncClient, sample_user, sample_project, sample_commits):
        """Test heatmap with actual commit data."""
        response = await client.get(f"/api/v1/stats/personal/heatmap?user_id={sample_user.id}&days=10")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        heatmap_data = data["data"]

        # Verify data structure
        assert len(heatmap_data["data"]) == 10

        # Find days with commits
        base_date = date.today() - timedelta(days=5)
        day1_str = base_date.isoformat()
        day3_str = (base_date + timedelta(days=2)).isoformat()

        data_by_date = {item["date"]: item for item in heatmap_data["data"]}

        # Verify commit counts
        assert data_by_date[day1_str]["count"] == 3
        assert data_by_date[day3_str]["count"] == 6

        # Verify levels
        assert data_by_date[day1_str]["level"] == 2  # 3 commits
        assert data_by_date[day3_str]["level"] == 4  # 6 commits

    @pytest.mark.asyncio
    async def test_heatmap_with_custom_days(self, client: AsyncClient, sample_user):
        """Test heatmap with custom days parameter."""
        response = await client.get(f"/api/v1/stats/personal/heatmap?user_id={sample_user.id}&days=7")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        heatmap_data = data["data"]

        assert heatmap_data["total_days"] == 7
        assert len(heatmap_data["data"]) == 7

    @pytest.mark.asyncio
    async def test_heatmap_with_tokens_metric(self, client: AsyncClient, sample_user):
        """Test heatmap with tokens metric type."""
        response = await client.get(
            f"/api/v1/stats/personal/heatmap?user_id={sample_user.id}&metric_type=tokens"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        heatmap_data = data["data"]

        assert heatmap_data["user_id"] == sample_user.id
        assert "data" in heatmap_data

    @pytest.mark.asyncio
    async def test_heatmap_user_not_found(self, client: AsyncClient):
        """Test getting heatmap for non-existent user."""
        response = await client.get("/api/v1/stats/personal/heatmap?user_id=99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_heatmap_missing_user_id(self, client: AsyncClient):
        """Test getting heatmap without user_id defaults to current user."""
        response = await client.get("/api/v1/stats/personal/heatmap")

        # User ID is optional, defaults to current user
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["code"] == 200
        assert "data" in data

    @pytest.mark.asyncio
    async def test_heatmap_invalid_days(self, client: AsyncClient, sample_user):
        """Test heatmap with invalid days parameter."""
        response = await client.get(f"/api/v1/stats/personal/heatmap?user_id={sample_user.id}&days=0")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_heatmap_days_too_large(self, client: AsyncClient, sample_user):
        """Test heatmap with days parameter exceeding maximum."""
        response = await client.get(f"/api/v1/stats/personal/heatmap?user_id={sample_user.id}&days=400")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_heatmap_data_point_structure(self, client: AsyncClient, sample_user):
        """Test that each data point has correct structure."""
        response = await client.get(f"/api/v1/stats/personal/heatmap?user_id={sample_user.id}&days=7")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        heatmap_data = data["data"]

        # Check each data point has required fields
        for point in heatmap_data["data"]:
            assert "date" in point
            assert "count" in point
            assert "level" in point
            assert isinstance(point["date"], str)
            assert isinstance(point["count"], int)
            assert isinstance(point["level"], int)
            assert 0 <= point["level"] <= 4

    @pytest.mark.asyncio
    async def test_heatmap_date_format(self, client: AsyncClient, sample_user):
        """Test that dates are in correct format (YYYY-MM-DD)."""
        response = await client.get(f"/api/v1/stats/personal/heatmap?user_id={sample_user.id}&days=7")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        heatmap_data = data["data"]

        # Check date format
        for point in heatmap_data["data"]:
            date_str = point["date"]
            assert len(date_str) == 10
            assert date_str[4] == "-"
            assert date_str[7] == "-"

    @pytest.mark.asyncio
    async def test_heatmap_sorted_by_date(self, client: AsyncClient, sample_user):
        """Test that heatmap data is sorted by date."""
        response = await client.get(f"/api/v1/stats/personal/heatmap?user_id={sample_user.id}&days=7")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        heatmap_data = data["data"]

        dates = [point["date"] for point in heatmap_data["data"]]
        assert dates == sorted(dates)
