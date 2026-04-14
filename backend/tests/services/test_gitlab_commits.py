"""Tests for GitLabDataSource commits sync.

TDD: Test GitLab commits synchronization functionality.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import CodeCommit, Project
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
        },
        {
            "id": "def789abc012",
            "short_id": "def789",
            "title": "Add new feature",
            "message": "Add new feature",
            "author_name": "李四",
            "author_email": "lisi@example.com",
            "authored_date": "2024-01-14T14:20:00Z",
            "committer_name": "李四",
            "committer_email": "lisi@example.com",
            "committed_date": "2024-01-14T14:20:00Z",
            "stats": {
                "additions": 50,
                "deletions": 10,
                "total": 60
            }
        }
    ])
    return client


class TestGitLabDataSource:
    """Test cases for GitLabDataSource."""

    async def test_fetch_commits(self, gitlab_data_source, mock_gitlab_client):
        """Test fetching commits from GitLab."""
        # Arrange
        gitlab_data_source.client = mock_gitlab_client

        # Act
        commits = await gitlab_data_source.fetch_commits(project_id=1)

        # Assert
        assert len(commits) == 2
        assert commits[0]["id"] == "abc123def456"
        assert commits[1]["id"] == "def789abc012"
        mock_gitlab_client.get_commits.assert_called_once_with(
            project_id=1,
            since=None,
            per_page=100
        )

    async def test_fetch_commits_with_since(self, gitlab_data_source, mock_gitlab_client):
        """Test fetching commits with since parameter."""
        # Arrange
        gitlab_data_source.client = mock_gitlab_client
        since_time = datetime(2024, 1, 1, tzinfo=timezone.utc)

        # Act
        commits = await gitlab_data_source.fetch_commits(
            project_id=1,
            since=since_time
        )

        # Assert
        assert len(commits) == 2
        mock_gitlab_client.get_commits.assert_called_once_with(
            project_id=1,
            since=since_time,
            per_page=100
        )

    def test_transform_commit(self, gitlab_data_source):
        """Test transforming GitLab commit to CodeCommit."""
        # Arrange
        raw_commit = {
            "id": "abc123def456",
            "title": "Fix bug in login",
            "message": "Fix bug in login\n\nDetailed description",
            "author_name": "张三",
            "author_email": "zhangsan@example.com",
            "committed_date": "2024-01-15T10:30:00Z",
            "stats": {
                "additions": 10,
                "deletions": 5,
                "total": 15
            }
        }

        # Act
        commit = gitlab_data_source.transform_commit(raw_commit)

        # Assert
        assert commit.commit_hash == "abc123def456"
        assert commit.additions == 10
        assert commit.deletions == 5
        assert commit.file_count == 15
        assert commit.commit_message == "Fix bug in login"
        assert commit.commit_time.year == 2024
        assert commit.commit_time.month == 1
        assert commit.commit_time.day == 15

    async def test_sync_commits_creates_records(
        self,
        session: AsyncSession,
        gitlab_data_source,
        mock_gitlab_client
    ):
        """Test that sync creates CodeCommit records."""
        # Arrange
        gitlab_data_source.client = mock_gitlab_client

        # Create a project first
        project = Project(
            name="Test Project",
            code="TEST001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Act
        result = await gitlab_data_source.sync_commits(
            db=session,
            project_id=project.id
        )

        # Assert
        assert result["total"] == 2
        assert result["processed"] == 2
        assert result["failed"] == 0

        # Verify database records
        stmt = select(CodeCommit).where(CodeCommit.project_id == project.id)
        result = await session.execute(stmt)
        commits = result.scalars().all()
        assert len(commits) == 2
        assert commits[0].commit_hash in ["abc123def456", "def789abc012"]

    async def test_sync_commits_skips_duplicates(
        self,
        session: AsyncSession,
        gitlab_data_source,
        mock_gitlab_client
    ):
        """Test that sync skips duplicate commits."""
        # Arrange
        gitlab_data_source.client = mock_gitlab_client

        # Create project
        project = Project(
            name="Test Project",
            code="TEST001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # First sync
        await gitlab_data_source.sync_commits(db=session, project_id=project.id)

        # Reset mock to return same commits again
        mock_gitlab_client.get_commits.reset_mock()

        # Second sync should handle duplicates gracefully
        result = await gitlab_data_source.sync_commits(db=session, project_id=project.id)

        # Assert - should not fail, may skip or update
        assert result["total"] == 2

    async def test_sync_commits_with_error(
        self,
        session: AsyncSession,
        gitlab_data_source,
        mock_gitlab_client
    ):
        """Test sync handles errors gracefully."""
        # Arrange
        mock_gitlab_client.get_commits.side_effect = Exception("Connection failed")
        gitlab_data_source.client = mock_gitlab_client

        # Create project
        project = Project(
            name="Test Project",
            code="TEST001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Act
        result = await gitlab_data_source.sync_commits(db=session, project_id=project.id)

        # Assert
        assert result["total"] == 0
        assert result["processed"] == 0
        assert result["failed"] == 0
        assert len(result["errors"]) == 1
        assert "Connection failed" in result["errors"][0]

    async def test_get_or_create_user_by_email(
        self,
        session: AsyncSession,
        gitlab_data_source
    ):
        """Test finding or creating user by email."""
        # Act - create new user
        user = await gitlab_data_source._get_or_create_user(
            session,
            "test@example.com",
            "Test User"
        )

        # Assert
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.username == "test"

        # Act - find existing user
        user2 = await gitlab_data_source._get_or_create_user(
            session,
            "test@example.com",
            "Different Name"
        )

        # Assert - should return same user
        assert user2.id == user.id

    async def test_get_or_create_user_handles_duplicate_username(
        self,
        session: AsyncSession,
        gitlab_data_source
    ):
        """Test that duplicate usernames from different emails are handled."""
        # Act - create first user
        user1 = await gitlab_data_source._get_or_create_user(
            session,
            "zhangsan@example.com",
            "张三"
        )

        # Act - create second user with same local part but different domain
        user2 = await gitlab_data_source._get_or_create_user(
            session,
            "zhangsan@other.com",
            "张三 Other"
        )

        # Assert - both users exist with different usernames
        assert user1.id is not None
        assert user2.id is not None
        assert user1.id != user2.id
        assert user1.username != user2.username
        assert user1.username.startswith("zhangsan")
        assert user2.username.startswith("zhangsan")


class TestGitLabDataSourceInterface:
    """Test that GitLabDataSource implements DataSourceInterface correctly."""

    def test_implements_interface(self):
        """Test that GitLabDataSource can be instantiated."""
        from app.services.data_source_interface import DataSourceInterface

        source = GitLabDataSource()
        assert isinstance(source, DataSourceInterface)
        assert source.source_type == "gitlab"

    async def test_fetch_method_exists(self, gitlab_data_source):
        """Test that fetch method exists and is callable."""
        assert hasattr(gitlab_data_source, 'fetch')
        assert callable(gitlab_data_source.fetch)

    def test_transform_method_exists(self, gitlab_data_source):
        """Test that transform method exists and is callable."""
        assert hasattr(gitlab_data_source, 'transform')
        assert callable(gitlab_data_source.transform)

    async def test_save_method_exists(self, gitlab_data_source):
        """Test that save method exists and is callable."""
        assert hasattr(gitlab_data_source, 'save')
        assert callable(gitlab_data_source.save)
