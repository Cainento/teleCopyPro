# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Telegram Copier is a professional Telegram channel copying application with a FastAPI backend and React TypeScript frontend. The application enables copying messages between Telegram channels with support for both historical and real-time copying modes.

## Development Commands

### Backend (Python/FastAPI)

Run the development server:
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### Frontend (React/TypeScript/Vite)

Run development server:
```bash
cd frontend
npm run dev
```

Build for production:
```bash
cd frontend
npm run build
```

Run linter:
```bash
cd frontend
npm run lint
```

## Architecture Overview

### Backend Architecture

**Service Layer Pattern**: The backend uses a service-oriented architecture with clear separation of concerns:

- **TelegramService** (`app/services/telegram_service.py`): Manages Telegram client connections, authentication, and session lifecycle. Handles verification codes, 2FA, and maintains active client connections in `_active_clients` dict.

- **SessionService** (`app/services/session_service.py`): Manages temporary authentication sessions during login flow. Stores client instances and credentials in memory until authentication completes.

- **CopyService** (`app/services/copy_service.py`): Orchestrates message copying operations. Manages both historical (background task) and real-time (event handler) copy modes. Tracks active jobs in `_active_jobs` dict.

- **UserService** (`app/services/user_service.py`): Handles user management and plan validation.

**Configuration Management**: Uses Pydantic Settings (`app/config.py`) with field validators to load and validate configuration from `.env` files. The `settings` singleton is imported throughout the application.

**Exception Handling**: Custom exception hierarchy in `app/core/exceptions.py` (TeleCopyException, AuthenticationError, SessionError, etc.) with centralized handlers in `app/core/exception_handler.py`.

**Dependency Injection**: FastAPI dependencies in `app/api/dependencies.py` provide service instances to route handlers.

### Frontend Architecture

**State Management**: Uses Zustand stores for global state:
- `store/auth.store.ts`: Authentication state and phone number
- `store/session.store.ts`: Telegram session credentials (API ID/Hash)
- `store/theme.store.ts`: Dark mode theme state

**Feature-Based Organization**: Code organized by feature modules (auth, dashboard, copy, jobs, account) each containing:
- `components/`: React components
- `hooks/`: Custom React hooks
- `schemas/`: Zod validation schemas
- `types.ts`: TypeScript types

**API Layer**: Centralized API client (`api/client.ts`) with axios, feature-specific API modules (`api/telegram.api.ts`, `api/jobs.api.ts`).

**Form Handling**: React Hook Form with Zod schema validation for all forms.

**UI Components**: Uses Tailwind CSS 4 with utility classes, Framer Motion for animations, Lucide React for icons, Sonner for toast notifications.

## Key Implementation Details

### Telegram Session Management

Sessions are stored as `.session` files in `backend/sessions/` directory. The TelegramService maintains a mapping of phone numbers to active TelegramClient instances. When checking session status or starting copy operations, the service will:
1. Check if client exists in `_active_clients`
2. If not, attempt to load from session file
3. Verify client is authorized
4. Store credentials in `_session_credentials` for future use

### Authentication Flow

The multi-step authentication flow spans both frontend and backend:
1. Frontend: User enters phone, API ID, API Hash
2. Backend: Creates Telegram client, sends verification code, stores temp session in SessionService
3. Frontend: User enters code
4. Backend: Verifies code; if 2FA required, returns `requires_2fa: true`
5. Frontend: Shows 2FA password input if needed
6. Backend: Verifies 2FA, saves session file, removes temp session
7. Frontend: Redirects to dashboard

The frontend `AuthWizard` component manages the step progression with `useAuthWizard` hook.

### Copy Operations

**Historical Copy**: Creates a job immediately, returns job ID to frontend, then runs copy in BackgroundTasks. Progress tracked via job status polling.

**Real-Time Copy**: Sets up Telethon event handler to forward new messages as they arrive. Handler stored in `_real_time_handlers` dict keyed by job ID.

Both modes require an active, authorized Telegram session.

### Frontend Routing

Uses React Router with protected routes (`routes/ProtectedRoute.tsx`). Routes check if user has completed authentication (phone number in auth store and session credentials in session store).

### Error Handling Pattern

Backend raises custom exceptions (e.g., `TeleCopyException`) which are caught by FastAPI exception handlers and returned as JSON with appropriate status codes. Frontend API client catches errors and displays toasts via Sonner.

## Configuration Requirements

Backend requires `.env` file in `backend/` directory with:
- `API_ID`: Telegram API ID (required)
- `API_HASH`: Telegram API Hash (required)
- `PORT`: Server port (default: 8000)
- `SESSION_FOLDER`: Path for session files (default: "sessions")

See `SETUP.md` for complete configuration options.

## Static File Serving

The FastAPI backend serves the frontend. It mounts `frontend/src` as static files and serves `frontend/src/index.html` at root. The frontend build process is separate; in development, run backend and frontend dev servers independently.

## Important Patterns

**Async Context Management**: All Telegram operations are async. Services use async methods and properly await Telethon client operations.

**Session Lifecycle**: Temporary sessions during auth are cleaned up on success or after timeout. Persistent sessions stored as files are loaded on-demand and kept in memory while active.

**Job Tracking**: Copy jobs are created immediately and stored in `_active_jobs`. Job status is polled by frontend to show progress.

**Type Safety**: Frontend uses TypeScript with strict mode. API types defined in `types/api.types.ts` match backend Pydantic models.
