"""Initialize database tables and seed data."""

import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.models import (
    Role,
    User,
)


async def init_database():
    """Create all database tables."""
    engine = create_async_engine(settings.DATABASE_URL, echo=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    print("Database tables created successfully!")

    # Seed initial data
    await seed_data(engine)

    await engine.dispose()


async def seed_data(engine):
    """Seed initial data."""
    from sqlalchemy.ext.asyncio import AsyncSession

    async with AsyncSession(engine) as session:
        # Create roles
        admin_role = Role(
            name="admin",
            description="Administrator with full access",
            permissions=["*"],
        )
        user_role = Role(
            name="user",
            description="Regular user",
            permissions=["read"],
        )
        session.add_all([admin_role, user_role])
        await session.flush()

        # Create admin user
        admin_user = User(
            username="admin",
            email="admin@example.com",
            password_hash=get_password_hash("password123"),
            department="研发中心",
            role_id=admin_role.id,
            is_active=True,
        )
        session.add(admin_user)

        # Create test user
        test_user = User(
            username="testuser",
            email="test@example.com",
            password_hash=get_password_hash("testpass123"),
            department="测试部门",
            role_id=user_role.id,
            is_active=True,
        )
        session.add(test_user)

        await session.commit()
        print("Seed data created successfully!")


if __name__ == "__main__":
    asyncio.run(init_database())
