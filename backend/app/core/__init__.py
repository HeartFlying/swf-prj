"""Core module.

Provides core functionality including configuration, security, exceptions,
and standardized response handling.
"""

from app.core.error_codes import ErrorCode, get_status_code
from app.core.exceptions import (
    AppException,
    AuthenticationException,
    ConflictException,
    ExternalServiceException,
    NotFoundException,
    PermissionDeniedException,
    ValidationException,
    register_exception_handlers,
)
from app.core.logging import ContextualLogger, get_logger, setup_logging

__all__ = [
    # Error codes
    "ErrorCode",
    "get_status_code",
    # Exceptions
    "AppException",
    "NotFoundException",
    "ValidationException",
    "AuthenticationException",
    "PermissionDeniedException",
    "ConflictException",
    "ExternalServiceException",
    # Logging
    "ContextualLogger",
    "get_logger",
    "setup_logging",
    # Functions
    "register_exception_handlers",
]
