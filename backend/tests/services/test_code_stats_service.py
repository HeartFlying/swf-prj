"""Tests for CodeStatsService.

TDD Red Phase: Write tests before implementation.
"""

from datetime import date, datetime, timedelta

import pytest_asyncio

from app.db.models import CodeCommit, Project, User
from app.services.code_stats_service import CodeStatsService


@pytest_asyncio.fixture
async def test_users(session):
    """Create test users."""
    users = []
    for i in range(3):
        user = User(
            username=f"testuser{i+1}",
            email=f"test{i+1}@example.com",
            password_hash="hashed_password",
            department="Engineering",
        )
        session.add(user)
        users.append(user)
    await session.commit()
    for user in users:
        await session.refresh(user)
    return users


@pytest_asyncio.fixture
async def test_project(session):
    """Create a test project."""
    project = Project(
        name="Test Project",
        code="TEST001",
        description="Test project for code stats",
        stage="研发",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


@pytest_asyncio.fixture
async def test_commits(session, test_users, test_project):
    """Create test commits for ranking tests."""
    commits = []
    base_date = date(2024, 1, 15)

    # User 1: 5 commits on different days
    for i in range(5):
        commit = CodeCommit(
            user_id=test_users[0].id,
            project_id=test_project.id,
            commit_hash=f"abc{i}def123456789",
            additions=100,
            deletions=20,
            language="python",
            file_count=3,
            commit_message=f"Commit {i+1} by user1",
            commit_time=datetime.combine(base_date + timedelta(days=i), datetime.min.time()),
            is_ai_generated=False,
        )
        session.add(commit)
        commits.append(commit)

    # User 2: 3 commits on different days
    for i in range(3):
        commit = CodeCommit(
            user_id=test_users[1].id,
            project_id=test_project.id,
            commit_hash=f"def{i}abc123456789",
            additions=50,
            deletions=10,
            language="python",
            file_count=2,
            commit_message=f"Commit {i+1} by user2",
            commit_time=datetime.combine(base_date + timedelta(days=i), datetime.min.time()),
            is_ai_generated=False,
        )
        session.add(commit)
        commits.append(commit)

    # User 3: 1 commit
    commit = CodeCommit(
        user_id=test_users[2].id,
        project_id=test_project.id,
        commit_hash="ghi123abc456789",
        additions=30,
        deletions=5,
        language="python",
        file_count=1,
        commit_message="Commit by user3",
        commit_time=datetime.combine(base_date, datetime.min.time()),
        is_ai_generated=False,
    )
    session.add(commit)
    commits.append(commit)

    await session.commit()
    return commits


class TestGetCommitRanking:
    """Tests for get_commit_ranking method."""

    async def test_returns_correct_ranking(self, session, test_users, test_project, test_commits):
        """Test that ranking is returned in correct order by commit count."""
        service = CodeStatsService()
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 31)

        result = await service.get_commit_ranking(
            db=session,
            project_id=test_project.id,
            start_date=start_date,
            end_date=end_date,
            limit=20,
        )

        assert len(result) == 3
        # Should be ordered by commit_count desc: user1 (5), user2 (3), user3 (1)
        assert result[0]["user_id"] == test_users[0].id
        assert result[0]["username"] == test_users[0].username
        assert result[0]["commit_count"] == 5

        assert result[1]["user_id"] == test_users[1].id
        assert result[1]["username"] == test_users[1].username
        assert result[1]["commit_count"] == 3

        assert result[2]["user_id"] == test_users[2].id
        assert result[2]["username"] == test_users[2].username
        assert result[2]["commit_count"] == 1

    async def test_date_range_filtering(self, session, test_users, test_project, test_commits):
        """Test that date range filters commits correctly."""
        service = CodeStatsService()
        # Only include first 2 days (Jan 15 and 16)
        start_date = date(2024, 1, 15)
        end_date = date(2024, 1, 16)

        result = await service.get_commit_ranking(
            db=session,
            project_id=test_project.id,
            start_date=start_date,
            end_date=end_date,
            limit=20,
        )

        # User 1: 2 commits (Jan 15, 16)
        # User 2: 2 commits (Jan 15, 16)
        # User 3: 1 commit (Jan 15)
        assert len(result) == 3
        assert result[0]["commit_count"] == 2  # user1
        assert result[1]["commit_count"] == 2  # user2
        assert result[2]["commit_count"] == 1  # user3

    async def test_limit_parameter(self, session, test_users, test_project, test_commits):
        """Test that limit parameter restricts result count."""
        service = CodeStatsService()
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 31)

        result = await service.get_commit_ranking(
            db=session,
            project_id=test_project.id,
            start_date=start_date,
            end_date=end_date,
            limit=2,
        )

        assert len(result) == 2
        # Should return top 2 users
        assert result[0]["commit_count"] == 5
        assert result[1]["commit_count"] == 3

    async def test_avg_commits_per_day_calculation(self, session, test_users, test_project, test_commits):
        """Test that avg_commits_per_day is calculated correctly."""
        service = CodeStatsService()
        # 10 days range that includes all commits (Jan 15-24)
        start_date = date(2024, 1, 15)
        end_date = date(2024, 1, 24)
        days = (end_date - start_date).days + 1  # 10 days

        result = await service.get_commit_ranking(
            db=session,
            project_id=test_project.id,
            start_date=start_date,
            end_date=end_date,
            limit=20,
        )

        # User 1: 5 commits / 10 days = 0.5
        assert result[0]["avg_commits_per_day"] == 5.0 / days
        # User 2: 3 commits / 10 days = 0.3
        assert result[1]["avg_commits_per_day"] == 3.0 / days
        # User 3: 1 commit / 10 days = 0.1
        assert result[2]["avg_commits_per_day"] == 1.0 / days

    async def test_empty_result_for_no_commits(self, session, test_project):
        """Test that empty list is returned when no commits match."""
        service = CodeStatsService()
        start_date = date(2024, 2, 1)
        end_date = date(2024, 2, 28)

        result = await service.get_commit_ranking(
            db=session,
            project_id=test_project.id,
            start_date=start_date,
            end_date=end_date,
            limit=20,
        )

        assert result == []

    async def test_project_isolation(self, session, test_users, test_project, test_commits):
        """Test that only commits from specified project are counted."""
        # Create another project
        other_project = Project(
            name="Other Project",
            code="OTHER001",
            description="Another project",
            stage="研发",
            status="active",
        )
        session.add(other_project)
        await session.commit()
        await session.refresh(other_project)

        service = CodeStatsService()
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 31)

        result = await service.get_commit_ranking(
            db=session,
            project_id=other_project.id,
            start_date=start_date,
            end_date=end_date,
            limit=20,
        )

        assert result == []
