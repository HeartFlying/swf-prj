"""Tests for HeatmapResponse schema - TDD.

This file tests the HeatmapResponse schema definition in app.schemas.stats module.
"""

import pytest
from pydantic import ValidationError


class TestHeatmapResponse:
    """Test cases for HeatmapResponse schema."""

    @pytest.fixture
    def heatmap_response_class(self):
        """Import the HeatmapResponse class."""
        from app.schemas.stats import HeatmapResponse
        return HeatmapResponse

    @pytest.fixture
    def heatmap_data_point_class(self):
        """Import the HeatmapDataPoint class."""
        from app.schemas.stats import HeatmapDataPoint
        return HeatmapDataPoint

    def test_heatmap_response_exists(self, heatmap_response_class):
        """Test that HeatmapResponse class exists."""
        assert heatmap_response_class is not None

    def test_heatmap_data_point_exists(self, heatmap_data_point_class):
        """Test that HeatmapDataPoint class exists."""
        assert heatmap_data_point_class is not None

    def test_heatmap_data_point_required_fields(self, heatmap_data_point_class):
        """Test that HeatmapDataPoint has all required fields."""
        # Create a valid instance
        data_point = heatmap_data_point_class(
            date="2026-03-15",
            count=5,
            level=2
        )

        # Verify all fields are accessible
        assert data_point.date == "2026-03-15"
        assert data_point.count == 5
        assert data_point.level == 2

    def test_heatmap_data_point_field_types(self, heatmap_data_point_class):
        """Test that HeatmapDataPoint fields have correct types."""
        data_point = heatmap_data_point_class(
            date="2026-03-15",
            count=5,
            level=2
        )

        # Verify field types
        assert isinstance(data_point.date, str)
        assert isinstance(data_point.count, int)
        assert isinstance(data_point.level, int)

    def test_heatmap_data_point_missing_required_fields(self, heatmap_data_point_class):
        """Test that HeatmapDataPoint validates required fields."""
        # Missing date
        with pytest.raises(ValidationError) as exc_info:
            heatmap_data_point_class(
                count=5,
                level=2
            )
        assert "date" in str(exc_info.value)

        # Missing count
        with pytest.raises(ValidationError) as exc_info:
            heatmap_data_point_class(
                date="2026-03-15",
                level=2
            )
        assert "count" in str(exc_info.value)

        # Missing level
        with pytest.raises(ValidationError) as exc_info:
            heatmap_data_point_class(
                date="2026-03-15",
                count=5
            )
        assert "level" in str(exc_info.value)

    def test_heatmap_data_point_serialization(self, heatmap_data_point_class):
        """Test that HeatmapDataPoint can be serialized to dict."""
        data_point = heatmap_data_point_class(
            date="2026-03-15",
            count=5,
            level=2
        )

        # Serialize to dict
        data = data_point.model_dump()

        # Verify serialized data
        assert data["date"] == "2026-03-15"
        assert data["count"] == 5
        assert data["level"] == 2

    def test_heatmap_response_with_data(self, heatmap_response_class, heatmap_data_point_class):
        """Test HeatmapResponse with data points."""
        # Create data points
        data_points = [
            heatmap_data_point_class(date="2026-03-01", count=3, level=1),
            heatmap_data_point_class(date="2026-03-02", count=8, level=3),
            heatmap_data_point_class(date="2026-03-03", count=0, level=0),
        ]

        # Create response
        response = heatmap_response_class(
            user_id=1,
            data=data_points,
            total_days=30,
            start_date="2026-03-01",
            end_date="2026-03-30"
        )

        # Verify fields
        assert response.user_id == 1
        assert len(response.data) == 3
        assert response.total_days == 30
        assert response.start_date == "2026-03-01"
        assert response.end_date == "2026-03-30"

    def test_heatmap_response_empty_data(self, heatmap_response_class):
        """Test HeatmapResponse with empty data."""
        response = heatmap_response_class(
            user_id=1,
            data=[],
            total_days=30,
            start_date="2026-03-01",
            end_date="2026-03-30"
        )

        assert response.user_id == 1
        assert response.data == []
        assert response.total_days == 30

    def test_heatmap_response_missing_required_fields(self, heatmap_response_class):
        """Test that HeatmapResponse validates required fields."""
        # Missing user_id
        with pytest.raises(ValidationError) as exc_info:
            heatmap_response_class(
                data=[],
                total_days=30,
                start_date="2026-03-01",
                end_date="2026-03-30"
            )
        assert "user_id" in str(exc_info.value)

        # Missing start_date
        with pytest.raises(ValidationError) as exc_info:
            heatmap_response_class(
                user_id=1,
                data=[],
                total_days=30,
                end_date="2026-03-30"
            )
        assert "start_date" in str(exc_info.value)

        # Missing end_date
        with pytest.raises(ValidationError) as exc_info:
            heatmap_response_class(
                user_id=1,
                data=[],
                total_days=30,
                start_date="2026-03-01"
            )
        assert "end_date" in str(exc_info.value)

    def test_heatmap_response_serialization(self, heatmap_response_class, heatmap_data_point_class):
        """Test that HeatmapResponse can be serialized to dict."""
        data_points = [
            heatmap_data_point_class(date="2026-03-01", count=3, level=1),
            heatmap_data_point_class(date="2026-03-02", count=8, level=3),
        ]

        response = heatmap_response_class(
            user_id=1,
            data=data_points,
            total_days=30,
            start_date="2026-03-01",
            end_date="2026-03-30"
        )

        # Serialize to dict
        data = response.model_dump()

        # Verify serialized data
        assert data["user_id"] == 1
        assert len(data["data"]) == 2
        assert data["total_days"] == 30
        assert data["start_date"] == "2026-03-01"
        assert data["end_date"] == "2026-03-30"

    def test_heatmap_response_level_range(self, heatmap_data_point_class):
        """Test that heatmap level is within valid range (0-4)."""
        # Level 0 (no activity)
        dp0 = heatmap_data_point_class(date="2026-03-01", count=0, level=0)
        assert dp0.level == 0

        # Level 4 (highest activity)
        dp4 = heatmap_data_point_class(date="2026-03-02", count=20, level=4)
        assert dp4.level == 4

    def test_heatmap_response_default_total_days(self, heatmap_response_class, heatmap_data_point_class):
        """Test that total_days has default value of 30."""
        response = heatmap_response_class(
            user_id=1,
            data=[],
            start_date="2026-03-01",
            end_date="2026-03-30"
        )

        assert response.total_days == 30
