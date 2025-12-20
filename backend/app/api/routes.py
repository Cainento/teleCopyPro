"""API route definitions."""

from datetime import datetime
from typing import Optional

import stripe
from fastapi import APIRouter, BackgroundTasks, Depends, Request, Header
from fastapi.responses import HTMLResponse, JSONResponse

from app.api.dependencies import (
    get_copy_service,
    get_current_user,
    get_pagbank_service,
    get_session_service,
    get_stripe_service,
    get_telegram_service,
    get_user_service,
    get_admin_service,
)
from app.core.exceptions import AuthenticationError, NotFoundError, TeleCopyException, ValidationError
from app.core.logger import get_logger
from app.core.security import create_access_token
from app.config import settings
from app.models.user import User as PydanticUser, UserPlan
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
from app.models.account import (
    AccountInfoResponse,
    PlanFeature,
    PlanInfo,
    PlansResponse,
    ProfileUpdateRequest,
    ProfileUpdateResponse,
    UsageStatsResponse,
)
from app.models.copy_job import CopyJobCreate, CopyJobResponse
from app.models.session import SessionResponse
from app.models.user import UserCreate, UserResponse
from app.services.copy_service import CopyService
from app.services.pagbank_service import PagBankService
from app.services.session_service import SessionService
from app.services.stripe_service import StripeService
from app.services.telegram_service import TelegramService
from app.services.user_service import UserService
from app.services.admin_service import AdminService

logger = get_logger(__name__)

