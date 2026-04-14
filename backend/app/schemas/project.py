"""Project schemas for request/response validation."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ProjectBase(BaseModel):
    """Base project schema with common attributes."""

    name: str = Field(..., min_length=1, max_length=100, description="项目名称")
    code: str = Field(..., min_length=1, max_length=50, description="项目编号")
    description: str | None = Field(None, max_length=1000, description="项目描述")
    stage: str = Field(..., description="项目阶段")
    status: Literal["active", "archived", "deleted"] = Field(default="active", description="项目状态")
    start_date: date | None = Field(None, description="开始日期")
    end_date: date | None = Field(None, description="结束日期")


class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""

    manager_id: int | None = Field(None, description="项目负责人ID")


class ProjectUpdate(BaseModel):
    """Schema for updating an existing project."""

    name: str | None = Field(None, min_length=1, max_length=100)
    code: str | None = Field(None, min_length=1, max_length=50)
    description: str | None = Field(None, max_length=1000)
    stage: str | None = None
    status: Literal["active", "archived", "deleted"] | None = None
    start_date: date | None = None
    end_date: date | None = None
    manager_id: int | None = Field(None, description="项目负责人ID")


class ProjectInDB(ProjectBase):
    """Schema for project as stored in database."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    manager_id: int | None = None
    created_at: datetime
    updated_at: datetime


class ProjectResponse(BaseModel):
    """Schema for project response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    description: str | None = None
    stage: str
    status: Literal["active", "archived", "deleted"]
    start_date: date | None = None
    end_date: date | None = None
    manager_id: int | None = None
    created_at: datetime
    updated_at: datetime
    members: list["ProjectMemberResponse"] = []


class ProjectListResponse(BaseModel):
    """Schema for paginated project list response."""

    items: list[ProjectInDB]
    total: int
    page: int
    pageSize: int


class ProjectMemberBase(BaseModel):
    """Base project member schema."""

    user_id: int = Field(..., description="用户ID")
    role: Literal["owner", "maintainer", "developer", "member"] = Field(default="developer", description="成员角色")


class ProjectMemberCreate(ProjectMemberBase):
    """Schema for adding a member to a project."""

    pass


class ProjectMemberUpdate(BaseModel):
    """Schema for updating project member role."""

    role: Literal["owner", "maintainer", "developer", "member"] = Field(
        ..., description="成员角色"
    )


class ProjectMemberInDB(ProjectMemberBase):
    """Schema for project member as stored in database."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    joined_at: datetime


class ProjectMemberResponse(ProjectMemberInDB):
    """Schema for project member response with user details."""

    model_config = ConfigDict(from_attributes=True)

    role: Literal["owner", "maintainer", "developer", "member"] = Field(
        default="developer", description="成员角色"
    )
    username: str | None = None
    email: str | None = None


class ProjectMemberListResponse(BaseModel):
    """Schema for paginated project member list response."""

    items: list[ProjectMemberResponse]
    total: int
    page: int
    pageSize: int


# Resolve forward references
ProjectResponse.model_rebuild()
