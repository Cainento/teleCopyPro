import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { jobsApi } from '@/api/jobs.api';
import { userApi } from '@/api/user.api';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import type { CopyJobFormData } from '../schemas/copy.schema';

export function useCopy() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuthStore();
  const [isValidatingChannel, setIsValidatingChannel] = useState(false);

  // Buscar estatísticas de uso do usuário
  const { data: usageStats, isLoading: isLoadingUsage } = useQuery({
    queryKey: ['user-usage', session?.phoneNumber],
    queryFn: () => {
      if (!session) throw new Error('Sessão não encontrada');
      return userApi.getUsageStats(session.phoneNumber);
    },
    enabled: !!session,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // Atualizar a cada 1 minuto
  });

  // Mutation para criar job de cópia
  const createJobMutation = useMutation({
    mutationFn: async (data: CopyJobFormData) => {
      if (!session) throw new Error('Sessão não encontrada');

      return jobsApi.startCopy({
        phone_number: session.phoneNumber,
        source_channel: data.sourceChannel,
        target_channel: data.targetChannel,
        real_time: data.realTime,
        copy_media: data.copyMedia,
      });
    },
    onMutate: async () => {
      // Optimistic update - poderia adicionar job temporário à lista
      toast.loading('Criando job...', { id: 'create-job' });
    },
    onSuccess: (response) => {
      toast.success('Job criado com sucesso!', { id: 'create-job' });

      // Invalidar cache de jobs e usage stats
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['user-usage'] });

      // Redirecionar para página de jobs
      navigate(`${ROUTES.JOBS}?job=${response.job_id}`);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message, { id: 'create-job' });
    },
  });

  const handleSubmit = async (data: CopyJobFormData) => {
    // Verificar restrições de plano antes de tentar criar
    if (!usageStats) {
      toast.error('Não foi possível verificar as permissões. Tente novamente.');
      return;
    }

    // Verificar limite de mensagens
    if (!usageStats.can_create_job) {
      toast.error(usageStats.message_limit_blocked_reason || 'Limite de mensagens atingido');
      return;
    }

    // Verificar se pode criar job histórico
    if (!data.realTime && !usageStats.can_create_historical_job) {
      toast.error(usageStats.historical_job_blocked_reason || 'Limite de jobs históricos atingido');
      return;
    }

    // Verificar se pode criar job em tempo real
    if (data.realTime && !usageStats.can_create_realtime_job) {
      toast.error(usageStats.realtime_job_blocked_reason || 'Jobs em tempo real não disponíveis no seu plano');
      return;
    }

    await createJobMutation.mutateAsync(data);
  };

  return {
    handleSubmit,
    isLoading: createJobMutation.isPending || isLoadingUsage,
    isValidatingChannel,
    setIsValidatingChannel,
    canUseRealTime: usageStats?.can_create_realtime_job ?? false,
    canUseHistorical: usageStats?.can_create_historical_job ?? true,
    usageStats,
  };
}
