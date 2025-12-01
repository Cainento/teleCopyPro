"""Custom exception classes for the application."""

from typing import Any, Optional


class TeleCopyException(Exception):
    """Base exception for all application exceptions."""

    def __init__(self, message: str, status_code: int = 500, details: Optional[dict[str, Any]] = None):
        """
        Initialize exception.

        Args:
            message: Error message
            status_code: HTTP status code
            details: Additional error details
        """
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class TelegramAPIError(TeleCopyException):
    """Exception for Telegram API errors."""

    def __init__(self, message: str, status_code: int = 400, details: Optional[dict[str, Any]] = None):
        super().__init__(message, status_code, details)


class AuthenticationError(TeleCopyException):
    """Exception for authentication errors."""

    def __init__(self, message: str = "Authentication failed", details: Optional[dict[str, Any]] = None):
        super().__init__(message, 401, details)


class SessionError(TeleCopyException):
    """Exception for session-related errors."""

    def __init__(self, message: str = "Session error", status_code: int = 401, details: Optional[dict[str, Any]] = None):
        super().__init__(message, status_code, details)


class ValidationError(TeleCopyException):
    """Exception for validation errors."""

    def __init__(self, message: str = "Validation error", details: Optional[dict[str, Any]] = None):
        super().__init__(message, 400, details)


class NotFoundError(TeleCopyException):
    """Exception for resource not found errors."""

    def __init__(self, message: str = "Resource not found", details: Optional[dict[str, Any]] = None):
        super().__init__(message, 404, details)


class RateLimitError(TeleCopyException):
    """Exception for rate limiting errors."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None, details: Optional[dict[str, Any]] = None):
        details = details or {}
        if retry_after:
            details["retry_after"] = retry_after
        super().__init__(message, 429, details)


class ConfigurationError(TeleCopyException):
    """Exception for configuration errors."""

    def __init__(self, message: str = "Configuration error", details: Optional[dict[str, Any]] = None):
        super().__init__(message, 500, details)


class CopyServiceError(TeleCopyException):
    """Exception for copy service errors."""

    def __init__(self, message: str = "Copy service error", status_code: int = 500, details: Optional[dict[str, Any]] = None):
        super().__init__(message, status_code, details)

