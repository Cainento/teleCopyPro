"""Copy service for handling message copying operations."""

import asyncio
import uuid
from datetime import datetime
from typing import Callable, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import CopyServiceError, SessionError
from app.core.logger import get_logger
from app.database.repositories.job_repository import JobRepository
from app.database.repositories.user_repository import UserRepository
from app.models.copy_job import CopyJob as PydanticCopyJob, CopyJobStatus
from app.services.telegram_service import TelegramService

logger = get_logger(__name__)


class CopyService:
    """Service for copying messages between Telegram channels."""

    def __init__(self, telegram_service: TelegramService, db: AsyncSession):
        """
        Initialize copy service.

        Args:
            telegram_service: TelegramService instance
            db: SQLAlchemy async session
        """
        self._telegram_service = telegram_service
        self.db = db
        self.job_repo = JobRepository(db)
        self.user_repo = UserRepository(db)
        self._real_time_handlers: dict[str, Callable] = {}  # Keep in memory (not serializable)

    def _db_to_pydantic(self, db_job) -> PydanticCopyJob:
        """Convert database job to Pydantic model."""
        return PydanticCopyJob(
            id=db_job.job_id,
            phone_number=db_job.user.phone_number if db_job.user else "",
            source_channel=db_job.source_channel,
            target_channel=db_job.destination_channel,
            copy_media=True,  # Default
            real_time=(db_job.mode == "real_time"),
            status=CopyJobStatus(db_job.status),
            messages_copied=db_job.copied_messages,
            messages_failed=db_job.failed_messages,
            created_at=db_job.created_at,
            started_at=db_job.started_at,
            completed_at=db_job.completed_at,
            error_message=db_job.error_message
        )

    async def create_historical_job(
        self,
        phone_number: str,
        source_channel: str,
        target_channel: str,
        copy_media: bool = True
    ) -> PydanticCopyJob:
        """
        Create a historical copy job without starting it.

        Args:
            phone_number: Phone number associated with session
            source_channel: Source channel username or ID
            target_channel: Target channel username or ID
            copy_media: Whether to copy media files

        Returns:
            CopyJob instance
        """
        # Get user by phone
        db_user = await self.user_repo.get_by_phone(phone_number)
        if not db_user:
            raise SessionError(f"User not found for phone {phone_number}")

        job_id = str(uuid.uuid4())

        # Create job in database
        db_job = await self.job_repo.create(
            job_id=job_id,
            user_id=db_user.id,
            source_channel=source_channel,
            destination_channel=target_channel,
            mode="historical"
        )

        return self._db_to_pydantic(db_job)

    async def copy_messages_historical(
        self,
        phone_number: str,
        source_channel: str,
        target_channel: str,
        copy_media: bool = True,
        api_id: Optional[int] = None,
        api_hash: Optional[str] = None,
        job_id: Optional[str] = None,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> PydanticCopyJob:
        """
        Copy historical messages from source to target channel.

        Args:
            phone_number: Phone number associated with session
            source_channel: Source channel username or ID
            target_channel: Target channel username or ID
            copy_media: Whether to copy media files
            api_id: Telegram API ID (optional, will try to get from stored credentials)
            api_hash: Telegram API Hash (optional, will try to get from stored credentials)
            job_id: Existing job ID (optional, will create new if not provided)
            progress_callback: Optional callback for progress updates (copied, total)

        Returns:
            CopyJob with results

        Raises:
            SessionError: If session is not found or not authorized
            CopyServiceError: If copy operation fails
        """
        # Get or create job
        if job_id:
            db_job = await self.job_repo.get_by_id(job_id)
            if not db_job:
                raise CopyServiceError(f"Job {job_id} not found")
        else:
            # Get user by phone
            db_user = await self.user_repo.get_by_phone(phone_number)
            if not db_user:
                raise SessionError(f"User not found for phone {phone_number}")

            job_id = str(uuid.uuid4())
            db_job = await self.job_repo.create(
                job_id=job_id,
                user_id=db_user.id,
                source_channel=source_channel,
                destination_channel=target_channel,
                mode="historical"
            )

        try:
            # Get client - API credentials should be stored in session
            session_name = self._telegram_service._get_session_name(phone_number)
            if session_name in self._telegram_service._active_clients:
                client = self._telegram_service._active_clients[session_name]
            else:
                # Try to get API credentials
                if api_id is None or api_hash is None:
                    stored_creds = self._telegram_service.get_session_credentials(phone_number)
                    if stored_creds:
                        api_id = api_id or stored_creds.get("api_id")
                        api_hash = api_hash or stored_creds.get("api_hash")
                
                # Fallback to settings
                if api_id is None or api_hash is None:
                    from app.config import settings
                    api_id = api_id or settings.api_id
                    api_hash = api_hash or settings.api_hash
                
                # Use get_or_create_client to reuse existing active client
                # This prevents SQLite "database is locked" errors
                client = await self._telegram_service.get_or_create_client(
                    phone_number=phone_number,
                    api_id=api_id,
                    api_hash=api_hash
                )

            if not await client.is_user_authorized():
                raise SessionError("Session não autorizada. Por favor, refaça o login.")

            # Update job status to running
            db_job = await self.job_repo.update_status(db_job, "running")

            # Get source entity
            try:
                # Try to convert channel ID to proper format
                source_id = source_channel
                try:
                    source_int = int(source_channel)
                    # If it's a negative number without -100 prefix, add it (channel format)
                    if source_int < 0 and source_int > -100000000000:
                        # Convert new format to old format: -1000000000000 - abs(new_id)
                        source_id = -1000000000000 - abs(source_int)
                        logger.info(f"Converted source channel ID from {source_int} to {source_id}")
                    else:
                        source_id = source_int
                        logger.info(f"Using source channel ID as-is: {source_id}")
                except (ValueError, TypeError):
                    logger.info(f"Using source channel as username: {source_channel}")
                    pass  # Keep as string if not numeric (username)

                logger.info(f"Attempting to get entity for source: {source_id} (type: {type(source_id)})")
                source_entity = await client.get_entity(source_id)
                logger.info(f"Successfully got source entity: {source_entity}")
            except Exception as e:
                logger.error(f"Failed to get source entity for {source_channel} (converted to {source_id}): {e}", exc_info=True)
                raise CopyServiceError(f"Canal de origem não encontrado: {source_channel}") from e

            # Get target entity
            try:
                # Try to convert channel ID to proper format
                target_id = target_channel
                try:
                    target_int = int(target_channel)
                    # If it's a negative number without -100 prefix, add it (channel format)
                    if target_int < 0 and target_int > -100000000000:
                        # Convert new format to old format: -1000000000000 - abs(new_id)
                        target_id = -1000000000000 - abs(target_int)
                        logger.info(f"Converted target channel ID from {target_int} to {target_id}")
                    else:
                        target_id = target_int
                        logger.info(f"Using target channel ID as-is: {target_id}")
                except (ValueError, TypeError):
                    logger.info(f"Using target channel as username: {target_channel}")
                    pass  # Keep as string if not numeric (username)

                logger.info(f"Attempting to get entity for target: {target_id} (type: {type(target_id)})")
                target_entity = await client.get_entity(target_id)
                logger.info(f"Successfully got target entity: {target_entity}")
            except Exception as e:
                logger.error(f"Failed to get target entity for {target_channel} (converted to {target_id}): {e}", exc_info=True)
                raise CopyServiceError(f"Canal de destino não encontrado: {target_channel}") from e

            # Copy messages
            count = 0
            failed = 0
            total_messages = 0

            # Count total messages first (optional, for progress)
            try:
                async for _ in client.iter_messages(source_entity, reverse=True):
                    total_messages += 1
            except Exception:
                pass  # If counting fails, we'll still copy

            # Copy messages
            async for message in client.iter_messages(source_entity, reverse=True):
                try:
                    if copy_media or not message.media:
                        await client.send_message(target_entity, message)
                        count += 1

                        # Update progress every 10 messages
                        if count % 10 == 0:
                            await self.job_repo.update_progress(db_job, count, total_messages, failed)

                        if progress_callback and total_messages > 0:
                            progress_callback(count, total_messages)

                    await asyncio.sleep(0.1)  # Rate limiting

                except Exception as e:
                    failed += 1
                    logger.warning(f"Failed to copy message {message.id}: {e}")
                    continue

            # Final progress update
            db_job = await self.job_repo.update_progress(db_job, count, total_messages, failed)
            db_job = await self.job_repo.update_status(db_job, "completed")

            logger.info(
                f"Copy job {job_id} completed: {count} messages copied, {failed} failed"
            )

        except Exception as e:
            await self.job_repo.update_status(db_job, "failed", error_message=str(e))
            logger.error(f"Copy job {job_id} failed: {e}", exc_info=True)
            raise CopyServiceError(f"Erro ao copiar mensagens: {str(e)}") from e

        return self._db_to_pydantic(db_job)

    async def start_real_time_copy(
        self,
        phone_number: str,
        source_channel: str,
        target_channel: str,
        copy_media: bool = True,
        api_id: Optional[int] = None,
        api_hash: Optional[str] = None
    ) -> PydanticCopyJob:
        """
        Start real-time copying of messages from source to target channel.

        Args:
            phone_number: Phone number associated with session
            source_channel: Source channel username or ID
            target_channel: Target channel username or ID
            copy_media: Whether to copy media files
            api_id: Telegram API ID (optional, will try to get from stored credentials)
            api_hash: Telegram API Hash (optional, will try to get from stored credentials)

        Returns:
            CopyJob for the real-time copy operation

        Raises:
            SessionError: If session is not found or not authorized
            CopyServiceError: If copy operation fails
        """
        # Get user by phone
        db_user = await self.user_repo.get_by_phone(phone_number)
        if not db_user:
            raise SessionError(f"User not found for phone {phone_number}")

        job_id = str(uuid.uuid4())

        # Create job in database
        db_job = await self.job_repo.create(
            job_id=job_id,
            user_id=db_user.id,
            source_channel=source_channel,
            destination_channel=target_channel,
            mode="real_time"
        )

        try:
            # Get client - API credentials should be stored in session
            session_name = self._telegram_service._get_session_name(phone_number)
            if session_name in self._telegram_service._active_clients:
                client = self._telegram_service._active_clients[session_name]
            else:
                # Try to get API credentials
                if api_id is None or api_hash is None:
                    stored_creds = self._telegram_service.get_session_credentials(phone_number)
                    if stored_creds:
                        api_id = api_id or stored_creds.get("api_id")
                        api_hash = api_hash or stored_creds.get("api_hash")
                
                # Fallback to settings
                if api_id is None or api_hash is None:
                    from app.config import settings
                    api_id = api_id or settings.api_id
                    api_hash = api_hash or settings.api_hash
                
                # Use get_or_create_client to reuse existing active client
                # This prevents SQLite "database is locked" errors
                client = await self._telegram_service.get_or_create_client(
                    phone_number=phone_number,
                    api_id=api_id,
                    api_hash=api_hash
                )

            if not await client.is_user_authorized():
                raise SessionError("Session não autorizada. Por favor, refaça o login.")

            # Get entities
            # Try to convert channel IDs to proper format
            source_id = source_channel
            try:
                source_int = int(source_channel)
                # If it's a negative number without -100 prefix, add it (channel format)
                if source_int < 0 and source_int > -100000000000:
                    # Convert new format to old format: -1000000000000 - abs(new_id)
                    source_id = -1000000000000 - abs(source_int)
                    logger.info(f"Converted source channel ID from {source_int} to {source_id}")
                else:
                    source_id = source_int
                    logger.info(f"Using source channel ID as-is: {source_id}")
            except (ValueError, TypeError):
                logger.info(f"Using source channel as username: {source_channel}")
                pass  # Keep as string if not numeric (username)

            target_id = target_channel
            try:
                target_int = int(target_channel)
                # If it's a negative number without -100 prefix, add it (channel format)
                if target_int < 0 and target_int > -100000000000:
                    # Convert new format to old format: -1000000000000 - abs(new_id)
                    target_id = -1000000000000 - abs(target_int)
                    logger.info(f"Converted target channel ID from {target_int} to {target_id}")
                else:
                    target_id = target_int
                    logger.info(f"Using target channel ID as-is: {target_id}")
            except (ValueError, TypeError):
                logger.info(f"Using target channel as username: {target_channel}")
                pass  # Keep as string if not numeric (username)

            logger.info(f"Attempting to get entities - source: {source_id}, target: {target_id}")
            source_entity = await client.get_entity(source_id)
            target_entity = await client.get_entity(target_id)
            logger.info(f"Successfully got both entities")

            # Create event handler
            async def message_handler(event):
                """Handle new messages from source channel."""
                # Import here to avoid circular imports
                from app.database.connection import AsyncSessionLocal

                # Create a new database session for this handler
                async with AsyncSessionLocal() as handler_db:
                    try:
                        if copy_media or not event.message.media:
                            await client.send_message(target_entity, event.message)
                            # Update database (use fresh query to avoid stale data)
                            handler_repo = JobRepository(handler_db)
                            fresh_job = await handler_repo.get_by_id(job_id)
                            if fresh_job and fresh_job.status == "running":
                                await handler_repo.update_progress(
                                    fresh_job,
                                    fresh_job.copied_messages + 1,
                                    None,
                                    fresh_job.failed_messages
                                )
                                await handler_db.commit()
                                logger.debug(f"Forwarded message {event.message.id} from {source_channel} to {target_channel}")
                    except Exception as e:
                        try:
                            # Update database with failure
                            handler_repo = JobRepository(handler_db)
                            fresh_job = await handler_repo.get_by_id(job_id)
                            if fresh_job and fresh_job.status == "running":
                                await handler_repo.update_progress(
                                    fresh_job,
                                    fresh_job.copied_messages,
                                    None,
                                    fresh_job.failed_messages + 1
                                )
                                await handler_db.commit()
                        except Exception:
                            pass  # Don't fail if we can't update the error count
                        logger.warning(f"Failed to forward message {event.message.id}: {e}")

            # Register handler
            from telethon import events
            client.add_event_handler(
                message_handler,
                events.NewMessage(chats=source_entity)
            )

            self._real_time_handlers[job_id] = message_handler

            # Update job status to running
            db_job = await self.job_repo.update_status(db_job, "running")

            logger.info(f"Real-time copy job {job_id} started: {source_channel} -> {target_channel}")

        except Exception as e:
            await self.job_repo.update_status(db_job, "failed", error_message=str(e))
            logger.error(f"Failed to start real-time copy job {job_id}: {e}", exc_info=True)
            raise CopyServiceError(f"Erro ao iniciar cópia em tempo real: {str(e)}") from e

        return self._db_to_pydantic(db_job)

    async def stop_real_time_copy(self, job_id: str) -> None:
        """
        Stop a copy job (both real-time and historical).

        Args:
            job_id: Job identifier

        Raises:
            CopyServiceError: If job is not found
        """
        logger.info(f"Attempting to stop job {job_id}")
        db_job = await self.job_repo.get_by_id(job_id)
        if not db_job:
            logger.error(f"Job {job_id} not found")
            raise CopyServiceError(f"Job {job_id} não encontrado")

        logger.info(f"Job {job_id} found with mode={db_job.mode}, status={db_job.status}")

        # Check if job can be stopped
        if db_job.status in ["completed", "stopped", "failed"]:
            logger.warning(f"Job {job_id} already in terminal state: {db_job.status}")
            raise CopyServiceError(f"Job {job_id} já foi finalizado (status: {db_job.status})")

        # Remove real-time handler if exists
        if job_id in self._real_time_handlers:
            logger.info(f"Removing real-time handler for job {job_id}")
            # Note: Telethon doesn't provide easy way to remove handlers
            # The handler will stop when client disconnects
            del self._real_time_handlers[job_id]

        # Update job status
        logger.info(f"Updating job {job_id} status to 'stopped'")
        await self.job_repo.update_status(db_job, "stopped")
        logger.info(f"Job {job_id} stopped successfully")

    async def get_job(self, job_id: str) -> Optional[PydanticCopyJob]:
        """
        Get copy job by ID.

        Args:
            job_id: Job identifier

        Returns:
            CopyJob or None if not found
        """
        db_job = await self.job_repo.get_by_id(job_id)
        return self._db_to_pydantic(db_job) if db_job else None

    async def get_user_jobs(self, phone_number: str) -> list[PydanticCopyJob]:
        """
        Get all jobs for a user.

        Args:
            phone_number: Phone number

        Returns:
            List of CopyJob instances
        """
        db_user = await self.user_repo.get_by_phone(phone_number)
        if not db_user:
            return []

        db_jobs = await self.job_repo.get_by_user(db_user.id)
        return [self._db_to_pydantic(job) for job in db_jobs]

