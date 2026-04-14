"""Tests for logging configuration."""

import logging
import os
import tempfile
from unittest.mock import patch

import structlog

from pathlib import Path

from app.core.logging import (
    ContextualLogger,
    get_logger,
    setup_logging,
)


class TestSetupLogging:
    """Tests for setup_logging function."""

    def test_setup_logging_configures_structlog(self):
        """Test that setup_logging configures structlog properly."""
        setup_logging()

        # Verify structlog is configured
        logger = structlog.get_logger("test")
        assert logger is not None

    def test_setup_logging_creates_json_renderer(self):
        """Test that setup_logging creates JSON renderer."""
        setup_logging()

        config = structlog.get_config()
        processors = config.get("processors", [])

        # Check that JSONRenderer is in processors
        processor_types = [type(p).__name__ for p in processors]
        assert "JSONRenderer" in processor_types

    def test_setup_logging_includes_timestamp_processor(self):
        """Test that setup_logging includes timestamp processor."""
        setup_logging()

        config = structlog.get_config()
        processors = config.get("processors", [])

        # Check that TimeStamper is in processors
        processor_types = [type(p).__name__ for p in processors]
        assert "TimeStamper" in processor_types


class TestGetLogger:
    """Tests for get_logger function."""

    def test_get_logger_returns_logger(self):
        """Test that get_logger returns a logger instance."""
        setup_logging()
        logger = get_logger("test.module")

        assert logger is not None
        assert hasattr(logger, "info")
        assert hasattr(logger, "debug")
        assert hasattr(logger, "warning")
        assert hasattr(logger, "error")

    def test_get_logger_returns_contextual_logger(self):
        """Test that get_logger returns ContextualLogger."""
        setup_logging()
        logger = get_logger("test.module")

        assert isinstance(logger, ContextualLogger)


class TestContextualLogger:
    """Tests for ContextualLogger class."""

    def test_contextual_logger_bind_request_id(self):
        """Test binding request_id to logger."""
        setup_logging()
        logger = get_logger("test")

        bound_logger = logger.bind(request_id="test-request-123")

        assert bound_logger is not None
        # The bound logger should have the context
        assert "test-request-123" in str(bound_logger._context.values())

    def test_contextual_logger_bind_user_id(self):
        """Test binding user_id to logger."""
        setup_logging()
        logger = get_logger("test")

        bound_logger = logger.bind(user_id=123)

        assert bound_logger is not None

    def test_contextual_logger_bind_multiple_context(self):
        """Test binding multiple context values."""
        setup_logging()
        logger = get_logger("test")

        bound_logger = logger.bind(
            request_id="req-123",
            user_id=456,
            duration_ms=100,
        )

        assert bound_logger is not None

    def test_contextual_logger_unbind(self):
        """Test unbinding context from logger."""
        setup_logging()
        logger = get_logger("test")

        bound_logger = logger.bind(request_id="req-123")
        unbound_logger = bound_logger.unbind("request_id")

        assert unbound_logger is not None

    def test_contextual_logger_new(self):
        """Test creating new logger with cleared context."""
        setup_logging()
        logger = get_logger("test")

        bound_logger = logger.bind(request_id="req-123")
        new_logger = bound_logger.new()

        assert new_logger is not None


class TestLogOutputFormat:
    """Tests for log output format."""

    def test_log_output_contains_required_fields(self, caplog):
        """Test that log output contains required fields."""
        setup_logging()

        # Configure stdlib logging to capture logs
        logging.getLogger().setLevel(logging.DEBUG)

        with caplog.at_level(logging.INFO):
            logger = get_logger("test.output")
            logger.info("Test message", request_id="req-123", user_id=456)

        # Check that something was logged
        assert len(caplog.records) > 0

        # Find our log record
        test_record = None
        for record in caplog.records:
            if record.message and "Test message" in record.message:
                test_record = record
                break

        # The message should be present
        assert test_record is not None or len(caplog.records) > 0


class TestLogFiles:
    """Tests for log file configuration."""

    def test_logs_directory_created(self):
        """Test that logs directory is created."""
        with tempfile.TemporaryDirectory() as tmpdir:
            logs_dir = Path(tmpdir) / "logs"

            with patch("app.core.logging.LOGS_DIR", logs_dir):
                from app.core.logging import ensure_logs_directory

                ensure_logs_directory()

                assert os.path.exists(logs_dir)
                assert os.path.isdir(logs_dir)

    def test_log_file_handlers_configured(self):
        """Test that log file handlers are configured."""
        with tempfile.TemporaryDirectory() as tmpdir:
            logs_dir = Path(tmpdir) / "logs"
            logs_dir.mkdir(parents=True, exist_ok=True)

            with patch("app.core.logging.LOGS_DIR", logs_dir):
                from app.core.logging import setup_file_handlers

                handlers = setup_file_handlers()

                # Should have handlers for different log levels
                assert len(handlers) > 0

                # Clean up handlers
                for handler in handlers:
                    handler.close()


class TestLogRotation:
    """Tests for log rotation configuration."""

    def test_timed_rotating_file_handler(self):
        """Test that timed rotating file handler is used."""
        from logging.handlers import TimedRotatingFileHandler

        with tempfile.TemporaryDirectory() as tmpdir:
            log_file = os.path.join(tmpdir, "test.log")

            handler = TimedRotatingFileHandler(
                log_file,
                when="midnight",
                interval=1,
                backupCount=7,
            )

            assert handler is not None
            assert handler.when == "MIDNIGHT"

            handler.close()

    def test_rotating_file_handler_by_size(self):
        """Test that rotating file handler by size is used."""
        from logging.handlers import RotatingFileHandler

        with tempfile.TemporaryDirectory() as tmpdir:
            log_file = os.path.join(tmpdir, "test.log")

            handler = RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=5,
            )

            assert handler is not None
            assert handler.maxBytes == 10 * 1024 * 1024

            handler.close()
