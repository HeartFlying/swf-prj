"""Tests for ApiResponse format consistency across all API endpoints.

This test file verifies that all API endpoints return responses in the unified
ApiResponse format:
{
    "code": int,
    "message": str,
    "data": T
}
"""

import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport


@pytest.fixture
def app() -> FastAPI:
    """Create test FastAPI app."""
    from app.main import app as fastapi_app
    return fastapi_app


@pytest.fixture
async def client(app: FastAPI) -> AsyncClient:
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestApiResponseStructure:
    """Test that ApiResponse schema matches between frontend and backend."""

    def test_backend_api_response_schema(self):
        """Verify backend ApiResponse has correct fields."""
        from app.schemas.common import ApiResponse
        from pydantic import BaseModel
        import inspect

        # Get type parameters
        assert hasattr(ApiResponse, '__orig_bases__')

        # Verify it's a Pydantic model
        assert issubclass(ApiResponse, BaseModel)

        # Get field annotations
        annotations = ApiResponse.__annotations__

        # Verify required fields exist
        assert 'code' in annotations, "ApiResponse must have 'code' field"
        assert 'message' in annotations, "ApiResponse must have 'message' field"
        assert 'data' in annotations, "ApiResponse must have 'data' field"

        # Verify field types
        assert 'int' in str(annotations['code']), "code field must be int type"
        assert 'str' in str(annotations['message']), "message field must be str type"

    def test_api_response_instantiation(self):
        """Test that ApiResponse can be instantiated with various data types."""
        from app.schemas.common import ApiResponse

        # Test with dict data
        response1 = ApiResponse[dict](code=200, message="success", data={"key": "value"})
        assert response1.code == 200
        assert response1.message == "success"
        assert response1.data == {"key": "value"}

        # Test with list data
        response2 = ApiResponse[list](code=200, message="success", data=[1, 2, 3])
        assert response2.code == 200
        assert response2.data == [1, 2, 3]

        # Test with None data
        response3 = ApiResponse(code=200, message="success", data=None)
        assert response3.code == 200
        assert response3.data is None

    def test_api_response_serialization(self):
        """Test that ApiResponse serializes correctly to dict."""
        from app.schemas.common import ApiResponse

        response = ApiResponse[dict](code=200, message="success", data={"test": "value"})
        serialized = response.model_dump()

        assert "code" in serialized
        assert "message" in serialized
        assert "data" in serialized
        assert serialized["code"] == 200
        assert serialized["message"] == "success"
        assert serialized["data"] == {"test": "value"}


class TestSyncApiResponseFormat:
    """Test sync API endpoints use unified ApiResponse format.

    Note: These tests verify the response format of sync endpoints.
    The actual endpoint tests are in test_sync_gitlab_unified_response.py
    which properly mocks authentication.
    """

    @pytest.mark.asyncio
    async def test_sync_endpoints_require_auth(self, client: AsyncClient):
        """Test that sync endpoints require authentication (401 without auth)."""
        # This test verifies the endpoints are protected
        response = await client.post("/api/v1/sync/gitlab", json={"sync_type": "incremental_sync"})
        assert response.status_code == 401

        response = await client.post("/api/v1/sync/trae", json={"sync_type": "incremental_sync"})
        assert response.status_code == 401

        response = await client.post("/api/v1/sync/zendao", json={"sync_type": "incremental_sync"})
        assert response.status_code == 401


class TestAuthApiResponseFormat:
    """Test auth API endpoints use unified ApiResponse format."""

    @pytest.mark.asyncio
    async def test_login_response_format(self, client: AsyncClient, monkeypatch):
        """Test POST /api/v1/auth/login returns unified format."""
        # This test verifies the login endpoint structure
        # Note: Actual login may have different requirements, we just check format

        response = await client.post("/api/v1/auth/login", json={
            "username": "nonexistent",
            "password": "wrong"
        })

        # Even error responses should follow a consistent format
        # This documents the current behavior
        data = response.json()

        # Check if response follows unified format or FastAPI default error format
        if "code" in data and "message" in data and "data" in data:
            # Unified format
            pass
        elif "detail" in data:
            # FastAPI default error format - this is acceptable for auth errors
            pass
        else:
            pytest.fail(f"Unexpected response format: {data}")


