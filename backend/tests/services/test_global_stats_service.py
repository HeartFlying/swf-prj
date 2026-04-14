"""Tests for Global Stats Service - TDD.

These tests define the expected behavior of the global statistics service.
"""

from datetime import date, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession


class TestGlobalStatsService:
    """Test cases for GlobalStatsService."""

    @pytest.fixture
    def global_stats_service(self):
        """Create a GlobalStatsService instance."""
        from app.services.global_stats_service import GlobalStatsService
        return GlobalStatsService()

    @pytest.fixture
    async def test_user(self, session: AsyncSession):
        """Create a test user."""
        from app.db.models import User
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashed_password",
            department="研发部",
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    @pytest.fixture
    async def test_project(self, session: AsyncSession):
        """Create a test project."""
        from app.db.models import Project
        project = Project(
            name="Test Project",
            code="TEST001",
            description="A test project",
            status="active",
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)
        return project

    @pytest.fixture
    async def test_token_usage(self, session: AsyncSession, test_user, test_project):
        """Create test token usage records."""
        from decimal import Decimal

        from app.db.models import TokenUsage

        today = date.today()
        token_usage = TokenUsage(
            user_id=test_user.id,
            project_id=test_project.id,
            platform="trae",
            token_count=1000,
            api_calls=10,
            usage_date=today,
            cost=Decimal("0.5"),
        )
        session.add(token_usage)
        await session.commit()
        return token_usage

    @pytest.fixture
    async def test_commit(self, session: AsyncSession, test_user, test_project):
        """Create a test commit record."""
        from app.db.models import CodeCommit

        commit = CodeCommit(
            user_id=test_user.id,
            project_id=test_project.id,
            commit_hash="abc123def456",
            additions=100,
            deletions=20,
            language="python",
            file_count=5,
            commit_message="Test commit",
            commit_time=datetime.utcnow(),
            is_ai_generated=False,
        )
        session.add(commit)
        await session.commit()
        return commit

    @pytest.fixture
    async def test_bug(self, session: AsyncSession, test_project, test_user):
        """Create a test bug record."""
        from app.db.models import BugRecord

        bug = BugRecord(
            project_id=test_project.id,
            reporter_id=test_user.id,
            title="Test Bug",
            description="A test bug",
            severity="normal",
            priority="medium",
            status="new",
        )
        session.add(bug)
        await session.commit()
        return bug

    @pytest.mark.asyncio
    async def test_get_top_users_empty(self, global_stats_service, session: AsyncSession):
        """Test get_top_users with no data."""
        users = await global_stats_service.get_top_users(db=session, limit=10)

        assert isinstance(users, list)
        assert len(users) == 0

    @pytest.mark.asyncio
    async def test_get_top_users_with_data(
        self, global_stats_service, session: AsyncSession, test_user, test_token_usage
    ):
        """Test get_top_users with user data."""
        users = await global_stats_service.get_top_users(db=session, limit=10)

        assert isinstance(users, list)
        assert len(users) > 0

        # Check first user structure
        first_user = users[0]
        assert "user_id" in first_user
        assert "username" in first_user
        assert "department" in first_user
        assert "token_count" in first_user
        assert "commit_count" in first_user

    @pytest.mark.asyncio
    async def test_get_top_users_respects_limit(
        self, global_stats_service, session: AsyncSession, test_user, test_token_usage
    ):
        """Test that get_top_users respects the limit parameter."""
        users = await global_stats_service.get_top_users(db=session, limit=5)

        assert len(users) <= 5

    @pytest.mark.asyncio
    async def test_get_global_summary_empty(self, global_stats_service, session: AsyncSession):
        """Test get_global_summary with no data."""
        summary = await global_stats_service.get_global_summary(db=session, days=30)

        assert isinstance(summary, dict)
        assert "total_users" in summary
        assert "total_projects" in summary
        assert "total_commits" in summary
        assert "total_tokens" in summary
        assert "total_bugs" in summary
        assert "active_users_today" in summary
        assert "period_days" in summary

        # All values should be 0 when no data
        assert summary["total_users"] == 0
        assert summary["total_projects"] == 0
        assert summary["total_commits"] == 0
        assert summary["total_tokens"] == 0
        assert summary["total_bugs"] == 0
        assert summary["active_users_today"] == 0
        assert summary["period_days"] == 30

    @pytest.mark.asyncio
    async def test_get_global_summary_with_data(
        self,
        global_stats_service,
        session: AsyncSession,
        test_user,
        test_project,
        test_token_usage,
        test_commit,
        test_bug,
    ):
        """Test get_global_summary with actual data."""
        summary = await global_stats_service.get_global_summary(db=session, days=30)

        assert summary["total_users"] >= 1
        assert summary["total_projects"] >= 1
        assert summary["total_commits"] >= 1
        assert summary["total_tokens"] >= 1000
        assert summary["total_bugs"] >= 1

    @pytest.mark.asyncio
    async def test_get_global_summary_different_periods(
        self, global_stats_service, session: AsyncSession, test_user, test_project
    ):
        """Test get_global_summary with different period lengths."""
        # Test with 7 days
        summary_7 = await global_stats_service.get_global_summary(db=session, days=7)
        assert summary_7["period_days"] == 7

        # Test with 90 days
        summary_90 = await global_stats_service.get_global_summary(db=session, days=90)
        assert summary_90["period_days"] == 90
