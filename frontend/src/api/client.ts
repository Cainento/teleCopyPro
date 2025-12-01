import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '@/lib/constants';
import { AppError } from '@/lib/errors';
import type { ErrorResponse, SessionData } from '@/types';

/**
 * API Client - Cliente Axios configurado para comunicação com o backend
 *
 * Features:
 * - Base URL configurada via environment variables
 * - Timeout de 30 segundos
 * - Interceptors para tratamento de erros centralizados
 * - Redirecionamento automático em caso de sessão expirada
 *
 * @see {@link API_BASE_URL} para configuração da URL base
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 *
 * Intercepta todas as requisições antes de serem enviadas.
 * Adiciona JWT token no header de Authorization se o usuário estiver autenticado.
 *
 * @param config - Configuração da requisição Axios
 * @returns Configuração modificada
 */
apiClient.interceptors.request.use(
  (config) => {
    // Get auth data from localStorage
    const authData = localStorage.getItem(STORAGE_KEYS.AUTH);

    if (authData) {
      try {
        const parsedData = JSON.parse(authData);
        const session: SessionData | null = parsedData?.state?.session || null;

        // Add JWT token to Authorization header if available
        if (session?.accessToken) {
          config.headers.Authorization = `Bearer ${session.accessToken}`;
        }
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 *
 * Intercepta todas as respostas do servidor para tratamento centralizado de erros.
 *
 * Comportamentos:
 * - 401 (Unauthorized): Limpa autenticação e redireciona para login
 * - 403 (Forbidden): Erro de permissão
 * - 404 (Not Found): Recurso não encontrado
 * - 429 (Too Many Requests): Rate limit com retry-after
 * - 500 (Internal Server Error): Erro genérico do servidor
 * - Network errors: Erro de conexão
 *
 * @param response - Resposta HTTP bem-sucedida
 * @param error - Erro HTTP da requisição
 * @throws {AppError} Erro customizado com mensagem e código de status
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ErrorResponse>) => {
    const { response } = error;

    // Network error - sem resposta do servidor
    if (!response) {
      throw new AppError(
        'Erro de conexão. Verifique sua internet e tente novamente.',
        0
      );
    }

    // Extract error message from response
    const message = response.data?.message || response.data?.error || 'Erro inesperado';
    const details = response.data?.details;

    // Handle specific HTTP status codes
    switch (response.status) {
      case 401:
        // Clear auth and redirect to login
        localStorage.removeItem('telegram-copier-auth');
        window.location.href = '/login';
        throw new AppError('Sessão expirada. Faça login novamente.', 401, details);

      case 403:
        throw new AppError('Você não tem permissão para executar esta ação.', 403, details);

      case 404:
        throw new AppError('Recurso não encontrado.', 404, details);

      case 429:
        // Rate limit error - extract retry_after if available
        const retryAfter = response.headers['retry-after'];
        const rateLimitMessage = retryAfter
          ? `Muitas requisições. Tente novamente em ${retryAfter} segundos.`
          : 'Muitas requisições. Aguarde um momento e tente novamente.';
        throw new AppError(rateLimitMessage, 429, details);

      case 500:
        throw new AppError('Erro no servidor. Tente novamente mais tarde.', 500, details);

      default:
        throw new AppError(message, response.status, details);
    }
  }
);

export default apiClient;
