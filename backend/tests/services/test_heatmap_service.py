"""Tests for heatmap service - TDD.

This file tests the get_heatmap_data method in personal_stats_service module.
"""

from datetime import date, datetime, timedelta

import pytest_asyncio

from app.db.models import CodeCommit, Project, TokenUsage, User
from app.services.personal_stats_service import PersonalStatsService


@pytest_asyncio.fixture
async def test_user(session):
    """Create a test user."""
    user = User(
        username="heatmapuser",
        email="heatmap@example.com",
        password_hash="hashed_password",
        department="Engineering",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_project(session):
    """Create a test project."""
    project = Project(
        name="Heatmap Test Project",
        code="HEAT001",
        description="Test project for heatmap",
        stage="研发",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


@pytest_asyncio.fixture
async def test_commits_for_heatmap(session, test_user, test_project):
    """Create test code commits for heatmap testing."""
    base_date = date.today() - timedelta(days=10)
    commits = []

    # Day 1: 2 commits
    for i in range(2):
        commit = CodeCommit(
            user_id=test_user.id,
            project_id=test_project.id,
            commit_hash=f"day1_{i}abcdef123456",
            additions=50,
            deletions=10,
            language="python",
            file_count=2,
            commit_message=f"Day 1 Commit {i+1}",
            commit_time=datetime.combine(base_date, datetime.min.time()),
            is_ai_generated=False,
        )
        session.add(commit)
        commits.append(commit)

    # Day 3: 5 commits (high activity)
    for i in range(5):
        commit = CodeCommit(
            user_id=test_user.id,
            project_id=test_project.id,
            commit_hash=f"day3_{i}abcdef123456",
            additions=100,
            deletions=20,
            language="python",
            file_count=3,
            commit_message=f"Day 3 Commit {i+1}",
            commit_time=datetime.combine(base_date + timedelta(days=2), datetime.min.time()),
            is_ai_generated=False,
        )
        session.add(commit)
        commits.append(commit)

    # Day 5: 1 commit (low activity)
    commit = CodeCommit(
        user_id=test_user.id,
        project_id=test_project.id,
        commit_hash="day5_abcdef123456",
        additions=30,
        deletions=5,
        language="python",
        file_count=1,
        commit_message="Day 5 Commit",
        commit_time=datetime.combine(base_date + timedelta(days=4), datetime.min.time()),
        is_ai_generated=False,
    )
    session.add(commit)
    commits.append(commit)

    await session.commit()
    return commits


@pytest_asyncio.fixture
async def test_token_usage_for_heatmap(session, test_user, test_project):
    """Create test token usage records for heatmap testing."""
    base_date = date.today() - timedelta(days=10)
    records = []

    # Day 2: 5000 tokens
    record = TokenUsage(
        user_id=test_user.id,
        project_id=test_project.id,
        platform="trae",
        token_count=5000,
        api_calls=50,
        usage_date=base_date + timedelta(days=1),
        model="gpt-4",
        cost=0.25,
    )
    session.add(record)
    records.append(record)

    # Day 4: 15000 tokens (high activity)
    record = TokenUsage(
        user_id=test_user.id,
        project_id=test_project.id,
        platform="trae",
        token_count=15000,
        api_calls=150,
        usage_date=base_date + timedelta(days=3),
        model="gpt-4",
        cost=0.75,
    )
    session.add(record)
    records.append(record)

    await session.commit()
    return records


class TestGetHeatmapData:
    """Tests for get_heatmap_data method."""

    async def test_method_exists(self):
        """Test that get_heatmap_data method exists."""
        service = PersonalStatsService()
        assert hasattr(service, 'get_heatmap_data')

    async def test_returns_correct_structure(self, session, test_user):
        """Test that result has correct structure."""
        service = PersonalStatsService()

        result = await service.get_heatmap_data(
            db=session,
            user_id=test_user.id,
            days=30,
        )

        assert result["user_id"] == test_user.id
        assert "data" in result
        assert isinstance(result["data"], list)
        assert "total_days" in result
        assert "start_date" in result
        assert "end_date" in result

    async def test_heatmap_with_commits(self, session, test_user, test_project, test_commits_for_heatmap):
        """Test heatmap data calculation with commits."""
        service = PersonalStatsService()

        result = await service.get_heatmap_data(
            db=session,
            user_id=test_user.id,
            days=15,
        )

        # Find the data points for days with commits
        data_by_date = {item["date"]: item for item in result["data"]}

        base_date = date.today() - timedelta(days=10)
        day1_str = base_date.isoformat()
        day3_str = (base_date + timedelta(days=2)).isoformat()
        day5_str = (base_date + timedelta(days=4)).isoformat()

        # Verify commit counts
        assert data_by_date[day1_str]["count"] == 2
        assert data_by_date[day3_str]["count"] == 5
        assert data_by_date[day5_str]["count"] == 1

    async def test_heatmap_with_token_usage(self, session, test_user, test_project, test_token_usage_for_heatmap):
        """Test heatmap data calculation with token usage."""
        service = PersonalStatsService()

        result = await service.get_heatmap_data(
            db=session,
            user_id=test_user.id,
            days=15,
            metric_type="tokens"
        )

        # Find the data points for days with token usage
        data_by_date = {item["date"]: item for item in result["data"]}

        base_date = date.today() - timedelta(days=10)
        day2_str = (base_date + timedelta(days=1)).isoformat()
        day4_str = (base_date + timedelta(days=3)).isoformat()

        # Verify token counts
        assert data_by_date[day2_str]["count"] == 5000
        assert data_by_date[day4_str]["count"] == 15000

    async def test_heatmap_levels_calculation(self, session, test_user, test_project, test_commits_for_heatmap):
        """Test that activity levels are calculated correctly."""
        service = PersonalStatsService()

        result = await service.get_heatmap_data(
            db=session,
            user_id=test_user.id,
            days=15,
        )

        data_by_date = {item["date"]: item for item in result["data"]}

        base_date = date.today() - timedelta(days=10)
        day1_str = base_date.isoformat()
        day3_str = (base_date + timedelta(days=2)).isoformat()
        day5_str = (base_date + timedelta(days=4)).isoformat()

        # Verify levels (based on commit counts)
        # Level 0: 0 commits, Level 1: 1, Level 2: 2-3, Level 3: 4-5, Level 4: 6+
        assert data_by_date[day1_str]["level"] == 2  # 2 commits
        assert data_by_date[day3_str]["level"] == 3  # 5 commits
        assert data_by_date[day5_str]["level"] == 1  # 1 commit

    async def test_heatmap_empty_days(self, session, test_user, test_project, test_commits_for_heatmap):
        """Test that empty days have count 0 and level 0."""
        service = PersonalStatsService()

        result = await service.get_heatmap_data(
            db=session,
            user_id=test_user.id,
            days=15,
        )

        data_by_date = {item["date"]: item for item in result["data"]}

        base_date = date.today() - timedelta(days=10)
        # Day 2 should have no commits
        day2_str = (base_date + timedelta(days=1)).isoformat()

        assert data_by_date[day2_str]["count"] == 0
        assert data_by_date[day2_str]["level"] == 0

    async def test_heatmap_date_range(self, session, test_user):
        """Test that date range is calculated correctly."""
        service = PersonalStatsService()
        days = 7

        result = await service.get_heatmap_data(
            db=session,
            user_id=test_user.id,
            days=days,
        )

        expected_end = date.today()
        expected_start = expected_end - timedelta(days=days - 1)

        assert result["total_days"] == days
        assert result["end_date"] == expected_end.isoformat()
        assert result["start_date"] == expected_start.isoformat()

    async def test_heatmap_data_length(self, session, test_user):
        """Test that data array has correct length."""
        service = PersonalStatsService()
        days = 30

        result = await service.get_heatmap_data(
            db=session,
            user_id=test_user.id,
            days=days,
        )

        assert len(result["data"]) == days

    async def test_heatmap_without_activity(self, session, test_user):
        """Test heatmap for user with no activity."""
        service = PersonalStatsService()

        result = await service.get_heatmap_data(
            db=session,
            user_id=test_user.id,
            days=7,
        )

        assert result["user_id"] == test_user.id
        assert len(result["data"]) == 7

        # All days should have 0 count and 0 level
        for item in result["data"]:
            assert item["count"] == 0
            assert item["level"] == 0

    async def test_nonexistent_user(self, session):
        """Test behavior with non-existent user."""
        service = PersonalStatsService()

        result = await service.get_heatmap_data(
            db=session,
            user_id=99999,  # Non-existent user
            days=7,
        )

        assert result["user_id"] == 99999
        assert len(result["data"]) == 7

        # All days should have 0 count
        for item in result["data"]:
            assert item["count"] == 0

    async def test_different_days_parameter(self, session, test_user):
        """Test that different days parameter works correctly."""
        service = PersonalStatsService()

        result_7 = await service.get_heatmap_data(
            db=session,
            user_id=test_user.id,
            days=7,
        )

        result_30 = await service.get_heatmap_data(
            db=session,
            user_id=test_user.id,
            days=30,
        )

        assert len(result_7["data"]) == 7
        assert len(result_30["data"]) == 30
        assert result_7["total_days"] == 7
        assert result_30["total_days"] == 30

    async def test_heatmap_data_sorted(self, session, test_user, test_project, test_commits_for_heatmap):
        """Test that heatmap data is sorted by date."""
        service = PersonalStatsService()

        result = await service.get_heatmap_data(
            db=session,
            user_id=test_user.id,
            days=15,
        )

        dates = [item["date"] for item in result["data"]]
        assert dates == sorted(dates)
