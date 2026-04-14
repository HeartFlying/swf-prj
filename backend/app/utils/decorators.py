"""Utility decorators for the application.

TDD Green Phase: Implement cache decorators.
"""

import functools
import inspect
from collections.abc import Callable
from typing import Any, TypeVar

from app.core.cache import CacheConfig
from app.core.logging import get_logger
from app.services.cache_service import get_cache_service

logger = get_logger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


def cached(
    key_prefix: str,
    ttl: int | None = None,
    key_builder: Callable[..., str] | None = None,
) -> Callable[[F], F]:
    """Decorator to cache function results.

    Args:
        key_prefix: Prefix for the cache key.
        ttl: Time to live in seconds (default: CacheConfig.DEFAULT_TTL).
        key_builder: Optional custom key builder function.

    Returns:
        Decorated function.

    Example:
        @cached(key_prefix="stats:user", ttl=600)
        async def get_user_stats(user_id: int, days: int = 30):
            return await compute_stats(user_id, days)
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            # Check for skip_cache parameter
            skip_cache = kwargs.pop("skip_cache", False)
            if skip_cache:
                return await func(*args, **kwargs)

            # Get cache service
            cache_service = await get_cache_service()
            if not cache_service.is_enabled:
                return await func(*args, **kwargs)

            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = _build_cache_key(key_prefix, func, args, kwargs)

            # Determine TTL
            cache_ttl = ttl or CacheConfig.DEFAULT_TTL

            # Try to get from cache or compute
            async def factory() -> Any:
                return await func(*args, **kwargs)

            try:
                return await cache_service.get_or_set(cache_key, factory, cache_ttl)
            except Exception as e:
                logger.error(f"Cache error in {func.__name__}: {e}")
                # Fallback to direct function call
                return await func(*args, **kwargs)

        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            # For sync functions, we can't use async cache
            # Just call the function directly
            logger.warning(f"Cache decorator used on sync function {func.__name__}")
            return func(*args, **kwargs)

        # Return appropriate wrapper based on function type
        if inspect.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return sync_wrapper  # type: ignore

    return decorator


def invalidate_cache(
    pattern: str | None = None,
    clear_stats: bool = False,
    clear_user_cache_param: str | None = None,
    clear_project_cache_param: str | None = None,
    clear_dashboard: bool = False,
    clear_trends: bool = False,
) -> Callable[[F], F]:
    """Decorator to invalidate cache after function execution.

    Args:
        pattern: Key pattern to invalidate (supports {param_name} substitution).
        clear_stats: Clear all stats cache.
        clear_user_cache_param: Parameter name containing user_id to clear.
        clear_project_cache_param: Parameter name containing project_id to clear.
        clear_dashboard: Clear all dashboard cache.
        clear_trends: Clear all trend cache.

    Returns:
        Decorated function.

    Example:
        @invalidate_cache(pattern="stats:user:{user_id}:*")
        async def update_user(user_id: int, data: dict):
            return await save_user(user_id, data)
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            # Execute the function first
            try:
                result = await func(*args, **kwargs)
                success = True
            except Exception:
                success = False
                raise
            finally:
                # Only invalidate on success
                if success:
                    await _invalidate_cache(
                        func,
                        args,
                        kwargs,
                        pattern,
                        clear_stats,
                        clear_user_cache_param,
                        clear_project_cache_param,
                        clear_dashboard,
                        clear_trends,
                    )

            return result

        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            # Execute the function first
            result = func(*args, **kwargs)

            # For sync functions, we need to handle async cache invalidation
            # This is a limitation - sync functions can't easily invalidate async cache
            logger.warning(
                f"Cache invalidation on sync function {func.__name__} may not work correctly"
            )

            return result

        # Return appropriate wrapper based on function type
        if inspect.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return sync_wrapper  # type: ignore

    return decorator


def _build_cache_key(
    key_prefix: str,
    func: Callable[..., Any],
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
) -> str:
    """Build a cache key from function arguments.

    Args:
        key_prefix: Prefix for the cache key.
        func: Function being decorated.
        args: Positional arguments.
        kwargs: Keyword arguments.

    Returns:
        Formatted cache key.
    """
    # Get function signature
    sig = inspect.signature(func)
    bound = sig.bind(*args, **kwargs)
    bound.apply_defaults()

    # Build key parts
    key_parts = [key_prefix]

    # Add parameter values (skip 'self' or 'cls' for methods)
    for name, value in bound.arguments.items():
        if name in ("self", "cls", "db", "session"):
            continue
        if value is not None:
            key_parts.append(f"{name}={value}")

    return CacheConfig.build_key(*key_parts)


