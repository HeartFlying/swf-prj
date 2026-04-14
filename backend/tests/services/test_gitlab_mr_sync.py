"""Tests for GitLab Merge Request synchronization.

Tests the GitLabDataSource MR sync functionality with Mock Server.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from app.db.models import MergeRequest, Project, User
from app.services.gitlab_data_source import GitLabDataSource


@pytest.fixture
def mock_gitlab_client():
    """Create a mock GitLab client."""
    client = AsyncMock()
    return client


@pytest.fixture
def gitlab_data_source(mock_gitlab_client):
    """Create a GitLabDataSource with mock client."""
    return GitLabDataSource(client=mock_gitlab_client)


@pytest.fixture
def sample_gitlab_mr():
    """Sample GitLab MR data."""
    return {
        "id": 12345,
        "iid": 42,
        "title": "Add new feature",
        "description": "This MR adds a new feature",
        "source_branch": "feature-branch",
        "target_branch": "main",
        "state": "merged",
        "merge_status": "can_be_merged",
        "draft": False,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-16T14:20:00Z",
        "merged_at": "2024-01-16T14:20:00Z",
        "closed_at": None,
        "author": {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
        },
        "assignee": {
            "id": 2,
            "name": "Jane Smith",
            "email": "jane@example.com",
        },
        "merged_by": {
            "id": 3,
            "name": "Admin User",
            "email": "admin@example.com",
        },
        "changes_count": 150,
        "commits_count": 3,
        "web_url": "https://gitlab.example.com/project/-/merge_requests/42",
    }


@pytest.fixture
def sample_draft_mr():
    """Sample draft GitLab MR data."""
    return {
        "id": 12346,
        "iid": 43,
        "title": "Draft: Work in progress feature",
        "description": "Still working on this",
        "source_branch": "wip-branch",
        "target_branch": "main",
        "state": "opened",
        "merge_status": "unchecked",
        "draft": True,
        "created_at": "2024-01-17T09:00:00Z",
        "updated_at": "2024-01-17T09:00:00Z",
        "merged_at": None,
        "closed_at": None,
        "author": {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
        },
        "assignee": None,
        "merged_by": None,
        "changes_count": 50,
        "commits_count": 1,
        "web_url": "https://gitlab.example.com/project/-/merge_requests/43",
    }


class TestMergeRequestTransform:
    """Test MR transformation from GitLab to local model."""

    def test_transform_merge_request(self, gitlab_data_source, sample_gitlab_mr):
        """Test transforming a GitLab MR to local model."""
        mr = gitlab_data_source.transform_merge_request(sample_gitlab_mr)

        assert isinstance(mr, MergeRequest)
        assert mr.mr_id == 12345
        assert mr.iid == 42
        assert mr.title == "Add new feature"
        assert mr.description == "This MR adds a new feature"
        assert mr.source_branch == "feature-branch"
        assert mr.target_branch == "main"
        assert mr.state == "merged"
        assert mr.merge_status == "can_be_merged"
        assert mr.draft is False
        assert mr.work_in_progress is False
        assert mr.additions == 150
        assert mr.commit_count == 3
        assert mr.web_url == "https://gitlab.example.com/project/-/merge_requests/42"

    def test_transform_merge_request_success(self, gitlab_data_source, sample_gitlab_mr):
        """Test successful transformation of GitLab MR data to MergeRequest model."""
        mr = gitlab_data_source.transform_merge_request(sample_gitlab_mr)

        assert isinstance(mr, MergeRequest)
        assert mr.mr_id == 12345
        assert mr.iid == 42
        assert mr.title == "Add new feature"
        assert mr.description == "This MR adds a new feature"
        assert mr.source_branch == "feature-branch"
        assert mr.target_branch == "main"
        assert mr.state == "merged"
        assert mr.merge_status == "can_be_merged"
        assert mr.draft is False
        assert mr.work_in_progress is False
        assert mr.created_at.year == 2024
        assert mr.created_at.month == 1
        assert mr.created_at.day == 15
        assert mr.merged_at is not None
        assert mr.closed_at is None
        assert mr.additions == 150
        assert mr.commit_count == 3
        assert mr.web_url == "https://gitlab.example.com/project/-/merge_requests/42"

    def test_transform_merge_request_with_draft_wip(self, gitlab_data_source):
        """Test transforming MR with Draft/WIP markers in title."""
        # Test Draft: prefix
        draft_mr = {
            "id": 12348,
            "iid": 43,
            "title": "Draft: Work in progress feature",
            "description": "Not ready yet",
            "source_branch": "feature/wip",
            "target_branch": "main",
            "state": "opened",
            "merge_status": "checking",
            "draft": False,
            "created_at": "2024-01-16T10:00:00Z",
            "updated_at": "2024-01-16T10:00:00Z",
            "merged_at": None,
            "closed_at": None,
            "changes_count": 0,
            "commits_count": 0,
            "web_url": "https://gitlab.example.com/project/-/merge_requests/43",
            "author": {"id": 1, "name": "Test", "email": "test@example.com"}
        }

        mr = gitlab_data_source.transform_merge_request(draft_mr)
        assert mr.draft is True
        assert mr.work_in_progress is False

        # Test WIP: prefix
        wip_mr = {
            "id": 12349,
            "iid": 44,
            "title": "WIP: Another work in progress",
            "description": "Still working",
            "source_branch": "feature/wip2",
            "target_branch": "main",
            "state": "opened",
            "merge_status": "checking",
            "draft": False,
            "created_at": "2024-01-16T11:00:00Z",
            "updated_at": "2024-01-16T11:00:00Z",
            "merged_at": None,
            "closed_at": None,
            "changes_count": 0,
            "commits_count": 0,
            "web_url": "https://gitlab.example.com/project/-/merge_requests/44",
            "author": {"id": 1, "name": "Test", "email": "test@example.com"}
        }

        mr = gitlab_data_source.transform_merge_request(wip_mr)
        assert mr.work_in_progress is True

        # Test [WIP] prefix
        wip_bracket_mr = {
            "id": 12350,
            "iid": 45,
            "title": "[WIP] Bracket style WIP",
            "description": "Work in progress",
            "source_branch": "feature/wip3",
            "target_branch": "main",
            "state": "opened",
            "merge_status": "checking",
            "draft": True,
            "created_at": "2024-01-16T12:00:00Z",
            "updated_at": "2024-01-16T12:00:00Z",
            "merged_at": None,
            "closed_at": None,
            "changes_count": 0,
            "commits_count": 0,
            "web_url": "https://gitlab.example.com/project/-/merge_requests/45",
            "author": {"id": 1, "name": "Test", "email": "test@example.com"}
        }

        mr = gitlab_data_source.transform_merge_request(wip_bracket_mr)
        assert mr.draft is True
        assert mr.work_in_progress is True

    def test_transform_draft_mr(self, gitlab_data_source, sample_draft_mr):
        """Test transforming a draft MR."""
        mr = gitlab_data_source.transform_merge_request(sample_draft_mr)

        assert mr.draft is True
        # Title starts with "Draft:" so work_in_progress should be False
        # (it's a draft, not a WIP)
        assert mr.work_in_progress is False
        assert mr.state == "opened"

    def test_transform_mr_dates(self, gitlab_data_source, sample_gitlab_mr):
        """Test MR date parsing."""
        mr = gitlab_data_source.transform_merge_request(sample_gitlab_mr)

        assert mr.created_at == datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        assert mr.merged_at == datetime(2024, 1, 16, 14, 20, 0, tzinfo=timezone.utc)
        assert mr.closed_at is None


class TestMergeRequestFetch:
    """Test fetching MRs from GitLab."""

    @pytest.mark.asyncio
    async def test_fetch_merge_requests(self, gitlab_data_source, mock_gitlab_client, sample_gitlab_mr):
        """Test fetching merge requests from GitLab."""
        mock_gitlab_client.get_merge_requests.return_value = [sample_gitlab_mr]

        result = await gitlab_data_source.fetch_merge_requests(
            project_id=1,
            state="merged",
        )

        assert len(result) == 1
        assert result[0]["id"] == 12345
        mock_gitlab_client.get_merge_requests.assert_called_once_with(
            project_id=1,
            state="merged",
            per_page=100,
        )

    @pytest.mark.asyncio
    async def test_fetch_merge_requests_success(self, gitlab_data_source, mock_gitlab_client, sample_gitlab_mr):
        """Test successfully fetching MR list from GitLab."""
        mock_gitlab_client.get_merge_requests.return_value = [sample_gitlab_mr]

        result = await gitlab_data_source.fetch_merge_requests(project_id=1)

        assert len(result) == 1
        assert result[0]["id"] == 12345
        assert result[0]["title"] == "Add new feature"

    @pytest.mark.asyncio
    async def test_fetch_merge_requests_with_state_filter(self, gitlab_data_source, mock_gitlab_client):
        """Test fetching MRs with different state filters."""
        # Setup mock to return different results based on state
        async def mock_get_mrs(*, project_id, state=None, per_page=100):
            all_mrs = [
                {"id": 1, "title": "MR 1", "state": "merged"},
                {"id": 2, "title": "MR 2", "state": "opened"},
                {"id": 3, "title": "MR 3", "state": "closed"},
            ]
            if state and state != "all":
                return [mr for mr in all_mrs if mr["state"] == state]
            return all_mrs

        mock_gitlab_client.get_merge_requests.side_effect = mock_get_mrs

        # Test merged filter
        merged = await gitlab_data_source.fetch_merge_requests(project_id=1, state="merged")
        assert len(merged) == 1
        assert merged[0]["state"] == "merged"

        # Test opened filter
        opened = await gitlab_data_source.fetch_merge_requests(project_id=1, state="opened")
        assert len(opened) == 1
        assert opened[0]["state"] == "opened"

        # Test all filter
        all_mrs = await gitlab_data_source.fetch_merge_requests(project_id=1, state="all")
        assert len(all_mrs) == 3

    @pytest.mark.asyncio
    async def test_fetch_merge_requests_error(self, gitlab_data_source, mock_gitlab_client):
        """Test error handling when fetching MRs fails."""
        mock_gitlab_client.get_merge_requests.side_effect = Exception("API Error")

        with pytest.raises(Exception, match="API Error"):
            await gitlab_data_source.fetch_merge_requests(project_id=1)


class TestMergeRequestSync:
    """Test syncing MRs to database."""

    @pytest.mark.asyncio
    async def test_sync_merge_requests(
        self,
        gitlab_data_source,
        mock_gitlab_client,
        sample_gitlab_mr,
        session,
    ):
        """Test syncing merge requests to database."""
        mock_gitlab_client.get_merge_requests.return_value = [sample_gitlab_mr]

        # Create a test project first
        project = Project(
            name="Test Project",
            code="TEST",
            stage="研发",
        )
        session.add(project)
        await session.flush()

        result = await gitlab_data_source.sync_merge_requests(
            db=session,
            project_id=project.id,
        )

        assert result["total"] == 1
        assert result["processed"] == 1
        assert result["failed"] == 0

        # Verify MR was saved
        from sqlalchemy import select
        stmt = select(MergeRequest).where(MergeRequest.project_id == project.id)
        query_result = await session.execute(stmt)
        mr = query_result.scalar_one()

        assert mr.mr_id == 12345
        assert mr.title == "Add new feature"
        assert mr.state == "merged"

    @pytest.mark.asyncio
    async def test_sync_merge_requests_success(
        self,
        gitlab_data_source,
        mock_gitlab_client,
        sample_gitlab_mr,
        session,
    ):
        """Test successful sync of merge requests to database."""
        mock_gitlab_client.get_merge_requests.return_value = [sample_gitlab_mr]

        # Create a project
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
        result = await gitlab_data_source.sync_merge_requests(
            db=session, project_id=project.id
        )

        # Assert
        assert result["total"] == 1
        assert result["processed"] == 1
        assert result["failed"] == 0

        # Verify database records
        from sqlalchemy import select
        stmt = select(MergeRequest).where(MergeRequest.project_id == project.id)
        query_result = await session.execute(stmt)
        mrs = query_result.scalars().all()
        assert len(mrs) == 1

        # Check MR details
        mr = mrs[0]
        assert mr.title == "Add new feature"
        assert mr.state == "merged"
        assert mr.iid == 42

    @pytest.mark.asyncio
    async def test_sync_merge_requests_duplicate_handling(
        self,
        gitlab_data_source,
        mock_gitlab_client,
        sample_gitlab_mr,
        session,
    ):
        """Test that duplicate MRs are handled correctly (updated not duplicated)."""
        mock_gitlab_client.get_merge_requests.return_value = [sample_gitlab_mr]

        # Create a project
        project = Project(
            name="Test Project",
            code="TEST001",
            stage="研发",
            status="active",
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Create an existing user for author
        author = User(
            username="john",
            email="john@example.com",
            password_hash="",
            department="External"
        )
        session.add(author)
        await session.commit()
        await session.refresh(author)

        # Insert an existing MR
        existing_mr = MergeRequest(
            project_id=project.id,
            author_id=author.id,
            mr_id=12345,
            iid=42,
            title="Old Title",
            description="Old description",
            source_branch="feature/old",
            target_branch="main",
            state="opened",
            draft=False,
            work_in_progress=False,
            created_at=datetime(2024, 1, 15, 10, 30, tzinfo=timezone.utc),
            updated_at=datetime(2024, 1, 15, 10, 30, tzinfo=timezone.utc),
            additions=5,
            deletions=0,
            commit_count=1
        )
        session.add(existing_mr)
        await session.commit()

        # Reset mock to return same MRs again
        mock_gitlab_client.get_merge_requests.reset_mock()

        # Act - sync again
        result = await gitlab_data_source.sync_merge_requests(
            db=session, project_id=project.id
        )

        # Assert
        assert result["total"] == 1
        assert result["processed"] == 1

        # Verify no duplicates - should still be 1 MR (updated)
        from sqlalchemy import select
        stmt = select(MergeRequest).where(MergeRequest.project_id == project.id)
        query_result = await session.execute(stmt)
        mrs = query_result.scalars().all()
        assert len(mrs) == 1

        # Verify the existing MR was updated
        updated_mr = mrs[0]
        assert updated_mr.title == "Add new feature"  # Updated from mock
        assert updated_mr.state == "merged"  # Updated from mock

    @pytest.mark.asyncio
    async def test_sync_merge_requests_update_existing(
        self,
        gitlab_data_source,
        mock_gitlab_client,
        sample_gitlab_mr,
        session,
    ):
        """Test updating existing MR records."""
        mock_gitlab_client.get_merge_requests.return_value = [sample_gitlab_mr]

        # Create project
        project = Project(
            name="Test Project",
            code="TEST",
            stage="研发",
        )
        session.add(project)
        await session.flush()

        # Create existing MR
        existing_mr = MergeRequest(
            mr_id=12345,
            iid=42,
            project_id=project.id,
            author_id=1,
            title="Old Title",
            source_branch="feature-branch",
            target_branch="main",
            state="opened",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(existing_mr)
        await session.commit()

        # Sync should update the existing MR
        result = await gitlab_data_source.sync_merge_requests(
            db=session,
            project_id=project.id,
        )

        assert result["processed"] == 1

        # Verify MR was updated
        from sqlalchemy import select
        stmt = select(MergeRequest).where(MergeRequest.mr_id == 12345)
        query_result = await session.execute(stmt)
        mr = query_result.scalar_one()

        assert mr.title == "Add new feature"
        assert mr.state == "merged"

    @pytest.mark.asyncio
    async def test_sync_merge_requests_author_mapping(
        self,
        gitlab_data_source,
        mock_gitlab_client,
        sample_gitlab_mr,
        session,
    ):
        """Test that MR authors are mapped to users."""
        mock_gitlab_client.get_merge_requests.return_value = [sample_gitlab_mr]

        # Create project
        project = Project(
            name="Test Project",
            code="TEST",
            stage="研发",
        )
        session.add(project)
        await session.flush()

        await gitlab_data_source.sync_merge_requests(
            db=session,
            project_id=project.id,
        )

        # Verify user was created
        from sqlalchemy import select
        stmt = select(User).where(User.email == "john@example.com")
        result = await session.execute(stmt)
        user = result.scalar_one()

        assert user.username == "john"
        assert user.email == "john@example.com"

        # Verify MR has correct author
        stmt = select(MergeRequest).where(MergeRequest.mr_id == 12345)
        result = await session.execute(stmt)
        mr = result.scalar_one()

        assert mr.author_id == user.id

    @pytest.mark.asyncio
    async def test_sync_merge_requests_assignee_mapping(
        self,
        gitlab_data_source,
        mock_gitlab_client,
        sample_gitlab_mr,
        session,
    ):
        """Test that MR assignees are correctly mapped to users."""
        mock_gitlab_client.get_merge_requests.return_value = [sample_gitlab_mr]

        # Create project
        project = Project(
            name="Test Project",
            code="TEST",
            stage="研发",
        )
        session.add(project)
        await session.flush()

        await gitlab_data_source.sync_merge_requests(
            db=session,
            project_id=project.id,
        )

        # Verify assignee user was created
        from sqlalchemy import select
        stmt = select(User).where(User.email == "jane@example.com")
        result = await session.execute(stmt)
        assignee = result.scalar_one()

        assert assignee.username == "jane"
        assert assignee.email == "jane@example.com"

        # Verify MR has correct assignee
        stmt = select(MergeRequest).where(MergeRequest.mr_id == 12345)
        result = await session.execute(stmt)
        mr = result.scalar_one()

        assert mr.assignee_id == assignee.id

    @pytest.mark.asyncio
    async def test_sync_merge_requests_with_user_mapping(
        self,
        gitlab_data_source,
        mock_gitlab_client,
        sample_gitlab_mr,
        session,
    ):
        """Test that MR authors are mapped to users (backward compatibility)."""
        mock_gitlab_client.get_merge_requests.return_value = [sample_gitlab_mr]

        # Create project
        project = Project(
            name="Test Project",
            code="TEST",
            stage="研发",
        )
        session.add(project)
        await session.flush()

        await gitlab_data_source.sync_merge_requests(
            db=session,
            project_id=project.id,
        )

        # Verify user was created
        from sqlalchemy import select
        stmt = select(User).where(User.email == "john@example.com")
        result = await session.execute(stmt)
        user = result.scalar_one()

        assert user.username == "john"
        assert user.email == "john@example.com"

        # Verify MR has correct author
        stmt = select(MergeRequest).where(MergeRequest.mr_id == 12345)
        result = await session.execute(stmt)
        mr = result.scalar_one()

        assert mr.author_id == user.id

    @pytest.mark.asyncio
    async def test_sync_merge_requests_with_null_author(
        self,
        gitlab_data_source,
        mock_gitlab_client,
        session,
    ):
        """Test handling MR with null author."""
        mr_with_null_author = {
            "id": 12347,
            "iid": 44,
            "title": "Test MR",
            "description": "Test",
            "source_branch": "feature",
            "target_branch": "main",
            "state": "opened",
            "draft": False,
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-15T10:30:00Z",
            "author": None,  # Null author
            "assignee": None,
            "merged_by": None,
            "changes_count": 10,
            "commits_count": 1,
        }
        mock_gitlab_client.get_merge_requests.return_value = [mr_with_null_author]

        # Create project
        project = Project(
            name="Test Project",
            code="TEST2",
            stage="研发",
        )
        session.add(project)
        await session.flush()

        # Should not raise exception
        result = await gitlab_data_source.sync_merge_requests(
            db=session,
            project_id=project.id,
        )

        assert result["processed"] == 1
        assert result["failed"] == 0


class TestMergeRequestSyncAll:
    """Test the sync_all method that syncs both commits and MRs."""

    @pytest.mark.asyncio
    async def test_sync_all(
        self,
        gitlab_data_source,
        mock_gitlab_client,
        sample_gitlab_mr,
        session,
    ):
        """Test syncing both commits and MRs."""
        mock_gitlab_client.get_merge_requests.return_value = [sample_gitlab_mr]
        mock_gitlab_client.get_commits.return_value = []

        # Create project
        project = Project(
            name="Test Project",
            code="TEST",
            stage="研发",
        )
        session.add(project)
        await session.flush()

        result = await gitlab_data_source.sync_all(
            db=session,
            project_id=project.id,
        )

        assert "commits" in result
        assert "merge_requests" in result
        assert result["merge_requests"]["total"] == 1
        assert result["merge_requests"]["processed"] == 1
