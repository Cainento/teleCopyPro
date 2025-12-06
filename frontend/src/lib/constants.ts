// API Configuration
// Production: Use relative URLs (same domain via Vercel proxy)
// Development: Use localhost
export const API_BASE_URL = import.meta.env.MODE === 'production'
  ? '' // Empty string in production = use relative URLs
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');

// Direct backend URL (bypasses Vercel proxy for specific endpoints like logout)
export const BACKEND_URL = import.meta.env.MODE === 'production'
  ? 'https://telegram-copier-backend.fly.dev'
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');

// Polling intervals (in milliseconds) - Optimized for performance
export const POLLING_INTERVALS = {
  JOB_PROGRESS: 5000, // 5 seconds for active job progress (reduced from 2s)
  SESSION_STATUS: 10000, // 10 seconds for session status (reduced from 5s)
  JOBS_LIST: 15000, // 15 seconds for job list (reduced from 10s)
} as const;

// Plan limits
export const PLAN_LIMITS = {
  FREE: {
    maxMessages: 100,
    realTimeCopy: false,
    label: 'Grátis',
  },
  PREMIUM: {
    maxMessages: Infinity,
    realTimeCopy: true,
    label: 'Premium',
  },
  ENTERPRISE: {
    maxMessages: Infinity,
    realTimeCopy: true,
    label: 'Enterprise',
  },
} as const;

// Job status
export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  STOPPED: 'stopped',
} as const;

// Session status
export const SESSION_STATUS = {
  DISCONNECTED: 'disconnected',
  WAITING_CODE: 'waiting_code',
  WAITING_PASSWORD: 'waiting_password',
  CONNECTED: 'connected',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH: 'telegram-copier-auth',
  THEME: 'theme-preference',
  SESSION: 'telegram-copier-session',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  COPY: '/copy',
  JOBS: '/jobs',
  ACCOUNT: '/account',
} as const;
