"""Token usage statistics service for calculating AI platform consumption metrics.

This service provides real database-backed statistics for token usage,
replacing mock data with actual SQL queries.
"""

import time
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import TokenUsage, User

logger = get_logger(__name__)


class TokenUsageSummary:
    """Token usage summary data class."""

    def __init__(
        self,
        total_tokens: int,
        api_calls: int,
        total_cost: Decimal,
        platform_breakdown: dict[str, int],
    ):
        self.total_tokens = total_tokens
        self.api_calls = api_calls
        self.total_cost = total_cost
        self.platform_breakdown = platform_breakdown


class DailyTokenStats:
    """Daily token statistics data class."""

    def __init__(
        self,
        date: date,
        token_count: int,
        api_calls: int,
        cost: Decimal,
    ):
        self.date = date
        self.token_count = token_count
        self.api_calls = api_calls
        self.cost = cost


class CostAnalysisResult:
    """Cost analysis result data class."""

    def __init__(
        self,
        total_cost: Decimal,
        avg_daily_cost: Decimal,
        projected_monthly_cost: Decimal,
        cost_by_platform: dict[str, Decimal],
        cost_by_user: list[dict],
    ):
        self.total_cost = total_cost
        self.avg_daily_cost = avg_daily_cost
        self.projected_monthly_cost = projected_monthly_cost
        self.cost_by_platform = cost_by_platform
        self.cost_by_user = cost_by_user


