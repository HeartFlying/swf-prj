"""Tests for DataSourceInterface.

TDD Red Phase: Write tests before implementation.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.data_source_interface import DataSourceInterface


class MockDataSource(DataSourceInterface):
    """Mock implementation of DataSourceInterface for testing."""

    def __init__(self):
        super().__init__("mock")
        self.fetch_mock = AsyncMock(return_value=[
            {"id": 1, "name": "item1"},
            {"id": 2, "name": "item2"},
        ])
        self.transform_mock = MagicMock(side_effect=lambda x: MockModel(**x))
        self.save_mock = AsyncMock()

    async def fetch(self, db, project_id=None, user_id=None, since=None, **kwargs):
        return await self.fetch_mock(db, project_id, user_id, since, **kwargs)

    def transform(self, raw_data):
        return self.transform_mock(raw_data)

    async def save(self, db, transformed_data):
        await self.save_mock(db, transformed_data)


class MockModel:
    """Mock model for testing (not a real SQLAlchemy model)."""

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class TestDataSourceInterface:
    """Test cases for DataSourceInterface."""

    async def test_sync_workflow_success(self, session: AsyncSession):
        """Test successful sync workflow."""
        # Arrange
        source = MockDataSource()

        # Act
        result = await source.sync(db=session, project_id=1)

        # Assert
        assert result["total"] == 2
        assert result["processed"] == 2
        assert result["failed"] == 0
        assert len(result["errors"]) == 0

        # Verify fetch was called
        source.fetch_mock.assert_called_once()

        # Verify transform was called for each item
        assert source.transform_mock.call_count == 2

        # Verify save was called for each item
        assert source.save_mock.call_count == 2

    async def test_sync_workflow_with_failures(self, session: AsyncSession):
        """Test sync workflow with some failures."""
        # Arrange
        source = MockDataSource()
        call_count = 0

        async def failing_save(db, data):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                raise Exception("Save failed")

        source.save_mock = AsyncMock(side_effect=failing_save)

        # Act
        result = await source.sync(db=session, project_id=1)

        # Assert
        assert result["total"] == 2
        assert result["processed"] == 1
        assert result["failed"] == 1
        assert len(result["errors"]) == 1
        assert "Save failed" in result["errors"][0]

    async def test_sync_with_since_parameter(self, session: AsyncSession):
        """Test sync with since parameter for incremental sync."""
        # Arrange
        source = MockDataSource()
        since_time = datetime(2024, 1, 1)

        # Act
        await source.sync(db=session, project_id=1, since=since_time)

        # Assert
        call_args = source.fetch_mock.call_args
        # Check that since was passed (either as kwarg or in args)
        assert any(
            arg == since_time for arg in call_args.args
        ) or call_args.kwargs.get("since") == since_time

    async def test_sync_with_user_id(self, session: AsyncSession):
        """Test sync with user_id parameter."""
        # Arrange
        source = MockDataSource()

        # Act
        await source.sync(db=session, user_id=42)

        # Assert
        call_args = source.fetch_mock.call_args
        # Check that user_id was passed
        assert any(
            arg == 42 for arg in call_args.args
        ) or call_args.kwargs.get("user_id") == 42

    async def test_sync_empty_data(self, session: AsyncSession):
        """Test sync when no data is returned."""
        # Arrange
        source = MockDataSource()
        source.fetch_mock = AsyncMock(return_value=[])

        # Act
        result = await source.sync(db=session, project_id=1)

        # Assert
        assert result["total"] == 0
        assert result["processed"] == 0
        assert result["failed"] == 0

    async def test_sync_error_limit(self, session: AsyncSession):
        """Test that error messages are limited to 10."""
        # Arrange
        source = MockDataSource()
        source.fetch_mock = AsyncMock(return_value=[
            {"id": i} for i in range(20)
        ])
        source.save_mock = AsyncMock(side_effect=Exception("Error"))

        # Act
        result = await source.sync(db=session, project_id=1)

        # Assert
        assert result["total"] == 20
        assert result["failed"] == 20
        assert len(result["errors"]) == 10  # Limited to 10


class TestDataSourceInterfaceAbstract:
    """Test that DataSourceInterface enforces abstract methods."""

    def test_cannot_instantiate_without_implementation(self):
        """Test that DataSourceInterface cannot be instantiated directly."""
        with pytest.raises(TypeError):
            DataSourceInterface("test")

    def test_must_implement_fetch(self):
        """Test that subclasses must implement fetch."""
        class IncompleteSource(DataSourceInterface):
            def transform(self, raw_data):
                pass

            async def save(self, db, transformed_data):
                pass

        with pytest.raises(TypeError):
            IncompleteSource()

    def test_must_implement_transform(self):
        """Test that subclasses must implement transform."""
        class IncompleteSource(DataSourceInterface):
            async def fetch(self, db, **kwargs):
                pass

            async def save(self, db, transformed_data):
                pass

        with pytest.raises(TypeError):
            IncompleteSource()

    def test_must_implement_save(self):
        """Test that subclasses must implement save."""
        class IncompleteSource(DataSourceInterface):
            async def fetch(self, db, **kwargs):
                pass

            def transform(self, raw_data):
                pass

        with pytest.raises(TypeError):
            IncompleteSource()
