"""Telegram session data model."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    """Session status types."""

    DISCONNECTED = "disconnected"
    WAITING_CODE = "waiting_code"
    WAITING_PASSWORD = "waiting_password"
    CONNECTED = "connected"


class TelegramSessionBase(BaseModel):
    """Base Telegram session model."""

    phone_number: str = Field(..., description="Phone number associated with the session")
    api_id: int = Field(..., description="Telegram API ID")
    api_hash: str = Field(..., description="Telegram API Hash")


class TelegramSessionCreate(TelegramSessionBase):
    """Telegram session creation model."""

    pass


class TelegramSession(TelegramSessionBase):
    """Complete Telegram session model."""

    session_name: str = Field(..., description="Session identifier (sanitized phone number)")
    status: SessionStatus = Field(default=SessionStatus.DISCONNECTED, description="Current session status")
    user_id: Optional[int] = Field(None, description="Telegram user ID")
    phone_code_hash: Optional[str] = Field(None, description="Phone code hash for verification")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Session creation date")
    last_used: datetime = Field(default_factory=datetime.utcnow, description="Last usage date")
    is_authorized: bool = Field(default=False, description="Whether the session is authorized")

    class Config:
        """Pydantic config."""

        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class TemporarySession(BaseModel):
    """Temporary session for authentication flow."""

    phone_number: str
    api_id: int
    api_hash: str
    phone_code_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(..., description="Session expiration time")

    class Config:
        """Pydantic config."""

        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SessionResponse(BaseModel):
    """Session response model."""

    connected: bool = Field(..., description="Whether the session is connected")
    message: str = Field(..., description="Status message")
    status: Optional[SessionStatus] = None
    user_id: Optional[int] = None

    class Config:
        """Pydantic config."""

        use_enum_values = True

