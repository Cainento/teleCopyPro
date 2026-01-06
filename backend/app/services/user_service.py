"""User service for managing users, plans, and usage tracking."""

import hashlib
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, NotFoundError, ValidationError
from app.core.logger import get_logger
from app.database.repositories.user_repository import UserRepository
from app.models.user import User as PydanticUser, UserCreate, UserPlan, UserUpdate
from app.database.models import User as DBUser
from app.services.telegram_service import TelegramService
from app.services.copy_service import CopyService
from app.database.repositories.job_repository import JobRepository


logger = get_logger(__name__)


class UserService:
    """Service for user management, plan validation, and usage tracking."""

    def __init__(self, db: AsyncSession, telegram_service: Optional[TelegramService] = None):
        """
        Initialize user service with database session.

        Args:
            db: SQLAlchemy async session
            telegram_service: Optional TelegramService for managing jobs
        """
        self.db = db
        self.user_repo = UserRepository(db)
        self.telegram_service = telegram_service

    def _hash_password(self, password: str) -> str:
        """
        Hash password using SHA256.

        Args:
            password: Plain text password

        Returns:
            Hashed password
        """
        return hashlib.sha256(password.encode()).hexdigest()

    def _verify_password(self, password: str, hashed: str) -> bool:
        """
        Verify password against hash.

        Args:
            password: Plain text password
            hashed: Hashed password

        Returns:
            True if password matches
        """
        return self._hash_password(password) == hashed

    def _db_to_pydantic(self, db_user: DBUser) -> PydanticUser:
        """
        Convert database user model to Pydantic user model.

        Args:
            db_user: Database user instance

        Returns:
            Pydantic user instance
        """
        return PydanticUser(
            id=db_user.id,
            phone_number=db_user.phone_number,
            email=db_user.email,
            name=db_user.name,
            plan=db_user.plan,
            usage_count=db_user.usage_count,
            plan_expiry=db_user.plan_expiry,
            stripe_customer_id=db_user.stripe_customer_id,
            stripe_subscription_id=db_user.stripe_subscription_id,
            subscription_status=db_user.subscription_status,
            subscription_period_end=db_user.subscription_period_end,
            is_admin=db_user.is_admin,
            created_at=db_user.created_at,
            updated_at=db_user.updated_at
        )

    async def create_user(self, user_data: UserCreate) -> PydanticUser:
        """
        Create a new user.

        Args:
            user_data: User creation data

        Returns:
            Created user

        Raises:
            ValidationError: If user already exists
        """
        existing_user = await self.user_repo.get_by_email(user_data.email.lower())
        if existing_user:
            raise ValidationError(f"Usuário com email {user_data.email} já existe")

        db_user = await self.user_repo.create(
            email=user_data.email.lower(),
            name=user_data.name,
            plan=user_data.plan,
        )

        logger.info(f"Created user: {db_user.email}")
        return self._db_to_pydantic(db_user)

    async def get_user(self, email: str) -> Optional[PydanticUser]:
        """
        Get user by email.

        Args:
            email: User email

        Returns:
            User or None if not found
        """
        db_user = await self.user_repo.get_by_email(email.lower())
        return self._db_to_pydantic(db_user) if db_user else None

    async def authenticate_user(self, email: str, password: str) -> PydanticUser:
        """
        Authenticate user with email and password.

        Args:
            email: User email
            password: User password

        Returns:
            Authenticated user

        Raises:
            AuthenticationError: If credentials are invalid
        """
        user = await self.get_user(email)
        if not user:
            raise AuthenticationError("Email ou senha incorretos")

        # For demo purposes - in production, verify against stored hash
        logger.info(f"User {email} authenticated")
        return user

    async def update_user(self, email: str, user_update: UserUpdate) -> PydanticUser:
        """
        Update user information.

        Args:
            email: User email
            user_update: User update data

        Returns:
            Updated user

        Raises:
            NotFoundError: If user is not found
        """
        db_user = await self.user_repo.get_by_email(email.lower())
        if not db_user:
            raise NotFoundError(f"Usuário {email} não encontrado")

        # Update fields
        update_data = user_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(db_user, key):
                setattr(db_user, key, value)

        updated_user = await self.user_repo.update(db_user)
        logger.info(f"Updated user: {email}")
        return self._db_to_pydantic(updated_user)

    def can_use_feature(self, user: PydanticUser, feature: str) -> bool:
        """
        Check if user can use a specific feature based on their plan.

        Args:
            user: User instance
            feature: Feature name (e.g., "real_time_copy")

        Returns:
            True if user can use the feature
        """
        if feature == "real_time_copy":
            return user.plan in [UserPlan.PREMIUM, UserPlan.ENTERPRISE]

        if feature == "unlimited_copy":
            return user.plan == UserPlan.ENTERPRISE

        # Default: all plans can use basic features
        return True

    def check_usage_limit(self, user: PydanticUser) -> tuple[bool, Optional[str]]:
        """
        Check if user has reached usage limit.

        Args:
            user: User instance

        Returns:
            Tuple of (can_use, error_message)
        """
        if user.plan == UserPlan.FREE:
            if user.usage_count >= 100:
                return False, "Você atingiu o limite de 100 conteúdos copiados. Atualize para um plano premium para continuar."

        # Premium and Enterprise have unlimited usage
        return True, None

    async def increment_usage(self, email: str) -> PydanticUser:
        """
        Increment usage count for a user.

        Args:
            email: User email

        Returns:
            Updated user

        Raises:
            NotFoundError: If user is not found
        """
        db_user = await self.user_repo.get_by_email(email.lower())
        if not db_user:
            raise NotFoundError(f"Usuário {email} não encontrado")

        updated_user = await self.user_repo.increment_usage(db_user)
        logger.debug(f"Incremented usage for user {email}: {updated_user.usage_count}")
        return self._db_to_pydantic(updated_user)

    def is_plan_expired(self, user: PydanticUser) -> bool:
        """
        Check if user's plan has expired.

        Args:
            user: User instance

        Returns:
            True if plan is expired
        """
        if user.plan == UserPlan.FREE:
            return False  # Free plan doesn't expire

        if not user.plan_expiry:
            return True  # No expiry date means expired

        return datetime.utcnow() > user.plan_expiry

    def check_can_create_historical_job(self, user: PydanticUser, current_historical_count: int) -> tuple[bool, Optional[str]]:
        """
        Check if user can create a new historical job.

        Args:
            user: User instance
            current_historical_count: Current number of historical jobs

        Returns:
            Tuple of (can_create, error_message)
        """
        limit = self.get_historical_jobs_limit(user.plan)

        if limit is None:
            return True, None  # Unlimited

        if current_historical_count >= limit:
            if user.plan == UserPlan.FREE:
                return False, f"Você atingiu o limite de {limit} jobs históricos do plano gratuito. Atualize para Premium ou Enterprise para criar mais jobs."
            elif user.plan == UserPlan.PREMIUM:
                return False, f"Você atingiu o limite de {limit} jobs históricos do plano Premium. Atualize para Enterprise para jobs ilimitados."

        return True, None

    def check_can_create_realtime_job(self, user: PydanticUser, current_realtime_count: int) -> tuple[bool, Optional[str]]:
        """
        Check if user can create a new real-time job.

        Args:
            user: User instance
            current_realtime_count: Current number of active real-time jobs

        Returns:
            Tuple of (can_create, error_message)
        """
        limit = self.get_realtime_jobs_limit(user.plan)

        if limit == 0:
            return False, "Jobs em tempo real não estão disponíveis no plano gratuito. Atualize para Premium ou Enterprise."

        if limit is None:
            return True, None  # Unlimited

        if current_realtime_count >= limit:
            return False, f"Você atingiu o limite de {limit} jobs em tempo real simultâneos do plano Premium. Atualize para Enterprise para jobs ilimitados."

        return True, None

    def check_daily_message_limit(self, user: PydanticUser, messages_today: int) -> tuple[bool, Optional[str]]:
        """
        Check if user has reached daily message limit.

        Args:
            user: User instance
            messages_today: Number of messages copied today

        Returns:
            Tuple of (can_copy, error_message)
        """
        limit = self.get_usage_limit(user.plan)

        if limit is None:
            return True, None  # Unlimited

        if messages_today >= limit:
            if user.plan == UserPlan.FREE:
                return False, f"Você atingiu o limite diário de {limit} mensagens do plano gratuito. Atualize para Premium (10.000/dia) ou Enterprise (ilimitado)."
            elif user.plan == UserPlan.PREMIUM:
                return False, f"Você atingiu o limite diário de {limit} mensagens do plano Premium. Atualize para Enterprise para mensagens ilimitadas."

        return True, None

    async def check_and_downgrade_expired_plans(self, email: str) -> Optional[PydanticUser]:
        """
        Check if user's plan is expired and downgrade to free if needed.

        Args:
            email: User email

        Returns:
            Updated user if downgraded, None otherwise
        """
        db_user = await self.user_repo.get_by_email(email.lower())
        if not db_user:
            return None

        pydantic_user = self._db_to_pydantic(db_user)
        if self.is_plan_expired(pydantic_user):
            # Stop limits-breaking jobs (real-time jobs)
            if self.telegram_service:
                try:
                    # Initialize services
                    copy_service = CopyService(self.telegram_service, self.db)
                    job_repo = JobRepository(self.db)

                    # Find active real-time jobs
                    real_time_jobs = await job_repo.get_real_time_jobs_by_user(db_user.id)
                    
                    for job in real_time_jobs:
                        logger.info(
                            f"Stopping real-time job {job.job_id} for user {email} "
                            f"due to plan expiry (downgrade to FREE)"
                        )
                        # Stop the job
                        await copy_service.stop_real_time_copy(job.job_id)
                        
                except Exception as e:
                    logger.error(f"Error stopping real-time jobs for user {email}: {e}", exc_info=True)

            updated_user = await self.user_repo.update_plan(
                db_user,
                plan=UserPlan.FREE,
                plan_expiry=None
            )

            logger.info(f"Downgraded expired plan for user {email}")
            return self._db_to_pydantic(updated_user)

        return None

    async def check_and_downgrade_expired_plans_by_phone(self, phone_number: str) -> Optional[PydanticUser]:
        """
        Check if user's plan is expired and downgrade to free if needed.
        Uses phone number for Telegram-based authentication flow.

        Args:
            phone_number: User's phone number

        Returns:
            Updated user if downgraded, None otherwise
        """
        db_user = await self.user_repo.get_by_phone(phone_number)
        if not db_user:
            return None

        pydantic_user = self._db_to_pydantic(db_user)
        if self.is_plan_expired(pydantic_user):
            # Stop limits-breaking jobs (real-time jobs)
            if self.telegram_service:
                try:
                    # Initialize services
                    copy_service = CopyService(self.telegram_service, self.db)
                    job_repo = JobRepository(self.db)

                    # Find active real-time jobs
                    real_time_jobs = await job_repo.get_real_time_jobs_by_user(db_user.id)
                    
                    for job in real_time_jobs:
                        logger.info(
                            f"Stopping real-time job {job.job_id} for user {phone_number} "
                            f"due to plan expiry (downgrade to FREE)"
                        )
                        # Stop the job
                        await copy_service.stop_real_time_copy(job.job_id)
                        
                except Exception as e:
                    logger.error(f"Error stopping real-time jobs for user {phone_number}: {e}", exc_info=True)

            updated_user = await self.user_repo.update_plan(
                db_user,
                plan=UserPlan.FREE,
                plan_expiry=None
            )
            await self.db.commit()  # Ensure changes are committed

            logger.info(f"Downgraded expired plan for user phone={phone_number}")
            return self._db_to_pydantic(updated_user)

        return None

    # Phone number-based methods (for Telegram authentication)

    async def get_user_by_phone(self, phone_number: str) -> Optional[PydanticUser]:
        """
        Get user by phone number.

        Args:
            phone_number: User's phone number

        Returns:
            User or None if not found
        """
        db_user = await self.user_repo.get_by_phone(phone_number)
        return self._db_to_pydantic(db_user) if db_user else None

    async def get_db_user_by_phone(self, phone_number: str) -> Optional[DBUser]:
        """
        Get database user model by phone number (for internal use).

        Args:
            phone_number: User's phone number

        Returns:
            Database user model or None if not found
        """
        return await self.user_repo.get_by_phone(phone_number)

    async def get_or_create_user_by_phone(self, phone_number: str, display_name: Optional[str] = None) -> PydanticUser:
        """
        Get existing user or create new one by phone number.

        Args:
            phone_number: User's phone number
            display_name: Optional display name

        Returns:
            User instance
        """
        db_user = await self.user_repo.get_by_phone(phone_number)
        if db_user:
            return self._db_to_pydantic(db_user)

        # Create new user with phone number
        db_user = await self.user_repo.create(
            email=f"{phone_number}@telegram.user",  # Dummy email for compatibility
            name=display_name or phone_number,
            phone_number=phone_number,
            plan=UserPlan.FREE,
        )

        logger.info(f"Created new user for phone: {phone_number}")
        return self._db_to_pydantic(db_user)

    async def update_user_by_phone(self, phone_number: str, display_name: Optional[str] = None) -> PydanticUser:
        """
        Update user information by phone number.

        Args:
            phone_number: User's phone number
            display_name: New display name

        Returns:
            Updated user

        Raises:
            NotFoundError: If user is not found
        """
        db_user = await self.user_repo.get_by_phone(phone_number)
        if not db_user:
            raise NotFoundError(f"Usuário com telefone {phone_number} não encontrado")

        if display_name is not None:
            db_user.name = display_name

        updated_user = await self.user_repo.update(db_user)
        logger.info(f"Updated user: {phone_number}")
        return self._db_to_pydantic(updated_user)

    async def increment_usage_by_phone(self, phone_number: str) -> PydanticUser:
        """
        Increment usage count for a user by phone number.

        Args:
            phone_number: User's phone number

        Returns:
            Updated user

        Raises:
            NotFoundError: If user is not found
        """
        pydantic_user = await self.get_or_create_user_by_phone(phone_number)
        db_user = await self.user_repo.get_by_phone(phone_number)

        updated_user = await self.user_repo.increment_usage(db_user)
        logger.debug(f"Incremented usage for user {phone_number}: {updated_user.usage_count}")
        return self._db_to_pydantic(updated_user)

    def get_usage_limit(self, plan: UserPlan) -> Optional[int]:
        """
        Get daily message limit for a plan.

        Args:
            plan: User plan

        Returns:
            Daily message limit (None = unlimited)
        """
        if plan == UserPlan.FREE:
            return 1000  # 1,000 messages per day
        elif plan == UserPlan.PREMIUM:
            return 10000  # 10,000 messages per day
        # Enterprise has unlimited messages
        return None

    def get_historical_jobs_limit(self, plan: UserPlan) -> Optional[int]:
        """
        Get maximum number of historical jobs for a plan.

        Args:
            plan: User plan

        Returns:
            Historical jobs limit (None = unlimited)
        """
        if plan == UserPlan.FREE:
            return 3
        elif plan == UserPlan.PREMIUM:
            return 20
        # Enterprise has unlimited jobs
        return None

    def get_realtime_jobs_limit(self, plan: UserPlan) -> Optional[int]:
        """
        Get maximum number of real-time jobs for a plan.

        Args:
            plan: User plan

        Returns:
            Real-time jobs limit (None = unlimited)
        """
        if plan == UserPlan.FREE:
            return 0  # No real-time jobs for free plan
        elif plan == UserPlan.PREMIUM:
            return 5
        # Enterprise has unlimited real-time jobs
        return None

    def get_plan_info_list(self) -> list[dict]:
        """
        Get list of all available plans with their information.

        Returns:
            List of plan information dictionaries
        """
        return [
            {
                "type": UserPlan.FREE,
                "name": "Gratuito",
                "price": "R$ 0/mês",
                "features": [
                    {"name": "Até 3 jobs históricos", "description": "Máximo de 3 jobs de cópia histórica", "included": True},
                    {"name": "1.000 mensagens por dia", "description": "Limite diário de 1.000 mensagens", "included": True},
                    {"name": "Suporte a mídia", "description": "Copiar fotos, vídeos e arquivos", "included": True},
                    {"name": "Jobs em tempo real", "description": "Copiar mensagens em tempo real", "included": False},
                    {"name": "Suporte prioritário", "description": "Atendimento prioritário", "included": False},
                ],
                "usage_limit": 1000,
                "historical_jobs_limit": 3,
                "realtime_jobs_limit": 0,
                "real_time_copy": False,
                "media_copy": True,
                "priority_support": False,
            },
            {
                "type": UserPlan.PREMIUM,
                "name": "Premium",
                "price": "R$ 29,90/mês",
                "features": [
                    {"name": "Até 20 jobs históricos", "description": "Máximo de 20 jobs de cópia histórica", "included": True},
                    {"name": "10.000 mensagens por dia", "description": "Limite diário de 10.000 mensagens", "included": True},
                    {"name": "Suporte a mídia", "description": "Copiar fotos, vídeos e arquivos", "included": True},
                    {"name": "Até 5 jobs em tempo real", "description": "Máximo de 5 jobs em tempo real simultâneos", "included": True},
                    {"name": "Suporte prioritário", "description": "Atendimento prioritário", "included": True},
                ],
                "usage_limit": 10000,
                "historical_jobs_limit": 20,
                "realtime_jobs_limit": 5,
                "real_time_copy": True,
                "media_copy": True,
                "priority_support": True,
            },
            {
                "type": UserPlan.ENTERPRISE,
                "name": "Enterprise",
                "price": "R$ 99,90/mês",
                "features": [
                    {"name": "Jobs históricos ilimitados", "description": "Sem limite de jobs históricos", "included": True},
                    {"name": "Mensagens ilimitadas", "description": "Sem limite de mensagens por dia", "included": True},
                    {"name": "Suporte a mídia", "description": "Copiar fotos, vídeos e arquivos", "included": True},
                    {"name": "Jobs em tempo real ilimitados", "description": "Sem limite de jobs em tempo real", "included": True},
                    {"name": "Suporte prioritário", "description": "Atendimento prioritário", "included": True},
                ],
                "usage_limit": None,
                "historical_jobs_limit": None,
                "realtime_jobs_limit": None,
                "real_time_copy": True,
                "media_copy": True,
                "priority_support": True,
            },
        ]
