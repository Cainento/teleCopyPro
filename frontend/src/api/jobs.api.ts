import apiClient from './client';
import type {
  CopyRequest,
  CopyResponse,
  CopyJob,
  StopJobResponse,
} from '@/types';

/**
 * Jobs API - Serviço para gerenciamento de jobs de cópia do Telegram
 *
 * Responsável por todas as operações relacionadas a jobs:
 * - Criar novos jobs de cópia
 * - Listar jobs existentes
 * - Obter detalhes de jobs específicos
 * - Parar jobs em execução
 *
 * @see {@link CopyRequest} para estrutura da requisição de cópia
 * @see {@link CopyJob} para estrutura de dados de um job
 */
export const jobsApi = {
  /**
   * Inicia um novo job de cópia de mensagens
   *
   * Cria e inicia um job para copiar mensagens de um canal de origem
   * para um canal de destino, com configurações especificadas.
   *
   * @param data - Dados da requisição de cópia
   * @param data.sourceChannel - Identificador do canal de origem (@username, ID ou link)
   * @param data.destinationChannel - Identificador do canal de destino
   * @param data.mode - Modo de cópia: 'count' (quantidade) ou 'date_range' (intervalo de datas)
   * @param data.messageCount - Número de mensagens (quando mode='count')
   * @param data.startDate - Data inicial (quando mode='date_range')
   * @param data.endDate - Data final (quando mode='date_range')
   *
   * @returns Resposta com ID do job criado e status inicial
   *
   * @throws {AppError} 403 - Permissões insuficientes nos canais
   * @throws {AppError} 404 - Canal não encontrado
   * @throws {AppError} 429 - Limite de jobs atingido
   *
   * @example
   * ```typescript
   * const response = await jobsApi.startCopy({
   *   sourceChannel: '@canalorigem',
   *   destinationChannel: '@canaldestino',
   *   mode: 'count',
   *   messageCount: 100,
   * });
   * console.log(response.jobId); // "job_abc123..."
   * ```
   */
  startCopy: async (data: CopyRequest): Promise<CopyResponse> => {
    const response = await apiClient.post<CopyResponse>('/api/telegram/copy', data);
    return response.data;
  },

  /**
   * Lista todos os jobs de um usuário
   *
   * Retorna todos os jobs associados a um número de telefone,
   * incluindo jobs ativos, concluídos e falhados.
   *
   * @param phoneNumber - Número de telefone do usuário (formato: +5511999887766)
   *
   * @returns Array de jobs com status, progresso e metadados
   *
   * @throws {AppError} 401 - Usuário não autenticado
   *
   * @example
   * ```typescript
   * const jobs = await jobsApi.getJobs('+5511999887766');
   * jobs.forEach(job => {
   *   console.log(`${job.id}: ${job.status} - ${job.messagesCopied}/${job.totalMessages}`);
   * });
   * ```
   */
  getJobs: async (phoneNumber: string): Promise<CopyJob[]> => {
    const response = await apiClient.get<{ jobs: CopyJob[] }>('/api/telegram/jobs', {
      params: { phone_number: phoneNumber },
    });
    return response.data.jobs;
  },

  /**
   * Obtém detalhes de um job específico
   *
   * Retorna informações detalhadas de um job, incluindo:
   * - Status atual (pending, running, completed, failed, stopped)
   * - Progresso (mensagens copiadas / total)
   * - Timestamps de início e fim
   * - Mensagens de erro (se houver)
   *
   * @param jobId - ID único do job
   *
   * @returns Dados completos do job
   *
   * @throws {AppError} 404 - Job não encontrado
   * @throws {AppError} 403 - Job pertence a outro usuário
   *
   * @example
   * ```typescript
   * const job = await jobsApi.getJob('job_abc123...');
   * if (job.status === 'completed') {
   *   console.log(`Copiadas ${job.messagesCopied} mensagens com sucesso!`);
   * }
   * ```
   */
  getJob: async (jobId: string): Promise<CopyJob> => {
    const response = await apiClient.get<CopyJob>(`/api/telegram/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Para um job em execução ou pendente
   *
   * Interrompe a execução de um job ativo. Jobs já concluídos ou falhados
   * não podem ser parados.
   *
   * @param jobId - ID do job a ser parado
   *
   * @returns Confirmação com status atualizado
   *
   * @throws {AppError} 404 - Job não encontrado
   * @throws {AppError} 400 - Job não pode ser parado (já concluído/falhado)
   * @throws {AppError} 403 - Job pertence a outro usuário
   *
   * @example
   * ```typescript
   * try {
   *   const result = await jobsApi.stopJob('job_abc123...');
   *   console.log(result.message); // "Job parado com sucesso"
   * } catch (error) {
   *   console.error('Não foi possível parar o job');
   * }
   * ```
   */
  stopJob: async (jobId: string): Promise<StopJobResponse> => {
    const response = await apiClient.post<StopJobResponse>(`/api/telegram/copy/${jobId}/stop`);
    return response.data;
  },
};
