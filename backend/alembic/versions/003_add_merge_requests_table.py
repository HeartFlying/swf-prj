"""Add merge_requests table

Revision ID: 003
Revises: 002
Create Date: 2026-03-30 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create merge_requests table."""
    op.create_table(
        "merge_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("assignee_id", sa.Integer(), nullable=True),
        sa.Column("mr_id", sa.Integer(), nullable=False),
        sa.Column("iid", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source_branch", sa.String(length=255), nullable=False),
        sa.Column("target_branch", sa.String(length=255), nullable=False),
        sa.Column("state", sa.String(length=20), nullable=False),
        sa.Column("merge_status", sa.String(length=50), nullable=True),
        sa.Column("draft", sa.Boolean(), default=False, nullable=False),
        sa.Column("work_in_progress", sa.Boolean(), default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("merged_at", sa.DateTime(), nullable=True),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.Column("merged_by_id", sa.Integer(), nullable=True),
        sa.Column("additions", sa.Integer(), default=0, nullable=False),
        sa.Column("deletions", sa.Integer(), default=0, nullable=False),
        sa.Column("commit_count", sa.Integer(), default=0, nullable=False),
        sa.Column("web_url", sa.String(length=500), nullable=True),
        sa.Column("created_in_db_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for merge_requests
    op.create_index("idx_merge_requests_project_id", "merge_requests", ["project_id"])
    op.create_index("idx_merge_requests_author_id", "merge_requests", ["author_id"])
    op.create_index("idx_merge_requests_assignee_id", "merge_requests", ["assignee_id"])
    op.create_index("idx_merge_requests_state", "merge_requests", ["state"])
    op.create_index("idx_merge_requests_created_at", "merge_requests", ["created_at"])
    op.create_index("idx_merge_requests_merged_at", "merge_requests", ["merged_at"])
    op.create_index(
        "idx_merge_requests_mr_id_project",
        "merge_requests",
        ["mr_id", "project_id"],
        unique=True,
    )

    # Create foreign keys for merge_requests
    op.create_foreign_key(
        "fk_merge_requests_project",
        "merge_requests",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_merge_requests_author",
        "merge_requests",
        "users",
        ["author_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_merge_requests_assignee",
        "merge_requests",
        "users",
        ["assignee_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_merge_requests_merged_by",
        "merge_requests",
        "users",
        ["merged_by_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Drop merge_requests table."""
    op.drop_table("merge_requests")
