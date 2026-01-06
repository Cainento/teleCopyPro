"""Background scheduler for plan expiry enforcement."""

import asyncio
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select, and_

from app.database.models import User
from app.database.connection import AsyncSessionLocal
from app.models.user import UserPlan
from app.services.telegram_service import TelegramService
from app.services.copy_service import CopyService
from app.database.repositories.job_repository import JobRepository

logger = logging.getLogger(__name__)


class PlanExpiryScheduler:
    """Background scheduler for checking and downgrading expired plans."""

    def __init__(self, interval_seconds: int = 3600):
        """
        Initialize scheduler.

        Args:
            interval_seconds: Interval between checks (default: 1 hour)
        """
        self.interval = interval_seconds
        self.running = False
        self._task: Optional[asyncio.Task] = None
        self.telegram_service: Optional[TelegramService] = None

    async def start(self):
        """Start the background scheduler."""
        if self.running:
            logger.warning("Plan expiry scheduler already running")
            return
        self.running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"Plan expiry scheduler started (interval: {self.interval}s)")

    async def stop(self):
        """Stop the background scheduler."""
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Plan expiry scheduler stopped")

    async def _run_loop(self):
        """Main scheduler loop."""
        while self.running:
            try:
                count = await self.check_and_downgrade_all_expired()
                if count > 0:
                    logger.info(f"Scheduler downgraded {count} expired accounts")
            except Exception as e:
                logger.error(f"Error in plan expiry scheduler: {e}", exc_info=True)
            
            # Wait for next interval
            await asyncio.sleep(self.interval)

    async def check_and_downgrade_all_expired(self) -> int:
        """
        Find and downgrade all expired premium accounts.

        Returns:
            Number of accounts downgraded
        """
        downgraded_count = 0
        
        async with AsyncSessionLocal() as db:
            try:
                now = datetime.utcnow()
                
                # Find all users with expired plans who are not on FREE
                result = await db.execute(
                    select(User).where(
                        and_(
                            User.plan != UserPlan.FREE,
                            User.plan_expiry.isnot(None),
                            User.plan_expiry < now
                        )
                    )
                )
                expired_users = result.scalars().all()

                # Downgrade each expired user
                for user in expired_users:
                    # Stop limits-breaking jobs (real-time jobs)
                    if self.telegram_service:
                        try:
                            # Initialize services with current session
                            copy_service = CopyService(self.telegram_service, db)
                            job_repo = JobRepository(db)

                            # Find active real-time jobs
                            real_time_jobs = await job_repo.get_real_time_jobs_by_user(user.id)
                            
                            for job in real_time_jobs:
                                logger.info(
                                    f"Stopping real-time job {job.job_id} for user {user.id} "
                                    f"due to plan expiry (downgrade to FREE)"
                                )
                                # Stop the job
                                await copy_service.stop_real_time_copy(job.job_id)
                                
                        except Exception as e:
                            logger.error(f"Error stopping real-time jobs for user {user.id}: {e}", exc_info=True)

                    old_plan = user.plan
                    user.plan = UserPlan.FREE
                    user.plan_expiry = None
                    user.updated_at = datetime.utcnow()
                    logger.info(
                        f"Auto-downgraded user {user.id} (phone={user.phone_number}) "
                        f"from {old_plan.value} to FREE"
                    )
                    downgraded_count += 1

                if expired_users:
                    await db.commit()

            except Exception as e:
                await db.rollback()
                logger.error(f"Error checking expired plans: {e}", exc_info=True)
                raise

        return downgraded_count


# Global scheduler instance
plan_expiry_scheduler = PlanExpiryScheduler(interval_seconds=3600)

