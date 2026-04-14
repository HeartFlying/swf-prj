"""GitLab Data Source Module

Implements DataSourceInterface for GitLab data synchronization.
Fetches commits, merge requests, and other data from GitLab API.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CodeCommit, MergeRequest, Project, User
from app.integrations.gitlab.client import GitLabClient
from app.services.data_source_interface import DataSourceInterface

logger = logging.getLogger(__name__)


class GitLabDataSource(DataSourceInterface):
    """GitLab data source implementation.

    Fetches and syncs data from GitLab API including:
    - Commits
    - Merge Requests
    - Members (future)
    """

    def __init__(self, client: Optional[GitLabClient] = None):
        """Initialize GitLab data source.

        Args:
            client: Optional GitLab client instance. If not provided,
                   a new client will be created.
        """
        super().__init__("gitlab")
        self.client = client or GitLabClient()

    async def fetch(
        self,
        db: AsyncSession,
        project_id: Optional[int] = None,
        user_id: Optional[int] = None,
        since: Optional[datetime] = None,
        **kwargs,
    ) -> list[dict]:
        """Fetch commits from GitLab.

        Args:
            db: Database session
            project_id: Project ID to fetch commits for
            user_id: Not used for GitLab commits
            since: Only fetch commits after this datetime
            **kwargs: Additional parameters

        Returns:
            List of commit dictionaries from GitLab API
        """
        if project_id is None:
            raise ValueError("project_id is required for GitLab commits fetch")

        return await self.fetch_commits(project_id, since)

    async def fetch_commits(
        self,
        project_id: int,
        since: Optional[datetime] = None,
    ) -> list[dict]:
        """Fetch commits from GitLab for a specific project.

        Args:
            project_id: The GitLab project ID
            since: Only fetch commits after this datetime

        Returns:
            List of commit dictionaries
        """
        try:
            commits = await self.client.get_commits(
                project_id=project_id,
                since=since,
                per_page=100,
            )
            logger.info(f"Fetched {len(commits)} commits from GitLab project {project_id}")
            return commits
        except Exception as e:
            logger.exception(f"Failed to fetch commits from GitLab: {e}")
            raise

    def transform(self, raw_data: dict) -> CodeCommit:
        """Transform GitLab commit data to CodeCommit model.

        Args:
            raw_data: Raw commit data from GitLab API

        Returns:
            CodeCommit model instance
        """
        return self.transform_commit(raw_data)

    def transform_commit(self, gitlab_commit: dict) -> CodeCommit:
        """Transform a GitLab commit to CodeCommit model.

        Args:
            gitlab_commit: Commit data from GitLab API

        Returns:
            CodeCommit model instance
        """
        stats = gitlab_commit.get("stats", {})

        # Parse commit time
        committed_date = gitlab_commit.get("committed_date") or gitlab_commit.get("authored_date")
        if committed_date:
            # Handle ISO format with Z suffix
            committed_date = committed_date.replace("Z", "+00:00")
            commit_time = datetime.fromisoformat(committed_date)
        else:
            commit_time = datetime.now(timezone.utc)

        return CodeCommit(
            commit_hash=gitlab_commit["id"],
            additions=stats.get("additions", 0),
            deletions=stats.get("deletions", 0),
            file_count=stats.get("total", 0),
            commit_message=gitlab_commit.get("title", ""),
            commit_time=commit_time,
            language="other",  # Will be determined later
            is_ai_generated=False,  # Will be determined later
            user_id=0,  # Will be set during save
            project_id=0,  # Will be set during save
        )

    async def save(self, db: AsyncSession, transformed_data: CodeCommit) -> None:
        """Save a CodeCommit to database.

        Args:
            db: Database session
            transformed_data: CodeCommit model to save
        """
        db.add(transformed_data)
        await db.flush()

    async def _get_or_create_user(
        self,
        db: AsyncSession,
        email: str,
        name: str,
    ) -> User:
        """Get or create a user by email.

        Args:
            db: Database session
            email: User email address
            name: User display name

        Returns:
            User model instance
        """
        # Try to find existing user by email
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if user:
            return user

        # Generate unique username
        base_username = email.split("@")[0].lower().replace(".", "_")
        username = base_username
        suffix = 1

        # Check for username conflicts and append suffix if needed
        while True:
            stmt = select(User).where(User.username == username)
            result = await db.execute(stmt)
            if result.scalar_one_or_none() is None:
                break
            username = f"{base_username}_{suffix}"
            suffix += 1

        user = User(
            username=username,
            email=email,
            password_hash="",  # Placeholder - external users don't login directly
            department="External",  # Default department for external users
            is_active=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

        logger.info(f"Created new user: {username} ({email})")
        return user

    async def sync_commits(
        self,
        db: AsyncSession,
        project_id: int,
        since: Optional[datetime] = None,
    ) -> dict:
        """Sync commits from GitLab to database.

        This is a convenience method that wraps the full sync workflow
        with GitLab-specific logic for user mapping.

        Args:
            db: Database session
            project_id: Project ID to sync
            since: Only sync commits after this datetime. If None, uses
                   project.gitlab_last_sync_at or defaults to 30 days ago.

        Returns:
            Sync result summary
        """
        from datetime import timedelta

        # If since is not provided, try to get it from project.gitlab_last_sync_at
        if since is None:
            project = await db.get(Project, project_id)
            if project and project.gitlab_last_sync_at:
                since = project.gitlab_last_sync_at
            else:
                # Default to 30 days ago
                since = datetime.now(timezone.utc) - timedelta(days=30)

        # Fetch commits
        try:
            commits_data = await self.fetch_commits(project_id, since)
        except Exception as e:
            logger.exception(f"Failed to fetch commits: {e}")
            return {
                "total": 0,
                "processed": 0,
                "failed": 0,
                "errors": [str(e)],
            }

        processed = 0
        failed = 0
        errors = []

        for commit_data in commits_data:
            try:
                # Transform
                commit = self.transform_commit(commit_data)
                commit.project_id = project_id

                # Get or create user
                author_email = commit_data.get("author_email") or commit_data.get("committer_email")
                author_name = commit_data.get("author_name") or commit_data.get("committer_name")

                if author_email:
                    user = await self._get_or_create_user(db, author_email, author_name or author_email)
                    commit.user_id = user.id

                # Check for duplicates
                stmt = select(CodeCommit).where(
                    CodeCommit.commit_hash == commit.commit_hash
                )
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    # Update existing record
                    existing.additions = commit.additions
                    existing.deletions = commit.deletions
                    existing.file_count = commit.file_count
                    existing.commit_message = commit.commit_message
                else:
                    # Insert new record
                    await self.save(db, commit)

                processed += 1
            except Exception as e:
                failed += 1
                errors.append(str(e))
                logger.exception(f"Failed to process commit {commit_data.get('id')}: {e}")

        await db.commit()

        # Update project.gitlab_last_sync_at after successful sync
        project = await db.get(Project, project_id)
        if project:
            project.gitlab_last_sync_at = datetime.now(timezone.utc)
            await db.commit()

        return {
            "total": len(commits_data),
            "processed": processed,
            "failed": failed,
            "errors": errors[:10],
        }

    async def fetch_merge_requests(
        self,
        project_id: int,
        state: Optional[str] = None,
        since: Optional[datetime] = None,
    ) -> list[dict]:
        """Fetch merge requests from GitLab for a specific project.

        Args:
            project_id: The GitLab project ID
            state: Filter by state (opened, closed, merged, all)
            since: Only fetch MRs updated after this datetime

        Returns:
            List of merge request dictionaries
        """
        try:
            mrs = await self.client.get_merge_requests(
                project_id=project_id,
                state=state,
                per_page=100,
            )
            logger.info(f"Fetched {len(mrs)} merge requests from GitLab project {project_id}")
            return mrs
        except Exception as e:
            logger.exception(f"Failed to fetch merge requests from GitLab: {e}")
            raise

    def transform_merge_request(self, gitlab_mr: dict) -> MergeRequest:
        """Transform a GitLab merge request to MergeRequest model.

        Args:
            gitlab_mr: MR data from GitLab API

        Returns:
            MergeRequest model instance
        """
        # Parse dates
        created_at = self._parse_datetime(gitlab_mr.get("created_at"))
        updated_at = self._parse_datetime(gitlab_mr.get("updated_at"))
        merged_at = self._parse_datetime(gitlab_mr.get("merged_at"))
        closed_at = self._parse_datetime(gitlab_mr.get("closed_at"))

        # Check if draft or WIP
        title = gitlab_mr.get("title", "")
        draft = gitlab_mr.get("draft", False) or title.lower().startswith("draft:")
        work_in_progress = title.lower().startswith("wip:") or title.lower().startswith("[wip]")

        return MergeRequest(
            mr_id=gitlab_mr["id"],
            iid=gitlab_mr["iid"],
            title=title,
            description=gitlab_mr.get("description"),
            source_branch=gitlab_mr.get("source_branch", ""),
            target_branch=gitlab_mr.get("target_branch", ""),
            state=gitlab_mr.get("state", "opened"),
            merge_status=gitlab_mr.get("merge_status"),
            draft=draft,
            work_in_progress=work_in_progress,
            created_at=created_at or datetime.now(timezone.utc),
            updated_at=updated_at or datetime.now(timezone.utc),
            merged_at=merged_at,
            closed_at=closed_at,
            additions=gitlab_mr.get("changes_count", 0),
            deletions=0,  # GitLab doesn't provide this in MR list
            commit_count=gitlab_mr.get("commits_count", 0),
            web_url=gitlab_mr.get("web_url"),
            project_id=0,  # Will be set during save
            author_id=0,  # Will be set during save
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

    async def sync_merge_requests(
        self,
        db: AsyncSession,
        project_id: int,
        state: Optional[str] = None,
        since: Optional[datetime] = None,
    ) -> dict:
        """Sync merge requests from GitLab to database.

        Args:
            db: Database session
            project_id: Project ID to sync
            state: Filter by MR state
            since: Only sync MRs updated after this datetime

        Returns:
            Sync result summary
        """
        # Fetch MRs
        mrs_data = await self.fetch_merge_requests(project_id, state, since)

        processed = 0
        failed = 0
        errors = []

        for mr_data in mrs_data:
            try:
                # Transform
                mr = self.transform_merge_request(mr_data)
                mr.project_id = project_id

                # Get or create author (handle null author)
                author_data = mr_data.get("author")
                if author_data:
                    author_email = author_data.get("email")
                    author_name = author_data.get("name")
                    if author_email:
                        author = await self._get_or_create_user(db, author_email, author_name or author_email)
                        mr.author_id = author.id
                    else:
                        mr.author_id = 1
                else:
                    # Use a default system user if no author info
                    mr.author_id = 1

                # Get or create assignee if exists
                assignee_data = mr_data.get("assignee")
                if assignee_data:
                    assignee_email = assignee_data.get("email")
                    assignee_name = assignee_data.get("name")
                    if assignee_email:
                        assignee = await self._get_or_create_user(db, assignee_email, assignee_name or assignee_email)
                        mr.assignee_id = assignee.id

                # Get merged_by if exists
                merged_by_data = mr_data.get("merged_by")
                if merged_by_data:
                    merged_by_email = merged_by_data.get("email")
                    merged_by_name = merged_by_data.get("name")
                    if merged_by_email:
                        merged_by = await self._get_or_create_user(db, merged_by_email, merged_by_name or merged_by_email)
                        mr.merged_by_id = merged_by.id

                # Check for duplicates
                stmt = select(MergeRequest).where(
                    MergeRequest.mr_id == mr.mr_id,
                    MergeRequest.project_id == project_id,
                )
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    # Update existing record
                    existing.title = mr.title
                    existing.description = mr.description
                    existing.state = mr.state
                    existing.merge_status = mr.merge_status
                    existing.draft = mr.draft
                    existing.work_in_progress = mr.work_in_progress
                    existing.updated_at = mr.updated_at
                    existing.merged_at = mr.merged_at
                    existing.closed_at = mr.closed_at
                    existing.additions = mr.additions
                    existing.commit_count = mr.commit_count
                    existing.assignee_id = mr.assignee_id
                    existing.merged_by_id = mr.merged_by_id
                else:
                    # Insert new record
                    db.add(mr)

                processed += 1
            except Exception as e:
                failed += 1
                errors.append(str(e))
                logger.exception(f"Failed to process MR {mr_data.get('id')}: {e}")

        await db.commit()

        return {
            "total": len(mrs_data),
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
        """Execute full sync workflow for GitLab (commits and MRs).

        Args:
            db: Database session
            project_id: Required project ID
            user_id: Not used
            since: Optional datetime filter
            **kwargs: Additional parameters

        Returns:
            Combined sync result summary with commits and merge_requests keys
        """
        if project_id is None:
            raise ValueError("project_id is required for GitLab sync")

        return await self.sync_all(db, project_id, since)

    async def sync_all(
        self,
        db: AsyncSession,
        project_id: Optional[int] = None,
        since: Optional[datetime] = None,
    ) -> dict:
        """Execute full sync workflow for GitLab (commits and MRs).

        Args:
            db: Database session
            project_id: Required project ID
            since: Optional datetime filter

        Returns:
            Combined sync result summary
        """
        if project_id is None:
            raise ValueError("project_id is required for GitLab sync")

        results = {
            "commits": {},
            "merge_requests": {},
        }

        # Sync commits
        try:
            results["commits"] = await self.sync_commits(db, project_id, since)
        except Exception as e:
            logger.exception(f"GitLab commits sync failed: {e}")
            results["commits"] = {"total": 0, "processed": 0, "failed": 0, "errors": [str(e)]}

        # Sync merge requests
        try:
            results["merge_requests"] = await self.sync_merge_requests(db, project_id, since=since)
        except Exception as e:
            logger.exception(f"GitLab MRs sync failed: {e}")
            results["merge_requests"] = {"total": 0, "processed": 0, "failed": 0, "errors": [str(e)]}

        return results
