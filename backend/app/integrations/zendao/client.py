"""ZenTao API Client

HTTP client for interacting with ZenTao API via Mock Server.
"""

import os
from typing import Optional

import httpx


class ZenTaoClient:
    """Client for ZenTao API"""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_token: Optional[str] = None,
        timeout: float = 30.0,
    ):
        """Initialize ZenTao client

        Args:
            base_url: ZenTao API base URL (defaults to MOCK_SERVER_URL env var)
            api_token: ZenTao API token for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or os.getenv(
            "MOCK_SERVER_URL", "http://localhost:8001/api/v1/zendao"
        )
        self.api_token = api_token or os.getenv("ZENDAO_TOKEN", "")
        self.timeout = timeout

        # Setup HTTP client
        headers = {"Content-Type": "application/json"}
        if self.api_token:
            headers["Token"] = self.api_token

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

    async def get_bugs(
        self,
        product_id: Optional[int] = None,
        status: Optional[str] = None,
        severity: Optional[int] = None,
        per_page: int = 20,
        page: int = 1,
    ) -> list[dict]:
        """Get bugs list

        Args:
            product_id: Filter by product ID
            status: Filter by status (active, resolved, closed)
            severity: Filter by severity (1-4)
            per_page: Number of results per page
            page: Current page number

        Returns:
            List of bug dictionaries
        """
        params = {
            "per_page": per_page,
            "page": page,
        }

        if product_id:
            params["product_id"] = product_id
        if status:
            params["status"] = status
        if severity:
            params["severity"] = severity

        response = await self.client.get("/bugs", params=params)
        response.raise_for_status()
        return response.json()

    async def get_bug(self, bug_id: int) -> dict:
        """Get bug details

        Args:
            bug_id: The ID of the bug

        Returns:
            Bug dictionary
        """
        response = await self.client.get(f"/bugs/{bug_id}")
        response.raise_for_status()
        return response.json()

    async def get_tasks(
        self,
        project_id: Optional[int] = None,
        status: Optional[str] = None,
        per_page: int = 20,
        page: int = 1,
    ) -> list[dict]:
        """Get tasks list

        Args:
            project_id: Filter by project ID
            status: Filter by status (wait, doing, done, pause, cancel, closed)
            per_page: Number of results per page
            page: Current page number

        Returns:
            List of task dictionaries
        """
        params = {
            "per_page": per_page,
            "page": page,
        }

        if project_id:
            params["project_id"] = project_id
        if status:
            params["status"] = status

        response = await self.client.get("/tasks", params=params)
        response.raise_for_status()
        return response.json()

    async def get_task(self, task_id: int) -> dict:
        """Get task details

        Args:
            task_id: The ID of the task

        Returns:
            Task dictionary
        """
        response = await self.client.get(f"/tasks/{task_id}")
        response.raise_for_status()
        return response.json()

    async def get_bug_stats(self, product_id: Optional[int] = None) -> dict:
        """Get bug statistics

        Args:
            product_id: Filter by product ID

        Returns:
            Dictionary with bug statistics
        """
        bugs = await self.get_bugs(product_id=product_id, per_page=100)

        total = len(bugs)
        by_status = {"active": 0, "resolved": 0, "closed": 0}
        by_severity = {1: 0, 2: 0, 3: 0, 4: 0}
        by_type = {}

        for bug in bugs:
            status = bug.get("status", "active")
            by_status[status] = by_status.get(status, 0) + 1

            severity = bug.get("severity", 3)
            by_severity[severity] = by_severity.get(severity, 0) + 1

            bug_type = bug.get("type", "unknown")
            by_type[bug_type] = by_type.get(bug_type, 0) + 1

        return {
            "total_bugs": total,
            "by_status": by_status,
            "by_severity": by_severity,
            "by_type": by_type,
            "resolution_rate": (
                (by_status.get("resolved", 0) + by_status.get("closed", 0)) / total
                if total > 0 else 0
            ),
        }

    async def get_task_stats(self, project_id: Optional[int] = None) -> dict:
        """Get task statistics

        Args:
            project_id: Filter by project ID

        Returns:
            Dictionary with task statistics
        """
        tasks = await self.get_tasks(project_id=project_id, per_page=100)

        total = len(tasks)
        by_status = {
            "wait": 0, "doing": 0, "done": 0,
            "pause": 0, "cancel": 0, "closed": 0,
        }
        by_type = {}
        total_estimate = 0
        total_consumed = 0

        for task in tasks:
            status = task.get("status", "wait")
            by_status[status] = by_status.get(status, 0) + 1

            task_type = task.get("type", "misc")
            by_type[task_type] = by_type.get(task_type, 0) + 1

            total_estimate += task.get("estimate", 0)
            total_consumed += task.get("consumed", 0)

        return {
            "total_tasks": total,
            "by_status": by_status,
            "by_type": by_type,
            "total_estimate_hours": total_estimate,
            "total_consumed_hours": round(total_consumed, 1),
            "completion_rate": (
                by_status.get("done", 0) / total if total > 0 else 0
            ),
        }
