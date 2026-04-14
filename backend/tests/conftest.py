"""Pytest configuration and fixtures."""

import os
import uuid

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.db.base import Base

# Import all models to register them with Base metadata
from app.db.models import (  # noqa: F401
    AISuggestion,
    BugRecord,
    CodeCommit,
    DataSource,
    MergeRequest,
    Project,
    ProjectMember,
    Role,
    StatsSnapshot,
    SyncTask,
    TaskRecord,
    TokenUsage,
    User,
    UserAccount,
    UserPlatformAccount,
)


@pytest_asyncio.fixture(scope="function")
async def session():
    """Create a test database session with fresh tables for each test."""
    # Use unique database file for each test to avoid conflicts
    db_file = f"test_{uuid.uuid4().hex}.db"
    test_database_url = f"sqlite+aiosqlite:///./{db_file}"

    engine = create_async_engine(
        test_database_url,
        poolclass=NullPool,
        echo=False,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session

    # Cleanup: close engine and remove database file
    await engine.dispose()

    # Remove the test database file
    try:
        if os.path.exists(db_file):
            os.remove(db_file)
    except OSError:
        pass  # Ignore cleanup errors
