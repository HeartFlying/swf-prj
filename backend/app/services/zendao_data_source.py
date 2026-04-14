"""ZenTao Data Source Module

Implements DataSourceInterface for ZenTao data synchronization.
Fetches bugs, tasks, and other data from ZenTao API.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BugRecord, Project, TaskRecord, User, UserAccount
from app.integrations.zendao.client import ZenTaoClient
from app.services.data_source_interface import DataSourceInterface

logger = logging.getLogger(__name__)


class ZenTaoDataSource(DataSourceInterface):
    """ZenTao data source implementation.

    Fetches and syncs data from ZenTao API including:
    - Bugs
    - Tasks (future)
    """

    def __init__(self, client: Optional[ZenTaoClient] = None):
        """Initialize ZenTao data source.

        Args:
            client: Optional ZenTao client instance. If not provided,
                   a new client will be created.
        """
        super().__init__("zendao")
        self.client = client or ZenTaoClient()

    async def fetch(
        self,
        db: AsyncSession,
        project_id: Optional[int] = None,
        user_id: Optional[int] = None,
        since: Optional[datetime] = None,
        **kwargs,
    ) -> list[dict]:
        """Fetch bugs from ZenTao.

        Args:
            db: Database session
            project_id: Project ID to fetch bugs for
            user_id: Not used for ZenTao bugs
            since: Not used for ZenTao bugs fetch
            **kwargs: Additional parameters

        Returns:
            List of bug dictionaries from ZenTao API
        """
        if project_id is None:
            raise ValueError("project_id is required for ZenTao bugs fetch")

        return await self.fetch_bugs(project_id, **kwargs)

    async def fetch_bugs(
        self,
        project_id: int,
        status: Optional[str] = None,
    ) -> list[dict]:
        """Fetch bugs from ZenTao for a specific project.

        Args:
            project_id: The project ID (mapped to product_id in ZenTao)
            status: Filter by status (active, resolved, closed)

        Returns:
            List of bug dictionaries
        """
        try:
            bugs = await self.client.get_bugs(
                product_id=project_id,
                status=status,
                per_page=100,
            )
            logger.info(f"Fetched {len(bugs)} bugs from ZenTao project {project_id}")
            return bugs
        except Exception as e:
            logger.exception(f"Failed to fetch bugs from ZenTao: {e}")
            raise

    def transform(self, raw_data: dict) -> BugRecord:
        """Transform ZenTao bug data to BugRecord model.

        Args:
            raw_data: Raw bug data from ZenTao API

        Returns:
            BugRecord model instance
        """
        return self.transform_bug(raw_data)

    def transform_bug(self, zendao_bug: dict) -> BugRecord:
        """Transform a ZenTao bug to BugRecord model.

        Args:
            zendao_bug: Bug data from ZenTao API

        Returns:
            BugRecord model instance
        """
        # Map severity from integer to string
        severity_map = {
            1: "critical",
            2: "major",
            3: "normal",
            4: "minor",
            5: "trivial",
        }
        severity = severity_map.get(zendao_bug.get("severity", 3), "normal")

        # Map priority from integer to string
        priority_map = {
            1: "urgent",
            2: "high",
            3: "medium",
            4: "low",
        }
        priority = priority_map.get(zendao_bug.get("priority")) if zendao_bug.get("priority") else None

        # Parse dates
        created_at = self._parse_datetime(zendao_bug.get("openedDate"))
        updated_at = self._parse_datetime(zendao_bug.get("assignedDate")) or created_at
        resolved_at = self._parse_datetime(zendao_bug.get("resolvedDate"))
        closed_at = self._parse_datetime(zendao_bug.get("closedDate"))

        return BugRecord(
            zendao_bug_id=zendao_bug["id"],
            title=zendao_bug.get("title", ""),
            description=zendao_bug.get("description"),
            severity=severity,
            priority=priority,
            status=zendao_bug.get("status", "new"),
            type=zendao_bug.get("type", "bug"),
            module=zendao_bug.get("module"),
            created_at=created_at or datetime.now(timezone.utc),
            updated_at=updated_at or datetime.now(timezone.utc),
            resolved_at=resolved_at,
            closed_at=closed_at,
            resolution=zendao_bug.get("resolution"),
            project_id=0,  # Will be set during save
            assignee_id=None,  # Will be set during save
            reporter_id=None,  # Will be set during save
        )

    def _parse_datetime(self, dt_str: Optional[str]) -> Optional[datetime]:
        """Parse ISO datetime string to datetime object.

        Args:
            dt_str: ISO format datetime string

        Returns:
            Parsed datetime or None
        """
        if not dt_str:
            return None
        try:
            dt_str = dt_str.replace("Z", "+00:00")
            return datetime.fromisoformat(dt_str)
        except (ValueError, TypeError):
            return None

    async def save(self, db: AsyncSession, transformed_data: BugRecord) -> None:
        """Save a BugRecord to database.

        Args:
            db: Database session
            transformed_data: BugRecord model to save
        """
        db.add(transformed_data)
        await db.flush()

    async def _get_user_by_zendao_account(
        self,
        db: AsyncSession,
        zendao_account: str,
    ) -> Optional[User]:
        """Get user by ZenTao account.

        Args:
            db: Database session
            zendao_account: ZenTao account name

        Returns:
            User model instance or None
        """
        if not zendao_account:
            return None

        # First try to find via UserAccount mapping
        stmt = select(UserAccount).where(
            UserAccount.platform == "zendao",
            UserAccount.account_id == zendao_account,
        )
        result = await db.execute(stmt)
        account = result.scalar_one_or_none()

        if account:
            # Get the user
            stmt = select(User).where(User.id == account.user_id)
            result = await db.execute(stmt)
            return result.scalar_one_or_none()

        # Try to find by username directly
        stmt = select(User).where(User.username == zendao_account)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def sync_bugs(
        self,
        db: AsyncSession,
        project_id: int,
        status: Optional[str] = None,
        since: Optional[datetime] = None,
    ) -> dict:
        """Sync bugs from ZenTao to database.

        This is a convenience method that wraps the full sync workflow
        with ZenTao-specific logic for user mapping.

        Args:
            db: Database session
            project_id: Project ID to sync
            status: Optional status filter
            since: Only sync bugs updated after this datetime.
                  If None, uses project.zendao_last_sync_at.

        Returns:
            Sync result summary
        """
        # Fetch bugs
        try:
            bugs_data = await self.fetch_bugs(project_id, status)
        except Exception as e:
            logger.exception(f"Failed to fetch bugs: {e}")
            return {
                "total": 0,
                "processed": 0,
                "failed": 0,
                "errors": [str(e)],
            }

        # Filter bugs by since if explicitly provided
        # Note: We don't auto-filter by project.zendao_last_sync_at here
        # because that would prevent updating existing records.
        # The since parameter is for explicit incremental sync only.
        if since:
            filtered_bugs = []
            for bug in bugs_data:
                # Check updated date fields
                updated_date = (
                    bug.get("assignedDate")
                    or bug.get("resolvedDate")
                    or bug.get("closedDate")
                    or bug.get("openedDate")
                )
                if updated_date:
                    try:
                        updated_dt = self._parse_datetime(updated_date)
                        if updated_dt and updated_dt >= since:
                            filtered_bugs.append(bug)
                    except (ValueError, TypeError):
                        # If we can't parse the date, include the bug
                        filtered_bugs.append(bug)
                else:
                    # If no date, include the bug
                    filtered_bugs.append(bug)
            bugs_data = filtered_bugs
            logger.info(f"Filtered to {len(bugs_data)} bugs since {since}")

        processed = 0
        failed = 0
        errors = []

        for bug_data in bugs_data:
            try:
                # Transform
                bug = self.transform_bug(bug_data)
                bug.project_id = project_id

                # Map reporter (openedBy)
                opened_by = bug_data.get("openedBy")
                if opened_by:
                    reporter = await self._get_user_by_zendao_account(db, opened_by)
                    if reporter:
                        bug.reporter_id = reporter.id

                # Map assignee (assignedTo)
                assigned_to = bug_data.get("assignedTo")
                if assigned_to:
                    assignee = await self._get_user_by_zendao_account(db, assigned_to)
                    if assignee:
                        bug.assignee_id = assignee.id

                # Check for duplicates
                stmt = select(BugRecord).where(
                    BugRecord.zendao_bug_id == bug.zendao_bug_id
                )
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    # Update existing record
                    existing.title = bug.title
                    existing.description = bug.description
                    existing.severity = bug.severity
                    existing.priority = bug.priority
                    existing.status = bug.status
                    existing.type = bug.type
                    existing.module = bug.module
                    existing.updated_at = bug.updated_at
                    existing.resolved_at = bug.resolved_at
                    existing.closed_at = bug.closed_at
                    existing.resolution = bug.resolution
                    existing.assignee_id = bug.assignee_id
                    existing.reporter_id = bug.reporter_id
                else:
                    # Insert new record
                    await self.save(db, bug)

                processed += 1
            except Exception as e:
                failed += 1
                errors.append(str(e))
                logger.exception(f"Failed to process bug {bug_data.get('id')}: {e}")

        await db.commit()

        # Update project's last_sync_at
        stmt = select(Project).where(Project.id == project_id)
        result = await db.execute(stmt)
        project = result.scalar_one_or_none()
        if project:
            project.zendao_last_sync_at = datetime.now(timezone.utc)
            await db.commit()
            logger.info(f"Updated project {project_id} zendao_last_sync_at")

        return {
            "total": len(bugs_data),
            "processed": processed,
            "failed": failed,
            "errors": errors[:10],
        }

    async def sync(
        self,
        db: AsyncSession,
        project_id: Optional[int] = None,
        user_id: Optional[int] = None,
        since: Optional[datetime] = None,
        **kwargs,
    ) -> dict:
        """Execute full sync workflow for ZenTao (bugs).

        Args:
            db: Database session
            project_id: Required project ID
            user_id: Not used
            since: Only sync bugs updated after this datetime
            **kwargs: Additional parameters

        Returns:
            Sync result summary
        """
        if project_id is None:
            raise ValueError("project_id is required for ZenTao sync")

        return await self.sync_bugs(db, project_id, since=since, **kwargs)

    # ========== Tasks Methods ==========

    async def fetch_tasks(
        self,
        project_id: int = None,
        status: str = None,
    ) -> list[dict]:
        """Fetch tasks from ZenTao for a specific project.

        Args:
            project_id: The project ID (mapped to project_id in ZenTao)
            status: Filter by status (wait, doing, done, pause, cancel, closed)

        Returns:
            List of task dictionaries
        """
        try:
            tasks = await self.client.get_tasks(
                project_id=project_id,
                status=status,
                per_page=100,
            )
            logger.info(f"Fetched {len(tasks)} tasks from ZenTao project {project_id}")
            return tasks
        except Exception as e:
            logger.exception(f"Failed to fetch tasks from ZenTao: {e}")
            raise

    def transform_task(self, zendao_task: dict) -> TaskRecord:
        """Transform a ZenTao task to TaskRecord model.

        Args:
            zendao_task: Task data from ZenTao API

        Returns:
            TaskRecord model instance
        """
        # Map priority from integer to string
        priority_map = {
            1: "high",
            2: "high",
            3: "medium",
            4: "low",
        }
        priority = priority_map.get(zendao_task.get("pri")) if zendao_task.get("pri") else None

        # Parse dates
        created_at = self._parse_datetime(zendao_task.get("openedDate"))
        updated_at = self._parse_datetime(zendao_task.get("assignedDate")) or created_at
        started_at = self._parse_datetime(zendao_task.get("startedDate"))
        finished_at = self._parse_datetime(zendao_task.get("finishedDate"))
        closed_at = self._parse_datetime(zendao_task.get("closedDate"))
        canceled_at = self._parse_datetime(zendao_task.get("canceledDate"))

        # Parse deadline
        deadline = None
        if zendao_task.get("deadline"):
            try:
                deadline = datetime.strptime(zendao_task["deadline"], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                deadline = None

        # Get numeric values with defaults
        estimate = float(zendao_task.get("estimate", 0) or 0)
        consumed = float(zendao_task.get("consumed", 0) or 0)
        left = float(zendao_task.get("left", 0) or 0)

        return TaskRecord(
            zendao_task_id=zendao_task["id"],
            name=zendao_task.get("name", ""),
            description=zendao_task.get("desc"),
            type=zendao_task.get("type", "misc"),
            status=zendao_task.get("status", "wait"),
            priority=priority,
            module=zendao_task.get("module"),
            story_id=zendao_task.get("story"),
            estimate=estimate,
            consumed=consumed,
            left=left,
            deadline=deadline,
            created_at=created_at or datetime.now(timezone.utc),
            updated_at=updated_at or datetime.now(timezone.utc),
            started_at=started_at,
            finished_at=finished_at,
            closed_at=closed_at,
            canceled_at=canceled_at,
            project_id=0,  # Will be set during save
            assignee_id=None,  # Will be set during save
            creator_id=None,  # Will be set during save
        )

    async def save_task(self, db: AsyncSession, transformed_data: TaskRecord) -> None:
        """Save a TaskRecord to database.

        Args:
            db: Database session
            transformed_data: TaskRecord model to save
        """
        db.add(transformed_data)
        await db.flush()

    async def sync_tasks(
        self,
        db: AsyncSession,
        project_id: int,
        status: Optional[str] = None,
    ) -> dict:
        """Sync tasks from ZenTao to database.

        This is a convenience method that wraps the full sync workflow
        with ZenTao-specific logic for user mapping.

        Args:
            db: Database session
            project_id: Project ID to sync
            status: Optional status filter

        Returns:
            Sync result summary
        """
        # Fetch tasks
        try:
            tasks_data = await self.fetch_tasks(project_id, status)
        except Exception as e:
            logger.exception(f"Failed to fetch tasks: {e}")
            return {
                "total": 0,
                "processed": 0,
                "failed": 0,
                "errors": [str(e)],
            }

        processed = 0
        failed = 0
        errors = []

        for task_data in tasks_data:
            try:
                # Transform
                task = self.transform_task(task_data)
                task.project_id = project_id

                # Map creator (openedBy)
                opened_by = task_data.get("openedBy")
                if opened_by:
                    creator = await self._get_user_by_zendao_account(db, opened_by)
                    if creator:
                        task.creator_id = creator.id

                # Map assignee (assignedTo)
                assigned_to = task_data.get("assignedTo")
                if assigned_to:
                    assignee = await self._get_user_by_zendao_account(db, assigned_to)
                    if assignee:
                        task.assignee_id = assignee.id

                # Check for duplicates
                stmt = select(TaskRecord).where(
                    TaskRecord.zendao_task_id == task.zendao_task_id
                )
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    # Update existing record
                    existing.name = task.name
                    existing.description = task.description
                    existing.type = task.type
                    existing.status = task.status
                    existing.priority = task.priority
                    existing.module = task.module
                    existing.story_id = task.story_id
                    existing.estimate = task.estimate
                    existing.consumed = task.consumed
                    existing.left = task.left
                    existing.deadline = task.deadline
                    existing.updated_at = task.updated_at
                    existing.started_at = task.started_at
                    existing.finished_at = task.finished_at
                    existing.closed_at = task.closed_at
                    existing.canceled_at = task.canceled_at
                    existing.assignee_id = task.assignee_id
                    existing.creator_id = task.creator_id
                else:
                    # Insert new record
                    await self.save_task(db, task)

                processed += 1
            except Exception as e:
                failed += 1
                errors.append(str(e))
                logger.exception(f"Failed to process task {task_data.get('id')}: {e}")

        await db.commit()

        return {
            "total": len(tasks_data),
            "processed": processed,
            "failed": failed,
            "errors": errors[:10],
        }
