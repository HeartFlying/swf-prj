"""Database models for Coding Agent Stats Platform.

TDD Green Phase: Implement models to make tests pass.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    """User model for system authentication."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(50), nullable=False)
    role_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("roles.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    role: Mapped[Optional["Role"]] = relationship("Role", back_populates="users")
    project_memberships: Mapped[List["ProjectMember"]] = relationship(
        "ProjectMember", back_populates="user"
    )
    platform_accounts: Mapped[List["UserAccount"]] = relationship(
        "UserAccount", back_populates="user", cascade="all, delete-orphan"
    )
    code_commits: Mapped[List["CodeCommit"]] = relationship(
        "CodeCommit", back_populates="user", cascade="all, delete-orphan"
    )
    token_usage: Mapped[List["TokenUsage"]] = relationship(
        "TokenUsage", back_populates="user", cascade="all, delete-orphan"
    )
    ai_suggestions: Mapped[List["AISuggestion"]] = relationship(
        "AISuggestion", back_populates="user", cascade="all, delete-orphan"
    )
    assigned_bugs: Mapped[List["BugRecord"]] = relationship(
        "BugRecord", foreign_keys="BugRecord.assignee_id", back_populates="assignee"
    )
    reported_bugs: Mapped[List["BugRecord"]] = relationship(
        "BugRecord", foreign_keys="BugRecord.reporter_id", back_populates="reporter"
    )
    assigned_tasks: Mapped[List["TaskRecord"]] = relationship(
        "TaskRecord", foreign_keys="TaskRecord.assignee_id", back_populates="assignee"
    )
    created_tasks: Mapped[List["TaskRecord"]] = relationship(
        "TaskRecord", foreign_keys="TaskRecord.creator_id", back_populates="creator"
    )
    authored_merge_requests: Mapped[List["MergeRequest"]] = relationship(
        "MergeRequest", foreign_keys="MergeRequest.author_id", back_populates="author"
    )
    assigned_merge_requests: Mapped[List["MergeRequest"]] = relationship(
        "MergeRequest", foreign_keys="MergeRequest.assignee_id", back_populates="assignee"
    )
    merged_merge_requests: Mapped[List["MergeRequest"]] = relationship(
        "MergeRequest", foreign_keys="MergeRequest.merged_by_id", back_populates="merged_by"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username})>"


class Role(Base):
    """Role model for permission management."""

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    permissions: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="role")

    def __repr__(self) -> str:
        return f"<Role(id={self.id}, name={self.name})>"


class Project(Base):
    """Project model for project management."""

    __tablename__ = "projects"

    # Project stage enum values
    STAGE_ENUM = ["调研", "立项", "需求", "设计", "研发", "验收", "发布", "运维"]
    STATUS_ENUM = ["active", "archived", "cancelled"]

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stage: Mapped[str] = mapped_column(String(20), nullable=False, default="研发")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    manager_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    gitlab_repo_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gitlab_repo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    zendao_project_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    zendao_project_key: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    gitlab_last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    zendao_last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    members: Mapped[List["ProjectMember"]] = relationship(
        "ProjectMember", back_populates="project", cascade="all, delete-orphan"
    )
    code_commits: Mapped[List["CodeCommit"]] = relationship(
        "CodeCommit", back_populates="project", cascade="all, delete-orphan"
    )
    merge_requests: Mapped[List["MergeRequest"]] = relationship(
        "MergeRequest", back_populates="project", cascade="all, delete-orphan"
    )
    token_usage: Mapped[List["TokenUsage"]] = relationship(
        "TokenUsage", back_populates="project", cascade="all, delete-orphan"
    )
    bug_records: Mapped[List["BugRecord"]] = relationship(
        "BugRecord", back_populates="project", cascade="all, delete-orphan"
    )
    task_records: Mapped[List["TaskRecord"]] = relationship(
        "TaskRecord", back_populates="project", cascade="all, delete-orphan"
    )
    ai_suggestions: Mapped[List["AISuggestion"]] = relationship(
        "AISuggestion", back_populates="project", cascade="all, delete-orphan"
    )
    data_sources: Mapped[List["DataSource"]] = relationship(
        "DataSource", back_populates="project", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, code={self.code}, name={self.name})>"


class ProjectMember(Base):
    """Project membership model linking users to projects."""

    __tablename__ = "project_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="member")
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    left_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="project_memberships")
    project: Mapped["Project"] = relationship("Project", back_populates="members")

    # Indexes
    __table_args__ = (
        Index("idx_project_member_user_project", "user_id", "project_id", unique=True),
    )

    def __repr__(self) -> str:
        return f"<ProjectMember(id={self.id}, user_id={self.user_id}, project_id={self.project_id})>"


