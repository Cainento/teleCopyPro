import { useQuery } from '@tanstack/react-query';
import { telegramApi } from '@/api/telegram.api';
import { jobsApi } from '@/api/jobs.api';
import { useAuthStore } from '@/store/auth.store';
import { useSessionStore } from '@/store/session.store';
import { POLLING_INTERVALS } from '@/lib/constants';
import type { StatusResponse, CopyJob } from '@/types';

export function useDashboard() {
  const { session } = useAuthStore();
  const { setStatus, setUserInfo } = useSessionStore();

  // Query para status da sessão (com polling)
  const {
    data: sessionStatus,
    isLoading: isLoadingStatus,
    error: statusError,
  } = useQuery<StatusResponse>({
    queryKey: ['session-status', session?.phoneNumber],
    queryFn: async () => {
      if (!session) throw new Error('Sessão não encontrada');

      const status = await telegramApi.getStatus({
        phone_number: session.phoneNumber,
        api_id: session.apiId,
        api_hash: session.apiHash,
      });

      // Atualizar estado da sessão
      setStatus(status.status);
      if (status.user_id) {
        setUserInfo(status.user_id, status.username);
      }

      return status;
    },
    enabled: !!session,
    refetchInterval: POLLING_INTERVALS.SESSION_STATUS,
    refetchIntervalInBackground: false,
  });

  // Query para lista de jobs (com polling)
  const {
    data: jobs = [],
    isLoading: isLoadingJobs,
    error: jobsError,
  } = useQuery<CopyJob[]>({
    queryKey: ['jobs', session?.phoneNumber],
    queryFn: async () => {
      if (!session) return [];
      return jobsApi.getJobs(session.phoneNumber);
    },
    enabled: !!session,
    refetchInterval: POLLING_INTERVALS.JOBS_LIST,
    refetchIntervalInBackground: false,
  });

  // Calcular estatísticas
  const stats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter((job) => job.status === 'running').length,
    completedJobs: jobs.filter((job) => job.status === 'completed').length,
    failedJobs: jobs.filter((job) => job.status === 'failed').length,
    totalMessagesCopied: jobs.reduce((sum, job) => sum + job.messages_copied, 0),
    totalMessagesFailed: jobs.reduce((sum, job) => sum + job.messages_failed, 0),
  };

  // Helper to parse UTC timestamp
  const parseUTC = (timestamp: string) => {
    const utcTimestamp = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`;
    return new Date(utcTimestamp);
  };

  // Jobs recentes (últimos 5)
  const recentJobs = jobs
    .sort((a, b) => parseUTC(b.created_at).getTime() - parseUTC(a.created_at).getTime())
    .slice(0, 5);

  return {
    sessionStatus,
    isLoadingStatus,
    statusError,
    jobs,
    isLoadingJobs,
    jobsError,
    stats,
    recentJobs,
    isLoading: isLoadingStatus || isLoadingJobs,
  };
}
