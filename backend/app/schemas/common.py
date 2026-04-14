"""Common schemas for API responses."""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Generic API response wrapper.

    All API responses should use this format for consistency.

    Example:
        {
            "code": 200,
            "message": "success",
            "data": {...}
        }
    """

    code: int = Field(default=200, description="HTTP status code or custom code")
    message: str = Field(default="success", description="Response message")
    data: T | None = Field(default=None, description="Response data")


class ErrorDetail(BaseModel):
    """Detailed error information."""

    field: str | None = Field(default=None, description="Field that caused the error")
    message: str = Field(default=..., description="Error message for this field")
    type: str | None = Field(default=None, description="Error type")


class ErrorResponse(BaseModel):
    """Error response schema.

    Standardized error response format used across all API endpoints.

    Example:
        {
            "code": 404,
            "message": "User not found",
            "data": {"resource": "User", "identifier": "123"}
        }
    """

    code: int = Field(default=..., description="HTTP status code")
    message: str = Field(default=..., description="Error message")
    data: dict[str, Any] | None = Field(
        default=None, description="Additional error details"
    )


class ValidationErrorResponse(BaseModel):
    """Validation error response schema.

    Extended error response for validation errors with field-level details.

    Example:
        {
            "code": 422,
            "message": "Validation error",
            "data": {
                "errors": [
                    {"field": "email", "message": "Invalid email format", "type": "value_error"}
                ]
            }
        }
    """

    code: int = Field(default=422, description="HTTP status code (always 422)")
    message: str = Field(default="Validation error", description="Error message")
    data: dict[str, Any] | None = Field(
        default=None, description="Validation error details including field errors"
    )


class ErrorResponseWithCode(BaseModel):
    """Error response with application error code.

    Extended error response that includes an application-specific error code
    in addition to the HTTP status code.

    Example:
        {
            "code": 401,
            "message": "Authentication failed",
            "data": {"error_code": "TOKEN_EXPIRED", "details": {...}}
        }
    """

    code: int = Field(default=..., description="HTTP status code")
    message: str = Field(default=..., description="Error message")
    data: dict[str, Any] | None = Field(
        default=None,
        description="Error details including error_code and additional info",
    )
