"""Extended tests for database models.

Tests for all core models: UserAccount, CodeCommit, TokenUsage, BugRecord,
AISuggestion, DataSource, SyncTask, StatsSnapshot.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError


class TestUserAccountModel:
    """Test cases for UserAccount model."""

    @pytest.mark.asyncio
    async def test_create_user_account(self, session):
        """Test creating a user account."""
        from app.db.models import User, UserAccount

        # Create user first
        user = User(
            username="testuser_account",
            email="test_account@example.com",
            password_hash="hashed_password",
            department="研发一部",
        )
        session.add(user)
        await session.commit()

        # Create user account
        account = UserAccount(
            user_id=user.id,
            platform="gitlab",
            account_id="gitlab_user_123",
            account_name="Test User",
            api_token_encrypted=b"encrypted_token_data",
            is_default=True,
        )
        session.add(account)
        await session.commit()

        # Verify account was created
        result = await session.execute(
            select(UserAccount).where(UserAccount.account_id == "gitlab_user_123")
        )
        saved_account = result.scalar_one()

        assert saved_account.id is not None
        assert saved_account.platform == "gitlab"
        assert saved_account.account_id == "gitlab_user_123"
        assert saved_account.account_name == "Test User"
        assert saved_account.api_token_encrypted == b"encrypted_token_data"
        assert saved_account.is_default is True
        assert saved_account.created_at is not None

    @pytest.mark.asyncio
    async def test_user_account_unique_constraint(self, session):
        """Test user account unique constraint (user_id + platform)."""
        from app.db.models import User, UserAccount

        user = User(
            username="unique_account_user",
            email="unique_account@example.com",
            password_hash="hash",
            department="研发一部",
        )
        session.add(user)
        await session.commit()

        # Create first account
        account1 = UserAccount(
            user_id=user.id,
            platform="gitlab",
            account_id="account1",
        )
        session.add(account1)
        await session.commit()

        # Try to create another account with same user and platform
        account2 = UserAccount(
            user_id=user.id,
            platform="gitlab",
            account_id="account2",
        )
        session.add(account2)

        with pytest.raises(IntegrityError):
            await session.commit()

    @pytest.mark.asyncio
    async def test_user_account_relationship(self, session):
        """Test user account relationship with user."""
        from app.db.models import User, UserAccount

        user = User(
            username="relation_user",
            email="relation@example.com",
            password_hash="hash",
            department="研发一部",
        )
        session.add(user)
        await session.commit()

        account = UserAccount(
            user_id=user.id,
            platform="trae",
            account_id="trae_user",
        )
        session.add(account)
        await session.commit()

        # Test relationship
        result = await session.execute(
            select(UserAccount).where(UserAccount.user_id == user.id)
        )
        saved_account = result.scalar_one()
        assert saved_account.user.id == user.id
        assert saved_account.user.username == "relation_user"


class TestCodeCommitModel:
    """Test cases for CodeCommit model."""

    @pytest.mark.asyncio
    async def test_create_code_commit(self, session):
        """Test creating a code commit record."""
        from app.db.models import CodeCommit, Project, User

        # Create user and project
        user = User(
            username="commit_user",
            email="commit@example.com",
            password_hash="hash",
            department="研发一部",
        )
        project = Project(
            name="Test Project",
            code="TEST001",
            stage="研发",
            status="active",
        )
        session.add_all([user, project])
        await session.commit()

        # Create commit
        commit = CodeCommit(
            user_id=user.id,
            project_id=project.id,
            commit_hash="abc123def456789",
            additions=150,
            deletions=30,
            language="python",
            file_count=5,
            commit_message="Add new feature",
            commit_time=datetime.now(),
            is_ai_generated=True,
            branch_name="feature/new-feature",
        )
        session.add(commit)
        await session.commit()

        # Verify commit was created
        result = await session.execute(
            select(CodeCommit).where(CodeCommit.commit_hash == "abc123def456789")
        )
        saved_commit = result.scalar_one()

        assert saved_commit.id is not None
        assert saved_commit.additions == 150
        assert saved_commit.deletions == 30
        assert saved_commit.language == "python"
        assert saved_commit.is_ai_generated is True

    @pytest.mark.asyncio
    async def test_code_commit_unique_constraint(self, session):
        """Test code commit unique constraint (commit_hash + project_id)."""
        from app.db.models import CodeCommit, Project, User

        user = User(
            username="commit_unique_user",
            email="commit_unique@example.com",
            password_hash="hash",
            department="研发一部",
        )
        project = Project(
            name="Unique Project",
            code="UNIQUE001",
            stage="研发",
            status="active",
        )
        session.add_all([user, project])
        await session.commit()

        # Create first commit
        commit1 = CodeCommit(
            user_id=user.id,
            project_id=project.id,
            commit_hash="unique_hash_123",
            language="python",
            commit_time=datetime.now(),
        )
        session.add(commit1)
        await session.commit()

        # Try to create another commit with same hash and project
        commit2 = CodeCommit(
            user_id=user.id,
            project_id=project.id,
            commit_hash="unique_hash_123",
            language="javascript",
            commit_time=datetime.now() + timedelta(hours=1),
        )
        session.add(commit2)

        with pytest.raises(IntegrityError):
            await session.commit()

    @pytest.mark.asyncio
    async def test_code_commit_relationships(self, session):
        """Test code commit relationships."""
        from app.db.models import CodeCommit, Project, User

        user = User(
            username="commit_rel_user",
            email="commit_rel@example.com",
            password_hash="hash",
            department="研发一部",
        )
        project = Project(
            name="Rel Project",
            code="REL001",
            stage="研发",
            status="active",
        )
        session.add_all([user, project])
        await session.commit()

        commit = CodeCommit(
            user_id=user.id,
            project_id=project.id,
            commit_hash="rel_hash_123",
            language="python",
            commit_time=datetime.now(),
        )
        session.add(commit)
        await session.commit()

        # Test relationships
        result = await session.execute(
            select(CodeCommit).where(CodeCommit.commit_hash == "rel_hash_123")
        )
        saved_commit = result.scalar_one()
        assert saved_commit.user.id == user.id
        assert saved_commit.project.id == project.id


class TestTokenUsageModel:
    """Test cases for TokenUsage model."""

    @pytest.mark.asyncio
    async def test_create_token_usage(self, session):
        """Test creating a token usage record."""
        from app.db.models import Project, TokenUsage, User

        user = User(
            username="token_user",
            email="token@example.com",
            password_hash="hash",
            department="研发一部",
        )
        project = Project(
            name="Token Project",
            code="TOKEN001",
            stage="研发",
            status="active",
        )
        session.add_all([user, project])
        await session.commit()

        usage = TokenUsage(
            user_id=user.id,
            project_id=project.id,
            platform="trae",
            token_count=50000,
            api_calls=100,
            usage_date=date.today(),
            model="claude-3-sonnet",
            cost=Decimal("0.50"),
        )
        session.add(usage)
        await session.commit()

        # Verify
        result = await session.execute(
            select(TokenUsage).where(TokenUsage.user_id == user.id)
        )
        saved_usage = result.scalar_one()

        assert saved_usage.id is not None
        assert saved_usage.token_count == 50000
        assert saved_usage.api_calls == 100
        assert saved_usage.platform == "trae"
        assert saved_usage.cost == Decimal("0.50")

    @pytest.mark.asyncio
    async def test_token_usage_unique_constraint(self, session):
        """Test token usage unique constraint (user_id + platform + usage_date)."""
        from app.db.models import TokenUsage, User

        user = User(
            username="token_unique_user",
            email="token_unique@example.com",
            password_hash="hash",
            department="研发一部",
        )
        session.add(user)
        await session.commit()

        today = date.today()

        # Create first record
        usage1 = TokenUsage(
            user_id=user.id,
            platform="trae",
            usage_date=today,
            token_count=1000,
        )
        session.add(usage1)
        await session.commit()

        # Try to create another record with same user, platform, and date
        usage2 = TokenUsage(
            user_id=user.id,
            platform="trae",
            usage_date=today,
            token_count=2000,
        )
        session.add(usage2)

        with pytest.raises(IntegrityError):
            await session.commit()


class TestBugRecordModel:
    """Test cases for BugRecord model."""

    @pytest.mark.asyncio
    async def test_create_bug_record(self, session):
        """Test creating a bug record."""
        from app.db.models import BugRecord, Project, User

        user = User(
            username="bug_user",
            email="bug@example.com",
            password_hash="hash",
            department="研发一部",
        )
        project = Project(
            name="Bug Project",
            code="BUG001",
            stage="研发",
            status="active",
        )
        session.add_all([user, project])
        await session.commit()

        bug = BugRecord(
            project_id=project.id,
            assignee_id=user.id,
            reporter_id=user.id,
            zendao_bug_id=1001,
            title="Test Bug Title",
            description="This is a test bug description",
            severity="critical",
            priority="urgent",
            status="new",
            type="bug",
            module="用户模块",
        )
        session.add(bug)
        await session.commit()

        # Verify
        result = await session.execute(
            select(BugRecord).where(BugRecord.zendao_bug_id == 1001)
        )
        saved_bug = result.scalar_one()

        assert saved_bug.id is not None
        assert saved_bug.title == "Test Bug Title"
        assert saved_bug.severity == "critical"
        assert saved_bug.priority == "urgent"
        assert saved_bug.status == "new"

    @pytest.mark.asyncio
    async def test_bug_record_unique_zendao_id(self, session):
        """Test bug record unique constraint on zendao_bug_id."""
        from app.db.models import BugRecord, Project

        project = Project(
            name="Bug Unique Project",
            code="BUGU001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()

        # Create first bug
        bug1 = BugRecord(
            project_id=project.id,
            zendao_bug_id=2001,
            title="Bug 1",
            severity="major",
        )
        session.add(bug1)
        await session.commit()

        # Try to create another bug with same zendao_bug_id
        bug2 = BugRecord(
            project_id=project.id,
            zendao_bug_id=2001,
            title="Bug 2",
            severity="minor",
        )
        session.add(bug2)

        with pytest.raises(IntegrityError):
            await session.commit()

    @pytest.mark.asyncio
    async def test_bug_record_relationships(self, session):
        """Test bug record relationships."""
        from app.db.models import BugRecord, Project, User

        assignee = User(
            username="bug_assignee",
            email="assignee@example.com",
            password_hash="hash",
            department="研发一部",
        )
        reporter = User(
            username="bug_reporter",
            email="reporter@example.com",
            password_hash="hash",
            department="测试部",
        )
        project = Project(
            name="Bug Rel Project",
            code="BUGR001",
            stage="研发",
            status="active",
        )
        session.add_all([assignee, reporter, project])
        await session.commit()

        bug = BugRecord(
            project_id=project.id,
            assignee_id=assignee.id,
            reporter_id=reporter.id,
            title="Bug with relations",
            severity="normal",
        )
        session.add(bug)
        await session.commit()

        # Test relationships
        result = await session.execute(
            select(BugRecord).where(BugRecord.title == "Bug with relations")
        )
        saved_bug = result.scalar_one()
        assert saved_bug.assignee.id == assignee.id
        assert saved_bug.reporter.id == reporter.id
        assert saved_bug.project.id == project.id


class TestAISuggestionModel:
    """Test cases for AISuggestion model."""

    @pytest.mark.asyncio
    async def test_create_ai_suggestion(self, session):
        """Test creating an AI suggestion record."""
        from app.db.models import AISuggestion, Project, User

        user = User(
            username="ai_user",
            email="ai@example.com",
            password_hash="hash",
            department="研发一部",
        )
        project = Project(
            name="AI Project",
            code="AI001",
            stage="研发",
            status="active",
        )
        session.add_all([user, project])
        await session.commit()

        suggestion = AISuggestion(
            user_id=user.id,
            project_id=project.id,
            platform="trae",
            suggestion_type="code_completion",
            content="建议使用列表推导式优化循环",
            language="python",
            file_path="app/services/stats.py",
            line_number=42,
            token_cost=150,
            is_accepted=True,
            accepted_at=datetime.now(),
        )
        session.add(suggestion)
        await session.commit()

        # Verify
        result = await session.execute(
            select(AISuggestion).where(AISuggestion.user_id == user.id)
        )
        saved_suggestion = result.scalar_one()

        assert saved_suggestion.id is not None
        assert saved_suggestion.suggestion_type == "code_completion"
        assert saved_suggestion.is_accepted is True
        assert saved_suggestion.content == "建议使用列表推导式优化循环"

    @pytest.mark.asyncio
    async def test_ai_suggestion_relationships(self, session):
        """Test AI suggestion relationships."""
        from app.db.models import AISuggestion, Project, User

        user = User(
            username="ai_rel_user",
            email="ai_rel@example.com",
            password_hash="hash",
            department="研发一部",
        )
        project = Project(
            name="AI Rel Project",
            code="AIR001",
            stage="研发",
            status="active",
        )
        session.add_all([user, project])
        await session.commit()

        suggestion = AISuggestion(
            user_id=user.id,
            project_id=project.id,
            platform="trae",
            suggestion_type="refactoring",
            content="提取重复代码",
            is_accepted=False,
        )
        session.add(suggestion)
        await session.commit()

        # Test relationships
        result = await session.execute(
            select(AISuggestion).where(AISuggestion.user_id == user.id)
        )
        saved_suggestion = result.scalar_one()
        assert saved_suggestion.user.id == user.id
        assert saved_suggestion.project.id == project.id


class TestDataSourceModel:
    """Test cases for DataSource model."""

    @pytest.mark.asyncio
    async def test_create_data_source(self, session):
        """Test creating a data source."""
        from app.db.models import DataSource, Project

        project = Project(
            name="DS Project",
            code="DS001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()

        source = DataSource(
            project_id=project.id,
            source_type="gitlab",
            source_name="Project GitLab",
            config={"repo_id": 101, "url": "https://gitlab.example.com/repo"},
            is_active=True,
            sync_frequency="daily",
            last_sync_at=datetime.now(),
        )
        session.add(source)
        await session.commit()

        # Verify
        result = await session.execute(
            select(DataSource).where(DataSource.source_name == "Project GitLab")
        )
        saved_source = result.scalar_one()

        assert saved_source.id is not None
        assert saved_source.source_type == "gitlab"
        assert saved_source.config["repo_id"] == 101
        assert saved_source.is_active is True

    @pytest.mark.asyncio
    async def test_data_source_relationship(self, session):
        """Test data source relationship with project."""
        from app.db.models import DataSource, Project

        project = Project(
            name="DS Rel Project",
            code="DSR001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()

        source = DataSource(
            project_id=project.id,
            source_type="zendao",
            source_name="Project ZenDao",
            config={"project_id": 201},
        )
        session.add(source)
        await session.commit()

        # Test relationship
        result = await session.execute(
            select(DataSource).where(DataSource.project_id == project.id)
        )
        saved_source = result.scalar_one()
        assert saved_source.project.id == project.id


class TestSyncTaskModel:
    """Test cases for SyncTask model."""

    @pytest.mark.asyncio
    async def test_create_sync_task(self, session):
        """Test creating a sync task."""
        from app.db.models import Project, SyncTask

        project = Project(
            name="Sync Project",
            code="SYNC001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()

        task = SyncTask(
            task_type="full_sync",
            source_type="gitlab",
            project_id=project.id,
            status="pending",
            created_by="admin",
        )
        session.add(task)
        await session.commit()

        # Verify
        result = await session.execute(
            select(SyncTask).where(SyncTask.project_id == project.id)
        )
        saved_task = result.scalar_one()

        assert saved_task.id is not None
        assert saved_task.task_type == "full_sync"
        assert saved_task.status == "pending"
        assert saved_task.records_processed == 0

    @pytest.mark.asyncio
    async def test_sync_task_status_update(self, session):
        """Test updating sync task status."""
        from app.db.models import SyncTask

        task = SyncTask(
            task_type="incremental_sync",
            source_type="zendao",
            status="running",
            started_at=datetime.now(),
        )
        session.add(task)
        await session.commit()

        # Update task
        task.status = "completed"
        task.completed_at = datetime.now()
        task.records_processed = 100
        await session.commit()

        # Verify
        result = await session.execute(
            select(SyncTask).where(SyncTask.task_type == "incremental_sync")
        )
        saved_task = result.scalar_one()
        assert saved_task.status == "completed"
        assert saved_task.records_processed == 100


class TestStatsSnapshotModel:
    """Test cases for StatsSnapshot model."""

    @pytest.mark.asyncio
    async def test_create_stats_snapshot(self, session):
        """Test creating a stats snapshot."""
        from app.db.models import Project, StatsSnapshot, User

        user = User(
            username="snapshot_user",
            email="snapshot@example.com",
            password_hash="hash",
            department="研发一部",
        )
        project = Project(
            name="Snapshot Project",
            code="SNAP001",
            stage="研发",
            status="active",
        )
        session.add_all([user, project])
        await session.commit()

        snapshot = StatsSnapshot(
            snapshot_type="personal",
            snapshot_date=date.today(),
            project_id=project.id,
            user_id=user.id,
            metrics={
                "total_commits": 50,
                "ai_adoption_rate": 0.75,
                "total_tokens": 100000,
            },
        )
        session.add(snapshot)
        await session.commit()

        # Verify
        result = await session.execute(
            select(StatsSnapshot).where(StatsSnapshot.user_id == user.id)
        )
        saved_snapshot = result.scalar_one()

        assert saved_snapshot.id is not None
        assert saved_snapshot.snapshot_type == "personal"
        assert saved_snapshot.metrics["total_commits"] == 50
        assert saved_snapshot.metrics["ai_adoption_rate"] == 0.75

    @pytest.mark.asyncio
    async def test_stats_snapshot_unique_constraint(self, session):
        """Test stats snapshot unique constraint.

        Note: SQLite handles NULL values in unique constraints differently than PostgreSQL.
        This test verifies the constraint is defined correctly.
        """
        from app.db.models import Project, StatsSnapshot, User

        today = date.today()

        # Create user and project for unique constraint test
        user = User(
            username="snapshot_unique_user",
            email="snapshot_unique@example.com",
            password_hash="hash",
            department="研发一部",
        )
        project = Project(
            name="Snapshot Unique Project",
            code="SNAPU001",
            stage="研发",
            status="active",
        )
        session.add_all([user, project])
        await session.commit()

        # Create first snapshot with all fields
        snapshot1 = StatsSnapshot(
            snapshot_type="personal",
            snapshot_date=today,
            project_id=project.id,
            user_id=user.id,
            metrics={"total_commits": 10},
        )
        session.add(snapshot1)
        await session.commit()

        # Try to create another snapshot with same type, date, project, user
        snapshot2 = StatsSnapshot(
            snapshot_type="personal",
            snapshot_date=today,
            project_id=project.id,
            user_id=user.id,
            metrics={"total_commits": 20},
        )
        session.add(snapshot2)

        with pytest.raises(IntegrityError):
            await session.commit()

    @pytest.mark.asyncio
    async def test_global_stats_snapshot(self, session):
        """Test creating a global stats snapshot without project/user."""
        from app.db.models import StatsSnapshot

        snapshot = StatsSnapshot(
            snapshot_type="global",
            snapshot_date=date.today(),
            metrics={
                "total_users": 100,
                "total_projects": 20,
                "total_commits": 5000,
            },
        )
        session.add(snapshot)
        await session.commit()

        # Verify
        result = await session.execute(
            select(StatsSnapshot).where(StatsSnapshot.snapshot_type == "global")
        )
        saved_snapshot = result.scalar_one()
        assert saved_snapshot.project_id is None
        assert saved_snapshot.user_id is None
        assert saved_snapshot.metrics["total_users"] == 100


class TestModelIntegration:
    """Integration tests for model relationships."""

    @pytest.mark.asyncio
    async def test_user_with_all_relations(self, session):
        """Test user with all related records."""
        from sqlalchemy import select, func

        from app.db.models import (
            AISuggestion,
            BugRecord,
            CodeCommit,
            Project,
            TokenUsage,
            User,
            UserAccount,
        )

        # Create user
        user = User(
            username="full_user",
            email="full@example.com",
            password_hash="hash",
            department="研发一部",
        )
        session.add(user)

        # Create project
        project = Project(
            name="Full Project",
            code="FULL001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()

        # Create related records
        account = UserAccount(
            user_id=user.id,
            platform="gitlab",
            account_id="gitlab_full",
        )
        commit = CodeCommit(
            user_id=user.id,
            project_id=project.id,
            commit_hash="full_commit_123",
            language="python",
            commit_time=datetime.now(),
        )
        token = TokenUsage(
            user_id=user.id,
            platform="trae",
            usage_date=date.today(),
            token_count=1000,
        )
        bug = BugRecord(
            project_id=project.id,
            assignee_id=user.id,
            title="Full Bug",
            severity="normal",
        )
        suggestion = AISuggestion(
            user_id=user.id,
            platform="trae",
            suggestion_type="code_completion",
            content="Test suggestion",
        )

        session.add_all([account, commit, token, bug, suggestion])
        await session.commit()

        # Verify all relations using explicit queries (avoid lazy loading issues)
        account_count = await session.scalar(
            select(func.count()).select_from(UserAccount).where(UserAccount.user_id == user.id)
        )
        commit_count = await session.scalar(
            select(func.count()).select_from(CodeCommit).where(CodeCommit.user_id == user.id)
        )
        token_count = await session.scalar(
            select(func.count()).select_from(TokenUsage).where(TokenUsage.user_id == user.id)
        )
        bug_count = await session.scalar(
            select(func.count()).select_from(BugRecord).where(BugRecord.assignee_id == user.id)
        )
        suggestion_count = await session.scalar(
            select(func.count()).select_from(AISuggestion).where(AISuggestion.user_id == user.id)
        )

        assert account_count == 1
        assert commit_count == 1
        assert token_count == 1
        assert bug_count == 1
        assert suggestion_count == 1

    @pytest.mark.asyncio
    async def test_project_with_all_relations(self, session):
        """Test project with all related records."""
        from sqlalchemy import func, select

        from app.db.models import (
            AISuggestion,
            BugRecord,
            CodeCommit,
            DataSource,
            Project,
            ProjectMember,
            TokenUsage,
            User,
        )

        # Create project and user
        project = Project(
            name="Rel Project",
            code="REL002",
            stage="研发",
            status="active",
        )
        user = User(
            username="rel_user2",
            email="rel2@example.com",
            password_hash="hash",
            department="研发一部",
        )
        session.add_all([project, user])
        await session.commit()

        # Create project member
        member = ProjectMember(
            project_id=project.id,
            user_id=user.id,
            role="developer",
        )

        # Create related records
        commit = CodeCommit(
            user_id=user.id,
            project_id=project.id,
            commit_hash="rel_commit_456",
            language="python",
            commit_time=datetime.now(),
        )
        token = TokenUsage(
            user_id=user.id,
            project_id=project.id,
            platform="trae",
            usage_date=date.today(),
            token_count=500,
        )
        bug = BugRecord(
            project_id=project.id,
            title="Rel Bug",
            severity="major",
        )
        suggestion = AISuggestion(
            user_id=user.id,
            project_id=project.id,
            platform="trae",
            suggestion_type="refactoring",
            content="Refactor this",
        )
        source = DataSource(
            project_id=project.id,
            source_type="gitlab",
            source_name="Test Source",
            config={},
        )

        session.add_all([member, commit, token, bug, suggestion, source])
        await session.commit()

        # Verify all relations using explicit queries (avoid lazy loading issues)
        member_count = await session.scalar(
            select(func.count()).select_from(ProjectMember).where(ProjectMember.project_id == project.id)
        )
        commit_count = await session.scalar(
            select(func.count()).select_from(CodeCommit).where(CodeCommit.project_id == project.id)
        )
        token_count = await session.scalar(
            select(func.count()).select_from(TokenUsage).where(TokenUsage.project_id == project.id)
        )
        bug_count = await session.scalar(
            select(func.count()).select_from(BugRecord).where(BugRecord.project_id == project.id)
        )
        suggestion_count = await session.scalar(
            select(func.count()).select_from(AISuggestion).where(AISuggestion.project_id == project.id)
        )
        source_count = await session.scalar(
            select(func.count()).select_from(DataSource).where(DataSource.project_id == project.id)
        )

        assert member_count == 1
        assert commit_count == 1
        assert token_count == 1
        assert bug_count == 1
        assert suggestion_count == 1
        assert source_count == 1
