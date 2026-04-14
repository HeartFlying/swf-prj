"""Tests for cache service.

TDD Red Phase: Write tests before implementation.
"""

import json
import pytest
from unittest.mock import AsyncMock

from app.services.cache_service import CacheService
from app.core.cache import CacheConfig, CacheKeys


class TestCacheConfig:
    """Tests for CacheConfig class."""

    def test_default_ttl(self):
        """Test default TTL values."""
        assert CacheConfig.DEFAULT_TTL == 300
        assert CacheConfig.STATS_TTL == 600
        assert CacheConfig.DASHBOARD_TTL == 300
        assert CacheConfig.TREND_TTL == 900

    def test_key_prefixes(self):
        """Test cache key prefixes."""
        assert CacheConfig.KEY_PREFIX == "coding_agent_stats"
        assert CacheConfig.STATS_PREFIX == "stats"
        assert CacheConfig.DASHBOARD_PREFIX == "dashboard"
        assert CacheConfig.TREND_PREFIX == "trend"

    def test_build_key(self):
        """Test building cache keys."""
        key = CacheConfig.build_key("stats", "user", "123", "summary")
        assert key == "coding_agent_stats:stats:user:123:summary"

    def test_build_key_with_params(self):
        """Test building cache keys with query params."""
        key = CacheConfig.build_key("stats", "user", "123", days=30)
        assert key == "coding_agent_stats:stats:user:123:days=30"

    def test_build_key_with_multiple_params(self):
        """Test building cache keys with multiple params."""
        key = CacheConfig.build_key("stats", "user", start_date="2024-01-01", end_date="2024-01-31")
        assert "coding_agent_stats:stats:user" in key
        assert "start_date=2024-01-01" in key
        assert "end_date=2024-01-31" in key


class TestCacheKeys:
    """Tests for CacheKeys helper class."""

    def test_stats_key(self):
        """Test stats key generation."""
        key = CacheKeys.stats_key("personal", "dashboard", user_id=123)
        assert key == "coding_agent_stats:stats:personal:dashboard:user_id=123"

    def test_global_stats_key(self):
        """Test global stats key generation."""
        key = CacheKeys.global_stats_key("summary", days=30)
        assert key == "coding_agent_stats:stats:global:summary:days=30"

    def test_project_stats_key(self):
        """Test project stats key generation."""
        key = CacheKeys.project_stats_key(456, "overview")
        assert key == "coding_agent_stats:stats:project:456:overview"

    def test_personal_stats_key(self):
        """Test personal stats key generation."""
        key = CacheKeys.personal_stats_key(789, "heatmap", days=30)
        assert key == "coding_agent_stats:stats:personal:789:heatmap:days=30"