async def _invalidate_cache(
    func: Callable[..., Any],
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
    pattern: str | None,
    clear_stats: bool,
    clear_user_cache_param: str | None,
    clear_project_cache_param: str | None,
    clear_dashboard: bool,
    clear_trends: bool,
) -> None:
    """Perform cache invalidation.

    Args:
        func: Function being decorated.
        args: Positional arguments.
        kwargs: Keyword arguments.
        pattern: Key pattern to invalidate.
        clear_stats: Clear all stats cache.
        clear_user_cache_param: Parameter name containing user_id.
        clear_project_cache_param: Parameter name containing project_id.
        clear_dashboard: Clear all dashboard cache.
        clear_trends: Clear all trend cache.
    """
    cache_service = await get_cache_service()
    if not cache_service.is_enabled:
        return

    # Get function signature for parameter extraction
    sig = inspect.signature(func)
    bound = sig.bind(*args, **kwargs)
    bound.apply_defaults()

    invalidated = False

    # Invalidate by pattern
    if pattern:
        # Substitute parameters in pattern
        formatted_pattern = pattern
        for name, value in bound.arguments.items():
            placeholder = "{" + name + "}"
            if placeholder in formatted_pattern:
                formatted_pattern = formatted_pattern.replace(placeholder, str(value))

        # Only invalidate if no unsubstituted placeholders remain
        if "{" not in formatted_pattern:
            count = await cache_service.delete_pattern(formatted_pattern)
            if count > 0:
                logger.debug(f"Invalidated {count} keys matching '{formatted_pattern}'")
                invalidated = True
        else:
            logger.warning(f"Pattern '{formatted_pattern}' has unsubstituted placeholders")

    # Clear user cache
    if clear_user_cache_param and clear_user_cache_param in bound.arguments:
        user_id = bound.arguments[clear_user_cache_param]
        count = await cache_service.clear_user_cache(int(user_id))
        if count > 0:
            logger.debug(f"Invalidated {count} keys for user {user_id}")
            invalidated = True

    # Clear project cache
    if clear_project_cache_param and clear_project_cache_param in bound.arguments:
        project_id = bound.arguments[clear_project_cache_param]
        count = await cache_service.clear_project_cache(int(project_id))
        if count > 0:
            logger.debug(f"Invalidated {count} keys for project {project_id}")
            invalidated = True

    # Clear stats cache
    if clear_stats:
        count = await cache_service.clear_stats_cache()
        if count > 0:
            logger.debug(f"Invalidated {count} stats keys")
            invalidated = True

    # Clear dashboard cache
    if clear_dashboard:
        count = await cache_service.clear_dashboard_cache()
        if count > 0:
            logger.debug(f"Invalidated {count} dashboard keys")
            invalidated = True

    # Clear trend cache
    if clear_trends:
        count = await cache_service.clear_trend_cache()
        if count > 0:
            logger.debug(f"Invalidated {count} trend keys")
            invalidated = True

    if invalidated:
        logger.info(f"Cache invalidation completed for {func.__name__}")


# Convenience decorators for common use cases

def cached_stats(endpoint: str, ttl: int | None = None) -> Callable[[F], F]:
    """Decorator for caching stats endpoints.

    Args:
        endpoint: Endpoint name for the cache key.
        ttl: Time to live in seconds.

    Returns:
        Decorated function.
    """
    return cached(key_prefix=f"stats:{endpoint}", ttl=ttl or CacheConfig.STATS_TTL)


def cached_dashboard(category: str, ttl: int | None = None) -> Callable[[F], F]:
    """Decorator for caching dashboard data.

    Args:
        category: Dashboard category (e.g., 'personal', 'project').
        ttl: Time to live in seconds.

    Returns:
        Decorated function.
    """
    return cached(
        key_prefix=f"dashboard:{category}",
        ttl=ttl or CacheConfig.DASHBOARD_TTL,
    )


def invalidate_user_cache(user_id_param: str = "user_id") -> Callable[[F], F]:
    """Decorator to invalidate user-specific cache.

    Args:
        user_id_param: Name of the parameter containing user_id.

    Returns:
        Decorated function.
    """
    return invalidate_cache(clear_user_cache_param=user_id_param)


def invalidate_project_cache(project_id_param: str = "project_id") -> Callable[[F], F]:
    """Decorator to invalidate project-specific cache.

    Args:
        project_id_param: Name of the parameter containing project_id.

    Returns:
        Decorated function.
    """
    return invalidate_cache(clear_project_cache_param=project_id_param)
