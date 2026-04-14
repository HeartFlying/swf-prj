"""Tests for users API endpoints.

Comprehensive test suite for GET /api/v1/users endpoint covering:
- Permission checks (admin, regular user, unauthenticated)
- Parameter validation (page, pageSize, keyword)
- Search functionality (keyword search on username and email)
- Role filtering (admin, developer, viewer)
- Status filtering (active, inactive)
- Combined filtering (keyword + role + status)
- Pagination functionality
"""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.core.security import create_access_token, get_password_hash
from app.db.models import Role, User
from app.main import app


@pytest.fixture
async def client(session: AsyncSession):
    """Create an async test client with overridden database dependency."""
    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def admin_role(session: AsyncSession) -> Role:
    """Create an admin role with all permissions."""
    role = Role(
        name="admin",
        description="Administrator with full access",
        permissions=["*"],
    )
    session.add(role)
    await session.commit()
    await session.refresh(role)
    return role


@pytest.fixture
async def developer_role(session: AsyncSession) -> Role:
    """Create a developer role."""
    role = Role(
        name="developer",
        description="Developer role",
        permissions=["read", "write"],
    )
    session.add(role)
    await session.commit()
    await session.refresh(role)
    return role


@pytest.fixture
async def viewer_role(session: AsyncSession) -> Role:
    """Create a viewer role."""
    role = Role(
        name="viewer",
        description="Viewer role with read-only access",
        permissions=["read"],
    )
    session.add(role)
    await session.commit()
    await session.refresh(role)
    return role


