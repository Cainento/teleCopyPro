"""Telegram session repository for database operations."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import TelegramSession


class SessionRepository:
    """Repository for TelegramSession database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create(
        self,
        user_id: int,
        phone_number: str,
        api_id: str,
        api_hash: str,
        session_string: Optional[str] = None,
    ) -> TelegramSession:
        """Create a new Telegram session."""
        session = TelegramSession(
            user_id=user_id,
            phone_number=phone_number,
            session_string=session_string,
            api_id=api_id,
            api_hash=api_hash,
            is_active=True,
        )
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def get_by_phone(self, phone_number: str) -> Optional[TelegramSession]:
        """Get session by phone number."""
        result = await self.db.execute(
            select(TelegramSession).where(TelegramSession.phone_number == phone_number)
        )
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: int) -> List[TelegramSession]:
        """Get all sessions for a user."""
        result = await self.db.execute(
            select(TelegramSession)
            .where(TelegramSession.user_id == user_id)
            .order_by(TelegramSession.last_used_at.desc())
        )
        return list(result.scalars().all())

    async def get_active_sessions_by_user(self, user_id: int) -> List[TelegramSession]:
        """Get active sessions for a user."""
        result = await self.db.execute(
            select(TelegramSession).where(
                TelegramSession.user_id == user_id, TelegramSession.is_active == True
            )
        )
        return list(result.scalars().all())

    async def update_last_used(self, session: TelegramSession) -> TelegramSession:
        """Update last used timestamp."""
        session.last_used_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def deactivate(self, session: TelegramSession) -> TelegramSession:
        """Deactivate session."""
        session.is_active = False
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def activate(self, session: TelegramSession) -> TelegramSession:
        """Activate session."""
        session.is_active = True
        session.last_used_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def delete(self, session: TelegramSession) -> None:
        """Delete session."""
        await self.db.delete(session)
        await self.db.flush()
