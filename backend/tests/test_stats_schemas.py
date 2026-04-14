"""Tests for stats schemas - TDD.

This file tests the schema definitions in app.schemas.stats module.
"""

import pytest
from pydantic import ValidationError


class TestCommitRankResponse:
    """Test cases for CommitRankResponse schema."""

    @pytest.fixture
    def commit_rank_response_class(self):
        """Import the CommitRankResponse class."""
        from app.schemas.stats import CommitRankResponse
        return CommitRankResponse

    def test_commit_rank_response_exists(self, commit_rank_response_class):
        """Test that CommitRankResponse class exists."""
        assert commit_rank_response_class is not None

    def test_commit_rank_response_required_fields(self, commit_rank_response_class):
        """Test that CommitRankResponse has all required fields."""
        # Create a valid instance
        response = commit_rank_response_class(
            user_id=1,
            username="testuser",
            commit_count=100,
            avg_commits_per_day=5.5
        )

        # Verify all fields are accessible
        assert response.user_id == 1
        assert response.username == "testuser"
        assert response.commit_count == 100
        assert response.avg_commits_per_day == 5.5

    def test_commit_rank_response_field_types(self, commit_rank_response_class):
        """Test that CommitRankResponse fields have correct types."""
        response = commit_rank_response_class(
            user_id=1,
            username="testuser",
            commit_count=100,
            avg_commits_per_day=5.5
        )

        # Verify field types
        assert isinstance(response.user_id, int)
        assert isinstance(response.username, str)
        assert isinstance(response.commit_count, int)
        assert isinstance(response.avg_commits_per_day, float)

    def test_commit_rank_response_missing_required_fields(self, commit_rank_response_class):
        """Test that CommitRankResponse validates required fields."""
        # Missing user_id
        with pytest.raises(ValidationError) as exc_info:
            commit_rank_response_class(
                username="testuser",
                commit_count=100,
                avg_commits_per_day=5.5
            )
        assert "user_id" in str(exc_info.value)

        # Missing username
        with pytest.raises(ValidationError) as exc_info:
            commit_rank_response_class(
                user_id=1,
                commit_count=100,
                avg_commits_per_day=5.5
            )
        assert "username" in str(exc_info.value)

        # Missing commit_count
        with pytest.raises(ValidationError) as exc_info:
            commit_rank_response_class(
                user_id=1,
                username="testuser",
                avg_commits_per_day=5.5
            )
        assert "commit_count" in str(exc_info.value)

        # Missing avg_commits_per_day
        with pytest.raises(ValidationError) as exc_info:
            commit_rank_response_class(
                user_id=1,
                username="testuser",
                commit_count=100
            )
        assert "avg_commits_per_day" in str(exc_info.value)

    def test_commit_rank_response_serialization(self, commit_rank_response_class):
        """Test that CommitRankResponse can be serialized to dict."""
        response = commit_rank_response_class(
            user_id=1,
            username="testuser",
            commit_count=100,
            avg_commits_per_day=5.5
        )

        # Serialize to dict
        data = response.model_dump()

        # Verify serialized data
        assert data["user_id"] == 1
        assert data["username"] == "testuser"
        assert data["commit_count"] == 100
        assert data["avg_commits_per_day"] == 5.5

    def test_commit_rank_response_distinct_from_code_rank(self, commit_rank_response_class):
        """Test that CommitRankResponse is different from CodeRankResponse."""
        from app.schemas.stats import CodeRankResponse

        # Verify they are different classes
        assert commit_rank_response_class != CodeRankResponse

        # Verify CodeRankResponse has different fields
        code_rank = CodeRankResponse(
            user_id=1,
            username="testuser",
            lines_added=500,
            lines_deleted=100,
            total_lines=400
        )

        commit_rank = commit_rank_response_class(
            user_id=1,
            username="testuser",
            commit_count=50,
            avg_commits_per_day=2.5
        )

        # Verify different fields
        assert hasattr(code_rank, "lines_added")
        assert hasattr(code_rank, "lines_deleted")
        assert hasattr(code_rank, "total_lines")
        assert not hasattr(commit_rank, "lines_added")

        assert hasattr(commit_rank, "commit_count")
        assert hasattr(commit_rank, "avg_commits_per_day")
        assert not hasattr(code_rank, "commit_count")
