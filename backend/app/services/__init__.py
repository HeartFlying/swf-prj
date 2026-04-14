"""Services module.

Provides business logic services and custom service exceptions.
"""

from app.services.auth_service import (
    InvalidCredentialsError,
    TokenValidationError,
    UserNotFoundError,
    authenticate_user_or_raise,
    get_user_by_id_or_raise,
    get_user_by_username_or_raise,
)
from app.services.bug_stats_service import BugStatsService
from app.services.code_stats_service import CodeStatsService
from app.services.data_source_interface import DataSourceInterface
from app.services.sync_service import (
    DataSourceNotFoundError,
    SyncExecutionError,
    SyncService,
    SyncServiceError,
    SyncTaskNotFoundError,
)
from app.services.sync_task_service import (
    SyncTaskInvalidStateError,
    SyncTaskNotFoundError as SyncTaskServiceNotFoundError,
    SyncTaskService,
)

__all__ = [
    # Auth services
    "UserNotFoundError",
    "InvalidCredentialsError",
    "TokenValidationError",
    "authenticate_user_or_raise",
    "get_user_by_id_or_raise",
    "get_user_by_username_or_raise",
    # Stats services
    "BugStatsService",
    "CodeStatsService",
    "TokenStatsService",
    # Sync services
    "DataSourceInterface",
    "DataSourceNotFoundError",
    "SyncExecutionError",
    "SyncService",
    "SyncServiceError",
    "SyncTaskNotFoundError",
    "SyncTaskService",
    "SyncTaskServiceNotFoundError",
    "SyncTaskInvalidStateError",
]

# Import TokenStatsService at the end to avoid circular imports
from app.services.token_stats_service import TokenStatsService
