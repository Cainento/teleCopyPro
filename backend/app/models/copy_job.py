"""Copy job data model."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class CopyJobStatus(str, Enum):
    """Copy job status types."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"


class CopyJobBase(BaseModel):
    """Base copy job model."""

    source_channel: str = Field(..., description="Source channel username or ID")
    target_channel: str = Field(..., description="Target channel username or ID")
    real_time: bool = Field(default=False, description="Whether this is a real-time copy job")
    copy_media: bool = Field(default=True, description="Whether to copy media files")


class CopyJobCreate(CopyJobBase):
    """Copy job creation model."""

    phone_number: str = Field(..., description="Phone number associated with the session")


class CopyJob(CopyJobBase):
    """Complete copy job model."""

    id: str = Field(..., description="Unique job identifier")
    phone_number: str = Field(..., description="Phone number associated with the session")
    status: CopyJobStatus = Field(default=CopyJobStatus.PENDING, description="Current job status")
    messages_copied: int = Field(default=0, ge=0, description="Number of messages copied")
    messages_failed: int = Field(default=0, ge=0, description="Number of messages that failed to copy")
    error_message: Optional[str] = Field(None, description="Error message if job failed")
    started_at: Optional[datetime] = Field(None, description="Job start time")
    completed_at: Optional[datetime] = Field(None, description="Job completion time")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Job creation date")

    class Config:
        """Pydantic config."""

        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class CopyJobResponse(BaseModel):
    """Copy job response model."""

    id: str
    status: CopyJobStatus
    message: str
    messages_copied: Optional[int] = None
    source_channel: str
    target_channel: str

    class Config:
        """Pydantic config."""

        use_enum_values = True

