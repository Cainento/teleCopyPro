import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';
import { telegramApi } from '@/api/telegram.api';
import type { SessionData } from '@/types';

/**
 * Estado da store de autenticação
 */
export interface AuthState {
  /** Dados da sessão atual do usuário (null se não autenticado) */
  session: SessionData | null;
  /** Flag indicando se o usuário está autenticado */
  isAuthenticated: boolean;
  /** Função para fazer login e salvar sessão */
  login: (data: SessionData) => void;
  /** Função para fazer logout e limpar sessão */
  logout: () => void;
  /** Verifica se a sessão ainda é válida com o backend */
  checkSession: () => Promise<boolean>;
}

/**
 * Store de Autenticação - Gerencia estado de autenticação do usuário
 *
 * Utiliza Zustand com persistência em localStorage para:
 * - Armazenar dados da sessão do Telegram
 * - Manter estado de autenticação entre reloads
 * - Validar sessão com backend
 * - Gerenciar expiração de sessão
 *
 * @example
 * ```typescript
 * // Em um componente
 * function LoginPage() {
 *   const { login, isAuthenticated } = useAuthStore();
 *
 *   const handleLogin = async (sessionData) => {
 *     login(sessionData);
 *     navigate('/dashboard');
 *   };
 *
 *   if (isAuthenticated) {
 *     return <Navigate to="/dashboard" />;
 *   }
 *
 *   return <LoginForm onSubmit={handleLogin} />;
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Verificar sessão na inicialização
 * useEffect(() => {
 *   const checkAuth = async () => {
 *     const isValid = await useAuthStore.getState().checkSession();
 *     if (!isValid) {
 *       navigate('/login');
 *     }
 *   };
 *   checkAuth();
 * }, []);
 * ```
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      isAuthenticated: false,

      /**
       * Faz login do usuário e salva sessão
       *
       * @param data - Dados da sessão do Telegram
       * @param data.phoneNumber - Número de telefone do usuário
       * @param data.apiId - API ID do Telegram
       * @param data.apiHash - API Hash do Telegram
       * @param data.expiresAt - Timestamp de expiração da sessão
       */
      login: (data: SessionData) => {
        set({
          session: data,
          isAuthenticated: true,
        });
      },

      /**
       * Faz logout do usuário e limpa sessão
       *
       * Remove todos os dados da sessão do estado e do localStorage
       */
      logout: () => {
        set({
          session: null,
          isAuthenticated: false,
        });
      },

      /**
       * Verifica se a sessão ainda é válida
       *
       * Validações realizadas:
       * 1. Verifica se existe sessão
       * 2. Verifica se sessão não expirou (timestamp)
       * 3. Valida com backend se ainda está conectado
       *
       * @returns true se sessão é válida, false caso contrário
       *
       * @example
       * ```typescript
       * const isValid = await useAuthStore.getState().checkSession();
       * if (!isValid) {
       *   console.log('Sessão inválida ou expirada');
       *   navigate('/login');
       * }
       * ```
       */
      checkSession: async () => {
        const { session } = get();

        if (!session || !session.accessToken) {
          return false;
        }

        // Check if token is expired
        if (Date.now() > session.expiresAt) {
          get().logout();
          return false;
        }

        try {
          // Verify session with backend (will use JWT token from API client)
          const status = await telegramApi.getStatus();

          if (!status.connected) {
            get().logout();
            return false;
          }

          return true;
        } catch (error) {
          // If 401 Unauthorized, token is invalid/expired
          if ((error as any)?.response?.status === 401) {
            get().logout();
          }
          return false;
        }
      },
    }),
    {
      name: STORAGE_KEYS.AUTH,
    }
  )
);