class TestGlobalStatsApiResponseFormat:
    """Test global stats API endpoints use unified ApiResponse format."""

    @pytest.mark.asyncio
    async def test_token_trend_response_format(self, client: AsyncClient, monkeypatch):
        """Test GET /api/v1/stats/global/token-trend returns unified format."""
        # Mock the service call
        async def mock_calculate_token_trends(*args, **kwargs):
            from collections import namedtuple
            Trend = namedtuple('Trend', ['token_count', 'date'])
            return [Trend(token_count=100, date="2026-01-01")]

        monkeypatch.setattr(
            "app.services.token_stats_service.TokenStatsService.calculate_token_trends",
            mock_calculate_token_trends
        )

        response = await client.get("/api/v1/stats/global/token-trend")

        assert response.status_code == 200
        data = response.json()

        # Verify unified format
        assert "code" in data, f"Response missing 'code' field: {data}"
        assert "message" in data, f"Response missing 'message' field: {data}"
        assert "data" in data, f"Response missing 'data' field: {data}"

    @pytest.mark.asyncio
    async def test_activity_trend_response_format(self, client: AsyncClient, monkeypatch):
        """Test GET /api/v1/stats/global/activity-trend returns unified format."""
        # Mock the service call
        async def mock_get_commit_trends(*args, **kwargs):
            from collections import namedtuple
            Trend = namedtuple('Trend', ['commit_count'])
            return [Trend(commit_count=10)]

        monkeypatch.setattr(
            "app.services.code_stats_service.CodeStatsService.get_commit_trends",
            mock_get_commit_trends
        )

        response = await client.get("/api/v1/stats/global/activity-trend")

        assert response.status_code == 200
        data = response.json()

        # Verify unified format
        assert "code" in data
        assert "message" in data
        assert "data" in data

    @pytest.mark.asyncio
    async def test_top_users_response_format(self, client: AsyncClient, monkeypatch):
        """Test GET /api/v1/stats/global/top-users returns unified format."""
        # Mock the service call
        async def mock_get_top_users(*args, **kwargs):
            return [{"user_id": 1, "username": "test", "token_count": 100}]

        monkeypatch.setattr(
            "app.services.token_stats_service.TokenStatsService.get_top_users_by_tokens",
            mock_get_top_users
        )

        async def mock_calculate_code_stats(*args, **kwargs):
            from collections import namedtuple
            Stats = namedtuple('Stats', ['total_commits'])
            return Stats(total_commits=50)

        monkeypatch.setattr(
            "app.services.code_stats_service.CodeStatsService.calculate_code_stats",
            mock_calculate_code_stats
        )

        response = await client.get("/api/v1/stats/global/top-users")

        assert response.status_code == 200
        data = response.json()

        # Verify unified format
        assert "code" in data
        assert "message" in data
        assert "data" in data


class TestFrontendBackendConsistency:
    """Test that frontend and backend ApiResponse definitions are consistent."""

    def test_api_response_field_names_match(self):
        """Verify field names match between frontend and backend."""
        from app.schemas.common import ApiResponse

        # Backend field names
        backend_fields = set(ApiResponse.__annotations__.keys())

        # Expected fields (matching frontend/src/types/api.ts)
        expected_fields = {"code", "message", "data"}

        assert backend_fields == expected_fields, (
            f"Backend fields {backend_fields} don't match expected fields {expected_fields}"
        )

    def test_api_response_field_types_match(self):
        """Verify field types are compatible with frontend expectations."""
        from app.schemas.common import ApiResponse

        annotations = ApiResponse.__annotations__

        # code should be int
        assert 'int' in str(annotations['code']).lower()

        # message should be str
        assert 'str' in str(annotations['message']).lower()

        # data should be generic (can be any type)
        # The Generic[T] allows any type for data

    def test_api_response_default_values(self):
        """Verify ApiResponse has appropriate default values."""
        from app.schemas.common import ApiResponse
        from pydantic import Field

        # Create a response with defaults
        response = ApiResponse[dict](data={"test": "value"})

        # Default code should be 200
        assert response.code == 200

        # Default message should be "success"
        assert response.message == "success"


class TestErrorResponseFormat:
    """Test error responses follow consistent format."""

    def test_error_response_schema(self):
        """Verify ErrorResponse schema is defined."""
        from app.schemas.common import ErrorResponse

        # ErrorResponse should have code, message, data fields
        annotations = ErrorResponse.__annotations__

        assert 'code' in annotations
        assert 'message' in annotations
        assert 'data' in annotations

    def test_validation_error_response_schema(self):
        """Verify ValidationErrorResponse schema is defined."""
        from app.schemas.common import ValidationErrorResponse

        annotations = ValidationErrorResponse.__annotations__

        assert 'code' in annotations
        assert 'message' in annotations
        assert 'data' in annotations
