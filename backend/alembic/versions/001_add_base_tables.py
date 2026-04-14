"""Add base tables (roles, users, projects) for Coding Agent Stats Platform.

Revision ID: 001
Revises:
Create Date: 2026-03-28 09:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create base tables: roles, users, projects, project_members."""
    # Create roles table
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=True),
        sa.Column("permissions", sa.JSON(), default=list, nullable=False),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_roles_name", "roles", ["name"], unique=True)

    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("department", sa.String(length=50), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_users_username", "users", ["username"], unique=True)
    op.create_index("idx_users_email", "users", ["email"], unique=True)
    op.create_index("idx_users_role_id", "users", ["role_id"])
    op.create_foreign_key(
        "fk_users_role",
        "users",
        "roles",
        ["role_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create projects table
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("stage", sa.String(length=20), default="研发", nullable=False),
        sa.Column("status", sa.String(length=20), default="active", nullable=False),
        sa.Column("manager_id", sa.Integer(), nullable=True),
        sa.Column("gitlab_repo_id", sa.Integer(), nullable=True),
        sa.Column("gitlab_repo_url", sa.String(length=500), nullable=True),
        sa.Column("zendao_project_id", sa.Integer(), nullable=True),
        sa.Column("zendao_project_key", sa.String(length=50), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column("last_sync_at", sa.DateTime(), nullable=True),
        sa.Column("gitlab_last_sync_at", sa.DateTime(), nullable=True),
        sa.Column("zendao_last_sync_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_projects_code", "projects", ["code"], unique=True)
    op.create_index("idx_projects_manager_id", "projects", ["manager_id"])
    op.create_index("idx_projects_gitlab_repo_id", "projects", ["gitlab_repo_id"])
    op.create_index("idx_projects_zendao_project_id", "projects", ["zendao_project_id"])
    op.create_foreign_key(
        "fk_projects_manager",
        "projects",
        "users",
        ["manager_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create project_members table
    op.create_table(
        "project_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=50), default="member", nullable=False),
        sa.Column("joined_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column("left_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_project_members_user_id", "project_members", ["user_id"])
    op.create_index("idx_project_members_project_id", "project_members", ["project_id"])
    op.create_index(
        "idx_project_member_user_project",
        "project_members",
        ["user_id", "project_id"],
        unique=True,
    )
    op.create_foreign_key(
        "fk_project_members_user",
        "project_members",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_project_members_project",
        "project_members",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Drop base tables."""
    op.drop_table("project_members")
    op.drop_table("projects")
    op.drop_table("users")
    op.drop_table("roles")