class UserAccount(Base):
    """User account mapping for external systems with encrypted API tokens.

    Replaces UserPlatformAccount with enhanced security features.
    """

    __tablename__ = "user_accounts"

    # Platform enum values
    PLATFORM_ENUM = ["trae", "gitlab", "zendao", "ali_coding"]

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    account_id: Mapped[str] = mapped_column(String(100), nullable=False)
    account_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    api_token_encrypted: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="platform_accounts")

    # Indexes
    __table_args__ = (
        Index("idx_user_accounts_user_platform", "user_id", "platform", unique=True),
        Index("idx_user_accounts_user_id", "user_id"),
        Index("idx_user_accounts_platform", "platform"),
    )

    def __repr__(self) -> str:
        return f"<UserAccount(id={self.id}, platform={self.platform}, account_id={self.account_id})>"


class MergeRequest(Base):
    """Merge request record for tracking code review activity."""

    __tablename__ = "merge_requests"

    # MR state enum values
    STATE_ENUM = ["opened", "closed", "merged", "locked"]

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    assignee_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    mr_id: Mapped[int] = mapped_column(Integer, nullable=False)  # GitLab MR ID
    iid: Mapped[int] = mapped_column(Integer, nullable=False)  # Project-specific MR number
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_branch: Mapped[str] = mapped_column(String(255), nullable=False)
    target_branch: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(20), nullable=False)
    merge_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    draft: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    work_in_progress: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    merged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    merged_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    additions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deletions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    commit_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    web_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_in_db_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="merge_requests")
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id], back_populates="authored_merge_requests")
    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_merge_requests")
    merged_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[merged_by_id], back_populates="merged_merge_requests")

    # Indexes
    __table_args__ = (
        Index("idx_merge_requests_project_id", "project_id"),
        Index("idx_merge_requests_author_id", "author_id"),
        Index("idx_merge_requests_assignee_id", "assignee_id"),
        Index("idx_merge_requests_state", "state"),
        Index("idx_merge_requests_created_at", "created_at"),
        Index("idx_merge_requests_merged_at", "merged_at"),
        Index("idx_merge_requests_mr_id_project", "mr_id", "project_id", unique=True),
    )

    def __repr__(self) -> str:
        return (
            f"<MergeRequest(id={self.id}, iid={self.iid}, "
            f"title={self.title[:30]}, state={self.state})>"
        )


class CodeCommit(Base):
    """Code commit record for tracking developer contributions.

    Partitioned by commit_time for performance with large datasets.
    """

    __tablename__ = "code_commits"

    # Language enum values
    LANGUAGE_ENUM = [
        "python", "javascript", "typescript", "java", "go", "rust",
        "c", "cpp", "csharp", "php", "ruby", "swift", "kotlin",
        "scala", "sql", "shell", "html", "css", "other"
    ]

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    commit_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    additions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deletions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    language: Mapped[str] = mapped_column(String(20), nullable=False)
    file_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    commit_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    commit_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ai_suggestion_ids: Mapped[Optional[List[int]]] = mapped_column(JSON, nullable=True)
    branch_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="code_commits")
    project: Mapped["Project"] = relationship("Project", back_populates="code_commits")

    # Indexes
    __table_args__ = (
        Index("idx_code_commits_user_id", "user_id"),
        Index("idx_code_commits_project_id", "project_id"),
        Index("idx_code_commits_language", "language"),
        Index("idx_code_commits_is_ai_generated", "is_ai_generated"),
        Index("idx_code_commits_commit_time", "commit_time"),
        Index("idx_code_commits_user_time", "user_id", "commit_time"),
        Index("idx_code_commits_project_time", "project_id", "commit_time"),
        Index("idx_code_commits_hash_project", "commit_hash", "project_id", unique=True),
        # Performance indexes for large dataset queries
        Index("idx_code_commits_user_project_time", "user_id", "project_id", "commit_time"),
        Index("idx_code_commits_project_user_time", "project_id", "user_id", "commit_time"),
    )

    def __repr__(self) -> str:
        return (
            f"<CodeCommit(id={self.id}, hash={self.commit_hash[:8]}, "
            f"project_id={self.project_id}, user_id={self.user_id})>"
        )


