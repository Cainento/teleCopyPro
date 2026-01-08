import apiClient from './client';

export interface UsageStatsResponse {
  phone_number: string;
  plan: 'free' | 'premium' | 'enterprise';
  usage_count: number;
  usage_limit: number | null;
  usage_percentage: number;
  messages_copied_today: number;
  active_jobs_count: number;
  total_jobs_count: number;
  historical_jobs_count: number;
  realtime_jobs_count: number;
  historical_jobs_limit: number | null;
  realtime_jobs_limit: number | null;
  can_create_historical_job: boolean;
  can_create_realtime_job: boolean;
  can_create_job: boolean;
  historical_job_blocked_reason: string | null;
  realtime_job_blocked_reason: string | null;
  message_limit_blocked_reason: string | null;
  limit_message: string | null;
}

export interface AccountInfoResponse {
  phone_number: string;
  email: string | null;
  display_name: string | null;
  plan: 'free' | 'premium' | 'enterprise';
  plan_expiry: string | null;
  usage_count: number;
  created_at: string | null;
  is_admin: boolean;
}

export interface PlanFeature {
  name: string;
  description: string;
  included: boolean;
}

export interface PlanInfo {
  type: 'free' | 'premium' | 'enterprise';
  name: string;
  price: string;
  features: PlanFeature[];
  usage_limit: number | null;
  historical_jobs_limit: number | null;
  realtime_jobs_limit: number | null;
  real_time_copy: boolean;
  media_copy: boolean;
  priority_support: boolean;
}

export interface PlansResponse {
  plans: PlanInfo[];
}

export const userApi = {
  /**
   * Get user usage statistics
   */
  async getUsageStats(phoneNumber: string): Promise<UsageStatsResponse> {
    const response = await apiClient.get<UsageStatsResponse>('/api/user/usage', {
      params: { phone_number: phoneNumber },
    });
    return response.data;
  },

  /**
   * Get user account information
   */
  async getAccountInfo(phoneNumber: string): Promise<AccountInfoResponse> {
    const response = await apiClient.get<AccountInfoResponse>('/api/user/account', {
      params: { phone_number: phoneNumber },
    });
    return response.data;
  },

  /**
   * Get available plans
   */
  async getPlans(): Promise<PlansResponse> {
    const response = await apiClient.get<PlansResponse>('/api/user/plans');
    return response.data;
  },

  /**
   * Update user profile
   */
  async updateProfile(phoneNumber: string, displayName?: string, email?: string): Promise<{ message: string; display_name: string; email: string }> {
    const response = await apiClient.put('/api/user/profile', {
      phone_number: phoneNumber,
      display_name: displayName,
      email: email,
    });
    return response.data;
  },
};
