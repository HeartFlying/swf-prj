"""Input validation utilities.

TDD Green Phase: Implement validators for security improvements.
"""

import re
from typing import Pattern

# Email validation regex pattern (RFC 5322 compliant simplified)
EMAIL_PATTERN: Pattern = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
)

# Username validation pattern (alphanumeric, underscore, hyphen)
USERNAME_PATTERN: Pattern = re.compile(r"^[a-zA-Z0-9_-]{3,50}$")

# Password validation pattern
# At least 8 characters, 1 uppercase, 1 lowercase, 1 digit, 1 special character
PASSWORD_PATTERN: Pattern = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-])[A-Za-z\d@$!%*?&_\-]{8,}$"
)

# HTML tag pattern for XSS prevention
HTML_TAG_PATTERN: Pattern = re.compile(r"<[^>]+>")

# SQL injection pattern (basic)
SQL_INJECTION_PATTERN: Pattern = re.compile(
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)|(--)|(;)|(\bOR\b.*=.*)|(\bAND\b.*=.*)",
    re.IGNORECASE,
)


def validate_email(email: str) -> bool:
    """Validate email address format.

    Args:
        email: Email address to validate.

    Returns:
        True if valid, False otherwise.
    """
    if not email or len(email) > 254:
        return False
    return bool(EMAIL_PATTERN.match(email))


def validate_username(username: str) -> bool:
    """Validate username format.

    Args:
        username: Username to validate.

    Returns:
        True if valid, False otherwise.
    """
    if not username:
        return False
    return bool(USERNAME_PATTERN.match(username))


def validate_password(password: str) -> tuple[bool, str]:
    """Validate password strength.

    Args:
        password: Password to validate.

    Returns:
        Tuple of (is_valid, error_message).
    """
    if not password:
        return False, "Password is required"

    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if len(password) > 72:
        return False, "Password must not exceed 72 characters"

    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"

    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"

    if not re.search(r"[@$!%*?&_\-]", password):
        return False, "Password must contain at least one special character (@$!%*?&_-)"

    return True, ""


def sanitize_input(text: str | None) -> str | None:
    """Sanitize user input to prevent XSS.

    Args:
        text: Input text to sanitize.

    Returns:
        Sanitized text or None if input is None.
    """
    if text is None:
        return None

    # First escape special characters to preserve content inside tags
    sanitized = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )

    return sanitized


def check_sql_injection(text: str) -> bool:
    """Check for potential SQL injection patterns.

    Args:
        text: Text to check.

    Returns:
        True if potential SQL injection detected, False otherwise.
    """
    if not text:
        return False
    return bool(SQL_INJECTION_PATTERN.search(text))


def validate_department(department: str) -> bool:
    """Validate department name.

    Args:
        department: Department name to validate.

    Returns:
        True if valid, False otherwise.
    """
    if not department:
        return False
    if len(department) > 50:
        return False
    # Check for SQL injection
    if check_sql_injection(department):
        return False
    return True
