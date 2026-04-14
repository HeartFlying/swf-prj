"""Tests for cache decorator.

TDD Red Phase: Write tests before implementation.
"""

import pytest
from unittest.mock import AsyncMock, patch

from app.utils.decorators import cached, invalidate_cache
from app.services.cache_service import CacheService


class TestCachedDecorator:
    """Tests for the @cached decorator."""

    @pytest.fixture
    def mock_cache_service(self):
        """Create a mock cache service."""
        mock = AsyncMock(spec=CacheService)
        mock.get = AsyncMock(return_value=None)
        mock.set = AsyncMock(return_value=True)
        mock.get_or_set = AsyncMock()
        return mock

    @pytest.mark.asyncio
    async def test_cached_decorator_cache_miss(self, mock_cache_service):
        """Test cached decorator with cache miss."""
        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            mock_cache_service.get_or_set = AsyncMock(return_value={"result": "computed"})

            @cached(key_prefix="test", ttl=300)
            async def test_function(arg1, arg2):
                return {"result": f"{arg1}_{arg2}"}

            result = await test_function("a", "b")

            assert result == {"result": "computed"}
            mock_cache_service.get_or_set.assert_called_once()

    @pytest.mark.asyncio
    async def test_cached_decorator_key_generation(self, mock_cache_service):
        """Test that decorator generates correct cache key."""
        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            mock_cache_service.get_or_set = AsyncMock(return_value={"data": "test"})

            @cached(key_prefix="stats:user", ttl=300)
            async def get_user_stats(user_id, days=30):
                return {"user_id": user_id, "days": days}

            await get_user_stats(123, days=30)

            call_args = mock_cache_service.get_or_set.call_args
            cache_key = call_args[0][0]
            assert "stats:user" in cache_key
            assert "123" in cache_key

    @pytest.mark.asyncio
    async def test_cached_decorator_with_self(self, mock_cache_service):
        """Test cached decorator on class method."""
        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            mock_cache_service.get_or_set = AsyncMock(return_value={"data": "test"})

            class TestService:
                @cached(key_prefix="service:data", ttl=300)
                async def get_data(self, item_id):
                    return {"id": item_id}

            service = TestService()
            result = await service.get_data(456)

            assert result == {"data": "test"}
            call_args = mock_cache_service.get_or_set.call_args
            assert "456" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_cached_decorator_skip_cache(self, mock_cache_service):
        """Test cached decorator with skip_cache parameter."""
        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            @cached(key_prefix="test", ttl=300)
            async def test_function(arg1):
                return {"result": arg1}

            result = await test_function("value", skip_cache=True)

            assert result == {"result": "value"}
            mock_cache_service.get_or_set.assert_not_called()

    @pytest.mark.asyncio
    async def test_cached_decorator_disabled_cache(self, mock_cache_service):
        """Test cached decorator when cache is disabled."""
        mock_cache_service.is_enabled = False

        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            @cached(key_prefix="test", ttl=300)
            async def test_function(arg1):
                return {"result": arg1}

            result = await test_function("value")

            assert result == {"result": "value"}
            mock_cache_service.get_or_set.assert_not_called()

    @pytest.mark.asyncio
    async def test_cached_decorator_ttl_parameter(self, mock_cache_service):
        """Test that TTL is passed correctly."""
        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            mock_cache_service.get_or_set = AsyncMock(return_value={"data": "test"})

            @cached(key_prefix="test", ttl=600)
            async def test_function():
                return {"result": "test"}

            await test_function()

            call_args = mock_cache_service.get_or_set.call_args
            # TTL is passed as a positional argument (third arg)
            assert call_args[0][2] == 600


