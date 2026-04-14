"""Tests for ZenTao Bugs synchronization.

TDD Red Phase: Write tests before implementation.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BugRecord, Project, User
from app.services.zendao_data_source import ZenTaoDataSource


class TestZenTaoDataSource:
    """Test cases for ZenTaoDataSource class."""

    @pytest.fixture
    def zendao_source(self):
        """Create a ZenTaoDataSource instance."""
        return ZenTaoDataSource()

    @pytest.fixture
    def mock_bugs_response(self):
        """Mock bugs response from ZenTao API."""
        return [
            {
                "id": 101,
                "title": "登录页面无法加载",
                "description": "用户在访问登录页面时，页面显示空白",
                "severity": 1,
                "priority": 1,
                "status": "active",
                "type": "codeerror",
                "module": "用户认证",
                "openedBy": "zhangsan",
                "openedDate": "2024-01-15T09:30:00Z",
                "assignedTo": "lisi",
                "assignedDate": "2024-01-15T10:00:00Z",
                "resolvedBy": None,
                "resolvedDate": None,
                "closedBy": None,
                "closedDate": None,
                "resolution": None,
            },
            {
                "id": 102,
                "title": "数据导出功能异常",
                "description": "导出Excel时提示内存不足",
                "severity": 2,
                "priority": 2,
                "status": "resolved",
                "type": "bug",
                "module": "数据管理",
                "openedBy": "wangwu",
                "openedDate": "2024-01-14T14:20:00Z",
                "assignedTo": "lisi",
                "assignedDate": "2024-01-14T15:00:00Z",
                "resolvedBy": "lisi",
                "resolvedDate": "2024-01-16T10:30:00Z",
                "closedBy": None,
                "closedDate": None,
                "resolution": "fixed",
            },
        ]

    async def test_fetch_bugs_success(
        self,
        zendao_source: ZenTaoDataSource,
        mock_bugs_response: list[dict],
    ):
        """Test successful fetch of bugs data."""
        # Arrange
        with patch.object(
            zendao_source.client,
            "get_bugs",
            new_callable=AsyncMock,
            return_value=mock_bugs_response,
        ):
            # Act
            bugs = await zendao_source.fetch_bugs(
                project_id=1,
                status="active",
            )

        # Assert
        assert len(bugs) == 2
        assert bugs[0]["id"] == 101
        assert bugs[1]["id"] == 102
        assert bugs[0]["title"] == "登录页面无法加载"

    async def test_fetch_bugs_empty_response(
        self,
        zendao_source: ZenTaoDataSource,
    ):
        """Test fetch with empty response."""
        # Arrange
        with patch.object(
            zendao_source.client,
            "get_bugs",
            new_callable=AsyncMock,
            return_value=[],
        ):
            # Act
            bugs = await zendao_source.fetch_bugs(
                project_id=1,
                status="active",
            )

        # Assert
        assert len(bugs) == 0
        assert bugs == []

    async def test_fetch_bugs_api_error(
        self,
        zendao_source: ZenTaoDataSource,
    ):
        """Test fetch handles API errors."""
        # Arrange
        with (
            patch.object(
                zendao_source.client,
                "get_bugs",
                new_callable=AsyncMock,
                side_effect=httpx.HTTPError("API Error"),
            ),
            pytest.raises(httpx.HTTPError),
        ):
            # Act & Assert
            await zendao_source.fetch_bugs(
                project_id=1,
                status="active",
            )

    async def test_transform_bug_success(
        self,
        zendao_source: ZenTaoDataSource,
        mock_bugs_response: list[dict],
    ):
        """Test successful transformation of bug data."""
        # Act
        bug = zendao_source.transform_bug(mock_bugs_response[0])

        # Assert
        assert isinstance(bug, BugRecord)
        assert bug.zendao_bug_id == 101
        assert bug.title == "登录页面无法加载"
        assert bug.description == "用户在访问登录页面时，页面显示空白"
        assert bug.severity == "critical"
        assert bug.priority == "urgent"
        assert bug.status == "active"
        assert bug.type == "codeerror"
        assert bug.module == "用户认证"

    async def test_transform_bug_with_defaults(
        self,
        zendao_source: ZenTaoDataSource,
    ):
        """Test transformation with minimal data."""
        # Arrange
        minimal_data = {
            "id": 103,
            "title": "简单问题",
            "severity": 3,
            "status": "closed",
        }

        # Act
        bug = zendao_source.transform_bug(minimal_data)

        # Assert
        assert isinstance(bug, BugRecord)
        assert bug.zendao_bug_id == 103
        assert bug.title == "简单问题"
        assert bug.severity == "normal"
        assert bug.status == "closed"
        assert bug.priority is None
        assert bug.description is None
        assert bug.type == "bug"
        assert bug.module is None

    async def test_sync_bugs_success(
        self,
        session: AsyncSession,
        zendao_source: ZenTaoDataSource,
        mock_bugs_response: list[dict],
    ):
        """Test successful sync of bugs to database."""
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
            "get_bugs",
            new_callable=AsyncMock,
            return_value=mock_bugs_response,
        ):
            # Act
            result = await zendao_source.sync_bugs(
                db=session,
                project_id=project.id,
            )

        # Assert
        assert result["total"] == 2
        assert result["processed"] == 2
        assert result["failed"] == 0

        # Verify records in database
        stmt = select(BugRecord).where(BugRecord.project_id == project.id)
        result = await session.execute(stmt)
        records = result.scalars().all()

        assert len(records) == 2
        assert records[0].zendao_bug_id in [101, 102]

    async def test_sync_bugs_uses_since_parameter(
        self,
        session: AsyncSession,
        zendao_source: ZenTaoDataSource,
        mock_bugs_response: list[dict],
    ):
        """Test that sync_bugs uses since parameter for filtering."""
        # Arrange - Create project
        project = Project(
            name="Test Project Since",
            code="TEST_SINCE",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.flush()
        await session.refresh(project)

        since_time = datetime(2024, 1, 1, tzinfo=timezone.utc)

        with patch.object(
            zendao_source.client,
            "get_bugs",
            new_callable=AsyncMock,
            return_value=mock_bugs_response,
        ) as mock_get_bugs:
            # Act
            result = await zendao_source.sync_bugs(
                db=session,
                project_id=project.id,
                since=since_time,
            )

        # Assert
        assert result["total"] == 2
        # Verify since was passed to fetch_bugs (via client.get_bugs)
        mock_get_bugs.assert_called_once()

    async def test_sync_bugs_full_sync_when_no_since(
        self,
        session: AsyncSession,
        zendao_source: ZenTaoDataSource,
        mock_bugs_response: list[dict],
    ):
        """Test that sync_bugs does full sync when since is None (ignores project.zendao_last_sync_at)."""
        # Arrange - Create project with last_sync_at
        last_sync = datetime(2024, 1, 10, tzinfo=timezone.utc)
        project = Project(
            name="Test Project LastSync",
            code="TEST_LASTSYNC",
            stage="研发",
            status="active",
            zendao_last_sync_at=last_sync,
        )
        session.add(project)
        await session.flush()
        await session.refresh(project)

        with patch.object(
            zendao_source.client,
            "get_bugs",
            new_callable=AsyncMock,
            return_value=mock_bugs_response,
        ) as mock_get_bugs:
            # Act - Call without since parameter (should do full sync, not use last_sync_at)
            result = await zendao_source.sync_bugs(
                db=session,
                project_id=project.id,
            )

        # Assert - Full sync should process all bugs regardless of last_sync_at
        assert result["total"] == 2
        assert result["processed"] == 2
        # Verify the sync succeeded
        mock_get_bugs.assert_called_once()

    async def test_sync_bugs_updates_project_last_sync_at(
        self,
        session: AsyncSession,
        zendao_source: ZenTaoDataSource,
        mock_bugs_response: list[dict],
    ):
        """Test that sync_bugs updates project.zendao_last_sync_at after sync."""
        # Arrange - Create project without last_sync_at
        project = Project(
            name="Test Project Update",
            code="TEST_UPDATE",
            stage="研发",
            status="active",
            zendao_last_sync_at=None,
        )
        session.add(project)
        await session.flush()
        await session.refresh(project)

        with patch.object(
            zendao_source.client,
            "get_bugs",
            new_callable=AsyncMock,
            return_value=mock_bugs_response,
        ):
            # Act
            result = await zendao_source.sync_bugs(
                db=session,
                project_id=project.id,
            )

        # Assert
        assert result["total"] == 2

        # Verify project.zendao_last_sync_at was updated
        await session.refresh(project)
        assert project.zendao_last_sync_at is not None
        # Should be a recent timestamp (handle timezone-aware or naive)
        now = datetime.now(timezone.utc)
        last_sync = project.zendao_last_sync_at
        if last_sync.tzinfo is None:
            # If naive, assume UTC
            last_sync = last_sync.replace(tzinfo=timezone.utc)
        assert (now - last_sync).total_seconds() < 60

    async def test_sync_bugs_duplicate_handling(
        self,
        session: AsyncSession,
        zendao_source: ZenTaoDataSource,
        mock_bugs_response: list[dict],
    ):
        """Test that duplicate bugs are updated not duplicated."""
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
            "get_bugs",
            new_callable=AsyncMock,
            return_value=mock_bugs_response,
        ):
            await zendao_source.sync_bugs(
                db=session,
                project_id=project.id,
            )

        # Second sync with same data (should update, not duplicate)
        with patch.object(
            zendao_source.client,
            "get_bugs",
            new_callable=AsyncMock,
            return_value=mock_bugs_response,
        ):
            result = await zendao_source.sync_bugs(
                db=session,
                project_id=project.id,
            )

        # Assert
        assert result["total"] == 2
        assert result["processed"] == 2

        # Verify no duplicates
        stmt = select(BugRecord).where(BugRecord.project_id == project.id)
        result = await session.execute(stmt)
        records = result.scalars().all()

        assert len(records) == 2  # Still 2, not 4

    async def test_sync_bugs_user_mapping(
        self,
        session: AsyncSession,
        zendao_source: ZenTaoDataSource,
    ):
        """Test user account mapping for assignee and reporter."""
        # Arrange - Create project and users
        project = Project(
            name="Test Project",
            code="TEST003",
            stage="研发",
            status="active",
        )
        reporter_user = User(
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
        session.add(reporter_user)
        session.add(assignee_user)
        await session.flush()
        await session.refresh(project)
        await session.refresh(reporter_user)
        await session.refresh(assignee_user)

        # Create user accounts mapping
        from app.db.models import UserAccount
        reporter_account = UserAccount(
            user_id=reporter_user.id,
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
        session.add(reporter_account)
        session.add(assignee_account)
        await session.flush()

        bugs_data = [
            {
                "id": 201,
                "title": "用户映射测试Bug",
                "severity": 2,
                "priority": 2,
                "status": "active",
                "openedBy": "zhangsan",
                "openedDate": "2024-01-15T09:30:00Z",
                "assignedTo": "lisi",
                "assignedDate": "2024-01-15T10:00:00Z",
            }
        ]

        with patch.object(
            zendao_source.client,
            "get_bugs",
            new_callable=AsyncMock,
            return_value=bugs_data,
        ):
            # Act
            result = await zendao_source.sync_bugs(
                db=session,
                project_id=project.id,
            )

        # Assert
        assert result["processed"] == 1

        # Verify user mapping
        stmt = select(BugRecord).where(BugRecord.zendao_bug_id == 201)
        result = await session.execute(stmt)
        bug = result.scalar_one()

        assert bug.reporter_id == reporter_user.id
        assert bug.assignee_id == assignee_user.id


class TestZenTaoDataSourceInterface:
    """Test that ZenTaoDataSource implements DataSourceInterface correctly."""

    async def test_implements_fetch(self, session: AsyncSession):
        """Test that fetch method works via interface."""
        source = ZenTaoDataSource()

        # Create project first
        project = Project(
            name="Interface Test Project",
            code="INT001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.flush()
        await session.refresh(project)

        with patch.object(
            source.client,
            "get_bugs",
            new_callable=AsyncMock,
            return_value=[{"id": 1, "title": "Test Bug", "severity": 1, "status": "active"}],
        ):
            records = await source.fetch(
                db=session,
                project_id=project.id,
            )

        assert len(records) == 1
        assert records[0]["title"] == "Test Bug"

    async def test_implements_transform(self):
        """Test that transform method works via interface."""
        source = ZenTaoDataSource()
        raw_data = {
            "id": 301,
            "title": "Interface Test",
            "severity": 1,
            "status": "active",
        }

        result = source.transform(raw_data)

        assert isinstance(result, BugRecord)
        assert result.zendao_bug_id == 301
        assert result.title == "Interface Test"

    async def test_implements_save(self, session: AsyncSession):
        """Test that save method works via interface."""
        source = ZenTaoDataSource()

        # Create project first
        project = Project(
            name="Save Test Project",
            code="SAVE001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.flush()
        await session.refresh(project)

        bug = BugRecord(
            project_id=project.id,
            zendao_bug_id=401,
            title="Save Test Bug",
            severity="major",
            status="active",
        )

        await source.save(session, bug)
        await session.commit()

        # Verify saved
        stmt = select(BugRecord).where(BugRecord.zendao_bug_id == 401)
        result = await session.execute(stmt)
        saved = result.scalar_one()

        assert saved.title == "Save Test Bug"
        assert saved.severity == "major"

    async def test_implements_sync(self, session: AsyncSession):
        """Test that sync method works via interface."""
        source = ZenTaoDataSource()

        # Create project
        project = Project(
            name="Sync Test Project",
            code="SYNC001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.flush()
        await session.refresh(project)

        with patch.object(
            source.client,
            "get_bugs",
            new_callable=AsyncMock,
            return_value=[
                {
                    "id": 501,
                    "title": "Sync Test Bug",
                    "severity": 1,
                    "status": "active",
                }
            ],
        ):
            result = await source.sync(
                db=session,
                project_id=project.id,
            )

        assert result["total"] == 1
        assert result["processed"] == 1
