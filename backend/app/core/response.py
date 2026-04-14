"""Standard API response formatting.

TDD Green Phase: Implement standardized response format to match frontend expectations.
"""

from typing import Any

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint


def create_success_response(data: Any, message: str = "success", status_code: int = 200) -> dict:
    """Create a standardized success response.

    Args:
        data: Response data
        message: Success message
        status_code: HTTP status code

    Returns:
        Standardized response dict with code, message, and data
    """
    return {
        "code": status_code,
        "message": message,
        "data": data,
    }


def create_error_response(
    message: str, code: int = 500, error_code: str = "INTERNAL_ERROR"
) -> dict:
    """Create a standardized error response.

    Args:
        message: Error message
        code: HTTP status code
        error_code: Application error code

    Returns:
        Standardized error response dict
    """
    return {
        "code": code,
        "message": message,
        "error_code": error_code,
        "data": None,
    }


class StandardResponseMiddleware(BaseHTTPMiddleware):
    """Middleware to standardize all API responses.

    Wraps successful responses in {code, message, data} format.
    Error responses are handled by exception handlers.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Process request and standardize response."""
        # Skip non-API routes and documentation
        path = request.url.path
        if not path.startswith("/api/") or path in ["/api/v1/docs", "/api/v1/redoc"]:
            return await call_next(request)

        response = await call_next(request)

        # Only process JSON responses
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response

        # Skip if already standardized (has code field)
        if response.status_code >= 400:
            # Error responses are handled by exception handlers
            return response

        # Read response body
        body = b""
        async for chunk in response.body_iterator:
            body += chunk

        # Parse JSON response
        import json

        try:
            data = json.loads(body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Not valid JSON, return original response
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        # Skip if already standardized
        if isinstance(data, dict) and "code" in data and "data" in data:
            return JSONResponse(
                content=data,
                status_code=response.status_code,
                headers=dict(response.headers),
            )

        # Wrap in standard format, preserving original status code
        standardized = create_success_response(data, status_code=response.status_code)

        return JSONResponse(
            content=standardized,
            status_code=response.status_code,
            headers={k: v for k, v in response.headers.items() if k != "content-length"},
        )
