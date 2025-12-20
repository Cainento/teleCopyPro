"""User data model."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserPlan(str, Enum):
    """User plan types."""

    FREE = "free"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class UserBase(BaseModel):
    """Base user model with common fields."""

    phone_number: str = Field(..., description="User phone number (Telegram)")
    email: Optional[EmailStr] = Field(None, description="User email address")
    name: str = Field(..., min_length=1, max_length=100, description="User name")
    plan: UserPlan = Field(default=UserPlan.FREE, description="User plan type")
    usage_count: int = Field(default=0, ge=0, description="Number of copy operations used")
    is_admin: bool = Field(default=False, description="Whether the user has admin privileges")


class UserCreate(UserBase):
    """User creation model."""

    password: str = Field(..., min_length=6, description="User password")


class UserUpdate(BaseModel):
    """User update model."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    plan: Optional[UserPlan] = None
    usage_count: Optional[int] = Field(None, ge=0)
    plan_expiry: Optional[datetime] = None


class User(UserBase):
    """Complete user model."""

    id: Optional[int] = Field(None, description="User ID")
    plan_expiry: Optional[datetime] = Field(None, description="Plan expiration date")
    stripe_customer_id: Optional[str] = Field(None, description="Stripe customer ID")
    stripe_subscription_id: Optional[str] = Field(None, description="Stripe subscription ID")
    subscription_status: Optional[str] = Field(None, description="Stripe subscription status")
    subscription_period_end: Optional[datetime] = Field(None, description="Subscription period end date")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Account creation date")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update date")

    class Config:
        """Pydantic config."""

        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserResponse(UserBase):
    """User response model (without sensitive data)."""

    id: Optional[int] = None
    plan_expiry: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        """Pydantic config."""

        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

