"""Tests for Personal Stats API Authentication - TDD Red Phase.

These tests verify that personal statistics endpoints require authentication
and users can only access their own data.
"""

from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI, status
from fastapi.security import HTTPAuthorizationCredentials
from httpx import AsyncClient

from app.core.security import create_access_token


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
async def user1(session):
    """Create first test user."""
    import uuid

    from app.db.models import User

    unique_id = str(uuid.uuid4())[:8]
    user = User(
        username=f"user1_{unique_id}",
        email=f"user1_{unique_id}@example.com",
        password_hash="hashed_password",
        department="研发一部",
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture
async def user2(session):
    """Create second test user."""
    import uuid

    from app.db.models import User

    unique_id = str(uuid.uuid4())[:8]
    user = User(
        username=f"user2_{unique_id}",
        email=f"user2_{unique_id}@example.com",
        password_hash="hashed_password",
        department="研发二部",
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture
async def inactive_user(session):
    """Create inactive test user."""
    import uuid

    from app.db.models import User

    unique_id = str(uuid.uuid4())[:8]
    user = User(
        username=f"inactive_{unique_id}",
        email=f"inactive_{unique_id}@example.com",
        password_hash="hashed_password",
        department="研发一部",
        is_active=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


def get_auth_headers(user) -> dict:
    """Generate authorization headers for a user."""
    token = create_access_token({"sub": str(user.id), "username": user.username})
    return {"Authorization": f"Bearer {token}"}


class TestPersonalDashboardAuth:
    """Test authentication for GET /api/v1/stats/personal/dashboard endpoint."""

    @pytest.mark.asyncio
    async def test_dashboard_without_auth_returns_401(self, client: AsyncClient, user1):
        """Test that accessing dashboard without auth returns 401."""
        response = await client.get(f"/api/v1/stats/personal/dashboard?user_id={user1.id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_dashboard_with_valid_auth_returns_200(self, app: FastAPI, client: AsyncClient, user1):
        """Test that accessing dashboard with valid auth returns 200."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return user1

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(
                f"/api/v1/stats/personal/dashboard?user_id={user1.id}"
            )

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            assert result["code"] == 200
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_dashboard_user_can_only_access_own_data(self, app: FastAPI, client: AsyncClient, user1, user2):
        """Test that user1 cannot access user2's dashboard data."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return user1

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(
                f"/api/v1/stats/personal/dashboard?user_id={user2.id}"
            )

            # Should be forbidden - user can only access their own data
            assert response.status_code == status.HTTP_403_FORBIDDEN
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_dashboard_inactive_user_returns_403(self, app: FastAPI, client: AsyncClient, inactive_user):
        """Test that inactive user cannot access dashboard."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return inactive_user

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(
                f"/api/v1/stats/personal/dashboard?user_id={inactive_user.id}"
            )

            assert response.status_code == status.HTTP_403_FORBIDDEN
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_dashboard_with_invalid_token_returns_401(self, client: AsyncClient, user1):
        """Test that invalid token returns 401."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = await client.get(
            f"/api/v1/stats/personal/dashboard?user_id={user1.id}",
            headers=headers
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestPersonalCodeStatsAuth:
    """Test authentication for GET /api/v1/stats/personal/code endpoint."""

    @pytest.mark.asyncio
    async def test_code_stats_without_auth_returns_401(self, client: AsyncClient, user1):
        """Test that accessing code stats without auth returns 401."""
        response = await client.get(f"/api/v1/stats/personal/code?user_id={user1.id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_code_stats_with_valid_auth_returns_200(self, app: FastAPI, client: AsyncClient, user1):
        """Test that accessing code stats with valid auth returns 200."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return user1

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(
                f"/api/v1/stats/personal/code?user_id={user1.id}"
            )

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            assert result["code"] == 200
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_code_stats_user_can_only_access_own_data(self, app: FastAPI, client: AsyncClient, user1, user2):
        """Test that user1 cannot access user2's code stats."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return user1

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(
                f"/api/v1/stats/personal/code?user_id={user2.id}"
            )

            assert response.status_code == status.HTTP_403_FORBIDDEN
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]


class TestPersonalTokenStatsAuth:
    """Test authentication for GET /api/v1/stats/personal/tokens endpoint."""

    @pytest.mark.asyncio
    async def test_token_stats_without_auth_returns_401(self, client: AsyncClient, user1):
        """Test that accessing token stats without auth returns 401."""
        response = await client.get(f"/api/v1/stats/personal/tokens?user_id={user1.id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_token_stats_with_valid_auth_returns_200(self, app: FastAPI, client: AsyncClient, user1):
        """Test that accessing token stats with valid auth returns 200."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return user1

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(
                f"/api/v1/stats/personal/tokens?user_id={user1.id}"
            )

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            assert result["code"] == 200
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_token_stats_user_can_only_access_own_data(self, app: FastAPI, client: AsyncClient, user1, user2):
        """Test that user1 cannot access user2's token stats."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return user1

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(
                f"/api/v1/stats/personal/tokens?user_id={user2.id}"
            )

            assert response.status_code == status.HTTP_403_FORBIDDEN
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]


class TestPersonalBugRateAuth:
    """Test authentication for GET /api/v1/stats/personal/bugs endpoint."""

    @pytest.mark.asyncio
    async def test_bug_rate_without_auth_returns_401(self, client: AsyncClient, user1):
        """Test that accessing bug rate without auth returns 401."""
        response = await client.get(f"/api/v1/stats/personal/bugs?user_id={user1.id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_bug_rate_with_valid_auth_returns_200(self, app: FastAPI, client: AsyncClient, user1):
        """Test that accessing bug rate with valid auth returns 200."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return user1

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(
                f"/api/v1/stats/personal/bugs?user_id={user1.id}"
            )

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            assert result["code"] == 200
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_bug_rate_user_can_only_access_own_data(self, app: FastAPI, client: AsyncClient, user1, user2):
        """Test that user1 cannot access user2's bug rate."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return user1

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(
                f"/api/v1/stats/personal/bugs?user_id={user2.id}"
            )

            assert response.status_code == status.HTTP_403_FORBIDDEN
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]


class TestPersonalHeatmapAuth:
    """Test authentication for GET /api/v1/stats/personal/heatmap endpoint."""

    @pytest.mark.asyncio
    async def test_heatmap_without_auth_returns_401(self, client: AsyncClient, user1):
        """Test that accessing heatmap without auth returns 401."""
        response = await client.get(f"/api/v1/stats/personal/heatmap?user_id={user1.id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_heatmap_with_valid_auth_returns_200(self, app: FastAPI, client: AsyncClient, user1):
        """Test that accessing heatmap with valid auth returns 200."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return user1

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(
                f"/api/v1/stats/personal/heatmap?user_id={user1.id}"
            )

            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            assert result["code"] == 200
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]

    @pytest.mark.asyncio
    async def test_heatmap_user_can_only_access_own_data(self, app: FastAPI, client: AsyncClient, user1, user2):
        """Test that user1 cannot access user2's heatmap."""
        from app.core.dependencies import get_current_active_user

        async def override_get_current_active_user():
            return user1

        app.dependency_overrides[get_current_active_user] = override_get_current_active_user

        try:
            response = await client.get(
                f"/api/v1/stats/personal/heatmap?user_id={user2.id}"
            )

            assert response.status_code == status.HTTP_403_FORBIDDEN
        finally:
            if get_current_active_user in app.dependency_overrides:
                del app.dependency_overrides[get_current_active_user]
