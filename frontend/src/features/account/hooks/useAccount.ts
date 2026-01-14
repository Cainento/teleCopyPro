import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { userApi, type AccountInfoResponse, type UsageStatsResponse } from '@/api/user.api';
import { toast } from 'sonner';

// ... (Plan type and interfaces remain the same)

export type Plan = 'FREE' | 'PREMIUM' | 'ENTERPRISE';

export interface AccountData {
  phoneNumber: string;
  email?: string;
  username?: string;
  plan: Plan;
  planExpiry?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
}

export interface PlanLimits {
  maxRealTimeJobs: number;
  maxHistoricalJobs: number;
  maxMessagesPerDay: number;
  mediaSupport: boolean;
  prioritySupport: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxRealTimeJobs: 0,
    maxHistoricalJobs: 3,
    maxMessagesPerDay: 1000,
    mediaSupport: true,
    prioritySupport: false,
  },
  PREMIUM: {
    maxRealTimeJobs: 5,
    maxHistoricalJobs: 20,
    maxMessagesPerDay: 10000,
    mediaSupport: true,
    prioritySupport: true,
  },
  ENTERPRISE: {
    maxRealTimeJobs: -1, // unlimited
    maxHistoricalJobs: -1, // unlimited
    maxMessagesPerDay: -1, // unlimited
    mediaSupport: true,
    prioritySupport: true,
  },
};

export function useAccount() {
  const session = useAuthStore((state) => state.session);
  const [isLoading, setIsLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState<AccountInfoResponse | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStatsResponse | null>(null);

  const fetchAccountData = useCallback(async () => {
    if (!session?.phoneNumber) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [accountData, usageData] = await Promise.all([
        userApi.getAccountInfo(session.phoneNumber),
        userApi.getUsageStats(session.phoneNumber),
      ]);
      setAccountInfo(accountData);
      setUsageStats(usageData);
    } catch (error: any) {
      console.error('Error fetching account data:', error);
      toast.error('Erro ao carregar dados da conta');
    } finally {
      setIsLoading(false);
    }
  }, [session?.phoneNumber]);

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  // Convert lowercase plan from API to uppercase for UI
  const planFromApi = accountInfo?.plan || 'free';
  const planUppercase: Plan = planFromApi.toUpperCase() as Plan;

  const accountData: AccountData = {
    phoneNumber: session?.phoneNumber || '',
    email: accountInfo?.email || undefined,
    username: accountInfo?.display_name || session?.username,
    plan: planUppercase,
    planExpiry: accountInfo?.plan_expiry || undefined,
    stripeSubscriptionId: accountInfo?.stripe_subscription_id || undefined,
    subscriptionStatus: accountInfo?.subscription_status || undefined,

  };

  const limits = PLAN_LIMITS[accountData.plan];

  // Use usage stats from backend API
  const usage = {
    realTimeJobs: {
      current: usageStats?.realtime_jobs_count || 0,
      max: usageStats?.realtime_jobs_limit ?? limits.maxRealTimeJobs,
      percentage:
        (usageStats?.realtime_jobs_limit ?? limits.maxRealTimeJobs) === -1 ||
          (usageStats?.realtime_jobs_limit ?? limits.maxRealTimeJobs) === null
          ? 0
          : Math.min(
            100,
            ((usageStats?.realtime_jobs_count || 0) /
              (usageStats?.realtime_jobs_limit ?? limits.maxRealTimeJobs)) *
            100
          ),
    },
    historicalJobs: {
      current: usageStats?.historical_jobs_count || 0,
      max: usageStats?.historical_jobs_limit ?? limits.maxHistoricalJobs,
      percentage:
        (usageStats?.historical_jobs_limit ?? limits.maxHistoricalJobs) === -1 ||
          (usageStats?.historical_jobs_limit ?? limits.maxHistoricalJobs) === null
          ? 0
          : Math.min(
            100,
            ((usageStats?.historical_jobs_count || 0) /
              (usageStats?.historical_jobs_limit ?? limits.maxHistoricalJobs)) *
            100
          ),
    },
    messagesPerDay: {
      current: usageStats?.messages_copied_today || 0,
      max: usageStats?.usage_limit ?? limits.maxMessagesPerDay,
      percentage:
        (usageStats?.usage_limit ?? limits.maxMessagesPerDay) === -1 ||
          (usageStats?.usage_limit ?? limits.maxMessagesPerDay) === null
          ? 0
          : Math.min(
            100,
            ((usageStats?.messages_copied_today || 0) /
              (usageStats?.usage_limit ?? limits.maxMessagesPerDay)) *
            100
          ),
    },
  };

  return {
    accountData,
    limits,
    usage,
    isLoading,
    refetch: fetchAccountData,
  };
}
