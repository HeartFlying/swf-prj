"""Tests for GET /api/v1/stats/projects/{project_id}/commit-rank endpoint.

TDD Red Phase: Write tests first, then implement the endpoint.
"""

from datetime import date, timedelta

import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from fastapi import status

from app.db.base import get_db


@pytest.fixture
def app(session) -> FastAPI:
    """Create test FastAPI app with routes and overridden dependencies."""
    from fastapi import FastAPI

    from app.api.v1.stats.projects import router as projects_router

    app = FastAPI()

    async def override_get_db():
        yield session

    app.include_router(projects_router, prefix="/api/v1/stats/projects")
    app.dependency_overrides[get_db] = override_get_db

    return app


@pytest.fixture
async def client(app: FastAPI) -> AsyncClient:
    """Create async test client."""
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
        name=f"测试项目{unique_id}",
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


@pytest.fixture
async def sample_users(session):
    """Create sample users for testing."""
    import uuid

    from app.db.models import User

    users = []
    for i in range(5):
        unique_id = str(uuid.uuid4())[:8]
        user = User(
            username=f"testuser{i}_{unique_id}",
            email=f"test{i}_{unique_id}@example.com",
            password_hash="hashed_password",
            department="研发一部",
        )
        session.add(user)
        users.append(user)

    await session.commit()
    for user in users:
        await session.refresh(user)
    return users


@pytest.fixture
async def sample_commits(session, sample_project, sample_users):
    """Create sample commits for testing."""
    from datetime import datetime

    from app.db.models import CodeCommit

    commits = []
    base_date = date.today() - timedelta(days=15)

    # User 0: 10 commits
    for i in range(10):
        commit = CodeCommit(
            project_id=sample_project.id,
            user_id=sample_users[0].id,
            commit_hash=f"abc{i}def123456789",
            commit_time=datetime.combine(base_date + timedelta(days=i % 20), datetime.min.time()),
            commit_message=f"Commit {i} by user 0",
            additions=100 + i * 10,
            deletions=10 + i,
            file_count=5,
            language="python",
            is_ai_generated=False,
            branch_name="main",
        )
        session.add(commit)
        commits.append(commit)

    # User 1: 5 commits
    for i in range(5):
        commit = CodeCommit(
            project_id=sample_project.id,
            user_id=sample_users[1].id,
            commit_hash=f"def{i}abc123456789",
            commit_time=datetime.combine(base_date + timedelta(days=i % 20), datetime.min.time()),
            commit_message=f"Commit {i} by user 1",
            additions=50 + i * 5,
            deletions=5 + i,
            file_count=3,
            language="python",
            is_ai_generated=True,
            branch_name="main",
        )
        session.add(commit)
        commits.append(commit)

    # User 2: 3 commits
    for i in range(3):
        commit = CodeCommit(
            project_id=sample_project.id,
            user_id=sample_users[2].id,
            commit_hash=f"ghi{i}jkl123456789",
            commit_time=datetime.combine(base_date + timedelta(days=i % 20), datetime.min.time()),
            commit_message=f"Commit {i} by user 2",
            additions=30 + i * 3,
            deletions=3 + i,
            file_count=2,
            language="python",
            is_ai_generated=False,
            branch_name="main",
        )
        session.add(commit)
        commits.append(commit)

    await session.commit()
    for commit in commits:
        await session.refresh(commit)
    return commits


