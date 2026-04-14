"""Custom exceptions and exception handlers for the application.

Provides standardized exception classes and handlers for consistent error responses.
"""

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette import status

from app.core.error_codes import ErrorCode


class AppException(Exception):
    """Base application exception.

    All custom exceptions should inherit from this class.
    """

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> dict[str, Any]:
        """Convert exception to dictionary format.

        Returns:
            Dictionary with error details
        """
        return {
            "code": self.status_code,
            "message": self.message,
            "data": self.details if self.details else None,
        }


class NotFoundException(AppException):
    """Resource not found exception."""

    def __init__(
        self,
        resource: str,
        identifier: str | int | None = None,
        code: ErrorCode = ErrorCode.NOT_FOUND,
    ):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with id {identifier} not found"

        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            code=code,
            details={"resource": resource, "identifier": identifier},
        )


class ValidationException(AppException):
    """Validation error exception."""

    def __init__(
        self,
        message: str,
        field: str | None = None,
        code: ErrorCode = ErrorCode.VALIDATION_ERROR,
        details: dict[str, Any] | None = None,
    ):
        error_details = details.copy() if details else {}
        if field:
            error_details["field"] = field

        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code=code,
            details=error_details if error_details else None,
        )


class AuthenticationException(AppException):
    """Authentication error exception."""

    def __init__(
        self,
        message: str = "Authentication failed",
        code: ErrorCode = ErrorCode.AUTHENTICATION_ERROR,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code=code,
        )


class PermissionDeniedException(AppException):
    """Permission denied exception."""

    def __init__(
        self,
        permission: str | None = None,
        message: str | None = None,
        code: ErrorCode = ErrorCode.PERMISSION_DENIED,
    ):
        if message is None:
            message = "Permission denied"
            if permission:
                message = f"Permission denied: {permission}"

        details = {"permission": permission} if permission else None

        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            code=code,
            details=details,
        )


class ConflictException(AppException):
    """Resource conflict exception (e.g., duplicate entry)."""

    def __init__(
        self,
        message: str,
        resource: str | None = None,
        code: ErrorCode = ErrorCode.CONFLICT,
        details: dict[str, Any] | None = None,
    ):
        error_details = details or {}
        if resource:
            error_details["resource"] = resource

        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            code=code,
            details=error_details if error_details else None,
        )


class ExternalServiceException(AppException):
    """External service error exception."""

    def __init__(
        self,
        service: str,
        message: str,
        code: ErrorCode = ErrorCode.EXTERNAL_SERVICE_ERROR,
        details: dict[str, Any] | None = None,
    ):
        error_details = details or {}
        error_details["service"] = service

        super().__init__(
            message=f"{service} error: {message}",
            status_code=status.HTTP_502_BAD_GATEWAY,
            code=code,
            details=error_details,
        )


# ============================================================================
# Exception Handlers
# ============================================================================

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle AppException and its subclasses.

    Returns standardized error response format:
    {
        "code": <http_status_code>,
        "message": <error_message>,
        "data": <error_details_or_null>
    }
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.status_code,
            "message": exc.message,
            "data": exc.details if exc.details else None,
        },
    )


async def not_found_handler(request: Request, exc: NotFoundException) -> JSONResponse:
    """Handle NotFoundException."""
    return await app_exception_handler(request, exc)


async def validation_handler(request: Request, exc: ValidationException) -> JSONResponse:
    """Handle ValidationException."""
    return await app_exception_handler(request, exc)


async def auth_handler(request: Request, exc: AuthenticationException) -> JSONResponse:
    """Handle AuthenticationException."""
    return await app_exception_handler(request, exc)


async def permission_handler(request: Request, exc: PermissionDeniedException) -> JSONResponse:
    """Handle PermissionDeniedException."""
    return await app_exception_handler(request, exc)


async def conflict_handler(request: Request, exc: ConflictException) -> JSONResponse:
    """Handle ConflictException."""
    return await app_exception_handler(request, exc)


async def external_service_handler(request: Request, exc: ExternalServiceException) -> JSONResponse:
    """Handle ExternalServiceException."""
    return await app_exception_handler(request, exc)


# ============================================================================
# HTTP Exception Handlers (for built-in FastAPI/Starlette exceptions)
# ============================================================================

async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle generic HTTP exceptions.

    Handles exceptions that have status_code and detail attributes
    (like Starlette's HTTPException).
    """
    status_code = getattr(exc, "status_code", 500)
    detail = getattr(exc, "detail", "Internal server error")

    return JSONResponse(
        status_code=status_code,
        content={
            "code": status_code,
            "message": str(detail),
            "data": None,
        },
    )


async def validation_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle FastAPI validation errors (RequestValidationError)."""
    from fastapi.exceptions import RequestValidationError

    errors = []
    if isinstance(exc, RequestValidationError):
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error.get("loc", [])),
                "message": error.get("msg", ""),
                "type": error.get("type", ""),
            })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": 422,
            "message": "Validation error",
            "data": {"errors": errors} if errors else None,
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle any unhandled exceptions.

    This is a catch-all handler that ensures all errors are returned
    in the standardized format.
    """
    import logging

    logger = logging.getLogger(__name__)
    logger.exception(f"Unhandled exception: {exc}")

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": 500,
            "message": "Internal server error",
            "data": None,
        },
    )


# ============================================================================
# Register all exception handlers
# ============================================================================

def register_exception_handlers(app) -> None:
    """Register all exception handlers with the FastAPI app.

    Args:
        app: FastAPI application instance
    """
    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException

    # Custom exception handlers (most specific first)
    app.add_exception_handler(NotFoundException, not_found_handler)
    app.add_exception_handler(ValidationException, validation_handler)
    app.add_exception_handler(AuthenticationException, auth_handler)
    app.add_exception_handler(PermissionDeniedException, permission_handler)
    app.add_exception_handler(ConflictException, conflict_handler)
    app.add_exception_handler(ExternalServiceException, external_service_handler)
    app.add_exception_handler(AppException, app_exception_handler)

    # Built-in exception handlers
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)

    # Catch-all handler (least specific, must be last)
    app.add_exception_handler(Exception, generic_exception_handler)
