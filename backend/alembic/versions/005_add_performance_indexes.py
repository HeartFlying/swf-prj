"""Add performance indexes for large dataset queries.

Revision ID: 005
Revises: 004
Create Date: 2026-04-01 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance indexes for optimized queries."""

    # CodeCommit indexes for time-based queries
    op.create_index(
        "idx_code_commits_user_project_time",
        "code_commits",
        ["user_id", "project_id", "commit_time"],
    )
    op.create_index(
        "idx_code_commits_project_user_time",
        "code_commits",
        ["project_id", "user_id", "commit_time"],
    )

    # TokenUsage indexes for date-based aggregations
    op.create_index(
        "idx_token_usage_user_date",
        "token_usage",
        ["user_id", "usage_date"],
    )
    op.create_index(
        "idx_token_usage_project_date",
        "token_usage",
        ["project_id", "usage_date"],
    )
    op.create_index(
        "idx_token_usage_date_platform",
        "token_usage",
        ["usage_date", "platform"],
    )

    # BugRecord indexes for status and date queries
    op.create_index(
        "idx_bug_records_user_created",
        "bug_records",
        ["assignee_id", "created_at"],
    )
    op.create_index(
        "idx_bug_records_project_created",
        "bug_records",
        ["project_id", "created_at"],
    )
    op.create_index(
        "idx_bug_records_status_created",
        "bug_records",
        ["status", "created_at"],
    )
    op.create_index(
        "idx_bug_records_severity_created",
        "bug_records",
        ["severity", "created_at"],
    )

    # MergeRequest indexes for performance
    op.create_index(
        "idx_merge_requests_project_state",
        "merge_requests",
        ["project_id", "state"],
    )
    op.create_index(
        "idx_merge_requests_author_created",
        "merge_requests",
        ["author_id", "created_at"],
    )

    # TaskRecord indexes
    op.create_index(
        "idx_task_records_user_created",
        "task_records",
        ["assignee_id", "created_at"],
    )
    op.create_index(
        "idx_task_records_project_created",
        "task_records",
        ["project_id", "created_at"],
    )

    # AISuggestion indexes
    op.create_index(
        "idx_ai_suggestions_user_created",
        "ai_suggestions",
        ["user_id", "created_at"],
    )
    op.create_index(
        "idx_ai_suggestions_project_created",
        "ai_suggestions",
        ["project_id", "created_at"],
    )


def downgrade() -> None:
    """Remove performance indexes."""

    # Drop AISuggestion indexes
    op.drop_index("idx_ai_suggestions_project_created", table_name="ai_suggestions")
    op.drop_index("idx_ai_suggestions_user_created", table_name="ai_suggestions")

    # Drop TaskRecord indexes
    op.drop_index("idx_task_records_project_created", table_name="task_records")
    op.drop_index("idx_task_records_user_created", table_name="task_records")

    # Drop MergeRequest indexes
    op.drop_index("idx_merge_requests_author_created", table_name="merge_requests")
    op.drop_index("idx_merge_requests_project_state", table_name="merge_requests")

    # Drop BugRecord indexes
    op.drop_index("idx_bug_records_severity_created", table_name="bug_records")
    op.drop_index("idx_bug_records_status_created", table_name="bug_records")
    op.drop_index("idx_bug_records_project_created", table_name="bug_records")
    op.drop_index("idx_bug_records_user_created", table_name="bug_records")

    # Drop TokenUsage indexes
    op.drop_index("idx_token_usage_date_platform", table_name="token_usage")
    op.drop_index("idx_token_usage_project_date", table_name="token_usage")
    op.drop_index("idx_token_usage_user_date", table_name="token_usage")

    # Drop CodeCommit indexes
    op.drop_index("idx_code_commits_project_user_time", table_name="code_commits")
    op.drop_index("idx_code_commits_user_project_time", table_name="code_commits")
