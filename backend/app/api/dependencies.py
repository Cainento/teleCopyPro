"""Dependency injection for API routes."""

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.database.connection import get_db
from app.services.copy_service import CopyService
from app.services.session_service import SessionService
from app.services.stripe_service import StripeService
from app.services.telegram_service import TelegramService
from app.services.user_service import UserService
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


def get_session_service() -> SessionService:
    """
    Get or create SessionService instance.

    Returns:
        SessionService instance
    """
    global _session_service
    if _session_service is None:
        _session_service = SessionService(get_telegram_service())
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


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    """
    Get UserService instance with database session.

    Args:
        db: Database session

    Returns:
        UserService instance
    """
    return UserService(db)


def get_stripe_service(db: AsyncSession = Depends(get_db)) -> StripeService:
    """
    Get StripeService instance with database session.

    Args:
        db: Database session

    Returns:
        StripeService instance
    """
    return StripeService(db)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_service: UserService = Depends(get_user_service)
) -> PydanticUser:
    """
    Get the current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer credentials containing JWT token
        user_service: UserService instance for database operations

    Returns:
        Authenticated user

    Raises:
        HTTPException: If token is invalid, expired, or user not found
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Verify JWT token
    payload = verify_token(token, settings.jwt_secret_key)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract phone number from token
    phone_number = payload.get("sub")
    if not phone_number:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    try:
        user = await user_service.get_user_by_phone(phone_number)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        logger.info(f"Authenticated user: {phone_number}")
        return user

    except Exception as e:
        logger.error(f"Error authenticating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

