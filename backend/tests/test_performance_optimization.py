"""Performance optimization tests for database queries.

TDD Phase 1: Write tests for performance optimization features.
Tests cover:
- Database index effectiveness
- Query performance with large datasets
- Pagination functionality
- Slow query detection
"""

import time
from datetime import date, datetime, timedelta

import pytest
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CodeCommit, TokenUsage, BugRecord, User, Project, ProjectMember
from app.services.code_stats_service import CodeStatsService
from app.services.token_stats_service import TokenStatsService
from app.services.bug_stats_service import BugStatsService
from app.services.global_stats_service import GlobalStatsService


class TestDatabaseIndexes:
    """Test database index effectiveness."""

    async def create_test_data(self, session: AsyncSession, num_records: int = 1000):
        """Create test data for performance testing."""
        # Create test user
        user = User(
            username=f"test_user_{num_records}",
            email=f"test{num_records}@example.com",
            password_hash="hashed_password",
            department="研发部",
            is_active=True,
        )
        session.add(user)
        await session.flush()

        # Create test project
        project = Project(
            name=f"Test Project {num_records}",
            code=f"TEST{num_records}",
            description="Test project for performance testing",
            status="active",
            stage="研发",
        )
        session.add(project)
        await session.flush()

        # Create project member
        member = ProjectMember(
            user_id=user.id,
            project_id=project.id,
            role="member",
        )
        session.add(member)

        # Create code commits
        base_date = datetime.utcnow() - timedelta(days=30)
        commits = []
        for i in range(num_records):
            commit = CodeCommit(
                user_id=user.id,
                project_id=project.id,
                commit_hash=f"abc{i:08d}",
                additions=100 + (i % 50),
                deletions=20 + (i % 20),
                language="python" if i % 3 == 0 else "javascript" if i % 3 == 1 else "typescript",
                file_count=5 + (i % 10),
                commit_message=f"Commit message {i}",
                commit_time=base_date + timedelta(hours=i),
                is_ai_generated=i % 5 == 0,
            )
            commits.append(commit)

        session.add_all(commits)

        # Create token usage records
        token_records = []
        for i in range(num_records):
            token_record = TokenUsage(
                user_id=user.id,
                project_id=project.id,
                platform="trae" if i % 2 == 0 else "ali_coding",
                token_count=1000 + (i % 5000),
                api_calls=10 + (i % 50),
                usage_date=(base_date + timedelta(hours=i)).date(),
                model="gpt-4" if i % 3 == 0 else "claude",
            )
            token_records.append(token_record)

        session.add_all(token_records)

        # Create bug records
        bugs = []
        severities = ["critical", "major", "normal", "minor", "trivial"]
        statuses = ["new", "assigned", "active", "resolved", "closed"]
        for i in range(num_records // 2):  # Fewer bugs than commits
            bug = BugRecord(
                project_id=project.id,
                assignee_id=user.id if i % 2 == 0 else None,
                reporter_id=user.id,
                zendao_bug_id=1000 + i,
                title=f"Bug title {i}",
                description=f"Bug description {i}",
                severity=severities[i % len(severities)],
                priority="high" if i % 3 == 0 else "medium" if i % 3 == 1 else "low",
                status=statuses[i % len(statuses)],
                created_at=base_date + timedelta(hours=i),
                resolved_at=base_date + timedelta(hours=i + 24) if i % 3 == 0 else None,
            )
            bugs.append(bug)

        session.add_all(bugs)
        await session.commit()

        return user.id, project.id

    @pytest.mark.asyncio
    async def test_code_commit_indexes_exist(self, session: AsyncSession):
        """Test that CodeCommit table has required indexes."""
        # Check indexes are defined in model
        from app.db.models import CodeCommit

        index_names = [idx.name for idx in CodeCommit.__table__.indexes]

        assert "idx_code_commits_user_id" in index_names
        assert "idx_code_commits_project_id" in index_names
        assert "idx_code_commits_commit_time" in index_names
        assert "idx_code_commits_user_time" in index_names
        assert "idx_code_commits_project_time" in index_names

    @pytest.mark.asyncio
    async def test_token_usage_indexes_exist(self, session: AsyncSession):
        """Test that TokenUsage table has required indexes."""
        from app.db.models import TokenUsage

        index_names = [idx.name for idx in TokenUsage.__table__.indexes]

        assert "idx_token_usage_user_id" in index_names
        assert "idx_token_usage_project_id" in index_names
        assert "idx_token_usage_usage_date" in index_names
        assert "idx_token_usage_user_platform_date" in index_names

    @pytest.mark.asyncio
    async def test_bug_record_indexes_exist(self, session: AsyncSession):
        """Test that BugRecord table has required indexes."""
        from app.db.models import BugRecord

        index_names = [idx.name for idx in BugRecord.__table__.indexes]

        assert "idx_bug_records_project_id" in index_names
        assert "idx_bug_records_assignee_id" in index_names
        assert "idx_bug_records_created_at" in index_names
        assert "idx_bug_records_project_status_severity" in index_names


class TestQueryPerformance:
    """Test query performance with large datasets."""

    @pytest.mark.asyncio
    async def test_code_stats_query_performance(self, session: AsyncSession):
        """Test code stats query performance."""
        # Create test data
        test_helper = TestDatabaseIndexes()
        user_id, project_id = await test_helper.create_test_data(session, num_records=500)

        service = CodeStatsService()
        end_date = date.today()
        start_date = end_date - timedelta(days=30)

        # Measure query execution time
        start_time = time.time()
        result = await service.calculate_code_stats(
            db=session,
            user_id=user_id,
            project_id=project_id,
            start_date=start_date,
            end_date=end_date,
        )
        end_time = time.time()

        execution_time = end_time - start_time

        # Assert query completes within reasonable time (2 seconds for 500 records)
        assert execution_time < 2.0, f"Query took {execution_time:.2f}s, expected < 2.0s"
        assert result.total_commits > 0

    @pytest.mark.asyncio
    async def test_token_stats_query_performance(self, session: AsyncSession):
        """Test token stats query performance."""
        test_helper = TestDatabaseIndexes()
        user_id, project_id = await test_helper.create_test_data(session, num_records=500)

        service = TokenStatsService()
        end_date = date.today()
        start_date = end_date - timedelta(days=30)

        start_time = time.time()
        result = await service.get_user_token_usage(
            db=session,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
        )
        end_time = time.time()

        execution_time = end_time - start_time

        # Assert query completes within reasonable time
        assert execution_time < 2.0, f"Query took {execution_time:.2f}s, expected < 2.0s"
        assert result.total_tokens > 0

    @pytest.mark.asyncio
    async def test_bug_stats_query_performance(self, session: AsyncSession):
        """Test bug stats query performance."""
        test_helper = TestDatabaseIndexes()
        user_id, project_id = await test_helper.create_test_data(session, num_records=500)

        service = BugStatsService()
        end_date = date.today()
        start_date = end_date - timedelta(days=30)

        start_time = time.time()
        result = await service.get_bug_stats_by_user(
            db=session,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
        )
        end_time = time.time()

        execution_time = end_time - start_time

        # Assert query completes within reasonable time
        assert execution_time < 2.0, f"Query took {execution_time:.2f}s, expected < 2.0s"


class TestPagination:
    """Test pagination functionality."""

    @pytest.mark.asyncio
    async def test_offset_pagination(self, session: AsyncSession):
        """Test offset-based pagination."""
        from app.utils.pagination import paginate_query, PaginationParams

        # Create test data
        test_helper = TestDatabaseIndexes()
        user_id, project_id = await test_helper.create_test_data(session, num_records=100)

        # Test pagination
        params = PaginationParams(page=1, pageSize=20)

        query = select(CodeCommit).where(CodeCommit.user_id == user_id)
        result, total = await paginate_query(session, query, params)

        assert total == 100
        assert len(result) == 20

        # Test second page
        params = PaginationParams(page=2, pageSize=20)
        result, total = await paginate_query(session, query, params)

        assert len(result) == 20

    @pytest.mark.asyncio
    async def test_cursor_pagination(self, session: AsyncSession):
        """Test cursor-based pagination."""
        from app.utils.pagination import cursor_paginate, CursorPaginationParams

        # Create test data
        test_helper = TestDatabaseIndexes()
        user_id, project_id = await test_helper.create_test_data(session, num_records=100)

        # Test cursor pagination
        params = CursorPaginationParams(limit=20)

        result = await cursor_paginate(
            session,
            select(CodeCommit).where(CodeCommit.user_id == user_id),
            params,
            cursor_field="id"
        )

        assert len(result.items) == 20
        assert result.has_more is True
        assert result.next_cursor is not None

    @pytest.mark.asyncio
    async def test_pagination_edge_cases(self, session: AsyncSession):
        """Test pagination edge cases."""
        from app.utils.pagination import paginate_query, PaginationParams

        # Create test data
        test_helper = TestDatabaseIndexes()
        user_id, project_id = await test_helper.create_test_data(session, num_records=25)

        # Test page beyond data range
        params = PaginationParams(page=10, pageSize=20)
        query = select(CodeCommit).where(CodeCommit.user_id == user_id)
        result, total = await paginate_query(session, query, params)

        assert len(result) == 0
        assert total == 25

        # Test empty result
        params = PaginationParams(page=1, pageSize=20)
        query = select(CodeCommit).where(CodeCommit.user_id == -1)  # Non-existent user
        result, total = await paginate_query(session, query, params)

        assert len(result) == 0
        assert total == 0


class TestOptimizedQueries:
    """Test optimized SQL queries."""

    @pytest.mark.asyncio
    async def test_code_stats_uses_optimized_query(self, session: AsyncSession):
        """Test that code stats service uses optimized query."""
        test_helper = TestDatabaseIndexes()
        user_id, project_id = await test_helper.create_test_data(session, num_records=100)

        service = CodeStatsService()
        end_date = date.today()
        start_date = end_date - timedelta(days=30)

        result = await service.calculate_code_stats(
            db=session,
            user_id=user_id,
            project_id=project_id,
            start_date=start_date,
            end_date=end_date,
        )

        # Verify result structure
        assert hasattr(result, 'total_commits')
        assert hasattr(result, 'total_additions')
        assert hasattr(result, 'total_deletions')
        assert hasattr(result, 'file_count')
        assert hasattr(result, 'ai_generated_commits')

    @pytest.mark.asyncio
    async def test_global_stats_optimized_query(self, session: AsyncSession):
        """Test that global stats uses optimized queries."""
        test_helper = TestDatabaseIndexes()
        user_id, project_id = await test_helper.create_test_data(session, num_records=100)

        service = GlobalStatsService()

        start_time = time.time()
        result = await service.get_global_summary(session, days=30)
        end_time = time.time()

        execution_time = end_time - start_time

        # Should complete quickly even with 100 records
        assert execution_time < 1.0, f"Query took {execution_time:.2f}s"
        assert "total_users" in result
        assert "total_commits" in result
        assert "total_tokens" in result


class TestPerformanceMonitoring:
    """Test performance monitoring capabilities."""

    @pytest.mark.asyncio
    async def test_query_execution_time_tracking(self, session: AsyncSession):
        """Test that query execution time can be tracked."""
        from app.utils.performance import QueryTimer

        test_helper = TestDatabaseIndexes()
        user_id, project_id = await test_helper.create_test_data(session, num_records=100)

        timer = QueryTimer()

        with timer:
            result = await session.execute(
                select(func.count(CodeCommit.id)).where(CodeCommit.user_id == user_id)
            )
            result.scalar()

        assert timer.elapsed_time > 0
        assert timer.elapsed_time < 5.0  # Should be very fast

    @pytest.mark.asyncio
    async def test_slow_query_detection(self, session: AsyncSession):
        """Test slow query detection."""
        from app.utils.performance import SlowQueryDetector

        detector = SlowQueryDetector(threshold_ms=100)

        # This should not trigger slow query warning
        with detector:
            await session.execute(select(func.count(CodeCommit.id)))

        assert not detector.is_slow

