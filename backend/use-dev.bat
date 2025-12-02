@echo off
REM Switch to development environment
echo Switching to DEVELOPMENT environment...
copy /Y .env.development .env
echo.
echo ✓ Development environment activated
echo   - DEBUG: true
echo   - ENVIRONMENT: development
echo   - CORS: All localhost origins allowed
echo.
echo Restart your backend server for changes to take effect.