class TokenUsage(Base):
    """Token usage record for tracking AI platform consumption.

    Partitioned by usage_date for performance with large datasets.
    """

    __tablename__ = "token_usage"

    # Platform enum values
    PLATFORM_ENUM = ["trae", "ali_coding", "cursor", "copilot"]

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    project_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=True
    )
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    api_calls: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    usage_date: Mapped[date] = mapped_column(Date, nullable=False)
    model: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="token_usage")
    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="token_usage")

    # Indexes
    __table_args__ = (
        Index("idx_token_usage_user_id", "user_id"),
        Index("idx_token_usage_project_id", "project_id"),
        Index("idx_token_usage_platform", "platform"),
        Index("idx_token_usage_usage_date", "usage_date"),
        Index("idx_token_usage_user_platform_date", "user_id", "platform", "usage_date", unique=True),
        # Performance indexes for large dataset queries
        Index("idx_token_usage_user_date", "user_id", "usage_date"),
        Index("idx_token_usage_project_date", "project_id", "usage_date"),
        Index("idx_token_usage_date_platform", "usage_date", "platform"),
    )

    def __repr__(self) -> str:
        return (
            f"<TokenUsage(id={self.id}, user_id={self.user_id}, "
            f"platform={self.platform}, tokens={self.token_count})>"
        )


