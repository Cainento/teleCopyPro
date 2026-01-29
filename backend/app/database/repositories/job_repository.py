"""Copy job repository for database operations."""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database.models import CopyJob


class JobRepository:
    """Repository for CopyJob database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create(
        self,
        job_id: str,
        user_id: int,
        source_channel: str,
        destination_channel: str,
        mode: str,
    ) -> CopyJob:
        """Create a new copy job."""
        job = CopyJob(
            job_id=job_id,
            user_id=user_id,
            source_channel=source_channel,
            destination_channel=destination_channel,
            mode=mode,
            status="pending",
        )
        self.db.add(job)
        await self.db.flush()
        await self.db.refresh(job)
        return job

    async def get_by_id(self, job_id: str) -> Optional[CopyJob]:
        """Get job by job ID."""
        result = await self.db.execute(
            select(CopyJob)
            .options(joinedload(CopyJob.user))
            .where(CopyJob.job_id == job_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: int, skip: int = 0, limit: int = 100) -> List[CopyJob]:
        """Get all jobs for a user."""
        result = await self.db.execute(
            select(CopyJob)
            .options(joinedload(CopyJob.user))
            .where(CopyJob.user_id == user_id)
            .order_by(CopyJob.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_active_jobs_by_user(self, user_id: int) -> List[CopyJob]:
        """Get active jobs (running or pending) for a user."""
        result = await self.db.execute(
            select(CopyJob)
            .options(joinedload(CopyJob.user))
            .where(
                CopyJob.user_id == user_id,
                CopyJob.status.in_(["pending", "running"]),
            )
        )
        return list(result.scalars().all())

    async def get_real_time_jobs_by_user(self, user_id: int) -> List[CopyJob]:
        """Get active real-time jobs for a user."""
        result = await self.db.execute(
            select(CopyJob)
            .options(joinedload(CopyJob.user))
            .where(
                CopyJob.user_id == user_id,
                CopyJob.mode == "real_time",
                CopyJob.status == "running",
            )
        )
        return list(result.scalars().all())

    async def get_all_running_real_time_jobs(self) -> List[CopyJob]:
        """Get all running real-time jobs across all users."""
        result = await self.db.execute(
            select(CopyJob)
            .options(joinedload(CopyJob.user))
            .where(
                CopyJob.mode == "real_time",
                CopyJob.status == "running",
            )
        )
        return list(result.scalars().all())

    async def count_historical_jobs_today(self, user_id: int) -> int:
        """Count historical jobs created today by user."""
        from sqlalchemy import func

        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        result = await self.db.execute(
            select(func.count(CopyJob.id)).where(
                CopyJob.user_id == user_id,
                CopyJob.mode == "historical",
                CopyJob.created_at >= today_start,
            )
        )
        return result.scalar() or 0

    async def update_status(
        self,
        job: CopyJob,
        status: str,
        error_message: Optional[str] = None,
        status_message: Optional[str] = None,
    ) -> CopyJob:
        """Update job status."""
        job.status = status
        
        # Update status message if provided, or clear if None (optional behavior choice, here we update if provided)
        # Actually, let's allow clearing it if passed explicitly as None?
        # For simplicity: if status_message is passed, update it.
        # But default is None. We might want to clear it when status changes to running?
        # Let's just update if argument is passed (we need to change signature default logic if we want to differentiate "no change" vs "clear")
        # To avoid complexity: We will set it to whatever is passed. If we want to keep it, caller must pass it or we need different logic.
        # Better logic: Always update status_message if it's in the args.
        if status_message is not None:
             job.status_message = status_message
        elif status == "running" and job.status == "paused":
             # Optional: clear status message on resume?
             pass

        if status == "running" and job.started_at is None:
            job.started_at = datetime.now(timezone.utc)
        elif status == "completed":
            job.completed_at = datetime.now(timezone.utc)
            job.progress_percentage = 100.0
            job.status_message = None # Clear status message on completion
        elif status == "stopped":
            job.stopped_at = datetime.now(timezone.utc)
            job.status_message = None # Clear status message on stop
        elif status == "failed":
            job.completed_at = datetime.now(timezone.utc)
            job.error_message = error_message
            # Keep status message if it explains failure? Or clear?
            # job.status_message = None

        await self.db.flush()
        await self.db.refresh(job)
        return job

    async def update_progress(
        self,
        job: CopyJob,
        copied_messages: int,
        total_messages: Optional[int] = None,
        failed_messages: Optional[int] = None,
    ) -> CopyJob:
        """Update job progress."""
        job.copied_messages = copied_messages

        if total_messages is not None:
            job.total_messages = total_messages

        if failed_messages is not None:
            job.failed_messages = failed_messages

        # Calculate percentage
        if job.total_messages > 0:
            job.progress_percentage = (job.copied_messages / job.total_messages) * 100

        await self.db.flush()
        await self.db.refresh(job)
        return job

    async def delete(self, job: CopyJob) -> None:
        """Delete job."""
        await self.db.delete(job)
        await self.db.flush()
