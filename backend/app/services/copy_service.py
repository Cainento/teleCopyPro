"""Copy service for handling message copying operations."""

import asyncio
import random
import uuid
from datetime import datetime
from typing import Callable, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import CopyServiceError, SessionError
from app.core.logger import get_logger
from app.database.repositories.job_repository import JobRepository
from app.database.repositories.session_repository import SessionRepository
from app.database.repositories.user_repository import UserRepository
from app.models.copy_job import CopyJob as PydanticCopyJob, CopyJobStatus
from app.services.telegram_service import TelegramService
from telethon.errors import (
    FloodWaitError, 
    AuthKeyUnregisteredError, 
    ChannelPrivateError,
    ChatForwardsRestrictedError
)
from telethon.tl.types import MessageService

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
            error_message=db_job.error_message,
            status_message=db_job.status_message
        )

    async def _get_entity_with_retry(self, client, entity_id):
        """
        Attempt to get entity with retry mechanism via get_dialogs.
        Helps when the entity is not in the local cache.
        """
        try:
            return await client.get_entity(entity_id)
        except Exception as e:
            # "Could not find the input entity" or similar
            logger.warning(f"Entity {entity_id} not found in cache ({e}), refreshing dialogs...")
            try:
                # Refresh dialog cache
                await client.get_dialogs(limit=None)
                # Retry getting entity with original ID
                return await client.get_entity(entity_id)
            except Exception as retry_error:
                logger.warning(f"Failed to resolve {entity_id} after refresh: {retry_error}")
                
                # Fallback: Check if it looks like a Basic Group ID that should be a Channel (Supergroup) ID
                # This handles cases where user provides "-123" but it's actually "-100123"
                if isinstance(entity_id, int) and entity_id < 0 and entity_id > -1000000000000:
                    converted_id = -1000000000000 - abs(entity_id)
                    logger.info(f"Attempting fallback to supergroup ID: {converted_id}")
                    try:
                        return await client.get_entity(converted_id)
                    except Exception as fallback_error:
                        logger.error(f"Fallback to {converted_id} also failed: {fallback_error}")
                        pass
                
                # Diagnostic logging
                try:
                     dialogs = await client.get_dialogs(limit=None)
                     logger.info(f"Debug: Fetched {len(dialogs)} dialogs. Checking for ID {entity_id}...")
                     found_in_dialogs = any(d.entity.id == abs(entity_id) or d.entity.id == abs(int(str(entity_id).replace("-100", ""))) for d in dialogs if hasattr(d, 'entity'))
                     if found_in_dialogs:
                         logger.warning(f"Debug: Entity ID matches a dialog, but access failed. Possible access hash mismatch.")
                     else:
                         logger.warning(f"Debug: Entity ID NOT found in user's dialog list.")
                except Exception as debug_error:
                    logger.warning(f"Debug check failed: {debug_error}")

                # If all else fails, raise a helpful error
                logger.error(f"Could not resolve entity {entity_id}")
                raise CopyServiceError(f"Não foi possível encontrar o canal/grupo {entity_id}. Verifique se:\n1. Você é membro do canal/grupo\n2. O ID está correto\n3. Se for público, tente usar o @username")

    async def _copy_message_with_retry(
        self,
        client,
        target_entity,
        message,
        db_job=None
    ) -> bool:
        """
        Copy a single message with retry logic for FloodWaitError.
        
        Returns:
            bool: True if successful, False if failed
        """
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                await client.send_message(target_entity, message)
                
                # Clear status message if it was set (e.g. after a wait)
                if db_job and db_job.status_message:
                     await self.job_repo.update_status(db_job, db_job.status, status_message="")
                     await self.db.commit()
                
                return True
                
            except FloodWaitError as e:
                wait_time = e.seconds
                logger.warning(f"FloodWaitError: Waiting {wait_time} seconds before retrying...")
                
                if db_job:
                    msg = f"Aguardando {wait_time}s (Limitação do Telegram)..."
                    await self.job_repo.update_status(db_job, db_job.status, status_message=msg)
                    await self.db.commit()
                
                await asyncio.sleep(wait_time + 1)
                # Don't increment retry count for FloodWait, we must wait it out
                continue

            except (ChannelPrivateError, ChatForwardsRestrictedError) as e:
                # Fatal errors - do not retry, stop the job
                logger.error(f"Permission error: {e}")
                raise CopyServiceError(f"Erro de permissão: O canal é privado ou possui restrição de encaminhamento (conteúdo protegido).") from e
                
            except Exception as e:
                retry_count += 1
                logger.warning(f"Error copying message {message.id} (attempt {retry_count}/{max_retries}): {e}")
                await asyncio.sleep(1 * retry_count)
        
        return False

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
                    # 1. Try memory
                    stored_creds = self._telegram_service.get_session_credentials(phone_number)
                    if stored_creds:
                        api_id = api_id or stored_creds.get("api_id")
                        api_hash = api_hash or stored_creds.get("api_hash")
                    
                    # 2. Try database (persistence fix)
                    if api_id is None or api_hash is None:
                        try:
                            # Use existing DB session
                            session_repo = SessionRepository(self.db)
                            db_session = await session_repo.get_by_phone(phone_number)
                            if db_session and db_session.api_id and db_session.api_hash:
                                logger.info(f"Retrieved credentials from database for {phone_number} (historical)")
                                api_id = api_id or int(db_session.api_id)
                                api_hash = api_hash or db_session.api_hash
                        except Exception as e:
                            logger.error(f"Error retrieving credentials from DB: {e}", exc_info=True)
                
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
                    api_hash=api_hash,
                    db=self.db
                )

            if not await client.is_user_authorized():
                raise SessionError("Session não autorizada. Por favor, refaça o login.")

            # Disable Telethon's auto-sleep so our code handles FloodWait and updates the UI
            client.flood_sleep_threshold = 0

            # Update job status to running
            db_job = await self.job_repo.update_status(db_job, "running")
            await self.db.commit()

            # Get source entity
            try:
                # Try to convert channel ID to proper format if it's an integer
                source_id = source_channel
                try:
                    source_id = int(source_channel)
                    logger.info(f"Using numeric source channel ID: {source_id}")
                except (ValueError, TypeError):
                    logger.info(f"Using source channel as username: {source_channel}")
                    pass

                logger.info(f"Attempting to get entity for source: {source_id} (type: {type(source_id)})")
                source_entity = await self._get_entity_with_retry(client, source_id)
                logger.info(f"Successfully got source entity: {source_entity}")
            except Exception as e:
                logger.error(f"Failed to get source entity for {source_channel} (converted to {source_id}): {e}", exc_info=True)
                raise CopyServiceError(f"Canal de origem não encontrado: {source_channel}") from e

            # Get target entity
            try:
                # Try to convert channel ID to proper format if it's an integer
                target_id = target_channel
                try:
                    target_id = int(target_channel)
                    logger.info(f"Using numeric target channel ID: {target_id}")
                except (ValueError, TypeError):
                    logger.info(f"Using target channel as username: {target_channel}")
                    pass

                logger.info(f"Attempting to get entity for target: {target_id} (type: {type(target_id)})")
                target_entity = await self._get_entity_with_retry(client, target_id)
                logger.info(f"Successfully got target entity: {target_entity}")
            except Exception as e:
                logger.error(f"Failed to get target entity for {target_channel} (converted to {target_id}): {e}", exc_info=True)
                raise CopyServiceError(f"Canal de destino não encontrado: {target_channel}") from e

            # Copy messages
            count = 0
            failed = 0
            total_messages = None  # We don't count upfront to avoid blocking on large channels

            # If resuming, initialize counters from DB
            if job_id and db_job:
                count = db_job.copied_messages
                failed = db_job.failed_messages
                logger.info(f"Resuming job {job_id} from offset: {count + failed} (copied: {count}, failed: {failed})")

            # Calculate offset for resume
            offset_count = count + failed
            
            logger.info(f"Starting message copy from {source_channel} to {target_channel}")

            # Copy messages
            skipped_count = 0
            async for message in client.iter_messages(source_entity, reverse=True):
                # Manual offset handling since iter_messages doesn't support integer offset for skipping
                if skipped_count < offset_count:
                    skipped_count += 1
                    continue

                # Skip Service Messages (e.g. pinned message, user joined, etc.)
                if isinstance(message, MessageService):
                    logger.debug(f"Skipping service message {message.id}")
                    continue

                try:
                    if copy_media or not message.media:
                        success = await self._copy_message_with_retry(client, target_entity, message, db_job)
                        
                        if success:
                            count += 1
                        else:
                            failed += 1
                            logger.warning(f"Failed to copy message {message.id} after retries")

                        # Update progress every 10 messages
                        if count % 10 == 0:
                            # Refresh job status from DB to check for pause/stop
                            await self.db.refresh(db_job)
                            if db_job.status in ["paused", "stopped"]:
                                logger.info(f"Job {job_id} {db_job.status} during execution, stopping loop")
                                # Commit final progress before returning
                                await self.job_repo.update_progress(db_job, count, total_messages, failed)
                                await self.db.commit()
                                return self._db_to_pydantic(db_job)

                            await self.job_repo.update_progress(db_job, count, total_messages, failed)
                            await self.db.commit()

                        if progress_callback and total_messages and total_messages > 0:
                            progress_callback(count, total_messages)

                    await asyncio.sleep(random.uniform(1.1, 1.5))  # Rate limiting with jitter (~1.3s avg)

                except CopyServiceError:
                    # Propagate fatal errors (like permissions) up to cancel the job
                    raise
                except Exception as e:
                    failed += 1
                    logger.warning(f"Failed to copy message {message.id}: {e}")
                    continue

            # Final progress update - only if loop completed naturally
            # Retrieve latest status one last time
            await self.db.refresh(db_job)
            if db_job.status not in ["paused", "stopped"]:
                db_job = await self.job_repo.update_progress(db_job, count, total_messages, failed)
                db_job = await self.job_repo.update_status(db_job, "completed")
                await self.db.commit()

            logger.info(
                f"Copy job {job_id} finished ({db_job.status}): {count} messages copied, {failed} failed"
            )

        except AuthKeyUnregisteredError:
            logger.error(f"Session revoked during copy job {job_id}")
            await self.job_repo.update_status(db_job, "failed", error_message="Sessão revogada. Faça login novamente.")
            await self.db.commit()
            await self._telegram_service.handle_session_revoked(phone_number)
            raise SessionError("Sessão revogada/expirada. Faça login novamente.")

        except Exception as e:
            await self.job_repo.update_status(db_job, "failed", error_message=str(e))
            await self.db.commit()
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
        api_hash: Optional[str] = None,
        job_id: Optional[str] = None
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
            job_id: Optional existing job ID (for resuming)

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

        if job_id:
            # Resuming existing job
            db_job = await self.job_repo.get_by_id(job_id)
            if not db_job:
                raise CopyServiceError(f"Job {job_id} not found")
        else:
            # Create new job
            job_id = str(uuid.uuid4())
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
                    # 1. Try memory
                    stored_creds = self._telegram_service.get_session_credentials(phone_number)
                    if stored_creds:
                        api_id = api_id or stored_creds.get("api_id")
                        api_hash = api_hash or stored_creds.get("api_hash")
                    
                    # 2. Try database (persistence fix)
                    if api_id is None or api_hash is None:
                        try:
                            # Use existing DB session
                            session_repo = SessionRepository(self.db)
                            db_session = await session_repo.get_by_phone(phone_number)
                            if db_session and db_session.api_id and db_session.api_hash:
                                logger.info(f"Retrieved credentials from database for {phone_number}")
                                api_id = api_id or int(db_session.api_id)
                                api_hash = api_hash or db_session.api_hash
                        except Exception as e:
                            logger.error(f"Error retrieving credentials from DB: {e}", exc_info=True)

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
                    api_hash=api_hash,
                    db=self.db
                )

            if not await client.is_user_authorized():
                raise SessionError("Session não autorizada. Por favor, refaça o login.")

            # Get entities
            source_id = source_channel
            try:
                source_id = int(source_channel)
                logger.info(f"Using numeric source channel ID: {source_id}")
            except (ValueError, TypeError):
                logger.info(f"Using source channel as username: {source_channel}")
                pass

            target_id = target_channel
            try:
                target_id = int(target_channel)
                logger.info(f"Using numeric target channel ID: {target_id}")
            except (ValueError, TypeError):
                logger.info(f"Using target channel as username: {target_channel}")
                pass

            logger.info(f"Attempting to get entities - source: {source_id}, target: {target_id}")
            source_entity = await self._get_entity_with_retry(client, source_id)
            target_entity = await self._get_entity_with_retry(client, target_id)
            logger.info(f"Successfully got both entities")

            # Create event handler
            async def message_handler(event):
                """Handle new messages from source channel."""
                # Import here to avoid circular imports
                from app.database.connection import AsyncSessionLocal
                from app.database.repositories.job_repository import JobRepository
                
                logger.debug(f"[Handler {job_id}] Message received: {event.message.id}")

                # Create a new database session for this handler
                async with AsyncSessionLocal() as handler_db:
                    try:
                        # Skip Service Messages
                        if isinstance(event.message, MessageService):
                            return

                        if copy_media or not event.message.media:
                            # Update database (use fresh query to avoid stale data)
                            handler_repo = JobRepository(handler_db)
                            fresh_job = await handler_repo.get_by_id(job_id)
                            
                            if not fresh_job:
                                logger.warning(f"[Handler {job_id}] Job not found in DB, stopping processing")
                                return

                            logger.debug(f"[Handler {job_id}] Current DB status: {fresh_job.status}")

                            if fresh_job.status == "running":
                                # Handle Real-time FloodWait
                                try:
                                    await client.send_message(target_entity, event.message)
                                    
                                    # Clear status message if successful
                                    if fresh_job.status_message:
                                         await handler_repo.update_status(fresh_job, fresh_job.status, status_message="")
                                
                                    await handler_repo.update_progress(
                                        fresh_job,
                                        fresh_job.copied_messages + 1,
                                        None,
                                        fresh_job.failed_messages
                                    )
                                    await handler_db.commit()
                                    logger.info(f"[Handler {job_id}] Forwarded message {event.message.id}")
                                    
                                except FloodWaitError as e:
                                    wait_time = e.seconds
                                    logger.warning(f"[Handler {job_id}] FloodWait: {wait_time}s")
                                    
                                    msg = f"Aguardando {wait_time}s (Limitação do Telegram)..."
                                    await handler_repo.update_status(fresh_job, fresh_job.status, status_message=msg)
                                    await handler_db.commit()
                                    
                                    await asyncio.sleep(wait_time + 1)
                                    
                                    # Retry once
                                    try:
                                        await client.send_message(target_entity, event.message)
                                        # Clear status
                                        await handler_repo.update_status(fresh_job, fresh_job.status, status_message="")
                                        await handler_repo.update_progress(
                                            fresh_job,
                                            fresh_job.copied_messages + 1,
                                            None,
                                            fresh_job.failed_messages
                                        )
                                        await handler_db.commit()
                                    except Exception as retry_e:
                                        logger.error(f"[Handler {job_id}] Failed retry: {retry_e}")
                                        # Count as failure
                                        await handler_repo.update_progress(
                                            fresh_job,
                                            fresh_job.copied_messages,
                                            None,
                                            fresh_job.failed_messages + 1
                                        )
                                        await handler_db.commit()

                            elif fresh_job.status in ["stopped", "failed", "paused"]:
                                 # Job is in a terminal state or paused, remove handler to stop processing
                                 logger.warning(f"[Handler {job_id}] Job is {fresh_job.status}, removing handler and stopping processing.")
                                 try:
                                     client.remove_event_handler(message_handler)
                                 except Exception as remove_error:
                                     logger.error(f"[Handler {job_id}] Failed to remove self: {remove_error}")
                                 return
                            else:
                                 logger.warning(f"[Handler {job_id}] Job status {fresh_job.status} unknown, skipping message")
                                 return
                    except Exception as e:
                        try:
                            # Update database with failure
                            handler_repo = JobRepository(handler_db)
                            fresh_job = await handler_repo.get_by_id(job_id)
                            # Verify status again
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

            # Store handler in TelegramService (Singleton)
            self._telegram_service.add_real_time_handler(job_id, phone_number, message_handler)

            # Update job status to running
            db_job = await self.job_repo.update_status(db_job, "running")

            logger.info(f"Real-time copy job {job_id} started: {source_channel} -> {target_channel}")

        except AuthKeyUnregisteredError:
            logger.error(f"Session revoked during real-time setup for {job_id}")
            await self.job_repo.update_status(db_job, "failed", error_message="Sessão revogada. Faça login novamente.")
            await self._telegram_service.handle_session_revoked(phone_number)
            raise SessionError("Sessão revogada/expirada. Faça login novamente.")

        except Exception as e:
            await self.job_repo.update_status(db_job, "failed", error_message=str(e))
            logger.error(f"Failed to start real-time copy job {job_id}: {e}", exc_info=True)
            raise CopyServiceError(f"Erro ao iniciar cópia em tempo real: {str(e)}") from e

        return self._db_to_pydantic(db_job)

    async def pause_real_time_copy(self, job_id: str) -> None:
        """
        Pause a real-time copy job.

        Args:
            job_id: Job identifier

        Raises:
            CopyServiceError: If job is not found or cannot be paused
        """
        logger.info(f"Attempting to pause job {job_id}")
        db_job = await self.job_repo.get_by_id(job_id)
        if not db_job:
            raise CopyServiceError(f"Job {job_id} não encontrado")

        if db_job.status != "running":
            raise CopyServiceError(f"Apenas jobs em execução podem ser pausados (status atual: {db_job.status})")

        # Remove event handler via TelegramService
        await self._telegram_service.remove_real_time_handler(job_id)
        
        # Update status
        await self.job_repo.update_status(db_job, "paused")
        logger.info(f"Job {job_id} paused successfully")

    async def resume_real_time_copy(self, job_id: str) -> PydanticCopyJob:
        """
        Resume a paused real-time copy job.

        Args:
            job_id: Job identifier

        Returns:
            CopyJob instance

        Raises:
            CopyServiceError: If job is not found or cannot be resumed
        """
        logger.info(f"Attempting to resume job {job_id}")
        db_job = await self.job_repo.get_by_id(job_id)
        if not db_job:
            raise CopyServiceError(f"Job {job_id} não encontrado")

        if db_job.status != "paused":
            raise CopyServiceError(f"Apenas jobs pausados podem ser retomados (status atual: {db_job.status})")

        # Resume by calling start with existing job ID
        # Note: We assume copy_media=True as it's not persisted in DB currently
        return await self.start_real_time_copy(
            phone_number=db_job.user.phone_number,
            source_channel=db_job.source_channel,
            target_channel=db_job.destination_channel,
            copy_media=True,
            job_id=job_id
        )

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

        # Remove real-time handler via TelegramService
        await self._telegram_service.remove_real_time_handler(job_id)

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

    async def resume_all_active_jobs(self) -> None:
        """Resume all jobs that are marked as running in the database."""
        logger.info("Checking for active jobs to resume...")
        active_jobs = await self.job_repo.get_all_running_real_time_jobs()
        
        logger.info(f"Found {len(active_jobs)} active jobs to resume")
        
        for job in active_jobs:
            try:
                # Basic validation
                if not job.user or not job.user.phone_number:
                    logger.warning(f"Skipping job {job.job_id}: No user attached")
                    continue
                    
                logger.info(f"Resuming job {job.job_id} for user {job.user.phone_number}")
                
                # We resume by calling start_real_time_copy with the existing job_id
                # This will re-initialize the client and re-attach the event handlers
                await self.start_real_time_copy(
                    phone_number=job.user.phone_number,
                    source_channel=job.source_channel,
                    target_channel=job.destination_channel,
                    copy_media=True,  # Default assumption used in resume logic
                    job_id=job.job_id
                )
                logger.info(f"Successfully resumed job {job.job_id}")
                
            except Exception as e:
                logger.error(f"Failed to resume job {job.job_id}: {e}", exc_info=True)
                # We don't stop the loop, we want to try to resume other jobs

