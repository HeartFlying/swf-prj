"""Cache configuration and utilities.

TDD Green Phase: Implement cache configuration.
"""

from typing import Any


class CacheConfig:
    """Cache configuration constants."""

    # Key prefixes
    KEY_PREFIX = "coding_agent_stats"
    STATS_PREFIX = "stats"
    DASHBOARD_PREFIX = "dashboard"
    TREND_PREFIX = "trend"

    # TTL values (in seconds)
    DEFAULT_TTL = 300  # 5 minutes
    STATS_TTL = 600  # 10 minutes
    DASHBOARD_TTL = 300  # 5 minutes
    TREND_TTL = 900  # 15 minutes
    HEATMAP_TTL = 600  # 10 minutes
    RANKING_TTL = 300  # 5 minutes

    # Stats-specific TTLs
    PERSONAL_STATS_TTL = 600  # 10 minutes
    PROJECT_STATS_TTL = 600  # 10 minutes
    GLOBAL_STATS_TTL = 900  # 15 minutes

    @classmethod
    def build_key(cls, *parts: str | int, **params: Any) -> str:
        """Build a cache key from parts and parameters.

        Args:
            *parts: Key parts to join.
            **params: Query parameters to include in key.

        Returns:
            Formatted cache key.

        Example:
            >>> CacheConfig.build_key("stats", "user", 123, days=30)
            'coding_agent_stats:stats:user:123:days=30'
        """
        key_parts = [cls.KEY_PREFIX]
        key_parts.extend(str(p) for p in parts)

        if params:
            # Sort params for consistent key generation
            param_str = ":".join(f"{k}={v}" for k, v in sorted(params.items()))
            key_parts.append(param_str)

        return ":".join(key_parts)

    @classmethod
    def get_ttl_for_stats_type(cls, stats_type: str) -> int:
        """Get TTL for a specific stats type.

        Args:
            stats_type: Type of statistics (e.g., 'trend', 'dashboard', 'summary').

        Returns:
            TTL in seconds.
        """
        ttl_map = {
            "trend": cls.TREND_TTL,
            "dashboard": cls.DASHBOARD_TTL,
            "summary": cls.STATS_TTL,
            "heatmap": cls.HEATMAP_TTL,
            "ranking": cls.RANKING_TTL,
            "personal": cls.PERSONAL_STATS_TTL,
            "project": cls.PROJECT_STATS_TTL,
            "global": cls.GLOBAL_STATS_TTL,
        }
        return ttl_map.get(stats_type, cls.DEFAULT_TTL)


class CacheKeys:
    """Helper class for generating cache keys."""

    @classmethod
    def stats_key(cls, category: str, endpoint: str, **params: Any) -> str:
        """Generate a stats cache key.

        Args:
            category: Stats category (e.g., 'personal', 'project', 'global').
            endpoint: Endpoint name (e.g., 'dashboard', 'summary').
            **params: Query parameters.

        Returns:
            Formatted cache key.
        """
        return CacheConfig.build_key(
            CacheConfig.STATS_PREFIX,
            category,
            endpoint,
            **params
        )

    @classmethod
    def global_stats_key(cls, endpoint: str, **params: Any) -> str:
        """Generate a global stats cache key.

        Args:
            endpoint: Endpoint name (e.g., 'summary', 'token-trend').
            **params: Query parameters.

        Returns:
            Formatted cache key.
        """
        return CacheConfig.build_key(
            CacheConfig.STATS_PREFIX,
            "global",
            endpoint,
            **params
        )

    @classmethod
    def project_stats_key(cls, project_id: int, endpoint: str, **params: Any) -> str:
        """Generate a project stats cache key.

        Args:
            project_id: Project ID.
            endpoint: Endpoint name (e.g., 'overview', 'dashboard').
            **params: Query parameters.

        Returns:
            Formatted cache key.
        """
        return CacheConfig.build_key(
            CacheConfig.STATS_PREFIX,
            "project",
            project_id,
            endpoint,
            **params
        )

    @classmethod
    def personal_stats_key(cls, user_id: int, endpoint: str, **params: Any) -> str:
        """Generate a personal stats cache key.

        Args:
            user_id: User ID.
            endpoint: Endpoint name (e.g., 'dashboard', 'heatmap').
            **params: Query parameters.

        Returns:
            Formatted cache key.
        """
        return CacheConfig.build_key(
            CacheConfig.STATS_PREFIX,
            "personal",
            user_id,
            endpoint,
            **params
        )

    @classmethod
    def dashboard_key(cls, category: str, resource_id: int | None = None, **params: Any) -> str:
        """Generate a dashboard cache key.

        Args:
            category: Dashboard category (e.g., 'personal', 'project').
            resource_id: Optional resource ID (user_id or project_id).
            **params: Query parameters.

        Returns:
            Formatted cache key.
        """
        parts = [CacheConfig.DASHBOARD_PREFIX, category]
        if resource_id is not None:
            parts.append(str(resource_id))

        return CacheConfig.build_key(*parts, **params)

    @classmethod
    def trend_key(cls, trend_type: str, resource_id: int | None = None, **params: Any) -> str:
        """Generate a trend cache key.

        Args:
            trend_type: Type of trend (e.g., 'token', 'activity', 'bug').
            resource_id: Optional resource ID.
            **params: Query parameters.

        Returns:
            Formatted cache key.
        """
        parts = [CacheConfig.TREND_PREFIX, trend_type]
        if resource_id is not None:
            parts.append(str(resource_id))

        return CacheConfig.build_key(*parts, **params)
