"""FastAPI application entry point."""

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.api.routes import router, user_router, stripe_router, pagbank_router, webhook_router, admin_router
from app.config import settings
from app.core.exception_handler import (
    global_exception_handler,
    telecopy_exception_handler,
    telethon_exception_handler,
)
from app.core.exceptions import TeleCopyException
from app.core.logger import get_logger, setup_logger
from app.database.connection import close_db, AsyncSessionLocal
from app.services.telegram_service import TelegramService
from app.services.copy_service import CopyService
from app.services.plan_expiry_scheduler import plan_expiry_scheduler

# Setup logging
setup_logger()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    logger.info(f"Starting {settings.app_name} in {settings.environment} mode")
    logger.info(f"API ID configured: {settings.api_id > 0}")
    logger.info(f"Session folder: {settings.session_folder}")
    logger.info(f"Database URL: {settings.database_url.split('@')[-1] if '@' in settings.database_url else settings.database_url}")
    logger.info(f"")
    logger.info(f"=" * 60)
    logger.info(f"  Application is ready!")
    logger.info(f"  Access the application at:")
    logger.info(f"  -> http://localhost:{settings.port}")
    logger.info(f"  -> http://127.0.0.1:{settings.port}")
    logger.info(f"=" * 60)
    logger.info(f"")

    # Start plan expiry scheduler (checks for expired PIX payment plans hourly)
    try:
        from app.api.dependencies import get_telegram_service
        plan_expiry_scheduler.telegram_service = get_telegram_service()
        await plan_expiry_scheduler.start()
    except Exception as e:
        logger.error(f"Error starting plan expiry scheduler: {e}", exc_info=True)

    # Start Telegram session monitor (checks for revoked sessions)
    try:
        from app.api.dependencies import get_telegram_service
        telegram_service = get_telegram_service()
        # We need to start this on a background task
        asyncio.create_task(telegram_service.start_session_monitor(interval_seconds=60))
    except Exception as e:
        logger.error(f"Error starting session monitor: {e}", exc_info=True)

    # Resume active real-time jobs
    try:
        logger.info("Starting job resume process...")
        from app.api.dependencies import get_telegram_service
        
        # Use a dedicated session for resuming jobs
        async with AsyncSessionLocal() as db:
            # Use the singleton TelegramService instance
            telegram_service = get_telegram_service()
            copy_service = CopyService(telegram_service, db)
            await copy_service.resume_all_active_jobs()
            
    except Exception as e:
        logger.error(f"Error resuming active jobs: {e}", exc_info=True)

    yield

    # Shutdown
    logger.info("Shutting down application...")

    # Stop plan expiry scheduler
    try:
        await plan_expiry_scheduler.stop()
    except Exception as e:
        logger.error(f"Error stopping plan expiry scheduler: {e}", exc_info=True)

    # Cleanup Telegram clients
    try:
        from app.api.dependencies import get_telegram_service
        telegram_service = get_telegram_service()
        await telegram_service.cleanup()
    except Exception as e:
        logger.error(f"Error during cleanup: {e}", exc_info=True)

    # Close database connections
    try:
        await close_db()
    except Exception as e:
        logger.error(f"Error closing database connections: {e}", exc_info=True)

    logger.info("Application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Telegram channel copier backend API",
    version="2.0.0",
    debug=settings.debug,
    lifespan=lifespan
)

# Configure rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
# Use wildcard for development to allow all localhost origins
if settings.is_development:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )

# Register exception handlers
app.add_exception_handler(TeleCopyException, telecopy_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Register Telethon exception handlers
from telethon.errors import (
    ApiIdInvalidError,
    FloodWaitError,
    PhoneCodeInvalidError,
    PhoneNumberInvalidError,
    SessionPasswordNeededError,
    AuthKeyUnregisteredError,
)
app.add_exception_handler(PhoneNumberInvalidError, telethon_exception_handler)
app.add_exception_handler(ApiIdInvalidError, telethon_exception_handler)
app.add_exception_handler(FloodWaitError, telethon_exception_handler)
app.add_exception_handler(PhoneCodeInvalidError, telethon_exception_handler)
app.add_exception_handler(SessionPasswordNeededError, telethon_exception_handler)
app.add_exception_handler(AuthKeyUnregisteredError, telethon_exception_handler)

# Include API routes
app.include_router(router)
app.include_router(user_router)
app.include_router(stripe_router)
app.include_router(pagbank_router)
app.include_router(webhook_router)
app.include_router(admin_router)

# Serve frontend static files
frontend_path = Path(__file__).parent.parent.parent / "frontend" / "src"
if frontend_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")
    logger.info(f"Serving static files from: {frontend_path}")
else:
    # Fallback to old location
    old_frontend_path = Path(__file__).parent.parent.parent / "index.html"
    if old_frontend_path.exists():
        logger.warning(f"Using fallback frontend path: {old_frontend_path.parent}")


@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    """
    Serve the main frontend HTML file.

    Returns:
        HTML content
    """
    # Try new location first
    frontend_html = Path(__file__).parent.parent.parent / "frontend" / "src" / "index.html"
    
    # Fallback to old location
    if not frontend_html.exists():
        frontend_html = Path(__file__).parent.parent.parent / "index.html"
    
    if not frontend_html.exists():
        logger.error(f"Frontend HTML not found at {frontend_html}")
        return HTMLResponse(
            content="<h1>Frontend not found</h1><p>Please ensure index.html exists in the frontend directory.</p>",
            status_code=404
        )
    
    try:
        with open(frontend_html, "r", encoding="utf-8") as f:
            content = f.read()
        logger.debug(f"Served frontend from: {frontend_html}")
        return HTMLResponse(content=content)
    except Exception as e:
        logger.error(f"Error reading frontend file: {e}", exc_info=True)
        return HTMLResponse(
            content=f"<h1>Error loading frontend</h1><p>{str(e)}</p>",
            status_code=500
        )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )

