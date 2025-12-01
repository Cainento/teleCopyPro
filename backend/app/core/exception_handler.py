"""Global exception handler for FastAPI."""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from telethon.errors import (
    ApiIdInvalidError,
    FloodWaitError,
    PhoneCodeInvalidError,
    PhoneNumberInvalidError,
    SessionPasswordNeededError,
)

from app.core.exceptions import (
    AuthenticationError,
    ConfigurationError,
    CopyServiceError,
    NotFoundError,
    RateLimitError,
    SessionError,
    TeleCopyException,
    TelegramAPIError,
    ValidationError,
)
from app.core.logger import get_logger

logger = get_logger(__name__)


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for unhandled exceptions.

    Args:
        request: FastAPI request object
        exc: Exception instance

    Returns:
        JSON response with error details
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "details": {}
        }
    )


async def telecopy_exception_handler(request: Request, exc: TeleCopyException) -> JSONResponse:
    """
    Handler for custom TeleCopy exceptions.

    Args:
        request: FastAPI request object
        exc: TeleCopyException instance

    Returns:
        JSON response with error details
    """
    logger.warning(f"TeleCopy exception: {exc.message}", extra={"status_code": exc.status_code, "details": exc.details})
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "details": exc.details
        }
    )


def map_telethon_error(exc: Exception) -> TeleCopyException:
    """
    Map Telethon errors to custom exceptions.

    Args:
        exc: Telethon exception

    Returns:
        Mapped TeleCopyException
    """
    if isinstance(exc, PhoneNumberInvalidError):
        return TelegramAPIError("Número de telefone inválido.")
    elif isinstance(exc, ApiIdInvalidError):
        return ConfigurationError("API ID ou API Hash inválidos.")
    elif isinstance(exc, FloodWaitError):
        return RateLimitError(
            f"Muitas tentativas. Tente novamente em {exc.seconds} segundos.",
            retry_after=exc.seconds
        )
    elif isinstance(exc, PhoneCodeInvalidError):
        return AuthenticationError("Código de verificação inválido.")
    elif isinstance(exc, SessionPasswordNeededError):
        return AuthenticationError(
            "Senha de verificação em duas etapas necessária.",
            details={"requires_2fa": True}
        )
    else:
        return TelegramAPIError(f"Erro na API do Telegram: {str(exc)}")


async def telethon_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler for Telethon-specific exceptions.

    Args:
        request: FastAPI request object
        exc: Telethon exception

    Returns:
        JSON response with error details
    """
    telecopy_exc = map_telethon_error(exc)
    return await telecopy_exception_handler(request, telecopy_exc)

