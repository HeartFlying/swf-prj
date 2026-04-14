"""Tests for TokenStatsService.

These tests verify the real database-backed token usage statistics calculations.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Project, TokenUsage, User
from app.services.token_stats_service import TokenStatsService


@pytest.fixture
def token_stats_service():
    """Create a TokenStatsService instance."""
    return TokenStatsService()


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
async def sample_token_usage(
    session: AsyncSession, sample_user: User, sample_project: Project
):
    """Create sample token usage records for testing."""
    records = []
    base_date = date.today() - timedelta(days=5)

    for i in range(5):
        record = TokenUsage(
            user_id=sample_user.id,
            project_id=sample_project.id,
            platform="trae" if i % 2 == 0 else "cursor",
            token_count=10000 + i * 1000,
            api_calls=100 + i * 10,
            usage_date=base_date + timedelta(days=i),
            cost=Decimal(f"{0.5 + i * 0.1:.2f}"),
        )
        records.append(record)

    session.add_all(records)
    await session.commit()
    return records


class TestGetUserTokenUsage:
    """Test cases for get_user_token_usage method."""

    @pytest.mark.asyncio
    async def test_get_user_token_usage_success(
        self,
        session: AsyncSession,
        token_stats_service: TokenStatsService,
        sample_user: User,
        sample_project: Project,
        sample_token_usage: list,
    ):
        """Test getting token usage for a user."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        summary = await token_stats_service.get_user_token_usage(
            db=session,
            user_id=sample_user.id,
            start_date=start_date,
            end_date=end_date,
        )

        assert summary.total_tokens > 0
        assert summary.api_calls > 0
        assert summary.total_cost > 0
        assert "trae" in summary.platform_breakdown
        assert "cursor" in summary.platform_breakdown

    @pytest.mark.asyncio
    async def test_get_user_token_usage_empty(
        self,
        session: AsyncSession,
        token_stats_service: TokenStatsService,
    ):
        """Test getting token usage for non-existent user."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        summary = await token_stats_service.get_user_token_usage(
            db=session,
            user_id=99999,
            start_date=start_date,
            end_date=end_date,
        )

        assert summary.total_tokens == 0
        assert summary.api_calls == 0
        assert summary.total_cost == Decimal("0")
        assert len(summary.platform_breakdown) == 0


class TestGetProjectTokenUsage:
    """Test cases for get_project_token_usage method."""

    @pytest.mark.asyncio
    async def test_get_project_token_usage_success(
        self,
        session: AsyncSession,
        token_stats_service: TokenStatsService,
        sample_user: User,
        sample_project: Project,
        sample_token_usage: list,
    ):
        """Test getting token usage for a project."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        summary = await token_stats_service.get_project_token_usage(
            db=session,
            project_id=sample_project.id,
            start_date=start_date,
            end_date=end_date,
        )

        assert summary.total_tokens > 0
        assert summary.api_calls > 0
        assert summary.total_cost > 0

    @pytest.mark.asyncio
    async def test_get_project_token_usage_empty(
        self,
        session: AsyncSession,
        token_stats_service: TokenStatsService,
    ):
        """Test getting token usage for non-existent project."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        summary = await token_stats_service.get_project_token_usage(
            db=session,
            project_id=99999,
            start_date=start_date,
            end_date=end_date,
        )

        assert summary.total_tokens == 0
        assert summary.api_calls == 0


class TestCalculateTokenTrends:
    """Test cases for calculate_token_trends method."""

    @pytest.mark.asyncio
    async def test_calculate_token_trends(
        self,
        session: AsyncSession,
        token_stats_service: TokenStatsService,
        sample_user: User,
        sample_project: Project,
        sample_token_usage: list,
    ):
        """Test calculating token trends."""
        trends = await token_stats_service.calculate_token_trends(
            db=session,
            user_id=sample_user.id,
            project_id=None,
            days=7,
        )

        assert len(trends) == 7
        # Sum of all tokens should equal total
        total_in_trends = sum(t.token_count for t in trends)
        assert total_in_trends > 0

    @pytest.mark.asyncio
    async def test_calculate_token_trends_empty(
        self,
        session: AsyncSession,
        token_stats_service: TokenStatsService,
    ):
        """Test calculating token trends with no data."""
        trends = await token_stats_service.calculate_token_trends(
            db=session,
            user_id=99999,
            project_id=None,
            days=7,
        )

        assert len(trends) == 7
        assert all(t.token_count == 0 for t in trends)


class TestGetCostAnalysis:
    """Test cases for get_cost_analysis method."""

    @pytest.mark.asyncio
    async def test_get_cost_analysis(
        self,
        session: AsyncSession,
        token_stats_service: TokenStatsService,
        sample_user: User,
        sample_project: Project,
        sample_token_usage: list,
    ):
        """Test getting cost analysis."""
        analysis = await token_stats_service.get_cost_analysis(
            db=session,
            project_id=sample_project.id,
            days=30,
        )

        assert analysis.total_cost > 0
        assert analysis.avg_daily_cost >= 0
        assert analysis.projected_monthly_cost >= 0
        assert "trae" in analysis.cost_by_platform or "cursor" in analysis.cost_by_platform

    @pytest.mark.asyncio
    async def test_get_cost_analysis_empty(
        self,
        session: AsyncSession,
        token_stats_service: TokenStatsService,
    ):
        """Test getting cost analysis for empty project."""
        analysis = await token_stats_service.get_cost_analysis(
            db=session,
            project_id=99999,
            days=30,
        )

        assert analysis.total_cost == Decimal("0")
        assert analysis.avg_daily_cost == Decimal("0")
        assert len(analysis.cost_by_platform) == 0


class TestGetTopUsersByTokens:
    """Test cases for get_top_users_by_tokens method."""

    @pytest.mark.asyncio
    async def test_get_top_users_by_tokens(
        self,
        session: AsyncSession,
        token_stats_service: TokenStatsService,
        sample_user: User,
        sample_project: Project,
        sample_token_usage: list,
    ):
        """Test getting top users by token usage."""
        top_users = await token_stats_service.get_top_users_by_tokens(
            db=session,
            limit=10,
        )

        assert len(top_users) == 1
        assert top_users[0]["user_id"] == sample_user.id
        assert top_users[0]["username"] == sample_user.username
        assert top_users[0]["token_count"] > 0

    @pytest.mark.asyncio
    async def test_get_top_users_by_tokens_empty(
        self,
        session: AsyncSession,
        token_stats_service: TokenStatsService,
    ):
        """Test getting top users with no data."""
        top_users = await token_stats_service.get_top_users_by_tokens(
            db=session,
            limit=10,
        )

        assert len(top_users) == 0
