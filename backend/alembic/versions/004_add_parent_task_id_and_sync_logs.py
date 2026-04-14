"""Add parent_task_id to sync_tasks and create sync_logs table

Revision ID: 004
Revises: 6ead83d9d18d
Create Date: 2026-03-31 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "6ead83d9d18d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add parent_task_id to sync_tasks and create sync_logs table."""
    # Add parent_task_id column to sync_tasks table
    op.add_column(
        "sync_tasks",
        sa.Column("parent_task_id", sa.Integer(), nullable=True)
    )

    # Create index for parent_task_id
    op.create_index(
        "idx_sync_tasks_parent_task_id",
        "sync_tasks",
        ["parent_task_id"]
    )

    # Create foreign key for parent_task_id (self-referencing)
    op.create_foreign_key(
        "fk_sync_tasks_parent",
        "sync_tasks",
        "sync_tasks",
        ["parent_task_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create sync_logs table
    op.create_table(
        "sync_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("level", sa.String(length=20), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for sync_logs
    op.create_index("idx_sync_logs_task_id", "sync_logs", ["task_id"])
    op.create_index("idx_sync_logs_level", "sync_logs", ["level"])
    op.create_index("idx_sync_logs_created_at", "sync_logs", ["created_at"])
    op.create_index("idx_sync_logs_task_level", "sync_logs", ["task_id", "level"])

    # Create foreign key for sync_logs.task_id
    op.create_foreign_key(
        "fk_sync_logs_task",
        "sync_logs",
        "sync_tasks",
        ["task_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Remove parent_task_id from sync_tasks and drop sync_logs table."""
    # Drop sync_logs table first (due to foreign key constraints)
    op.drop_index("idx_sync_logs_task_level", table_name="sync_logs")
    op.drop_index("idx_sync_logs_created_at", table_name="sync_logs")
    op.drop_index("idx_sync_logs_level", table_name="sync_logs")
    op.drop_index("idx_sync_logs_task_id", table_name="sync_logs")
    op.drop_table("sync_logs")

    # Drop parent_task_id from sync_tasks
    op.drop_constraint("fk_sync_tasks_parent", "sync_tasks", type_="foreignkey")
    op.drop_index("idx_sync_tasks_parent_task_id", table_name="sync_tasks")
    op.drop_column("sync_tasks", "parent_task_id")
