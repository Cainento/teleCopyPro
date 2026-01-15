"""Repository for temporary authentication session database operations."""

from datetime import datetime
from typing import Optional

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import TempAuthSession


class TempAuthRepository:
    """Repository for TempAuthSession database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create(
        self,
        session_key: str,
        phone_number: str,
        api_id: str,
        api_hash: str,
        phone_code_hash: str,
        expires_at: datetime,
        session_file_path: Optional[str] = None,
    ) -> TempAuthSession:
        """Create a new temporary auth session."""
        session = TempAuthSession(
            session_key=session_key,
            phone_number=phone_number,
            api_id=api_id,
            api_hash=api_hash,
            phone_code_hash=phone_code_hash,
            session_file_path=session_file_path,
            expires_at=expires_at,
        )
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def get_by_key(self, session_key: str) -> Optional[TempAuthSession]:
        """Get temp auth session by session key."""
        result = await self.db.execute(
            select(TempAuthSession).where(TempAuthSession.session_key == session_key)
        )
        return result.scalar_one_or_none()

    async def delete_by_key(self, session_key: str) -> None:
        """Delete temp auth session by session key."""
        await self.db.execute(
            delete(TempAuthSession).where(TempAuthSession.session_key == session_key)
        )
        await self.db.flush()

    async def delete_expired(self) -> int:
        """Delete all expired temp auth sessions. Returns count of deleted rows."""
        result = await self.db.execute(
            delete(TempAuthSession).where(TempAuthSession.expires_at < datetime.utcnow())
        )
        await self.db.flush()
        return result.rowcount

    async def upsert(
        self,
        session_key: str,
        phone_number: str,
        api_id: str,
        api_hash: str,
        phone_code_hash: str,
        expires_at: datetime,
        session_file_path: Optional[str] = None,
    ) -> TempAuthSession:
        """Create or update a temp auth session."""
        existing = await self.get_by_key(session_key)
        if existing:
            # Update existing session
            existing.phone_number = phone_number
            existing.api_id = api_id
            existing.api_hash = api_hash
            existing.phone_code_hash = phone_code_hash
            existing.session_file_path = session_file_path
            existing.expires_at = expires_at
            existing.created_at = datetime.utcnow()
            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        else:
            # Create new session
            return await self.create(
                session_key=session_key,
                phone_number=phone_number,
                api_id=api_id,
                api_hash=api_hash,
                phone_code_hash=phone_code_hash,
                session_file_path=session_file_path,
                expires_at=expires_at,
            )