class BugRecord(Base):
    """Bug record for tracking issue resolution."""

    __tablename__ = "bug_records"

    # Severity enum values
    SEVERITY_ENUM = ["critical", "major", "normal", "minor", "trivial"]
    # Priority enum values
    PRIORITY_ENUM = ["urgent", "high", "medium", "low"]
    # Status enum values
    STATUS_ENUM = ["new", "assigned", "active", "resolved", "closed", "rejected"]

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    assignee_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    reporter_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    zendao_bug_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, unique=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    priority: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="new")
    type: Mapped[str] = mapped_column(String(20), default="bug", nullable=False)
    module: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="bug_records")
    assignee: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[assignee_id], back_populates="assigned_bugs"
    )
    reporter: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[reporter_id], back_populates="reported_bugs"
    )

    # Indexes
    __table_args__ = (
        Index("idx_bug_records_project_id", "project_id"),
        Index("idx_bug_records_assignee_id", "assignee_id"),
        Index("idx_bug_records_reporter_id", "reporter_id"),
        Index("idx_bug_records_severity", "severity"),
        Index("idx_bug_records_status", "status"),
        Index("idx_bug_records_created_at", "created_at"),
        Index("idx_bug_records_zendao_bug_id", "zendao_bug_id"),
        Index("idx_bug_records_project_status_severity", "project_id", "status", "severity"),
        Index("idx_bug_records_assignee_status", "assignee_id", "status"),
        # Performance indexes for large dataset queries
        Index("idx_bug_records_user_created", "assignee_id", "created_at"),
        Index("idx_bug_records_project_created", "project_id", "created_at"),
        Index("idx_bug_records_status_created", "status", "created_at"),
        Index("idx_bug_records_severity_created", "severity", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<BugRecord(id={self.id}, title={self.title[:30]}, "
            f"severity={self.severity}, status={self.status})>"
        )


class TaskRecord(Base):
    """Task record for tracking task execution."""

    __tablename__ = "task_records"

    # Priority enum values
    PRIORITY_ENUM = ["urgent", "high", "medium", "low"]
    # Status enum values
    STATUS_ENUM = ["wait", "doing", "done", "pause", "cancel", "closed"]
    # Type enum values
    TYPE_ENUM = ["design", "devel", "test", "study", "discuss", "ui", "affair", "misc"]

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    assignee_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    creator_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    zendao_task_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(20), default="misc", nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="wait")
    priority: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    module: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    story_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    estimate: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    consumed: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    left: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    canceled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="task_records")
    assignee: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[assignee_id], back_populates="assigned_tasks"
    )
    creator: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[creator_id], back_populates="created_tasks"
    )

    # Indexes
    __table_args__ = (
        Index("idx_task_records_project_id", "project_id"),
        Index("idx_task_records_assignee_id", "assignee_id"),
        Index("idx_task_records_creator_id", "creator_id"),
        Index("idx_task_records_status", "status"),
        Index("idx_task_records_type", "type"),
        Index("idx_task_records_created_at", "created_at"),
        Index("idx_task_records_zendao_task_id", "zendao_task_id"),
        Index("idx_task_records_project_status", "project_id", "status"),
        Index("idx_task_records_assignee_status", "assignee_id", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<TaskRecord(id={self.id}, name={self.name[:30]}, "
            f"type={self.type}, status={self.status})>"
        )


class AISuggestion(Base):
    """AI suggestion record for tracking AI-generated code suggestions."""

    __tablename__ = "ai_suggestions"

    # Suggestion type enum values
    SUGGESTION_TYPE_ENUM = [
        "code_completion", "code_generation", "refactoring", "bug_fix", "explanation"
    ]

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    project_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=True
    )
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    suggestion_type: Mapped[str] = mapped_column(String(30), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    line_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    token_cost: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    commit_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="ai_suggestions")
    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="ai_suggestions")

    # Indexes
    __table_args__ = (
        Index("idx_ai_suggestions_user_id", "user_id"),
        Index("idx_ai_suggestions_project_id", "project_id"),
        Index("idx_ai_suggestions_platform", "platform"),
        Index("idx_ai_suggestions_type", "suggestion_type"),
        Index("idx_ai_suggestions_is_accepted", "is_accepted"),
        Index("idx_ai_suggestions_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<AISuggestion(id={self.id}, type={self.suggestion_type}, "
            f"accepted={self.is_accepted})>"
        )


class DataSource(Base):
    """Data source configuration for external integrations."""

    __tablename__ = "data_sources"

    # Source type enum values
    SOURCE_TYPE_ENUM = ["gitlab", "zendao"]
    # Sync frequency enum values
    SYNC_FREQUENCY_ENUM = ["daily", "hourly", "realtime"]

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    credentials_encrypted: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sync_frequency: Mapped[str] = mapped_column(String(20), default="daily", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="data_sources")

    # Indexes
    __table_args__ = (
        Index("idx_data_sources_project_id", "project_id"),
        Index("idx_data_sources_source_type", "source_type"),
        Index("idx_data_sources_is_active", "is_active"),
    )

    def __repr__(self) -> str:
        return (
            f"<DataSource(id={self.id}, type={self.source_type}, "
            f"name={self.source_name}, active={self.is_active})>"
        )


class SyncTask(Base):
    """Sync task record for tracking data synchronization jobs.

    Replaces in-memory storage with persistent database records.
    """

    __tablename__ = "sync_tasks"

    # Task type enum values
    TASK_TYPE_ENUM = ["full_sync", "incremental_sync", "config_sync"]
    # Task status enum values
    STATUS_ENUM = ["pending", "running", "completed", "failed", "cancelled"]

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_type: Mapped[str] = mapped_column(String(30), nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    project_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=True
    )
    parent_task_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("sync_tasks.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    records_processed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Indexes
    __table_args__ = (
        Index("idx_sync_tasks_task_type", "task_type"),
        Index("idx_sync_tasks_source_type", "source_type"),
        Index("idx_sync_tasks_project_id", "project_id"),
        Index("idx_sync_tasks_parent_task_id", "parent_task_id"),
        Index("idx_sync_tasks_status", "status"),
        Index("idx_sync_tasks_created_at", "created_at"),
        Index("idx_sync_tasks_status_created", "status", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<SyncTask(id={self.id}, type={self.task_type}, "
            f"status={self.status}, source={self.source_type})>"
        )


class StatsSnapshot(Base):
    """Statistics snapshot for caching aggregated metrics.

    Stores pre-computed statistics for fast dashboard rendering.
    """

    __tablename__ = "stats_snapshots"

    # Snapshot type enum values
    SNAPSHOT_TYPE_ENUM = ["global", "project", "personal"]

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    snapshot_type: Mapped[str] = mapped_column(String(50), nullable=False)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    project_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=True
    )
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Indexes
    __table_args__ = (
        Index("idx_stats_snapshots_type", "snapshot_type"),
        Index("idx_stats_snapshots_date", "snapshot_date"),
        Index("idx_stats_snapshots_project_id", "project_id"),
        Index("idx_stats_snapshots_user_id", "user_id"),
        Index(
            "idx_stats_snapshots_type_date_project_user",
            "snapshot_type",
            "snapshot_date",
            "project_id",
            "user_id",
            unique=True,
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<StatsSnapshot(id={self.id}, type={self.snapshot_type}, "
            f"date={self.snapshot_date})>"
        )


class SyncLog(Base):
    """Sync log record for tracking task execution logs.

    Stores log messages from sync tasks for auditing and debugging.
    """

    __tablename__ = "sync_logs"

    # Log level enum values
    LEVEL_ENUM = ["debug", "info", "warning", "error", "critical"]

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sync_tasks.id"), nullable=False
    )
    level: Mapped[str] = mapped_column(String(20), nullable=False, default="info")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    task: Mapped["SyncTask"] = relationship("SyncTask", backref="logs")

    # Indexes
    __table_args__ = (
        Index("idx_sync_logs_task_id", "task_id"),
        Index("idx_sync_logs_level", "level"),
        Index("idx_sync_logs_created_at", "created_at"),
        Index("idx_sync_logs_task_level", "task_id", "level"),
    )

    def __repr__(self) -> str:
        return (
            f"<SyncLog(id={self.id}, task_id={self.task_id}, "
            f"level={self.level}, message={self.message[:30]})>"
        )


# Backwards compatibility alias
UserPlatformAccount = UserAccount
