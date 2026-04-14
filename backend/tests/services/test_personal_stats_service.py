"""Tests for PersonalStatsService.

TDD Red Phase: Write tests before implementation.
"""

from datetime import date, datetime, timedelta

import pytest_asyncio

from app.db.models import BugRecord, CodeCommit, Project, TokenUsage, User
from app.services.personal_stats_service import PersonalStatsService


@pytest_asyncio.fixture
async def test_user(session):
    """Create a test user."""
    user = User(
        username="testuser",
        email="test@example.com",
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
        name="Test Project",
        code="TEST001",
        description="Test project for personal stats",
        stage="研发",
        status="active",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


@pytest_asyncio.fixture
async def test_code_commits(session, test_user, test_project):
    """Create test code commits."""
    base_date = date.today() - timedelta(days=5)
    commits = []

    for i in range(5):
        commit = CodeCommit(
            user_id=test_user.id,
            project_id=test_project.id,
            commit_hash=f"abc{i}def123456789",
            additions=100,
            deletions=20,
            language="python",
            file_count=3,
            commit_message=f"Commit {i+1}",
            commit_time=datetime.combine(base_date + timedelta(days=i), datetime.min.time()),
            is_ai_generated=False,
        )
        session.add(commit)
        commits.append(commit)

    await session.commit()
    return commits


@pytest_asyncio.fixture
async def test_token_usage(session, test_user, test_project):
    """Create test token usage records."""
    base_date = date.today() - timedelta(days=5)
    records = []

    for i in range(5):
        record = TokenUsage(
            user_id=test_user.id,
            project_id=test_project.id,
            platform="trae",
            token_count=1000,
            api_calls=10,
            usage_date=base_date + timedelta(days=i),
            model="gpt-4",
            cost=0.5,
        )
        session.add(record)
        records.append(record)

    await session.commit()
    return records


@pytest_asyncio.fixture
async def test_bugs(session, test_user, test_project):
    """Create test bug records."""
    base_date = date.today() - timedelta(days=5)
    bugs = []

    # Create 3 normal bugs
    for i in range(3):
        bug = BugRecord(
            project_id=test_project.id,
            assignee_id=test_user.id,
            reporter_id=test_user.id,
            zendao_bug_id=1000 + i,
            title=f"Bug {i+1}",
            description=f"Description for bug {i+1}",
            severity="normal",
            priority="medium",
            status="resolved" if i < 2 else "new",
            type="bug",
            created_at=datetime.combine(base_date + timedelta(days=i), datetime.min.time()),
            resolved_at=datetime.combine(base_date + timedelta(days=i), datetime.min.time()) if i < 2 else None,
        )
        session.add(bug)
        bugs.append(bug)

    # Create 1 critical bug
    critical_bug = BugRecord(
        project_id=test_project.id,
        assignee_id=test_user.id,
        reporter_id=test_user.id,
        zendao_bug_id=1003,
        title="Critical Bug",
        description="Critical bug description",
        severity="critical",
        priority="urgent",
        status="resolved",
        type="bug",
        created_at=datetime.combine(base_date, datetime.min.time()),
        resolved_at=datetime.combine(base_date + timedelta(days=1), datetime.min.time()),
    )
    session.add(critical_bug)
    bugs.append(critical_bug)

    await session.commit()
    return bugs


class TestGetPersonalDashboard:
    """Tests for get_personal_dashboard method."""

    async def test_returns_correct_structure(self, session, test_user):
        """Test that result has correct structure."""
        service = PersonalStatsService()

        result = await service.get_personal_dashboard(
            db=session,
            user_id=test_user.id,
            days=30,
        )

        assert result.user_id == test_user.id
        assert result.username == test_user.username
        assert result.period_days == 30
        assert isinstance(result.start_date, date)
        assert isinstance(result.end_date, date)

    async def test_code_summary_with_commits(self, session, test_user, test_project, test_code_commits):
        """Test code summary calculation with commits."""
        service = PersonalStatsService()

        result = await service.get_personal_dashboard(
            db=session,
            user_id=test_user.id,
            days=30,
        )

        assert result.code_summary.total_commits == 5
        assert result.code_summary.lines_added == 500  # 5 commits * 100 additions
        assert result.code_summary.lines_deleted == 100  # 5 commits * 20 deletions
        assert result.code_summary.avg_commits_per_day == round(5 / 30, 2)

    async def test_code_summary_without_commits(self, session, test_user):
        """Test code summary calculation without commits."""
        service = PersonalStatsService()

        result = await service.get_personal_dashboard(
            db=session,
            user_id=test_user.id,
            days=30,
        )

        assert result.code_summary.total_commits == 0
        assert result.code_summary.lines_added == 0
        assert result.code_summary.lines_deleted == 0
        assert result.code_summary.avg_commits_per_day == 0.0

    async def test_token_summary_with_usage(self, session, test_user, test_project, test_token_usage):
        """Test token summary calculation with usage records."""
        service = PersonalStatsService()

        result = await service.get_personal_dashboard(
            db=session,
            user_id=test_user.id,
            days=30,
        )

        assert result.token_summary.total_tokens == 5000  # 5 records * 1000 tokens
        assert result.token_summary.avg_per_day == round(5000 / 30, 2)

    async def test_token_summary_without_usage(self, session, test_user):
        """Test token summary calculation without usage records."""
        service = PersonalStatsService()

        result = await service.get_personal_dashboard(
            db=session,
            user_id=test_user.id,
            days=30,
        )

        assert result.token_summary.total_tokens == 0
        assert result.token_summary.avg_per_day == 0.0

    async def test_bug_summary_with_bugs(self, session, test_user, test_project, test_bugs):
        """Test bug summary calculation with bugs."""
        service = PersonalStatsService()

        result = await service.get_personal_dashboard(
            db=session,
            user_id=test_user.id,
            days=30,
        )

        assert result.bug_summary.total_bugs == 4  # 3 normal + 1 critical
        assert result.bug_summary.critical_bugs == 1
        assert result.bug_summary.resolved_bugs == 3  # 2 normal + 1 critical

    async def test_bug_summary_without_bugs(self, session, test_user):
        """Test bug summary calculation without bugs."""
        service = PersonalStatsService()

        result = await service.get_personal_dashboard(
            db=session,
            user_id=test_user.id,
            days=30,
        )

        assert result.bug_summary.total_bugs == 0
        assert result.bug_summary.critical_bugs == 0
        assert result.bug_summary.resolved_bugs == 0
        assert result.bug_summary.bug_rate == 0.0

    async def test_bug_rate_calculation(self, session, test_user, test_project, test_code_commits, test_bugs):
        """Test bug rate calculation (bugs per commit)."""
        service = PersonalStatsService()

        result = await service.get_personal_dashboard(
            db=session,
            user_id=test_user.id,
            days=30,
        )

        # 4 bugs / 5 commits = 0.8
        expected_bug_rate = round(4 / 5, 4)
        assert result.bug_summary.bug_rate == expected_bug_rate

    async def test_date_range_calculation(self, session, test_user):
        """Test that date range is calculated correctly."""
        service = PersonalStatsService()
        days = 7

        result = await service.get_personal_dashboard(
            db=session,
            user_id=test_user.id,
            days=days,
        )

        expected_end = date.today()
        expected_start = expected_end - timedelta(days=days - 1)

        assert result.period_days == days
        assert result.end_date == expected_end
        assert result.start_date == expected_start

    async def test_to_dict_method(self, session, test_user):
        """Test that to_dict method returns correct structure."""
        service = PersonalStatsService()

        result = await service.get_personal_dashboard(
            db=session,
            user_id=test_user.id,
            days=30,
        )

        result_dict = result.to_dict()

        assert result_dict["user_id"] == test_user.id
        assert result_dict["username"] == test_user.username
        assert "code_summary" in result_dict
        assert "token_summary" in result_dict
        assert "bug_summary" in result_dict
        assert result_dict["period_days"] == 30
        assert "start_date" in result_dict
        assert "end_date" in result_dict

        # Check nested structures
        assert "total_commits" in result_dict["code_summary"]
        assert "lines_added" in result_dict["code_summary"]
        assert "lines_deleted" in result_dict["code_summary"]
        assert "avg_commits_per_day" in result_dict["code_summary"]

        assert "total_tokens" in result_dict["token_summary"]
        assert "prompt_tokens" in result_dict["token_summary"]
        assert "completion_tokens" in result_dict["token_summary"]
        assert "avg_per_day" in result_dict["token_summary"]

        assert "total_bugs" in result_dict["bug_summary"]
        assert "critical_bugs" in result_dict["bug_summary"]
        assert "bug_rate" in result_dict["bug_summary"]
        assert "resolved_bugs" in result_dict["bug_summary"]

    async def test_different_days_parameter(self, session, test_user, test_code_commits):
        """Test that different days parameter works correctly."""
        service = PersonalStatsService()

        result_7 = await service.get_personal_dashboard(
            db=session,
            user_id=test_user.id,
            days=7,
        )

        result_30 = await service.get_personal_dashboard(
            db=session,
            user_id=test_user.id,
            days=30,
        )

        # Both should have the same commits since test commits are recent
        assert result_7.code_summary.total_commits == 5
        assert result_30.code_summary.total_commits == 5

        # But avg_commits_per_day should differ
        assert result_7.code_summary.avg_commits_per_day == round(5 / 7, 2)
        assert result_30.code_summary.avg_commits_per_day == round(5 / 30, 2)

    async def test_nonexistent_user(self, session):
        """Test behavior with non-existent user."""
        service = PersonalStatsService()

        result = await service.get_personal_dashboard(
            db=session,
            user_id=99999,  # Non-existent user
            days=30,
        )

        assert result.user_id == 99999
        assert result.username == ""  # Empty username for non-existent user
        assert result.code_summary.total_commits == 0
        assert result.token_summary.total_tokens == 0
        assert result.bug_summary.total_bugs == 0
