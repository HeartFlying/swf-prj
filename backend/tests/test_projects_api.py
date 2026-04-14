"""Tests for Projects API - TDD Red Phase.

These tests define the expected behavior of the projects API endpoints.
Initially, they will fail because the API implementation doesn't exist yet.
"""

from datetime import date

import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient


# Fixture for test app with overridden dependencies
@pytest.fixture
def app(session) -> FastAPI:
    """Create test FastAPI app with routes and overridden dependencies."""
    from fastapi import FastAPI

    from app.api.v1.projects import router as projects_router
    from app.db.base import get_db

    app = FastAPI()

    # Override get_db dependency to use test session
    async def override_get_db():
        yield session

    app.include_router(projects_router, prefix="/api/v1")
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


class TestListProjects:
    """Test cases for GET /api/v1/projects endpoint."""

    @pytest.mark.asyncio
    async def test_list_projects_empty(self, client: AsyncClient):
        """Test listing projects when no projects exist."""
        response = await client.get("/api/v1/projects")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1
        assert data["pageSize"] == 20

    @pytest.mark.asyncio
    async def test_list_projects_with_data(self, client: AsyncClient, sample_project):
        """Test listing projects with existing data."""
        response = await client.get("/api/v1/projects")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) >= 1
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_list_projects_pagination(self, client: AsyncClient, session):
        """Test project list pagination."""
        import uuid

        from app.db.models import Project

        # Create multiple projects with unique codes
        for i in range(25):
            project = Project(
                name=f"项目{i}",
                code=f"PROJ{uuid.uuid4().hex[:6]}",
                stage="研发",
                status="active",
            )
            session.add(project)
        await session.commit()

        # Test first page
        response = await client.get("/api/v1/projects?page=1&pageSize=10")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 10
        assert data["total"] >= 25
        assert data["page"] == 1

        # Test second page
        response = await client.get("/api/v1/projects?page=2&pageSize=10")
        data = response.json()
        assert len(data["items"]) == 10
        assert data["page"] == 2

    @pytest.mark.asyncio
    async def test_list_projects_filter_by_status(self, client: AsyncClient, session):
        """Test filtering projects by status."""
        import uuid

        from app.db.models import Project

        # Create projects with different statuses
        active_project = Project(
            name="活跃项目",
            code=f"ACTIVE{uuid.uuid4().hex[:6]}",
            stage="研发",
            status="active",
        )
        archived_project = Project(
            name="归档项目",
            code=f"ARCHIVED{uuid.uuid4().hex[:6]}",
            stage="发布",
            status="archived",
        )
        session.add_all([active_project, archived_project])
        await session.commit()

        # Filter by active status
        response = await client.get("/api/v1/projects?status=active")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) >= 1
        assert all(p["status"] == "active" for p in data["items"])

    @pytest.mark.asyncio
    async def test_list_projects_filter_by_stage(self, client: AsyncClient, session):
        """Test filtering projects by stage."""
        import uuid

        from app.db.models import Project

        # Create projects with different stages
        research_project = Project(
            name="调研项目",
            code=f"RESEARCH{uuid.uuid4().hex[:6]}",
            stage="调研",
            status="active",
        )
        dev_project = Project(
            name="研发项目",
            code=f"DEV{uuid.uuid4().hex[:6]}",
            stage="研发",
            status="active",
        )
        session.add_all([research_project, dev_project])
        await session.commit()

        # Filter by stage
        response = await client.get("/api/v1/projects?stage=研发")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert all(p["stage"] == "研发" for p in data["items"])

    @pytest.mark.asyncio
    async def test_list_projects_search(self, client: AsyncClient, session):
        """Test searching projects by keyword."""
        import uuid

        from app.db.models import Project

        unique_id = uuid.uuid4().hex[:6]
        project1 = Project(
            name=f"AIProject{unique_id}",
            code=f"AI{unique_id}",
            stage="研发",
            status="active",
        )
        project2 = Project(
            name="BigDataPlatform",
            code=f"BIGDATA{uuid.uuid4().hex[:6]}",
            stage="设计",
            status="active",
        )
        session.add_all([project1, project2])
        await session.commit()

        # Search by keyword
        response = await client.get(f"/api/v1/projects?keyword=AI{unique_id}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 1
        assert "AI" in data["items"][0]["name"]


class TestCreateProject:
    """Test cases for POST /api/v1/projects endpoint."""

    @pytest.mark.asyncio
    async def test_create_project_success(self, client: AsyncClient):
        """Test creating a project with valid data."""
        import uuid

        unique_id = uuid.uuid4().hex[:6]
        project_data = {
            "name": "新项目",
            "code": f"NEW{unique_id}",
            "description": "这是一个新项目",
            "stage": "研发",
            "status": "active",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
        }

        response = await client.post("/api/v1/projects", json=project_data)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "新项目"
        assert data["code"] == project_data["code"]
        assert data["id"] is not None
        assert "created_at" in data

    @pytest.mark.asyncio
    async def test_create_project_duplicate_code(self, client: AsyncClient, sample_project):
        """Test creating a project with duplicate code."""
        project_data = {
            "name": "另一个项目",
            "code": sample_project.code,  # Same as sample_project
            "description": "描述",
            "stage": "研发",
            "status": "active",
        }

        response = await client.post("/api/v1/projects", json=project_data)

        assert response.status_code == status.HTTP_409_CONFLICT

    @pytest.mark.asyncio
    async def test_create_project_invalid_data(self, client: AsyncClient):
        """Test creating a project with invalid data."""
        project_data = {
            "name": "",  # Empty name
            "code": "INVALID",
            "stage": "invalid_stage",  # Invalid stage
            "status": "active",
        }

        response = await client.post("/api/v1/projects", json=project_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_create_project_missing_required(self, client: AsyncClient):
        """Test creating a project without required fields."""
        project_data = {
            "description": "缺少必填字段",
        }

        response = await client.post("/api/v1/projects", json=project_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestGetProject:
    """Test cases for GET /api/v1/projects/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_project_success(self, client: AsyncClient, sample_project):
        """Test getting a project by ID."""
        response = await client.get(f"/api/v1/projects/{sample_project.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == sample_project.id
        assert data["code"] == sample_project.code
        assert data["name"] == sample_project.name
        assert "members" in data

    @pytest.mark.asyncio
    async def test_get_project_not_found(self, client: AsyncClient):
        """Test getting a non-existent project."""
        response = await client.get("/api/v1/projects/99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_get_project_invalid_id(self, client: AsyncClient):
        """Test getting a project with invalid ID format."""
        response = await client.get("/api/v1/projects/invalid")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestUpdateProject:
    """Test cases for PUT /api/v1/projects/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_project_success(self, client: AsyncClient, sample_project):
        """Test updating a project with valid data."""
        update_data = {
            "name": "更新的项目名称",
            "description": "更新的描述",
            "stage": "验收",
        }

        response = await client.put(f"/api/v1/projects/{sample_project.id}", json=update_data)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "更新的项目名称"
        assert data["description"] == "更新的描述"
        assert data["stage"] == "验收"
        assert data["code"] == sample_project.code  # Unchanged

    @pytest.mark.asyncio
    async def test_update_project_not_found(self, client: AsyncClient):
        """Test updating a non-existent project."""
        update_data = {"name": "新名称"}

        response = await client.put("/api/v1/projects/99999", json=update_data)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_update_project_duplicate_code(self, client: AsyncClient, session):
        """Test updating project code to an existing one."""
        import uuid

        from app.db.models import Project

        unique_id1 = uuid.uuid4().hex[:6]
        unique_id2 = uuid.uuid4().hex[:6]

        project1 = Project(name="项目1", code=f"PROJ{unique_id1}", stage="研发", status="active")
        project2 = Project(name="项目2", code=f"PROJ{unique_id2}", stage="研发", status="active")
        session.add_all([project1, project2])
        await session.commit()
        await session.refresh(project1)
        await session.refresh(project2)

        update_data = {"code": project2.code}

        response = await client.put(f"/api/v1/projects/{project1.id}", json=update_data)

        assert response.status_code == status.HTTP_409_CONFLICT


class TestDeleteProject:
    """Test cases for DELETE /api/v1/projects/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_project_success(self, client: AsyncClient, sample_project):
        """Test deleting a project."""
        response = await client.delete(f"/api/v1/projects/{sample_project.id}")

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify project is deleted
        get_response = await client.get(f"/api/v1/projects/{sample_project.id}")
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_delete_project_not_found(self, client: AsyncClient):
        """Test deleting a non-existent project."""
        response = await client.delete("/api/v1/projects/99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestListProjectMembers:
    """Test cases for GET /api/v1/projects/{id}/members endpoint."""

    @pytest.mark.asyncio
    async def test_list_project_members_empty(self, client: AsyncClient, sample_project):
        """Test listing members of a project with no members."""
        response = await client.get(f"/api/v1/projects/{sample_project.id}/members")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_list_project_members_with_data(
        self, client: AsyncClient, session, sample_project, sample_user
    ):
        """Test listing members of a project with members."""
        from app.db.models import ProjectMember

        member = ProjectMember(
            user_id=sample_user.id,
            project_id=sample_project.id,
            role="developer",
        )
        session.add(member)
        await session.commit()

        response = await client.get(f"/api/v1/projects/{sample_project.id}/members")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["user_id"] == sample_user.id
        assert data["items"][0]["role"] == "developer"
        assert "username" in data["items"][0]

    @pytest.mark.asyncio
    async def test_list_project_members_project_not_found(self, client: AsyncClient):
        """Test listing members of a non-existent project."""
        response = await client.get("/api/v1/projects/99999/members")

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAddProjectMember:
    """Test cases for POST /api/v1/projects/{id}/members endpoint."""

    @pytest.mark.asyncio
    async def test_add_project_member_success(
        self, client: AsyncClient, sample_project, sample_user
    ):
        """Test adding a member to a project."""
        member_data = {
            "user_id": sample_user.id,
            "role": "tech_lead",
        }

        response = await client.post(
            f"/api/v1/projects/{sample_project.id}/members", json=member_data
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["user_id"] == sample_user.id
        assert data["project_id"] == sample_project.id
        assert data["role"] == "tech_lead"

    @pytest.mark.asyncio
    async def test_add_project_member_duplicate(
        self, client: AsyncClient, session, sample_project, sample_user
    ):
        """Test adding a member who is already in the project."""
        from app.db.models import ProjectMember

        # Add member first
        member = ProjectMember(
            user_id=sample_user.id,
            project_id=sample_project.id,
            role="developer",
        )
        session.add(member)
        await session.commit()

        # Try to add again
        member_data = {
            "user_id": sample_user.id,
            "role": "developer",
        }

        response = await client.post(
            f"/api/v1/projects/{sample_project.id}/members", json=member_data
        )

        assert response.status_code == status.HTTP_409_CONFLICT

    @pytest.mark.asyncio
    async def test_add_project_member_invalid_user(self, client: AsyncClient, sample_project):
        """Test adding a non-existent user to a project."""
        member_data = {
            "user_id": 99999,
            "role": "developer",
        }

        response = await client.post(
            f"/api/v1/projects/{sample_project.id}/members", json=member_data
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_add_project_member_project_not_found(self, client: AsyncClient, sample_user):
        """Test adding a member to a non-existent project."""
        member_data = {
            "user_id": sample_user.id,
            "role": "developer",
        }

        response = await client.post("/api/v1/projects/99999/members", json=member_data)

        assert response.status_code == status.HTTP_404_NOT_FOUND
