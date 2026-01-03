import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/api/jobs.api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import { POLLING_INTERVALS } from '@/lib/constants';
import type { Job } from '@/api/types';

/**
 * Hook principal para gerenciamento de jobs de cópia
 *
 * Fornece funcionalidades completas para:
 * - Listar todos os jobs do usuário com polling automático
 * - Obter detalhes de um job específico
 * - Parar jobs em execução
 * - Estatísticas agregadas de jobs
 *
 * Features:
 * - Polling automático (15s para lista, 5s para jobs ativos)
 * - Pausa automática quando tab está inativa
 * - Otimistic updates para melhor UX
 * - Rollback automático em caso de erro
 * - Toast notifications integradas
 *
 * @returns Objeto com jobs, ações e estados de loading
 *
 * @example
 * ```typescript
 * function JobsPage() {
 *   const { jobs, stats, stopJob, isLoading } = useJobs();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return (
 *     <div>
 *       <h1>Total: {stats.total} jobs</h1>
 *       {jobs.map(job => (
 *         <JobCard
 *           key={job.id}
 *           job={job}
 *           onStop={() => stopJob(job.id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useJobs() {
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);

  /**
   * Query: Lista de todos os jobs
   *
   * Polling automático a cada 15 segundos
   * Apenas quando há sessão ativa
   */
  const {
    data: jobs = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['jobs', session?.phoneNumber],
    queryFn: async () => {
      if (!session) throw new Error('No session');
      return jobsApi.getJobs(session.phoneNumber);
    },
    enabled: !!session,
    refetchInterval: (query) => {
      // Check if there are any active jobs in the data
      if (query.state.data?.some((job) => job.status === 'running' || job.status === 'pending')) {
        return POLLING_INTERVALS.JOB_PROGRESS; // 5000ms
      }
      return POLLING_INTERVALS.JOBS_LIST; // 15000ms
    },
    refetchIntervalInBackground: false,
  });

  /**
   * Hook para obter detalhes de um job específico
   *
   * Polling condicional:
   * - Jobs ativos (running/pending): 5s
   * - Jobs finalizados: sem polling
   *
   * @param jobId - ID do job
   *
   * @returns Query com dados do job e estados de loading
   *
   * @example
   * ```typescript
   * function JobDetailPage() {
   *   const { jobId } = useParams();
   *   const { useJob } = useJobs();
   *   const { data: job, isLoading } = useJob(jobId);
   *
   *   if (!job) return <NotFound />;
   *
   *   return <JobDetails job={job} />;
   * }
   * ```
   */
  const useJob = (jobId: string) => {
    return useQuery({
      queryKey: ['job', jobId, session?.phoneNumber],
      queryFn: async () => {
        if (!session) throw new Error('No session');
        return jobsApi.getJob(jobId);
      },
      enabled: !!session && !!jobId,
      refetchInterval: (query) => {
        // Poll active jobs more frequently
        // Poll active jobs more frequently
        if (
          query.state.data?.status === 'running' ||
          query.state.data?.status === 'pending' ||
          query.state.data?.status === 'paused'
        ) {
          return POLLING_INTERVALS.JOB_PROGRESS; // 5000ms
        }
        return false; // Don't poll completed/failed/stopped jobs
      },
      refetchIntervalInBackground: false,
    });
  };

  /**
   * Mutation: Parar um job em execução
   *
   * Features:
   * - Optimistic update (atualiza UI antes da resposta)
   * - Toast notifications automáticas
   * - Rollback em caso de erro
   * - Invalidação de cache após conclusão
   *
   * Apenas jobs com status 'running' ou 'pending' podem ser parados
   */
  const stopJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!session) throw new Error('No session');
      return jobsApi.stopJob(jobId);
    },
    onMutate: async (jobId) => {
      toast.loading('Parando job...', { id: jobId });

      // Optimistically update the job status
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      const previousJobs = queryClient.getQueryData<Job[]>(['jobs', session?.phoneNumber]);

      queryClient.setQueryData<Job[]>(['jobs', session?.phoneNumber], (old) =>
        old?.map((job) => (job.id === jobId ? { ...job, status: 'stopped' as const } : job))
      );

      return { previousJobs };
    },
    onSuccess: (_data, jobId) => {
      toast.success('Job parado com sucesso', { id: jobId });
    },
    onError: (_error, jobId, context) => {
      toast.error('Erro ao parar job', { id: jobId });
      // Rollback on error
      if (context?.previousJobs) {
        queryClient.setQueryData(['jobs', session?.phoneNumber], context.previousJobs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  /**
   * Mutation: Pausar um job em execução
   */
  const pauseJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!session) throw new Error('No session');
      return jobsApi.pauseJob(jobId);
    },
    onMutate: async (jobId) => {
      toast.loading('Pausando job...', { id: jobId });
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      const previousJobs = queryClient.getQueryData<Job[]>(['jobs', session?.phoneNumber]);
      queryClient.setQueryData<Job[]>(['jobs', session?.phoneNumber], (old) =>
        old?.map((job) => (job.id === jobId ? { ...job, status: 'paused' as const } : job))
      );
      return { previousJobs };
    },
    onSuccess: (_data, jobId) => {
      toast.success('Job pausado com sucesso', { id: jobId });
    },
    onError: (_error, jobId, context) => {
      toast.error('Erro ao pausar job', { id: jobId });
      if (context?.previousJobs) {
        queryClient.setQueryData(['jobs', session?.phoneNumber], context.previousJobs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  /**
   * Mutation: Retomar um job pausado
   */
  const resumeJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!session) throw new Error('No session');
      return jobsApi.resumeJob(jobId);
    },
    onMutate: async (jobId) => {
      toast.loading('Retomando job...', { id: jobId });
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      const previousJobs = queryClient.getQueryData<Job[]>(['jobs', session?.phoneNumber]);
      queryClient.setQueryData<Job[]>(['jobs', session?.phoneNumber], (old) =>
        old?.map((job) => (job.id === jobId ? { ...job, status: 'running' as const } : job))
      );
      return { previousJobs };
    },
    onSuccess: (_data, jobId) => {
      toast.success('Job retomado com sucesso', { id: jobId });
    },
    onError: (_error, jobId, context) => {
      toast.error('Erro ao retomar job', { id: jobId });
      if (context?.previousJobs) {
        queryClient.setQueryData(['jobs', session?.phoneNumber], context.previousJobs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  /**
   * Estatísticas agregadas dos jobs
   *
   * Calculadas em tempo real a partir da lista de jobs
   */
  const stats = {
    /** Total de jobs */
    total: jobs.length,
    /** Jobs em execução (status: running) */
    running: jobs.filter((job) => job.status === 'running').length,
    /** Jobs pausados (status: paused) */
    paused: jobs.filter((job) => job.status === 'paused').length,
    /** Jobs concluídos com sucesso (status: completed ou stopped) */
    completed: jobs.filter((job) => job.status === 'completed' || job.status === 'stopped').length,
    /** Jobs que falharam (status: failed) */
    failed: jobs.filter((job) => job.status === 'failed').length,
  };

  /**
   * Retorno do hook
   */
  return {
    /** Lista de todos os jobs do usuário */
    jobs,
    /** Estatísticas agregadas (total, running, completed, failed) */
    stats,
    /** Estado de loading da query inicial */
    isLoading,
    /** Erro da query, se houver */
    error,
    /** Função para forçar refetch manual da lista de jobs */
    refetch,
    /** Hook para obter detalhes de um job específico */
    useJob,
    /** Função para parar um job em execução */
    stopJob: stopJobMutation.mutate,
    /** Flag indicando se está parando um job */
    isStoppingJob: stopJobMutation.isPending,
    /** Função para pausar um job */
    pauseJob: pauseJobMutation.mutate,
    /** Flag indicando se está pausando um job */
    isPausingJob: pauseJobMutation.isPending,
    /** Função para retomar um job */
    resumeJob: resumeJobMutation.mutate,
    /** Flag indicando se está retomando um job */
    isResumingJob: resumeJobMutation.isPending,
  };
}
