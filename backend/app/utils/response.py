"""Response utilities for API endpoints.

Provides helper functions for creating standardized API responses.
"""

from typing import TypeVar

from app.schemas.common import ApiResponse

T = TypeVar("T")


def success_response(data: T, message: str = "success", code: int = 200) -> ApiResponse[T]:
    """Create a successful API response.

    Args:
        data: The response data payload
        message: Response message (default: "success")
        code: HTTP status code (default: 200)

    Returns:
        ApiResponse with the provided data
    """
    return ApiResponse(code=code, message=message, data=data)


def error_response(message: str, code: int = 400, detail: str | None = None) -> dict:
    """Create an error response.

    Args:
        message: Error message
        code: HTTP status code (default: 400)
        detail: Optional detailed error information

    Returns:
        Error response dictionary
    """
    response: dict = {"code": code, "message": message}
    if detail:
        response["detail"] = detail
    return response
