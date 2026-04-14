"""Tests for ProjectDashboardResponse schema."""

from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.stats import ProjectDashboardResponse


class TestProjectDashboardResponse:
    """Test cases for ProjectDashboardResponse schema."""

    def test_create_with_required_fields(self):
        """Test creating response with required fields."""
        response = ProjectDashboardResponse(
            project_id=1,
            project_name="Test Project",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
        )

        assert response.project_id == 1
        assert response.project_name == "Test Project"
        assert response.overview == {}
        assert response.top_contributors == []
        assert response.bug_summary == {}
        assert response.period_days == 30
        assert response.start_date == date(2024, 1, 1)
        assert response.end_date == date(2024, 1, 31)

    def test_create_with_full_data(self):
        """Test creating response with all fields."""
        response = ProjectDashboardResponse(
            project_id=1,
            project_name="Test Project",
            overview={
                "total_commits": 100,
                "total_tokens": 50000,
                "active_members": 5,
                "bug_count": 10,
            },
            top_contributors=[
                {
                    "user_id": 1,
                    "username": "user1",
                    "commit_count": 50,
                    "lines_changed": 1000,
                },
                {
                    "user_id": 2,
                    "username": "user2",
                    "commit_count": 30,
                    "lines_changed": 600,
                },
            ],
            bug_summary={
                "total": 10,
                "critical": 2,
                "resolved": 8,
                "trend_direction": "improving",
            },
            period_days=30,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
        )

        assert response.project_id == 1
        assert response.project_name == "Test Project"
        assert response.overview["total_commits"] == 100
        assert response.overview["total_tokens"] == 50000
        assert response.overview["active_members"] == 5
        assert response.overview["bug_count"] == 10
        assert len(response.top_contributors) == 2
        assert response.top_contributors[0]["username"] == "user1"
        assert response.bug_summary["total"] == 10
        assert response.bug_summary["critical"] == 2
        assert response.bug_summary["trend_direction"] == "improving"
        assert response.period_days == 30

    def test_missing_required_fields(self):
        """Test that missing required fields raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            ProjectDashboardResponse()

        errors = exc_info.value.errors()
        assert any(e["loc"] == ("project_id",) for e in errors)
        assert any(e["loc"] == ("project_name",) for e in errors)
        assert any(e["loc"] == ("start_date",) for e in errors)
        assert any(e["loc"] == ("end_date",) for e in errors)

    def test_invalid_project_id(self):
        """Test that invalid project_id raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            ProjectDashboardResponse(
                project_id="invalid",
                project_name="Test Project",
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )

        errors = exc_info.value.errors()
        assert any("project_id" in str(e["loc"]) for e in errors)

    def test_invalid_date_types(self):
        """Test that invalid date types raise validation error."""
        with pytest.raises(ValidationError) as exc_info:
            ProjectDashboardResponse(
                project_id=1,
                project_name="Test Project",
                start_date="invalid",
                end_date="invalid",
            )

        errors = exc_info.value.errors()
        assert any("start_date" in str(e["loc"]) for e in errors)
        assert any("end_date" in str(e["loc"]) for e in errors)

    def test_default_values(self):
        """Test that default values are set correctly."""
        response = ProjectDashboardResponse(
            project_id=1,
            project_name="Test Project",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
        )

        assert response.overview == {}
        assert response.top_contributors == []
        assert response.bug_summary == {}
        assert response.period_days == 30

    def test_serialization(self):
        """Test that response can be serialized to dict."""
        response = ProjectDashboardResponse(
            project_id=1,
            project_name="Test Project",
            overview={"total_commits": 100},
            top_contributors=[{"user_id": 1, "username": "user1"}],
            bug_summary={"total": 10},
            period_days=30,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
        )

        data = response.model_dump()
        assert data["project_id"] == 1
        assert data["project_name"] == "Test Project"
        assert data["overview"]["total_commits"] == 100
        assert data["top_contributors"][0]["username"] == "user1"
        assert data["bug_summary"]["total"] == 10
        assert data["period_days"] == 30

    def test_from_attributes_config(self):
        """Test that model_config allows from attributes."""
        # Test that the model has from_attributes config
        assert ProjectDashboardResponse.model_config.get("from_attributes") is True

    def test_custom_period_days(self):
        """Test creating response with custom period_days."""
        response = ProjectDashboardResponse(
            project_id=1,
            project_name="Test Project",
            period_days=7,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 7),
        )

        assert response.period_days == 7

    def test_empty_contributors_list(self):
        """Test that empty contributors list is valid."""
        response = ProjectDashboardResponse(
            project_id=1,
            project_name="Test Project",
            top_contributors=[],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
        )

        assert response.top_contributors == []

    def test_contributor_structure(self):
        """Test that contributor dict structure is flexible."""
        response = ProjectDashboardResponse(
            project_id=1,
            project_name="Test Project",
            top_contributors=[
                {
                    "user_id": 1,
                    "username": "user1",
                    "commit_count": 50,
                    "lines_changed": 1000,
                }
            ],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
        )

        contributor = response.top_contributors[0]
        assert contributor["user_id"] == 1
        assert contributor["username"] == "user1"
        assert contributor["commit_count"] == 50
        assert contributor["lines_changed"] == 1000
