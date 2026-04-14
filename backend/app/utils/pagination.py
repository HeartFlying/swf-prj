"""Pagination utilities for database queries.

Provides offset-based and cursor-based pagination for large datasets.
"""

from dataclasses import dataclass
from typing import Any, Generic, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


@dataclass
class PaginationParams:
    """Parameters for offset-based pagination.

    Attributes:
        page: Page number (1-indexed)
        pageSize: Number of items per page
    """

    page: int = 1
    pageSize: int = 20

    def __post_init__(self):
        """Validate pagination parameters."""
        if self.page < 1:
            self.page = 1
        if self.pageSize < 1:
            self.pageSize = 20
        if self.pageSize > 1000:
            self.pageSize = 1000  # Max limit

    @property
    def offset(self) -> int:
        """Calculate offset for SQL query."""
        return (self.page - 1) * self.pageSize

    @property
    def limit(self) -> int:
        """Get limit for SQL query."""
        return self.pageSize


@dataclass
class CursorPaginationParams:
    """Parameters for cursor-based pagination.

    Attributes:
        cursor: Cursor value for pagination (last seen value)
        limit: Number of items to fetch
        direction: Sort direction ("asc" or "desc")
    """

    cursor: Any = None
    limit: int = 20
    direction: str = "asc"

    def __post_init__(self):
        """Validate pagination parameters."""
        if self.limit < 1:
            self.limit = 20
        if self.limit > 1000:
            self.limit = 1000  # Max limit
        if self.direction not in ("asc", "desc"):
            self.direction = "asc"


@dataclass
class PaginatedResult(Generic[T]):
    """Result of a paginated query.

    Attributes:
        items: List of items for current page
        total: Total number of items
        page: Current page number
        pageSize: Number of items per page
        total_pages: Total number of pages
        has_next: Whether there is a next page
        has_prev: Whether there is a previous page
    """

    items: list[T]
    total: int
    page: int
    pageSize: int

    @property
    def total_pages(self) -> int:
        """Calculate total number of pages."""
        return (self.total + self.pageSize - 1) // self.pageSize

    @property
    def has_next(self) -> bool:
        """Check if there is a next page."""
        return self.page < self.total_pages

    @property
    def has_prev(self) -> bool:
        """Check if there is a previous page."""
        return self.page > 1


@dataclass
class CursorPaginatedResult(Generic[T]):
    """Result of a cursor-based paginated query.

    Attributes:
        items: List of items
        next_cursor: Cursor for next page (None if no more items)
        has_more: Whether there are more items
        limit: Number of items requested
    """

    items: list[T]
    next_cursor: Any
    has_more: bool
    limit: int


async def paginate_query(
    session: AsyncSession,
    query: Select,
    params: PaginationParams,
) -> tuple[list[Any], int]:
    """Execute a paginated query with offset-based pagination.

    Args:
        session: Database session
        query: SQLAlchemy select query
        params: Pagination parameters

    Returns:
        Tuple of (items list, total count)
    """
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    paginated_query = query.offset(params.offset).limit(params.limit)
    result = await session.execute(paginated_query)
    items = list(result.scalars().all())

    return items, total


async def cursor_paginate(
    session: AsyncSession,
    query: Select,
    params: CursorPaginationParams,
    cursor_field: str = "id",
) -> CursorPaginatedResult[Any]:
    """Execute a paginated query with cursor-based pagination.

    Cursor-based pagination is more efficient for large datasets
    as it doesn't require counting total records.

    Args:
        session: Database session
        query: SQLAlchemy select query
        params: Cursor pagination parameters
        cursor_field: Field to use for cursor (default: "id")

    Returns:
        CursorPaginatedResult with items and next cursor
    """
    from sqlalchemy import column

    # Apply cursor filter
    if params.cursor is not None:
        cursor_col = column(cursor_field)
        if params.direction == "asc":
            query = query.where(cursor_col > params.cursor)
        else:
            query = query.where(cursor_col < params.cursor)

    # Apply ordering
    cursor_col = column(cursor_field)
    if params.direction == "asc":
        query = query.order_by(cursor_col.asc())
    else:
        query = query.order_by(cursor_col.desc())

    # Fetch one extra record to determine if there are more
    query = query.limit(params.limit + 1)

    result = await session.execute(query)
    rows = list(result.scalars().all())

    # Check if there are more items
    has_more = len(rows) > params.limit
    if has_more:
        rows = rows[:params.limit]  # Remove the extra item

    # Get next cursor
    next_cursor = None
    if has_more and rows:
        next_cursor = getattr(rows[-1], cursor_field)

    return CursorPaginatedResult(
        items=rows,
        next_cursor=next_cursor,
        has_more=has_more,
        limit=params.limit,
    )


def create_paginated_response(
    items: list[Any],
    total: int,
    params: PaginationParams,
) -> PaginatedResult[Any]:
    """Create a paginated response from query results.

    Args:
        items: List of items for current page
        total: Total number of items
        params: Pagination parameters used

    Returns:
        PaginatedResult with metadata
    """
    return PaginatedResult(
        items=items,
        total=total,
        page=params.page,
        pageSize=params.pageSize,
    )
