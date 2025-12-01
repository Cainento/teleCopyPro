"""User repository for database operations."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import User
from app.models.user import UserPlan


class UserRepository:
    """Repository for User database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create(
        self,
        email: str,
        name: str,
        phone_number: Optional[str] = None,
        firebase_uid: Optional[str] = None,
        plan: UserPlan = UserPlan.FREE,
    ) -> User:
        """Create a new user."""
        user = User(
            email=email,
            name=name,
            phone_number=phone_number,
            firebase_uid=firebase_uid,
            plan=plan,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def get_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone_number: str) -> Optional[User]:
        """Get user by phone number."""
        result = await self.db.execute(select(User).where(User.phone_number == phone_number))
        return result.scalar_one_or_none()

    async def get_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        """Get user by Firebase UID."""
        result = await self.db.execute(select(User).where(User.firebase_uid == firebase_uid))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all users with pagination."""
        result = await self.db.execute(select(User).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def update(self, user: User) -> User:
        """Update user."""
        user.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update_plan(
        self,
        user: User,
        plan: UserPlan,
        plan_expiry: Optional[datetime] = None,
        activation_key: Optional[str] = None,
    ) -> User:
        """Update user plan."""
        user.plan = plan
        user.plan_expiry = plan_expiry
        user.activation_key = activation_key
        user.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def increment_usage(self, user: User, count: int = 1) -> User:
        """Increment user usage count."""
        user.usage_count += count
        user.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update_stripe_info(
        self,
        user: User,
        stripe_customer_id: Optional[str] = None,
        stripe_subscription_id: Optional[str] = None,
        subscription_status: Optional[str] = None,
    ) -> User:
        """Update Stripe-related information."""
        if stripe_customer_id is not None:
            user.stripe_customer_id = stripe_customer_id
        if stripe_subscription_id is not None:
            user.stripe_subscription_id = stripe_subscription_id
        if subscription_status is not None:
            user.subscription_status = subscription_status
        user.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def delete(self, user: User) -> None:
        """Delete user."""
        await self.db.delete(user)
        await self.db.flush()

    async def get_users_expiring_in_days(self, days: int) -> List[User]:
        """Get users whose plans expire in the specified number of days."""
        from datetime import timedelta

        target_date = datetime.utcnow() + timedelta(days=days)
        # Get users expiring within 24 hours of the target date
        start_date = target_date - timedelta(hours=12)
        end_date = target_date + timedelta(hours=12)

        result = await self.db.execute(
            select(User).where(
                User.plan_expiry.between(start_date, end_date),
                User.plan != UserPlan.FREE,
            )
        )
        return list(result.scalars().all())

    async def get_by_stripe_customer_id(self, stripe_customer_id: str) -> Optional[User]:
        """Get user by Stripe customer ID."""
        result = await self.db.execute(
            select(User).where(User.stripe_customer_id == stripe_customer_id)
        )
        return result.scalar_one_or_none()

    async def get_by_stripe_subscription_id(self, stripe_subscription_id: str) -> Optional[User]:
        """Get user by Stripe subscription ID."""
        result = await self.db.execute(
            select(User).where(User.stripe_subscription_id == stripe_subscription_id)
        )
        return result.scalar_one_or_none()