class TestCacheService:
    """Tests for CacheService class."""

    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        mock = AsyncMock()
        mock.get = AsyncMock()
        mock.set = AsyncMock()
        mock.setex = AsyncMock()
        mock.delete = AsyncMock()
        mock.keys = AsyncMock(return_value=[])
        mock.ping = AsyncMock()
        return mock

    @pytest.fixture
    def cache_service(self, mock_redis):
        """Create a CacheService with mock Redis."""
        service = CacheService()
        service._redis = mock_redis
        service._enabled = True
        return service

    @pytest.mark.asyncio
    async def test_get_existing_key(self, cache_service, mock_redis):
        """Test getting an existing cache key."""
        mock_redis.get.return_value = json.dumps({"data": "test"})

        result = await cache_service.get("test:key")

        assert result == {"data": "test"}
        mock_redis.get.assert_called_once_with("test:key")

    @pytest.mark.asyncio
    async def test_get_nonexistent_key(self, cache_service, mock_redis):
        """Test getting a non-existent cache key."""
        mock_redis.get.return_value = None

        result = await cache_service.get("test:key")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_with_default(self, cache_service, mock_redis):
        """Test getting with default value."""
        mock_redis.get.return_value = None

        result = await cache_service.get("test:key", default={"default": "value"})

        assert result == {"default": "value"}

    @pytest.mark.asyncio
    async def test_set_value(self, cache_service, mock_redis):
        """Test setting a cache value."""
        data = {"test": "data"}

        result = await cache_service.set("test:key", data, ttl=300)

        assert result is True
        mock_redis.setex.assert_called_once()
        call_args = mock_redis.setex.call_args
        assert call_args[0][0] == "test:key"
        assert call_args[0][1] == 300

    @pytest.mark.asyncio
    async def test_set_without_ttl(self, cache_service, mock_redis):
        """Test setting a cache value without TTL."""
        data = {"test": "data"}

        result = await cache_service.set("test:key", data)

        assert result is True
        mock_redis.setex.assert_called_once()
        call_args = mock_redis.setex.call_args
        assert call_args[0][1] == CacheConfig.DEFAULT_TTL

    @pytest.mark.asyncio
    async def test_delete_key(self, cache_service, mock_redis):
        """Test deleting a cache key."""
        mock_redis.delete.return_value = 1

        result = await cache_service.delete("test:key")

        assert result is True
        mock_redis.delete.assert_called_once_with("test:key")

    @pytest.mark.asyncio
    async def test_delete_pattern(self, cache_service, mock_redis):
        """Test deleting keys by pattern."""
        mock_redis.keys.return_value = ["key1", "key2", "key3"]
        mock_redis.delete.return_value = 3

        result = await cache_service.delete_pattern("test:*")

        assert result == 3
        mock_redis.keys.assert_called_once_with("test:*")

    @pytest.mark.asyncio
    async def test_exists(self, cache_service, mock_redis):
        """Test checking if key exists."""
        mock_redis.exists.return_value = 1

        result = await cache_service.exists("test:key")

        assert result is True

    @pytest.mark.asyncio
    async def test_exists_not_found(self, cache_service, mock_redis):
        """Test checking if non-existent key exists."""
        mock_redis.exists.return_value = 0

        result = await cache_service.exists("test:key")

        assert result is False

    @pytest.mark.asyncio
    async def test_get_or_set_cache_miss(self, cache_service, mock_redis):
        """Test get_or_set with cache miss."""
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True

        async def factory():
            return {"computed": "value"}

        result = await cache_service.get_or_set("test:key", factory, ttl=300)

        assert result == {"computed": "value"}
        mock_redis.setex.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_or_set_cache_hit(self, cache_service, mock_redis):
        """Test get_or_set with cache hit."""
        mock_redis.get.return_value = json.dumps({"cached": "value"})

        async def factory():
            return {"computed": "value"}

        result = await cache_service.get_or_set("test:key", factory, ttl=300)

        assert result == {"cached": "value"}
        mock_redis.setex.assert_not_called()

    @pytest.mark.asyncio
    async def test_clear_stats_cache(self, cache_service, mock_redis):
        """Test clearing all stats cache."""
        mock_redis.keys.return_value = ["stats:key1", "stats:key2"]
        mock_redis.delete.return_value = 2

        result = await cache_service.clear_stats_cache()

        assert result == 2
        mock_redis.keys.assert_called_once_with("coding_agent_stats:stats:*")

    @pytest.mark.asyncio
    async def test_clear_user_cache(self, cache_service, mock_redis):
        """Test clearing user-specific cache."""
        async def mock_keys_pattern(pattern):
            if "personal:123" in pattern:
                return ["stats:personal:123:key1"]
            elif "user_id=123" in pattern:
                return []
            return []

        mock_redis.keys.side_effect = mock_keys_pattern
        mock_redis.delete.return_value = 1

        result = await cache_service.clear_user_cache(123)

        assert result == 1

    @pytest.mark.asyncio
    async def test_clear_project_cache(self, cache_service, mock_redis):
        """Test clearing project-specific cache."""
        mock_redis.keys.return_value = ["stats:project:456:key1"]
        mock_redis.delete.return_value = 1

        result = await cache_service.clear_project_cache(456)

        assert result == 1
        mock_redis.keys.assert_called_once_with("coding_agent_stats:stats:project:456:*")

    @pytest.mark.asyncio
    async def test_get_stats_ttl(self, cache_service):
        """Test getting TTL for different stats types."""
        assert cache_service.get_stats_ttl("trend") == CacheConfig.TREND_TTL
        assert cache_service.get_stats_ttl("dashboard") == CacheConfig.DASHBOARD_TTL
        assert cache_service.get_stats_ttl("summary") == CacheConfig.STATS_TTL
        assert cache_service.get_stats_ttl("unknown") == CacheConfig.DEFAULT_TTL

    @pytest.mark.asyncio
    async def test_disabled_cache(self, mock_redis):
        """Test behavior when cache is disabled."""
        service = CacheService()
        service._redis = None
        service._enabled = False

        result = await service.get("test:key")
        assert result is None

        result = await service.set("test:key", {"data": "test"})
        assert result is False

        result = await service.delete("test:key")
        assert result is False

    @pytest.mark.asyncio
    async def test_redis_error_handling(self, cache_service, mock_redis):
        """Test error handling when Redis fails."""
        mock_redis.get.side_effect = Exception("Redis connection error")

        result = await cache_service.get("test:key")

        assert result is None

    @pytest.mark.asyncio
    async def test_set_redis_error(self, cache_service, mock_redis):
        """Test error handling when setting cache fails."""
        mock_redis.setex.side_effect = Exception("Redis connection error")

        result = await cache_service.set("test:key", {"data": "test"})

        assert result is False


class TestCacheServiceIntegration:
    """Integration tests for CacheService with real Redis (if available)."""

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires running Redis server")
    async def test_real_redis_connection(self):
        """Test with real Redis connection."""
        service = CacheService()
        await service.initialize()

        # Test set and get
        test_data = {"test": "data", "number": 42}
        await service.set("test:key", test_data, ttl=60)

        result = await service.get("test:key")
        assert result == test_data

        # Clean up
        await service.delete("test:key")

    @pytest.mark.asyncio
    async def test_json_serialization(self):
        """Test JSON serialization of complex objects."""
        service = CacheService()
        service._redis = AsyncMock()
        service._enabled = True

        # Test with various data types
        test_cases = [
            {"key": "value"},
            [1, 2, 3],
            "string value",
            42,
            3.14,
            True,
            None,
        ]

        for data in test_cases:
            service._redis.get.return_value = json.dumps(data)
            result = await service.get("test:key")
            assert result == data
