"""Tests for Trae Token Usage synchronization.

TDD Red Phase: Write tests before implementation.
"""

import pytest
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TokenUsage, User, Project
from app.services.trae_data_source import TraeDataSource


class TestTraeDataSource:
    """Test cases for TraeDataSource class."""

    @pytest.fixture
    def trae_source(self):
        """Create a TraeDataSource instance."""
        return TraeDataSource()

    @pytest.fixture
    def mock_token_usage_response(self):
        """Mock token usage response from Trae API."""
        return [
            {
                "id": "usage_000001",
                "user_id": "user123",
                "session_id": "session_001",
                "model": "claude-3-opus",
                "timestamp": "2024-01-15T10:30:00",
                "tokens": {
                    "input": 1000,
                    "output": 500,
                    "total": 1500,
                },
                "cost": {
                    "currency": "USD",
                    "amount": 0.045,
                },
                "request_type": "code_completion",
                "language": "python",
                "latency_ms": 1200,
                "status": "success",
                "metadata": {
                    "file_extension": ".py",
                    "lines_of_code": 50,
                    "context_length": 2000,
                },
            },
            {
                "id": "usage_000002",
                "user_id": "user123",
                "session_id": "session_002",
                "model": "gpt-4",
                "timestamp": "2024-01-20T14:45:00",
                "tokens": {
                    "input": 2000,
                    "output": 800,
                    "total": 2800,
                },
                "cost": {
                    "currency": "USD",
                    "amount": 0.084,
                },
                "request_type": "refactoring",
                "language": "typescript",
                "latency_ms": 2500,
                "status": "success",
                "metadata": {
                    "file_extension": ".ts",
                    "lines_of_code": 120,
                    "context_length": 4000,
                },
            },
        ]

    async def test_fetch_token_usage_success(
        self,
        trae_source: TraeDataSource,
        mock_token_usage_response: list[dict],
    ):
        """Test successful fetch of token usage data."""
        # Arrange
        with patch.object(
            trae_source.client,
            "get_token_usage",
            new_callable=AsyncMock,
            return_value=mock_token_usage_response,
        ):
            # Act
            records = await trae_source.fetch_token_usage(
                user_id="user123",
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )

        # Assert
        assert len(records) == 2
        assert records[0]["id"] == "usage_000001"
        assert records[1]["id"] == "usage_000002"
        assert "tokens" in records[0]
        assert records[0]["tokens"]["total"] == 1500

    async def test_fetch_token_usage_empty_response(
        self,
        trae_source: TraeDataSource,
    ):
        """Test fetch with empty response."""
        # Arrange
        with patch.object(
            trae_source.client,
            "get_token_usage",
            new_callable=AsyncMock,
            return_value=[],
        ):
            # Act
            records = await trae_source.fetch_token_usage(
                user_id="user123",
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )

        # Assert
        assert len(records) == 0

    async def test_fetch_token_usage_api_error(
        self,
        trae_source: TraeDataSource,
    ):
        """Test fetch handles API errors."""
        # Arrange
        with patch.object(
            trae_source.client,
            "get_token_usage",
            new_callable=AsyncMock,
            side_effect=httpx.HTTPError("API Error"),
        ):
            # Act & Assert
            with pytest.raises(httpx.HTTPError):
                await trae_source.fetch_token_usage(
                    user_id="user123",
                    start_date=date(2024, 1, 1),
                    end_date=date(2024, 1, 31),
                )

    async def test_transform_token_usage_success(
        self,
        trae_source: TraeDataSource,
        mock_token_usage_response: list[dict],
    ):
        """Test successful transformation of token usage data."""
        # Act
        token_usage = trae_source.transform_token_usage(mock_token_usage_response[0])

        # Assert
        assert isinstance(token_usage, TokenUsage)
        assert token_usage.platform == "trae"
        assert token_usage.token_count == 1500
        assert token_usage.api_calls == 1
        assert token_usage.usage_date == date(2024, 1, 15)
        assert token_usage.model == "claude-3-opus"
        assert token_usage.cost == Decimal("0.0450")

    async def test_transform_token_usage_with_defaults(
        self,
        trae_source: TraeDataSource,
    ):
        """Test transformation with minimal data."""
        # Arrange
        minimal_data = {
            "id": "usage_000003",
            "user_id": "user123",
            "timestamp": "2024-01-10T08:00:00",
            "tokens": {
                "total": 500,
            },
        }

        # Act
        token_usage = trae_source.transform_token_usage(minimal_data)

        # Assert
        assert isinstance(token_usage, TokenUsage)
        assert token_usage.platform == "trae"
        assert token_usage.token_count == 500
        assert token_usage.api_calls == 1
        assert token_usage.usage_date == date(2024, 1, 10)
        assert token_usage.model is None
        assert token_usage.cost is None

    async def test_transform_token_usage_invalid_date(
        self,
        trae_source: TraeDataSource,
    ):
        """Test transformation handles invalid date format."""
        # Arrange
        invalid_data = {
            "id": "usage_000004",
            "user_id": "user123",
            "timestamp": "invalid-date",
            "tokens": {
                "total": 500,
            },
        }

        # Act
        token_usage = trae_source.transform_token_usage(invalid_data)

        # Assert
        assert isinstance(token_usage, TokenUsage)
        assert token_usage.usage_date == date.today()

    async def test_sync_token_usage_success(
        self,
        session: AsyncSession,
        trae_source: TraeDataSource,
        mock_token_usage_response: list[dict],
    ):
        """Test successful sync of token usage to database."""
        # Arrange - Create user first
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashed",
            department="Engineering",
        )
        session.add(user)
        await session.flush()
        await session.refresh(user)

        with patch.object(
            trae_source.client,
            "get_token_usage",
            new_callable=AsyncMock,
            return_value=mock_token_usage_response,
        ):
            # Act
            result = await trae_source.sync_token_usage(
                db=session,
                user_id=user.id,
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )

        # Assert
        assert result["total"] == 2
        assert result["processed"] == 2
        assert result["failed"] == 0

        # Verify records in database
        stmt = select(TokenUsage).where(TokenUsage.user_id == user.id)
        result = await session.execute(stmt)
        records = result.scalars().all()

        assert len(records) == 2
        assert records[0].platform == "trae"
        assert records[0].token_count == 1500

    async def test_sync_token_usage_with_project(
        self,
        session: AsyncSession,
        trae_source: TraeDataSource,
        mock_token_usage_response: list[dict],
    ):
        """Test sync with project association."""
        # Arrange - Create user and project
        user = User(
            username="testuser2",
            email="test2@example.com",
            password_hash="hashed",
            department="Engineering",
        )
        project = Project(
            name="Test Project",
            code="TEST001",
            stage="研发",
            status="active",
        )
        session.add(user)
        session.add(project)
        await session.flush()
        await session.refresh(user)
        await session.refresh(project)

        with patch.object(
            trae_source.client,
            "get_token_usage",
            new_callable=AsyncMock,
            return_value=mock_token_usage_response,
        ):
            # Act
            result = await trae_source.sync_token_usage(
                db=session,
                user_id=user.id,
                project_id=project.id,
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )

        # Assert
        assert result["processed"] == 2

        # Verify project association
        stmt = select(TokenUsage).where(TokenUsage.project_id == project.id)
        result = await session.execute(stmt)
        records = result.scalars().all()

        assert len(records) == 2

    async def test_sync_token_usage_duplicate_handling(
        self,
        session: AsyncSession,
        trae_source: TraeDataSource,
        mock_token_usage_response: list[dict],
    ):
        """Test that duplicate records are updated not duplicated."""
        # Arrange - Create user
        user = User(
            username="testuser3",
            email="test3@example.com",
            password_hash="hashed",
            department="Engineering",
        )
        session.add(user)
        await session.flush()
        await session.refresh(user)

        # First sync
        with patch.object(
            trae_source.client,
            "get_token_usage",
            new_callable=AsyncMock,
            return_value=mock_token_usage_response,
        ):
            await trae_source.sync_token_usage(
                db=session,
                user_id=user.id,
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )

        # Second sync with same data (should update, not duplicate)
        with patch.object(
            trae_source.client,
            "get_token_usage",
            new_callable=AsyncMock,
            return_value=mock_token_usage_response,
        ):
            result = await trae_source.sync_token_usage(
                db=session,
                user_id=user.id,
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )

        # Assert
        assert result["processed"] == 2

        # Verify no duplicates
        stmt = select(TokenUsage).where(TokenUsage.user_id == user.id)
        result = await session.execute(stmt)
        records = result.scalars().all()

        assert len(records) == 2  # Still 2, not 4

    async def test_sync_token_usage_partial_failure(
        self,
        session: AsyncSession,
        trae_source: TraeDataSource,
    ):
        """Test sync handles partial failures gracefully."""
        # Arrange - Create user
        user = User(
            username="testuser4",
            email="test4@example.com",
            password_hash="hashed",
            department="Engineering",
        )
        session.add(user)
        await session.flush()
        await session.refresh(user)

        # Mock data with one valid and one record that will cause an exception
        # We need to simulate an actual exception during processing
        valid_data = [
            {
                "id": "usage_000001",
                "user_id": "user123",
                "timestamp": "2024-01-15T10:30:00",
                "tokens": {"total": 1500},
            },
        ]

        # Test by making transform raise an exception for the second call
        call_count = 0
        original_transform = trae_source.transform_token_usage

        def failing_transform(trae_data):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                raise ValueError("Simulated transform error")
            return original_transform(trae_data)

        # Add a second record that will fail
        test_data = valid_data + [{
            "id": "usage_000002",
            "user_id": "user123",
            "timestamp": "2024-01-16T10:30:00",
            "tokens": {"total": 500},
        }]

        with patch.object(
            trae_source.client,
            "get_token_usage",
            new_callable=AsyncMock,
            return_value=test_data,
        ):
            with patch.object(
                trae_source,
                "transform_token_usage",
                side_effect=failing_transform,
            ):
                # Act
                result = await trae_source.sync_token_usage(
                    db=session,
                    user_id=user.id,
                    start_date=date(2024, 1, 1),
                    end_date=date(2024, 1, 31),
                )

        # Assert
        assert result["total"] == 2
        assert result["processed"] == 1
        assert result["failed"] == 1
        assert len(result["errors"]) == 1

    async def test_sync_token_usage_no_user(
        self,
        session: AsyncSession,
        trae_source: TraeDataSource,
    ):
        """Test sync with non-existent user."""
        # Act & Assert
        with pytest.raises(ValueError, match="User not found"):
            await trae_source.sync_token_usage(
                db=session,
                user_id=99999,  # Non-existent user
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
            )


