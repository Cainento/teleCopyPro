"""Activation key repository for database operations."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import ActivationKey
from app.models.user import UserPlan


class KeyRepository:
    """Repository for ActivationKey database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create(
        self,
        key: str,
        plan_type: UserPlan,
        days_valid: int = 30,
    ) -> ActivationKey:
        """Create a new activation key."""
        activation_key = ActivationKey(
            key=key,
            plan_type=plan_type,
            days_valid=days_valid,
            is_used=False,
        )
        self.db.add(activation_key)
        await self.db.flush()
        await self.db.refresh(activation_key)
        return activation_key

    async def get_by_key(self, key: str) -> Optional[ActivationKey]:
        """Get activation key by key string."""
        result = await self.db.execute(select(ActivationKey).where(ActivationKey.key == key))
        return result.scalar_one_or_none()

    async def get_unused_keys(self, plan_type: Optional[UserPlan] = None) -> List[ActivationKey]:
        """Get all unused activation keys, optionally filtered by plan type."""
        query = select(ActivationKey).where(ActivationKey.is_used == False)

        if plan_type:
            query = query.where(ActivationKey.plan_type == plan_type)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def mark_as_used(self, activation_key: ActivationKey, user_id: int) -> ActivationKey:
        """Mark activation key as used."""
        activation_key.is_used = True
        activation_key.used_by_user_id = user_id
        activation_key.used_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(activation_key)
        return activation_key

    async def is_valid(self, key: str) -> bool:
        """Check if activation key exists and is unused."""
        activation_key = await self.get_by_key(key)
        return activation_key is not None and not activation_key.is_used

    async def delete(self, activation_key: ActivationKey) -> None:
        """Delete activation key."""
        await self.db.delete(activation_key)
        await self.db.flush()
