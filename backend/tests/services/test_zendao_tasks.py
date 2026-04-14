"""Tests for ZenTao Tasks synchronization.

TDD Red Phase: Write tests before implementation.
"""

from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Project, TaskRecord, User
from app.services.zendao_data_source import ZenTaoDataSource


class TestZenTaoTasksSync:
    """Test cases for ZenTao Tasks synchronization."""

    @pytest.fixture
    def zendao_source(self):
        """Create a ZenTaoDataSource instance."""
        return ZenTaoDataSource()

    @pytest.fixture
    def mock_tasks_response(self):
        """Mock tasks response from ZenTao API."""
        return [
            {
                "id": 301,
                "name": "实现用户登录功能",
                "desc": "开发用户登录页面和后端接口",
                "type": "devel",
                "status": "doing",
                "pri": 1,
                "estimate": 8.0,
                "consumed": 4.0,
                "left": 4.0,
                "openedBy": "zhangsan",
                "openedDate": "2024-01-15T09:30:00Z",
                "assignedTo": "lisi",
                "assignedDate": "2024-01-15T10:00:00Z",
                "deadline": "2024-01-20",
                "finishedBy": None,
                "finishedDate": None,
                "closedBy": None,
                "closedDate": None,
                "canceledBy": None,
                "canceledDate": None,
                "module": "用户认证",
                "story": 1001,
            },
            {
                "id": 302,
                "name": "编写单元测试",
                "desc": "为核心模块编写单元测试",
                "type": "test",
                "status": "wait",
                "pri": 2,
                "estimate": 4.0,
                "consumed": 0.0,
                "left": 4.0,
                "openedBy": "wangwu",
                "openedDate": "2024-01-14T14:20:00Z",
                "assignedTo": "lisi",
                "assignedDate": "2024-01-14T15:00:00Z",
                "deadline": "2024-01-18",
                "finishedBy": None,
                "finishedDate": None,
                "closedBy": None,
                "closedDate": None,
                "canceledBy": None,
                "canceledDate": None,
                "module": "测试",
                "story": 1002,
            },
        ]

    async def test_fetch_tasks_success(
        self,
        zendao_source: ZenTaoDataSource,
        mock_tasks_response: list[dict],
    ):
        """Test successful fetch of tasks data."""
        # Arrange
        with patch.object(
            zendao_source.client,
            "get_tasks",
            new_callable=AsyncMock,
            return_value=mock_tasks_response,
        ):
            # Act
            tasks = await zendao_source.fetch_tasks(
                project_id=1,
            )

        # Assert
        assert len(tasks) == 2
        assert tasks[0]["id"] == 301
        assert tasks[1]["id"] == 302
        assert tasks[0]["name"] == "实现用户登录功能"

    async def test_fetch_tasks_with_status_filter(
        self,
        zendao_source: ZenTaoDataSource,
        mock_tasks_response: list[dict],
    ):
        """Test fetching tasks with status filter."""
        # Arrange
        with patch.object(
            zendao_source.client,
            "get_tasks",
            new_callable=AsyncMock,
            return_value=[mock_tasks_response[0]],  # Only doing status
        ):
            # Act
            tasks = await zendao_source.fetch_tasks(
                project_id=1,
                status="doing",
            )

        # Assert
        assert len(tasks) == 1
        assert tasks[0]["status"] == "doing"

    async def test_transform_task_success(
        self,
        zendao_source: ZenTaoDataSource,
        mock_tasks_response: list[dict],
    ):
        """Test successful transformation of task data."""
        # Act
        task = zendao_source.transform_task(mock_tasks_response[0])

        # Assert
        assert isinstance(task, TaskRecord)
        assert task.zendao_task_id == 301
        assert task.name == "实现用户登录功能"
        assert task.description == "开发用户登录页面和后端接口"
        assert task.type == "devel"
        assert task.status == "doing"
        assert task.priority == "high"
        assert task.estimate == 8.0
        assert task.consumed == 4.0
        assert task.left == 4.0
        assert task.module == "用户认证"
        assert task.story_id == 1001

    async def test_transform_task_with_optional_fields(
        self,
        zendao_source: ZenTaoDataSource,
    ):
        """Test transformation with minimal/optional data."""
        # Arrange
        minimal_data = {
            "id": 303,
            "name": "简单任务",
            "type": "misc",
            "status": "wait",
            "pri": 3,
        }

        # Act
        task = zendao_source.transform_task(minimal_data)

        # Assert
        assert isinstance(task, TaskRecord)
        assert task.zendao_task_id == 303
        assert task.name == "简单任务"
        assert task.type == "misc"
        assert task.status == "wait"
        assert task.priority == "medium"
        assert task.description is None
        assert task.estimate == 0.0
        assert task.consumed == 0.0
        assert task.left == 0.0
        assert task.module is None
        assert task.story_id is None
        assert task.deadline is None

    async def test_sync_tasks_success(
        self,
        session: AsyncSession,
        zendao_source: ZenTaoDataSource,
        mock_tasks_response: list[dict],
    ):
        """Test successful sync of tasks to database."""
        # Arrange - Create project first
        project = Project(
            name="Test Project",
            code="TEST001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.flush()
        await session.refresh(project)

        with patch.object(
            zendao_source.client,
            "get_tasks",
            new_callable=AsyncMock,
            return_value=mock_tasks_response,
        ):
            # Act
            result = await zendao_source.sync_tasks(
                db=session,
                project_id=project.id,
            )

        # Assert
        assert result["total"] == 2
        assert result["processed"] == 2
        assert result["failed"] == 0

        # Verify records in database
        stmt = select(TaskRecord).where(TaskRecord.project_id == project.id)
        result = await session.execute(stmt)
        records = result.scalars().all()

        assert len(records) == 2
        assert records[0].zendao_task_id in [301, 302]

    async def test_sync_tasks_duplicate_handling(
        self,
        session: AsyncSession,
        zendao_source: ZenTaoDataSource,
        mock_tasks_response: list[dict],
    ):
        """Test that duplicate tasks are updated not duplicated."""
        # Arrange - Create project
        project = Project(
            name="Test Project",
            code="TEST002",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.flush()
        await session.refresh(project)

        # First sync
        with patch.object(
            zendao_source.client,
            "get_tasks",
            new_callable=AsyncMock,
            return_value=mock_tasks_response,
        ):
            await zendao_source.sync_tasks(
                db=session,
                project_id=project.id,
            )

        # Second sync with same data (should update, not duplicate)
        with patch.object(
            zendao_source.client,
            "get_tasks",
            new_callable=AsyncMock,
            return_value=mock_tasks_response,
        ):
            result = await zendao_source.sync_tasks(
                db=session,
                project_id=project.id,
            )

        # Assert
        assert result["total"] == 2
        assert result["processed"] == 2

        # Verify no duplicates
        stmt = select(TaskRecord).where(TaskRecord.project_id == project.id)
        result = await session.execute(stmt)
        records = result.scalars().all()

        assert len(records) == 2  # Still 2, not 4

    async def test_sync_tasks_user_mapping(
        self,
        session: AsyncSession,
        zendao_source: ZenTaoDataSource,
    ):
        """Test user account mapping for assignee and creator."""
        # Arrange - Create project and users
        project = Project(
            name="Test Project",
            code="TEST003",
            stage="研发",
            status="active",
        )
        creator_user = User(
            username="zhangsan",
            email="zhangsan@example.com",
            password_hash="hashed",
            department="Engineering",
        )
        assignee_user = User(
            username="lisi",
            email="lisi@example.com",
            password_hash="hashed",
            department="Engineering",
        )
        session.add(project)
        session.add(creator_user)
        session.add(assignee_user)
        await session.flush()
        await session.refresh(project)
        await session.refresh(creator_user)
        await session.refresh(assignee_user)

        # Create user accounts mapping
        from app.db.models import UserAccount
        creator_account = UserAccount(
            user_id=creator_user.id,
            platform="zendao",
            account_id="zhangsan",
            account_name="张三",
        )
        assignee_account = UserAccount(
            user_id=assignee_user.id,
            platform="zendao",
            account_id="lisi",
            account_name="李四",
        )
        session.add(creator_account)
        session.add(assignee_account)
        await session.flush()

        tasks_data = [
            {
                "id": 401,
                "name": "用户映射测试任务",
                "type": "devel",
                "status": "doing",
                "pri": 1,
                "estimate": 8.0,
                "openedBy": "zhangsan",
                "openedDate": "2024-01-15T09:30:00Z",
                "assignedTo": "lisi",
                "assignedDate": "2024-01-15T10:00:00Z",
            }
        ]

        with patch.object(
            zendao_source.client,
            "get_tasks",
            new_callable=AsyncMock,
            return_value=tasks_data,
        ):
            # Act
            result = await zendao_source.sync_tasks(
                db=session,
                project_id=project.id,
            )

        # Assert
        assert result["processed"] == 1

        # Verify user mapping
        stmt = select(TaskRecord).where(TaskRecord.zendao_task_id == 401)
        result = await session.execute(stmt)
        task = result.scalar_one()

        assert task.creator_id == creator_user.id
        assert task.assignee_id == assignee_user.id
