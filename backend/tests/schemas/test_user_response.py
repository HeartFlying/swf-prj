"""Tests for UserResponse schema.

TDD Red Phase: Write tests before implementation.
"""

import pytest
from app.schemas.user import UserResponse, RoleResponse
from app.db.models import User, Role


class TestUserResponseFromUser:
    """Tests for UserResponse.from_user class method."""

    def test_from_user_with_role(self):
        """Test building UserResponse from user with role."""
        # Create a role
        role = Role(
            id=1,
            name="admin",
            description="Administrator",
            permissions=["*", "admin"],
        )

        # Create a user with role
        user = User(
            id=1,
            username="testuser",
            email="test@example.com",
            password_hash="hashed_password",
            department="IT",
            is_active=True,
            role_id=1,
        )
        user.role = role

        # Build UserResponse using from_user
        response = UserResponse.from_user(user)

        # Verify response
        assert response.id == user.id
        assert response.username == user.username
        assert response.email == user.email
        assert response.department == user.department
        assert response.is_active == user.is_active
        assert response.role_id == user.role_id
        assert response.role is not None
        assert response.role.id == role.id
        assert response.role.name == role.name
        assert response.role.description == role.description
        assert response.role.permissions == role.permissions

    def test_from_user_without_role(self):
        """Test building UserResponse from user without role."""
        # Create a user without role
        user = User(
            id=2,
            username="testuser2",
            email="test2@example.com",
            password_hash="hashed_password",
            department="Engineering",
            is_active=True,
            role_id=None,
        )
        user.role = None

        # Build UserResponse using from_user
        response = UserResponse.from_user(user)

        # Verify response
        assert response.id == user.id
        assert response.username == user.username
        assert response.email == user.email
        assert response.department == user.department
        assert response.is_active == user.is_active
        assert response.role_id is None
        assert response.role is None

    def test_from_user_with_empty_department(self):
        """Test building UserResponse from user with empty department."""
        # Create a user with empty department
        user = User(
            id=3,
            username="testuser3",
            email="test3@example.com",
            password_hash="hashed_password",
            department="",
            is_active=False,
            role_id=None,
        )
        user.role = None

        # Build UserResponse using from_user
        response = UserResponse.from_user(user)

        # Verify response
        assert response.id == user.id
        assert response.username == user.username
        assert response.email == user.email
        assert response.department == ""  # Empty department should be preserved
        assert response.is_active is False
        assert response.role_id is None
        assert response.role is None

    def test_from_user_role_with_none_permissions(self):
        """Test building UserResponse when role has None permissions."""
        # Create a role with None permissions
        role = Role(
            id=2,
            name="user",
            description="Regular user",
            permissions=None,
        )

        # Create a user with role
        user = User(
            id=4,
            username="testuser4",
            email="test4@example.com",
            password_hash="hashed_password",
            department="Sales",
            is_active=True,
            role_id=2,
        )
        user.role = role

        # Build UserResponse using from_user
        response = UserResponse.from_user(user)

        # Verify response - permissions should default to empty list
        assert response.role is not None
        assert response.role.permissions == []
