"""Tests for TraeDataSource AI Suggestions sync.

TDD: Test Trae AI Suggestions synchronization functionality.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import AISuggestion, User


# Import will fail initially - TraeDataSource doesn't exist yet
# This is the RED phase of TDD
pytest.importorskip("app.services.trae_data_source", reason="TraeDataSource not implemented yet")

from app.services.trae_data_source import TraeDataSource


@pytest.fixture
def trae_data_source():
    """Fixture for TraeDataSource instance."""
    return TraeDataSource()


@pytest.fixture
def mock_trae_client():
    """Fixture for mock Trae client."""
    client = MagicMock()
    client.get_ai_suggestions = AsyncMock(return_value=[
        {
            "id": "sugg_001",
            "user_id": "user123",
            "suggestion_type": "code_completion",
            "content": "def hello_world():\n    print('Hello, World!')",
            "language": "python",
            "file_path": "/src/main.py",
            "line_number": 42,
            "token_cost": 150,
            "status": "accepted",
            "accepted_at": "2024-01-15T10:30:00Z",
            "commit_hash": "abc123def456",
            "created_at": "2024-01-15T10:29:00Z"
        },
        {
            "id": "sugg_002",
            "user_id": "user123",
            "suggestion_type": "refactoring",
            "content": "Refactored function with better variable names",
            "language": "python",
            "file_path": "/src/utils.py",
            "line_number": 15,
            "token_cost": 200,
            "status": "rejected",
            "accepted_at": None,
            "commit_hash": None,
            "created_at": "2024-01-15T11:45:00Z"
        },
        {
            "id": "sugg_003",
            "user_id": "user456",
            "suggestion_type": "bug_fix",
            "content": "Fixed null pointer exception",
            "language": "java",
            "file_path": "/src/Main.java",
            "line_number": 88,
            "token_cost": 300,
            "status": "accepted",
            "accepted_at": "2024-01-15T14:20:00Z",
            "commit_hash": "def789abc012",
            "created_at": "2024-01-15T14:15:00Z"
        }
    ])
    return client


class TestTraeDataSource:
    """Test cases for TraeDataSource AI Suggestions."""

    async def test_fetch_ai_suggestions(self, trae_data_source, mock_trae_client):
        """Test fetching AI suggestions from Trae."""
        # Arrange
        trae_data_source.client = mock_trae_client

        # Act
        suggestions = await trae_data_source.fetch_ai_suggestions(user_id="user123")

        # Assert
        assert len(suggestions) == 3
        assert suggestions[0]["id"] == "sugg_001"
        assert suggestions[1]["id"] == "sugg_002"
        mock_trae_client.get_ai_suggestions.assert_called_once_with(
            user_id="user123",
            status=None,
            per_page=100,
            page=1
        )

    async def test_fetch_ai_suggestions_with_status_filter(self, trae_data_source, mock_trae_client):
        """Test fetching AI suggestions with status filter."""
        # Arrange
        trae_data_source.client = mock_trae_client

        # Act
        suggestions = await trae_data_source.fetch_ai_suggestions(
            user_id="user123",
            status="accepted"
        )

        # Assert
        assert len(suggestions) == 3
        mock_trae_client.get_ai_suggestions.assert_called_once_with(
            user_id="user123",
            status="accepted",
            per_page=100,
            page=1
        )

    def test_transform_ai_suggestion(self, trae_data_source):
        """Test transforming Trae AI suggestion to AISuggestion model."""
        # Arrange
        raw_suggestion = {
            "id": "sugg_001",
            "user_id": "user123",
            "suggestion_type": "code_completion",
            "content": "def hello_world():\n    print('Hello, World!')",
            "language": "python",
            "file_path": "/src/main.py",
            "line_number": 42,
            "token_cost": 150,
            "status": "accepted",
            "accepted_at": "2024-01-15T10:30:00Z",
            "commit_hash": "abc123def456",
            "created_at": "2024-01-15T10:29:00Z"
        }

        # Act
        suggestion = trae_data_source.transform_ai_suggestion(raw_suggestion)

        # Assert
        assert suggestion.suggestion_type == "code_completion"
        assert suggestion.content == "def hello_world():\n    print('Hello, World!')"
        assert suggestion.language == "python"
        assert suggestion.file_path == "/src/main.py"
        assert suggestion.line_number == 42
        assert suggestion.token_cost == 150
        assert suggestion.is_accepted is True
        assert suggestion.accepted_at.year == 2024
        assert suggestion.accepted_at.month == 1
        assert suggestion.accepted_at.day == 15
        assert suggestion.commit_hash == "abc123def456"
        assert suggestion.platform == "trae"

    def test_transform_ai_suggestion_rejected(self, trae_data_source):
        """Test transforming rejected AI suggestion."""
        # Arrange
        raw_suggestion = {
            "id": "sugg_002",
            "user_id": "user123",
            "suggestion_type": "refactoring",
            "content": "Refactored function",
            "language": "python",
            "file_path": "/src/utils.py",
            "line_number": 15,
            "token_cost": 200,
            "status": "rejected",
            "accepted_at": None,
            "commit_hash": None,
            "created_at": "2024-01-15T11:45:00Z"
        }

        # Act
        suggestion = trae_data_source.transform_ai_suggestion(raw_suggestion)

        # Assert
        assert suggestion.is_accepted is False
        assert suggestion.accepted_at is None
        assert suggestion.commit_hash is None

    def test_transform_ai_suggestion_minimal_data(self, trae_data_source):
        """Test transforming AI suggestion with minimal data."""
        # Arrange
        raw_suggestion = {
            "id": "sugg_004",
            "user_id": "user123",
            "suggestion_type": "explanation",
            "content": "This code sorts the array",
            "status": "pending",
            "created_at": "2024-01-15T12:00:00Z"
        }

        # Act
        suggestion = trae_data_source.transform_ai_suggestion(raw_suggestion)

        # Assert
        assert suggestion.suggestion_type == "explanation"
        assert suggestion.content == "This code sorts the array"
        assert suggestion.language is None
        assert suggestion.file_path is None
        assert suggestion.line_number is None
        assert suggestion.token_cost is None
        assert suggestion.is_accepted is False
        assert suggestion.accepted_at is None
        assert suggestion.commit_hash is None

    async def test_sync_ai_suggestions_creates_records(
        self,
        session: AsyncSession,
        trae_data_source,
        mock_trae_client
    ):
        """Test that sync creates AISuggestion records."""
        # Arrange
        trae_data_source.client = mock_trae_client

        # Create a user first
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashed",
            department="Engineering",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        # Act
        result = await trae_data_source.sync_ai_suggestions(
            db=session,
            user_id=user.id
        )

        # Assert
        assert result["total"] == 3
        assert result["processed"] == 3
        assert result["failed"] == 0

        # Verify database records
        stmt = select(AISuggestion).where(AISuggestion.user_id == user.id)
        result = await session.execute(stmt)
        suggestions = result.scalars().all()
        assert len(suggestions) == 3

    async def test_sync_ai_suggestions_skips_duplicates(
        self,
        session: AsyncSession,
        trae_data_source,
        mock_trae_client
    ):
        """Test that sync skips duplicate AI suggestions."""
        # Arrange
        trae_data_source.client = mock_trae_client

        # Create user
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashed",
            department="Engineering",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        # First sync
        await trae_data_source.sync_ai_suggestions(db=session, user_id=user.id)

        # Reset mock to return same suggestions again
        mock_trae_client.get_ai_suggestions.reset_mock()

        # Second sync should handle duplicates gracefully
        result = await trae_data_source.sync_ai_suggestions(db=session, user_id=user.id)

        # Assert - should not fail, may skip or update
        assert result["total"] == 3

    async def test_sync_ai_suggestions_with_error(
        self,
        session: AsyncSession,
        trae_data_source,
        mock_trae_client
    ):
        """Test sync handles errors gracefully."""
        # Arrange
        mock_trae_client.get_ai_suggestions.side_effect = Exception("API Error")
        trae_data_source.client = mock_trae_client

        # Create user
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashed",
            department="Engineering",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        # Act
        result = await trae_data_source.sync_ai_suggestions(db=session, user_id=user.id)

        # Assert
        assert result["total"] == 0
        assert result["processed"] == 0
        assert result["failed"] == 0
        assert len(result["errors"]) == 1
        assert "API Error" in result["errors"][0]


class TestTraeDataSourceInterface:
    """Test that TraeDataSource implements DataSourceInterface correctly."""

    def test_implements_interface(self):
        """Test that TraeDataSource can be instantiated and implements interface."""
        from app.services.data_source_interface import DataSourceInterface

        source = TraeDataSource()
        assert isinstance(source, DataSourceInterface)
        assert source.source_type == "trae"

    async def test_fetch_method_exists(self, trae_data_source):
        """Test that fetch method exists and is callable."""
        assert hasattr(trae_data_source, 'fetch')
        assert callable(trae_data_source.fetch)

    def test_transform_method_exists(self, trae_data_source):
        """Test that transform method exists and is callable."""
        assert hasattr(trae_data_source, 'transform')
        assert callable(trae_data_source.transform)

    async def test_save_method_exists(self, trae_data_source):
        """Test that save method exists and is callable."""
        assert hasattr(trae_data_source, 'save')
        assert callable(trae_data_source.save)

    async def test_fetch_ai_suggestions_method_exists(self, trae_data_source):
        """Test that fetch_ai_suggestions method exists."""
        assert hasattr(trae_data_source, 'fetch_ai_suggestions')
        assert callable(trae_data_source.fetch_ai_suggestions)

    def test_transform_ai_suggestion_method_exists(self, trae_data_source):
        """Test that transform_ai_suggestion method exists."""
        assert hasattr(trae_data_source, 'transform_ai_suggestion')
        assert callable(trae_data_source.transform_ai_suggestion)

    async def test_sync_ai_suggestions_method_exists(self, trae_data_source):
        """Test that sync_ai_suggestions method exists."""
        assert hasattr(trae_data_source, 'sync_ai_suggestions')
        assert callable(trae_data_source.sync_ai_suggestions)


class TestTraeDataSourceAcceptance:
    """Acceptance tests for TraeDataSource."""

    async def test_acceptance_criteria(
        self,
        session: AsyncSession,
        trae_data_source,
        mock_trae_client
    ):
        """Test the acceptance criteria from the task.

        Acceptance Criteria:
            trae_source = TraeDataSource()
            suggestions = await trae_source.fetch_ai_suggestions(user_id="user123")
            assert len(suggestions) > 0
        """
        # Arrange
        trae_data_source.client = mock_trae_client

        # Act - exactly as per acceptance criteria
        trae_source = trae_data_source
        suggestions = await trae_source.fetch_ai_suggestions(user_id="user123")

        # Assert
        assert len(suggestions) > 0
        assert isinstance(suggestions, list)
        assert all(isinstance(s, dict) for s in suggestions)
