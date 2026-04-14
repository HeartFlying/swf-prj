"""Tests for unified Stats API - TDD Red Phase.

These tests define the expected behavior of the unified statistics API endpoints
with consistent response format.

统一响应格式:
{
    "code": 200,
    "message": "success",
    "data": { ... }
}
"""

from datetime import date, timedelta

import pytest
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from httpx import AsyncClient


def assert_api_response_format(response_data: dict, expected_data_fields: list[str] | None = None):
    """Helper function to verify unified API response format.

    Args:
        response_data: The JSON response from API
        expected_data_fields: List of expected fields in the data object
    """
    assert "code" in response_data, "Response must contain 'code' field"
    assert "message" in response_data, "Response must contain 'message' field"
    assert "data" in response_data, "Response must contain 'data' field"

    assert isinstance(response_data["code"], int), "'code' must be an integer"
    assert isinstance(response_data["message"], str), "'message' must be a string"
    assert isinstance(response_data["data"], dict), "'data' must be a dictionary"

    if expected_data_fields:
        for field in expected_data_fields:
            assert field in response_data["data"], f"Data must contain '{field}' field"


def assert_api_error_format(response_data: dict, expected_code: int | None = None):
    """Helper function to verify unified API error response format.

    Args:
        response_data: The JSON response from API
        expected_code: Expected error code
    """
    assert "code" in response_data, "Error response must contain 'code' field"
    assert "message" in response_data, "Error response must contain 'message' field"

    assert isinstance(response_data["code"], int), "'code' must be an integer"
    assert isinstance(response_data["message"], str), "'message' must be a string"

    if expected_code:
        assert response_data["code"] == expected_code, f"Expected code {expected_code}, got {response_data['code']}"


def add_exception_handlers(app: FastAPI):
    """Add unified exception handlers to the app."""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """Handle HTTP exceptions with unified response format."""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.status_code,
                "message": exc.detail,
                "data": None,
            }
        )


@pytest.fixture
def app(session) -> FastAPI:
    """Create test FastAPI app with routes and overridden dependencies."""
    from fastapi import FastAPI

    from app.api.v1.stats import router as stats_router
    from app.api.v1.auth import get_current_active_user
    from app.db.base import get_db
    from app.db.models import User

    app = FastAPI()

    async def override_get_db():
        yield session

    # Create a mock user for authentication
    async def override_get_current_active_user():
        # Return the first user from session or a mock user
        from sqlalchemy import select
        result = await session.execute(select(User))
        user = result.scalar_one_or_none()
        if user is None:
            # Create a mock user for testing
            user = User(
                id=1,
                username="testuser",
                email="test@example.com",
                password_hash="hashed_password",
                department="研发一部",
            )
        return user

    app.include_router(stats_router, prefix="/api/v1/stats")
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user

    # Add exception handlers for unified error format
    add_exception_handlers(app)

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