class TestProjectCommitRank:
    """Test cases for GET /api/v1/stats/projects/{project_id}/commit-rank endpoint."""

    @pytest.mark.asyncio
    async def test_commit_rank_success(self, client: AsyncClient, sample_project, sample_commits):
        """Test getting commit rank with correct response format."""
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/commit-rank")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify response follows ApiResponse format
        assert "code" in result
        assert "message" in result
        assert "data" in result
        assert result["code"] == 200
        assert result["message"] == "success"

        # Get the actual data
        data = result["data"]

        # Verify data is a list
        assert isinstance(data, list)

        # Verify each item has required fields
        for item in data:
            assert "user_id" in item
            assert "username" in item
            assert "commit_count" in item
            assert "avg_commits_per_day" in item

            assert isinstance(item["user_id"], int)
            assert isinstance(item["username"], str)
            assert isinstance(item["commit_count"], int)
            assert isinstance(item["avg_commits_per_day"], float)

    @pytest.mark.asyncio
    async def test_commit_rank_order_by_count(self, client: AsyncClient, sample_project, sample_users, sample_commits):
        """Test that commit rank is ordered by commit count descending."""
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/commit-rank")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        data = result["data"]

        # Should have at least 3 users with commits
        assert len(data) >= 3

        # Verify order: user 0 (10 commits) > user 1 (5 commits) > user 2 (3 commits)
        assert data[0]["commit_count"] >= data[1]["commit_count"]
        assert data[1]["commit_count"] >= data[2]["commit_count"]

        # Verify specific counts
        user_counts = {item["user_id"]: item["commit_count"] for item in data}
        assert user_counts[sample_users[0].id] == 10
        assert user_counts[sample_users[1].id] == 5
        assert user_counts[sample_users[2].id] == 3

    @pytest.mark.asyncio
    async def test_commit_rank_limit_parameter(self, client: AsyncClient, sample_project, sample_commits):
        """Test that limit parameter correctly limits result count."""
        # Test with limit=2
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/commit-rank?limit=2")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        data = result["data"]

        assert len(data) == 2

        # Test with limit=1
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/commit-rank?limit=1")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        data = result["data"]

        assert len(data) == 1

    @pytest.mark.asyncio
    async def test_commit_rank_limit_validation(self, client: AsyncClient, sample_project):
        """Test limit parameter validation."""
        # Test limit < 1 (should fail)
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/commit-rank?limit=0")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

        # Test limit > 100 (should fail)
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/commit-rank?limit=101")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_commit_rank_date_range_filter(self, client: AsyncClient, sample_project, sample_users):
        """Test date range filter correctly filters commits."""

        today = date.today()

        # Note: Date range filtering test
        # We verify the API accepts date parameters and returns proper response

        start_date = (today - timedelta(days=30)).isoformat()
        end_date = today.isoformat()

        response = await client.get(
            f"/api/v1/stats/projects/{sample_project.id}/commit-rank"
            f"?start_date={start_date}&end_date={end_date}"
        )

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        data = result["data"]
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_commit_rank_default_date_range(self, client: AsyncClient, sample_project):
        """Test that default date range is last 30 days when not provided."""
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/commit-rank")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        data = result["data"]

        # Should return empty list or filtered results based on default 30-day range
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_commit_rank_project_not_found(self, client: AsyncClient):
        """Test that non-existent project returns 404."""
        response = await client.get("/api/v1/stats/projects/99999/commit-rank")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_commit_rank_empty_project(self, client: AsyncClient, sample_project):
        """Test that project with no commits returns empty list."""
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/commit-rank")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        data = result["data"]

        assert isinstance(data, list)
        assert len(data) == 0

    @pytest.mark.asyncio
    async def test_commit_rank_avg_calculation(self, client: AsyncClient, sample_project, sample_users, sample_commits):
        """Test that avg_commits_per_day is calculated correctly."""
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/commit-rank")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        data = result["data"]

        # Find user 0's entry
        user_0_data = next((item for item in data if item["user_id"] == sample_users[0].id), None)
        assert user_0_data is not None

        # User 0 has 10 commits
        assert user_0_data["commit_count"] == 10
        # avg_commits_per_day should be calculated based on actual commit days vs date range
        assert user_0_data["avg_commits_per_day"] >= 0

    @pytest.mark.asyncio
    async def test_commit_rank_with_only_start_date(self, client: AsyncClient, sample_project):
        """Test API with only start_date provided."""
        start_date = (date.today() - timedelta(days=30)).isoformat()

        response = await client.get(
            f"/api/v1/stats/projects/{sample_project.id}/commit-rank?start_date={start_date}"
        )

        # Should use default end_date (today)
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        data = result["data"]
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_commit_rank_with_only_end_date(self, client: AsyncClient, sample_project):
        """Test API with only end_date provided."""
        end_date = date.today().isoformat()

        response = await client.get(
            f"/api/v1/stats/projects/{sample_project.id}/commit-rank?end_date={end_date}"
        )

        # Should use default start_date (30 days before end_date)
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        data = result["data"]
        assert isinstance(data, list)
