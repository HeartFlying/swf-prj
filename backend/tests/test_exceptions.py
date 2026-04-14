"""Tests for exception handling.

TDD: Tests for unified error handling system.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


class TestErrorCodes:
    """Test cases for error code definitions."""

    def test_error_code_enum_exists(self):
        """Test that ErrorCode enum exists."""
        from app.core.error_codes import ErrorCode

        assert hasattr(ErrorCode, "INTERNAL_ERROR")
        assert hasattr(ErrorCode, "NOT_FOUND")
        assert hasattr(ErrorCode, "VALIDATION_ERROR")
        assert hasattr(ErrorCode, "AUTHENTICATION_ERROR")
        assert hasattr(ErrorCode, "PERMISSION_DENIED")

    def test_error_code_values(self):
        """Test error code values are strings."""
        from app.core.error_codes import ErrorCode

        assert ErrorCode.INTERNAL_ERROR.value == "INTERNAL_ERROR"
        assert ErrorCode.NOT_FOUND.value == "NOT_FOUND"
        assert ErrorCode.VALIDATION_ERROR.value == "VALIDATION_ERROR"

    def test_error_code_status_mapping(self):
        """Test error code to status code mapping."""
        from app.core.error_codes import ERROR_CODE_STATUS_MAP, ErrorCode

        assert ERROR_CODE_STATUS_MAP[ErrorCode.INTERNAL_ERROR] == 500
        assert ERROR_CODE_STATUS_MAP[ErrorCode.NOT_FOUND] == 404
        assert ERROR_CODE_STATUS_MAP[ErrorCode.VALIDATION_ERROR] == 422
        assert ERROR_CODE_STATUS_MAP[ErrorCode.AUTHENTICATION_ERROR] == 401
        assert ERROR_CODE_STATUS_MAP[ErrorCode.PERMISSION_DENIED] == 403

    def test_get_status_code_function(self):
        """Test get_status_code helper function."""
        from app.core.error_codes import ErrorCode, get_status_code

        assert get_status_code(ErrorCode.NOT_FOUND) == 404
        assert get_status_code(ErrorCode.VALIDATION_ERROR) == 422
        assert get_status_code(ErrorCode.INTERNAL_ERROR) == 500
        # Test default for unknown code (using a non-existent key)
        assert get_status_code(ErrorCode.UNKNOWN_ERROR) == 500


class TestCustomExceptions:
    """Test cases for custom exceptions."""

    def test_app_exception_exists(self):
        """Test that AppException class exists."""
        from app.core.exceptions import AppException

        exc = AppException(message="Test error")
        assert exc.message == "Test error"
        assert exc.status_code == 500
        assert exc.code.value == "INTERNAL_ERROR"

    def test_app_exception_with_details(self):
        """Test AppException with details."""
        from app.core.exceptions import AppException

        exc = AppException(
            message="Test error",
            status_code=400,
            details={"field": "name", "value": "test"},
        )
        assert exc.details == {"field": "name", "value": "test"}

    def test_app_exception_to_dict(self):
        """Test AppException to_dict method."""
        from app.core.exceptions import AppException

        exc = AppException(
            message="Test error",
            status_code=400,
            details={"field": "name"},
        )
        result = exc.to_dict()
        assert result["code"] == 400
        assert result["message"] == "Test error"
        assert result["data"] == {"field": "name"}

    def test_not_found_exception(self):
        """Test NotFoundException."""
        from app.core.exceptions import NotFoundException

        exc = NotFoundException(resource="User", identifier="123")
        assert exc.message == "User with id 123 not found"
        assert exc.status_code == 404
        assert exc.code.value == "NOT_FOUND"
        assert exc.details == {"resource": "User", "identifier": "123"}

    def test_not_found_exception_without_identifier(self):
        """Test NotFoundException without identifier."""
        from app.core.exceptions import NotFoundException

        exc = NotFoundException(resource="Project")
        assert exc.message == "Project not found"
        assert exc.details == {"resource": "Project", "identifier": None}

    def test_validation_exception(self):
        """Test ValidationException."""
        from app.core.exceptions import ValidationException

        exc = ValidationException(field="email", message="Invalid email format")
        assert exc.message == "Invalid email format"
        assert exc.status_code == 422
        assert exc.code.value == "VALIDATION_ERROR"
        assert exc.details == {"field": "email"}

    def test_validation_exception_without_field(self):
        """Test ValidationException without field."""
        from app.core.exceptions import ValidationException

        exc = ValidationException(message="Invalid input")
        assert exc.details is None or exc.details == {}

    def test_auth_exception(self):
        """Test AuthenticationException."""
        from app.core.exceptions import AuthenticationException

        exc = AuthenticationException(message="Invalid credentials")
        assert exc.message == "Invalid credentials"
        assert exc.status_code == 401
        assert exc.code.value == "AUTHENTICATION_ERROR"

    def test_auth_exception_default_message(self):
        """Test AuthenticationException with default message."""
        from app.core.exceptions import AuthenticationException

        exc = AuthenticationException()
        assert exc.message == "Authentication failed"

    def test_permission_exception(self):
        """Test PermissionDeniedException."""
        from app.core.exceptions import PermissionDeniedException

        exc = PermissionDeniedException(permission="user:manage")
        assert "user:manage" in exc.message
        assert exc.status_code == 403
        assert exc.code.value == "PERMISSION_DENIED"
        assert exc.details == {"permission": "user:manage"}

    def test_permission_exception_without_permission(self):
        """Test PermissionDeniedException without permission."""
        from app.core.exceptions import PermissionDeniedException

        exc = PermissionDeniedException()
        assert exc.message == "Permission denied"
        assert exc.details is None or exc.details == {}

    def test_conflict_exception(self):
        """Test ConflictException."""
        from app.core.exceptions import ConflictException

        exc = ConflictException(message="User already exists", resource="User")
        assert exc.message == "User already exists"
        assert exc.status_code == 409
        assert exc.code.value == "CONFLICT"
        assert exc.details == {"resource": "User"}

    def test_external_service_exception(self):
        """Test ExternalServiceException."""
        from app.core.exceptions import ExternalServiceException

        exc = ExternalServiceException(service="GitLab", message="API timeout")
        assert "GitLab" in exc.message
        assert "API timeout" in exc.message
        assert exc.status_code == 502
        assert exc.code.value == "EXTERNAL_SERVICE_ERROR"
        assert exc.details == {"service": "GitLab"}


class TestExceptionHandlers:
    """Test exception handlers."""

    @pytest.fixture
    def app(self):
        """Create test app with exception handlers."""
        from app.core.exceptions import (
            AppException,
            AuthenticationException,
            ConflictException,
            ExternalServiceException,
            NotFoundException,
            PermissionDeniedException,
            ValidationException,
            app_exception_handler,
            auth_handler,
            conflict_handler,
            external_service_handler,
            not_found_handler,
            permission_handler,
            validation_handler,
        )

        app = FastAPI()

        # Register handlers
        app.add_exception_handler(AppException, app_exception_handler)
        app.add_exception_handler(NotFoundException, not_found_handler)
        app.add_exception_handler(ValidationException, validation_handler)
        app.add_exception_handler(AuthenticationException, auth_handler)
        app.add_exception_handler(PermissionDeniedException, permission_handler)
        app.add_exception_handler(ConflictException, conflict_handler)
        app.add_exception_handler(ExternalServiceException, external_service_handler)

        @app.get("/test/app-error")
        def raise_app_error():
            raise AppException(message="App error occurred")

        @app.get("/test/not-found")
        def raise_not_found():
            raise NotFoundException(resource="User", identifier="999")

        @app.get("/test/validation")
        def raise_validation():
            raise ValidationException(field="email", message="Invalid email")

        @app.get("/test/auth")
        def raise_auth():
            raise AuthenticationException(message="Not authenticated")

        @app.get("/test/permission")
        def raise_permission():
            raise PermissionDeniedException(permission="admin")

        @app.get("/test/conflict")
        def raise_conflict():
            raise ConflictException(message="Resource already exists", resource="User")

        @app.get("/test/external")
        def raise_external():
            raise ExternalServiceException(service="GitLab", message="API error")

        return app

    @pytest.fixture
    def client(self, app):
        return TestClient(app)

    def test_app_exception_response(self, client):
        """Test app exception returns correct response format."""
        response = client.get("/test/app-error")

        assert response.status_code == 500
        data = response.json()
        assert data["code"] == 500
        assert data["message"] == "App error occurred"
        assert data["data"] is None

    def test_not_found_response(self, client):
        """Test not found returns 404 with correct format."""
        response = client.get("/test/not-found")

        assert response.status_code == 404
        data = response.json()
        assert data["code"] == 404
        assert data["message"] == "User with id 999 not found"
        assert data["data"] == {"resource": "User", "identifier": "999"}

    def test_validation_response(self, client):
        """Test validation returns 422 with correct format."""
        response = client.get("/test/validation")

        assert response.status_code == 422
        data = response.json()
        assert data["code"] == 422
        assert data["message"] == "Invalid email"
        assert data["data"] == {"field": "email"}

    def test_auth_response(self, client):
        """Test auth exception returns 401 with correct format."""
        response = client.get("/test/auth")

        assert response.status_code == 401
        data = response.json()
        assert data["code"] == 401
        assert data["message"] == "Not authenticated"
        assert data["data"] is None

    def test_permission_response(self, client):
        """Test permission exception returns 403 with correct format."""
        response = client.get("/test/permission")

        assert response.status_code == 403
        data = response.json()
        assert data["code"] == 403
        assert data["message"] == "Permission denied: admin"
        assert data["data"] == {"permission": "admin"}

    def test_conflict_response(self, client):
        """Test conflict exception returns 409 with correct format."""
        response = client.get("/test/conflict")

        assert response.status_code == 409
        data = response.json()
        assert data["code"] == 409
        assert data["message"] == "Resource already exists"
        assert data["data"] == {"resource": "User"}

    def test_external_service_response(self, client):
        """Test external service exception returns 502 with correct format."""
        response = client.get("/test/external")

        assert response.status_code == 502
        data = response.json()
        assert data["code"] == 502
        assert "GitLab" in data["message"]
        assert data["data"] == {"service": "GitLab"}


class TestHTTPExceptionHandlers:
    """Test HTTP exception handlers."""

    @pytest.fixture
    def app(self):
        """Create test app with HTTP exception handlers."""
        from app.core.exceptions import (
            generic_exception_handler,
            http_exception_handler,
            validation_error_handler,
        )
        from fastapi.exceptions import RequestValidationError
        from starlette.exceptions import HTTPException as StarletteHTTPException

        app = FastAPI()

        app.add_exception_handler(StarletteHTTPException, http_exception_handler)
        app.add_exception_handler(RequestValidationError, validation_error_handler)
        app.add_exception_handler(Exception, generic_exception_handler)

        @app.get("/test/http-error")
        def raise_http_error():
            raise StarletteHTTPException(status_code=418, detail="I'm a teapot")

        @app.get("/test/validation-error/{item_id}")
        def raise_validation_error(item_id: int):
            return {"item_id": item_id}

        @app.get("/test/unexpected")
        def raise_unexpected():
            raise ValueError("Unexpected error")

        return app

    @pytest.fixture
    def client(self, app):
        # Use raise_server_exceptions=False to test the exception handler response
        return TestClient(app, raise_server_exceptions=False)

    def test_http_exception_handler(self, client):
        """Test HTTP exception handler."""
        response = client.get("/test/http-error")

        assert response.status_code == 418
        data = response.json()
        assert data["code"] == 418
        assert data["message"] == "I'm a teapot"
        assert data["data"] is None

    def test_validation_error_handler(self, client):
        """Test validation error handler for invalid input."""
        response = client.get("/test/validation-error/invalid")

        assert response.status_code == 422
        data = response.json()
        assert data["code"] == 422
        assert data["message"] == "Validation error"
        assert "data" in data
        assert "errors" in data["data"]

    def test_generic_exception_handler(self, client):
        """Test generic exception handler."""
        response = client.get("/test/unexpected")

        assert response.status_code == 500
        data = response.json()
        assert data["code"] == 500
        assert data["message"] == "Internal server error"
        assert data["data"] is None


class TestRegisterExceptionHandlers:
    """Test register_exception_handlers function."""

    def test_register_all_handlers(self):
        """Test that all handlers are registered."""
        from app.core.exceptions import (
            AppException,
            NotFoundException,
            register_exception_handlers,
        )
        from fastapi import FastAPI

        app = FastAPI()
        register_exception_handlers(app)

        # Check that handlers are registered (they would be in app.exception_handlers)
        assert any(
            issubclass(exc, NotFoundException)
            for exc in app.exception_handlers.keys()
            if isinstance(exc, type)
        ) or any(
            issubclass(exc, AppException)
            for exc in app.exception_handlers.keys()
            if isinstance(exc, type)
        )


class TestErrorResponseSchemas:
    """Test error response schemas."""

    def test_error_response_schema(self):
        """Test ErrorResponse schema."""
        from app.schemas.common import ErrorResponse

        response = ErrorResponse(
            code=404,
            message="Not found",
            data={"resource": "User"},
        )
        assert response.code == 404
        assert response.message == "Not found"
        assert response.data == {"resource": "User"}

    def test_validation_error_response_schema(self):
        """Test ValidationErrorResponse schema."""
        from app.schemas.common import ValidationErrorResponse

        response = ValidationErrorResponse(
            code=422,
            message="Validation failed",
            data={"errors": [{"field": "email", "message": "Invalid"}]},
        )
        assert response.code == 422
        assert response.message == "Validation failed"

    def test_error_detail_schema(self):
        """Test ErrorDetail schema."""
        from app.schemas.common import ErrorDetail

        detail = ErrorDetail(field="email", message="Invalid format", type="value_error")
        assert detail.field == "email"
        assert detail.message == "Invalid format"
        assert detail.type == "value_error"


class TestServiceExceptions:
    """Test service-specific exceptions."""

    def test_sync_service_exceptions(self):
        """Test sync service exceptions."""
        from app.services.sync_service import (
            DataSourceNotFoundError,
            SyncExecutionError,
            SyncServiceError,
            SyncTaskNotFoundError,
        )

        # Test DataSourceNotFoundError
        exc = DataSourceNotFoundError("gitlab")
        assert exc.status_code == 404
        assert "gitlab" in exc.message

        # Test SyncExecutionError
        exc = SyncExecutionError("Sync failed")
        assert exc.status_code == 500
        assert exc.message == "Sync failed"

        # Test SyncTaskNotFoundError
        exc = SyncTaskNotFoundError(123)
        assert exc.status_code == 404
        assert "123" in exc.message

        # Test SyncServiceError
        exc = SyncServiceError("General sync error")
        assert exc.status_code == 500

    def test_auth_service_exceptions(self):
        """Test auth service exceptions."""
        from app.services.auth_service import (
            InvalidCredentialsError,
            TokenValidationError,
            UserNotFoundError,
        )

        # Test UserNotFoundError with ID
        exc = UserNotFoundError(123)
        assert exc.status_code == 404
        assert "123" in exc.message

        # Test UserNotFoundError with username
        exc = UserNotFoundError("john_doe")
        assert exc.status_code == 404
        assert "john_doe" in exc.message

        # Test InvalidCredentialsError
        exc = InvalidCredentialsError()
        assert exc.status_code == 401
        assert "credentials" in exc.message.lower()

        # Test TokenValidationError
        exc = TokenValidationError("Token expired")
        assert exc.status_code == 401
        assert "Token expired" in exc.message

    def test_sync_task_service_exceptions(self):
        """Test sync task service exceptions."""
        from app.services.sync_task_service import (
            SyncTaskInvalidStateError,
            SyncTaskNotFoundError,
        )

        # Test SyncTaskNotFoundError (inherits from ValueError for backward compatibility)
        exc = SyncTaskNotFoundError(456)
        assert "456" in str(exc)
        assert isinstance(exc, ValueError)

        # Test SyncTaskInvalidStateError (inherits from ValueError for backward compatibility)
        exc = SyncTaskInvalidStateError(456, "completed", "pending")
        assert "completed" in str(exc)
        assert isinstance(exc, ValueError)
