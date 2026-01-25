"""Telegram service for managing Telegram clients and authentication."""

import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from telethon import TelegramClient
from telethon.errors import (
    ApiIdInvalidError,
    FloodWaitError,
    PhoneCodeInvalidError,
    PhoneNumberInvalidError,
    SessionPasswordNeededError,
    AuthKeyUnregisteredError,
)
from app.database.connection import AsyncSessionLocal
from telethon.sessions import StringSession

from app.config import settings
from app.core.exceptions import (
    AuthenticationError,
    ConfigurationError,
    RateLimitError,
    SessionError,
    TelegramAPIError,
)
from app.core.logger import get_logger
from app.database.repositories.session_repository import SessionRepository
from app.models.session import SessionStatus, TelegramSession

logger = get_logger(__name__)

# Session expiration: 7 days
SESSION_EXPIRATION_DAYS = 7


class TelegramService:
    """Service for managing Telegram client connections and authentication."""

    def __init__(self):
        """Initialize Telegram service.
        """
        self._active_clients: dict[str, TelegramClient] = {}
        self._locks: dict[str, asyncio.Lock] = {} # session_name -> asyncio.Lock
        self._real_time_handlers: dict[str, dict] = {}  # job_id -> {handler, phone_number}
        self._session_credentials: dict[str, dict[str, any]] = {}  # phone_number -> {api_id, api_hash}
        self._monitor_task: Optional[asyncio.Task] = None
        self._session_path = Path(settings.session_folder)
        self._session_path.mkdir(parents=True, exist_ok=True)

    def _get_session_repo(self, db: AsyncSession) -> SessionRepository:
        """Get SessionRepository with provided database session."""
        return SessionRepository(db)

    def _get_lock(self, session_name: str) -> asyncio.Lock:
        """Get or create an asyncio.Lock for a specific session."""
        if session_name not in self._locks:
            self._locks[session_name] = asyncio.Lock()
        return self._locks[session_name]

    async def _is_session_expired(self, phone_number: str, db: AsyncSession) -> bool:
        """
        Check if session is expired (>7 days of inactivity).

        Args:
            phone_number: Phone number to check
            db: Database session

        Returns:
            True if session is expired or doesn't exist, False otherwise
        """
        session_repo = self._get_session_repo(db)
        try:
            db_session = await session_repo.get_by_phone(phone_number)
            if not db_session:
                return True  # No session in database

            # Check if session is older than 7 days
            expiration_time = db_session.last_used_at + timedelta(days=SESSION_EXPIRATION_DAYS)
            is_expired = datetime.utcnow() > expiration_time

            if is_expired:
                logger.info(f"Session expired for {phone_number}, last used: {db_session.last_used_at}")

            return is_expired
        except Exception as e:
            logger.error(f"Error checking session expiration: {e}", exc_info=True)
            return False  # Don't block on errors

    async def _update_session_activity(self, phone_number: str, api_id: int, api_hash: str, db: AsyncSession, user_id: Optional[int] = None):
        """
        Update session activity timestamp in database.

        Args:
            phone_number: Phone number
            api_id: API ID
            api_hash: API Hash
            db: Database session
            user_id: User ID (optional, will be looked up if not provided)
        """
        session_repo = self._get_session_repo(db)

        try:
            db_session = await session_repo.get_by_phone(phone_number)

            if db_session:
                # Update existing session
                await session_repo.update_last_used(db_session)
                logger.debug(f"Updated session activity for {phone_number}")
            elif user_id:
                # Create new session record
                session_name = self._get_session_name(phone_number, api_id, api_hash)
                session_path = self._get_session_path(session_name)
                await session_repo.create(
                    user_id=user_id,
                    phone_number=phone_number,
                    session_file_path=str(session_path),
                    api_id=str(api_id),
                    api_hash=api_hash
                )
                logger.info(f"Created session record in database for {phone_number}")
        except Exception as e:
            logger.error(f"Error updating session activity: {e}", exc_info=True)
            # Try to rollback to prevent request poisoning
            try:
                await db.rollback()
            except:
                pass

    def _get_session_name(self, phone_number: str, api_id: Optional[int] = None, api_hash: Optional[str] = None) -> str:
        """
        Generate session name from phone number and optionally API credentials.

        If API credentials are provided, creates a unique session name that includes
        a hash of the credentials. This allows multiple sessions per phone number
        when using different Telegram apps (different API credentials).

        Args:
            phone_number: Phone number
            api_id: Optional API ID to include in session name
            api_hash: Optional API Hash to include in session name

        Returns:
            Sanitized session name, optionally with API credentials hash
        """
        base_name = phone_number.replace("+", "").replace(" ", "").replace("-", "")

        # If API credentials provided, include their hash in the session name
        if api_id is not None and api_hash is not None:
            import hashlib
            # Create a short hash of api_id + api_hash
            cred_string = f"{api_id}:{api_hash}"
            cred_hash = hashlib.md5(cred_string.encode()).hexdigest()[:8]
            return f"{base_name}_{cred_hash}"

        return base_name

    def _get_session_path(self, session_name: str) -> Path:
        """
        Get session file path.

        Args:
            session_name: Session identifier

        Returns:
            Path to session file
        """
        return self._session_path / f"{session_name}.session"

    async def create_client(
        self,
        api_id: int,
        api_hash: str,
        phone_number: Optional[str] = None,
        session_name: Optional[str] = None,
        use_string_session: bool = False
    ) -> TelegramClient:
        """
        Create a Telegram client instance.

        Args:
            api_id: Telegram API ID
            api_hash: Telegram API Hash
            phone_number: Phone number (for session naming)
            session_name: Custom session name
            use_string_session: Whether to use StringSession (for temporary auth)

        Returns:
            TelegramClient instance
        """
        if use_string_session:
            session = StringSession()
            logger.info(f"[CREATE_CLIENT] Using StringSession")
        else:
            if not session_name and phone_number:
                session_name = self._get_session_name(phone_number, api_id, api_hash)
            elif not session_name:
                raise ValueError("Either phone_number or session_name must be provided")

            session_path = self._get_session_path(session_name)
            # TelegramClient adds .session extension automatically, so remove it
            session = str(session_path).replace('.session', '')
            logger.debug(f"[CREATE_CLIENT] Session path: {session_path}, Cleaned session: {session}")

        client = TelegramClient(session, api_id, api_hash)
        logger.debug(f"[CREATE_CLIENT] Created client with session: {session}")
        return client

    async def get_or_create_client(
        self,
        phone_number: str,
        api_id: int,
        api_hash: str,
        db: AsyncSession,
        session_file_path: Optional[str] = None
    ) -> TelegramClient:
        """
        Get existing client or create a new one.

        Args:
            phone_number: Phone number
            api_id: Telegram API ID
            api_hash: Telegram API Hash
            db: Database session
            session_file_path: Optional specific session file path to use

        Returns:
            TelegramClient instance
        """
        if session_file_path:
            # Extract session name from path (filename without extension)
            path_obj = Path(session_file_path)
            session_name = path_obj.stem
        else:
            # Try to look up unique session path from database first
            session_repo = self._get_session_repo(db)
            try:
                db_session = await session_repo.get_by_phone(phone_number)
                if db_session and db_session.session_file_path:
                    # Use the stored session path (which might be a unique timestamped one)
                    path_obj = Path(db_session.session_file_path)
                    session_name = path_obj.stem
                    logger.debug(f"[GET_OR_CREATE_CLIENT] Found stored session path for {phone_number}: {session_name}")
                else:
                    session_name = self._get_session_name(phone_number, api_id, api_hash)
            except Exception as e:
                logger.warning(f"[GET_OR_CREATE_CLIENT] Error looking up session in DB: {e}")
                session_name = self._get_session_name(phone_number, api_id, api_hash)
        
        async with self._get_lock(session_name):
            logger.debug(f"[GET_OR_CREATE_CLIENT] Session name: {session_name} (Lock acquired)")

            # Check if session is expired (>7 days)
            # Skip check if we are loading a specific session file (e.g. from temp auth session)
            is_expired = False
            if not session_file_path:
                is_expired = await self._is_session_expired(phone_number, db)
            
            if is_expired:
                logger.info(f"[GET_OR_CREATE_CLIENT] Session expired for {phone_number}, logging out")
                try:
                    if session_name in self._active_clients:
                        client = self._active_clients.pop(session_name)
                        if client.is_connected():
                            await client.disconnect()
                    
                    session_path = self._get_session_path(session_name)
                    if session_path.exists():
                        session_path.unlink()
                except Exception as e:
                    logger.error(f"Error during auto-logout of expired session: {e}", exc_info=True)

            # Check if client is already active
            if session_name in self._active_clients and not is_expired:
                client = self._active_clients[session_name]
                logger.debug(f"[GET_OR_CREATE_CLIENT] Found active client object, connected: {client.is_connected()}")
                if client.is_connected():
                    return client
                
                # If disconnected, try to reconnect the existing client object instead of creating a new one
                try:
                    logger.info(f"[GET_OR_CREATE_CLIENT] Reconnecting existing client for {phone_number}")
                    await client.connect()
                    return client
                except Exception as e:
                    logger.warning(f"[GET_OR_CREATE_CLIENT] Failed to reconnect existing client: {e}, creating new one")

            # Create new client
            # Create new client
            logger.debug(f"[GET_OR_CREATE_CLIENT] Creating new client for {phone_number} with session: {session_name}")
            client = await self.create_client(
                api_id, 
                api_hash, 
                phone_number=phone_number,
                session_name=session_name
            )
            await client.connect()
            logger.debug(f"[GET_OR_CREATE_CLIENT] Client connected: {client.is_connected()}")

            # Store active client
            self._active_clients[session_name] = client

            return client

    async def send_verification_code(
        self,
        phone_number: str,
        api_id: int,
        api_hash: str,
        db: AsyncSession
    ) -> tuple[str, str]:
        """
        Send verification code to phone number.

        Args:
            phone_number: Phone number
            api_id: Telegram API ID
            api_hash: Telegram API Hash
            db: Database session

        Returns:
            Tuple of (phone_code_hash, session_file_path)

        Raises:
            TelegramAPIError: If API credentials are invalid
            RateLimitError: If rate limited
            ValidationError: If phone number is invalid
        """
        try:
            # Generate session name to check for existing active clients
            session_name = self._get_session_name(phone_number, api_id, api_hash)
            
            # 1. First, ensure any existing active client for this session is disconnected
            # We do this to ensure we don't have a conflict in memory
            if session_name in self._active_clients:
                logger.info(f"Discarding existing active client for {phone_number} to avoid locks")
                old_client = self._active_clients.pop(session_name)
                try:
                    if old_client.is_connected():
                        await old_client.disconnect()
                except Exception as e:
                    logger.warning(f"Error disconnecting old client: {e}")

            # 2. Check if the default session file exists and is authorized/locked
            # We strictly want to avoid reusing the old session file for a NEW login attempt
            # to prevent "attempt to write a readonly database" or "locked" errors.
            # So, we will optimisticly try to create a client.
            
            import sqlite3
            import time
            
            use_unique_session = False
            
            # Create a temporary client just to check the state or start fresh
            try:
                # Try to connect with standard name first
                client = await self.create_client(
                    api_id,
                    api_hash,
                    phone_number=phone_number
                )
                await client.connect()
                
                # Check if authorized. If authorized, it means there is an old session lingering.
                # In previous versions, we auto-logged out. NOW, we will just ignore it and use a new session.
                if await client.is_user_authorized():
                    logger.info(f"User {phone_number} already authorized in existing session - Creating NEW session for re-authentication")
                    use_unique_session = True
                    await client.disconnect()
                    
            except sqlite3.OperationalError as e:
                # If locked or readonly, definitely use a new session
                logger.warning(f"Session file locked/error (sqlite3): {e} - Will use unique session")
                use_unique_session = True
            except Exception as e:
                logger.warning(f"Error checking existing session: {e} - Will use unique session")
                use_unique_session = True

            # 3. Create the actual client for sending the code
            if use_unique_session:
                timestamp = int(time.time())
                unique_session_name = f"{self._get_session_name(phone_number, api_id, api_hash)}_{timestamp}"
                logger.info(f"Using unique session name for new login: {unique_session_name}")
                
                client = await self.create_client(
                    api_id,
                    api_hash,
                    session_name=unique_session_name
                )
                await client.connect()
            else:
                # If we didn't flag for unique session, means we connected successfully above and not authorized?
                # Actually, if we are here, we might need to reconnect if we disconnected above.
                # Simpler: just ensure we have a connected client.
                # If 'client' variable exists from block above and is connected, use it? 
                # Better to be safe: create client again if needed.
                if 'client' not in locals() or not client.is_connected():
                     client = await self.create_client(
                        api_id,
                        api_hash,
                        phone_number=phone_number
                    )
                     await client.connect()

            # Send verification code
            result = await client.send_code_request(phone_number)
            phone_code_hash = result.phone_code_hash
            
            # Capture session filename before disconnecting
            session_filename = client.session.filename
            
            # Disconnect client to prevent file locks
            if client.is_connected():
                await client.disconnect()
                logger.info(f"Disconnected client after sending code to {phone_number}")

            logger.info(f"Verification code sent to {phone_number}")
            return phone_code_hash, session_filename

        except PhoneNumberInvalidError as e:
            logger.error(f"Invalid phone number: {phone_number}")
            raise TelegramAPIError("Número de telefone inválido.") from e
        except ApiIdInvalidError as e:
            logger.error(f"Invalid API credentials")
            raise ConfigurationError("API ID ou API Hash inválidos.") from e
        except FloodWaitError as e:
            logger.warning(f"Rate limited for {e.seconds} seconds")
            raise RateLimitError(
                f"Muitas tentativas. Tente novamente em {e.seconds} segundos.",
                retry_after=e.seconds
            ) from e
        except Exception as e:
            logger.error(f"Error sending verification code: {e}", exc_info=True)
            raise TelegramAPIError(f"Erro ao enviar código de verificação: {str(e)}") from e

    async def verify_code(
        self,
        client: TelegramClient,
        phone_number: str,
        phone_code: str,
        phone_code_hash: str
    ) -> dict:
        """
        Verify phone code and complete authentication.

        Args:
            client: TelegramClient instance
            phone_number: Phone number
            phone_code: Verification code
            phone_code_hash: Phone code hash from send_verification_code

        Returns:
            Dictionary with user information

        Raises:
            AuthenticationError: If code is invalid or 2FA is required
        """
        try:
            # Sign in with code
            user = await client.sign_in(phone_number, phone_code, phone_code_hash=phone_code_hash)

            # Get session name and store active client
            session_name = self._get_session_name(phone_number, client.api_id, client.api_hash)

            # Store active client
            self._active_clients[session_name] = client

            # Store API credentials for this session
            self._session_credentials[session_name] = {
                "api_id": client.api_id,
                "api_hash": client.api_hash
            }

            is_authorized = await client.is_user_authorized()
            logger.info(f"User {phone_number} authenticated successfully, authorized: {is_authorized}")

            return {
                "user_id": user.id,
                "username": getattr(user, "username", None),
                "first_name": getattr(user, "first_name", None),
                "last_name": getattr(user, "last_name", None),
            }

        except PhoneCodeInvalidError as e:
            logger.error(f"Invalid verification code for {phone_number}")
            raise AuthenticationError("Código de verificação inválido.") from e
        except SessionPasswordNeededError as e:
            logger.info(f"2FA required for {phone_number}")
            raise AuthenticationError(
                "Senha de verificação em duas etapas necessária.",
                details={"requires_2fa": True}
            ) from e
        except Exception as e:
            logger.error(f"Error verifying code: {e}", exc_info=True)
            raise AuthenticationError(f"Erro ao verificar código: {str(e)}") from e

    async def verify_2fa_password(
        self,
        client: TelegramClient,
        password: str,
        phone_number: Optional[str] = None
    ) -> dict:
        """
        Verify 2FA password.

        Args:
            client: TelegramClient instance (must be in 2FA state)
            password: 2FA password

        Returns:
            Dictionary with user information

        Raises:
            AuthenticationError: If password is invalid
        """
        try:
            user = await client.sign_in(password=password)

            # Now the client is fully authenticated
            if phone_number:
                session_name = self._get_session_name(phone_number, client.api_id, client.api_hash)

                # Store active client
                self._active_clients[session_name] = client

                # Store API credentials for this session
                self._session_credentials[session_name] = {
                    "api_id": client.api_id,
                    "api_hash": client.api_hash
                }

                is_authorized = await client.is_user_authorized()
                logger.info(f"2FA authentication successful for {phone_number}, authorized: {is_authorized}")

            return {
                "user_id": user.id,
                "username": getattr(user, "username", None),
                "first_name": getattr(user, "first_name", None),
                "last_name": getattr(user, "last_name", None),
            }

        except Exception as e:
            logger.error(f"Error verifying 2FA password: {e}", exc_info=True)
            raise AuthenticationError("Senha de duas etapas inválida.") from e

    def get_session_credentials(self, phone_number: str, api_id: Optional[int] = None, api_hash: Optional[str] = None) -> Optional[dict]:
        """
        Get stored API credentials for a phone number.

        Args:
            phone_number: Phone number
            api_id: Optional API ID for session lookup
            api_hash: Optional API Hash for session lookup

        Returns:
            Dict with api_id and api_hash, or None if not found
        """
        session_name = self._get_session_name(phone_number, api_id, api_hash)
        return self._session_credentials.get(session_name)
    
    async def check_session_status(
        self,
        phone_number: str,
        db: AsyncSession,
        api_id: Optional[int] = None,
        api_hash: Optional[str] = None
    ) -> TelegramSession:
        """
        Check if a session exists and is authorized.

        Args:
            phone_number: Phone number
            db: Database session
            api_id: Telegram API ID (optional)
            api_hash: Telegram API Hash (optional)

        Returns:
            TelegramSession with status information
        """
        # First, ensure we have API credentials before generating session name
        if api_id is None or api_hash is None:
            stored_creds = self.get_session_credentials(phone_number, api_id, api_hash)
            if stored_creds:
                api_id = api_id or stored_creds.get("api_id")
                api_hash = api_hash or stored_creds.get("api_hash")

        # Try to get credentials from database if still not available
        if api_id is None or api_hash is None:
            session_repo = self._get_session_repo(db)
            try:
                db_session = await session_repo.get_by_phone(phone_number)
                if db_session and db_session.api_id and db_session.api_hash:
                    api_id = api_id or int(db_session.api_id)
                    api_hash = api_hash or db_session.api_hash
            except Exception as e:
                logger.error(f"[CHECK_SESSION] Error getting credentials from database: {e}", exc_info=True)

        # Fallback to settings
        if api_id is None or api_hash is None:
            from app.config import settings
            api_id = api_id or settings.api_id
            api_hash = api_hash or settings.api_hash

        session_name = self._get_session_name(phone_number, api_id, api_hash)
        session_path = self._get_session_path(session_name)

        if not session_path.exists():
            return TelegramSession(
                session_name=session_name,
                phone_number=phone_number,
                api_id=api_id,
                api_hash=api_hash,
                status=SessionStatus.DISCONNECTED,
                is_authorized=False
            )

        try:
            client = await self.get_or_create_client(phone_number, api_id, api_hash, db)
            is_authorized = await client.is_user_authorized()

            if is_authorized:
                me = await client.get_me()
                return TelegramSession(
                    session_name=session_name,
                    phone_number=phone_number,
                    api_id=api_id,
                    api_hash=api_hash,
                    status=SessionStatus.CONNECTED,
                    user_id=me.id,
                    is_authorized=True
                )
            else:
                return TelegramSession(
                    session_name=session_name,
                    phone_number=phone_number,
                    api_id=api_id,
                    api_hash=api_hash,
                    status=SessionStatus.DISCONNECTED,
                    is_authorized=False
                )

        except Exception as e:
            logger.error(f"Error checking session status: {e}", exc_info=True)
            return TelegramSession(
                session_name=session_name,
                phone_number=phone_number,
                api_id=api_id,
                api_hash=api_hash,
                status=SessionStatus.DISCONNECTED,
                is_authorized=False
            )

    async def disconnect_client(self, phone_number: str, api_id: Optional[int] = None, api_hash: Optional[str] = None) -> None:
        """
        Disconnect and remove a client.

        Args:
            phone_number: Phone number
            api_id: Optional API ID - if not provided, disconnects all sessions for this phone
            api_hash: Optional API Hash - if not provided, disconnects all sessions for this phone
        """
        if api_id and api_hash:
            # Disconnect specific session
            session_name = self._get_session_name(phone_number, api_id, api_hash)
            async with self._get_lock(session_name):
                if session_name in self._active_clients:
                    client = self._active_clients.pop(session_name)
                    if client.is_connected():
                        await client.disconnect()
                    logger.info(f"Disconnected client for {phone_number} with API ID {api_id}")
        else:
            # Disconnect all sessions for this phone number
            base_name = phone_number.replace("+", "").replace(" ", "").replace("-", "")
            sessions_to_remove = [name for name in self._active_clients.keys() if name.startswith(base_name)]
            for session_name in sessions_to_remove:
                client = self._active_clients[session_name]
                if client.is_connected():
                    await client.disconnect()
                del self._active_clients[session_name]
                logger.info(f"Disconnected client session {session_name}")

    async def logout(self, phone_number: str, db: AsyncSession, api_id: Optional[int] = None, api_hash: Optional[str] = None) -> bool:
        """
        Logout user by disconnecting Telegram client and deleting session file.

        Args:
            phone_number: Phone number
            db: Database session
            api_id: Telegram API ID (optional)
            api_hash: Telegram API Hash (optional)

        Returns:
            bool: True if session file was deleted or didn't exist, False if file remains (locked)

        Raises:
            SessionError: If session doesn't exist
        """
        try:
            # Try to get credentials from stored session if not provided
            if api_id is None or api_hash is None:
                stored_creds = self.get_session_credentials(phone_number, api_id, api_hash)
                if stored_creds:
                    api_id = api_id or stored_creds.get("api_id")
                    api_hash = api_hash or stored_creds.get("api_hash")

            # Fallback to settings
            if api_id is None or api_hash is None:
                from app.config import settings
                api_id = api_id or settings.api_id
                api_hash = api_hash or settings.api_hash

            session_name = self._get_session_name(phone_number, api_id, api_hash)
            session_path = self._get_session_path(session_name)

            async with self._get_lock(session_name):
                logger.info(f"Performing logout for {phone_number} (Lock acquired)")
                
                # Disconnect active client if exists
                if session_name in self._active_clients:
                    client = self._active_clients.pop(session_name)
                    try:
                        if client.is_connected():
                            await client.disconnect()
                            logger.info(f"Disconnected Telegram client for {phone_number}")
                    except Exception as disconnect_error:
                        logger.warning(f"Error disconnecting client {phone_number} during logout: {disconnect_error}")

            # Remove from session credentials
            if session_name in self._session_credentials:
                del self._session_credentials[session_name]

            # Delete session file
            # Delete session file with retry logic for Windows
            file_deleted = True
            if session_path.exists():
                max_retries = 5
                retry_delay = 0.5
                
                for attempt in range(max_retries):
                    try:
                        session_path.unlink()
                        logger.info(f"Deleted session file: {session_path}")
                        file_deleted = True
                        break
                    except PermissionError:
                        file_deleted = False
                        if attempt < max_retries - 1:
                            logger.warning(f"File locked, retrying deletion in {retry_delay}s: {session_path}")
                            await asyncio.sleep(retry_delay)
                            retry_delay *= 2  # Exponential backoff
                        else:
                            logger.error(f"Failed to delete session file after {max_retries} attempts: {session_path}")
                    except Exception as e:
                        logger.warning(f"Error deleting session file: {e}")
                        file_deleted = False
                        break
            else:
                logger.warning(f"Session file not found: {session_path}")
                file_deleted = True

            if not file_deleted:
                # If file deletion fails, we log a warning but PROCEED to delete from DB.
                # This ensures the user is logged out of the app.
                # The locked file will be ignored by future logins (handled by unique session logic).
                logger.warning(f"Session file locked for {phone_number}, proceeding with DB deletion anyway.")
                
            # Deactivate session in database
            session_repo = self._get_session_repo(db)
            try:
                db_session = await session_repo.get_by_phone(phone_number)
                if db_session:
                    await session_repo.delete(db_session)
                    logger.info(f"Deleted session from database for {phone_number}")
            except Exception as db_error:
                logger.error(f"Error deleting session from database: {db_error}", exc_info=True)
                # Rollback to prevent poisoning the rest of the request
                try:
                    await db.rollback()
                except:
                    pass

            logger.info(f"Logout successful for {phone_number}")
            return file_deleted

        except SessionError:
            raise
        except Exception as e:
            logger.error(f"Error during logout for {phone_number}: {e}", exc_info=True)
            raise SessionError(f"Erro ao fazer logout: {str(e)}")

    async def cleanup(self) -> None:
        """Disconnect all active clients."""
        for session_name, client in list(self._active_clients.items()):
            try:
                if client.is_connected():
                    await client.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting client {session_name}: {e}")
            finally:
                del self._active_clients[session_name]

        # Stop monitor task
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass


    async def start_session_monitor(self, interval_seconds: int = 60) -> None:
        """
        Start background task to monitor active sessions for validity.
        
        Args:
            interval_seconds: How often to check sessions
        """
        if self._monitor_task and not self._monitor_task.done():
            logger.info("Session monitor already running")
            return
            
        logger.info(f"Starting session monitor (interval: {interval_seconds}s)")
        
        async def monitor_loop():
            while True:
                try:
                    await asyncio.sleep(interval_seconds)
                    await self._check_active_sessions()
                except asyncio.CancelledError:
                    logger.info("Session monitor cancelled")
                    break
                except Exception as e:
                    logger.error(f"Error in session monitor loop: {e}", exc_info=True)
                    await asyncio.sleep(interval_seconds)  # Wait before retrying
                    
        self._monitor_task = asyncio.create_task(monitor_loop())
        
    async def _check_active_sessions(self) -> None:
        """Check all active clients to ensure they are still authorized."""
        # Create a copy of items to avoid modification during iteration
        active_sessions = list(self._active_clients.items())
        
        if not active_sessions:
            return
            
        logger.debug(f"Monitor checking {len(active_sessions)} active sessions...")
        
        for session_name, client in active_sessions:
            try:
                if not client.is_connected():
                    continue
                    
                # We can check authorization status
                # If this raises AuthKeyUnregisteredError, the session is dead
                try:
                    is_auth = await client.is_user_authorized()
                    if not is_auth:
                        logger.warning(f"Session {session_name} is no longer authorized. creating cleanup task.")
                        # Parse phone number from session name (simplified)
                        # We might need a reverse map or just store it better, but for now:
                        # session_name starts with phone number digits.
                        # Ideally we find the phone number from the client or our map.
                        
                        # Find phone number from session_name
                        phone_number = None
                        # Try to match with session credentials cache
                        for p_num, creds in self._session_credentials.items():
                             # This logic is a bit weak if we don't have a direct map
                             pass
                        
                        # Better approach: Iterate active clients map and disconnect
                        # We will trigger handle_session_revoked
                        pass 

                except AuthKeyUnregisteredError:
                    logger.warning(f"Session {session_name} revoked (AuthKeyUnregisteredError). Cleaning up.")
                    await self._handle_revoked_session_by_name(session_name)
                    
            except Exception as e:
                # Don't let one failure stop the whole loop
                logger.debug(f"Error checking session {session_name}: {e}")

    async def _handle_revoked_session_by_name(self, session_name: str) -> None:
        """Handle cleanup for a specific revoked session name."""
        try:
            # 1. Disconnect client
            if session_name in self._active_clients:
                client = self._active_clients.pop(session_name)
                try:
                    await client.disconnect()
                except:
                    pass
            
            # 2. Delete session file
            session_path = self._get_session_path(session_name)
            if session_path.exists():
                try:
                    session_path.unlink()
                    logger.info(f"Deleted revoked session file: {session_path}")
                except Exception as e:
                    logger.error(f"Failed to delete revoked session file: {e}")

            # 3. Clean up database
            # We need to find the phone number associated effectively.
            # Since we don't have a direct map from session_name -> phone here easily without parsing,
            # we can try to guess or just leave the DB in a 'broken' state until next login fixes it,
            # BUT it's better to clean it up.
            
            # Heuristic: verify against all sessions in DB
            async with AsyncSessionLocal() as db:
                session_repo = self._get_session_repo(db)
                # This is expensive but safe for now: get all sessions and check paths
                # Or we can just rely on the fact that next login will fix it.
                # Let's try to extract phone number from session name if standard format
                # Format: {phone}_{hash} or {phone}
                parts = session_name.split('_')
                if parts[0].isdigit():
                     # Likely phone number without +
                     # We can try to query DB for this phone
                     # Since we strip +, we might need to query loosely or store map.
                     pass
                
        except Exception as e:
            logger.error(f"Error handling revoked session {session_name}: {e}")

    async def handle_session_revoked(self, phone_number: str) -> None:
        """
        Public method to handle a revoked session when detected from outside (e.g. CopyService).
        
        Args:
           phone_number: Phone number
        """
        logger.warning(f"Handling revoked session for {phone_number}")
        async with AsyncSessionLocal() as db:
             await self.logout(phone_number, db)

        logger.info("All Telegram clients cleaned up")


    def add_real_time_handler(self, job_id: str, phone_number: str, handler: callable) -> None:
        """
        Store real-time handler reference.

        Args:
            job_id: Job identifier
            phone_number: Phone number of the client
            handler: Event handler function
        """
        self._real_time_handlers[job_id] = {
            "handler": handler,
            "phone_number": phone_number
        }
        logger.debug(f"Stored real-time handler for job {job_id}")

    async def remove_real_time_handler(self, job_id: str) -> None:
        """
        Remove real-time handler from client and storage.

        Args:
            job_id: Job identifier
        """
        if job_id in self._real_time_handlers:
            data = self._real_time_handlers[job_id]
            handler = data["handler"]
            phone_number = data["phone_number"]

            # Try to find active client and remove handler
            # We don't have API credentials here, so we try to find by phone number prefix
            base_name = phone_number.replace("+", "").replace(" ", "").replace("-", "")
            
            # Find the correct client session
            client = None
            for session_name, active_client in self._active_clients.items():
                if session_name.startswith(base_name):
                    client = active_client
                    break
            
            if client:
                try:
                    client.remove_event_handler(handler)
                    logger.info(f"Removed event handler for job {job_id} from client")
                except Exception as e:
                    logger.warning(f"Could not remove event handler from client: {e}")
            else:
                logger.warning(f"Active client not found for {phone_number} when removing handler for {job_id}")

            del self._real_time_handlers[job_id]
            logger.debug(f"Removed real-time handler for job {job_id} from storage")

