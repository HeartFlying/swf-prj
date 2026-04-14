"""Tests for RBAC (Role-Based Access Control) authorization.

TDD Red Phase: Write tests before implementation.
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException, status
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
        permissions=["*"],  # Super admin has all permissions
    )
    session.add(role)
    await session.commit()
    await session.refresh(role)
    return role


@pytest.fixture
async def user_role(session: AsyncSession) -> Role:
    """Create a regular user role with limited permissions."""
    role = Role(
        name="user",
        description="Regular user with limited access",
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
        email="admin_test@example.com",
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
async def regular_user(session: AsyncSession, user_role: Role) -> User:
    """Create a regular user."""
    user = User(
        username="regular_test",
        email="regular_test@example.com",
        password_hash=get_password_hash("userpass123"),
        department="Engineering",
        is_active=True,
        role_id=user_role.id,
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
async def user_token(regular_user: User) -> str:
    """Create an access token for regular user."""
    return create_access_token({"sub": str(regular_user.id), "username": regular_user.username})


class TestRBACDependencies:
    """Tests for RBAC dependency functions."""

    async def test_require_admin_permission_exists(self):
        """Test require_admin_permission dependency exists."""
        from app.core.dependencies import require_admin_permission
        assert callable(require_admin_permission)

    async def test_require_admin_permission_with_admin(self, admin_user: User, session: AsyncSession):
        """Test require_admin_permission allows admin users."""
        from app.core.dependencies import require_admin_permission

        result = await require_admin_permission(admin_user, session)
        assert result is not None
        assert result.id == admin_user.id

    async def test_require_admin_permission_with_regular_user(self, regular_user: User, session: AsyncSession):
        """Test require_admin_permission denies regular users with 403."""
        from app.core.dependencies import require_admin_permission

        with pytest.raises(HTTPException) as exc_info:
            await require_admin_permission(regular_user, session)

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "admin" in exc_info.value.detail.lower() or "permission" in exc_info.value.detail.lower()

    async def test_require_admin_permission_with_super_admin(self, session: AsyncSession):
        """Test require_admin_permission allows super admin (permissions=['*'])."""
        from app.core.dependencies import require_admin_permission

        # Create super admin role
        super_role = Role(name="superadmin", permissions=["*"])
        session.add(super_role)
        await session.commit()

        super_user = User(
            username="super_admin",
            email="super@example.com",
            password_hash=get_password_hash("superpass123"),
            department="IT",
            is_active=True,
            role_id=super_role.id,
        )
        session.add(super_user)
        await session.commit()
        await session.refresh(super_user)

        result = await require_admin_permission(super_user, session)
        assert result is not None
        assert result.id == super_user.id

    async def test_require_admin_permission_without_role(self, session: AsyncSession):
        """Test require_admin_permission denies users without any role."""
        from app.core.dependencies import require_admin_permission

        user_no_role = User(
            username="no_role_user",
            email="norole@example.com",
            password_hash=get_password_hash("pass123"),
            department="IT",
            is_active=True,
            role_id=None,
        )
        session.add(user_no_role)
        await session.commit()

        with pytest.raises(HTTPException) as exc_info:
            await require_admin_permission(user_no_role, session)

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


class TestRBACUserEndpoints:
    """Tests for RBAC on user management endpoints."""

    async def test_create_user_by_admin(self, client: AsyncClient, admin_token: str):
        """Test admin can create users."""
        user_data = {
            "username": "new_user_by_admin",
            "email": "new_by_admin@example.com",
            "password": "newpass123",
            "department": "Engineering",
        }

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/users",
                json=user_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 201

    async def test_create_user_by_regular_user_forbidden(self, client: AsyncClient, user_token: str):
        """Test regular user cannot create users (403)."""
        user_data = {
            "username": "unauthorized_user",
            "email": "unauthorized@example.com",
            "password": "newpass123",
            "department": "Engineering",
        }

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/users",
                json=user_data,
                headers={"Authorization": f"Bearer {user_token}"},
            )

        assert response.status_code == 403

    async def test_update_user_by_admin(self, client: AsyncClient, session: AsyncSession, admin_token: str):
        """Test admin can update any user."""
        # Create a target user
        target_user = User(
            username="target_user",
            email="target@example.com",
            password_hash=get_password_hash("targetpass123"),
            department="IT",
            is_active=True,
        )
        session.add(target_user)
        await session.commit()

        update_data = {"department": "Updated Department"}

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.put(
                f"/api/v1/users/{target_user.id}",
                json=update_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200

    async def test_update_user_by_regular_user_forbidden(self, client: AsyncClient, session: AsyncSession, user_token: str, regular_user: User):
        """Test regular user cannot update other users (403)."""
        # Create another user
        other_user = User(
            username="other_user",
            email="other@example.com",
            password_hash=get_password_hash("otherpass123"),
            department="IT",
            is_active=True,
        )
        session.add(other_user)
        await session.commit()

        update_data = {"department": "Hacked Department"}

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.put(
                f"/api/v1/users/{other_user.id}",
                json=update_data,
                headers={"Authorization": f"Bearer {user_token}"},
            )

        assert response.status_code == 403

    async def test_update_own_profile_by_regular_user(self, client: AsyncClient, user_token: str, regular_user: User):
        """Test regular user can update their own profile."""
        update_data = {"department": "My New Department"}

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.put(
                f"/api/v1/users/{regular_user.id}",
                json=update_data,
                headers={"Authorization": f"Bearer {user_token}"},
            )

        assert response.status_code == 200

    async def test_delete_user_by_admin(self, client: AsyncClient, session: AsyncSession, admin_token: str):
        """Test admin can delete users."""
        # Create a target user
        target_user = User(
            username="delete_target",
            email="delete_target@example.com",
            password_hash=get_password_hash("targetpass123"),
            department="IT",
            is_active=True,
        )
        session.add(target_user)
        await session.commit()

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.delete(
                f"/api/v1/users/{target_user.id}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 204

    async def test_delete_user_by_regular_user_forbidden(self, client: AsyncClient, session: AsyncSession, user_token: str):
        """Test regular user cannot delete users (403)."""
        # Create a target user
        target_user = User(
            username="delete_target_user",
            email="delete_target_user@example.com",
            password_hash=get_password_hash("targetpass123"),
            department="IT",
            is_active=True,
        )
        session.add(target_user)
        await session.commit()

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.delete(
                f"/api/v1/users/{target_user.id}",
                headers={"Authorization": f"Bearer {user_token}"},
            )

        assert response.status_code == 403


class TestRBACProjectEndpoints:
    """Tests for RBAC on project management endpoints."""

    async def test_create_project_by_admin(self, client: AsyncClient, session: AsyncSession, admin_token: str):
        """Test admin can create projects."""
        import uuid
        project_data = {
            "name": "New Project by Admin",
            "code": f"ADMIN_PROJ_{uuid.uuid4().hex[:8]}",
            "description": "Test project created by admin",
            "stage": "研发",
            "status": "active",
        }

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/projects",
                json=project_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 201

    async def test_create_project_by_regular_user_forbidden(self, client: AsyncClient, user_token: str):
        """Test regular user cannot create projects (403)."""
        project_data = {
            "name": "Unauthorized Project",
            "code": "USER_PROJ_001",
            "description": "Test project",
            "stage": "研发",
            "status": "active",
        }

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/projects",
                json=project_data,
                headers={"Authorization": f"Bearer {user_token}"},
            )

        assert response.status_code == 403

    async def test_update_project_by_admin(self, client: AsyncClient, session: AsyncSession, admin_token: str):
        """Test admin can update any project."""
        from app.db.models import Project
        import uuid

        # Create a project with unique code
        project = Project(
            name="Test Project",
            code=f"TEST_PROJ_{uuid.uuid4().hex[:8]}",
            description="Test project",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()

        update_data = {"name": "Updated Project Name"}

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.put(
                f"/api/v1/projects/{project.id}",
                json=update_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 200

    async def test_update_project_by_regular_user_forbidden(self, client: AsyncClient, session: AsyncSession, user_token: str):
        """Test regular user cannot update projects (403)."""
        from app.db.models import Project
        import uuid

        # Create a project with unique code
        project = Project(
            name="Test Project",
            code=f"TEST_PROJ_{uuid.uuid4().hex[:8]}",
            description="Test project",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()

        update_data = {"name": "Hacked Project Name"}

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.put(
                f"/api/v1/projects/{project.id}",
                json=update_data,
                headers={"Authorization": f"Bearer {user_token}"},
            )

        assert response.status_code == 403

    async def test_delete_project_by_admin(self, client: AsyncClient, session: AsyncSession, admin_token: str):
        """Test admin can delete projects."""
        from app.db.models import Project
        import uuid

        # Create a project with unique code
        project = Project(
            name="Delete Test Project",
            code=f"DELETE_PROJ_{uuid.uuid4().hex[:8]}",
            description="Test project to delete",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.delete(
                f"/api/v1/projects/{project.id}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 204

    async def test_delete_project_by_regular_user_forbidden(self, client: AsyncClient, session: AsyncSession, user_token: str):
        """Test regular user cannot delete projects (403)."""
        from app.db.models import Project
        import uuid

        # Create a project with unique code
        project = Project(
            name="Delete Test Project 2",
            code=f"DELETE_PROJ_{uuid.uuid4().hex[:8]}",
            description="Test project",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.delete(
                f"/api/v1/projects/{project.id}",
                headers={"Authorization": f"Bearer {user_token}"},
            )

        assert response.status_code == 403


class TestRBACSyncEndpoints:
    """Tests for RBAC on sync endpoints."""

    async def test_sync_gitlab_by_admin(self, client: AsyncClient, admin_token: str):
        """Test admin can trigger GitLab sync."""
        sync_data = {"project_id": 1}

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/sync/gitlab",
                json=sync_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 202

    async def test_sync_gitlab_by_regular_user_forbidden(self, client: AsyncClient, user_token: str):
        """Test regular user cannot trigger GitLab sync (403)."""
        sync_data = {"project_id": 1}

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/sync/gitlab",
                json=sync_data,
                headers={"Authorization": f"Bearer {user_token}"},
            )

        assert response.status_code == 403

    async def test_sync_trae_by_admin(self, client: AsyncClient, admin_token: str):
        """Test admin can trigger Trae sync."""
        sync_data = {"start_date": "2024-01-01", "end_date": "2024-01-31"}

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/sync/trae",
                json=sync_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 202

    async def test_sync_trae_by_regular_user_forbidden(self, client: AsyncClient, user_token: str):
        """Test regular user cannot trigger Trae sync (403)."""
        sync_data = {"start_date": "2024-01-01", "end_date": "2024-01-31"}

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/sync/trae",
                json=sync_data,
                headers={"Authorization": f"Bearer {user_token}"},
            )

        assert response.status_code == 403

    async def test_sync_zendao_by_admin(self, client: AsyncClient, admin_token: str):
        """Test admin can trigger Zendao sync."""
        sync_data = {"project_id": 1}

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/sync/zendao",
                json=sync_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )

        assert response.status_code == 202

    async def test_sync_zendao_by_regular_user_forbidden(self, client: AsyncClient, user_token: str):
        """Test regular user cannot trigger Zendao sync (403)."""
        sync_data = {"project_id": 1}

        with patch("app.services.auth_service.TokenBlacklist.is_blacklisted", AsyncMock(return_value=False)):
            response = await client.post(
                "/api/v1/sync/zendao",
                json=sync_data,
                headers={"Authorization": f"Bearer {user_token}"},
            )

        assert response.status_code == 403


class TestRBACPermissionHelpers:
    """Tests for RBAC permission helper functions."""

    async def test_has_permission_helper_exists(self):
        """Test has_permission helper function exists."""
        from app.core.dependencies import has_permission
        assert callable(has_permission)

    async def test_has_permission_with_matching_permission(self, admin_user: User):
        """Test has_permission returns True for matching permission."""
        from app.core.dependencies import has_permission

        result = has_permission(admin_user, "admin")
        assert result is True

    async def test_has_permission_without_matching_permission(self, regular_user: User):
        """Test has_permission returns False for non-matching permission."""
        from app.core.dependencies import has_permission

        result = has_permission(regular_user, "admin")
        assert result is False

    async def test_has_permission_with_super_admin(self, session: AsyncSession):
        """Test has_permission returns True for super admin with any permission."""
        from app.core.dependencies import has_permission

        super_role = Role(name="superadmin", permissions=["*"])
        session.add(super_role)
        await session.commit()

        super_user = User(
            username="super_test",
            email="super_test@example.com",
            password_hash=get_password_hash("superpass123"),
            department="IT",
            is_active=True,
            role_id=super_role.id,
        )
        session.add(super_user)
        await session.commit()
        await session.refresh(super_user)

        # Super admin should have any permission
        result = has_permission(super_user, "any_permission")
        assert result is True

    async def test_has_permission_with_no_role(self, session: AsyncSession):
        """Test has_permission returns False for user without role."""
        from app.core.dependencies import has_permission

        user_no_role = User(
            username="no_role_test",
            email="no_role_test@example.com",
            password_hash=get_password_hash("pass123"),
            department="IT",
            is_active=True,
            role_id=None,
        )
        session.add(user_no_role)
        await session.commit()

        result = has_permission(user_no_role, "admin")
        assert result is False

    async def test_is_admin_helper_exists(self):
        """Test is_admin helper function exists."""
        from app.core.dependencies import is_admin
        assert callable(is_admin)

    async def test_is_admin_returns_true_for_admin(self, admin_user: User):
        """Test is_admin returns True for admin user."""
        from app.core.dependencies import is_admin

        result = is_admin(admin_user)
        assert result is True

    async def test_is_admin_returns_false_for_regular_user(self, regular_user: User):
        """Test is_admin returns False for regular user."""
        from app.core.dependencies import is_admin

        result = is_admin(regular_user)
        assert result is False

    async def test_can_modify_user_helper_exists(self):
        """Test can_modify_user helper function exists."""
        from app.core.dependencies import can_modify_user
        assert callable(can_modify_user)

    async def test_can_modify_user_admin_can_modify_any(self, admin_user: User, regular_user: User):
        """Test admin can modify any user."""
        from app.core.dependencies import can_modify_user

        result = can_modify_user(admin_user, regular_user.id)
        assert result is True

    async def test_can_modify_user_can_modify_self(self, regular_user: User):
        """Test user can modify their own data."""
        from app.core.dependencies import can_modify_user

        result = can_modify_user(regular_user, regular_user.id)
        assert result is True

    async def test_can_modify_user_cannot_modify_others(self, regular_user: User, session: AsyncSession):
        """Test regular user cannot modify other users."""
        from app.core.dependencies import can_modify_user

        other_user = User(
            username="other_modify_test",
            email="other_modify_test@example.com",
            password_hash=get_password_hash("pass123"),
            department="IT",
            is_active=True,
        )
        session.add(other_user)
        await session.commit()

        result = can_modify_user(regular_user, other_user.id)
        assert result is False