class TestPersonalDashboardStats:
    """Test cases for GET /api/v1/stats/personal/dashboard endpoint."""

    @pytest.mark.asyncio
    async def test_personal_dashboard_stats_success(self, client: AsyncClient, sample_user):
        """Test getting personal dashboard statistics with unified format."""
        response = await client.get(f"/api/v1/stats/personal/dashboard?user_id={sample_user.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify unified response format (API returns camelCase)
        assert_api_response_format(data, [
            "todayStats",
            "weeklyTrend",
            "languageStats",
            "heatmapData",
            "ranking",
        ])

        # Verify data types
        assert data["code"] == 200
        assert data["message"] == "success"
        assert isinstance(data["data"]["todayStats"], dict)
        assert isinstance(data["data"]["weeklyTrend"], dict)
        assert isinstance(data["data"]["languageStats"], list)
        assert isinstance(data["data"]["heatmapData"], list)
        assert isinstance(data["data"]["ranking"], dict)

        # Verify todayStats fields
        today_stats = data["data"]["todayStats"]
        assert "commits" in today_stats
        assert "additions" in today_stats
        assert "deletions" in today_stats
        assert "tokens" in today_stats
        assert "sessions" in today_stats

    @pytest.mark.asyncio
    async def test_personal_dashboard_stats_user_not_found(self, client: AsyncClient):
        """Test getting dashboard stats for non-existent user."""
        response = await client.get("/api/v1/stats/personal/dashboard?user_id=99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert_api_error_format(data, expected_code=404)

    @pytest.mark.asyncio
    async def test_personal_dashboard_stats_without_user_id(self, client: AsyncClient):
        """Test getting dashboard stats without user_id uses current user."""
        response = await client.get("/api/v1/stats/personal/dashboard")

        # API uses current authenticated user when user_id is not provided
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["code"] == 200
        assert "data" in data


class TestPersonalCodeStats:
    """Test cases for GET /api/v1/stats/personal/code endpoint."""

    @pytest.mark.asyncio
    async def test_personal_code_stats_success(self, client: AsyncClient, sample_user):
        """Test getting personal code statistics with unified format."""
        response = await client.get(f"/api/v1/stats/personal/code?user_id={sample_user.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify unified response format
        assert_api_response_format(data, [
            "total_commits",
            "total_prs",
            "lines_added",
            "lines_deleted",
            "avg_commits_per_day",
        ])

        # Verify data types
        assert data["code"] == 200
        assert data["message"] == "success"
        assert isinstance(data["data"]["total_commits"], int)
        assert isinstance(data["data"]["total_prs"], int)
        assert isinstance(data["data"]["lines_added"], int)
        assert isinstance(data["data"]["lines_deleted"], int)
        assert isinstance(data["data"]["avg_commits_per_day"], float)

    @pytest.mark.asyncio
    async def test_personal_code_stats_with_date_range(self, client: AsyncClient, sample_user):
        """Test getting personal code stats with date range."""
        start_date = (date.today() - timedelta(days=30)).isoformat()
        end_date = date.today().isoformat()

        response = await client.get(
            f"/api/v1/stats/personal/code?user_id={sample_user.id}&start_date={start_date}&end_date={end_date}"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert_api_response_format(data)
        assert "total_commits" in data["data"]


class TestPersonalTokenStats:
    """Test cases for GET /api/v1/stats/personal/tokens endpoint."""

    @pytest.mark.asyncio
    async def test_personal_token_stats_success(self, client: AsyncClient, sample_user):
        """Test getting personal token statistics with unified format."""
        response = await client.get(f"/api/v1/stats/personal/tokens?user_id={sample_user.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify unified response format
        assert_api_response_format(data, [
            "total_tokens",
            "prompt_tokens",
            "completion_tokens",
            "avg_tokens_per_day",
        ])

        # Verify data types
        assert data["code"] == 200
        assert data["message"] == "success"
        assert isinstance(data["data"]["total_tokens"], int)
        assert isinstance(data["data"]["prompt_tokens"], int)
        assert isinstance(data["data"]["completion_tokens"], int)
        assert isinstance(data["data"]["avg_tokens_per_day"], float)

    @pytest.mark.asyncio
    async def test_personal_token_stats_user_not_found(self, client: AsyncClient):
        """Test getting token stats for non-existent user."""
        response = await client.get("/api/v1/stats/personal/tokens?user_id=99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert_api_error_format(data, expected_code=404)


class TestPersonalBugStats:
    """Test cases for GET /api/v1/stats/personal/bugs endpoint."""

    @pytest.mark.asyncio
    async def test_personal_bug_stats_success(self, client: AsyncClient, sample_user):
        """Test getting personal bug statistics with unified format."""
        response = await client.get(f"/api/v1/stats/personal/bugs?user_id={sample_user.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify unified response format
        assert_api_response_format(data, [
            "total_bugs",
            "critical_bugs",
            "bug_rate",
            "resolved_bugs",
        ])

        # Verify data types
        assert data["code"] == 200
        assert data["message"] == "success"
        assert isinstance(data["data"]["total_bugs"], int)
        assert isinstance(data["data"]["critical_bugs"], int)
        assert isinstance(data["data"]["bug_rate"], float)
        assert data["data"]["bug_rate"] >= 0
        assert isinstance(data["data"]["resolved_bugs"], int)

    @pytest.mark.asyncio
    async def test_personal_bug_stats_with_project(self, client: AsyncClient, sample_user, sample_project):
        """Test getting personal bug stats for specific project."""
        response = await client.get(
            f"/api/v1/stats/personal/bugs?user_id={sample_user.id}&project_id={sample_project.id}"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert_api_response_format(data)
        assert "total_bugs" in data["data"]


class TestProjectDashboardStats:
    """Test cases for GET /api/v1/stats/projects/{project_id}/dashboard endpoint."""

    @pytest.mark.asyncio
    async def test_project_dashboard_stats_success(self, client: AsyncClient, sample_project):
        """Test getting project dashboard statistics with unified format."""
        response = await client.get(f"/api/v1/stats/projects/{sample_project.id}/dashboard")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify unified response format
        assert_api_response_format(data, [
            "project_id",
            "project_name",
            "total_stats",
            "member_stats",
            "language_distribution",
            "commit_trend",
        ])

        # Verify data types
        assert data["code"] == 200
        assert data["message"] == "success"
        assert data["data"]["project_id"] == sample_project.id
        assert data["data"]["project_name"] == sample_project.name
        assert isinstance(data["data"]["total_stats"], dict)
        assert isinstance(data["data"]["member_stats"], list)
        assert isinstance(data["data"]["language_distribution"], list)
        assert isinstance(data["data"]["commit_trend"], dict)

        # Verify total_stats fields
        total_stats = data["data"]["total_stats"]
        assert "commits" in total_stats
        assert "contributors" in total_stats
        assert "lines_of_code" in total_stats
        assert "pull_requests" in total_stats

    @pytest.mark.asyncio
    async def test_project_dashboard_stats_not_found(self, client: AsyncClient):
        """Test getting dashboard stats for non-existent project."""
        response = await client.get("/api/v1/stats/projects/99999/dashboard")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert_api_error_format(data, expected_code=404)


class TestAPIResponseFormatConsistency:
    """Test cases for API response format consistency across all endpoints."""

    @pytest.mark.asyncio
    async def test_all_stats_endpoints_use_unified_format(self, client: AsyncClient, sample_user, sample_project):
        """Test that all stats endpoints use the unified response format."""
        endpoints = [
            ("GET", f"/api/v1/stats/personal/dashboard?user_id={sample_user.id}"),
            ("GET", f"/api/v1/stats/personal/code?user_id={sample_user.id}"),
            ("GET", f"/api/v1/stats/personal/tokens?user_id={sample_user.id}"),
            ("GET", f"/api/v1/stats/personal/bugs?user_id={sample_user.id}"),
            ("GET", f"/api/v1/stats/projects/{sample_project.id}/dashboard"),
        ]

        for method, endpoint in endpoints:
            response = await client.request(method, endpoint)

            if response.status_code == status.HTTP_200_OK:
                data = response.json()
                assert "code" in data, f"Endpoint {endpoint} missing 'code' field"
                assert "message" in data, f"Endpoint {endpoint} missing 'message' field"
                assert "data" in data, f"Endpoint {endpoint} missing 'data' field"
                assert data["code"] == 200, f"Endpoint {endpoint} should have code 200"
                assert data["message"] == "success", f"Endpoint {endpoint} should have message 'success'"


class TestAPIErrorHandling:
    """Test cases for API error handling with unified format."""

    @pytest.mark.asyncio
    async def test_not_found_error_format(self, client: AsyncClient):
        """Test 404 error response format."""
        response = await client.get("/api/v1/stats/personal/dashboard?user_id=99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert_api_error_format(data, expected_code=404)
        assert "message" in data
        assert isinstance(data["message"], str)

    @pytest.mark.asyncio
    async def test_validation_error_format(self, client: AsyncClient):
        """Test 422 validation error response format."""
        # Test with invalid user_id (0 is not allowed, must be > 0)
        response = await client.get("/api/v1/stats/personal/dashboard?user_id=0")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_project_not_found_error_format(self, client: AsyncClient):
        """Test project not found error response format."""
        response = await client.get("/api/v1/stats/projects/99999/dashboard")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert_api_error_format(data, expected_code=404)
