"""Admin service for system administration and statistics."""

from typing import List, Optional, Dict, Any
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, PermissionDenied
from app.core.logger import get_logger
from app.database.models import User as DBUser, CopyJob as DBCopyJob, TelegramSession
from app.models.user import User as PydanticUser, UserPlan, UserUpdate
from app.services.user_service import UserService

logger = get_logger(__name__)


class AdminService:
    """Service for admin dashboard and user management."""

    def __init__(self, db: AsyncSession):
        """
        Initialize admin service.

        Args:
            db: SQLAlchemy async session
        """
        self.db = db
        self.user_service = UserService(db)

    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """
        Get aggregated dashboard statistics.

        Returns:
            Dictionary with statistics
        """
        # User stats
        total_users = await self.db.scalar(select(func.count(DBUser.id)))
        premium_users = await self.db.scalar(select(func.count(DBUser.id)).where(DBUser.plan == UserPlan.PREMIUM))
        enterprise_users = await self.db.scalar(select(func.count(DBUser.id)).where(DBUser.plan == UserPlan.ENTERPRISE))
        
        # Job stats
        total_jobs = await self.db.scalar(select(func.count(DBCopyJob.id)))
        active_realtime_jobs = await self.db.scalar(
            select(func.count(DBCopyJob.id))
            .where(DBCopyJob.status == "running", DBCopyJob.mode == "real_time")
        )
        completed_jobs = await self.db.scalar(select(func.count(DBCopyJob.id)).where(DBCopyJob.status == "completed"))
        failed_jobs = await self.db.scalar(select(func.count(DBCopyJob.id)).where(DBCopyJob.status == "failed"))
        
        # Message stats
        total_messages = await self.db.scalar(select(func.sum(DBCopyJob.copied_messages))) or 0
        
        return {
            "users": {
                "total": total_users,
                "premium": premium_users,
                "enterprise": enterprise_users,
                "free": total_users - (premium_users + enterprise_users)
            },
            "jobs": {
                "total": total_jobs,
                "active_realtime": active_realtime_jobs,
                "completed": completed_jobs,
                "failed": failed_jobs
            },
            "messages": {
                "total_copied": total_messages
            }
        }

    async def get_users_paginated(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get paginated list of users.

        Args:
            skip: Number of records to skip
            limit: Number of records to return
            search: Optional search term (name, email, phone)

        Returns:
            Dictionary with items and total count
        """
        query = select(DBUser)
        
        if search:
            search_term = f"%{search}%"
            query = query.where(
                (DBUser.name.ilike(search_term)) | 
                (DBUser.email.ilike(search_term)) | 
                (DBUser.phone_number.ilike(search_term))
            )
            
        # Get total count for pagination
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)
        
        # Get paginated items sorted by creation date
        query = query.order_by(desc(DBUser.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(query)
        users = result.scalars().all()
        
        return {
            "items": [self.user_service._db_to_pydantic(user) for user in users],
            "total": total,
            "page": (skip // limit) + 1,
            "size": limit
        }

    async def get_user_details(self, user_id_or_phone: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed user information including active sessions and jobs.
        
        Args:
            user_id_or_phone: User ID or phone number
            
        Returns:
            Dictionary with user details
        """
        # Try to find user
        if user_id_or_phone.isdigit() and len(user_id_or_phone) < 10:
            # Likely an ID
            query = select(DBUser).where(DBUser.id == int(user_id_or_phone))
        else:
            # Phone number
            query = select(DBUser).where(DBUser.phone_number == user_id_or_phone)
            
        # Load relationships
        query = query.options(
            selectinload(DBUser.telegram_sessions),
            selectinload(DBUser.copy_jobs),
            selectinload(DBUser.invoices)
        )
        
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            return None
            
        pydantic_user = self.user_service._db_to_pydantic(user)
        
        # Format extra details
        sessions = [
            {
                "phone_number": s.phone_number,
                "is_active": s.is_active,
                "last_used": s.last_used_at
            } for s in user.telegram_sessions
        ]
        
        # Last 5 jobs
        jobs = sorted(user.copy_jobs, key=lambda x: x.created_at, reverse=True)[:5]
        recent_jobs = [
            {
                "id": j.job_id,
                "source": j.source_channel,
                "destination": j.destination_channel,
                "status": j.status,
                "copied": j.copied_messages,
                "created_at": j.created_at
            } for j in jobs
        ]
        
        return {
            "user": pydantic_user,
            "sessions": sessions,
            "recent_jobs": recent_jobs,
            "invoices_count": len(user.invoices)
        }

    async def update_user_admin_status(self, user_phone: str, is_admin: bool) -> PydanticUser:
        """
        Update user admin status.
        
        Args:
            user_phone: User phone number
            is_admin: New admin status
            
        Returns:
            Updated user
        """
        db_user = await self.user_service.get_db_user_by_phone(user_phone)
        if not db_user:
            raise NotFoundError(f"User {user_phone} not found")
            
        db_user.is_admin = is_admin
        await self.db.commit()
        await self.db.refresh(db_user)
        
        return self.user_service._db_to_pydantic(db_user)
