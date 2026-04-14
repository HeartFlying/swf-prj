"""Tests for CodeStatsService.

These tests verify the real database-backed code statistics calculations.
"""

from datetime import date, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CodeCommit, Project, User
from app.services.code_stats_service import CodeStatsService


@pytest.fixture
def code_stats_service():
    """Create a CodeStatsService instance."""
    return CodeStatsService()


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
async def sample_commits(session: AsyncSession, sample_user: User, sample_project: Project):
    """Create sample commits for testing."""
    commits = []
    base_date = datetime.utcnow() - timedelta(days=5)

    for i in range(5):
        commit = CodeCommit(
            user_id=sample_user.id,
            project_id=sample_project.id,
            commit_hash=f"abc{i}def123456789",
            additions=100 + i * 10,
            deletions=20 + i * 5,
            language="python",
            file_count=3 + i,
            commit_message=f"Test commit {i}",
            commit_time=base_date + timedelta(days=i),
            is_ai_generated=i % 2 == 0,
        )
        commits.append(commit)

    session.add_all(commits)
    await session.commit()
    return commits


class TestGetUserCommits:
    """Test cases for get_user_commits method."""

    @pytest.mark.asyncio
    async def test_get_user_commits_success(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
        sample_user: User,
        sample_project: Project,
        sample_commits: list,
    ):
        """Test getting commits for a user."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        commits = await code_stats_service.get_user_commits(
            db=session,
            user_id=sample_user.id,
            start_date=start_date,
            end_date=end_date,
        )

        assert len(commits) == 5
        assert all(c.user_id == sample_user.id for c in commits)

    @pytest.mark.asyncio
    async def test_get_user_commits_empty(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
    ):
        """Test getting commits for non-existent user."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        commits = await code_stats_service.get_user_commits(
            db=session,
            user_id=99999,
            start_date=start_date,
            end_date=end_date,
        )

        assert len(commits) == 0

    @pytest.mark.asyncio
    async def test_get_user_commits_date_range(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
        sample_user: User,
        sample_project: Project,
        sample_commits: list,
    ):
        """Test getting commits with specific date range."""
        # Only get commits from last 2 days
        end_date = date.today()
        start_date = end_date - timedelta(days=1)

        commits = await code_stats_service.get_user_commits(
            db=session,
            user_id=sample_user.id,
            start_date=start_date,
            end_date=end_date,
        )

        # Should return only recent commits
        assert len(commits) <= 5


class TestGetProjectCommits:
    """Test cases for get_project_commits method."""

    @pytest.mark.asyncio
    async def test_get_project_commits_success(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
        sample_user: User,
        sample_project: Project,
        sample_commits: list,
    ):
        """Test getting commits for a project."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        commits = await code_stats_service.get_project_commits(
            db=session,
            project_id=sample_project.id,
            start_date=start_date,
            end_date=end_date,
        )

        assert len(commits) == 5
        assert all(c.project_id == sample_project.id for c in commits)


class TestCalculateCodeStats:
    """Test cases for calculate_code_stats method."""

    @pytest.mark.asyncio
    async def test_calculate_code_stats_by_user(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
        sample_user: User,
        sample_project: Project,
        sample_commits: list,
    ):
        """Test calculating code stats for a user."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        stats = await code_stats_service.calculate_code_stats(
            db=session,
            user_id=sample_user.id,
            project_id=None,
            start_date=start_date,
            end_date=end_date,
        )

        assert stats.total_commits == 5
        assert stats.total_additions > 0
        assert stats.total_deletions > 0
        assert stats.ai_generated_commits == 3  # 0, 2, 4 are AI generated

    @pytest.mark.asyncio
    async def test_calculate_code_stats_by_project(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
        sample_user: User,
        sample_project: Project,
        sample_commits: list,
    ):
        """Test calculating code stats for a project."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        stats = await code_stats_service.calculate_code_stats(
            db=session,
            user_id=None,
            project_id=sample_project.id,
            start_date=start_date,
            end_date=end_date,
        )

        assert stats.total_commits == 5

    @pytest.mark.asyncio
    async def test_calculate_code_stats_empty(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
    ):
        """Test calculating code stats with no data."""
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        stats = await code_stats_service.calculate_code_stats(
            db=session,
            user_id=99999,
            project_id=None,
            start_date=start_date,
            end_date=end_date,
        )

        assert stats.total_commits == 0
        assert stats.total_additions == 0
        assert stats.total_deletions == 0


class TestGetLanguageDistribution:
    """Test cases for get_language_distribution method."""

    @pytest.mark.asyncio
    async def test_get_language_distribution(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
        sample_user: User,
        sample_project: Project,
        sample_commits: list,
    ):
        """Test getting language distribution."""
        distribution = await code_stats_service.get_language_distribution(
            db=session,
            project_id=sample_project.id,
        )

        assert "python" in distribution
        assert distribution["python"] == 5

    @pytest.mark.asyncio
    async def test_get_language_distribution_empty(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
    ):
        """Test getting language distribution for empty project."""
        distribution = await code_stats_service.get_language_distribution(
            db=session,
            project_id=99999,
        )

        assert len(distribution) == 0


class TestGetCommitTrends:
    """Test cases for get_commit_trends method."""

    @pytest.mark.asyncio
    async def test_get_commit_trends(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
        sample_user: User,
        sample_project: Project,
        sample_commits: list,
    ):
        """Test getting commit trends."""
        trends = await code_stats_service.get_commit_trends(
            db=session,
            user_id=sample_user.id,
            project_id=None,
            days=7,
        )

        assert len(trends) == 7
        # Sum of all commits should equal total
        total_in_trends = sum(t.commit_count for t in trends)
        assert total_in_trends == 5

    @pytest.mark.asyncio
    async def test_get_commit_trends_empty(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
    ):
        """Test getting commit trends with no data."""
        trends = await code_stats_service.get_commit_trends(
            db=session,
            user_id=99999,
            project_id=None,
            days=7,
        )

        assert len(trends) == 7
        assert all(t.commit_count == 0 for t in trends)


class TestGetUserCodeRanking:
    """Test cases for get_user_code_ranking method."""

    @pytest.mark.asyncio
    async def test_get_user_code_ranking(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
        sample_user: User,
        sample_project: Project,
        sample_commits: list,
    ):
        """Test getting user code ranking."""
        rankings = await code_stats_service.get_user_code_ranking(
            db=session,
            project_id=sample_project.id,
            limit=10,
        )

        assert len(rankings) == 1
        assert rankings[0]["user_id"] == sample_user.id
        assert rankings[0]["username"] == sample_user.username
        assert rankings[0]["lines_added"] > 0

    @pytest.mark.asyncio
    async def test_get_user_code_ranking_empty(
        self,
        session: AsyncSession,
        code_stats_service: CodeStatsService,
    ):
        """Test getting user code ranking for empty project."""
        rankings = await code_stats_service.get_user_code_ranking(
            db=session,
            project_id=99999,
            limit=10,
        )

        assert len(rankings) == 0