class TokenStatsService:
    """Service for calculating token usage statistics.

    This service provides methods to query and aggregate token usage data
    from the database, supporting both user-level and project-level statistics.
    """

    async def get_user_token_usage(
        self,
        db: AsyncSession,
        user_id: int,
        start_date: date,
        end_date: date,
    ) -> TokenUsageSummary:
        """Get token usage summary for a user within a date range.

        Args:
            db: Database session
            user_id: User ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            TokenUsageSummary with aggregated statistics
        """
        start_time = time.time()

        # Get overall summary
        result = await db.execute(
            select(
                func.coalesce(func.sum(TokenUsage.token_count), 0).label("total_tokens"),
                func.coalesce(func.sum(TokenUsage.api_calls), 0).label("api_calls"),
                func.coalesce(func.sum(TokenUsage.cost), Decimal("0")).label("total_cost"),
            )
            .where(TokenUsage.user_id == user_id)
            .where(TokenUsage.usage_date >= start_date)
            .where(TokenUsage.usage_date <= end_date)
        )

        row = result.one()

        # Get platform breakdown
        platform_result = await db.execute(
            select(
                TokenUsage.platform,
                func.coalesce(func.sum(TokenUsage.token_count), 0).label("token_count"),
            )
            .where(TokenUsage.user_id == user_id)
            .where(TokenUsage.usage_date >= start_date)
            .where(TokenUsage.usage_date <= end_date)
            .group_by(TokenUsage.platform)
        )

        platform_breakdown = {
            row.platform: int(row.token_count) if row.token_count else 0
            for row in platform_result.all()
        }

        summary = TokenUsageSummary(
            total_tokens=int(row.total_tokens) if row.total_tokens else 0,
            api_calls=int(row.api_calls) if row.api_calls else 0,
            total_cost=row.total_cost or Decimal("0"),
            platform_breakdown=platform_breakdown,
        )

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "Retrieved user token usage",
            user_id=user_id,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            total_tokens=summary.total_tokens,
            duration_ms=duration_ms,
        )

        return summary

    async def get_project_token_usage(
        self,
        db: AsyncSession,
        project_id: int,
        start_date: date,
        end_date: date,
    ) -> TokenUsageSummary:
        """Get token usage summary for a project within a date range.

        Args:
            db: Database session
            project_id: Project ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            TokenUsageSummary with aggregated statistics
        """
        # Get overall summary
        result = await db.execute(
            select(
                func.coalesce(func.sum(TokenUsage.token_count), 0).label("total_tokens"),
                func.coalesce(func.sum(TokenUsage.api_calls), 0).label("api_calls"),
                func.coalesce(func.sum(TokenUsage.cost), Decimal("0")).label("total_cost"),
            )
            .where(TokenUsage.project_id == project_id)
            .where(TokenUsage.usage_date >= start_date)
            .where(TokenUsage.usage_date <= end_date)
        )

        row = result.one()

        # Get platform breakdown
        platform_result = await db.execute(
            select(
                TokenUsage.platform,
                func.coalesce(func.sum(TokenUsage.token_count), 0).label("token_count"),
            )
            .where(TokenUsage.project_id == project_id)
            .where(TokenUsage.usage_date >= start_date)
            .where(TokenUsage.usage_date <= end_date)
            .group_by(TokenUsage.platform)
        )

        platform_breakdown = {
            row.platform: int(row.token_count) if row.token_count else 0
            for row in platform_result.all()
        }

        return TokenUsageSummary(
            total_tokens=int(row.total_tokens) if row.total_tokens else 0,
            api_calls=int(row.api_calls) if row.api_calls else 0,
            total_cost=row.total_cost or Decimal("0"),
            platform_breakdown=platform_breakdown,
        )

    async def calculate_token_trends(
        self,
        db: AsyncSession,
        user_id: Optional[int],
        project_id: Optional[int],
        days: int,
    ) -> list[DailyTokenStats]:
        """Get daily token usage trends for the specified number of days.

        Args:
            db: Database session
            user_id: Optional user ID to filter by
            project_id: Optional project ID to filter by
            days: Number of days to look back

        Returns:
            List of DailyTokenStats objects
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        # Build query for daily aggregation
        query = (
            select(
                TokenUsage.usage_date.label("usage_date"),
                func.coalesce(func.sum(TokenUsage.token_count), 0).label("token_count"),
                func.coalesce(func.sum(TokenUsage.api_calls), 0).label("api_calls"),
                func.coalesce(func.sum(TokenUsage.cost), Decimal("0")).label("cost"),
            )
            .where(
                TokenUsage.usage_date >= start_date,
                TokenUsage.usage_date <= end_date,
            )
            .group_by(TokenUsage.usage_date)
            .order_by(TokenUsage.usage_date)
        )

        if user_id is not None:
            query = query.where(TokenUsage.user_id == user_id)
        if project_id is not None:
            query = query.where(TokenUsage.project_id == project_id)

        result = await db.execute(query)
        rows = result.all()

        # Create a lookup dictionary for database results
        db_data = {
            row.usage_date: DailyTokenStats(
                date=row.usage_date,
                token_count=int(row.token_count) if row.token_count else 0,
                api_calls=int(row.api_calls) if row.api_calls else 0,
                cost=row.cost or Decimal("0"),
            )
            for row in rows
        }

        # Fill in missing dates with zero values
        trends = []
        current = start_date
        while current <= end_date:
            if current in db_data:
                trends.append(db_data[current])
            else:
                trends.append(
                    DailyTokenStats(
                        date=current,
                        token_count=0,
                        api_calls=0,
                        cost=Decimal("0"),
                    )
                )
            current += timedelta(days=1)

        return trends

    async def get_cost_analysis(
        self,
        db: AsyncSession,
        project_id: Optional[int],
        days: int = 30,
    ) -> CostAnalysisResult:
        """Get cost analysis for token usage.

        Args:
            db: Database session
            project_id: Optional project ID to filter by
            days: Number of days to analyze

        Returns:
            CostAnalysisResult with detailed cost breakdown
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        # Build base query conditions
        conditions = [
            TokenUsage.usage_date >= start_date,
            TokenUsage.usage_date <= end_date,
        ]
        if project_id is not None:
            conditions.append(TokenUsage.project_id == project_id)

        # Get total cost
        total_result = await db.execute(
            select(
                func.coalesce(func.sum(TokenUsage.cost), Decimal("0")).label("total_cost"),
                func.count(func.distinct(TokenUsage.usage_date)).label("days_with_usage"),
            )
            .where(*conditions)
        )

        total_row = total_result.one()
        total_cost = total_row.total_cost or Decimal("0")
        days_with_usage = total_row.days_with_usage or 0

        # Calculate average daily cost
        avg_daily_cost = (
            total_cost / days_with_usage if days_with_usage > 0 else Decimal("0")
        )

        # Projected monthly cost (30 days)
        projected_monthly_cost = avg_daily_cost * 30

        # Get cost by platform
        platform_result = await db.execute(
            select(
                TokenUsage.platform,
                func.coalesce(func.sum(TokenUsage.cost), Decimal("0")).label("cost"),
            )
            .where(*conditions)
            .group_by(TokenUsage.platform)
        )

        cost_by_platform = {
            row.platform: row.cost or Decimal("0")
            for row in platform_result.all()
        }

        # Get cost by user
        user_result = await db.execute(
            select(
                User.id.label("user_id"),
                User.username,
                User.department,
                func.coalesce(func.sum(TokenUsage.cost), Decimal("0")).label("cost"),
                func.coalesce(func.sum(TokenUsage.token_count), 0).label("token_count"),
            )
            .join(TokenUsage, User.id == TokenUsage.user_id)
            .where(*conditions)
            .group_by(User.id, User.username, User.department)
            .order_by(func.sum(TokenUsage.cost).desc())
            .limit(20)
        )

        cost_by_user = [
            {
                "user_id": row.user_id,
                "username": row.username,
                "department": row.department,
                "cost": row.cost or Decimal("0"),
                "token_count": int(row.token_count) if row.token_count else 0,
            }
            for row in user_result.all()
        ]

        return CostAnalysisResult(
            total_cost=total_cost,
            avg_daily_cost=avg_daily_cost,
            projected_monthly_cost=projected_monthly_cost,
            cost_by_platform=cost_by_platform,
            cost_by_user=cost_by_user,
        )

    async def get_top_users_by_tokens(
        self,
        db: AsyncSession,
        limit: int = 20,
    ) -> list[dict]:
        """Get top users by token usage.

        Args:
            db: Database session
            limit: Maximum number of results

        Returns:
            List of dictionaries with user token usage data
        """
        result = await db.execute(
            select(
                User.id.label("user_id"),
                User.username,
                User.department,
                func.coalesce(func.sum(TokenUsage.token_count), 0).label("token_count"),
            )
            .join(TokenUsage, User.id == TokenUsage.user_id)
            .where(User.is_active == True)
            .group_by(User.id, User.username, User.department)
            .order_by(func.sum(TokenUsage.token_count).desc())
            .limit(limit)
        )

        rows = result.all()

        return [
            {
                "user_id": row.user_id,
                "username": row.username,
                "department": row.department,
                "token_count": int(row.token_count) if row.token_count else 0,
            }
            for row in rows
        ]
