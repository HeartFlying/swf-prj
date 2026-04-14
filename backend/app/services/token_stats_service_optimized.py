"""Optimized token usage statistics service with pagination support.

This module provides optimized versions of token statistics queries
with pagination support for large datasets.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TokenUsage, User
from app.utils.pagination import (
    PaginationParams,
    PaginatedResult,
    create_paginated_response,
)
from app.utils.performance import timed_query


class OptimizedTokenStatsService:
    """Optimized service for calculating token usage statistics.

    This service provides methods with improved performance for large datasets,
    including pagination support and optimized SQL queries.
    """

    async def get_user_token_usage_paginated(
        self,
        db: AsyncSession,
        user_id: int,
        start_date: date,
        end_date: date,
        params: PaginationParams,
    ) -> PaginatedResult[TokenUsage]:
        """Get paginated token usage records for a user.

        Args:
            db: Database session
            user_id: User ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            params: Pagination parameters

        Returns:
            PaginatedResult with TokenUsage objects
        """
        query = (
            select(TokenUsage)
            .where(TokenUsage.user_id == user_id)
            .where(TokenUsage.usage_date >= start_date)
            .where(TokenUsage.usage_date <= end_date)
            .order_by(TokenUsage.usage_date.desc())
        )

        items, total = await paginate_query(db, query, params)
        return create_paginated_response(items, total, params)

    async def get_project_token_usage_paginated(
        self,
        db: AsyncSession,
        project_id: int,
        start_date: date,
        end_date: date,
        params: PaginationParams,
    ) -> PaginatedResult[TokenUsage]:
        """Get paginated token usage records for a project.

        Args:
            db: Database session
            project_id: Project ID to filter by
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            params: Pagination parameters

        Returns:
            PaginatedResult with TokenUsage objects
        """
        query = (
            select(TokenUsage)
            .where(TokenUsage.project_id == project_id)
            .where(TokenUsage.usage_date >= start_date)
            .where(TokenUsage.usage_date <= end_date)
            .order_by(TokenUsage.usage_date.desc())
        )

        items, total = await paginate_query(db, query, params)
        return create_paginated_response(items, total, params)

    async def get_top_users_by_tokens_paginated(
        self,
        db: AsyncSession,
        params: PaginationParams,
        days: int = 30,
    ) -> PaginatedResult[dict]:
        """Get paginated top users by token usage.

        Args:
            db: Database session
            params: Pagination parameters
            days: Number of days to look back

        Returns:
            PaginatedResult with user token usage data
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        with timed_query("top_users_by_tokens"):
            # Build base query with date filter
            base_query = (
                select(
                    User.id.label("user_id"),
                    User.username,
                    User.department,
                    func.coalesce(func.sum(TokenUsage.token_count), 0).label("token_count"),
                )
                .join(TokenUsage, User.id == TokenUsage.user_id)
                .where(User.is_active == True)
                .where(TokenUsage.usage_date >= start_date)
                .where(TokenUsage.usage_date <= end_date)
                .group_by(User.id, User.username, User.department)
                .order_by(func.sum(TokenUsage.token_count).desc())
            )

            # Get total count
            count_query = select(func.count()).select_from(base_query.subquery())
            total_result = await db.execute(count_query)
            total = total_result.scalar() or 0

            # Apply pagination
            paginated_query = base_query.offset(params.offset).limit(params.limit)
            result = await db.execute(paginated_query)
            rows = result.all()

        items = [
            {
                "user_id": row.user_id,
                "username": row.username,
                "department": row.department,
                "token_count": int(row.token_count) if row.token_count else 0,
            }
            for row in rows
        ]

        return create_paginated_response(items, total, params)

    async def get_cost_analysis_optimized(
        self,
        db: AsyncSession,
        project_id: Optional[int],
        days: int = 30,
    ) -> dict:
        """Get optimized cost analysis for token usage.

        Uses batch queries for improved performance.

        Args:
            db: Database session
            project_id: Optional project ID to filter by
            days: Number of days to analyze

        Returns:
            Dictionary with cost analysis data
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

        with timed_query("cost_analysis"):
            # Get total cost and days with usage in one query
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

            # Calculate averages
            avg_daily_cost = (
                total_cost / days_with_usage if days_with_usage > 0 else Decimal("0")
            )
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

        return {
            "total_cost": total_cost,
            "avg_daily_cost": avg_daily_cost,
            "projected_monthly_cost": projected_monthly_cost,
            "cost_by_platform": cost_by_platform,
            "days_analyzed": days,
            "days_with_usage": days_with_usage,
        }


async def paginate_query(
    session: AsyncSession,
    query: select,
    params: PaginationParams,
) -> tuple[list, int]:
    """Helper function to execute paginated query.

    Args:
        session: Database session
        query: SQLAlchemy select query
        params: Pagination parameters

    Returns:
        Tuple of (items list, total count)
    """
    from sqlalchemy import func

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    paginated_query = query.offset(params.offset).limit(params.limit)
    result = await session.execute(paginated_query)
    items = list(result.scalars().all())

    return items, total
