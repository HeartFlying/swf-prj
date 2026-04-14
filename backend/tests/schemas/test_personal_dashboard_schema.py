"""Tests for PersonalDashboardResponse schema."""

from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.stats import PersonalDashboardResponse


class TestPersonalDashboardResponse:
    """Test cases for PersonalDashboardResponse schema."""

    def test_valid_personal_dashboard_response(self):
        """Test creating a valid PersonalDashboardResponse."""
        data = {
            "user_id": 1,
            "username": "testuser",
            "code_summary": {
                "total_commits": 100,
                "lines_added": 5000,
                "lines_deleted": 2000,
                "avg_commits_per_day": 5.5,
            },
            "token_summary": {
                "total_tokens": 1000000,
                "prompt_tokens": 600000,
                "completion_tokens": 400000,
                "avg_per_day": 50000.0,
            },
            "bug_summary": {
                "total_bugs": 10,
                "critical_bugs": 2,
                "bug_rate": 0.5,
                "resolved_bugs": 8,
            },
            "period_days": 30,
            "start_date": date(2024, 1, 1),
            "end_date": date(2024, 1, 31),
        }

        response = PersonalDashboardResponse(**data)

        assert response.user_id == 1
        assert response.username == "testuser"
        assert response.code_summary["total_commits"] == 100
        assert response.code_summary["lines_added"] == 5000
        assert response.code_summary["lines_deleted"] == 2000
        assert response.code_summary["avg_commits_per_day"] == 5.5
        assert response.token_summary["total_tokens"] == 1000000
        assert response.token_summary["prompt_tokens"] == 600000
        assert response.token_summary["completion_tokens"] == 400000
        assert response.token_summary["avg_per_day"] == 50000.0
        assert response.bug_summary["total_bugs"] == 10
        assert response.bug_summary["critical_bugs"] == 2
        assert response.bug_summary["bug_rate"] == 0.5
        assert response.bug_summary["resolved_bugs"] == 8
        assert response.period_days == 30
        assert response.start_date == date(2024, 1, 1)
        assert response.end_date == date(2024, 1, 31)

    def test_personal_dashboard_response_with_string_dates(self):
        """Test creating PersonalDashboardResponse with string dates."""
        data = {
            "user_id": 1,
            "username": "testuser",
            "code_summary": {
                "total_commits": 50,
                "lines_added": 1000,
                "lines_deleted": 500,
                "avg_commits_per_day": 2.5,
            },
            "token_summary": {
                "total_tokens": 500000,
                "prompt_tokens": 300000,
                "completion_tokens": 200000,
                "avg_per_day": 25000.0,
            },
            "bug_summary": {
                "total_bugs": 5,
                "critical_bugs": 1,
                "bug_rate": 0.25,
                "resolved_bugs": 4,
            },
            "period_days": 7,
            "start_date": "2024-01-01",
            "end_date": "2024-01-07",
        }

        response = PersonalDashboardResponse(**data)

        assert response.user_id == 1
        assert response.username == "testuser"
        assert response.period_days == 7
        assert response.start_date == date(2024, 1, 1)
        assert response.end_date == date(2024, 1, 7)

    def test_personal_dashboard_response_missing_required_fields(self):
        """Test that missing required fields raise ValidationError."""
        # Missing user_id
        with pytest.raises(ValidationError) as exc_info:
            PersonalDashboardResponse(
                username="testuser",
                code_summary={},
                token_summary={},
                bug_summary={},
                period_days=30,
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )
        assert "user_id" in str(exc_info.value)

        # Missing username
        with pytest.raises(ValidationError) as exc_info:
            PersonalDashboardResponse(
                user_id=1,
                code_summary={},
                token_summary={},
                bug_summary={},
                period_days=30,
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )
        assert "username" in str(exc_info.value)

    def test_personal_dashboard_response_empty_summaries(self):
        """Test creating PersonalDashboardResponse with empty summaries."""
        data = {
            "user_id": 1,
            "username": "testuser",
            "code_summary": {},
            "token_summary": {},
            "bug_summary": {},
            "period_days": 30,
            "start_date": date(2024, 1, 1),
            "end_date": date(2024, 1, 31),
        }

        response = PersonalDashboardResponse(**data)

        assert response.user_id == 1
        assert response.username == "testuser"
        assert response.code_summary == {}
        assert response.token_summary == {}
        assert response.bug_summary == {}

    def test_personal_dashboard_response_serialization(self):
        """Test serialization of PersonalDashboardResponse."""
        data = {
            "user_id": 1,
            "username": "testuser",
            "code_summary": {"total_commits": 100},
            "token_summary": {"total_tokens": 1000000},
            "bug_summary": {"total_bugs": 10},
            "period_days": 30,
            "start_date": date(2024, 1, 1),
            "end_date": date(2024, 1, 31),
        }

        response = PersonalDashboardResponse(**data)
        serialized = response.model_dump()

        assert serialized["user_id"] == 1
        assert serialized["username"] == "testuser"
        assert serialized["code_summary"]["total_commits"] == 100
        assert serialized["token_summary"]["total_tokens"] == 1000000
        assert serialized["bug_summary"]["total_bugs"] == 10
        assert serialized["period_days"] == 30
        assert serialized["start_date"] == date(2024, 1, 1)
        assert serialized["end_date"] == date(2024, 1, 31)

    def test_personal_dashboard_response_json_serialization(self):
        """Test JSON serialization of PersonalDashboardResponse."""
        data = {
            "user_id": 1,
            "username": "testuser",
            "code_summary": {"total_commits": 100},
            "token_summary": {"total_tokens": 1000000},
            "bug_summary": {"total_bugs": 10},
            "period_days": 30,
            "start_date": date(2024, 1, 1),
            "end_date": date(2024, 1, 31),
        }

        response = PersonalDashboardResponse(**data)
        json_str = response.model_dump_json()

        assert "testuser" in json_str
        assert "100" in json_str
        assert "1000000" in json_str
        assert "10" in json_str
