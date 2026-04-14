"""Tests for input validators.

TDD Red Phase: Write tests for validators.
"""


from app.core.validators import (
    check_sql_injection,
    sanitize_input,
    validate_department,
    validate_email,
    validate_password,
    validate_username,
)


class TestEmailValidation:
    """Tests for email validation."""

    def test_valid_email_simple(self):
        """Test simple valid email."""
        assert validate_email("user@example.com") is True

    def test_valid_email_with_subdomain(self):
        """Test email with subdomain."""
        assert validate_email("user@mail.example.com") is True

    def test_valid_email_with_plus(self):
        """Test email with plus sign."""
        assert validate_email("user+tag@example.com") is True

    def test_valid_email_with_dots(self):
        """Test email with dots."""
        assert validate_email("first.last@example.com") is True

    def test_invalid_email_no_at(self):
        """Test email without @ sign."""
        assert validate_email("userexample.com") is False

    def test_invalid_email_no_domain(self):
        """Test email without domain."""
        assert validate_email("user@") is False

    def test_invalid_email_no_local(self):
        """Test email without local part."""
        assert validate_email("@example.com") is False

    def test_invalid_email_double_at(self):
        """Test email with double @."""
        assert validate_email("user@@example.com") is False

    def test_invalid_email_empty(self):
        """Test empty email."""
        assert validate_email("") is False

    def test_invalid_email_none(self):
        """Test None email."""
        assert validate_email(None) is False  # type: ignore

    def test_invalid_email_too_long(self):
        """Test email exceeding max length."""
        long_email = "a" * 250 + "@example.com"
        assert validate_email(long_email) is False


class TestPasswordValidation:
    """Tests for password validation."""

    def test_valid_password(self):
        """Test valid strong password."""
        is_valid, error = validate_password("StrongPass123!")
        assert is_valid is True
        assert error == ""

    def test_invalid_password_too_short(self):
        """Test password too short."""
        is_valid, error = validate_password("Short1!")
        assert is_valid is False
        assert "at least 8 characters" in error

    def test_invalid_password_no_lowercase(self):
        """Test password without lowercase."""
        is_valid, error = validate_password("PASSWORD123!")
        assert is_valid is False
        assert "lowercase" in error

    def test_invalid_password_no_uppercase(self):
        """Test password without uppercase."""
        is_valid, error = validate_password("password123!")
        assert is_valid is False
        assert "uppercase" in error

    def test_invalid_password_no_digit(self):
        """Test password without digit."""
        is_valid, error = validate_password("Password!")
        assert is_valid is False
        assert "digit" in error

    def test_invalid_password_no_special(self):
        """Test password without special character."""
        is_valid, error = validate_password("Password123")
        assert is_valid is False
        assert "special character" in error

    def test_invalid_password_too_long(self):
        """Test password exceeding max length."""
        is_valid, error = validate_password("A" + "a" * 71 + "1!")
        assert is_valid is False
        assert "72 characters" in error

    def test_invalid_password_empty(self):
        """Test empty password."""
        is_valid, error = validate_password("")
        assert is_valid is False
        assert "required" in error


class TestUsernameValidation:
    """Tests for username validation."""

    def test_valid_username(self):
        """Test valid username."""
        assert validate_username("john_doe") is True

    def test_valid_username_with_numbers(self):
        """Test username with numbers."""
        assert validate_username("user123") is True

    def test_valid_username_with_hyphen(self):
        """Test username with hyphen."""
        assert validate_username("user-name") is True

    def test_invalid_username_too_short(self):
        """Test username too short."""
        assert validate_username("ab") is False

    def test_invalid_username_with_spaces(self):
        """Test username with spaces."""
        assert validate_username("user name") is False

    def test_invalid_username_with_special_chars(self):
        """Test username with special characters."""
        assert validate_username("user@name") is False

    def test_invalid_username_empty(self):
        """Test empty username."""
        assert validate_username("") is False


class TestInputSanitization:
    """Tests for input sanitization."""

    def test_sanitize_html_tags(self):
        """Test encoding of HTML tags."""
        assert sanitize_input("<script>alert('xss')</script>") == "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"

    def test_sanitize_html_entities(self):
        """Test HTML entity encoding."""
        assert sanitize_input("<div>") == "&lt;div&gt;"

    def test_sanitize_quotes(self):
        """Test quote encoding."""
        assert sanitize_input('"test"') == "&quot;test&quot;"

    def test_sanitize_ampersand(self):
        """Test ampersand encoding."""
        assert sanitize_input("A & B") == "A &amp; B"

    def test_sanitize_none(self):
        """Test sanitizing None."""
        assert sanitize_input(None) is None

    def test_sanitize_empty(self):
        """Test sanitizing empty string."""
        assert sanitize_input("") == ""

    def test_sanitize_normal_text(self):
        """Test sanitizing normal text."""
        assert sanitize_input("Hello World") == "Hello World"


class TestSQLInjectionDetection:
    """Tests for SQL injection detection."""

    def test_detect_select(self):
        """Test detecting SELECT statement."""
        assert check_sql_injection("SELECT * FROM users") is True

    def test_detect_drop(self):
        """Test detecting DROP statement."""
        assert check_sql_injection("DROP TABLE users") is True

    def test_detect_union(self):
        """Test detecting UNION statement."""
        assert check_sql_injection("UNION SELECT") is True

    def test_detect_semicolon(self):
        """Test detecting semicolon."""
        assert check_sql_injection("test; DROP") is True

    def test_detect_comment(self):
        """Test detecting SQL comment."""
        assert check_sql_injection("test--") is True

    def test_safe_text(self):
        """Test safe text."""
        assert check_sql_injection("Hello World") is False

    def test_safe_select_word(self):
        """Test safe word containing select."""
        assert check_sql_injection("selection") is False


class TestDepartmentValidation:
    """Tests for department validation."""

    def test_valid_department(self):
        """Test valid department name."""
        assert validate_department("Engineering") is True

    def test_valid_department_with_spaces(self):
        """Test department name with spaces."""
        assert validate_department("Research & Development") is True

    def test_invalid_department_too_long(self):
        """Test department name too long."""
        assert validate_department("A" * 51) is False

    def test_invalid_department_sql_injection(self):
        """Test department name with SQL injection."""
        assert validate_department("Engineering'; DROP TABLE users--") is False

    def test_invalid_department_empty(self):
        """Test empty department name."""
        assert validate_department("") is False
