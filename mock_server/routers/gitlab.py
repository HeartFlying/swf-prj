"""GitLab API Router

Mock endpoints for GitLab API:
- GET /projects/{project_id}/repository/commits
- GET /projects/{project_id}/merge_requests
- GET /projects/{project_id}/members
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from data_generators.gitlab_generator import GitLabDataGenerator

router = APIRouter(prefix="/projects", tags=["GitLab"])

# Initialize data generator
generator = GitLabDataGenerator()


# Response Models
class CommitStats(BaseModel):
    additions: int
    deletions: int
    total: int


class CommitResponse(BaseModel):
    id: str
    short_id: str
    title: str
    message: str
    author_name: str
    author_email: str
    authored_date: str
    committer_name: str
    committer_email: str
    committed_date: str
    created_at: str
    parent_ids: list[str]
    web_url: str
    stats: CommitStats


class AuthorResponse(BaseModel):
    id: int
    name: str
    username: str
    avatar_url: str


class MergeRequestResponse(BaseModel):
    id: int
    iid: int
    project_id: int
    title: str
    description: str
    state: str
    created_at: str
    updated_at: str
    merged_at: Optional[str]
    closed_at: Optional[str]
    source_branch: str
    target_branch: str
    author: AuthorResponse
    assignee: Optional[AuthorResponse]
    labels: list[str]
    web_url: str
    changes_count: str
    merge_status: Optional[str]
    draft: bool
    has_conflicts: bool


class MemberResponse(BaseModel):
    id: int
    username: str
    name: str
    state: str
    avatar_url: str
    web_url: str
    access_level: int
    access_level_description: str
    created_at: str
    expires_at: Optional[str]


@router.get(
    "/{project_id}/repository/commits",
    response_model=list[CommitResponse],
    summary="Get project commits",
    description="Get a list of repository commits in a project",
)
async def get_commits(
    project_id: int,
    since: Optional[str] = Query(None, description="ISO 8601 date string"),
    until: Optional[str] = Query(None, description="ISO 8601 date string"),
    per_page: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
):
    """Get commits for a project

    Args:
        project_id: The ID or URL-encoded path of the project
        since: Only commits after or on this date will be returned
        until: Only commits before or on this date will be returned
        per_page: Number of results to show per page
        page: Current page number
    """
    since_date = datetime.fromisoformat(since.replace("Z", "+00:00")) if since else None
    until_date = datetime.fromisoformat(until.replace("Z", "+00:00")) if until else None

    commits = generator.generate_commits(
        project_id=project_id,
        count=per_page * 2,  # Generate more for pagination
        since=since_date,
        until=until_date,
    )

    # Simple pagination
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    return commits[start_idx:end_idx]


@router.get(
    "/{project_id}/merge_requests",
    response_model=list[MergeRequestResponse],
    summary="Get project merge requests",
    description="Get all merge requests for this project",
)
async def get_merge_requests(
    project_id: int,
    state: Optional[str] = Query(None, description="Return all merge requests or just those that are opened, closed, or merged"),
    per_page: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
):
    """Get merge requests for a project

    Args:
        project_id: The ID or URL-encoded path of the project
        state: Return all merge requests or just those that are opened, closed, or merged
        per_page: Number of results to show per page
        page: Current page number
    """
    mrs = generator.generate_merge_requests(
        project_id=project_id,
        count=per_page * 2,
        state=state,
    )

    # Simple pagination
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    return mrs[start_idx:end_idx]


@router.get(
    "/{project_id}/members",
    response_model=list[MemberResponse],
    summary="Get project members",
    description="Gets a list of project members viewable by the authenticated user",
)
async def get_members(
    project_id: int,
    per_page: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
):
    """Get members of a project

    Args:
        project_id: The ID or URL-encoded path of the project
        per_page: Number of results to show per page
        page: Current page number
    """
    members = generator.generate_members(
        project_id=project_id,
        count=per_page * 2,
    )

    # Simple pagination
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    return members[start_idx:end_idx]
