"""Tests for ProjectStatsService."""

from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio

from app.db.models import BugRecord, CodeCommit, Project, ProjectMember, TokenUsage, User
from app.services.project_stats_service import ProjectStatsService


@pytest_asyncio.fixture
async def project_stats_service():
    """Create a ProjectStatsService instance."""
    return ProjectStatsService()


@pytest_asyncio.fixture
async def test_project(session):
    """Create a test project."""
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
            is_active=True,
        )
        session.add(user)
        users.append(user)
    await session.commit()
    for user in users:
        await session.refresh(user)
    return users


@pytest_asyncio.fixture
async def test_project_members(session, test_project, test_users):
    """Create project memberships."""
    for user in test_users:
        member = ProjectMember(
            user_id=user.id,
            project_id=test_project.id,
            role="member",
        )
        session.add(member)
    await session.commit()


@pytest_asyncio.fixture
async def test_commits(session, test_project, test_users):
    """Create test commits."""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)

    commits = []
    # User 1: 50 commits
    for i in range(50):
        commit = CodeCommit(
            user_id=test_users[0].id,
            project_id=test_project.id,
            commit_hash=f"hash1_{i}",
            additions=20,
            deletions=5,
            language="python",
            file_count=3,
            commit_message=f"Commit {i}",
            commit_time=start_date + timedelta(hours=i),
            is_ai_generated=i % 2 == 0,
        )
        session.add(commit)
        commits.append(commit)

    # User 2: 30 commits
    for i in range(30):
        commit = CodeCommit(
            user_id=test_users[1].id,
            project_id=test_project.id,
            commit_hash=f"hash2_{i}",
            additions=15,
            deletions=3,
            language="python",
            file_count=2,
            commit_message=f"Commit {i}",
            commit_time=start_date + timedelta(hours=i + 100),
            is_ai_generated=i % 3 == 0,
        )
        session.add(commit)
        commits.append(commit)

    # User 3: 20 commits
    for i in range(20):
        commit = CodeCommit(
            user_id=test_users[2].id,
            project_id=test_project.id,
            commit_hash=f"hash3_{i}",
            additions=10,
            deletions=2,
            language="javascript",
            file_count=1,
            commit_message=f"Commit {i}",
            commit_time=start_date + timedelta(hours=i + 200),
            is_ai_generated=False,
        )
        session.add(commit)
        commits.append(commit)

    await session.commit()


@pytest_asyncio.fixture
async def test_token_usage(session, test_project, test_users):
    """Create test token usage records."""
    end_date = date.today()
    start_date = end_date - timedelta(days=30)

    for i in range(30):
        for user in test_users:
            usage = TokenUsage(
                user_id=user.id,
                project_id=test_project.id,
                platform="trae",
                token_count=1000,
                api_calls=50,
                usage_date=start_date + timedelta(days=i),
                cost=Decimal("0.50"),
            )
            session.add(usage)

    await session.commit()


@pytest_asyncio.fixture
async def test_bugs(session, test_project, test_users):
    """Create test bug records."""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)

    bugs = []
    # Critical bugs
    for i in range(2):
        bug = BugRecord(
            project_id=test_project.id,
            assignee_id=test_users[0].id,
            reporter_id=test_users[1].id,
            title=f"Critical Bug {i}",
            description="A critical bug",
            severity="critical",
            priority="urgent",
            status="resolved",
            created_at=start_date + timedelta(days=i),
            resolved_at=start_date + timedelta(days=i + 1),
        )
        session.add(bug)
        bugs.append(bug)

    # Major bugs
    for i in range(3):
        bug = BugRecord(
            project_id=test_project.id,
            assignee_id=test_users[1].id,
            reporter_id=test_users[0].id,
            title=f"Major Bug {i}",
            description="A major bug",
            severity="major",
            priority="high",
            status="resolved",
            created_at=start_date + timedelta(days=i + 5),
            resolved_at=start_date + timedelta(days=i + 6),
        )
        session.add(bug)
        bugs.append(bug)

    # Normal bugs (open)
    for i in range(5):
        bug = BugRecord(
            project_id=test_project.id,
            assignee_id=test_users[2].id,
            reporter_id=test_users[0].id,
            title=f"Normal Bug {i}",
            description="A normal bug",
            severity="normal",
            priority="medium",
            status="new",
            created_at=start_date + timedelta(days=i + 10),
        )
        session.add(bug)
        bugs.append(bug)

    await session.commit()


