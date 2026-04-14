"""Error code definitions for the application.

Provides standardized error codes for all API error responses.
"""

from enum import StrEnum


class ErrorCode(StrEnum):
    """Standard error codes for API responses."""

    # General errors (1xxx)
    INTERNAL_ERROR = "INTERNAL_ERROR"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"

    # Authentication errors (2xxx)
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    TOKEN_BLACKLISTED = "TOKEN_BLACKLISTED"
    UNAUTHORIZED = "UNAUTHORIZED"

    # Permission errors (3xxx)
    PERMISSION_DENIED = "PERMISSION_DENIED"
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PRIVILEGES = "INSUFFICIENT_PRIVILEGES"

    # Resource errors (4xxx)
    NOT_FOUND = "NOT_FOUND"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND"
    TASK_NOT_FOUND = "TASK_NOT_FOUND"

    # Validation errors (5xxx)
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    INVALID_FORMAT = "INVALID_FORMAT"

    # Conflict errors (6xxx)
    CONFLICT = "CONFLICT"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    ALREADY_EXISTS = "ALREADY_EXISTS"

    # Sync errors (7xxx)
    SYNC_ERROR = "SYNC_ERROR"
    SYNC_EXECUTION_ERROR = "SYNC_EXECUTION_ERROR"
    DATA_SOURCE_NOT_FOUND = "DATA_SOURCE_NOT_FOUND"
    SYNC_TASK_NOT_FOUND = "SYNC_TASK_NOT_FOUND"

    # External service errors (8xxx)
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    GITLAB_API_ERROR = "GITLAB_API_ERROR"
    ZENDAO_API_ERROR = "ZENDAO_API_ERROR"
    TRAE_API_ERROR = "TRAE_API_ERROR"


# Error code to HTTP status code mapping
ERROR_CODE_STATUS_MAP: dict[ErrorCode, int] = {
    # General errors
    ErrorCode.INTERNAL_ERROR: 500,
    ErrorCode.UNKNOWN_ERROR: 500,
    ErrorCode.SERVICE_UNAVAILABLE: 503,
    ErrorCode.TIMEOUT_ERROR: 504,

    # Authentication errors
    ErrorCode.AUTHENTICATION_ERROR: 401,
    ErrorCode.INVALID_CREDENTIALS: 401,
    ErrorCode.TOKEN_EXPIRED: 401,
    ErrorCode.TOKEN_INVALID: 401,
    ErrorCode.TOKEN_BLACKLISTED: 401,
    ErrorCode.UNAUTHORIZED: 401,

    # Permission errors
    ErrorCode.PERMISSION_DENIED: 403,
    ErrorCode.FORBIDDEN: 403,
    ErrorCode.INSUFFICIENT_PRIVILEGES: 403,

    # Resource errors
    ErrorCode.NOT_FOUND: 404,
    ErrorCode.RESOURCE_NOT_FOUND: 404,
    ErrorCode.USER_NOT_FOUND: 404,
    ErrorCode.PROJECT_NOT_FOUND: 404,
    ErrorCode.TASK_NOT_FOUND: 404,

    # Validation errors
    ErrorCode.VALIDATION_ERROR: 422,
    ErrorCode.INVALID_INPUT: 422,
    ErrorCode.MISSING_REQUIRED_FIELD: 422,
    ErrorCode.INVALID_FORMAT: 422,

    # Conflict errors
    ErrorCode.CONFLICT: 409,
    ErrorCode.DUPLICATE_ENTRY: 409,
    ErrorCode.ALREADY_EXISTS: 409,

    # Sync errors
    ErrorCode.SYNC_ERROR: 500,
    ErrorCode.SYNC_EXECUTION_ERROR: 500,
    ErrorCode.DATA_SOURCE_NOT_FOUND: 404,
    ErrorCode.SYNC_TASK_NOT_FOUND: 404,

    # External service errors
    ErrorCode.EXTERNAL_SERVICE_ERROR: 502,
    ErrorCode.GITLAB_API_ERROR: 502,
    ErrorCode.ZENDAO_API_ERROR: 502,
    ErrorCode.TRAE_API_ERROR: 502,
}


def get_status_code(error_code: ErrorCode) -> int:
    """Get HTTP status code for an error code.

    Args:
        error_code: The error code to look up

    Returns:
        HTTP status code
    """
    return ERROR_CODE_STATUS_MAP.get(error_code, 500)
