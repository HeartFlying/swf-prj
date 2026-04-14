"""Performance monitoring utilities for database queries.

Provides query timing and slow query detection capabilities.
"""

import time
import logging
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class QueryTimer:
    """Timer for tracking query execution time.

    Usage:
        timer = QueryTimer()
        with timer:
            # Execute query
            result = await session.execute(query)
        print(f"Query took {timer.elapsed_time:.3f}s")
    """

    start_time: Optional[float] = field(default=None, init=False)
    end_time: Optional[float] = field(default=None, init=False)

    def __enter__(self):
        """Start the timer."""
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Stop the timer."""
        self.end_time = time.perf_counter()

    @property
    def elapsed_time(self) -> float:
        """Get elapsed time in seconds.

        Returns:
            Elapsed time in seconds, or 0 if timer hasn't started
        """
        if self.start_time is None:
            return 0.0
        end = self.end_time if self.end_time is not None else time.perf_counter()
        return end - self.start_time

    @property
    def elapsed_ms(self) -> float:
        """Get elapsed time in milliseconds.

        Returns:
            Elapsed time in milliseconds
        """
        return self.elapsed_time * 1000


@dataclass
class SlowQueryDetector:
    """Detector for identifying slow queries.

    Usage:
        detector = SlowQueryDetector(threshold_ms=100)
        with detector:
            result = await session.execute(query)
        if detector.is_slow:
            logger.warning(f"Slow query detected: {detector.elapsed_ms:.2f}ms")

    Attributes:
        threshold_ms: Threshold in milliseconds for slow query detection
    """

    threshold_ms: float = 100.0
    timer: QueryTimer = field(default_factory=QueryTimer, init=False)
    query_info: Optional[dict] = field(default=None, init=False)

    def __enter__(self):
        """Start detection."""
        self.timer.__enter__()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Stop detection and log if slow."""
        self.timer.__exit__(exc_type, exc_val, exc_tb)

        if self.is_slow:
            logger.warning(
                f"Slow query detected: {self.elapsed_ms:.2f}ms "
                f"(threshold: {self.threshold_ms}ms)"
            )

    @property
    def elapsed_time(self) -> float:
        """Get elapsed time in seconds."""
        return self.timer.elapsed_time

    @property
    def elapsed_ms(self) -> float:
        """Get elapsed time in milliseconds."""
        return self.timer.elapsed_ms

    @property
    def is_slow(self) -> bool:
        """Check if query is considered slow."""
        return self.elapsed_ms > self.threshold_ms


@dataclass
class QueryStats:
    """Statistics for query performance monitoring.

    Tracks query execution statistics over time.
    """

    query_count: int = 0
    total_time_ms: float = 0.0
    slow_query_count: int = 0
    max_time_ms: float = 0.0
    min_time_ms: float = float('inf')

    def record_query(self, elapsed_ms: float, is_slow: bool = False):
        """Record a query execution.

        Args:
            elapsed_ms: Query execution time in milliseconds
            is_slow: Whether the query was considered slow
        """
        self.query_count += 1
        self.total_time_ms += elapsed_ms
        self.max_time_ms = max(self.max_time_ms, elapsed_ms)
        self.min_time_ms = min(self.min_time_ms, elapsed_ms)
        if is_slow:
            self.slow_query_count += 1

    @property
    def avg_time_ms(self) -> float:
        """Get average query time in milliseconds."""
        if self.query_count == 0:
            return 0.0
        return self.total_time_ms / self.query_count

    @property
    def slow_query_ratio(self) -> float:
        """Get ratio of slow queries (0.0 to 1.0)."""
        if self.query_count == 0:
            return 0.0
        return self.slow_query_count / self.query_count


def analyze_query_plan(session, query) -> dict:
    """Analyze query execution plan.

    Args:
        session: Database session
        query: SQLAlchemy query to analyze

    Returns:
        Dictionary with query plan information
    """
    # This is a placeholder for database-specific query plan analysis
    # In PostgreSQL, you would use EXPLAIN ANALYZE
    # In SQLite, you would use EXPLAIN QUERY PLAN

    return {
        "query": str(query),
        "note": "Query plan analysis requires database-specific implementation",
    }


@contextmanager
def timed_query(operation_name: str = "query"):
    """Context manager for timing database operations.

    Usage:
        with timed_query("fetch_users"):
            users = await session.execute(select(User))

    Args:
        operation_name: Name of the operation for logging
    """
    timer = QueryTimer()
    with timer:
        yield timer

    logger.debug(f"{operation_name} took {timer.elapsed_ms:.2f}ms")


def log_slow_queries(threshold_ms: float = 100.0):
    """Decorator for logging slow function execution.

    Usage:
        @log_slow_queries(threshold_ms=100)
        async def get_users():
            return await session.execute(select(User))

    Args:
        threshold_ms: Threshold in milliseconds for slow query logging
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            with SlowQueryDetector(threshold_ms=threshold_ms) as detector:
                result = await func(*args, **kwargs)

            if detector.is_slow:
                logger.warning(
                    f"Slow function detected: {func.__name__} "
                    f"took {detector.elapsed_ms:.2f}ms"
                )

            return result

        return wrapper
    return decorator
