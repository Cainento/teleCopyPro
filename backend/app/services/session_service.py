"""Session service for managing temporary authentication sessions."""

import asyncio
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import SessionError
from app.core.logger import get_logger
from app.database.repositories.session_repository import SessionRepository
from app.models.session import TemporarySession
from app.services.telegram_service import TelegramService

logger = get_logger(__name__)



class SessionService:
    """Service for managing temporary authentication sessions."""

    def __init__(self, telegram_service: TelegramService, db: Optional[AsyncSession] = None):
        """
        Initialize session service.

        Args:
            telegram_service: TelegramService instance
            db: Optional database session for persistent session storage
        """
        self._telegram_service = telegram_service
        self._temp_sessions: dict[str, dict] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
        self._db = db

    def set_db(self, db: AsyncSession) -> None:
        """Set database session for persistent session operations."""
        self._db = db

    def _get_session_repo(self) -> Optional[SessionRepository]:
        """Get SessionRepository if database is available."""
        if self._db:
            return SessionRepository(self._db)
        return None

    async def create_or_update_db_session(
        self,
        user_id: int,
        phone_number: str,
        api_id: int,
        api_hash: str
    ) -> None:
        """
        Create or update a session record in the database to persist API credentials.

        Args:
            user_id: User ID
            phone_number: Phone number
            api_id: Telegram API ID
            api_hash: Telegram API Hash
        """
        session_repo = self._get_session_repo()
        if not session_repo:
            logger.warning("No database session available, cannot persist session credentials")
            return

        try:
            # Check if session already exists
            existing_session = await session_repo.get_by_phone(phone_number)
            
            if existing_session:
                # Update existing session with new credentials if they changed
                if existing_session.api_id != str(api_id) or existing_session.api_hash != api_hash:
                    existing_session.api_id = str(api_id)
                    existing_session.api_hash = api_hash
                    existing_session.is_active = True
                    await session_repo.update_last_used(existing_session)
                    logger.info(f"Updated session credentials in database for {phone_number}")
                else:
                    await session_repo.update_last_used(existing_session)
                    logger.debug(f"Updated session activity for {phone_number}")
            else:
                # Create new session record
                session_name = self._telegram_service._get_session_name(phone_number, api_id, api_hash)
                session_path = self._telegram_service._get_session_path(session_name)
                await session_repo.create(
                    user_id=user_id,
                    phone_number=phone_number,
                    session_file_path=str(session_path),
                    api_id=str(api_id),
                    api_hash=api_hash
                )
                logger.info(f"Created session record in database for {phone_number}")
        except Exception as e:
            logger.error(f"Error creating/updating session in database: {e}", exc_info=True)
            raise

    def _start_cleanup_task(self) -> None:
        """Start background task to clean up expired sessions."""
        if self._cleanup_task is None or self._cleanup_task.done():
            try:
                loop = asyncio.get_running_loop()
                self._cleanup_task = loop.create_task(self._cleanup_expired_sessions())
            except RuntimeError:
                # No running event loop, task will be started on first use
                pass

    async def _cleanup_expired_sessions(self) -> None:
        """Periodically clean up expired temporary sessions."""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                current_time = datetime.utcnow()
                expired_sessions = []

                for session_key, session_data in self._temp_sessions.items():
                    expires_at = session_data.get("expires_at")
                    if expires_at and expires_at < current_time:
                        expired_sessions.append(session_key)

                for session_key in expired_sessions:
                    await self.remove_temp_session(session_key)
                    logger.debug(f"Removed expired session: {session_key}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}", exc_info=True)

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
        client: object,
        phone_code_hash: str,
        timeout: int = 300
    ) -> str:
        """
        Create a temporary session for authentication flow.

        Args:
            phone_number: Phone number
            api_id: Telegram API ID
            api_hash: Telegram API Hash
            client: TelegramClient instance
            phone_code_hash: Phone code hash
            timeout: Session timeout in seconds (default: 5 minutes)

        Returns:
            Session key
        """
        # Start cleanup task if not running
        self._start_cleanup_task()

        session_key = self._get_session_key(phone_number)
        expires_at = datetime.utcnow() + timedelta(seconds=timeout)

        self._temp_sessions[session_key] = {
            "phone_number": phone_number,
            "api_id": api_id,
            "api_hash": api_hash,
            "client": client,
            "phone_code_hash": phone_code_hash,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at
        }

        logger.info(f"Created temporary session for {phone_number}, expires at {expires_at}")
        logger.debug(f"Active sessions: {list(self._temp_sessions.keys())}")
        return session_key

    async def get_temp_session(self, phone_number: str) -> Optional[dict]:
        """
        Get temporary session data.

        Args:
            phone_number: Phone number

        Returns:
            Session data or None if not found/expired
        """
        session_key = self._get_session_key(phone_number)
        logger.info(f"Looking for session with key: {session_key}")
        logger.debug(f"Active sessions: {list(self._temp_sessions.keys())}")

        session_data = self._temp_sessions.get(session_key)

        if not session_data:
            logger.warning(f"Session not found for {phone_number}")
            return None

        # Check if expired
        expires_at = session_data.get("expires_at")
        current_time = datetime.utcnow()
        logger.info(f"Session expires at: {expires_at}, current time: {current_time}")

        if expires_at and expires_at < current_time:
            logger.warning(f"Session expired for {phone_number}")
            await self.remove_temp_session(phone_number)
            return None

        logger.info(f"Found valid session for {phone_number}")
        return session_data

    async def remove_temp_session(self, phone_number: str) -> None:
        """
        Remove temporary session.

        Args:
            phone_number: Phone number
        """
        session_key = self._get_session_key(phone_number)
        if session_key in self._temp_sessions:
            session_data = self._temp_sessions[session_key]
            client = session_data.get("client")

            # Disconnect client if it exists
            if client:
                try:
                    if hasattr(client, "is_connected") and client.is_connected():
                        await client.disconnect()
                except Exception as e:
                    logger.warning(f"Error disconnecting temp session client: {e}")

            del self._temp_sessions[session_key]
            logger.debug(f"Removed temporary session for {phone_number}")

    async def cleanup(self) -> None:
        """Clean up all temporary sessions and stop cleanup task."""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

        # Disconnect all temporary clients
        for session_data in list(self._temp_sessions.values()):
            client = session_data.get("client")
            if client:
                try:
                    if hasattr(client, "is_connected") and client.is_connected():
                        await client.disconnect()
                except Exception as e:
                    logger.warning(f"Error disconnecting client during cleanup: {e}")

        self._temp_sessions.clear()
        logger.info("Session service cleaned up")

