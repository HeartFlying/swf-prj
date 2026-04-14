"""Tests for Project Dashboard API endpoint.

TDD Tests for GET /api/v1/stats/projects/{project_id}/dashboard
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.v1.stats.projects import router as project_stats_router
from app.db.base import get_db
from app.db.models import BugRecord, CodeCommit, Project, ProjectMember, TokenUsage, User


@pytest.fixture
def app(session) -> FastAPI:
    """Create test FastAPI app with project stats routes."""
    app = FastAPI()

    async def override_get_db():
        yield session

    app.include_router(project_stats_router, prefix="/api/v1/stats/projects")
    app.dependency_overrides[get_db] = override_get_db

    return app


@pytest.fixture
async def client(app: FastAPI) -> AsyncClient:
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def test_project(session):
    """Create a test project."""
    project = Project(
        name="API Test Project",
        code="APITEST001",
        description="A test project for API tests",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


@pytest_asyncio.fixture
async def test_user(session):
    """Create a test user."""
    user = User(
        username="apitestuser",
        email="apitest@example.com",
        password_hash="hashed_password",
        department="Engineering",
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_project_member(session, test_project, test_user):
    """Create project membership."""
    member = ProjectMember(
        user_id=test_user.id,
        project_id=test_project.id,
        role="member",
    )
    session.add(member)
    await session.commit()


@pytest_asyncio.fixture
async def test_commits(session, test_project, test_user):
    """Create test commits."""
    end_date = datetime.utcnow()

    for i in range(10):
        commit = CodeCommit(
            user_id=test_user.id,
            project_id=test_project.id,
            commit_hash=f"apihash{i}",
            additions=20,
            deletions=5,
            language="python",
            file_count=3,
            commit_message=f"API Test Commit {i}",
            commit_time=end_date - timedelta(hours=i),
            is_ai_generated=False,
        )
        session.add(commit)

    await session.commit()


@pytest_asyncio.fixture
async def test_token_usage(session, test_project, test_user):
    """Create test token usage records."""
    today = date.today()

    for i in range(7):
        usage = TokenUsage(
            user_id=test_user.id,
            project_id=test_project.id,
            platform="trae",
            token_count=5000,
            api_calls=100,
            usage_date=today - timedelta(days=i),
            cost=Decimal("2.50"),
        )
        session.add(usage)

    await session.commit()


@pytest_asyncio.fixture
async def test_bugs(session, test_project, test_user):
    """Create test bug records."""
    end_date = datetime.utcnow()

    # Create a critical bug
    bug = BugRecord(
        project_id=test_project.id,
        assignee_id=test_user.id,
        reporter_id=test_user.id,
        title="API Test Critical Bug",
        description="A critical bug for API testing",
        severity="critical",
        priority="urgent",
        status="new",
        created_at=end_date - timedelta(days=1),
    )
    session.add(bug)

    await session.commit()


class TestProjectDashboardAPI:
    """Test cases for Project Dashboard API.

    Tests the endpoint: GET /api/v1/stats/projects/{project_id}/dashboard
    Expected response structure (wrapped in ApiResponse):
    {
        "code": 200,
        "message": "success",
        "data": {
            "project_id": number,
            "project_name": string,
            "total_stats": {
                "commits": number,
                "contributors": number,
                "lines_of_code": number,
                "pull_requests": number
            },
            "member_stats": [
                {
                    "user_id": number,
                    "username": string,
                    "commits": number,
                    "additions": number,
                    "deletions": number,
                    "tokens": number
                }
            ],
            "language_distribution": [...],
            "commit_trend": {
                "dates": string[],
                "commits": number[]
            }
        }
    }
    """

    @pytest.mark.asyncio
    async def test_get_project_dashboard_success(
        self,
        client,
        session,
        test_project,
        test_user,
        test_project_member,
        test_commits,
        test_token_usage,
        test_bugs,
    ):
        """Test successful GET request to project dashboard endpoint."""
        response = await client.get(f"/api/v1/stats/projects/{test_project.id}/dashboard")

        assert response.status_code == 200
        result = response.json()

        # Verify ApiResponse wrapper structure
        assert "code" in result
        assert "message" in result
        assert "data" in result
        assert result["code"] == 200
        assert result["message"] == "success"

        # Verify data content matches ProjectDashboardResponse structure
        data = result["data"]
        assert "project_id" in data
        assert "project_name" in data
        assert "total_stats" in data
        assert "member_stats" in data
        assert "language_distribution" in data
        assert "commit_trend" in data

        # Verify project info
        assert data["project_id"] == test_project.id
        assert data["project_name"] == "API Test Project"

        # Verify total_stats structure
        total_stats = data["total_stats"]
        assert "commits" in total_stats
        assert "contributors" in total_stats
        assert "lines_of_code" in total_stats
        assert "pull_requests" in total_stats

        # Verify commit_trend structure
        commit_trend = data["commit_trend"]
        assert "dates" in commit_trend
        assert "commits" in commit_trend
        assert isinstance(commit_trend["dates"], list)
        assert isinstance(commit_trend["commits"], list)

    @pytest.mark.asyncio
    async def test_get_project_dashboard_with_date_params(
        self,
        client,
        session,
        test_project,
    ):
        """Test GET request with custom startDate and endDate query parameters."""
        start_date = (date.today() - timedelta(days=7)).isoformat()
        end_date = date.today().isoformat()

        response = await client.get(
            f"/api/v1/stats/projects/{test_project.id}/dashboard?startDate={start_date}&endDate={end_date}"
        )

        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200
        assert "data" in result

    @pytest.mark.asyncio
    async def test_get_project_dashboard_not_found(
        self,
        client,
    ):
        """Test GET request for non-existent project."""
        response = await client.get("/api/v1/stats/projects/99999/dashboard")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_project_dashboard_empty_project(
        self,
        client,
        session,
        test_project,
    ):
        """Test GET request for project with no data."""
        response = await client.get(f"/api/v1/stats/projects/{test_project.id}/dashboard")

        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200

        data = result["data"]
        assert data["project_id"] == test_project.id
        assert data["total_stats"]["commits"] == 0
        assert data["member_stats"] == []
        assert data["language_distribution"] == []

    @pytest.mark.asyncio
    async def test_get_project_dashboard_member_stats(
        self,
        client,
        session,
        test_project,
        test_user,
        test_project_member,
        test_commits,
    ):
        """Test that member_stats contains correct user contribution data."""
        response = await client.get(f"/api/v1/stats/projects/{test_project.id}/dashboard")

        assert response.status_code == 200
        result = response.json()
        data = result["data"]

        # Verify member_stats structure
        assert "member_stats" in data
        member_stats = data["member_stats"]
        assert isinstance(member_stats, list)

        if member_stats:
            member = member_stats[0]
            assert "user_id" in member
            assert "username" in member
            assert "commits" in member
            assert "additions" in member
            assert "deletions" in member
            assert "tokens" in member

    @pytest.mark.asyncio
    async def test_get_project_dashboard_matches_frontend_types(
        self,
        client,
        session,
        test_project,
        test_user,
        test_project_member,
        test_commits,
    ):
        """Test that response matches frontend ProjectDashboard type exactly."""
        response = await client.get(f"/api/v1/stats/projects/{test_project.id}/dashboard")

        assert response.status_code == 200
        result = response.json()
        data = result["data"]

        # Verify all required fields for frontend ProjectDashboard type
        # projectId: number
        assert isinstance(data["project_id"], int)

        # projectName: string
        assert isinstance(data["project_name"], str)

        # totalStats: { commits, contributors, linesOfCode, pullRequests }
        total_stats = data["total_stats"]
        assert isinstance(total_stats["commits"], int)
        assert isinstance(total_stats["contributors"], int)
        assert isinstance(total_stats["lines_of_code"], int)
        assert isinstance(total_stats["pull_requests"], int)

        # memberStats: array of { userId, username, commits, additions, deletions, tokens }
        assert isinstance(data["member_stats"], list)

        # languageDistribution: array of { language, percentage }
        assert isinstance(data["language_distribution"], list)
        for lang in data["language_distribution"]:
            assert "language" in lang
            assert "percentage" in lang

        # commitTrend: { dates: string[], commits: number[] }
        commit_trend = data["commit_trend"]
        assert isinstance(commit_trend["dates"], list)
        assert isinstance(commit_trend["commits"], list)
        assert len(commit_trend["dates"]) == len(commit_trend["commits"])
