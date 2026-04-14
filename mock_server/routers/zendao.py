"""ZenTao API Router

Mock endpoints for ZenTao API:
- GET /bugs - Return Bug list
- GET /tasks - Return Task list
"""

from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from data_generators.zendao_generator import ZenTaoDataGenerator

router = APIRouter(tags=["ZenTao"])

# Initialize data generator
generator = ZenTaoDataGenerator()


# Response Models
class BugResponse(BaseModel):
    id: int
    product: int
    project: int
    title: str
    steps: str
    type: str
    severity: int
    pri: int
    status: str
    openedBy: str
    openedDate: str
    assignedTo: str
    assignedDate: Optional[str]
    resolvedBy: str
    resolvedDate: Optional[str]
    resolution: Optional[str]
    closedBy: str
    closedDate: Optional[str]
    lastEditedBy: str
    lastEditedDate: str
    duplicateBug: int
    linkBug: str
    case: int
    caseVersion: int
    result: int
    repo: int
    entry: str
    lines: str
    v1: str
    v2: str
    repoType: str
    testtask: int


class TaskResponse(BaseModel):
    id: int
    project: int
    type: str
    name: str
    desc: str
    pri: int
    status: str
    openedBy: str
    openedDate: str
    assignedTo: str
    assignedDate: str
    estStarted: str
    realStarted: Optional[str]
    deadline: str
    finishedBy: str
    finishedDate: Optional[str]
    canceledBy: str
    canceledDate: Optional[str]
    closedBy: str
    closedDate: Optional[str]
    closedReason: str
    lastEditedBy: str
    lastEditedDate: str
    estimate: int
    consumed: float
    left: float
    story: int
    storyVersion: int
    fromBug: int
    mailto: list[str]


@router.get(
    "/bugs",
    response_model=list[BugResponse],
    summary="Get bugs list",
    description="Get a list of bugs with optional filtering",
)
async def get_bugs(
    product_id: Optional[int] = Query(None, description="Filter by product ID"),
    status: Optional[str] = Query(None, description="Filter by status (active, resolved, closed)"),
    severity: Optional[int] = Query(None, ge=1, le=4, description="Filter by severity (1-4)"),
    per_page: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
):
    """Get bugs list

    Args:
        product_id: Filter by product ID
        status: Filter by status (active, resolved, closed)
        severity: Filter by severity level (1=Critical, 4=Trivial)
        per_page: Number of results per page
        page: Current page number
    """
    bugs = generator.generate_bugs(
        count=per_page * 2,
        product_id=product_id,
        status=status,
        severity=severity,
    )

    # Simple pagination
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    return bugs[start_idx:end_idx]


@router.get(
    "/bugs/{bug_id}",
    response_model=BugResponse,
    summary="Get bug details",
    description="Get details of a specific bug",
)
async def get_bug(
    bug_id: int,
):
    """Get bug details

    Args:
        bug_id: The ID of the bug
    """
    bugs = generator.generate_bugs(count=max(bug_id, 10))
    for bug in bugs:
        if bug["id"] == bug_id:
            return bug

    # Return first bug if not found (mock behavior)
    return bugs[0]


@router.get(
    "/tasks",
    response_model=list[TaskResponse],
    summary="Get tasks list",
    description="Get a list of tasks with optional filtering",
)
async def get_tasks(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    status: Optional[str] = Query(None, description="Filter by status (wait, doing, done, pause, cancel, closed)"),
    per_page: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
):
    """Get tasks list

    Args:
        project_id: Filter by project ID
        status: Filter by status
        per_page: Number of results per page
        page: Current page number
    """
    tasks = generator.generate_tasks(
        count=per_page * 2,
        project_id=project_id,
        status=status,
    )

    # Simple pagination
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    return tasks[start_idx:end_idx]


@router.get(
    "/tasks/{task_id}",
    response_model=TaskResponse,
    summary="Get task details",
    description="Get details of a specific task",
)
async def get_task(
    task_id: int,
):
    """Get task details

    Args:
        task_id: The ID of the task
    """
    tasks = generator.generate_tasks(count=max(task_id, 10))
    for task in tasks:
        if task["id"] == task_id:
            return task

    # Return first task if not found (mock behavior)
    return tasks[0]
