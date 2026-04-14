"""Data Source Interface Module

Defines the abstract base class for all data sources (GitLab, Trae, ZenTao).
All data source implementations must inherit from DataSourceInterface.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base


class DataSourceInterface(ABC):
    """Abstract base class for data source implementations.

    All third-party data sources (GitLab, Trae, ZenTao) must implement this interface.
    The interface defines the standard flow: fetch -> transform -> save.

    Example:
        class GitLabDataSource(DataSourceInterface):
            async def fetch(self, project_id: int, since: datetime = None):
                return await self.client.get_commits(project_id, since=since)

            def transform(self, raw_data: dict) -> CodeCommit:
                return CodeCommit(...)

            async def save(self, db: AsyncSession, data: CodeCommit):
                db.add(data)
                await db.commit()
    """

    def __init__(self, source_type: str):
        """Initialize data source.

        Args:
            source_type: Type of data source (gitlab, trae, zendao)
        """
        self.source_type = source_type

    @abstractmethod
    async def fetch(
        self,
        db: AsyncSession,
        project_id: Optional[int] = None,
        user_id: Optional[int] = None,
        since: Optional[datetime] = None,
        **kwargs: Any,
    ) -> list[dict]:
        """Fetch data from external source.

        Args:
            db: Database session
            project_id: Optional project ID to filter by
            user_id: Optional user ID to filter by
            since: Optional datetime to fetch records after
            **kwargs: Additional source-specific parameters

        Returns:
            List of raw data records from the external source
        """
        pass

    @abstractmethod
    def transform(self, raw_data: dict) -> Base:
        """Transform raw data to database model.

        Args:
            raw_data: Raw data dictionary from external source

        Returns:
            Database model instance
        """
        pass

    @abstractmethod
    async def save(self, db: AsyncSession, transformed_data: Base) -> None:
        """Save transformed data to database.

        Args:
            db: Database session
            transformed_data: Transformed database model instance
        """
        pass

    async def sync(
        self,
        db: AsyncSession,
        project_id: Optional[int] = None,
        user_id: Optional[int] = None,
        since: Optional[datetime] = None,
        **kwargs: Any,
    ) -> dict:
        """Execute full sync workflow: fetch -> transform -> save.

        Args:
            db: Database session
            project_id: Optional project ID to filter by
            user_id: Optional user ID to filter by
            since: Optional datetime to fetch records after
            **kwargs: Additional source-specific parameters

        Returns:
            Sync result summary with counts
        """
        records = await self.fetch(
            db=db,
            project_id=project_id,
            user_id=user_id,
            since=since,
            **kwargs,
        )

        processed = 0
        failed = 0
        errors = []

        for raw_record in records:
            try:
                transformed = self.transform(raw_record)
                await self.save(db, transformed)
                processed += 1
            except Exception as e:
                failed += 1
                errors.append(str(e))

        return {
            "total": len(records),
            "processed": processed,
            "failed": failed,
            "errors": errors[:10],  # Limit error messages
        }