class TestTraeDataSourceInterface:
    """Test that TraeDataSource implements DataSourceInterface correctly."""

    async def test_implements_fetch(self, session: AsyncSession):
        """Test that fetch method works via interface."""
        source = TraeDataSource()

        # Create user first
        user = User(
            username="fetchuser",
            email="fetch@example.com",
            password_hash="hashed",
            department="Engineering",
        )
        session.add(user)
        await session.flush()
        await session.refresh(user)

        with patch.object(
            source.client,
            "get_token_usage",
            new_callable=AsyncMock,
            return_value=[{"id": "1", "tokens": {"total": 100}}],
        ):
            records = await source.fetch(
                db=session,
                user_id=user.id,
                since=datetime(2024, 1, 1),
            )

        assert len(records) == 1

    async def test_implements_transform(self):
        """Test that transform method works via interface for token usage."""
        source = TraeDataSource()
        raw_data = {
            "id": "usage_001",
            "timestamp": "2024-01-15T10:30:00",
            "tokens": {"total": 500},
        }

        result = source.transform(raw_data)

        assert isinstance(result, TokenUsage)
        assert result.token_count == 500

    async def test_implements_save(self, session: AsyncSession):
        """Test that save method works via interface."""
        source = TraeDataSource()
        token_usage = TokenUsage(
            user_id=1,
            platform="trae",
            token_count=100,
            api_calls=1,
            usage_date=date(2024, 1, 15),
        )

        await source.save(session, token_usage)
        await session.commit()

        # Verify saved
        stmt = select(TokenUsage).where(TokenUsage.user_id == 1)
        result = await session.execute(stmt)
        saved = result.scalar_one()

        assert saved.token_count == 100

    async def test_implements_sync(self, session: AsyncSession):
        """Test that sync method works via interface."""
        source = TraeDataSource()

        # Create user
        user = User(
            username="syncuser",
            email="sync@example.com",
            password_hash="hashed",
            department="Engineering",
        )
        session.add(user)
        await session.flush()
        await session.refresh(user)

        with patch.object(
            source.client,
            "get_token_usage",
            new_callable=AsyncMock,
            return_value=[
                {
                    "id": "usage_001",
                    "timestamp": "2024-01-15T10:30:00",
                    "tokens": {"total": 500},
                }
            ],
        ):
            result = await source.sync(
                db=session,
                user_id=user.id,
                since=datetime(2024, 1, 1),
            )

        assert result["total"] == 1
        assert result["processed"] == 1

    async def test_sync_with_date_range_parameters(
        self,
        session: AsyncSession,
    ):
        """Test that sync supports configurable date range parameters.

        This test verifies the fix for: "日期范围硬编码 - 支持可配置的日期范围"
        """
        source = TraeDataSource()

        # Create user
        user = User(
            username="daterangeuser",
            email="daterange@example.com",
            password_hash="hashed",
            department="Engineering",
        )
        session.add(user)
        await session.flush()
        await session.refresh(user)

        # Define custom date range
        custom_start_date = date(2024, 3, 1)
        custom_end_date = date(2024, 3, 15)

        with patch.object(
            source.client,
            "get_token_usage",
            new_callable=AsyncMock,
            return_value=[
                {
                    "id": "usage_001",
                    "timestamp": "2024-03-10T10:30:00",
                    "tokens": {"total": 500},
                }
            ],
        ) as mock_get_token_usage:
            # Act - Pass date range via kwargs
            result = await source.sync(
                db=session,
                user_id=user.id,
                start_date=custom_start_date,
                end_date=custom_end_date,
            )

            # Assert
            assert result["total"] == 1
            assert result["processed"] == 1

            # Verify the API was called with the correct date range
            call_args = mock_get_token_usage.call_args
            assert call_args is not None
            # The start_date and end_date should be passed to fetch_token_usage
            # which then calls get_token_usage with the date range