class TestInvalidateCacheDecorator:
    """Tests for the @invalidate_cache decorator."""

    @pytest.fixture
    def mock_cache_service(self):
        """Create a mock cache service."""
        mock = AsyncMock(spec=CacheService)
        mock.delete_pattern = AsyncMock(return_value=1)
        mock.clear_stats_cache = AsyncMock(return_value=5)
        mock.clear_user_cache = AsyncMock(return_value=2)
        mock.clear_project_cache = AsyncMock(return_value=3)
        return mock

    @pytest.mark.asyncio
    async def test_invalidate_on_success(self, mock_cache_service):
        """Test cache invalidation on successful function execution."""
        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            @invalidate_cache(pattern="stats:user:*")
            async def update_user(user_id):
                return {"updated": True}

            result = await update_user(123)

            assert result == {"updated": True}
            mock_cache_service.delete_pattern.assert_called_once_with("stats:user:*")

    @pytest.mark.asyncio
    async def test_invalidate_with_dynamic_pattern(self, mock_cache_service):
        """Test cache invalidation with dynamic pattern from args."""
        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            @invalidate_cache(pattern="stats:user:{user_id}:*")
            async def update_user(user_id):
                return {"updated": True}

            await update_user(456)

            mock_cache_service.delete_pattern.assert_called_once_with("stats:user:456:*")

    @pytest.mark.asyncio
    async def test_invalidate_stats_cache(self, mock_cache_service):
        """Test invalidating all stats cache."""
        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            @invalidate_cache(clear_stats=True)
            async def sync_data():
                return {"synced": True}

            await sync_data()

            mock_cache_service.clear_stats_cache.assert_called_once()

    @pytest.mark.asyncio
    async def test_invalidate_user_cache(self, mock_cache_service):
        """Test invalidating user-specific cache."""
        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            @invalidate_cache(clear_user_cache_param="user_id")
            async def update_user_data(user_id):
                return {"updated": True}

            await update_user_data(789)

            mock_cache_service.clear_user_cache.assert_called_once_with(789)

    @pytest.mark.asyncio
    async def test_invalidate_project_cache(self, mock_cache_service):
        """Test invalidating project-specific cache."""
        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            @invalidate_cache(clear_project_cache_param="project_id")
            async def update_project_data(project_id):
                return {"updated": True}

            await update_project_data(101)

            mock_cache_service.clear_project_cache.assert_called_once_with(101)

    @pytest.mark.asyncio
    async def test_no_invalidation_on_exception(self, mock_cache_service):
        """Test that cache is not invalidated when function raises exception."""
        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            @invalidate_cache(pattern="stats:*")
            async def failing_function():
                raise ValueError("Test error")

            with pytest.raises(ValueError):
                await failing_function()

            mock_cache_service.delete_pattern.assert_not_called()

    @pytest.mark.asyncio
    async def test_multiple_invalidation_patterns(self, mock_cache_service):
        """Test multiple invalidation patterns."""
        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache_service):
            @invalidate_cache(
                pattern="stats:user:{user_id}:*",
                clear_stats=True
            )
            async def major_update(user_id):
                return {"updated": True}

            await major_update(123)

            mock_cache_service.delete_pattern.assert_called_once()
            mock_cache_service.clear_stats_cache.assert_called_once()


class TestCacheDecoratorIntegration:
    """Integration tests for cache decorators."""

    @pytest.mark.asyncio
    async def test_cache_hit_avoids_computation(self):
        """Test that cache hit avoids expensive computation."""
        mock_cache = AsyncMock(spec=CacheService)
        mock_cache.get_or_set = AsyncMock(return_value={"cached": "value"})

        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache):
            computation_count = 0

            @cached(key_prefix="test", ttl=300)
            async def expensive_computation():
                nonlocal computation_count
                computation_count += 1
                return {"computed": "value"}

            # First call should use cache
            result1 = await expensive_computation()
            assert result1 == {"cached": "value"}
            assert computation_count == 0  # Computation was skipped

    @pytest.mark.asyncio
    async def test_invalidate_then_cache_pattern(self):
        """Test the common pattern of invalidate then cache."""
        mock_cache = AsyncMock(spec=CacheService)
        mock_cache.delete_pattern = AsyncMock(return_value=1)
        mock_cache.get_or_set = AsyncMock(return_value={"data": "fresh"})

        with patch('app.utils.decorators.get_cache_service', return_value=mock_cache):
            @invalidate_cache(pattern="stats:user:{user_id}:*")
            async def update_and_refresh(user_id):
                # After invalidation, get fresh data
                return await get_fresh_data(user_id)

            @cached(key_prefix="stats:user", ttl=300)
            async def get_fresh_data(user_id):
                return {"user_id": user_id, "fresh": True}

            result = await update_and_refresh(123)

            assert result == {"data": "fresh"}
            mock_cache.delete_pattern.assert_called_once_with("stats:user:123:*")
