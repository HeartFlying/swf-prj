"""Tests for GitLabDataSource using project.gitlab_last_sync_at.

TDD: Test that sync_commits uses project.gitlab_last_sync_at as since parameter.
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Project
from app.services.gitlab_data_source import GitLabDataSource


@pytest.fixture
def gitlab_data_source():
    """Fixture for GitLabDataSource instance."""
    return GitLabDataSource()


@pytest.fixture
def mock_gitlab_client():
    """Fixture for mock GitLab client."""
    client = MagicMock()
    client.get_commits = AsyncMock(return_value=[
        {
            "id": "abc123def456",
            "short_id": "abc123",
            "title": "Fix bug in login",
            "message": "Fix bug in login\n\nDetailed description",
            "author_name": "张三",
            "author_email": "zhangsan@example.com",
            "authored_date": "2024-01-15T10:30:00Z",
            "committer_name": "张三",
            "committer_email": "zhangsan@example.com",
            "committed_date": "2024-01-15T10:30:00Z",
            "stats": {
                "additions": 10,
                "deletions": 5,
                "total": 15
            }
        }
    ])
    return client


class TestGitLabDataSourceLastSyncAt:
    """Test cases for GitLabDataSource using project.gitlab_last_sync_at."""

    async def test_sync_commits_uses_project_last_sync_at(
        self,
        session: AsyncSession,
        gitlab_data_source,
        mock_gitlab_client
    ):
        """Test that sync_commits uses project.gitlab_last_sync_at when since is None."""
        # Arrange
        gitlab_data_source.client = mock_gitlab_client

        # Create a project with gitlab_last_sync_at set
        last_sync_at = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        project = Project(
            name="Test Project",
            code="TEST001",
            stage="研发",
            status="active",
            gitlab_last_sync_at=last_sync_at,
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Act - call sync_commits without since parameter
        result = await gitlab_data_source.sync_commits(
            db=session,
            project_id=project.id
        )

        # Assert - verify fetch_commits was called with project.gitlab_last_sync_at
        mock_gitlab_client.get_commits.assert_called_once()
        call_kwargs = mock_gitlab_client.get_commits.call_args.kwargs
        assert call_kwargs["project_id"] == project.id
        # SQLAlchemy returns offset-naive datetime, so compare without timezone
        expected_since = last_sync_at.replace(tzinfo=None) if last_sync_at.tzinfo else last_sync_at
        actual_since = call_kwargs["since"].replace(tzinfo=None) if call_kwargs["since"] and call_kwargs["since"].tzinfo else call_kwargs["since"]
        assert actual_since == expected_since

    async def test_sync_commits_uses_default_when_no_last_sync_at(
        self,
        session: AsyncSession,
        gitlab_data_source,
        mock_gitlab_client
    ):
        """Test that sync_commits uses default (30 days ago) when project.gitlab_last_sync_at is None."""
        # Arrange
        gitlab_data_source.client = mock_gitlab_client

        # Create a project without gitlab_last_sync_at
        project = Project(
            name="Test Project",
            code="TEST002",
            stage="研发",
            status="active",
            gitlab_last_sync_at=None,
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Act - call sync_commits without since parameter
        before_sync = datetime.now(timezone.utc) - timedelta(days=30)
        result = await gitlab_data_source.sync_commits(
            db=session,
            project_id=project.id
        )
        after_sync = datetime.now(timezone.utc) - timedelta(days=30)

        # Assert - verify fetch_commits was called with a since close to 30 days ago
        mock_gitlab_client.get_commits.assert_called_once()
        call_kwargs = mock_gitlab_client.get_commits.call_args.kwargs
        assert call_kwargs["project_id"] == project.id
        assert call_kwargs["since"] is not None
        # Check that since is approximately 30 days ago (within 1 minute tolerance)
        assert before_sync <= call_kwargs["since"] <= after_sync + timedelta(minutes=1)

    async def test_sync_commits_uses_explicit_since_when_provided(
        self,
        session: AsyncSession,
        gitlab_data_source,
        mock_gitlab_client
    ):
        """Test that sync_commits uses explicit since parameter when provided."""
        # Arrange
        gitlab_data_source.client = mock_gitlab_client

        # Create a project with gitlab_last_sync_at set
        project_last_sync = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        project = Project(
            name="Test Project",
            code="TEST003",
            stage="研发",
            status="active",
            gitlab_last_sync_at=project_last_sync,
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Act - call sync_commits with explicit since parameter
        explicit_since = datetime(2024, 6, 1, 0, 0, 0, tzinfo=timezone.utc)
        result = await gitlab_data_source.sync_commits(
            db=session,
            project_id=project.id,
            since=explicit_since
        )

        # Assert - verify fetch_commits was called with explicit since, not project.gitlab_last_sync_at
        mock_gitlab_client.get_commits.assert_called_once()
        call_kwargs = mock_gitlab_client.get_commits.call_args.kwargs
        assert call_kwargs["project_id"] == project.id
        assert call_kwargs["since"] == explicit_since
        assert call_kwargs["since"] != project_last_sync

    async def test_sync_commits_updates_project_last_sync_at(
        self,
        session: AsyncSession,
        gitlab_data_source,
        mock_gitlab_client
    ):
        """Test that sync_commits updates project.gitlab_last_sync_at after sync."""
        # Arrange
        gitlab_data_source.client = mock_gitlab_client

        # Create a project with gitlab_last_sync_at set to old value
        old_sync_time = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        project = Project(
            name="Test Project",
            code="TEST004",
            stage="研发",
            status="active",
            gitlab_last_sync_at=old_sync_time,
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        before_sync = datetime.now(timezone.utc)

        # Act
        result = await gitlab_data_source.sync_commits(
            db=session,
            project_id=project.id
        )

        after_sync = datetime.now(timezone.utc)

        # Assert - verify project.gitlab_last_sync_at was updated
        await session.refresh(project)
        assert project.gitlab_last_sync_at is not None
        # Make old_sync_time offset-naive for comparison (SQLAlchemy returns naive datetime)
        old_sync_time_naive = old_sync_time.replace(tzinfo=None)
        before_sync_naive = before_sync.replace(tzinfo=None)
        after_sync_naive = after_sync.replace(tzinfo=None)
        assert project.gitlab_last_sync_at > old_sync_time_naive
        assert before_sync_naive <= project.gitlab_last_sync_at <= after_sync_naive + timedelta(seconds=1)
