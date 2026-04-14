"""Sync schemas for request/response validation."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SyncTaskCreate(BaseModel):
    """Schema for creating a sync task."""

    source_type: str = Field(..., description="同步来源类型")
    project_ids: list[int] | None = Field(None, description="项目ID列表（为空则同步所有）")
    start_date: date | None = Field(None, description="开始日期")
    end_date: date | None = Field(None, description="结束日期")

    @model_validator(mode="after")
    def validate_date_range(self):
        """Validate that start_date is not after end_date."""
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("开始日期不能晚于结束日期")
        return self

    @model_validator(mode="after")
    def validate_source_type(self):
        """Validate that source_type is one of the allowed values."""
        valid_source_types = ["gitlab", "trae", "zendao"]
        if self.source_type not in valid_source_types:
            raise ValueError(f"Invalid source_type: {self.source_type}. Must be one of: {valid_source_types}")
        return self


class SyncGitLabRequest(BaseModel):
    """Schema for GitLab sync request."""

    project_id: int | None = Field(None, description="项目ID（为空则同步所有项目）")
    sync_type: str = Field(default="incremental_sync", description="同步类型: full_sync, incremental_sync")
    start_date: date | None = Field(None, description="开始日期")
    end_date: date | None = Field(None, description="结束日期")

    @model_validator(mode="after")
    def validate_date_range(self):
        """Validate that start_date is not after end_date."""
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("开始日期不能晚于结束日期")
        return self


class SyncTraeRequest(BaseModel):
    """Schema for Trae sync request."""

    user_id: int | None = Field(None, description="用户ID（为空则同步所有用户）")
    sync_type: str = Field(default="incremental_sync", description="同步类型: full_sync, incremental_sync")
    start_date: date | None = Field(None, description="开始日期")
    end_date: date | None = Field(None, description="结束日期")

    @model_validator(mode="after")
    def validate_date_range(self):
        """Validate that start_date is not after end_date."""
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("开始日期不能晚于结束日期")
        return self


class SyncZendaoRequest(BaseModel):
    """Schema for Zendao sync request."""

    project_id: int | None = Field(None, description="项目ID（为空则同步所有项目）")
    sync_type: str = Field(default="incremental_sync", description="同步类型: full_sync, incremental_sync")
    start_date: date | None = Field(None, description="开始日期")
    end_date: date | None = Field(None, description="结束日期")

    @model_validator(mode="after")
    def validate_date_range(self):
        """Validate that start_date is not after end_date."""
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("开始日期不能晚于结束日期")
        return self


class SyncTaskCreateResponse(BaseModel):
    """Schema for sync task creation response."""

    task_id: int = Field(..., description="任务ID")
    source: str = Field(..., description="同步来源")
    status: Literal["pending", "running", "completed", "failed"] = Field(..., description="任务状态")
    message: str | None = Field(None, description="状态消息")


class SyncTaskResponse(BaseModel):
    """Schema for sync task response."""

    task_id: int = Field(..., description="任务ID")
    source: str = Field(..., description="同步来源")
    status: Literal["pending", "running", "completed", "failed"] = Field(..., description="任务状态")
    message: str | None = Field(None, description="状态消息")


class SyncTaskInDB(BaseModel):
    """Schema for sync task in database with camelCase field names for frontend compatibility."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    task_type: str = Field(..., alias="taskType")
    source_type: str = Field(..., alias="sourceType")
    status: Literal["pending", "running", "completed", "failed"]
    project_id: int | None = Field(None, alias="projectId")
    parent_task_id: int | None = Field(None, alias="parentTaskId")
    records_processed: int = Field(0, alias="recordsProcessed")
    records_failed: int = Field(0, alias="recordsFailed")
    error_message: str | None = Field(None, alias="errorMessage")
    started_at: datetime | None = Field(None, alias="startedAt")
    completed_at: datetime | None = Field(None, alias="completedAt")
    created_at: datetime = Field(..., alias="createdAt")


class SyncTaskDetailResponse(BaseModel):
    """Schema for detailed sync task response."""

    id: int
    task_type: str
    source_type: str
    status: Literal["pending", "running", "completed", "failed"]
    project_id: int | None = None
    parent_task_id: int | None = None
    started_at: str | None = None
    completed_at: str | None = None
    records_processed: int = 0
    records_failed: int = 0
    error_message: str | None = None
    created_at: str


class SyncTaskListResponse(BaseModel):
    """Schema for sync task list response."""

    items: list[SyncTaskInDB]
    total: int
    page: int
    pageSize: int


class SyncLogResponse(BaseModel):
    """Schema for sync log response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    level: Literal["info", "warning", "error", "success"]
    message: str
    details: dict | None = None
    created_at: datetime


class SyncLogListResponse(BaseModel):
    """Schema for sync log list response."""

    items: list[SyncLogResponse]
    total: int
    page: int
    pageSize: int


# Data schemas for unified response formatting


class SyncTaskCreateData(BaseModel):
    """Data for sync task creation response."""

    task_id: int = Field(..., description="任务ID")
    source: str = Field(..., description="同步来源")
    status: Literal["pending", "running", "completed", "failed", "cancelled"] = Field(..., description="任务状态")


class SyncTaskDetailData(BaseModel):
    """Data for sync task detail response with camelCase field names for frontend compatibility."""

    model_config = ConfigDict(populate_by_name=True)

    id: int
    task_type: str = Field(..., alias="taskType")
    source_type: str = Field(..., alias="sourceType")
    status: Literal["pending", "running", "completed", "failed", "cancelled"]
    project_id: int | None = Field(None, alias="projectId")
    parent_task_id: int | None = Field(None, alias="parentTaskId")
    started_at: str | None = Field(None, alias="startedAt")
    completed_at: str | None = Field(None, alias="completedAt")
    records_processed: int = Field(0, alias="recordsProcessed")
    records_failed: int = Field(0, alias="recordsFailed")
    error_message: str | None = Field(None, alias="errorMessage")
    created_at: str = Field(..., alias="createdAt")
    # Frontend compatibility fields
    user_id: int | None = Field(None, alias="userId")
    progress: int | None = None


class SyncTaskListData(BaseModel):
    """Data for sync task list response."""

    items: list[SyncTaskInDB]
    total: int
    page: int
    pageSize: int


class SyncStatusData(BaseModel):
    """Data for sync status response."""

    recent_tasks: dict[str, int]
    running_tasks: list[dict]
    last_updated: str
