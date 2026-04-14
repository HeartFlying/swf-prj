"""Tests for sync request date range validation.

TDD: Test date range validation in sync schemas.
"""

from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.schemas.sync import (
    SyncGitLabRequest,
    SyncTraeRequest,
    SyncZendaoRequest,
    SyncTaskCreate,
)


class TestSyncDateRangeValidation:
    """Test cases for date range validation in sync requests."""

    def test_gitlab_request_valid_date_range(self):
        """Test that valid date range is accepted."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 31)

        request = SyncGitLabRequest(
            project_id=1,
            sync_type="incremental_sync",
            start_date=start_date,
            end_date=end_date,
        )

        assert request.start_date == start_date
        assert request.end_date == end_date

    def test_gitlab_request_invalid_date_range(self):
        """Test that invalid date range (start > end) raises error."""
        start_date = date(2024, 1, 31)
        end_date = date(2024, 1, 1)

        with pytest.raises(ValidationError) as exc_info:
            SyncGitLabRequest(
                project_id=1,
                sync_type="incremental_sync",
                start_date=start_date,
                end_date=end_date,
            )

        assert "开始日期不能晚于结束日期" in str(exc_info.value)

    def test_gitlab_request_same_start_and_end_date(self):
        """Test that same start and end date is accepted."""
        same_date = date(2024, 1, 15)

        request = SyncGitLabRequest(
            project_id=1,
            sync_type="incremental_sync",
            start_date=same_date,
            end_date=same_date,
        )

        assert request.start_date == same_date
        assert request.end_date == same_date

    def test_gitlab_request_only_start_date(self):
        """Test that only start date without end date is accepted."""
        request = SyncGitLabRequest(
            project_id=1,
            sync_type="incremental_sync",
            start_date=date(2024, 1, 1),
            end_date=None,
        )

        assert request.start_date == date(2024, 1, 1)
        assert request.end_date is None

    def test_gitlab_request_only_end_date(self):
        """Test that only end date without start date is accepted."""
        request = SyncGitLabRequest(
            project_id=1,
            sync_type="incremental_sync",
            start_date=None,
            end_date=date(2024, 1, 31),
        )

        assert request.start_date is None
        assert request.end_date == date(2024, 1, 31)

    def test_gitlab_request_no_dates(self):
        """Test that no dates is accepted."""
        request = SyncGitLabRequest(
            project_id=1,
            sync_type="incremental_sync",
        )

        assert request.start_date is None
        assert request.end_date is None

    def test_trae_request_invalid_date_range(self):
        """Test that Trae request with invalid date range raises error."""
        with pytest.raises(ValidationError) as exc_info:
            SyncTraeRequest(
                user_id=1,
                sync_type="incremental_sync",
                start_date=date(2024, 1, 31),
                end_date=date(2024, 1, 1),
            )

        assert "开始日期不能晚于结束日期" in str(exc_info.value)

    def test_zendao_request_invalid_date_range(self):
        """Test that Zendao request with invalid date range raises error."""
        with pytest.raises(ValidationError) as exc_info:
            SyncZendaoRequest(
                project_id=1,
                sync_type="incremental_sync",
                start_date=date(2024, 1, 31),
                end_date=date(2024, 1, 1),
            )

        assert "开始日期不能晚于结束日期" in str(exc_info.value)

    def test_sync_task_create_invalid_date_range(self):
        """Test that SyncTaskCreate with invalid date range raises error."""
        with pytest.raises(ValidationError) as exc_info:
            SyncTaskCreate(
                source_type="gitlab",
                start_date=date(2024, 1, 31),
                end_date=date(2024, 1, 1),
            )

        assert "开始日期不能晚于结束日期" in str(exc_info.value)

    def test_large_date_range(self):
        """Test that large date range (1 year) is accepted."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 12, 31)

        request = SyncGitLabRequest(
            project_id=1,
            sync_type="full_sync",
            start_date=start_date,
            end_date=end_date,
        )

        assert request.start_date == start_date
        assert request.end_date == end_date

    def test_future_dates(self):
        """Test that future dates are accepted (validation only checks range)."""
        future_date = date.today() + timedelta(days=30)
        end_date = future_date + timedelta(days=7)

        request = SyncGitLabRequest(
            project_id=1,
            sync_type="incremental_sync",
            start_date=future_date,
            end_date=end_date,
        )

        assert request.start_date == future_date
        assert request.end_date == end_date