router = APIRouter(prefix="/api/telegram", tags=["telegram"])
user_router = APIRouter(prefix="/api/user", tags=["user"])
stripe_router = APIRouter(prefix="/api/stripe", tags=["stripe"])
pagbank_router = APIRouter(prefix="/api/pagbank", tags=["pagbank"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])
webhook_router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.

    Returns:
        JSON with status, timestamp, and version
    """
    return JSONResponse(
        content={
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "2.0.0",
            "environment": settings.environment
        },
        status_code=200
    )


@router.post("/send_code")
@limiter.limit("5/minute")
async def send_code(
    request: Request,
    telegram_service: TelegramService = Depends(get_telegram_service),
    session_service: SessionService = Depends(get_session_service),
):
    """
    Send verification code to phone number.

    Request body:
        - phone_number: str
        - api_id: int
        - api_hash: str

    Returns:
        JSON with message and phone_code_hash
    """
    try:
        data = await request.json()
        logger.info(f"Received send_code request: {data}")

        phone_number = data.get("phone_number")
        api_id_raw = data.get("api_id")
        api_hash = data.get("api_hash")

        # Validate required fields
        if not phone_number:
            raise TeleCopyException("Número de telefone é obrigatório.", 400)
        if not api_id_raw:
            raise TeleCopyException("API ID é obrigatório.", 400)
        if not api_hash:
            raise TeleCopyException("API Hash é obrigatório.", 400)

        # Convert api_id to int
        try:
            api_id = int(api_id_raw)
        except (ValueError, TypeError):
            raise TeleCopyException(f"API ID inválido: deve ser um número inteiro.", 400)

        # Send verification code
        client, phone_code_hash = await telegram_service.send_verification_code(
            phone_number, api_id, api_hash
        )

        # Create temporary session
        await session_service.create_temp_session(
            phone_number, api_id, api_hash, client, phone_code_hash
        )

        return JSONResponse(
            content={
                "message": "Código de verificação enviado com sucesso.",
                "phone_code_hash": phone_code_hash
            },
            status_code=200
        )

    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in send_code: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao tentar enviar o código: {str(e)}", 500)


@router.post("/sign_in")
@limiter.limit("10/minute")
async def sign_in(
    request: Request,
    telegram_service: TelegramService = Depends(get_telegram_service),
    session_service: SessionService = Depends(get_session_service),
    user_service: UserService = Depends(get_user_service),
):
    """
    Verify phone code and complete authentication.

    Request body:
        - phone_number: str
        - phone_code: str

    Returns:
        JSON with success message and user info
    """
    try:
        data = await request.json()
        phone_number = data.get("phone_number")
        phone_code = data.get("phone_code")

        if not all([phone_number, phone_code]):
            raise TeleCopyException("Número de telefone e código são obrigatórios.", 400)

        # Get temporary session
        temp_session = await session_service.get_temp_session(phone_number)
        if not temp_session:
            raise TeleCopyException(
                "Sessão de login expirada ou não iniciada. Por favor, solicite o código novamente.",
                400
            )

        client = temp_session["client"]
        phone_code_hash = temp_session["phone_code_hash"]
        api_id = temp_session["api_id"]
        api_hash = temp_session["api_hash"]

        # Verify code
        try:
            user_info = await telegram_service.verify_code(
                client, phone_number, phone_code, phone_code_hash
            )

            # Remove temporary session (login successful)
            await session_service.remove_temp_session(phone_number)

            # Get or create user in database
            display_name = user_info.get("username") or user_info.get("first_name")
            user = await user_service.get_or_create_user_by_phone(phone_number, display_name)

            # Note: Session activity will be tracked on the next authenticated request
            # to avoid database transaction conflicts during login

            # Create JWT token
            access_token = create_access_token(
                data={"sub": phone_number},
                secret_key=settings.jwt_secret_key
            )

            return JSONResponse(
                content={
                    "message": "Login no Telegram realizado com sucesso.",
                    "access_token": access_token,
                    "token_type": "bearer",
                    "user_id": user_info["user_id"],
                    "username": user_info.get("username"),
                },
                status_code=200
            )

        except AuthenticationError as e:
            # Check if 2FA is required
            if e.details.get("requires_2fa"):
                # Don't remove session - keep it for 2FA verification
                logger.info(f"2FA required for {phone_number}, keeping session alive")
                return JSONResponse(
                    content={
                        "message": "Autenticação de dois fatores necessária. Por favor, insira sua senha 2FA.",
                        "requires_2fa": True
                    },
                    status_code=200
                )
            else:
                # Other authentication error
                raise

    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in sign_in: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao tentar fazer login: {str(e)}", 500)


@router.post("/sign_in_2fa")
@limiter.limit("10/minute")
async def sign_in_2fa(
    request: Request,
    telegram_service: TelegramService = Depends(get_telegram_service),
    session_service: SessionService = Depends(get_session_service),
    user_service: UserService = Depends(get_user_service),
):
    """
    Verify 2FA password.

    Request body:
        - phone_number: str
        - password: str

    Returns:
        JSON with success message and user info
    """
    try:
        data = await request.json()
        phone_number = data.get("phone_number")
        password = data.get("password")

        if not all([phone_number, password]):
            raise TeleCopyException("Número de telefone e senha são obrigatórios.", 400)

        # Get temporary session
        temp_session = await session_service.get_temp_session(phone_number)
        if not temp_session:
            raise TeleCopyException(
                "Sessão de login expirada ou não iniciada. Por favor, solicite o código novamente.",
                400
            )

        client = temp_session["client"]
        api_id = temp_session["api_id"]
        api_hash = temp_session["api_hash"]

        # Verify 2FA password
        user_info = await telegram_service.verify_2fa_password(client, password, phone_number)

        # Remove temporary session
        await session_service.remove_temp_session(phone_number)

        # Get or create user in database
        display_name = user_info.get("username") or user_info.get("first_name")
        user = await user_service.get_or_create_user_by_phone(phone_number, display_name)

        # Note: Session activity will be tracked on the next authenticated request
        # to avoid database transaction conflicts during login

        # Create JWT token
        access_token = create_access_token(
            data={"sub": phone_number},
            secret_key=settings.jwt_secret_key
        )

        return JSONResponse(
            content={
                "message": "Login no Telegram realizado com sucesso.",
                "access_token": access_token,
                "token_type": "bearer",
                "user_id": user_info["user_id"],
                "username": user_info.get("username"),
            },
            status_code=200
        )

    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in sign_in_2fa: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao verificar senha 2FA: {str(e)}", 500)


@router.get("/status")
async def get_status(
    api_id: Optional[int] = None,
    api_hash: Optional[str] = None,
    current_user: PydanticUser = Depends(get_current_user),
    telegram_service: TelegramService = Depends(get_telegram_service),
):
    """
    Check Telegram session status for authenticated user.

    Query parameters:
        - api_id: int (optional)
        - api_hash: str (optional)

    Returns:
        JSON with connection status
    """
    try:
        # Use phone number from authenticated user
        phone_number = current_user.phone_number
        session = await telegram_service.check_session_status(phone_number, api_id, api_hash)

        return JSONResponse(
            content=SessionResponse(
                connected=session.is_authorized,
                message="Conectado." if session.is_authorized else "Desconectado.",
                status=session.status,
                user_id=session.user_id
            ).model_dump(),
            status_code=200
        )

    except Exception as e:
        logger.error(f"Error in get_status: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao verificar status: {str(e)}", 500)


@router.post("/logout")
async def logout(
    request: Request,
    current_user: PydanticUser = Depends(get_current_user),
    telegram_service: TelegramService = Depends(get_telegram_service),
):
    """
    Logout user by disconnecting Telegram session and deleting session file.

    Query parameters (optional):
        - api_id: int
        - api_hash: str

    Returns:
        JSON with success message
    """
    try:
        data = await request.json() if request.headers.get("content-length") else {}
        phone_number = current_user.phone_number
        api_id = data.get("api_id")
        api_hash = data.get("api_hash")

        # Logout (disconnect and delete session)
        await telegram_service.logout(phone_number, api_id, api_hash)

        return JSONResponse(
            content={
                "message": "Logout realizado com sucesso. Sessão do Telegram desconectada."
            },
            status_code=200
        )

    except Exception as e:
        logger.error(f"Error in logout: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao fazer logout: {str(e)}", 500)


@router.post("/copy")
async def copy_channel(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: PydanticUser = Depends(get_current_user),
    telegram_service: TelegramService = Depends(get_telegram_service),
    copy_service: CopyService = Depends(get_copy_service),
    user_service: UserService = Depends(get_user_service),
):
    """
    Copy messages from source channel to target channel.

    Request body:
        - source_channel: str
        - target_channel: str
        - real_time: bool (optional, default: False)
        - copy_media: bool (optional, default: True)

    Returns:
        JSON with job information
    """
    try:
        data = await request.json()
        # Get phone number from authenticated user
        phone_number = current_user.phone_number
        source_channel = data.get("source_channel")
        target_channel = data.get("target_channel")
        real_time = data.get("real_time", False)
        copy_media = data.get("copy_media", True)

        if not all([source_channel, target_channel]):
            raise TeleCopyException(
                "Canal de origem e canal de destino são obrigatórios.",
                400
            )

        # Get API credentials from request or stored session
        api_id = data.get("api_id")
        api_hash = data.get("api_hash")
        
        # Check if session exists and is authorized
        session = await telegram_service.check_session_status(
            phone_number, api_id, api_hash
        )
        if not session.is_authorized:
            raise TeleCopyException(
                "Sessão do Telegram não encontrada ou não autorizada. Por favor, conecte-se primeiro.",
                401
            )

        # Use credentials from session if not provided in request
        if api_id is None:
            api_id = session.api_id
        if api_hash is None:
            api_hash = session.api_hash

        # Get or create user
        user = await user_service.get_or_create_user_by_phone(phone_number)

        # Get user's jobs for validation
        jobs = await copy_service.get_user_jobs(phone_number)

        # Check daily message limit
        messages_today = 0
        today = datetime.utcnow().date()
        for job in jobs:
            if job.started_at and hasattr(job.started_at, 'date') and job.started_at.date() == today:
                messages_today += job.messages_copied

        can_copy, limit_msg = user_service.check_daily_message_limit(user, messages_today)
        if not can_copy:
            raise TeleCopyException(limit_msg, 403)

        if real_time:
            # Check real-time job limits
            active_realtime_count = len([j for j in jobs if j.real_time and j.status == "running"])
            can_create, limit_msg = user_service.check_can_create_realtime_job(user, active_realtime_count)
            if not can_create:
                raise TeleCopyException(limit_msg, 403)
            # Start real-time copy
            job = await copy_service.start_real_time_copy(
                phone_number, source_channel, target_channel, copy_media, api_id, api_hash
            )
            message = f"Cópia em tempo real iniciada de {source_channel} para {target_channel}."
        else:
            # Check historical job limits
            historical_count = len([j for j in jobs if not j.real_time])
            can_create, limit_msg = user_service.check_can_create_historical_job(user, historical_count)
            if not can_create:
                raise TeleCopyException(limit_msg, 403)
            # Create job first for historical copy
            job = await copy_service.create_historical_job(
                phone_number, source_channel, target_channel, copy_media
            )
            
            # Start historical copy in background
            async def copy_task():
                try:
                    await copy_service.copy_messages_historical(
                        phone_number, source_channel, target_channel, copy_media, api_id, api_hash, job.id
                    )
                except Exception as e:
                    logger.error(f"Background copy task failed: {e}", exc_info=True)

            background_tasks.add_task(copy_task)
            message = f"Cópia histórica iniciada de {source_channel} para {target_channel}."

        return JSONResponse(
            content={
                "message": message,
                "job_id": job.id if job else None,
                "status": job.status if job else "pending"
            },
            status_code=200
        )

    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in copy_channel: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao iniciar cópia: {str(e)}", 500)


@router.get("/jobs")
async def list_jobs(
    current_user: PydanticUser = Depends(get_current_user),
    copy_service: CopyService = Depends(get_copy_service),
):
    """
    List all active jobs for the authenticated user.

    Returns:
        JSON with list of jobs
    """
    try:
        # Get phone number from authenticated user
        phone_number = current_user.phone_number
        jobs = await copy_service.get_user_jobs(phone_number)

        def format_timestamp(ts):
            """Format timestamp, handling both datetime and float (legacy) values."""
            if ts is None:
                return None
            if isinstance(ts, str):
                return ts
            if hasattr(ts, 'isoformat'):
                return ts.isoformat()
            # Legacy float timestamp - skip it
            return None

        return JSONResponse(
            content={
                "jobs": [
                    {
                        "id": job.id,
                        "phone_number": job.phone_number,
                        "source_channel": job.source_channel,
                        "target_channel": job.target_channel,
                        "status": job.status,
                        "real_time": job.real_time,
                        "copy_media": job.copy_media,
                        "messages_copied": job.messages_copied,
                        "messages_failed": job.messages_failed,
                        "started_at": format_timestamp(job.started_at),
                        "completed_at": format_timestamp(job.completed_at),
                        "created_at": format_timestamp(job.created_at),
                        "error_message": job.error_message,
                    }
                    for job in jobs
                ]
            },
            status_code=200
        )
    except Exception as e:
        logger.error(f"Error in list_jobs: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao listar jobs: {str(e)}", 500)


@router.get("/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: PydanticUser = Depends(get_current_user),
    copy_service: CopyService = Depends(get_copy_service),
):
    """
    Get copy job status and progress for authenticated user.

    Path parameters:
        - job_id: str

    Returns:
        JSON with job information
    """
    try:
        job = await copy_service.get_job(job_id)
        if not job:
            raise TeleCopyException(f"Job {job_id} não encontrado.", 404)

        # Verify the job belongs to the authenticated user
        if job.phone_number != current_user.phone_number:
            raise TeleCopyException("Acesso negado a este job.", 403)

        def format_timestamp(ts):
            """Format timestamp, handling both datetime and float (legacy) values."""
            if ts is None:
                return None
            if isinstance(ts, str):
                return ts
            if hasattr(ts, 'isoformat'):
                return ts.isoformat()
            # Legacy float timestamp - skip it
            return None

        return JSONResponse(
            content={
                "id": job.id,
                "phone_number": job.phone_number,
                "source_channel": job.source_channel,
                "target_channel": job.target_channel,
                "status": job.status,
                "real_time": job.real_time,
                "copy_media": job.copy_media,
                "messages_copied": job.messages_copied,
                "messages_failed": job.messages_failed,
                "started_at": format_timestamp(job.started_at),
                "completed_at": format_timestamp(job.completed_at),
                "created_at": format_timestamp(job.created_at),
                "error_message": job.error_message,
            },
            status_code=200
        )
    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in get_job_status: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao obter status do job: {str(e)}", 500)


@router.post("/copy/{job_id}/stop")
async def stop_copy(
    job_id: str,
    current_user: PydanticUser = Depends(get_current_user),
    copy_service: CopyService = Depends(get_copy_service),
):
    """
    Stop a copy job (both real-time and historical) for authenticated user.

    Path parameters:
        - job_id: str

    Returns:
        JSON with success message
    """
    try:
        # Verify the job belongs to the authenticated user
        job = await copy_service.get_job(job_id)
        if not job:
            raise TeleCopyException(f"Job {job_id} não encontrado.", 404)
        if job.phone_number != current_user.phone_number:
            raise TeleCopyException("Acesso negado a este job.", 403)

        logger.info(f"Stopping job {job_id}")
        await copy_service.stop_real_time_copy(job_id)
        logger.info(f"Job {job_id} stopped successfully")
        return JSONResponse(
            content={
                "message": f"Job {job_id} parado com sucesso.",
                "job_id": job_id
            },
            status_code=200
        )
    except TeleCopyException as e:
        logger.error(f"TeleCopyException in stop_copy: {e}")
        raise
    except Exception as e:
        logger.error(f"Error in stop_copy: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao parar job: {str(e)}", 500)


# User account management endpoints

@user_router.get("/account")
async def get_account_info(
    current_user: PydanticUser = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """
    Get user account information for authenticated user.

    Returns:
        JSON with account information
    """
    try:
        # Use authenticated user's phone number
        phone_number = current_user.phone_number
        # Get or create user
        user = await user_service.get_or_create_user_by_phone(phone_number)

        response_data = AccountInfoResponse(
            phone_number=phone_number,
            display_name=user.name,
            plan=user.plan,
            plan_expiry=user.plan_expiry,
            usage_count=user.usage_count,
            created_at=user.created_at,
            is_admin=user.is_admin
        )
        logger.info(f"Returning account info for {phone_number}: is_admin={user.is_admin}")
        return JSONResponse(
            content=response_data.model_dump(mode='json'),
            status_code=200
        )

    except Exception as e:
        logger.error(f"Error in get_account_info: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao obter informações da conta: {str(e)}", 500)


@user_router.get("/usage")
async def get_usage_stats(
    current_user: PydanticUser = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
    copy_service: CopyService = Depends(get_copy_service),
):
    """
    Get usage statistics for authenticated user.

    Returns:
        JSON with usage statistics
    """
    try:
        # Use authenticated user's phone number
        phone_number = current_user.phone_number
        # Get or create user
        user = await user_service.get_or_create_user_by_phone(phone_number)

        # Get usage limit
        usage_limit = user_service.get_usage_limit(user.plan)

        # Get job statistics
        jobs = await copy_service.get_user_jobs(phone_number)
        active_jobs_count = len([j for j in jobs if j.status == "running"])
        total_jobs_count = len(jobs)
        historical_jobs_count = len([j for j in jobs if not j.real_time])
        realtime_jobs_count = len([j for j in jobs if j.real_time and j.status == "running"])

        # Calculate messages copied today
        messages_today = 0
        today = datetime.utcnow().date()
        for job in jobs:
            if job.started_at and hasattr(job.started_at, 'date') and job.started_at.date() == today:
                messages_today += job.messages_copied

        # Calculate usage percentage
        usage_percentage = 0.0
        if usage_limit:
            usage_percentage = min((messages_today / usage_limit) * 100, 100.0)

        # Check limits and get specific reasons
        can_create_msg, msg_limit_reason = user_service.check_daily_message_limit(user, messages_today)
        can_create_hist, hist_blocked_reason = user_service.check_can_create_historical_job(user, historical_jobs_count)
        can_create_rt, rt_blocked_reason = user_service.check_can_create_realtime_job(user, realtime_jobs_count)

        # Get limits
        historical_jobs_limit = user_service.get_historical_jobs_limit(user.plan)
        realtime_jobs_limit = user_service.get_realtime_jobs_limit(user.plan)

        # Determine general limit message (prioritize most restrictive)
        limit_message = None
        if not can_create_msg:
            limit_message = msg_limit_reason
        elif not can_create_hist and not can_create_rt:
            limit_message = "Você atingiu os limites do seu plano. Faça upgrade para continuar."
        elif not can_create_hist:
            limit_message = hist_blocked_reason
        elif not can_create_rt:
            limit_message = rt_blocked_reason

        response_data = UsageStatsResponse(
            phone_number=phone_number,
            plan=user.plan,
            usage_count=user.usage_count,
            usage_limit=usage_limit,
            usage_percentage=usage_percentage,
            messages_copied_today=messages_today,
            active_jobs_count=active_jobs_count,
            total_jobs_count=total_jobs_count,
            historical_jobs_count=historical_jobs_count,
            realtime_jobs_count=realtime_jobs_count,
            historical_jobs_limit=historical_jobs_limit,
            realtime_jobs_limit=realtime_jobs_limit,
            can_create_historical_job=can_create_hist,
            can_create_realtime_job=can_create_rt,
            can_create_job=can_create_msg,
            historical_job_blocked_reason=hist_blocked_reason,
            realtime_job_blocked_reason=rt_blocked_reason,
            message_limit_blocked_reason=msg_limit_reason,
            limit_message=limit_message
        )
        return JSONResponse(
            content=response_data.model_dump(mode='json'),
            status_code=200
        )

    except Exception as e:
        logger.error(f"Error in get_usage_stats: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao obter estatísticas de uso: {str(e)}", 500)


@user_router.get("/plans")
async def get_plans(
    user_service: UserService = Depends(get_user_service),
):
    """
    Get available plans information.

    Returns:
        JSON with list of available plans
    """
    try:
        plans_data = user_service.get_plan_info_list()

        # Convert to PlanInfo objects
        plans = []
        for plan_data in plans_data:
            plan_info = PlanInfo(
                type=plan_data["type"],
                name=plan_data["name"],
                price=plan_data["price"],
                features=[
                    PlanFeature(
                        name=f["name"],
                        description=f["description"],
                        included=f["included"]
                    ) for f in plan_data["features"]
                ],
                usage_limit=plan_data["usage_limit"],
                historical_jobs_limit=plan_data["historical_jobs_limit"],
                realtime_jobs_limit=plan_data["realtime_jobs_limit"],
                real_time_copy=plan_data["real_time_copy"],
                media_copy=plan_data["media_copy"],
                priority_support=plan_data["priority_support"]
            )
            plans.append(plan_info)

        response_data = PlansResponse(plans=plans)
        return JSONResponse(
            content=response_data.model_dump(mode='json'),
            status_code=200
        )

    except Exception as e:
        logger.error(f"Error in get_plans: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao obter planos: {str(e)}", 500)


@user_router.put("/profile")
async def update_profile(
    request: Request,
    current_user: PydanticUser = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """
    Update user profile information for authenticated user.

    Request body:
        - display_name: str

    Returns:
        JSON with update confirmation
    """
    try:
        data = await request.json()
        # Use authenticated user's phone number
        phone_number = current_user.phone_number
        display_name = data.get("display_name")

        if not display_name:
            raise TeleCopyException("Nome de exibição é obrigatório.", 400)

        if len(display_name) < 1 or len(display_name) > 100:
            raise TeleCopyException("Nome de exibição deve ter entre 1 e 100 caracteres.", 400)

        # Update user profile
        user = await user_service.update_user_by_phone(phone_number, display_name)

        response_data = ProfileUpdateResponse(
            message="Perfil atualizado com sucesso!",
            display_name=user.name
        )
        return JSONResponse(
            content=response_data.model_dump(mode='json'),
            status_code=200
        )

    except NotFoundError as e:
        raise TeleCopyException(str(e), 404)
    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in update_profile: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao atualizar perfil: {str(e)}", 500)


# ==================== Stripe Routes ====================


@stripe_router.post("/create-checkout-session")
async def create_checkout_session(
    request: Request,
    current_user: PydanticUser = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service),
    user_service: UserService = Depends(get_user_service),
):
    """
    Create a Stripe Checkout session for subscription purchase.

    Request body:
        - price_id: str (Stripe Price ID)
        - success_url: str (URL to redirect after successful payment)
        - cancel_url: str (URL to redirect after cancelled payment)

    Returns:
        JSON with checkout session URL
    """
    try:
        data = await request.json()
        price_id = data.get("price_id")
        success_url = data.get("success_url")
        cancel_url = data.get("cancel_url")

        if not price_id:
            raise TeleCopyException("Price ID é obrigatório.", 400)
        if not success_url:
            raise TeleCopyException("Success URL é obrigatório.", 400)
        if not cancel_url:
            raise TeleCopyException("Cancel URL é obrigatório.", 400)

        # Get database user model (not Pydantic) for Stripe service
        user_db = await user_service.get_db_user_by_phone(current_user.phone_number)
        if not user_db:
            raise NotFoundError("Usuário não encontrado.")

        # Create checkout session
        checkout_url = await stripe_service.create_checkout_session(
            user=user_db,
            price_id=price_id,
            success_url=success_url,
            cancel_url=cancel_url
        )

        return JSONResponse(
            content={
                "checkout_url": checkout_url,
                "message": "Sessão de checkout criada com sucesso"
            },
            status_code=200
        )

    except NotFoundError as e:
        raise TeleCopyException(str(e), 404)
    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in create_checkout_session: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao criar sessão de checkout: {str(e)}", 500)


@stripe_router.post("/cancel-subscription")
async def cancel_subscription(
    request: Request,
    current_user: PydanticUser = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service),
    user_service: UserService = Depends(get_user_service),
):
    """
    Cancel user's Stripe subscription.

    Request body:
        - immediately: bool (optional, default: False) - Cancel immediately or at period end

    Returns:
        JSON with cancellation confirmation
    """
    try:
        data = await request.json()
        immediately = data.get("immediately", False)

        # Get user from database
        user_db = await user_service.get_user_by_phone(current_user.phone_number)
        if not user_db:
            raise NotFoundError("Usuário não encontrado.")

        if not user_db.stripe_subscription_id:
            raise TeleCopyException("Usuário não possui assinatura ativa.", 400)

        # Cancel subscription
        success = await stripe_service.cancel_subscription(
            subscription_id=user_db.stripe_subscription_id,
            immediately=immediately
        )

        if not success:
            raise TeleCopyException("Falha ao cancelar assinatura.", 500)

        message = "Assinatura cancelada imediatamente" if immediately else "Assinatura será cancelada ao final do período"

        return JSONResponse(
            content={
                "message": message,
                "immediately": immediately
            },
            status_code=200
        )

    except NotFoundError as e:
        raise TeleCopyException(str(e), 404)
    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in cancel_subscription: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao cancelar assinatura: {str(e)}", 500)


@stripe_router.get("/subscription-status")
async def get_subscription_status(
    current_user: PydanticUser = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service),
    user_service: UserService = Depends(get_user_service),
):
    """
    Get user's Stripe subscription status.

    Returns:
        JSON with subscription details
    """
    try:
        # Get user from database
        user_db = await user_service.get_user_by_phone(current_user.phone_number)
        if not user_db:
            raise NotFoundError("Usuário não encontrado.")

        subscription_data = {
            "has_subscription": bool(user_db.stripe_subscription_id),
            "subscription_status": user_db.subscription_status,
            "subscription_period_end": user_db.subscription_period_end.isoformat() if user_db.subscription_period_end else None,
            "plan": user_db.plan.value,
        }

        # If user has subscription, get details from Stripe
        if user_db.stripe_subscription_id:
            subscription = await stripe_service.get_subscription(user_db.stripe_subscription_id)
            if subscription:
                subscription_data["cancel_at_period_end"] = subscription.cancel_at_period_end
                subscription_data["current_period_start"] = datetime.fromtimestamp(subscription.current_period_start).isoformat() if subscription.current_period_start else None
                subscription_data["current_period_end"] = datetime.fromtimestamp(subscription.current_period_end).isoformat() if subscription.current_period_end else None

        return JSONResponse(
            content=subscription_data,
            status_code=200
        )

    except NotFoundError as e:
        raise TeleCopyException(str(e), 404)
    except Exception as e:
        logger.error(f"Error in get_subscription_status: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao obter status da assinatura: {str(e)}", 500)


# ==================== Webhook Routes ====================


@webhook_router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    stripe_service: StripeService = Depends(get_stripe_service),
):
    """
    Handle Stripe webhook events.

    This endpoint receives events from Stripe about subscription changes,
    payments, and other updates.

    Headers:
        - stripe-signature: Stripe webhook signature for verification

    Returns:
        JSON with status
    """
    try:
        # Get raw request body
        payload = await request.body()

        # Verify webhook signature
        if not stripe_signature:
            logger.error("Missing Stripe signature in webhook request")
            raise TeleCopyException("Missing signature", 400)

        # Construct event with signature verification
        try:
            event = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=stripe_signature,
                secret=settings.stripe_webhook_secret
            )
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {e}")
            raise TeleCopyException("Invalid payload", 400)
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {e}")
            raise TeleCopyException("Invalid signature", 400)

        logger.info(f"Received Stripe webhook event: {event['type']}")

        # Handle different event types
        event_type = event["type"]
        event_data = event["data"]["object"]

        if event_type == "checkout.session.completed":
            # Payment successful, activate subscription
            await stripe_service.handle_checkout_completed(event_data)

        elif event_type == "customer.subscription.updated":
            # Subscription updated (renewed, changed, etc.)
            await stripe_service.handle_subscription_updated(event_data)

        elif event_type == "customer.subscription.deleted":
            # Subscription cancelled or expired
            await stripe_service.handle_subscription_deleted(event_data)

        elif event_type == "invoice.payment_failed":
            # Payment failed
            await stripe_service.handle_invoice_payment_failed(event_data)

        else:
            logger.info(f"Unhandled Stripe webhook event type: {event_type}")

        return JSONResponse(
            content={"status": "success", "event_type": event_type},
            status_code=200
        )

    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in stripe_webhook: {e}", exc_info=True)
        # Return 200 to acknowledge receipt, but log the error
        return JSONResponse(
            content={"status": "error", "message": str(e)},
            status_code=200
        )


# Admin endpoints (for testing and development)
@admin_router.post("/clear-stripe-data")
async def clear_stripe_data(
    request: Request,
    user_service: UserService = Depends(get_user_service),
):
    """
    Clear Stripe customer and subscription data for a user.
    This is useful when switching between test and live Stripe environments.

    Request body:
        - phone_number: str

    Returns:
        JSON with success message
    """
    try:
        data = await request.json()
        phone_number = data.get("phone_number")

        if not phone_number:
            raise TeleCopyException("phone_number é obrigatório.", 400)

        # Get user from database
        db_user = await user_service.user_repo.get_by_phone(phone_number)
        if not db_user:
            raise NotFoundError(f"Usuário com telefone {phone_number} não encontrado")

        # Clear Stripe data
        db_user.stripe_customer_id = None
        db_user.stripe_subscription_id = None
        db_user.subscription_status = None
        db_user.subscription_period_end = None

        # Update user in database
        await user_service.user_repo.update(db_user)

        logger.info(f"Cleared Stripe data for user {phone_number}")

        return JSONResponse(
            content={
                "success": True,
                "message": f"Stripe data cleared for user {phone_number}",
                "phone_number": phone_number
            },
            status_code=200
        )

    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in clear_stripe_data: {e}", exc_info=True)
        raise TeleCopyException(f"Erro ao limpar dados do Stripe: {str(e)}", 500)


@admin_router.post("/process-subscription")
async def process_subscription_manually(
    request: Request,
    stripe_service: StripeService = Depends(get_stripe_service),
):
    """
    Manually process a subscription for a customer.
    Useful when webhook wasn't configured and subscription needs to be applied.

    Request body:
        - subscription_id: str - Stripe subscription ID

    Returns:
        JSON with success message
    """
    try:
        data = await request.json()
        subscription_id = data.get("subscription_id")

        if not subscription_id:
            raise TeleCopyException("subscription_id é obrigatório.", 400)

        # Get subscription from Stripe
        subscription = await stripe_service.get_subscription(subscription_id)
        if not subscription:
            raise NotFoundError(f"Subscription {subscription_id} não encontrada")

        # Handle subscription update
        await stripe_service.handle_subscription_updated(subscription)

        logger.info(f"Manually processed subscription {subscription_id}")

        return JSONResponse(
            content={
                "success": True,
                "message": f"Subscription {subscription_id} processada com sucesso",
                "subscription_id": subscription_id
            },
            status_code=200
        )

    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in process_subscription_manually: {e}", exc_info=True)
        raise TeleCopyException(f"Erro ao processar assinatura: {str(e)}", 500)



# ==================== Admin Routes ====================


@admin_router.get("/stats")
async def get_admin_stats(
    current_user: PydanticUser = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service),
):
    """
    Get aggregated dashboard statistics.
    Requires admin privileges.
    """
    if not current_user.is_admin:
        raise TeleCopyException("Acesso negado. Apenas administradores.", 403)
        
    try:
        stats = await admin_service.get_dashboard_stats()
        return JSONResponse(content=stats, status_code=200)
    except Exception as e:
        logger.error(f"Error getting admin stats: {e}", exc_info=True)
        raise TeleCopyException(f"Erro ao obter estatísticas: {str(e)}", 500)


@admin_router.get("/users")
async def get_admin_users(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: PydanticUser = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service),
):
    """
    Get paginated list of users.
    Requires admin privileges.
    """
    if not current_user.is_admin:
        raise TeleCopyException("Acesso negado. Apenas administradores.", 403)
        
    try:
        result = await admin_service.get_users_paginated(skip, limit, search)
        
        # Convert Pydantic models to dict for JSONResponse
        if result["items"]:
            result["items"] = [u.model_dump(mode='json') for u in result["items"]]
            
        return JSONResponse(content=result, status_code=200)
    except Exception as e:
        logger.error(f"Error list admin users: {e}", exc_info=True)
        raise TeleCopyException(f"Erro ao listar usuários: {str(e)}", 500)


@admin_router.get("/users/{user_id}")
async def get_admin_user_details(
    user_id: str,
    current_user: PydanticUser = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service),
):
    """
    Get detailed user information.
    Requires admin privileges.
    """
    if not current_user.is_admin:
        raise TeleCopyException("Acesso negado. Apenas administradores.", 403)
        
    try:
        details = await admin_service.get_user_details(user_id)
        if not details:
            raise NotFoundError("Usuário não encontrado")
            
        # Serialize Pydantic user
        details["user"] = details["user"].model_dump(mode='json')
        
        return JSONResponse(content=details, status_code=200)
    except TeleCopyException:
        raise
    except Exception as e:
        logger.error(f"Error getting user details: {e}", exc_info=True)
        raise TeleCopyException(f"Erro ao obter detalhes: {str(e)}", 500)


@admin_router.patch("/users/{user_id}/admin")
async def update_admin_status(
    user_id: str,
    request: Request,
    current_user: PydanticUser = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service),
):
    """
    Promote or demote a user to/from admin.
    Requires admin privileges.
    """
    if not current_user.is_admin:
        raise TeleCopyException("Acesso negado. Apenas administradores.", 403)
        
    try:
        data = await request.json()
        is_admin = data.get("is_admin")
        
        if is_admin is None:
            raise TeleCopyException("Campo 'is_admin' é obrigatório", 400)
            
        updated_user = await admin_service.update_user_admin_status(user_id, is_admin)
        
        return JSONResponse(
            content={
                "message": f"Status de admin atualizado para {updated_user.email}",
                "user": updated_user.model_dump(mode='json')
            },
            status_code=200
        )
    except TeleCopyException:
        raise
    except Exception as e:
        logger.error(f"Error updating admin status: {e}", exc_info=True)
        raise TeleCopyException(f"Erro ao atualizar status: {str(e)}", 500)


# ==================== PagBank PIX Routes ====================


@pagbank_router.post("/create-pix-order")
async def create_pix_order(
    request: Request,
    current_user: PydanticUser = Depends(get_current_user),
    pagbank_service: PagBankService = Depends(get_pagbank_service),
    user_service: UserService = Depends(get_user_service),
):
    """
    Create a PIX order with QR Code for payment.

    Request body:
        - plan: str ("premium" or "enterprise")
        - billing_cycle: str ("monthly" or "annual")
        - customer_tax_id: str (CPF - 11 digits)

    Returns:
        JSON with QR code data for payment
    """
    try:
        data = await request.json()
        plan_str = data.get("plan")
        billing_cycle = data.get("billing_cycle")
        customer_tax_id = data.get("customer_tax_id")

        # Validate required fields
        if not plan_str:
            raise TeleCopyException("Plano é obrigatório.", 400)
        if not billing_cycle:
            raise TeleCopyException("Ciclo de cobrança é obrigatório.", 400)
        if not customer_tax_id:
            raise TeleCopyException("CPF é obrigatório.", 400)

        # Validate plan
        plan_map = {
            "premium": UserPlan.PREMIUM,
            "enterprise": UserPlan.ENTERPRISE,
        }
        plan = plan_map.get(plan_str.lower())
        if not plan:
            raise TeleCopyException("Plano inválido. Use 'premium' ou 'enterprise'.", 400)

        # Validate billing cycle
        if billing_cycle not in ["monthly", "annual"]:
            raise TeleCopyException("Ciclo inválido. Use 'monthly' ou 'annual'.", 400)

        # Validate CPF format (11 digits)
        clean_tax_id = "".join(filter(str.isdigit, customer_tax_id))
        if len(clean_tax_id) != 11:
            raise TeleCopyException("CPF deve conter 11 dígitos.", 400)

        # Get database user model
        user_db = await user_service.get_db_user_by_phone(current_user.phone_number)
        if not user_db:
            raise NotFoundError("Usuário não encontrado.")

        # Update user's tax_id if provided
        if not user_db.tax_id or user_db.tax_id != clean_tax_id:
            user_db.tax_id = clean_tax_id
            await user_service.user_repo.update(user_db)

        # Build webhook URL
        webhook_base = settings.cors_origins[0] if settings.cors_origins else "https://api.telecopy.com"
        # Use production API URL for webhook
        webhook_url = f"{webhook_base.replace('localhost', '127.0.0.1')}/api/webhooks/pagbank"

        # Create PIX order
        pix_payment = await pagbank_service.create_pix_order(
            user=user_db,
            plan=plan,
            billing_cycle=billing_cycle,
            webhook_url=webhook_url,
        )

        # Calculate formatted amount
        formatted_amount = pagbank_service._format_price(pix_payment.amount)

        return JSONResponse(
            content={
                "order_id": pix_payment.order_id,
                "reference_id": pix_payment.reference_id,
                "qr_code_text": pix_payment.qr_code_text,
                "qr_code_url": pix_payment.qr_code_url,
                "amount": pix_payment.amount,
                "formatted_amount": formatted_amount,
                "expiration_date": pix_payment.expiration_date.isoformat() if pix_payment.expiration_date else None,
                "plan": plan.value,
                "billing_cycle": billing_cycle,
                "message": "Pedido PIX criado com sucesso"
            },
            status_code=200
        )

    except NotFoundError as e:
        raise TeleCopyException(str(e), 404)
    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in create_pix_order: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao criar pedido PIX: {str(e)}", 500)


@pagbank_router.get("/order-status/{order_id}")
async def get_pix_order_status(
    order_id: str,
    current_user: PydanticUser = Depends(get_current_user),
    pagbank_service: PagBankService = Depends(get_pagbank_service),
):
    """
    Get PIX order status.

    Path parameters:
        - order_id: str (PagBank order ID)

    Returns:
        JSON with order status
    """
    try:
        # First check our local database
        pix_payment = await pagbank_service.get_pix_payment_by_order_id(order_id)
        
        if not pix_payment:
            raise TeleCopyException("Pedido não encontrado.", 404)

        # Verify the order belongs to the authenticated user
        if pix_payment.user_id != current_user.id:
            raise TeleCopyException("Acesso negado a este pedido.", 403)

        # If still pending, check with PagBank API for updates
        if pix_payment.status == "pending":
            try:
                order_data = await pagbank_service.check_order_status(order_id)
                
                # Check if payment was made
                charges = order_data.get("charges", [])
                is_paid = any(charge.get("status") == "PAID" for charge in charges)
                
                if is_paid:
                    # Process the payment
                    await pagbank_service.handle_pix_payment_completed(order_data)
                    # Refresh the payment record
                    pix_payment = await pagbank_service.get_pix_payment_by_order_id(order_id)
            except Exception as e:
                logger.warning(f"Error checking order status with PagBank: {e}")
                # Continue with local data

        return JSONResponse(
            content={
                "order_id": pix_payment.order_id,
                "status": pix_payment.status,
                "plan": pix_payment.plan.value if pix_payment.plan else None,
                "billing_cycle": pix_payment.billing_cycle,
                "amount": pix_payment.amount,
                "paid_at": pix_payment.paid_at.isoformat() if pix_payment.paid_at else None,
                "expiration_date": pix_payment.expiration_date.isoformat() if pix_payment.expiration_date else None,
            },
            status_code=200
        )

    except TeleCopyException as e:
        raise
    except Exception as e:
        logger.error(f"Error in get_pix_order_status: {e}", exc_info=True)
        raise TeleCopyException(f"Erro interno ao consultar pedido: {str(e)}", 500)


@webhook_router.post("/pagbank")
async def pagbank_webhook(
    request: Request,
    pagbank_service: PagBankService = Depends(get_pagbank_service),
):
    """
    Handle PagBank webhook events.

    This endpoint receives events from PagBank about PIX payments.

    Returns:
        JSON with status
    """
    try:
        # Get raw request body
        payload = await request.json()
        
        logger.info(f"Received PagBank webhook: {payload.get('id', 'unknown')}")

        # Check if this is an order payment notification
        order_id = payload.get("id")
        if not order_id:
            logger.warning("No order_id in PagBank webhook payload")
            return JSONResponse(
                content={"status": "ignored", "message": "No order_id in payload"},
                status_code=200
            )

        # Check charges for PAID status
        charges = payload.get("charges", [])
        is_paid = any(charge.get("status") == "PAID" for charge in charges)

        if is_paid:
            logger.info(f"Processing paid PIX order: {order_id}")
            await pagbank_service.handle_pix_payment_completed(payload)
        else:
            logger.info(f"PagBank webhook for order {order_id}, not paid yet. Statuses: {[c.get('status') for c in charges]}")

        return JSONResponse(
            content={"status": "success", "order_id": order_id},
            status_code=200
        )

    except Exception as e:
        logger.error(f"Error in pagbank_webhook: {e}", exc_info=True)
        # Return 200 to acknowledge receipt, but log the error
        return JSONResponse(
            content={"status": "error", "message": str(e)},
            status_code=200
        )