@pytest.fixture
async def admin_user(session: AsyncSession, admin_role: Role) -> User:
    """Create an admin user."""
    user = User(
        username="admin_test",
        email="admin@test.com",
        password_hash=get_password_hash("adminpass123"),
        department="IT",
        is_active=True,
        role_id=admin_role.id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture
async def developer_user(session: AsyncSession, developer_role: Role) -> User:
    """Create a developer user."""
    user = User(
        username="developer_test",
        email="developer@test.com",
        password_hash=get_password_hash("devpass123"),
        department="Engineering",
        is_active=True,
        role_id=developer_role.id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture
async def viewer_user(session: AsyncSession, viewer_role: Role) -> User:
    """Create a viewer user."""
    user = User(
        username="viewer_test",
        email="viewer@test.com",
        password_hash=get_password_hash("viewerpass123"),
        department="Product",
        is_active=True,
        role_id=viewer_role.id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture
async def inactive_user(session: AsyncSession, developer_role: Role) -> User:
    """Create an inactive user."""
    user = User(
        username="inactive_test",
        email="inactive@test.com",
        password_hash=get_password_hash("inactivepass123"),
        department="Engineering",
        is_active=False,
        role_id=developer_role.id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture
async def admin_token(admin_user: User) -> str:
    """Create an access token for admin user."""
    return create_access_token({"sub": str(admin_user.id), "username": admin_user.username})


@pytest.fixture
async def developer_token(developer_user: User) -> str:
    """Create an access token for developer user."""
    return create_access_token({"sub": str(developer_user.id), "username": developer_user.username})


@pytest.fixture
async def viewer_token(viewer_user: User) -> str:
    """Create an access token for viewer user."""
    return create_access_token({"sub": str(viewer_user.id), "username": viewer_user.username})


class TestPermissionChecks:
    """Tests for permission checks on GET /api/v1/users endpoint."""

    async def test_admin_access_returns_200(
        self, client: AsyncClient, admin_token: str, admin_user: User
    ):
        """Test admin user can access user list and returns 200."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        assert result["code"] == 200
        data = result["data"]
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "pageSize" in data

    async def test_regular_user_access_returns_403(
        self, client: AsyncClient, developer_token: str
    ):
        """Test regular user (developer) accessing user list returns 403."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users",
                headers={"Authorization": f"Bearer {developer_token}"},
            )

        assert response.status_code == 403

    async def test_viewer_user_access_returns_403(
        self, client: AsyncClient, viewer_token: str
    ):
        """Test viewer user accessing user list returns 403."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users",
                headers={"Authorization": f"Bearer {viewer_token}"},
            )

        assert response.status_code == 403

    async def test_unauthenticated_access_returns_401(self, client: AsyncClient):
        """Test unauthenticated user accessing user list returns 401."""
        response = await client.get("/api/v1/users")

        assert response.status_code == 401


class TestParameterValidation:
    """Tests for parameter validation on GET /api/v1/users endpoint."""

    async def test_page_zero_returns_422(self, client: AsyncClient, admin_token: str):
        """Test page=0 returns 422 validation error."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?page=0",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 422

    async def test_page_size_zero_returns_422(self, client: AsyncClient, admin_token: str):
        """Test pageSize=0 returns 422 validation error."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?pageSize=0",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 422

    async def test_page_size_exceeds_max_returns_422(self, client: AsyncClient, admin_token: str):
        """Test pageSize>1000 returns 422 validation error."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?pageSize=1001",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 422

    async def test_keyword_exceeds_max_length_returns_422(
        self, client: AsyncClient, admin_token: str
    ):
        """Test keyword over 100 characters returns 422 validation error."""
        long_keyword = "a" * 101
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                f"/api/v1/users?keyword={long_keyword}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 422


class TestSearchFunctionality:
    """Tests for keyword search functionality on GET /api/v1/users endpoint."""

    async def test_search_username_fuzzy_match(
        self,
        client: AsyncClient,
        session: AsyncSession,
        admin_token: str,
        admin_user: User,
        developer_user: User,
        viewer_user: User,
    ):
        """Test keyword search matches username with fuzzy search."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?keyword=developer",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        usernames = [item["username"] for item in data["items"]]
        assert "developer_test" in usernames
        assert "admin_test" not in usernames
        assert "viewer_test" not in usernames

    async def test_search_email_fuzzy_match(
        self,
        client: AsyncClient,
        session: AsyncSession,
        admin_token: str,
        admin_user: User,
        developer_user: User,
        viewer_user: User,
    ):
        """Test keyword search matches email with fuzzy search."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?keyword=viewer@test.com",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        usernames = [item["username"] for item in data["items"]]
        assert "viewer_test" in usernames
        assert "admin_test" not in usernames
        assert "developer_test" not in usernames

    async def test_search_no_results_returns_empty_list(
        self, client: AsyncClient, admin_token: str
    ):
        """Test keyword search with no matches returns empty list."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?keyword=nonexistent_user_xyz",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        assert data["items"] == []
        assert data["total"] == 0


class TestRoleFiltering:
    """Tests for role filtering on GET /api/v1/users endpoint."""

    async def test_filter_role_admin_returns_only_admins(
        self,
        client: AsyncClient,
        admin_token: str,
        admin_user: User,
        developer_user: User,
        viewer_user: User,
    ):
        """Test role=admin filter returns only admin users."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?role=admin",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        for item in data["items"]:
            assert item["role"]["name"] == "admin"

    async def test_filter_role_developer_returns_only_developers(
        self,
        client: AsyncClient,
        admin_token: str,
        admin_user: User,
        developer_user: User,
        viewer_user: User,
    ):
        """Test role=developer filter returns only developer users."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?role=developer",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        for item in data["items"]:
            assert item["role"]["name"] == "developer"

    async def test_filter_role_viewer_returns_only_viewers(
        self,
        client: AsyncClient,
        admin_token: str,
        admin_user: User,
        developer_user: User,
        viewer_user: User,
    ):
        """Test role=viewer filter returns only viewer users."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?role=viewer",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        for item in data["items"]:
            assert item["role"]["name"] == "viewer"

    async def test_filter_nonexistent_role_returns_empty_list(
        self, client: AsyncClient, admin_token: str
    ):
        """Test role filter with nonexistent role returns empty list."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?role=nonexistent_role",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        assert data["items"] == []
        assert data["total"] == 0


class TestStatusFiltering:
    """Tests for status filtering on GET /api/v1/users endpoint."""

    async def test_filter_status_active_returns_only_active_users(
        self,
        client: AsyncClient,
        admin_token: str,
        admin_user: User,
        developer_user: User,
        inactive_user: User,
    ):
        """Test status=active filter returns only active users."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?status=active",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        # Verify that only active users are returned
        # The inactive_user should not be in the results
        usernames = [item["username"] for item in data["items"]]
        assert "inactive_test" not in usernames
        # Both admin and developer should be present (they are active)
        assert "admin_test" in usernames
        assert "developer_test" in usernames

    async def test_filter_status_inactive_returns_only_inactive_users(
        self,
        client: AsyncClient,
        admin_token: str,
        admin_user: User,
        developer_user: User,
        inactive_user: User,
    ):
        """Test status=inactive filter returns only inactive users."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?status=inactive",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        # Verify that only inactive users are returned
        # The inactive_user should be the only one in results
        usernames = [item["username"] for item in data["items"]]
        assert "inactive_test" in usernames
        # Active users should not be present
        assert "admin_test" not in usernames
        assert "developer_test" not in usernames

    async def test_filter_status_uppercase_active(
        self,
        client: AsyncClient,
        admin_token: str,
        admin_user: User,
        inactive_user: User,
    ):
        """Test status=ACTIVE (uppercase) filter is case insensitive."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?status=ACTIVE",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        # Verify that only active users are returned (case insensitive)
        usernames = [item["username"] for item in data["items"]]
        assert "inactive_test" not in usernames
        assert "admin_test" in usernames

    async def test_filter_status_mixed_case_active(
        self,
        client: AsyncClient,
        admin_token: str,
        admin_user: User,
        inactive_user: User,
    ):
        """Test status=Active (mixed case) filter is case insensitive."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?status=Active",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        # Verify that only active users are returned (case insensitive)
        usernames = [item["username"] for item in data["items"]]
        assert "inactive_test" not in usernames
        assert "admin_test" in usernames


class TestCombinedFiltering:
    """Tests for combined filters on GET /api/v1/users endpoint."""

    async def test_keyword_and_role_combined(
        self,
        client: AsyncClient,
        session: AsyncSession,
        admin_token: str,
        admin_user: User,
        developer_user: User,
        viewer_user: User,
    ):
        """Test keyword + role combined filter."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?keyword=developer&role=developer",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        for item in data["items"]:
            assert item["role"]["name"] == "developer"
            assert "developer" in item["username"]

    async def test_role_and_status_combined(
        self,
        client: AsyncClient,
        session: AsyncSession,
        admin_token: str,
        admin_user: User,
        developer_user: User,
        inactive_user: User,
    ):
        """Test role + status combined filter."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?role=developer&status=active",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        for item in data["items"]:
            assert item["role"]["name"] == "developer"
        # Verify only active developer is returned (not inactive_user who is also developer role)
        usernames = [item["username"] for item in data["items"]]
        assert "developer_test" in usernames
        assert "inactive_test" not in usernames

    async def test_keyword_role_and_status_combined(
        self,
        client: AsyncClient,
        session: AsyncSession,
        admin_token: str,
        admin_user: User,
        developer_user: User,
        inactive_user: User,
    ):
        """Test keyword + role + status combined filter."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?keyword=developer&role=developer&status=active",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        for item in data["items"]:
            assert item["role"]["name"] == "developer"
            assert "developer" in item["username"]
        # Verify only active developer matching keyword is returned
        usernames = [item["username"] for item in data["items"]]
        assert "developer_test" in usernames
        assert "inactive_test" not in usernames

    async def test_combined_filter_no_results(
        self,
        client: AsyncClient,
        admin_token: str,
        developer_user: User,
    ):
        """Test combined filter with conflicting criteria returns empty list."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            # Search for developer with viewer role (should return nothing)
            response = await client.get(
                "/api/v1/users?keyword=developer&role=viewer",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        assert data["items"] == []
        assert data["total"] == 0


class TestPagination:
    """Tests for pagination functionality on GET /api/v1/users endpoint."""

    async def test_pagination_page_and_page_size(
        self,
        client: AsyncClient,
        session: AsyncSession,
        admin_token: str,
        admin_role: Role,
    ):
        """Test page and pageSize parameters work correctly."""
        # Create 5 test users
        for i in range(5):
            user = User(
                username=f"pagination_user_{i}",
                email=f"pagination_{i}@test.com",
                password_hash=get_password_hash("testpass123"),
                department="IT",
                is_active=True,
                role_id=admin_role.id,
            )
            session.add(user)
        await session.commit()

        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?page=1&pageSize=2",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        assert len(data["items"]) == 2
        assert data["page"] == 1
        assert data["pageSize"] == 2

    async def test_pagination_second_page(
        self,
        client: AsyncClient,
        session: AsyncSession,
        admin_token: str,
        admin_role: Role,
    ):
        """Test second page returns correct items."""
        # Create 5 test users
        for i in range(5):
            user = User(
                username=f"pagination_user2_{i}",
                email=f"pagination2_{i}@test.com",
                password_hash=get_password_hash("testpass123"),
                department="IT",
                is_active=True,
                role_id=admin_role.id,
            )
            session.add(user)
        await session.commit()

        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?page=2&pageSize=2",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        assert data["page"] == 2

    async def test_pagination_total_count(
        self,
        client: AsyncClient,
        session: AsyncSession,
        admin_token: str,
        admin_role: Role,
    ):
        """Test total returns correct count regardless of pagination."""
        # Create 5 test users
        for i in range(5):
            user = User(
                username=f"pagination_user3_{i}",
                email=f"pagination3_{i}@test.com",
                password_hash=get_password_hash("testpass123"),
                department="IT",
                is_active=True,
                role_id=admin_role.id,
            )
            session.add(user)
        await session.commit()

        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users?page=1&pageSize=2",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        # Total should include all users (admin + 5 created)
        assert data["total"] >= 6
        assert len(data["items"]) == 2

    async def test_pagination_default_values(
        self,
        client: AsyncClient,
        admin_token: str,
    ):
        """Test default pagination values (page=1, pageSize=100)."""
        with patch(
            "app.services.auth_service.TokenBlacklist.is_blacklisted",
            AsyncMock(return_value=False),
        ):
            response = await client.get(
                "/api/v1/users",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200
        result = response.json()
        data = result["data"]
        assert data["page"] == 1
        assert data["pageSize"] == 100
