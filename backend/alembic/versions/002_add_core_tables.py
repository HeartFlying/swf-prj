"""Add core tables for Coding Agent Stats Platform.

Revision ID: 002
Revises: 001
Create Date: 2026-03-28 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create core tables for the stats platform."""
    # Create enum types for PostgreSQL
    # Note: SQLite doesn't support enum types, so we use String columns
    # The application layer handles enum validation

    # Create user_accounts table (replacing user_platform_accounts)
    op.create_table(
        "user_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("platform", sa.String(length=20), nullable=False),
        sa.Column("account_id", sa.String(length=100), nullable=False),
        sa.Column("account_name", sa.String(length=100), nullable=True),
        sa.Column("api_token_encrypted", sa.LargeBinary(), nullable=True),
        sa.Column("is_default", sa.Boolean(), default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for user_accounts
    op.create_index("idx_user_accounts_user_id", "user_accounts", ["user_id"])
    op.create_index("idx_user_accounts_platform", "user_accounts", ["platform"])
    op.create_index(
        "idx_user_accounts_user_platform",
        "user_accounts",
        ["user_id", "platform"],
        unique=True,
    )

    # Create foreign key for user_accounts
    op.create_foreign_key(
        "fk_user_accounts_user",
        "user_accounts",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Create code_commits table
    op.create_table(
        "code_commits",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("commit_hash", sa.String(length=64), nullable=False),
        sa.Column("additions", sa.Integer(), default=0, nullable=False),
        sa.Column("deletions", sa.Integer(), default=0, nullable=False),
        sa.Column("language", sa.String(length=20), nullable=False),
        sa.Column("file_count", sa.Integer(), default=0, nullable=False),
        sa.Column("commit_message", sa.Text(), nullable=True),
        sa.Column("commit_time", sa.DateTime(), nullable=False),
        sa.Column("is_ai_generated", sa.Boolean(), default=False, nullable=False),
        sa.Column("ai_suggestion_ids", sa.JSON(), nullable=True),
        sa.Column("branch_name", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for code_commits
    op.create_index("idx_code_commits_user_id", "code_commits", ["user_id"])
    op.create_index("idx_code_commits_project_id", "code_commits", ["project_id"])
    op.create_index("idx_code_commits_language", "code_commits", ["language"])
    op.create_index("idx_code_commits_is_ai_generated", "code_commits", ["is_ai_generated"])
    op.create_index("idx_code_commits_commit_time", "code_commits", ["commit_time"])
    op.create_index(
        "idx_code_commits_user_time", "code_commits", ["user_id", "commit_time"]
    )
    op.create_index(
        "idx_code_commits_project_time", "code_commits", ["project_id", "commit_time"]
    )
    op.create_index(
        "idx_code_commits_hash_project",
        "code_commits",
        ["commit_hash", "project_id"],
        unique=True,
    )

    # Create foreign keys for code_commits
    op.create_foreign_key(
        "fk_code_commits_user",
        "code_commits",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_code_commits_project",
        "code_commits",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Create token_usage table
    op.create_table(
        "token_usage",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("platform", sa.String(length=20), nullable=False),
        sa.Column("token_count", sa.Integer(), default=0, nullable=False),
        sa.Column("api_calls", sa.Integer(), default=0, nullable=False),
        sa.Column("usage_date", sa.Date(), nullable=False),
        sa.Column("model", sa.String(length=50), nullable=True),
        sa.Column("cost", sa.Numeric(10, 4), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for token_usage
    op.create_index("idx_token_usage_user_id", "token_usage", ["user_id"])
    op.create_index("idx_token_usage_project_id", "token_usage", ["project_id"])
    op.create_index("idx_token_usage_platform", "token_usage", ["platform"])
    op.create_index("idx_token_usage_usage_date", "token_usage", ["usage_date"])
    op.create_index(
        "idx_token_usage_user_platform_date",
        "token_usage",
        ["user_id", "platform", "usage_date"],
        unique=True,
    )

    # Create foreign keys for token_usage
    op.create_foreign_key(
        "fk_token_usage_user",
        "token_usage",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_token_usage_project",
        "token_usage",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create bug_records table
    op.create_table(
        "bug_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("assignee_id", sa.Integer(), nullable=True),
        sa.Column("reporter_id", sa.Integer(), nullable=True),
        sa.Column("zendao_bug_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("priority", sa.String(length=20), nullable=True),
        sa.Column("status", sa.String(length=20), default="new", nullable=False),
        sa.Column("type", sa.String(length=20), default="bug", nullable=False),
        sa.Column("module", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.Column("resolution", sa.String(length=200), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for bug_records
    op.create_index("idx_bug_records_project_id", "bug_records", ["project_id"])
    op.create_index("idx_bug_records_assignee_id", "bug_records", ["assignee_id"])
    op.create_index("idx_bug_records_reporter_id", "bug_records", ["reporter_id"])
    op.create_index("idx_bug_records_severity", "bug_records", ["severity"])
    op.create_index("idx_bug_records_status", "bug_records", ["status"])
    op.create_index("idx_bug_records_created_at", "bug_records", ["created_at"])
    op.create_index("idx_bug_records_zendao_bug_id", "bug_records", ["zendao_bug_id"])
    op.create_index(
        "idx_bug_records_project_status_severity",
        "bug_records",
        ["project_id", "status", "severity"],
    )
    op.create_index(
        "idx_bug_records_assignee_status", "bug_records", ["assignee_id", "status"]
    )

    # Create unique constraint for zendao_bug_id
    op.create_unique_constraint(
        "uq_bug_records_zendao_id", "bug_records", ["zendao_bug_id"]
    )

    # Create foreign keys for bug_records
    op.create_foreign_key(
        "fk_bug_records_project",
        "bug_records",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_bug_records_assignee",
        "bug_records",
        "users",
        ["assignee_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_bug_records_reporter",
        "bug_records",
        "users",
        ["reporter_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create ai_suggestions table
    op.create_table(
        "ai_suggestions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("platform", sa.String(length=20), nullable=False),
        sa.Column("suggestion_type", sa.String(length=30), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("language", sa.String(length=20), nullable=True),
        sa.Column("file_path", sa.String(length=500), nullable=True),
        sa.Column("line_number", sa.Integer(), nullable=True),
        sa.Column("token_cost", sa.Integer(), nullable=True),
        sa.Column("is_accepted", sa.Boolean(), default=False, nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.Column("commit_hash", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for ai_suggestions
    op.create_index("idx_ai_suggestions_user_id", "ai_suggestions", ["user_id"])
    op.create_index("idx_ai_suggestions_project_id", "ai_suggestions", ["project_id"])
    op.create_index("idx_ai_suggestions_platform", "ai_suggestions", ["platform"])
    op.create_index("idx_ai_suggestions_type", "ai_suggestions", ["suggestion_type"])
    op.create_index("idx_ai_suggestions_is_accepted", "ai_suggestions", ["is_accepted"])
    op.create_index("idx_ai_suggestions_created_at", "ai_suggestions", ["created_at"])

    # Create foreign keys for ai_suggestions
    op.create_foreign_key(
        "fk_ai_suggestions_user",
        "ai_suggestions",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_ai_suggestions_project",
        "ai_suggestions",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create data_sources table
    op.create_table(
        "data_sources",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("source_type", sa.String(length=20), nullable=False),
        sa.Column("source_name", sa.String(length=100), nullable=False),
        sa.Column("config", sa.JSON(), default=dict, nullable=False),
        sa.Column("credentials_encrypted", sa.LargeBinary(), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("last_sync_at", sa.DateTime(), nullable=True),
        sa.Column("sync_frequency", sa.String(length=20), default="daily", nullable=False),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for data_sources
    op.create_index("idx_data_sources_project_id", "data_sources", ["project_id"])
    op.create_index("idx_data_sources_source_type", "data_sources", ["source_type"])
    op.create_index("idx_data_sources_is_active", "data_sources", ["is_active"])

    # Create foreign key for data_sources
    op.create_foreign_key(
        "fk_data_sources_project",
        "data_sources",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Create task_records table
    op.create_table(
        "task_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("assignee_id", sa.Integer(), nullable=True),
        sa.Column("creator_id", sa.Integer(), nullable=True),
        sa.Column("zendao_task_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("type", sa.String(length=20), default="misc", nullable=False),
        sa.Column("status", sa.String(length=20), default="wait", nullable=False),
        sa.Column("priority", sa.String(length=20), nullable=True),
        sa.Column("module", sa.String(length=100), nullable=True),
        sa.Column("story_id", sa.Integer(), nullable=True),
        sa.Column("estimate", sa.Numeric(10, 2), default=0.0, nullable=False),
        sa.Column("consumed", sa.Numeric(10, 2), default=0.0, nullable=False),
        sa.Column("left", sa.Numeric(10, 2), default=0.0, nullable=False),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.Column("canceled_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for task_records
    op.create_index("idx_task_records_project_id", "task_records", ["project_id"])
    op.create_index("idx_task_records_assignee_id", "task_records", ["assignee_id"])
    op.create_index("idx_task_records_creator_id", "task_records", ["creator_id"])
    op.create_index("idx_task_records_status", "task_records", ["status"])
    op.create_index("idx_task_records_type", "task_records", ["type"])
    op.create_index("idx_task_records_created_at", "task_records", ["created_at"])
    op.create_index("idx_task_records_zendao_task_id", "task_records", ["zendao_task_id"])
    op.create_index("idx_task_records_project_status", "task_records", ["project_id", "status"])
    op.create_index("idx_task_records_assignee_status", "task_records", ["assignee_id", "status"])

    # Create foreign keys for task_records
    op.create_foreign_key(
        "fk_task_records_project",
        "task_records",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_task_records_assignee",
        "task_records",
        "users",
        ["assignee_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_task_records_creator",
        "task_records",
        "users",
        ["creator_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create unique constraint for zendao_task_id
    op.create_unique_constraint("uq_task_records_zendao_id", "task_records", ["zendao_task_id"])

    # Create sync_tasks table
    op.create_table(
        "sync_tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_type", sa.String(length=30), nullable=False),
        sa.Column("source_type", sa.String(length=20), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), default="pending", nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("records_processed", sa.Integer(), default=0, nullable=False),
        sa.Column("records_failed", sa.Integer(), default=0, nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for sync_tasks
    op.create_index("idx_sync_tasks_task_type", "sync_tasks", ["task_type"])
    op.create_index("idx_sync_tasks_source_type", "sync_tasks", ["source_type"])
    op.create_index("idx_sync_tasks_project_id", "sync_tasks", ["project_id"])
    op.create_index("idx_sync_tasks_status", "sync_tasks", ["status"])
    op.create_index("idx_sync_tasks_created_at", "sync_tasks", ["created_at"])
    op.create_index(
        "idx_sync_tasks_status_created", "sync_tasks", ["status", "created_at"]
    )

    # Create foreign key for sync_tasks
    op.create_foreign_key(
        "fk_sync_tasks_project",
        "sync_tasks",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create stats_snapshots table
    op.create_table(
        "stats_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("snapshot_type", sa.String(length=50), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("metrics", sa.JSON(), default=dict, nullable=False),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for stats_snapshots
    op.create_index("idx_stats_snapshots_type", "stats_snapshots", ["snapshot_type"])
    op.create_index("idx_stats_snapshots_date", "stats_snapshots", ["snapshot_date"])
    op.create_index("idx_stats_snapshots_project_id", "stats_snapshots", ["project_id"])
    op.create_index("idx_stats_snapshots_user_id", "stats_snapshots", ["user_id"])
    op.create_index(
        "idx_stats_snapshots_type_date_project_user",
        "stats_snapshots",
        ["snapshot_type", "snapshot_date", "project_id", "user_id"],
        unique=True,
    )

    # Create foreign keys for stats_snapshots
    op.create_foreign_key(
        "fk_stats_snapshots_project",
        "stats_snapshots",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_stats_snapshots_user",
        "stats_snapshots",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Add new columns to existing tables
    # Add columns to projects table
    op.add_column("projects", sa.Column("gitlab_repo_id", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("gitlab_repo_url", sa.String(length=500), nullable=True))
    op.add_column("projects", sa.Column("zendao_project_id", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("zendao_project_key", sa.String(length=50), nullable=True))

    # Create indexes for new project columns
    op.create_index("idx_projects_gitlab_repo_id", "projects", ["gitlab_repo_id"])
    op.create_index("idx_projects_zendao_project_id", "projects", ["zendao_project_id"])


def downgrade() -> None:
    """Drop core tables."""
    # Drop new columns from projects
    op.drop_index("idx_projects_zendao_project_id", table_name="projects")
    op.drop_index("idx_projects_gitlab_repo_id", table_name="projects")
    op.drop_column("projects", "zendao_project_key")
    op.drop_column("projects", "zendao_project_id")
    op.drop_column("projects", "gitlab_repo_url")
    op.drop_column("projects", "gitlab_repo_id")

    # Drop tables in reverse order
    op.drop_table("stats_snapshots")
    op.drop_table("sync_tasks")
    op.drop_table("task_records")
    op.drop_table("data_sources")
    op.drop_table("ai_suggestions")
    op.drop_table("bug_records")
    op.drop_table("token_usage")
    op.drop_table("code_commits")
    op.drop_table("user_accounts")
