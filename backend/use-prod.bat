@echo off
REM Switch to production environment
echo Switching to PRODUCTION environment...
copy /Y .env.production .env
echo.
echo ✓ Production environment activated
echo   - DEBUG: false
echo   - ENVIRONMENT: production
echo   - CORS: Specific origins only
echo   - LOG_LEVEL: WARNING
echo.
echo WARNING: Make sure to restart your backend server!
