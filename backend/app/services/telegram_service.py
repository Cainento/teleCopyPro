"""Telegram service for managing Telegram clients and authentication."""

import asyncio
from pathlib import Path
from typing import Optional

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
from app.models.session import SessionStatus, TelegramSession

logger = get_logger(__name__)


class TelegramService:
    """Service for managing Telegram client connections and authentication."""

    def __init__(self):
        """Initialize Telegram service."""
        self._active_clients: dict[str, TelegramClient] = {}
        self._session_credentials: dict[str, dict[str, any]] = {}  # phone_number -> {api_id, api_hash}
        self._session_path = Path(settings.session_folder)
        self._session_path.mkdir(parents=True, exist_ok=True)

    def _get_session_name(self, phone_number: str) -> str:
        """
        Generate session name from phone number.

        Args:
            phone_number: Phone number

        Returns:
            Sanitized session name
        """
        return phone_number.replace("+", "").replace(" ", "").replace("-", "")

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
        else:
            if not session_name and phone_number:
                session_name = self._get_session_name(phone_number)
            elif not session_name:
                raise ValueError("Either phone_number or session_name must be provided")

            session_path = self._get_session_path(session_name)
            session = str(session_path)

        client = TelegramClient(session, api_id, api_hash)
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
        session_name = self._get_session_name(phone_number)

        # Check if client is already active
        if session_name in self._active_clients:
            client = self._active_clients[session_name]
            if client.is_connected():
                return client

        # Create new client
        client = await self.create_client(api_id, api_hash, phone_number=phone_number)
        await client.connect()

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
            # Create temporary client with StringSession
            client = await self.create_client(
                api_id,
                api_hash,
                use_string_session=True
            )
            await client.connect()

            # Check if already authorized
            if await client.is_user_authorized():
                logger.info(f"User {phone_number} already authorized")
                raise AuthenticationError("Usuário já autorizado. Faça logout primeiro.")

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

            # Save session to file
            session_name = self._get_session_name(phone_number)
            session_path = self._get_session_path(session_name)

            # If using StringSession, we need to migrate to file session
            if isinstance(client.session, StringSession):
                # Get session string
                session_string = client.session.save()
                # Create file session client with the session string
                file_client = TelegramClient(str(session_path), client.api_id, client.api_hash)
                await file_client.connect()
                # The file session is automatically saved by Telethon
                await client.disconnect()
                client = file_client

            # Store active client
            self._active_clients[session_name] = client

            # Store API credentials for this session
            self._session_credentials[session_name] = {
                "api_id": client.api_id,
                "api_hash": client.api_hash
            }

            logger.info(f"User {phone_number} authenticated successfully")
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
            # We need to save this to a persistent file-based session
            if phone_number:
                session_name = self._get_session_name(phone_number)
                session_path = self._get_session_path(session_name)

                # Store API credentials for this session
                self._session_credentials[session_name] = {
                    "api_id": client.api_id,
                    "api_hash": client.api_hash
                }

                # Keep the StringSession client active for now
                # It will be migrated to file session after the temp session is cleaned up
                self._active_clients[session_name] = client

                logger.info(f"2FA authentication successful for {phone_number}")
                logger.info(f"Session type: {type(client.session).__name__}")

            return {
                "user_id": user.id,
                "username": getattr(user, "username", None),
                "first_name": getattr(user, "first_name", None),
                "last_name": getattr(user, "last_name", None),
            }

        except Exception as e:
            logger.error(f"Error verifying 2FA password: {e}", exc_info=True)
            raise AuthenticationError("Senha de duas etapas inválida.") from e

    def get_session_credentials(self, phone_number: str) -> Optional[dict]:
        """
        Get stored API credentials for a phone number.
        
        Args:
            phone_number: Phone number
            
        Returns:
            Dict with api_id and api_hash, or None if not found
        """
        session_name = self._get_session_name(phone_number)
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
        session_name = self._get_session_name(phone_number)
        session_path = self._get_session_path(session_name)
        
        # Try to get credentials from stored session if not provided
        if api_id is None or api_hash is None:
            stored_creds = self.get_session_credentials(phone_number)
            if stored_creds:
                api_id = api_id or stored_creds.get("api_id")
                api_hash = api_hash or stored_creds.get("api_hash")
        
        # Fallback to settings if still not available
        if api_id is None or api_hash is None:
            from app.config import settings
            api_id = api_id or settings.api_id
            api_hash = api_hash or settings.api_hash

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
            client = await self.get_or_create_client(phone_number, api_id, api_hash)
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

    async def disconnect_client(self, phone_number: str) -> None:
        """
        Disconnect and remove a client.

        Args:
            phone_number: Phone number
        """
        session_name = self._get_session_name(phone_number)
        if session_name in self._active_clients:
            client = self._active_clients[session_name]
            if client.is_connected():
                await client.disconnect()
            del self._active_clients[session_name]
            logger.info(f"Disconnected client for {phone_number}")

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

