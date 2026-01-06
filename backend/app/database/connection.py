"""Database connection and session management."""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)


from sqlalchemy import event
from sqlalchemy.engine import Engine

# Create async engine
# NullPool is used in production for better connection management with asyncpg
# When using NullPool, pool_size and max_overflow parameters should NOT be passed
# SSL is disabled for Fly.io internal network (.flycast) - asyncpg requires False (boolean) or "disable"

# Determine connect_args based on database type
connect_args = {}
if "postgresql" in settings.database_url or "postgres" in settings.database_url:
    # PostgreSQL-specific: Disable SSL for Fly.io internal network or local development
    connect_args = {"ssl": False}
elif "sqlite" in settings.database_url:
    # SQLite-specific: Increase busy timeout (in seconds)
    connect_args = {"timeout": 60}

# Optimization for SQLite: Use WAL (Write-Ahead Logging) mode for better concurrency
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable WAL mode for SQLite to allow concurrent reads and one writer."""
    # We check if the connection object has an 'execute' method (pysqlite/aiosqlite)
    # Note: For async engines, we might need a different approach or this might work via the sync wrapper
    try:
        if "sqlite" in settings.database_url:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.close()
    except Exception as e:
        logger.warning(f"Failed to set SQLite PRAGMAs: {e}")

if settings.is_production:
    engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,  # Log SQL queries in debug mode
        pool_pre_ping=True,  # Verify connections before using them
        poolclass=NullPool,  # NullPool for production (no pool_size/max_overflow)
        connect_args=connect_args,
    )
else:
    # In development, use default pool with size limits
    engine = create_async_engine(
        settings.database_url,
        echo=False,  # Log SQL queries in debug mode
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        pool_pre_ping=True,  # Verify connections before using them
        connect_args=connect_args,
    )

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function that yields database sessions.

    Usage in FastAPI routes:
    ```python
    @app.get("/users")
    async def get_users(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(User))
        return result.scalars().all()
    ```
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize database (create tables if they don't exist).

    Note: In production, use Alembic migrations instead of this function.
    This is mainly for development and testing.
    """
    from app.database.models import Base

    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()
    logger.info("Database connections closed")


# Export for easy importing
__all__ = ["engine", "AsyncSessionLocal", "get_db", "init_db", "close_db"]
