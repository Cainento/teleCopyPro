"""Dependency injection for API routes."""

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.database.connection import get_db
from app.services.copy_service import CopyService
from app.services.session_service import SessionService
from app.services.stripe_service import StripeService
from app.services.pagbank_service import PagBankService
from app.services.telegram_service import TelegramService
from app.services.user_service import UserService
from app.services.admin_service import AdminService
from app.core.security import verify_token
from app.config import settings
from app.models.user import User as PydanticUser
from app.core.logger import get_logger

logger = get_logger(__name__)

# HTTP Bearer token security scheme
security = HTTPBearer(auto_error=False)

# Global service instances that don't need database (singleton pattern)
_telegram_service: TelegramService | None = None
_session_service: SessionService | None = None


def get_telegram_service() -> TelegramService:
    """
    Get or create TelegramService instance.

    Returns:
        TelegramService instance
    """
    global _telegram_service
    if _telegram_service is None:
        _telegram_service = TelegramService()
    return _telegram_service


def get_session_service(telegram_service: TelegramService = Depends(get_telegram_service)) -> SessionService:
    """
    Get or create SessionService instance.

    Args:
        telegram_service: TelegramService instance

    Returns:
        SessionService instance
    """
    global _session_service
    if _session_service is None:
        _session_service = SessionService(telegram_service)
    return _session_service


def get_copy_service(
    db: AsyncSession = Depends(get_db),
    telegram_service: TelegramService = Depends(get_telegram_service)
) -> CopyService:
    """
    Get CopyService instance with database session.

    Args:
        db: Database session
        telegram_service: TelegramService instance

    Returns:
        CopyService instance
    """
    return CopyService(telegram_service, db)


def get_user_service(
    db: AsyncSession = Depends(get_db),
    telegram_service: TelegramService = Depends(get_telegram_service)
) -> UserService:
    """
    Get UserService instance with database session.

    Args:
        db: Database session
        telegram_service: TelegramService instance

    Returns:
        UserService instance
    """
    return UserService(db, telegram_service)


def get_stripe_service(
    db: AsyncSession = Depends(get_db),
    telegram_service: TelegramService = Depends(get_telegram_service)
) -> StripeService:
    """
    Get StripeService instance with database session.

    Args:
        db: Database session
        telegram_service: TelegramService instance

    Returns:
        StripeService instance
    """
    return StripeService(db, telegram_service)


def get_pagbank_service(db: AsyncSession = Depends(get_db)) -> PagBankService:
    """
    Get PagBankService instance with database session.

    Args:
        db: Database session

    Returns:
        PagBankService instance
    """
    return PagBankService(db)


def get_admin_service(
    db: AsyncSession = Depends(get_db),
    telegram_service: TelegramService = Depends(get_telegram_service)
) -> AdminService:
    """
    Get AdminService instance with database session.

    Args:
        db: Database session
        telegram_service: TelegramService instance

    Returns:
        AdminService instance
    """
    return AdminService(db, telegram_service)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_service: UserService = Depends(get_user_service),
    db: AsyncSession = Depends(get_db)
) -> PydanticUser:
    """
    Get the current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer credentials containing JWT token
        user_service: UserService instance for database operations
        db: Database session for session tracking

    Returns:
        Authenticated user

    Raises:
        HTTPException: If token is invalid, expired, or user not found
    """
    if not credentials:
        logger.warning("Authentication failed: Missing credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    logger.debug(f"Verifying JWT token (first 20 chars): {token[:20]}...")

    # Verify JWT token
    payload = verify_token(token, settings.jwt_secret_key)

    if not payload:
        logger.warning(f"Authentication failed: Invalid or expired token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract phone number from token
    phone_number = payload.get("sub")
    if not phone_number:
        logger.warning(f"Authentication failed: No phone number in token payload")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.debug(f"Token verified for phone: {phone_number}")

    # Get user from database
    try:
        user = await user_service.get_user_by_phone(phone_number)
        if not user:
            logger.warning(f"Authentication failed: User not found in database for phone: {phone_number}")
            # Auto-create user if not exists (user might have logged in but database was reset)
            logger.info(f"Auto-creating user for phone: {phone_number}")
            user = await user_service.get_or_create_user_by_phone(phone_number)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found and could not be created",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        # Update session activity timestamp in background (don't block request)
        try:
            from app.database.repositories.session_repository import SessionRepository
            session_repo = SessionRepository(db)
            db_session = await session_repo.get_by_phone(phone_number)
            if db_session:
                # Update session activity only if > 1 hour passed and add random jitter to avoid clashing writes
                import random
                should_update = False
                if db_session.last_used_at:
                    time_diff = datetime.utcnow() - db_session.last_used_at
                    # 3600s (1h) + random jitter (0-600s)
                    if time_diff.total_seconds() > (3600 + random.randint(0, 600)):
                        should_update = True
                else:
                    should_update = True
                
                if should_update:
                    await session_repo.update_last_used(db_session)
                    logger.debug(f"Updated session activity for {phone_number}")
        except Exception as e:
            logger.warning(f"Non-critical error updating session activity for {phone_number}: {e}")
            # IMPORTANT: Rollback the session so that this failure doesn't "poison" the main request's transaction
            # SQLite locks can cause this, but we don't want to fail the user's request just because
            # we couldn't update the "last seen" timestamp.
            try:
                await db.rollback()
                logger.debug(f"Successfully rolled back session after activity update failure")
            except Exception as rb_e:
                logger.error(f"Failed to rollback session: {rb_e}")
            # Don't fail authentication if activity update fails

        # Check and auto-downgrade expired plans (PIX payments have expiry dates)
        try:
            if user_service.is_plan_expired(user):
                logger.info(f"Plan expired for user {phone_number}, auto-downgrading to FREE")
                downgraded_user = await user_service.check_and_downgrade_expired_plans_by_phone(phone_number)
                if downgraded_user:
                    user = downgraded_user
                    logger.info(f"Successfully downgraded expired plan for {phone_number}")
        except Exception as e:
            logger.error(f"Error checking plan expiry: {e}", exc_info=True)
            # Don't fail authentication if expiry check fails

        logger.debug(f"Authenticated user: {phone_number}")
        return user

    except Exception as e:
        logger.error(f"Error authenticating user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_admin_user(
    current_user: PydanticUser = Depends(get_current_user)
) -> PydanticUser:
    """确认当前用户是管理员."""
    if not current_user.is_admin:
        logger.warning(f"Access denied for non-admin user: {current_user.phone_number}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não tem permissão de administrador"
        )
    return current_user

