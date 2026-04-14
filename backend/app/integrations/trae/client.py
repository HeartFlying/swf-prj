"""Trae API Client

HTTP client for interacting with Trae API via Mock Server.
"""

import os
from datetime import datetime
from typing import Optional

import httpx


class TraeClient:
    """Client for Trae API"""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
    ):
        """Initialize Trae client

        Args:
            base_url: Trae API base URL (defaults to MOCK_SERVER_URL env var)
            api_key: Trae API key for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or os.getenv(
            "MOCK_SERVER_URL", "http://localhost:8001/api/v1/trae"
        )
        self.api_key = api_key or os.getenv("TRAE_API_KEY", "")
        self.timeout = timeout

        # Setup HTTP client
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

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

    async def get_token_usage(
        self,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        model: Optional[str] = None,
        per_page: int = 20,
        page: int = 1,
    ) -> list[dict]:
        """Get token usage records

        Args:
            user_id: Filter by user ID
            start_date: Filter records after this date
            end_date: Filter records before this date
            model: Filter by AI model
            per_page: Number of results per page
            page: Current page number

        Returns:
            List of token usage dictionaries
        """
        params = {
            "per_page": per_page,
            "page": page,
        }

        if user_id:
            params["user_id"] = user_id
        if start_date:
            params["start_date"] = start_date.isoformat()
        if end_date:
            params["end_date"] = end_date.isoformat()
        if model:
            params["model"] = model

        response = await self.client.get("/token-usage", params=params)
        response.raise_for_status()
        return response.json()

    async def get_token_usage_summary(
        self,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> dict:
        """Get token usage summary statistics

        Args:
            user_id: Filter by user ID
            start_date: Filter records after this date
            end_date: Filter records before this date

        Returns:
            Dictionary with token usage summary
        """
        params = {}

        if user_id:
            params["user_id"] = user_id
        if start_date:
            params["start_date"] = start_date.isoformat()
        if end_date:
            params["end_date"] = end_date.isoformat()

        response = await self.client.get("/token-usage/summary", params=params)
        response.raise_for_status()
        return response.json()

    async def get_ai_suggestions(
        self,
        user_id: Optional[str] = None,
        suggestion_type: Optional[str] = None,
        status: Optional[str] = None,
        per_page: int = 20,
        page: int = 1,
    ) -> list[dict]:
        """Get AI suggestion records

        Args:
            user_id: Filter by user ID
            suggestion_type: Filter by suggestion type
            status: Filter by status
            per_page: Number of results per page
            page: Current page number

        Returns:
            List of AI suggestion dictionaries
        """
        params = {
            "per_page": per_page,
            "page": page,
        }

        if user_id:
            params["user_id"] = user_id
        if suggestion_type:
            params["suggestion_type"] = suggestion_type
        if status:
            params["status"] = status

        response = await self.client.get("/ai-suggestions", params=params)
        response.raise_for_status()
        return response.json()

    async def get_ai_suggestion(self, suggestion_id: str) -> dict:
        """Get AI suggestion details

        Args:
            suggestion_id: The ID of the suggestion

        Returns:
            AI suggestion dictionary
        """
        response = await self.client.get(f"/ai-suggestions/{suggestion_id}")
        response.raise_for_status()
        return response.json()

    async def get_ai_suggestions_stats(
        self,
        user_id: Optional[str] = None,
    ) -> dict:
        """Get AI suggestions statistics

        Args:
            user_id: Filter by user ID

        Returns:
            Dictionary with AI suggestions statistics
        """
        params = {}

        if user_id:
            params["user_id"] = user_id

        response = await self.client.get("/ai-suggestions/stats", params=params)
        response.raise_for_status()
        return response.json()

    async def get_developer_productivity(
        self,
        user_id: Optional[str] = None,
        days: int = 30,
    ) -> dict:
        """Get developer productivity metrics

        Args:
            user_id: Filter by user ID
            days: Number of days to analyze

        Returns:
            Dictionary with productivity metrics
        """
        end_date = datetime.now()
        start_date = end_date - __import__("datetime").timedelta(days=days)

        # Get token usage and suggestions
        token_summary = await self.get_token_usage_summary(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
        )
        suggestions_stats = await self.get_ai_suggestions_stats(user_id=user_id)

        # Calculate productivity score (example metric)
        total_suggestions = suggestions_stats.get("total_suggestions", 0)
        accepted = suggestions_stats.get("by_status", {}).get("accepted", 0)
        acceptance_rate = suggestions_stats.get("acceptance_rate", 0)

        # Productivity score based on suggestions usage and acceptance
        productivity_score = min(100, (
            (total_suggestions / days * 5) +  # Frequency factor
            (acceptance_rate * 50) +  # Quality factor
            (token_summary.get("success_rate", 0) * 30)  # Success factor
        ))

        return {
            "period_days": days,
            "productivity_score": round(productivity_score, 2),
            "total_ai_interactions": total_suggestions,
            "suggestions_accepted": accepted,
            "acceptance_rate": acceptance_rate,
            "token_usage": {
                "total_requests": token_summary.get("total_requests", 0),
                "total_tokens": (
                    token_summary.get("total_tokens_input", 0) +
                    token_summary.get("total_tokens_output", 0)
                ),
                "total_cost": token_summary.get("total_cost", 0),
            },
            "average_latency_ms": token_summary.get("average_latency_ms", 0),
            "success_rate": token_summary.get("success_rate", 0),
        }
