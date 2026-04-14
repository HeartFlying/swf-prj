"""Tests for database models - TDD Red Phase.

These tests define the expected behavior of our database models.
Initially, they will fail because the models don't exist yet.
"""


import pytest
from sqlalchemy import select


class TestUserModel:
    """Test cases for User model."""

    @pytest.mark.asyncio
    async def test_create_user(self, session):
        """Test creating a user."""
        from app.db.models import User

        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashed_password",
            department="研发一部",
        )
        session.add(user)
        await session.commit()

        # Verify user was created
        result = await session.execute(
            select(User).where(User.username == "testuser")
        )
        saved_user = result.scalar_one()

        assert saved_user.id is not None
        assert saved_user.username == "testuser"
        assert saved_user.email == "test@example.com"
        assert saved_user.department == "研发一部"
        assert saved_user.is_active is True
        assert saved_user.created_at is not None

    @pytest.mark.asyncio
    async def test_user_unique_username(self, session):
        """Test username uniqueness constraint."""
        from sqlalchemy.exc import IntegrityError

        from app.db.models import User

        user1 = User(
            username="uniqueuser",
            email="user1@example.com",
            password_hash="hash1",
            department="研发一部",
        )
        session.add(user1)
        await session.commit()

        # Try to create another user with same username
        user2 = User(
            username="uniqueuser",
            email="user2@example.com",
            password_hash="hash2",
            department="研发二部",
        )
        session.add(user2)

        with pytest.raises(IntegrityError):
            await session.commit()

    @pytest.mark.asyncio
    async def test_user_email_validation(self, session):
        """Test email format validation."""
        from app.db.models import User

        # Valid email should work
        user = User(
            username="validuser",
            email="valid@example.com",
            password_hash="hash",
            department="研发一部",
        )
        session.add(user)
        await session.commit()

        result = await session.execute(
            select(User).where(User.username == "validuser")
        )
        saved_user = result.scalar_one()
        assert saved_user.email == "valid@example.com"


class TestRoleModel:
    """Test cases for Role model."""

    @pytest.mark.asyncio
    async def test_create_role(self, session):
        """Test creating a role."""
        from app.db.models import Role

        role = Role(
            name="admin",
            description="系统管理员",
            permissions=["user:manage", "role:manage", "config:manage"],
        )
        session.add(role)
        await session.commit()

        result = await session.execute(
            select(Role).where(Role.name == "admin")
        )
        saved_role = result.scalar_one()

        assert saved_role.id is not None
        assert saved_role.name == "admin"
        assert saved_role.description == "系统管理员"
        assert "user:manage" in saved_role.permissions

    @pytest.mark.asyncio
    async def test_role_unique_name(self, session):
        """Test role name uniqueness."""
        from sqlalchemy.exc import IntegrityError

        from app.db.models import Role

        role1 = Role(name="unique_admin_test", permissions=[])
        session.add(role1)
        await session.commit()

        role2 = Role(name="unique_admin_test", permissions=[])
        session.add(role2)

        with pytest.raises(IntegrityError):
            await session.commit()


class TestProjectModel:
    """Test cases for Project model."""

    @pytest.mark.asyncio
    async def test_create_project(self, session):
        """Test creating a project."""
        from app.db.models import Project

        project = Project(
            name="测试项目",
            code="TEST001",
            description="这是一个测试项目",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()

        result = await session.execute(
            select(Project).where(Project.code == "TEST001")
        )
        saved_project = result.scalar_one()

        assert saved_project.id is not None
        assert saved_project.name == "测试项目"
        assert saved_project.code == "TEST001"
        assert saved_project.status == "active"

    @pytest.mark.asyncio
    async def test_project_stage_enum(self, session):
        """Test project stage enum validation."""
        from sqlalchemy import func

        from app.db.models import Project

        # Valid stages
        valid_stages = ["调研", "立项", "需求", "设计", "研发", "验收", "发布", "运维"]

        for i, stage in enumerate(valid_stages):
            project = Project(
                name=f"项目-{stage}-{i}",
                code=f"PROJ-{stage}-{i}",
                stage=stage,
                status="active",
            )
            session.add(project)

        await session.commit()

        # Count projects using SQL function
        result = await session.execute(select(func.count()).select_from(Project))
        count = result.scalar()
        assert count == len(valid_stages)


class TestProjectMemberModel:
    """Test cases for ProjectMember model."""

    @pytest.mark.asyncio
    async def test_create_project_member(self, session):
        """Test creating a project member relationship."""
        from app.db.models import Project, ProjectMember, User

        # Create user and project first
        user = User(
            username="memberuser",
            email="member@example.com",
            password_hash="hash",
            department="研发一部",
        )
        project = Project(
            name="成员测试项目",
            code="MEMBER001",
            stage="研发",
            status="active",
        )
        session.add_all([user, project])
        await session.commit()

        # Create membership
        member = ProjectMember(
            user_id=user.id,
            project_id=project.id,
            role="developer",
        )
        session.add(member)
        await session.commit()

        result = await session.execute(
            select(ProjectMember).where(ProjectMember.user_id == user.id)
        )
        saved_member = result.scalar_one()

        assert saved_member.id is not None
        assert saved_member.user_id == user.id
        assert saved_member.project_id == project.id
        assert saved_member.role == "developer"


class TestUserPlatformAccountModel:
    """Test cases for UserPlatformAccount model."""

    @pytest.mark.asyncio
    async def test_create_platform_account(self, session):
        """Test creating a platform account."""
        from app.db.models import User, UserPlatformAccount

        user = User(
            username="platformuser",
            email="platform@example.com",
            password_hash="hash",
            department="研发一部",
        )
        session.add(user)
        await session.commit()

        account = UserPlatformAccount(
            user_id=user.id,
            platform="gitlab",
            account_id="gitlab_username",
        )
        session.add(account)
        await session.commit()

        result = await session.execute(
            select(UserPlatformAccount).where(
                UserPlatformAccount.user_id == user.id
            )
        )
        saved_account = result.scalar_one()

        assert saved_account.id is not None
        assert saved_account.platform == "gitlab"
        assert saved_account.account_id == "gitlab_username"

    @pytest.mark.asyncio
    async def test_platform_enum_validation(self, session):
        """Test platform enum validation."""
        from sqlalchemy import func

        from app.db.models import User, UserPlatformAccount

        user = User(
            username="enumuser_unique",
            email="enum_unique@example.com",
            password_hash="hash",
            department="研发一部",
        )
        session.add(user)
        await session.commit()

        # Valid platforms
        valid_platforms = ["trae", "gitlab", "zendao"]

        for platform in valid_platforms:
            account = UserPlatformAccount(
                user_id=user.id,
                platform=platform,
                account_id=f"{platform}_user_unique",
            )
            session.add(account)

        await session.commit()

        # Count accounts using SQL function
        result = await session.execute(select(func.count()).select_from(UserPlatformAccount))
        count = result.scalar()
        assert count == len(valid_platforms)
