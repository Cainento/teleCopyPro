// Job Status
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped';

// Session Status
export type SessionStatus = 'disconnected' | 'waiting_code' | 'waiting_password' | 'connected';

// User Plan
export type UserPlan = 'FREE' | 'PREMIUM' | 'ENTERPRISE';

// Copy Job
export interface CopyJob {
  id: string;
  phone_number: string;
  source_channel: string;
  target_channel: string;
  status: JobStatus;
  real_time: boolean;
  copy_media: boolean;
  messages_copied: number;
  messages_failed: number;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

// Telegram Session
export interface TelegramSession {
  phone_number: string;
  api_id: number;
  api_hash: string;
  session_name: string;
  status: SessionStatus;
  user_id?: number | null;
  phone_code_hash?: string | null;
  created_at: string;
  last_used: string;
  is_authorized: boolean;
}

// User
export interface User {
  id: number;
  email: string;
  name: string;
  plan: UserPlan;
  usage_count: number;
  plan_expiry?: string | null;
  created_at: string;
  updated_at: string;
}

// API Request Types
export interface SendCodeRequest {
  phone_number: string;
  api_id: number;
  api_hash: string;
}

export interface SignInRequest {
  phone_number: string;
  phone_code: string;
}

export interface SignIn2FARequest {
  phone_number: string;
  password: string;
}

export interface CopyRequest {
  phone_number: string;
  source_channel: string;
  target_channel: string;
  real_time?: boolean;
  copy_media?: boolean;
  api_id: number;
  api_hash: string;
}

export interface StatusRequest {
  phone_number: string;
  api_id?: number;
  api_hash?: string;
}

// API Response Types
export interface SendCodeResponse {
  message: string;
  phone_code_hash: string;
}

export interface SignInResponse {
  message: string;
  user_id?: number;
  username?: string;
  requires_2fa?: boolean;
  access_token?: string; // JWT token
  token_type?: string; // "bearer"
}

export interface StatusResponse {
  connected: boolean;
  message: string;
  status: SessionStatus;
  user_id?: number;
  username?: string;
}

export interface CopyResponse {
  message: string;
  job_id: string;
  status: JobStatus;
}

export interface JobsResponse {
  jobs: CopyJob[];
}

export interface JobResponse extends CopyJob {}

export interface StopJobResponse {
  message: string;
  job_id: string;
}

// Error Response
export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}
