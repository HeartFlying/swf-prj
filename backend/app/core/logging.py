"""Logging configuration for the application.

Provides structured JSON logging with context support, log rotation,
and separate log files for different log levels.
"""

import logging
import sys
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from pathlib import Path
from typing import Any

import structlog

# Default logs directory
LOGS_DIR = Path(__file__).parent.parent.parent / "logs"

# Log file paths
APP_LOG_FILE = LOGS_DIR / "app.log"
ERROR_LOG_FILE = LOGS_DIR / "error.log"
ACCESS_LOG_FILE = LOGS_DIR / "access.log"

# Log format settings
LOG_FORMAT = "%(message)s"
DATE_FORMAT = "%Y-%m-%dT%H:%M:%S"

# Rotation settings
MAX_BYTES = 10 * 1024 * 1024  # 10MB
BACKUP_COUNT = 5
WHEN = "midnight"  # Rotate at midnight
INTERVAL = 1  # Every day


def ensure_logs_directory() -> None:
    """Ensure the logs directory exists."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)


def setup_file_handlers() -> list[logging.Handler]:
    """Setup file handlers for different log levels.

    Returns:
        List of configured file handlers.
    """
    ensure_logs_directory()
    handlers: list[logging.Handler] = []

    # Main application log - rotates by size
    app_handler = RotatingFileHandler(
        APP_LOG_FILE,
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    app_handler.setLevel(logging.INFO)
    handlers.append(app_handler)

    # Error log - rotates daily
    error_handler = TimedRotatingFileHandler(
        ERROR_LOG_FILE,
        when=WHEN,
        interval=INTERVAL,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.ERROR)
    handlers.append(error_handler)

    # Access log - rotates by size
    access_handler = RotatingFileHandler(
        ACCESS_LOG_FILE,
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    access_handler.setLevel(logging.INFO)
    handlers.append(access_handler)

    return handlers


def setup_logging(
    log_level: str = "INFO",
    enable_file_logging: bool = True,
) -> None:
    """Setup structured logging for the application.

    Configures structlog with JSON output, timestamps, and proper formatting.
    Also configures stdlib logging to work with structlog.

    Args:
        log_level: The log level to use (DEBUG, INFO, WARNING, ERROR, CRITICAL).
        enable_file_logging: Whether to enable file logging.
    """
    # Convert log level string to logging level
    level = getattr(logging, log_level.upper(), logging.INFO)

    # Setup stdlib logging
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]

    if enable_file_logging:
        handlers.extend(setup_file_handlers())

    # Configure root logger
    logging.basicConfig(
        format=LOG_FORMAT,
        level=level,
        handlers=handlers,
    )

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Suppress noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


class ContextualLogger:
    """A wrapper around structlog logger that provides context binding.

    This class provides a convenient interface for adding context to logs
    such as request_id, user_id, and duration.
    """

    def __init__(self, logger: structlog.stdlib.BoundLogger) -> None:
        """Initialize the contextual logger.

        Args:
            logger: The underlying structlog logger.
        """
        self._logger = logger
        self._context: dict[str, Any] = {}

    def bind(self, **kwargs: Any) -> "ContextualLogger":
        """Bind context to the logger.

        Args:
            **kwargs: Key-value pairs to bind to the logger context.

        Returns:
            A new ContextualLogger with the bound context.
        """
        new_context = {**self._context, **kwargs}
        bound_logger = self._logger.bind(**kwargs)
        new_logger = ContextualLogger(bound_logger)
        new_logger._context = new_context
        return new_logger

    def unbind(self, *keys: str) -> "ContextualLogger":
        """Unbind keys from the logger context.

        Args:
            *keys: Keys to remove from the context.

        Returns:
            A new ContextualLogger without the specified keys.
        """
        new_context = {k: v for k, v in self._context.items() if k not in keys}
        bound_logger = self._logger.unbind(*keys)
        new_logger = ContextualLogger(bound_logger)
        new_logger._context = new_context
        return new_logger

    def new(self, **new_context: Any) -> "ContextualLogger":
        """Create a new logger with cleared context.

        Args:
            **new_context: Optional new context to bind.

        Returns:
            A new ContextualLogger with fresh context.
        """
        fresh_logger = structlog.get_logger(self._logger.name)
        if new_context:
            fresh_logger = fresh_logger.bind(**new_context)
        return ContextualLogger(fresh_logger)

    def debug(self, msg: str, **kwargs: Any) -> None:
        """Log a debug message.

        Args:
            msg: The message to log.
            **kwargs: Additional context to include.
        """
        self._logger.debug(msg, **kwargs)

    def info(self, msg: str, **kwargs: Any) -> None:
        """Log an info message.

        Args:
            msg: The message to log.
            **kwargs: Additional context to include.
        """
        self._logger.info(msg, **kwargs)

    def warning(self, msg: str, **kwargs: Any) -> None:
        """Log a warning message.

        Args:
            msg: The message to log.
            **kwargs: Additional context to include.
        """
        self._logger.warning(msg, **kwargs)

    def error(self, msg: str, **kwargs: Any) -> None:
        """Log an error message.

        Args:
            msg: The message to log.
            **kwargs: Additional context to include.
        """
        self._logger.error(msg, **kwargs)

    def critical(self, msg: str, **kwargs: Any) -> None:
        """Log a critical message.

        Args:
            msg: The message to log.
            **kwargs: Additional context to include.
        """
        self._logger.critical(msg, **kwargs)

    def exception(self, msg: str, **kwargs: Any) -> None:
        """Log an exception with traceback.

        Args:
            msg: The message to log.
            **kwargs: Additional context to include.
        """
        self._logger.exception(msg, **kwargs)

    @property
    def name(self) -> str:
        """Get the logger name."""
        return self._logger.name


def get_logger(name: str) -> ContextualLogger:
    """Get a structured logger instance.

    Args:
        name: The name of the logger (typically __name__).

    Returns:
        A ContextualLogger instance with structured logging support.
    """
    logger = structlog.get_logger(name)
    return ContextualLogger(logger)


# Module-level logger
logger = get_logger(__name__)
