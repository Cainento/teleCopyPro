"""Session service for managing temporary authentication sessions."""

import asyncio
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import SessionError
from app.core.logger import get_logger
from app.database.repositories.session_repository import SessionRepository
from app.database.repositories.temp_auth_repository import TempAuthRepository
from app.models.session import TemporarySession
from app.services.telegram_service import TelegramService

logger = get_logger(__name__)


class SessionService:
    """Service for managing temporary authentication sessions.
    
    Temporary auth sessions are now stored in the database instead of in-memory
    to support multi-machine deployments (e.g., Fly.io with multiple instances).
    """

    def __init__(self, telegram_service: TelegramService):
        """
        Initialize session service.

        Args:
            telegram_service: TelegramService instance
        """
        self._telegram_service = telegram_service
        self._cleanup_task: Optional[asyncio.Task] = None

    def _get_session_repo(self, db: AsyncSession) -> SessionRepository:
        """Get SessionRepository with provided database session."""
        return SessionRepository(db)

    def _get_temp_auth_repo(self, db: AsyncSession) -> TempAuthRepository:
        """Get TempAuthRepository with provided database session."""
        return TempAuthRepository(db)

    async def create_or_update_db_session(
        self,
        user_id: int,
        phone_number: str,
        api_id: int,
        api_id: int,
        api_hash: str,
        db: AsyncSession,
        session_file_path: Optional[str] = None
    ) -> None:
        """
        Create or update a session record in the database to persist API credentials.

        Args:
            user_id: User ID
            phone_number: Phone number
            api_id: Telegram API ID
            api_hash: Telegram API Hash
            db: Database session
            session_file_path: Optional specific session file path to use (if different from default)
        """
        session_repo = self._get_session_repo(db)

        try:
            # Check if session already exists
            existing_session = await session_repo.get_by_phone(phone_number)
            
            if existing_session:
                # Update existing session with new credentials if they changed
                # Also update session_file_path if provided (e.g. for unique timestamped sessions)
                updated = False
                
                if existing_session.api_id != str(api_id) or existing_session.api_hash != api_hash:
                    existing_session.api_id = str(api_id)
                    existing_session.api_hash = api_hash
                    updated = True
                
                if session_file_path and existing_session.session_file_path != session_file_path:
                    existing_session.session_file_path = session_file_path
                    updated = True
                
                if updated:
                    existing_session.is_active = True
                    await session_repo.update_last_used(existing_session)
                    logger.info(f"Updated session credentials/path in database for {phone_number}")
                else:
                    # Credentials haven't changed, but verify is_active
                    if not existing_session.is_active:
                         existing_session.is_active = True
                         await session_repo.update_last_used(existing_session)
                         logger.info(f"Reactivated existing session for {phone_number}")
                    else:
                        logger.debug(f"Session credentials unchanged for {phone_number}")
            else:
                # Create new session record
                if not session_file_path:
                    session_name = self._telegram_service._get_session_name(phone_number, api_id, api_hash)
                    session_path = self._telegram_service._get_session_path(session_name)
                    session_file_path = str(session_path)
                
                await session_repo.create(
                    user_id=user_id,
                    phone_number=phone_number,
                    session_file_path=session_file_path,
                    api_id=str(api_id),
                    api_hash=api_hash
                )
                logger.info(f"Created session record in database for {phone_number}")
        except Exception as e:
            logger.error(f"Error creating/updating session in database: {e}", exc_info=True)
            raise

    def _get_session_key(self, phone_number: str) -> str:
        """
        Generate session key from phone number.

        Args:
            phone_number: Phone number

        Returns:
            Session key
        """
        return phone_number.replace("+", "").replace(" ", "").replace("-", "")

    async def create_temp_session(
        self,
        phone_number: str,
        api_id: int,
        api_hash: str,
        phone_code_hash: str,
        db: AsyncSession,
        session_file_path: str,
        timeout: int = 300
    ) -> str:
        """
        Create a temporary session for authentication flow in the database.

        Args:
            phone_number: Phone number
            api_id: Telegram API ID
            api_hash: Telegram API Hash
            phone_code_hash: Phone code hash from Telegram
            db: Database session
            timeout: Session timeout in seconds (default: 5 minutes)

        Returns:
            Session key
        """
        session_key = self._get_session_key(phone_number)
        expires_at = datetime.utcnow() + timedelta(seconds=timeout)
        
        temp_auth_repo = self._get_temp_auth_repo(db)
        
        try:
            # Upsert: create or update the temp auth session
            await temp_auth_repo.upsert(
                session_key=session_key,
                phone_number=phone_number,
                api_id=str(api_id),
                api_hash=api_hash,
                phone_code_hash=phone_code_hash,
                session_file_path=session_file_path,
                expires_at=expires_at,
            )
            await db.commit()
            
            logger.info(f"Created temporary session for {phone_number}, expires at {expires_at}")
            return session_key
            
        except Exception as e:
            logger.error(f"Error creating temp auth session in database: {e}", exc_info=True)
            await db.rollback()
            raise SessionError(f"Failed to create temp auth session: {str(e)}")

    async def get_temp_session(self, phone_number: str, db: AsyncSession) -> Optional[dict]:
        """
        Get temporary session data from the database.

        Args:
            phone_number: Phone number
            db: Database session

        Returns:
            Session data dict or None if not found/expired
        """
        session_key = self._get_session_key(phone_number)
        logger.info(f"Looking for session with key: {session_key}")

        temp_auth_repo = self._get_temp_auth_repo(db)
        
        try:
            session = await temp_auth_repo.get_by_key(session_key)
            
            if not session:
                logger.warning(f"Session not found for {phone_number}")
                return None

            # Check if expired
            current_time = datetime.utcnow()
            logger.info(f"Session expires at: {session.expires_at}, current time: {current_time}")

            if session.expires_at and session.expires_at < current_time:
                logger.warning(f"Session expired for {phone_number}")
                await self.remove_temp_session(phone_number, db)
                return None

            logger.info(f"Found valid session for {phone_number}")
            
            # Return dict format for compatibility with existing code
            return {
                "phone_number": session.phone_number,
                "api_id": int(session.api_id),
                "api_hash": session.api_hash,
                "phone_code_hash": session.phone_code_hash,
                "session_file_path": session.session_file_path,
                "created_at": session.created_at,
                "expires_at": session.expires_at,
            }
            
        except Exception as e:
            logger.error(f"Error getting temp auth session from database: {e}", exc_info=True)
            return None

    async def remove_temp_session(self, phone_number: str, db: AsyncSession) -> None:
        """
        Remove temporary session from the database.

        Args:
            phone_number: Phone number
            db: Database session
        """
        session_key = self._get_session_key(phone_number)
        temp_auth_repo = self._get_temp_auth_repo(db)
        
        try:
            await temp_auth_repo.delete_by_key(session_key)
            await db.commit()
            logger.debug(f"Removed temporary session for {phone_number}")
        except Exception as e:
            logger.error(f"Error removing temp auth session from database: {e}", exc_info=True)
            await db.rollback()

    async def cleanup_expired_sessions(self, db: AsyncSession) -> int:
        """
        Clean up expired temporary sessions from the database.
        
        Args:
            db: Database session
            
        Returns:
            Number of sessions deleted
        """
        temp_auth_repo = self._get_temp_auth_repo(db)
        
        try:
            deleted_count = await temp_auth_repo.delete_expired()
            await db.commit()
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} expired temp auth sessions")
            return deleted_count
        except Exception as e:
            logger.error(f"Error cleaning up expired sessions: {e}", exc_info=True)
            await db.rollback()
            return 0

    async def cleanup(self) -> None:
        """Clean up resources (legacy method for compatibility)."""
        logger.info("Session service cleanup called (no-op in DB-backed mode)")
