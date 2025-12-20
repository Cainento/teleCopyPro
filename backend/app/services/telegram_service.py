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
)
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

    def __init__(self, db: Optional[AsyncSession] = None):
        """Initialize Telegram service.

        Args:
            db: Optional database session for session tracking
        """
        self._active_clients: dict[str, TelegramClient] = {}
        self._session_credentials: dict[str, dict[str, any]] = {}  # phone_number -> {api_id, api_hash}
        self._session_path = Path(settings.session_folder)
        self._session_path.mkdir(parents=True, exist_ok=True)
        self._db = db

    def set_db(self, db: AsyncSession):
        """Set database session for session tracking."""
        self._db = db

    def _get_session_repo(self) -> Optional[SessionRepository]:
        """Get SessionRepository if database is available."""
        if self._db:
            return SessionRepository(self._db)
        return None

    async def _is_session_expired(self, phone_number: str) -> bool:
        """
        Check if session is expired (>7 days of inactivity).

        Args:
            phone_number: Phone number to check

        Returns:
            True if session is expired or doesn't exist, False otherwise
        """
        session_repo = self._get_session_repo()
        if not session_repo:
            # If no database available, cannot check expiration
            return False

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

    async def _update_session_activity(self, phone_number: str, api_id: int, api_hash: str, user_id: Optional[int] = None):
        """
        Update session activity timestamp in database.

        Args:
            phone_number: Phone number
            api_id: API ID
            api_hash: API Hash
            user_id: User ID (optional, will be looked up if not provided)
        """
        session_repo = self._get_session_repo()
        if not session_repo:
            return

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
        api_hash: str
    ) -> TelegramClient:
        """
        Get existing client or create a new one.

        Args:
            phone_number: Phone number
            api_id: Telegram API ID
            api_hash: Telegram API Hash

        Returns:
            TelegramClient instance
        """
        session_name = self._get_session_name(phone_number, api_id, api_hash)
        logger.debug(f"[GET_OR_CREATE_CLIENT] Session name: {session_name}")

        # Check if session is expired (>7 days)
        is_expired = await self._is_session_expired(phone_number)
        if is_expired:
            logger.info(f"[GET_OR_CREATE_CLIENT] Session expired for {phone_number}, logging out")
            try:
                await self.logout(phone_number, api_id, api_hash)
            except Exception as e:
                logger.error(f"Error during auto-logout of expired session: {e}", exc_info=True)

        # Check if client is already active
        if session_name in self._active_clients and not is_expired:
            client = self._active_clients[session_name]
            logger.debug(f"[GET_OR_CREATE_CLIENT] Found active client, connected: {client.is_connected()}")
            if client.is_connected():
                return client
            logger.debug(f"[GET_OR_CREATE_CLIENT] Active client not connected, creating new one")

        # Create new client
        logger.debug(f"[GET_OR_CREATE_CLIENT] Creating new client for {phone_number}")
        client = await self.create_client(api_id, api_hash, phone_number=phone_number)
        await client.connect()
        logger.debug(f"[GET_OR_CREATE_CLIENT] Client connected: {client.is_connected()}")

        # Store active client
        self._active_clients[session_name] = client

        return client

    async def send_verification_code(
        self,
        phone_number: str,
        api_id: int,
        api_hash: str
    ) -> tuple[TelegramClient, str]:
        """
        Send verification code to phone number.

        Args:
            phone_number: Phone number
            api_id: Telegram API ID
            api_hash: Telegram API Hash

        Returns:
            Tuple of (client, phone_code_hash)

        Raises:
            TelegramAPIError: If API credentials are invalid
            RateLimitError: If rate limited
            ValidationError: If phone number is invalid
        """
        try:
            # Create client with file-based session directly to avoid migration issues
            # This ensures the session is properly saved and authorized from the start
            client = await self.create_client(
                api_id,
                api_hash,
                phone_number=phone_number
            )
            await client.connect()

            # Check if already authorized
            if await client.is_user_authorized():
                logger.info(f"User {phone_number} already authorized - auto-logout to allow re-authentication")
                # Auto-logout: disconnect client and delete session file
                # This ensures user can re-authenticate even if they have an existing session
                try:
                    await self.logout(phone_number, api_id, api_hash)
                    logger.info(f"Successfully logged out {phone_number}, recreating client for new authentication")

                    # Recreate client for fresh authentication
                    client = await self.create_client(
                        api_id,
                        api_hash,
                        phone_number=phone_number
                    )
                    await client.connect()
                except Exception as logout_error:
                    logger.error(f"Error during auto-logout for {phone_number}: {logout_error}", exc_info=True)
                    # Continue anyway - the session file might not exist
                    pass

            # Send verification code
            result = await client.send_code_request(phone_number)
            phone_code_hash = result.phone_code_hash

            logger.info(f"Verification code sent to {phone_number}")
            return client, phone_code_hash

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
        api_id: Optional[int] = None,
        api_hash: Optional[str] = None
    ) -> TelegramSession:
        """
        Check if a session exists and is authorized.

        Args:
            phone_number: Phone number
            api_id: Telegram API ID (optional, will try to get from stored credentials)
            api_hash: Telegram API Hash (optional, will try to get from stored credentials)

        Returns:
            TelegramSession with status information
        """
        # First, ensure we have API credentials before generating session name
        # Try to get credentials from stored session if not provided
        if api_id is None or api_hash is None:
            stored_creds = self.get_session_credentials(phone_number, api_id, api_hash)
            logger.debug(f"[CHECK_SESSION] Stored credentials: {stored_creds is not None}")
            if stored_creds:
                api_id = api_id or stored_creds.get("api_id")
                api_hash = api_hash or stored_creds.get("api_hash")

        # Fallback to settings if still not available
        if api_id is None or api_hash is None:
            from app.config import settings
            logger.debug(f"[CHECK_SESSION] Falling back to settings API credentials")
            api_id = api_id or settings.api_id
            api_hash = api_hash or settings.api_hash

        # Now generate session name with the resolved API credentials
        session_name = self._get_session_name(phone_number, api_id, api_hash)
        session_path = self._get_session_path(session_name)

        logger.debug(f"[CHECK_SESSION] Phone: {phone_number}, API ID: {api_id}, Session name: {session_name}, Session path: {session_path}")

        logger.debug(f"[CHECK_SESSION] Session path exists: {session_path.exists()}")
        if not session_path.exists():
            logger.warning(f"[CHECK_SESSION] Session file not found at {session_path}")
            return TelegramSession(
                session_name=session_name,
                phone_number=phone_number,
                api_id=api_id,
                api_hash=api_hash,
                status=SessionStatus.DISCONNECTED,
                is_authorized=False
            )

        try:
            logger.debug(f"[CHECK_SESSION] Getting or creating client for {phone_number}")
            client = await self.get_or_create_client(phone_number, api_id, api_hash)
            logger.debug(f"[CHECK_SESSION] Client connected: {client.is_connected()}")
            is_authorized = await client.is_user_authorized()
            logger.debug(f"[CHECK_SESSION] Is authorized: {is_authorized}")

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
            if session_name in self._active_clients:
                client = self._active_clients[session_name]
                if client.is_connected():
                    await client.disconnect()
                del self._active_clients[session_name]
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

    async def logout(self, phone_number: str, api_id: Optional[int] = None, api_hash: Optional[str] = None) -> None:
        """
        Logout user by disconnecting Telegram client and deleting session file.

        Args:
            phone_number: Phone number
            api_id: Telegram API ID (optional, will try to get from stored credentials)
            api_hash: Telegram API Hash (optional, will try to get from stored credentials)

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

            # Fallback to settings if still not available
            if api_id is None or api_hash is None:
                from app.config import settings
                api_id = api_id or settings.api_id
                api_hash = api_hash or settings.api_hash

            session_name = self._get_session_name(phone_number, api_id, api_hash)
            session_path = self._get_session_path(session_name)

            # Disconnect active client if exists
            if session_name in self._active_clients:
                client = self._active_clients[session_name]
                if client.is_connected():
                    await client.disconnect()
                    logger.info(f"Disconnected Telegram client for {phone_number}")
                del self._active_clients[session_name]

            # Remove from session credentials
            if session_name in self._session_credentials:
                del self._session_credentials[session_name]

            # Delete session file
            if session_path.exists():
                session_path.unlink()
                logger.info(f"Deleted session file: {session_path}")
            else:
                logger.warning(f"Session file not found: {session_path}")

            # Deactivate session in database
            session_repo = self._get_session_repo()
            if session_repo:
                try:
                    db_session = await session_repo.get_by_phone(phone_number)
                    if db_session:
                        await session_repo.delete(db_session)
                        logger.info(f"Deleted session from database for {phone_number}")
                except Exception as db_error:
                    logger.error(f"Error deleting session from database: {db_error}", exc_info=True)
                    # Don't fail logout if database operation fails

            logger.info(f"Logout successful for {phone_number}")

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

        logger.info("All Telegram clients cleaned up")