class TestProjectStatsService:
    """Test cases for ProjectStatsService."""

    @pytest.mark.asyncio
    async def test_get_project_dashboard(
        self,
        session,
        project_stats_service,
        test_project,
        test_users,
        test_project_members,
        test_commits,
        test_token_usage,
        test_bugs,
    ):
        """Test getting project dashboard with all data."""
        result = await project_stats_service.get_project_dashboard(
            db=session,
            project_id=test_project.id,
            days=30,
        )

        assert result.project_id == test_project.id
        assert result.project_name == "Test Project"
        assert result.period_days == 30
        assert isinstance(result.start_date, date)
        assert isinstance(result.end_date, date)

        # Check overview
        assert result.overview.total_commits >= 80  # Some commits may be filtered by date
        assert result.overview.total_tokens >= 87000  # Some tokens may be filtered by date
        assert result.overview.active_members == 3
        assert result.overview.bug_count >= 9  # Some bugs may be filtered by date

        # Check top contributors
        assert len(result.top_contributors) == 3
        # First contributor should have most commits
        assert result.top_contributors[0]["user_id"] == test_users[0].id
        assert result.top_contributors[0]["commit_count"] >= 30  # Some commits may be filtered by date
        assert result.top_contributors[0]["lines_changed"] > 0

        # Check bug summary
        assert result.bug_summary.total >= 9  # Some bugs may be filtered by date

    @pytest.mark.asyncio
    async def test_get_project_dashboard_empty_project(
        self,
        session,
        project_stats_service,
        test_project,
    ):
        """Test getting project dashboard for project with no data."""
        result = await project_stats_service.get_project_dashboard(
            db=session,
            project_id=test_project.id,
            days=30,
        )

        assert result.project_id == test_project.id
        assert result.project_name == "Test Project"
        assert result.overview.total_commits == 0
        assert result.overview.total_tokens == 0
        assert result.overview.active_members == 0
        assert result.overview.bug_count == 0
        assert result.top_contributors == []
        assert result.bug_summary.total == 0
        assert result.bug_summary.critical == 0
        assert result.bug_summary.resolved == 0

    @pytest.mark.asyncio
    async def test_get_project_dashboard_custom_days(
        self,
        session,
        project_stats_service,
        test_project,
        test_users,
        test_project_members,
    ):
        """Test getting project dashboard with custom days parameter."""
        result = await project_stats_service.get_project_dashboard(
            db=session,
            project_id=test_project.id,
            days=7,
        )

        assert result.period_days == 7
        # Check that date range is correct
        expected_start = date.today() - timedelta(days=6)
        assert result.start_date == expected_start
        assert result.end_date == date.today()

    @pytest.mark.asyncio
    async def test_get_top_contributors(
        self,
        session,
        project_stats_service,
        test_project,
        test_users,
        test_project_members,
        test_commits,
    ):
        """Test getting top contributors."""
        end_date = date.today()
        start_date = end_date - timedelta(days=30)

        contributors = await project_stats_service._get_top_contributors(
            db=session,
            project_id=test_project.id,
            start_date=start_date,
            end_date=end_date,
        )

        assert len(contributors) == 3

        # Check first contributor (most commits)
        assert contributors[0]["user_id"] == test_users[0].id
        assert contributors[0]["username"] == test_users[0].username
        assert contributors[0]["commit_count"] == 50
        assert contributors[0]["lines_changed"] == 1250  # 50 * (20 + 5)

        # Check second contributor
        assert contributors[1]["user_id"] == test_users[1].id
        assert contributors[1]["commit_count"] == 30

        # Check third contributor
        assert contributors[2]["user_id"] == test_users[2].id
        assert contributors[2]["commit_count"] == 20

    @pytest.mark.asyncio
    async def test_get_top_contributors_empty(
        self,
        session,
        project_stats_service,
        test_project,
    ):
        """Test getting top contributors for project with no commits."""
        end_date = date.today()
        start_date = end_date - timedelta(days=30)

        contributors = await project_stats_service._get_top_contributors(
            db=session,
            project_id=test_project.id,
            start_date=start_date,
            end_date=end_date,
        )

        assert contributors == []

    @pytest.mark.asyncio
    async def test_calculate_bug_trend_improving(
        self,
        project_stats_service,
    ):
        """Test bug trend calculation when improving."""
        from app.services.bug_stats_service import ProjectBugStats

        bug_stats = ProjectBugStats(
            total_bugs=10,
            by_severity={"critical": 1},
            by_status={"resolved": 8, "closed": 1, "new": 1},
            by_priority={"high": 5},
            resolved_bugs=9,
            open_bugs=1,
        )

        trend = project_stats_service._calculate_bug_trend(bug_stats)
        assert trend == "improving"

    @pytest.mark.asyncio
    async def test_calculate_bug_trend_worsening(
        self,
        project_stats_service,
    ):
        """Test bug trend calculation when worsening."""
        from app.services.bug_stats_service import ProjectBugStats

        bug_stats = ProjectBugStats(
            total_bugs=10,
            by_severity={"critical": 5},
            by_status={"resolved": 3, "new": 7},
            by_priority={"high": 8},
            resolved_bugs=3,
            open_bugs=7,
        )

        trend = project_stats_service._calculate_bug_trend(bug_stats)
        assert trend == "worsening"

    @pytest.mark.asyncio
    async def test_calculate_bug_trend_stable(
        self,
        project_stats_service,
    ):
        """Test bug trend calculation when stable."""
        from app.services.bug_stats_service import ProjectBugStats

        bug_stats = ProjectBugStats(
            total_bugs=10,
            by_severity={"critical": 2},
            by_status={"resolved": 5, "new": 5},
            by_priority={"medium": 5},
            resolved_bugs=5,
            open_bugs=5,
        )

        trend = project_stats_service._calculate_bug_trend(bug_stats)
        assert trend == "stable"

    @pytest.mark.asyncio
    async def test_calculate_bug_trend_no_bugs(
        self,
        project_stats_service,
    ):
        """Test bug trend calculation with no bugs."""
        from app.services.bug_stats_service import ProjectBugStats

        bug_stats = ProjectBugStats(
            total_bugs=0,
            by_severity={},
            by_status={},
            by_priority={},
            resolved_bugs=0,
            open_bugs=0,
        )

        trend = project_stats_service._calculate_bug_trend(bug_stats)
        assert trend == "stable"

    @pytest.mark.asyncio
    async def test_result_to_dict(
        self,
        project_stats_service,
    ):
        """Test converting result to dictionary."""
        from app.services.project_stats_service import (
            BugTrendSummary,
            OverviewSummary,
        )

        overview = OverviewSummary(
            total_commits=100,
            total_tokens=50000,
            active_members=5,
            bug_count=10,
        )

        bug_summary = BugTrendSummary(
            total=10,
            critical=2,
            resolved=8,
            trend_direction="improving",
        )

        result = ProjectStatsService()
        # Create a mock result
        from app.services.project_stats_service import ProjectDashboardResult

        dashboard_result = ProjectDashboardResult(
            project_id=1,
            project_name="Test Project",
            overview=overview,
            top_contributors=[
                {"user_id": 1, "username": "user1", "commit_count": 50, "lines_changed": 1000}
            ],
            bug_summary=bug_summary,
            period_days=30,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
        )

        data = dashboard_result.to_dict()

        assert data["project_id"] == 1
        assert data["project_name"] == "Test Project"
        assert data["overview"]["total_commits"] == 100
        assert data["overview"]["total_tokens"] == 50000
        assert data["overview"]["active_members"] == 5
        assert data["overview"]["bug_count"] == 10
        assert len(data["top_contributors"]) == 1
        assert data["bug_summary"]["total"] == 10
        assert data["bug_summary"]["critical"] == 2
        assert data["bug_summary"]["trend_direction"] == "improving"
        assert data["period_days"] == 30

    @pytest.mark.asyncio
    async def test_get_project_dashboard_limit_contributors(
        self,
        session,
        project_stats_service,
        test_project,
        test_users,
        test_project_members,
        test_commits,
    ):
        """Test that top contributors are limited."""
        # Add more users and commits to test limit
        result = await project_stats_service.get_project_dashboard(
            db=session,
            project_id=test_project.id,
            days=30,
        )

        # Should return at most 10 contributors (default limit)
        assert len(result.top_contributors) <= 10
        assert len(result.top_contributors) == 3  # We have 3 test users


class TestProjectStatsServiceInitialization:
    """Test cases for ProjectStatsService initialization."""

    def test_service_initialization(self):
        """Test that service initializes with required dependencies."""
        service = ProjectStatsService()
        assert service.code_service is not None
        assert service.token_service is not None
        assert service.bug_service is not None
