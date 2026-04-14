"""Tests for BugStatsService.

These tests verify the real database-backed bug statistics calculations.
"""

from datetime import date, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BugRecord, Project, User
from app.services.bug_stats_service import BugStatsService


@pytest.fixture
def bug_stats_service():
    """Create a BugStatsService instance."""
    return BugStatsService()


@pytest.fixture
async def sample_user(session: AsyncSession):
    """Create a sample user for testing."""
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed_password",
        department="研发一部",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture
async def sample_project(session: AsyncSession):
    """Create a sample project for testing."""
    project = Project(
        name="测试项目",
        code="TEST001",
        description="这是一个测试项目",
        stage="研发",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


@pytest.fixture
async def sample_bugs(
    session: AsyncSession, sample_user: User, sample_project: Project
):
    """Create sample bug records for testing."""
    bugs = []
    base_date = datetime.utcnow() - timedelta(days=5)

    severities = ["critical", "major", "normal", "minor", "trivial"]
    statuses = ["new", "assigned", "active", "resolved", "closed"]

    for i in range(5):
        bug = BugRecord(
            project_id=sample_project.id,
            assignee_id=sample_user.id,
            reporter_id=sample_user.id,
            title=f"Bug {i}",
            description=f"Description for bug {i}",
            severity=severities[i],
            priority=["urgent", "high", "medium", "low", "low"][i],
            status=statuses[i],
            created_at=base_date + timedelta(days=i),
            resolved_at=(
                base_date + timedelta(days=i + 1)
                if statuses[i] in ["resolved", "closed"]
                else None
            ),
            closed_at=(base_date + timedelta(days=i + 2)) if statuses[i] == "closed" else None,
        )
        bugs.append(bug)

    session.add_all(bugs)
    await session.commit()
    return bugs


class TestGetBugStatsByUser:
    """Test cases for get_bug_stats_by_user method."""

    @pytest.mark.asyncio
    async def test_get_bug_stats_by_user_success(
        self,
        session: AsyncSession,
        bug_stats_service: BugStatsService,
        sample_user: User,
        sample_project: Project,
        sample_bugs: list,
    ):
        """Test getting bug stats for a user."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        stats = await bug_stats_service.get_bug_stats_by_user(
            db=session,
            user_id=sample_user.id,
            start_date=start_date,
            end_date=end_date,
        )

        assert stats.total_bugs == 5
        assert stats.critical_bugs == 1
        assert stats.major_bugs == 1
        assert stats.resolved_bugs >= 0
        assert stats.open_bugs >= 0

    @pytest.mark.asyncio
    async def test_get_bug_stats_by_user_empty(
        self,
        session: AsyncSession,
        bug_stats_service: BugStatsService,
    ):
        """Test getting bug stats for non-existent user."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        stats = await bug_stats_service.get_bug_stats_by_user(
            db=session,
            user_id=99999,
            start_date=start_date,
            end_date=end_date,
        )

        assert stats.total_bugs == 0
        assert stats.critical_bugs == 0
        assert stats.resolved_bugs == 0


class TestGetBugStatsByProject:
    """Test cases for get_bug_stats_by_project method."""

    @pytest.mark.asyncio
    async def test_get_bug_stats_by_project_success(
        self,
        session: AsyncSession,
        bug_stats_service: BugStatsService,
        sample_user: User,
        sample_project: Project,
        sample_bugs: list,
    ):
        """Test getting bug stats for a project."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        stats = await bug_stats_service.get_bug_stats_by_project(
            db=session,
            project_id=sample_project.id,
            start_date=start_date,
            end_date=end_date,
        )

        assert stats.total_bugs == 5
        assert "critical" in stats.by_severity
        assert "major" in stats.by_severity
        assert len(stats.by_status) > 0

    @pytest.mark.asyncio
    async def test_get_bug_stats_by_project_empty(
        self,
        session: AsyncSession,
        bug_stats_service: BugStatsService,
    ):
        """Test getting bug stats for non-existent project."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        stats = await bug_stats_service.get_bug_stats_by_project(
            db=session,
            project_id=99999,
            start_date=start_date,
            end_date=end_date,
        )

        assert stats.total_bugs == 0
        assert len(stats.by_severity) == 0


class TestCalculateBugRate:
    """Test cases for calculate_bug_rate method."""

    @pytest.mark.asyncio
    async def test_calculate_bug_rate(
        self,
        session: AsyncSession,
        bug_stats_service: BugStatsService,
        sample_user: User,
        sample_project: Project,
        sample_bugs: list,
    ):
        """Test calculating bug rate."""
        result = await bug_stats_service.calculate_bug_rate(
            db=session,
            project_id=sample_project.id,
            days=30,
        )

        assert result.total_bugs == 5
        assert result.bug_rate >= 0
        assert result.bugs_per_1000_lines >= 0
        assert result.trend in ["improving", "worsening", "stable"]

    @pytest.mark.asyncio
    async def test_calculate_bug_rate_empty(
        self,
        session: AsyncSession,
        bug_stats_service: BugStatsService,
    ):
        """Test calculating bug rate for empty project."""
        result = await bug_stats_service.calculate_bug_rate(
            db=session,
            project_id=99999,
            days=30,
        )

        assert result.total_bugs == 0
        assert result.bug_rate == 0.0


class TestGetBugTrends:
    """Test cases for get_bug_trends method."""

    @pytest.mark.asyncio
    async def test_get_bug_trends(
        self,
        session: AsyncSession,
        bug_stats_service: BugStatsService,
        sample_user: User,
        sample_project: Project,
        sample_bugs: list,
    ):
        """Test getting bug trends."""
        trends = await bug_stats_service.get_bug_trends(
            db=session,
            project_id=sample_project.id,
            days=7,
        )

        assert len(trends) == 7
        # Sum of created bugs should equal total
        total_created = sum(t.created for t in trends)
        assert total_created == 5

    @pytest.mark.asyncio
    async def test_get_bug_trends_empty(
        self,
        session: AsyncSession,
        bug_stats_service: BugStatsService,
    ):
        """Test getting bug trends with no data."""
        trends = await bug_stats_service.get_bug_trends(
            db=session,
            project_id=99999,
            days=7,
        )

        assert len(trends) == 7
        assert all(t.created == 0 for t in trends)


class TestGetUserBugSummary:
    """Test cases for get_user_bug_summary method."""

    @pytest.mark.asyncio
    async def test_get_user_bug_summary(
        self,
        session: AsyncSession,
        bug_stats_service: BugStatsService,
        sample_user: User,
        sample_project: Project,
        sample_bugs: list,
    ):
        """Test getting user bug summary."""
        summary = await bug_stats_service.get_user_bug_summary(
            db=session,
            user_id=sample_user.id,
            project_id=sample_project.id,
        )

        assert summary["total_bugs"] == 5
        assert summary["critical_bugs"] == 1

    @pytest.mark.asyncio
    async def test_get_user_bug_summary_empty(
        self,
        session: AsyncSession,
        bug_stats_service: BugStatsService,
    ):
        """Test getting user bug summary for non-existent user."""
        summary = await bug_stats_service.get_user_bug_summary(
            db=session,
            user_id=99999,
        )

        assert summary["total_bugs"] == 0
        assert summary["critical_bugs"] == 0
