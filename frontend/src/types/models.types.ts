import type { JobStatus, UserPlan } from './api.types';

// Local storage session data
export interface SessionData {
  phoneNumber: string;
  userId: number;
  username?: string;
  apiId: number;
  apiHash: string;
  isAuthenticated: boolean;
  expiresAt: number;
  accessToken: string; // JWT token
  tokenType: string; // "bearer"
}

// Auth wizard step
export type AuthStep = 'phone' | 'code' | '2fa' | 'success';

// Theme
export type Theme = 'light' | 'dark' | 'system';

// Job filter
export interface JobFilter {
  status?: JobStatus;
  search?: string;
  sortBy?: 'created_at' | 'started_at' | 'completed_at';
  sortOrder?: 'asc' | 'desc';
}

// Plan feature
export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: number;
}

// Plan info
export interface PlanInfo {
  name: UserPlan;
  label: string;
  price: string;
  features: PlanFeature[];
  maxMessages: number;
  realTimeCopy: boolean;
}

// Toast notification
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}
