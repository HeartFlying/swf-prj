"""GitLab API Client

HTTP client for interacting with GitLab API via Mock Server.
"""

import os
from datetime import datetime
from typing import Optional

import httpx


class GitLabClient:
    """Client for GitLab API"""

    def __init__(
        self,
        base_url: Optional[str] = None,
        private_token: Optional[str] = None,
        timeout: float = 30.0,
    ):
        """Initialize GitLab client

        Args:
            base_url: GitLab API base URL (defaults to MOCK_SERVER_URL env var or localhost)
            private_token: GitLab private token for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or os.getenv(
            "MOCK_SERVER_URL", "http://localhost:8001/api/v4"
        )
        self.private_token = private_token or os.getenv("GITLAB_TOKEN", "")
        self.timeout = timeout

        # Setup HTTP client
        headers = {}
        if self.private_token:
            headers["PRIVATE-TOKEN"] = self.private_token

        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=headers,
            timeout=timeout,
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

    async def get_commits(
        self,
        project_id: int,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        per_page: int = 20,
        page: int = 1,
    ) -> list[dict]:
        """Get commits for a project

        Args:
            project_id: The ID of the project
            since: Only commits after or on this date
            until: Only commits before or on this date
            per_page: Number of results per page
            page: Current page number

        Returns:
            List of commit dictionaries
        """
        params = {
            "per_page": per_page,
            "page": page,
        }

        if since:
            params["since"] = since.isoformat()
        if until:
            params["until"] = until.isoformat()

        response = await self.client.get(
            f"/projects/{project_id}/repository/commits",
            params=params,
        )
        response.raise_for_status()
        return response.json()

    async def get_merge_requests(
        self,
        project_id: int,
        state: Optional[str] = None,
        per_page: int = 20,
        page: int = 1,
    ) -> list[dict]:
        """Get merge requests for a project

        Args:
            project_id: The ID of the project
            state: Filter by state (opened, closed, merged, all)
            per_page: Number of results per page
            page: Current page number

        Returns:
            List of merge request dictionaries
        """
        params = {
            "per_page": per_page,
            "page": page,
        }

        if state:
            params["state"] = state

        response = await self.client.get(
            f"/projects/{project_id}/merge_requests",
            params=params,
        )
        response.raise_for_status()
        return response.json()

    async def get_members(
        self,
        project_id: int,
        per_page: int = 20,
        page: int = 1,
    ) -> list[dict]:
        """Get members of a project

        Args:
            project_id: The ID of the project
            per_page: Number of results per page
            page: Current page number

        Returns:
            List of member dictionaries
        """
        params = {
            "per_page": per_page,
            "page": page,
        }

        response = await self.client.get(
            f"/projects/{project_id}/members",
            params=params,
        )
        response.raise_for_status()
        return response.json()

    async def get_commit_stats(
        self,
        project_id: int,
        days: int = 30,
    ) -> dict:
        """Get commit statistics for a project

        Args:
            project_id: The ID of the project
            days: Number of days to look back

        Returns:
            Dictionary with commit statistics
        """
        since = datetime.now() - __import__("datetime").timedelta(days=days)
        commits = await self.get_commits(project_id, since=since, per_page=100)

        total_commits = len(commits)
        authors = {}
        total_additions = 0
        total_deletions = 0

        for commit in commits:
            author = commit.get("author_name", "Unknown")
            authors[author] = authors.get(author, 0) + 1

            stats = commit.get("stats", {})
            total_additions += stats.get("additions", 0)
            total_deletions += stats.get("deletions", 0)

        return {
            "total_commits": total_commits,
            "unique_authors": len(authors),
            "author_commits": authors,
            "total_additions": total_additions,
            "total_deletions": total_deletions,
            "period_days": days,
        }
