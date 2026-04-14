"""Tests for Update Project Member API - TDD.

These tests define the expected behavior of the PUT /api/v1/projects/{id}/members/{id} endpoint.
"""

from datetime import date

import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient


@pytest.fixture
async def admin_role(session):
    """Create an admin role."""
    from app.db.models import Role

    role = Role(
        name="admin",
        description="Administrator with full access",
        permissions=["admin", "read", "write", "delete"],
    )
    session.add(role)
    await session.commit()
    await session.refresh(role)
    return role


@pytest.fixture
async def admin_user(session, admin_role):
    """Create an admin user."""
    from app.db.models import User

    user = User(
        username="admin_test",
        email="admin_test@example.com",
        password_hash="hashed_password",
        department="IT",
        is_active=True,
        role_id=admin_role.id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


# Fixture for test app with overridden dependencies
@pytest.fixture
def app(session, admin_user) -> FastAPI:
    """Create test FastAPI app with routes and overridden dependencies."""
    from fastapi import FastAPI

    from app.api.v1.projects import router as projects_router
    from app.core.dependencies import require_admin_permission
    from app.db.base import get_db

    app = FastAPI()

    # Override get_db dependency to use test session
    async def override_get_db():
        yield session

    # Override require_admin_permission to bypass auth
    async def override_require_admin():
        return admin_user

    app.include_router(projects_router, prefix="/api/v1")
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_admin_permission] = override_require_admin

    return app


@pytest.fixture
async def client(app: FastAPI) -> AsyncClient:
    """Create async test client."""
    from httpx import ASGITransport, AsyncClient
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
async def sample_project_member(session, sample_project, sample_user):
    """Create a sample project member for testing."""
    from app.db.models import ProjectMember

    member = ProjectMember(
        user_id=sample_user.id,
        project_id=sample_project.id,
        role="developer",
    )
    session.add(member)
    await session.commit()
    await session.refresh(member)
    return member


class TestUpdateProjectMember:
    """Test cases for PUT /api/v1/projects/{id}/members/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_project_member_success(
        self, client: AsyncClient, sample_project, sample_project_member
    ):
        """Test updating a project member's role successfully."""
        update_data = {
            "role": "maintainer",
        }

        response = await client.put(
            f"/api/v1/projects/{sample_project.id}/members/{sample_project_member.id}",
            json=update_data,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["role"] == "maintainer"
        assert data["id"] == sample_project_member.id
        assert data["project_id"] == sample_project.id
        assert data["user_id"] == sample_project_member.user_id
        assert "username" in data
        assert "email" in data

    @pytest.mark.asyncio
    async def test_update_project_member_to_owner(
        self, client: AsyncClient, sample_project, sample_project_member
    ):
        """Test updating a project member's role to owner."""
        update_data = {
            "role": "owner",
        }

        response = await client.put(
            f"/api/v1/projects/{sample_project.id}/members/{sample_project_member.id}",
            json=update_data,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["role"] == "owner"

    @pytest.mark.asyncio
    async def test_update_project_member_to_member(
        self, client: AsyncClient, sample_project, sample_project_member
    ):
        """Test updating a project member's role to member."""
        update_data = {
            "role": "member",
        }

        response = await client.put(
            f"/api/v1/projects/{sample_project.id}/members/{sample_project_member.id}",
            json=update_data,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["role"] == "member"

    @pytest.mark.asyncio
    async def test_update_project_member_project_not_found(
        self, client: AsyncClient, sample_project_member
    ):
        """Test updating a member in a non-existent project."""
        update_data = {
            "role": "maintainer",
        }

        response = await client.put(
            f"/api/v1/projects/99999/members/{sample_project_member.id}",
            json=update_data,
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_update_project_member_not_found(
        self, client: AsyncClient, sample_project
    ):
        """Test updating a non-existent member."""
        update_data = {
            "role": "maintainer",
        }

        response = await client.put(
            f"/api/v1/projects/{sample_project.id}/members/99999",
            json=update_data,
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_update_project_member_invalid_role(
        self, client: AsyncClient, sample_project, sample_project_member
    ):
        """Test updating with an invalid role."""
        update_data = {
            "role": "invalid_role",
        }

        response = await client.put(
            f"/api/v1/projects/{sample_project.id}/members/{sample_project_member.id}",
            json=update_data,
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_update_project_member_missing_role(
        self, client: AsyncClient, sample_project, sample_project_member
    ):
        """Test updating without role field."""
        update_data = {}

        response = await client.put(
            f"/api/v1/projects/{sample_project.id}/members/{sample_project_member.id}",
            json=update_data,
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_update_project_member_wrong_project(
        self, client: AsyncClient, session, sample_project_member
    ):
        """Test updating a member using wrong project ID."""
        import uuid

        from app.db.models import Project

        # Create another project
        unique_id = str(uuid.uuid4())[:8]
        other_project = Project(
            name="其他项目",
            code=f"OTHER{unique_id}",
            stage="研发",
            status="active",
        )
        session.add(other_project)
        await session.commit()
        await session.refresh(other_project)

        update_data = {
            "role": "maintainer",
        }

        # Try to update member using wrong project ID
        response = await client.put(
            f"/api/v1/projects/{other_project.id}/members/{sample_project_member.id}",
            json=update_data,
        )

        # Should return 404 because member doesn't exist in this project
        assert response.status_code == status.HTTP_404_NOT_FOUND
