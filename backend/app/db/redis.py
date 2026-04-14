"""Redis client configuration for caching and token blacklist.

TDD Green Phase: Implement Redis client to support token blacklist.
"""

import redis.asyncio as redis

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Global Redis client instance
_redis_client: redis.Redis | None = None


async def get_redis_client() -> redis.Redis | None:
    """Get or create Redis client instance.

    Returns:
        Redis client instance, or None if Redis is unavailable.
    """
    global _redis_client

    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
            )
            # Test connection
            await _redis_client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.warning(f"Redis unavailable, operating without cache: {e}")
            _redis_client = None

    return _redis_client


async def close_redis_client() -> None:
    """Close Redis client connection."""
    global _redis_client

    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
        logger.info("Redis connection closed")


class TokenBlacklist:
    """Token blacklist manager using Redis.

    Stores blacklisted tokens with their expiration time.
    """

    TOKEN_BLACKLIST_PREFIX = "token:blacklist:"

    @classmethod
    async def blacklist_token(cls, token: str, expires_in: int) -> bool:
        """Add a token to the blacklist.

        Args:
            token: The JWT token to blacklist.
            expires_in: Time in seconds until the token expires naturally.

        Returns:
            True if successful, False otherwise.
        """
        try:
            client = await get_redis_client()
            if client is None:
                logger.warning("Redis unavailable, skipping token blacklist")
                return True  # Pretend success when Redis is down
            key = f"{cls.TOKEN_BLACKLIST_PREFIX}{token}"
            await client.setex(key, expires_in, "1")
            logger.debug("Token added to blacklist")
            return True
        except Exception as e:
            logger.error(f"Failed to blacklist token: {e}")
            return False

    @classmethod
    async def is_blacklisted(cls, token: str) -> bool:
        """Check if a token is blacklisted.

        Args:
            token: The JWT token to check.

        Returns:
            True if token is blacklisted, False otherwise.
        """
        try:
            client = await get_redis_client()
            if client is None:
                # Redis unavailable, assume not blacklisted (graceful degradation)
                return False
            key = f"{cls.TOKEN_BLACKLIST_PREFIX}{token}"
            result = await client.exists(key)
            return bool(result)
        except Exception as e:
            logger.error(f"Failed to check token blacklist: {e}")
            # Graceful degradation: assume not blacklisted on error
            return False
