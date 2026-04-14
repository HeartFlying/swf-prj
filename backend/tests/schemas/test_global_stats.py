"""Tests for global stats schemas - TDD.

This file tests the schema definitions for global statistics in app.schemas.stats module.
"""

import pytest


class TestTopUsersResponse:
    """Test cases for TopUsersResponse schema."""

    @pytest.fixture
    def top_users_response_class(self):
        """Import the TopUsersResponse class."""
        from app.schemas.stats import TopUsersResponse
        return TopUsersResponse

    @pytest.fixture
    def top_user_response_class(self):
        """Import the TopUserResponse class."""
        from app.schemas.stats import TopUserResponse
        return TopUserResponse

    def test_top_users_response_exists(self, top_users_response_class):
        """Test that TopUsersResponse class exists."""
        assert top_users_response_class is not None

    def test_top_users_response_default_values(self, top_users_response_class):
        """Test that TopUsersResponse has correct default values."""
        response = top_users_response_class()

        assert response.users == []
        assert response.total_count == 0

    def test_top_users_response_with_users(self, top_users_response_class, top_user_response_class):
        """Test TopUsersResponse with user data."""
        users = [
            top_user_response_class(
                user_id=1,
                username="zhangsan",
                department="研发部",
                token_count=50000,
                commit_count=150
            ),
            top_user_response_class(
                user_id=2,
                username="lisi",
                department="测试部",
                token_count=35000,
                commit_count=120
            )
        ]

        response = top_users_response_class(
            users=users,
            total_count=2
        )

        assert len(response.users) == 2
        assert response.users[0].user_id == 1
        assert response.users[0].username == "zhangsan"
        assert response.users[0].token_count == 50000
        assert response.total_count == 2

    def test_top_users_response_serialization(self, top_users_response_class, top_user_response_class):
        """Test that TopUsersResponse can be serialized to dict."""
        users = [
            top_user_response_class(
                user_id=1,
                username="zhangsan",
                department="研发部",
                token_count=50000,
                commit_count=150
            )
        ]

        response = top_users_response_class(users=users, total_count=1)
        data = response.model_dump()

        assert "users" in data
        assert "total_count" in data
        assert len(data["users"]) == 1
        assert data["users"][0]["user_id"] == 1
        assert data["users"][0]["username"] == "zhangsan"


class TestGlobalSummaryResponse:
    """Test cases for GlobalSummaryResponse schema."""

    @pytest.fixture
    def global_summary_response_class(self):
        """Import the GlobalSummaryResponse class."""
        from app.schemas.stats import GlobalSummaryResponse
        return GlobalSummaryResponse

    def test_global_summary_response_exists(self, global_summary_response_class):
        """Test that GlobalSummaryResponse class exists."""
        assert global_summary_response_class is not None

    def test_global_summary_response_default_values(self, global_summary_response_class):
        """Test that GlobalSummaryResponse has correct default values."""
        response = global_summary_response_class()

        assert response.total_users == 0
        assert response.total_projects == 0
        assert response.total_commits == 0
        assert response.total_tokens == 0
        assert response.total_bugs == 0
        assert response.active_users_today == 0
        assert response.period_days == 30

    def test_global_summary_response_with_values(self, global_summary_response_class):
        """Test GlobalSummaryResponse with actual values."""
        response = global_summary_response_class(
            total_users=100,
            total_projects=20,
            total_commits=5000,
            total_tokens=1000000,
            total_bugs=150,
            active_users_today=45,
            period_days=7
        )

        assert response.total_users == 100
        assert response.total_projects == 20
        assert response.total_commits == 5000
        assert response.total_tokens == 1000000
        assert response.total_bugs == 150
        assert response.active_users_today == 45
        assert response.period_days == 7

    def test_global_summary_response_serialization(self, global_summary_response_class):
        """Test that GlobalSummaryResponse can be serialized to dict."""
        response = global_summary_response_class(
            total_users=100,
            total_projects=20,
            total_commits=5000,
            total_tokens=1000000,
            total_bugs=150,
            active_users_today=45,
            period_days=7
        )

        data = response.model_dump()

        assert data["total_users"] == 100
        assert data["total_projects"] == 20
        assert data["total_commits"] == 5000
        assert data["total_tokens"] == 1000000
        assert data["total_bugs"] == 150
        assert data["active_users_today"] == 45
        assert data["period_days"] == 7

    def test_global_summary_response_field_types(self, global_summary_response_class):
        """Test that GlobalSummaryResponse fields have correct types."""
        response = global_summary_response_class(
            total_users=100,
            total_projects=20,
            total_commits=5000,
            total_tokens=1000000,
            total_bugs=150,
            active_users_today=45,
            period_days=7
        )

        assert isinstance(response.total_users, int)
        assert isinstance(response.total_projects, int)
        assert isinstance(response.total_commits, int)
        assert isinstance(response.total_tokens, int)
        assert isinstance(response.total_bugs, int)
        assert isinstance(response.active_users_today, int)
        assert isinstance(response.period_days, int)
