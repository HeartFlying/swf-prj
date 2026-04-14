"""Trae Data Source Module

Implements DataSourceInterface for Trae AI data synchronization.
Fetches AI suggestions, token usage, and other data from Trae API.
"""

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AISuggestion, TokenUsage, User
from app.integrations.trae.client import TraeClient
from app.services.data_source_interface import DataSourceInterface

logger = logging.getLogger(__name__)


class TraeDataSource(DataSourceInterface):
    """Trae data source implementation.

    Fetches and syncs data from Trae API including:
    - AI Suggestions
    - Token Usage
    - Developer Productivity Metrics
    """

    def __init__(self, client: Optional[TraeClient] = None):
        """Initialize Trae data source.

        Args:
            client: Optional Trae client instance. If not provided,
                   a new client will be created.
        """
        super().__init__("trae")
        self.client = client or TraeClient()

    async def fetch(
        self,
        db: AsyncSession,
        project_id: Optional[int] = None,
        user_id: Optional[int] = None,
        since: Optional[datetime] = None,
        **kwargs,
    ) -> list[dict]:
        """Fetch token usage from Trae.

        Args:
            db: Database session
            project_id: Not used for Trae token usage
            user_id: User ID to fetch token usage for
            since: Only fetch records after this datetime
            **kwargs: Additional parameters

        Returns:
            List of token usage dictionaries from Trae API
        """
        if user_id is None:
            raise ValueError("user_id is required for Trae token usage fetch")

        # Get Trae user ID from user account mapping
        trae_user_id = await self._get_user_trae_account_id(db, user_id)
        if not trae_user_id:
            trae_user_id = f"user{user_id}"

        # Convert since to date range
        start_date = since.date() if since else date.today()
        end_date = date.today()

        return await self.fetch_token_usage(
            user_id=trae_user_id,
            start_date=start_date,
            end_date=end_date,
        )

    async def fetch_token_usage(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
    ) -> list[dict]:
        """Fetch token usage from Trae for a specific user.

        Args:
            user_id: The Trae user ID
            start_date: Start date for the query
            end_date: End date for the query

        Returns:
            List of token usage dictionaries
        """
        try:
            records = await self.client.get_token_usage(
                user_id=user_id,
                start_date=datetime.combine(start_date, datetime.min.time()),
                end_date=datetime.combine(end_date, datetime.max.time()),
                per_page=100,
            )
            logger.info(f"Fetched {len(records)} token usage records from Trae for user {user_id}")
            return records
        except Exception as e:
            logger.exception(f"Failed to fetch token usage from Trae: {e}")
            raise

    def transform(self, raw_data: dict) -> TokenUsage:
        """Transform Trae token usage data to TokenUsage model.

        Args:
            raw_data: Raw token usage data from Trae API

        Returns:
            TokenUsage model instance
        """
        return self.transform_token_usage(raw_data)

    def transform_token_usage(self, trae_data: dict) -> TokenUsage:
        """Transform a Trae token usage record to TokenUsage model.

        Args:
            trae_data: Token usage data from Trae API

        Returns:
            TokenUsage model instance
        """
        # Parse timestamp to date
        timestamp_str = trae_data.get("timestamp", "")
        usage_date = self._parse_date(timestamp_str)

        # Extract token count
        tokens = trae_data.get("tokens", {})
        token_count = tokens.get("total", 0)

        # Extract cost
        cost_data = trae_data.get("cost", {})
        cost = None
        if cost_data and "amount" in cost_data:
            cost = Decimal(str(cost_data["amount"]))

        # Extract model
        model = trae_data.get("model")

        return TokenUsage(
            platform="trae",
            token_count=token_count,
            api_calls=1,  # Each record represents one API call
            usage_date=usage_date,
            model=model,
            cost=cost,
            user_id=0,  # Will be set during save
            project_id=None,
        )

    def _parse_date(self, timestamp_str: str) -> date:
        """Parse timestamp string to date.

        Args:
            timestamp_str: ISO format timestamp string

        Returns:
            Parsed date or today if parsing fails
        """
        if not timestamp_str:
            return date.today()

        try:
            # Handle ISO format with or without timezone
            timestamp_str = timestamp_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(timestamp_str)
            return dt.date()
        except (ValueError, TypeError):
            logger.warning(f"Failed to parse date: {timestamp_str}, using today")
            return date.today()

    async def save(self, db: AsyncSession, transformed_data: TokenUsage) -> None:
        """Save a TokenUsage to database.

        Args:
            db: Database session
            transformed_data: TokenUsage model to save
        """
        db.add(transformed_data)
        await db.flush()

    async def sync_token_usage(
        self,
        db: AsyncSession,
        user_id: int,
        start_date: date,
        end_date: date,
        project_id: Optional[int] = None,
    ) -> dict:
        """Sync token usage from Trae to database.

        This is a convenience method that wraps the full sync workflow
        with Trae-specific logic.

        Args:
            db: Database session
            user_id: User ID to sync (internal database ID)
            start_date: Start date for the query
            end_date: End date for the query
            project_id: Optional project ID to associate with records

        Returns:
            Sync result summary
        """
        # Verify user exists
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise ValueError(f"User not found: {user_id}")

        # Get Trae user ID from user account mapping
        trae_user_id = await self._get_user_trae_account_id(db, user_id)
        if not trae_user_id:
            trae_user_id = f"user{user_id}"

        # Fetch records
        records_data = await self.fetch_token_usage(
            user_id=trae_user_id,
            start_date=start_date,
            end_date=end_date,
        )

        processed = 0
        failed = 0
        errors = []

        for record_data in records_data:
            try:
                # Transform
                token_usage = self.transform_token_usage(record_data)
                token_usage.user_id = user_id
                token_usage.project_id = project_id

                # Check for duplicates using unique constraint
                # (user_id, platform, usage_date) is unique
                stmt = select(TokenUsage).where(
                    TokenUsage.user_id == user_id,
                    TokenUsage.platform == "trae",
                    TokenUsage.usage_date == token_usage.usage_date,
                )
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    # Update existing record - aggregate tokens
                    existing.token_count += token_usage.token_count
                    existing.api_calls += 1
                    if token_usage.cost:
                        existing.cost = (existing.cost or Decimal("0")) + token_usage.cost
                else:
                    # Insert new record
                    await self.save(db, token_usage)

                processed += 1
            except Exception as e:
                failed += 1
                errors.append(str(e))
                logger.exception(f"Failed to process token usage record: {e}")

        await db.commit()

        return {
            "total": len(records_data),
            "processed": processed,
            "failed": failed,
            "errors": errors[:10],
        }

    async def sync(
        self,
        db: AsyncSession,
        project_id: Optional[int] = None,
        user_id: Optional[int] = None,
        since: Optional[datetime] = None,
        **kwargs,
    ) -> dict:
        """Execute full sync workflow for Trae (token usage).

        Args:
            db: Database session
            project_id: Optional project ID
            user_id: Required user ID
            since: Optional datetime filter
            **kwargs: Additional parameters (start_date, end_date)

        Returns:
            Sync result summary
        """
        if user_id is None:
            raise ValueError("user_id is required for Trae sync")

        # Support configurable date range via kwargs
        # Priority: kwargs start_date/end_date > since parameter > default (today)
        start_date = kwargs.get("start_date")
        end_date = kwargs.get("end_date")

        if start_date is None:
            # Fall back to since parameter or default to today
            start_date = since.date() if since else date.today()

        if end_date is None:
            # Default to today
            end_date = date.today()

        return await self.sync_token_usage(
            db=db,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            project_id=project_id,
        )

    # AI Suggestions methods
    async def fetch_ai_suggestions(
        self,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        per_page: int = 100,
        page: int = 1,
    ) -> list[dict]:
        """Fetch AI suggestions from Trae API.

        Args:
            user_id: Filter by user ID (external Trae user ID)
            status: Filter by status (accepted, rejected, pending)
            per_page: Number of results per page
            page: Current page number

        Returns:
            List of AI suggestion dictionaries
        """
        try:
            suggestions = await self.client.get_ai_suggestions(
                user_id=user_id,
                status=status,
                per_page=per_page,
                page=page,
            )
            logger.info(f"Fetched {len(suggestions)} AI suggestions from Trae")
            return suggestions
        except Exception as e:
            logger.exception(f"Failed to fetch AI suggestions from Trae: {e}")
            raise

    def _parse_datetime(self, dt_str: Optional[str]) -> Optional[datetime]:
        """Parse ISO datetime string to datetime object.

        Args:
            dt_str: ISO format datetime string

        Returns:
            Parsed datetime or None
        """
        if not dt_str:
            return None
        try:
            dt_str = dt_str.replace("Z", "+00:00")
            return datetime.fromisoformat(dt_str)
        except (ValueError, TypeError):
            return None

    def transform_ai_suggestion(self, trae_data: dict) -> AISuggestion:
        """Transform Trae AI suggestion data to AISuggestion model.

        Args:
            trae_data: AI suggestion data from Trae API

        Returns:
            AISuggestion model instance
        """
        # Parse accepted_at datetime if present
        accepted_at = self._parse_datetime(trae_data.get("accepted_at"))

        # Parse created_at datetime if present (from API)
        created_at = self._parse_datetime(trae_data.get("created_at"))

        # Determine if suggestion was accepted based on status
        status = trae_data.get("status", "")
        is_accepted = status.lower() == "accepted"

        suggestion = AISuggestion(
            suggestion_type=trae_data.get("suggestion_type", "code_completion"),
            content=trae_data.get("content", ""),
            language=trae_data.get("language"),
            file_path=trae_data.get("file_path"),
            line_number=trae_data.get("line_number"),
            token_cost=trae_data.get("token_cost"),
            is_accepted=is_accepted,
            accepted_at=accepted_at,
            commit_hash=trae_data.get("commit_hash"),
            platform="trae",
            user_id=0,  # Will be set during save
            project_id=None,  # Will be set during save if available
        )

        # Set created_at if provided from API
        if created_at:
            suggestion.created_at = created_at

        return suggestion

    async def _get_user_by_id(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[User]:
        """Get user by ID.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            User model instance or None
        """
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_user_trae_account_id(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[str]:
        """Get user's Trae account ID.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Trae account ID or None
        """
        from app.db.models import UserAccount

        stmt = select(UserAccount).where(
            UserAccount.user_id == user_id,
            UserAccount.platform == "trae"
        )
        result = await db.execute(stmt)
        account = result.scalar_one_or_none()

        if account:
            return account.account_id
        return None

    async def sync_ai_suggestions(
        self,
        db: AsyncSession,
        user_id: Optional[int] = None,
    ) -> dict:
        """Sync AI suggestions from Trae to database.

        This is a convenience method that wraps the full sync workflow
        with Trae-specific logic for user mapping and duplicate handling.

        Args:
            db: Database session
            user_id: Optional user ID to sync suggestions for

        Returns:
            Sync result summary
        """
        # Get external user ID if internal user_id is provided
        external_user_id = None
        if user_id:
            external_user_id = await self._get_user_trae_account_id(db, user_id)

        # Fetch suggestions
        try:
            suggestions_data = await self.fetch_ai_suggestions(
                user_id=external_user_id
            )
        except Exception as e:
            logger.exception(f"Failed to fetch AI suggestions: {e}")
            return {
                "total": 0,
                "processed": 0,
                "failed": 0,
                "errors": [str(e)],
            }

        processed = 0
        failed = 0
        errors = []

        for suggestion_data in suggestions_data:
            try:
                # Transform
                suggestion = self.transform_ai_suggestion(suggestion_data)

                # Set user_id if provided
                if user_id:
                    suggestion.user_id = user_id
                else:
                    # Try to find user by external account ID
                    trae_user_id = suggestion_data.get("user_id")
                    if trae_user_id:
                        internal_user_id = await self._find_user_by_trae_account(
                            db, trae_user_id
                        )
                        if internal_user_id:
                            suggestion.user_id = internal_user_id
                        else:
                            # Skip if user not found
                            logger.warning(
                                f"Skipping suggestion for unknown user: {trae_user_id}"
                            )
                            continue
                    else:
                        # Skip if no user identification
                        logger.warning("Skipping suggestion with no user_id")
                        continue

                # Check for duplicates (by content hash or unique identifier)
                # For now, we use a combination of user_id, content, and created_at
                stmt = select(AISuggestion).where(
                    AISuggestion.user_id == suggestion.user_id,
                    AISuggestion.content == suggestion.content,
                    AISuggestion.created_at == suggestion.created_at,
                )
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    # Update existing record
                    existing.is_accepted = suggestion.is_accepted
                    existing.accepted_at = suggestion.accepted_at
                    existing.commit_hash = suggestion.commit_hash
                    existing.token_cost = suggestion.token_cost
                else:
                    # Insert new record
                    db.add(suggestion)
                    await db.flush()

                processed += 1
            except Exception as e:
                failed += 1
                errors.append(str(e))
                logger.exception(
                    f"Failed to process suggestion {suggestion_data.get('id')}: {e}"
                )

        await db.commit()

        return {
            "total": len(suggestions_data),
            "processed": processed,
            "failed": failed,
            "errors": errors[:10],
        }

    async def _find_user_by_trae_account(
        self,
        db: AsyncSession,
        trae_account_id: str,
    ) -> Optional[int]:
        """Find internal user ID by Trae account ID.

        Args:
            db: Database session
            trae_account_id: Trae account ID

        Returns:
            Internal user ID or None
        """
        from app.db.models import UserAccount

        stmt = select(UserAccount).where(
            UserAccount.platform == "trae",
            UserAccount.account_id == trae_account_id
        )
        result = await db.execute(stmt)
        account = result.scalar_one_or_none()

        if account:
            return account.user_id
        return None
