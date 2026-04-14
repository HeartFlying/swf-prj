"""Tests for ProjectMember schema validation."""

from datetime import datetime

import pytest
from pydantic import ValidationError

from app.schemas.project import ProjectMemberResponse, ProjectMemberCreate


class TestProjectMemberResponseRole:
    """Test cases for ProjectMemberResponse role field validation."""

    def test_role_with_valid_values(self):
        """Test that valid role values are accepted."""
        valid_roles = ["owner", "maintainer", "developer", "member"]

        for role in valid_roles:
            member = ProjectMemberResponse(
                id=1,
                project_id=1,
                user_id=1,
                role=role,
                joined_at=datetime.now(),
            )
            assert member.role == role

    def test_role_with_invalid_value(self):
        """Test that invalid role values are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ProjectMemberResponse(
                id=1,
                project_id=1,
                user_id=1,
                role="invalid_role",
                joined_at=datetime.now(),
            )

        error = exc_info.value
        assert "role" in str(error)

    def test_role_with_tech_lead_value(self):
        """Test that 'tech_lead' role value is rejected (not in enum)."""
        with pytest.raises(ValidationError) as exc_info:
            ProjectMemberResponse(
                id=1,
                project_id=1,
                user_id=1,
                role="tech_lead",
                joined_at=datetime.now(),
            )

        error = exc_info.value
        assert "role" in str(error)

    def test_role_default_value(self):
        """Test that role has correct default when inherited from base."""
        # ProjectMemberCreate has default "developer"
        member = ProjectMemberCreate(
            user_id=1,
        )
        assert member.role == "developer"


class TestProjectMemberCreateRole:
    """Test cases for ProjectMemberCreate role field validation."""

    def test_create_with_valid_roles(self):
        """Test creating member with valid role values."""
        valid_roles = ["owner", "maintainer", "developer", "member"]

        for role in valid_roles:
            member = ProjectMemberCreate(
                user_id=1,
                role=role,
            )
            assert member.role == role

    def test_create_with_invalid_role(self):
        """Test that creating member with invalid role fails."""
        with pytest.raises(ValidationError) as exc_info:
            ProjectMemberCreate(
                user_id=1,
                role="admin",  # Invalid role
            )

        error = exc_info.value
        assert "role" in str(error)
