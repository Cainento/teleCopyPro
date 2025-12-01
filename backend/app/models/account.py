"""Account management data models."""

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.user import UserPlan


class AccountInfoResponse(BaseModel):
    """Account information response model."""

    phone_number: str = Field(..., description="User's phone number")
    display_name: Optional[str] = Field(None, description="User's display name")
    plan: UserPlan = Field(..., description="Current plan type")
    plan_expiry: Optional[datetime] = Field(None, description="Plan expiration date")
    usage_count: int = Field(default=0, ge=0, description="Number of copy operations used")
    created_at: Optional[datetime] = Field(None, description="Account creation date")

    class Config:
        """Pydantic config."""

        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UsageStatsResponse(BaseModel):
    """Usage statistics response model."""

    phone_number: str = Field(..., description="User's phone number")
    plan: UserPlan = Field(..., description="Current plan type")
    usage_count: int = Field(default=0, ge=0, description="Total copy operations used")
    usage_limit: Optional[int] = Field(None, description="Daily message limit (None = unlimited)")
    usage_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Usage percentage")
    messages_copied_today: int = Field(default=0, ge=0, description="Messages copied today")
    active_jobs_count: int = Field(default=0, ge=0, description="Number of active jobs")
    total_jobs_count: int = Field(default=0, ge=0, description="Total number of jobs")
    historical_jobs_count: int = Field(default=0, ge=0, description="Number of historical jobs")
    realtime_jobs_count: int = Field(default=0, ge=0, description="Number of active real-time jobs")
    historical_jobs_limit: Optional[int] = Field(None, description="Historical jobs limit (None = unlimited)")
    realtime_jobs_limit: Optional[int] = Field(None, description="Real-time jobs limit (None = unlimited)")
    can_create_historical_job: bool = Field(default=True, description="Whether user can create historical jobs")
    can_create_realtime_job: bool = Field(default=True, description="Whether user can create real-time jobs")
    can_create_job: bool = Field(default=True, description="Whether user can create new jobs (messages limit)")
    historical_job_blocked_reason: Optional[str] = Field(None, description="Reason why historical jobs are blocked")
    realtime_job_blocked_reason: Optional[str] = Field(None, description="Reason why real-time jobs are blocked")
    message_limit_blocked_reason: Optional[str] = Field(None, description="Reason why message limit is reached")
    limit_message: Optional[str] = Field(None, description="General limit warning/error message")

    class Config:
        """Pydantic config."""

        use_enum_values = True


class ActivationKeyRequest(BaseModel):
    """Activation key request model."""

    phone_number: str = Field(..., description="User's phone number")
    activation_key: str = Field(..., min_length=10, description="Activation key to redeem")


class ActivationKeyResponse(BaseModel):
    """Activation key response model."""

    message: str = Field(..., description="Success message")
    plan: UserPlan = Field(..., description="New plan type")
    plan_expiry: datetime = Field(..., description="Plan expiration date")

    class Config:
        """Pydantic config."""

        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PlanFeature(BaseModel):
    """Plan feature model."""

    name: str = Field(..., description="Feature name")
    description: str = Field(..., description="Feature description")
    included: bool = Field(..., description="Whether feature is included in plan")


class PlanInfo(BaseModel):
    """Plan information model."""

    type: UserPlan = Field(..., description="Plan type")
    name: str = Field(..., description="Plan display name")
    price: str = Field(..., description="Plan price (for display)")
    features: List[PlanFeature] = Field(..., description="List of features")
    usage_limit: Optional[int] = Field(None, description="Daily message limit (None = unlimited)")
    historical_jobs_limit: Optional[int] = Field(None, description="Historical jobs limit (None = unlimited)")
    realtime_jobs_limit: Optional[int] = Field(None, description="Real-time jobs limit (None = unlimited)")
    real_time_copy: bool = Field(..., description="Real-time copy support")
    media_copy: bool = Field(..., description="Media copy support")
    priority_support: bool = Field(..., description="Priority support")

    class Config:
        """Pydantic config."""

        use_enum_values = True


class PlansResponse(BaseModel):
    """Available plans response model."""

    plans: List[PlanInfo] = Field(..., description="List of available plans")


class ProfileUpdateRequest(BaseModel):
    """Profile update request model."""

    phone_number: str = Field(..., description="User's phone number")
    display_name: str = Field(..., min_length=1, max_length=100, description="New display name")


class ProfileUpdateResponse(BaseModel):
    """Profile update response model."""

    message: str = Field(..., description="Success message")
    display_name: str = Field(..., description="Updated display name")
