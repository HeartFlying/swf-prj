"""Cache service for managing Redis-based caching.

TDD Green Phase: Implement cache service.
"""

import json
from collections.abc import Callable
from typing import Any

import redis.asyncio as redis

from app.core.cache import CacheConfig
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class CacheService:
    """Service for managing cache operations.

    Provides methods for getting, setting, and invalidating cached data
    using Redis as the backend.
    """

    _instance: "CacheService | None" = None
    _redis: redis.Redis | None = None
    _enabled: bool = False

    def __new__(cls) -> "CacheService":
        """Singleton pattern to ensure single cache service instance."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def initialize(self) -> bool:
        """Initialize Redis connection.

        Returns:
            True if connection successful, False otherwise.
        """
        if self._redis is not None:
            return True

        try:
            self._redis = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
            )
            await self._redis.ping()
            self._enabled = True
            logger.info("Cache service initialized successfully")
            return True
        except Exception as e:
            logger.warning(f"Cache service initialization failed: {e}")
            self._enabled = False
            self._redis = None
            return False

    async def close(self) -> None:
        """Close Redis connection."""
        if self._redis is not None:
            await self._redis.close()
            self._redis = None
            self._enabled = False
            logger.info("Cache service closed")

    @property
    def is_enabled(self) -> bool:
        """Check if cache is enabled."""
        return self._enabled and self._redis is not None

    async def get(self, key: str, default: Any = None) -> Any:
        """Get value from cache.

        Args:
            key: Cache key.
            default: Default value if key not found.

        Returns:
            Cached value or default.
        """
        if not self.is_enabled:
            return default

        try:
            value = await self._redis.get(key)
            if value is None:
                return default
            return json.loads(value)
        except Exception as e:
            logger.error(f"Cache get error for key '{key}': {e}")
            return default

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int | None = None,
    ) -> bool:
        """Set value in cache.

        Args:
            key: Cache key.
            value: Value to cache (must be JSON serializable).
            ttl: Time to live in seconds (default: CacheConfig.DEFAULT_TTL).

        Returns:
            True if successful, False otherwise.
        """
        if not self.is_enabled:
            return False

        try:
            ttl = ttl or CacheConfig.DEFAULT_TTL
            serialized = json.dumps(value, default=str)
            await self._redis.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Cache set error for key '{key}': {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete a key from cache.

        Args:
            key: Cache key to delete.

        Returns:
            True if key was deleted, False otherwise.
        """
        if not self.is_enabled:
            return False

        try:
            result = await self._redis.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Cache delete error for key '{key}': {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern.

        Args:
            pattern: Key pattern to match (e.g., "stats:user:*").

        Returns:
            Number of keys deleted.
        """
        if not self.is_enabled:
            return 0

        try:
            keys = await self._redis.keys(pattern)
            if not keys:
                return 0
            result = await self._redis.delete(*keys)
            logger.debug(f"Deleted {result} keys matching pattern '{pattern}'")
            return result
        except Exception as e:
            logger.error(f"Cache delete_pattern error for pattern '{pattern}': {e}")
            return 0

    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache.

        Args:
            key: Cache key to check.

        Returns:
            True if key exists, False otherwise.
        """
        if not self.is_enabled:
            return False

        try:
            result = await self._redis.exists(key)
            return bool(result)
        except Exception as e:
            logger.error(f"Cache exists error for key '{key}': {e}")
            return False

    async def ttl(self, key: str) -> int:
        """Get remaining TTL for a key.

        Args:
            key: Cache key.

        Returns:
            Remaining TTL in seconds, -1 if no TTL, -2 if key doesn't exist.
        """
        if not self.is_enabled:
            return -2

        try:
            return await self._redis.ttl(key)
        except Exception as e:
            logger.error(f"Cache ttl error for key '{key}': {e}")
            return -2

    async def get_or_set(
        self,
        key: str,
        factory: Callable[[], Any],
        ttl: int | None = None,
    ) -> Any:
        """Get value from cache or compute and store it.

        Args:
            key: Cache key.
            factory: Async function to compute value if not in cache.
            ttl: Time to live in seconds.

        Returns:
            Cached or computed value.
        """
        # Try to get from cache first
        cached_value = await self.get(key)
        if cached_value is not None:
            logger.debug(f"Cache hit for key '{key}'")
            return cached_value

        # Compute value
        logger.debug(f"Cache miss for key '{key}', computing value")
        try:
            value = await factory()
        except Exception as e:
            logger.error(f"Factory error for key '{key}': {e}")
            raise

        # Store in cache
        await self.set(key, value, ttl)
        return value

    def get_stats_ttl(self, stats_type: str) -> int:
        """Get TTL for a specific stats type.

        Args:
            stats_type: Type of statistics.

        Returns:
            TTL in seconds.
        """
        return CacheConfig.get_ttl_for_stats_type(stats_type)

    async def clear_stats_cache(self) -> int:
        """Clear all stats-related cache.

        Returns:
            Number of keys deleted.
        """
        pattern = f"{CacheConfig.KEY_PREFIX}:{CacheConfig.STATS_PREFIX}:*"
        return await self.delete_pattern(pattern)

    async def clear_user_cache(self, user_id: int) -> int:
        """Clear all cache for a specific user.

        Args:
            user_id: User ID.

        Returns:
            Number of keys deleted.
        """
        # Clear personal stats
        pattern = f"{CacheConfig.KEY_PREFIX}:{CacheConfig.STATS_PREFIX}:personal:{user_id}:*"
        count = await self.delete_pattern(pattern)

        # Also clear any keys with user_id parameter
        pattern2 = f"{CacheConfig.KEY_PREFIX}:*:user_id={user_id}*"
        count += await self.delete_pattern(pattern2)

        logger.info(f"Cleared {count} cache entries for user {user_id}")
        return count

    async def clear_project_cache(self, project_id: int) -> int:
        """Clear all cache for a specific project.

        Args:
            project_id: Project ID.

        Returns:
            Number of keys deleted.
        """
        pattern = f"{CacheConfig.KEY_PREFIX}:{CacheConfig.STATS_PREFIX}:project:{project_id}:*"
        count = await self.delete_pattern(pattern)

        logger.info(f"Cleared {count} cache entries for project {project_id}")
        return count

    async def clear_dashboard_cache(self) -> int:
        """Clear all dashboard cache.

        Returns:
            Number of keys deleted.
        """
        pattern = f"{CacheConfig.KEY_PREFIX}:{CacheConfig.DASHBOARD_PREFIX}:*"
        return await self.delete_pattern(pattern)

    async def clear_trend_cache(self) -> int:
        """Clear all trend cache.

        Returns:
            Number of keys deleted.
        """
        pattern = f"{CacheConfig.KEY_PREFIX}:{CacheConfig.TREND_PREFIX}:*"
        return await self.delete_pattern(pattern)

    async def get_cache_stats(self) -> dict[str, Any]:
        """Get cache statistics.

        Returns:
            Dictionary with cache statistics.
        """
        if not self.is_enabled:
            return {
                "enabled": False,
                "keys_count": 0,
                "stats_keys": 0,
                "dashboard_keys": 0,
            }

        try:
            # Count keys by pattern
            all_keys = await self._redis.keys(f"{CacheConfig.KEY_PREFIX}:*")
            stats_keys = await self._redis.keys(
                f"{CacheConfig.KEY_PREFIX}:{CacheConfig.STATS_PREFIX}:*"
            )
            dashboard_keys = await self._redis.keys(
                f"{CacheConfig.KEY_PREFIX}:{CacheConfig.DASHBOARD_PREFIX}:*"
            )

            return {
                "enabled": True,
                "keys_count": len(all_keys),
                "stats_keys": len(stats_keys),
                "dashboard_keys": len(dashboard_keys),
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {
                "enabled": True,
                "error": str(e),
                "keys_count": 0,
                "stats_keys": 0,
                "dashboard_keys": 0,
            }


# Global cache service instance
_cache_service: CacheService | None = None


async def get_cache_service() -> CacheService:
    """Get or initialize the global cache service.

    Returns:
        CacheService instance.
    """
    global _cache_service

    if _cache_service is None:
        _cache_service = CacheService()
        await _cache_service.initialize()

    return _cache_service


def get_cache_service_sync() -> CacheService:
    """Get cache service without async initialization.

    Note: This should only be used when async context is not available.
    The service may not be connected to Redis yet.

    Returns:
        CacheService instance.
    """
    global _cache_service

    if _cache_service is None:
        _cache_service = CacheService()

    return _cache_service
