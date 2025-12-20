import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';
import { telegramApi } from '@/api/telegram.api';
import type { SessionData, User } from '@/types';

/**
 * Estado da store de autenticação
 */
export interface AuthState {
  /** Dados da sessão atual do usuário (null se não autenticado) */
  session: SessionData | null;
  /** Dados completos do usuário autenticado */
  user: User | null;
  /** Flag indicando se o usuário está autenticado */
  isAuthenticated: boolean;
  /** Função para fazer login e salvar sessão */
  login: (data: SessionData) => void;
  /** Função para fazer logout e limpar sessão */
  logout: () => void;
  /** Define os dados do usuário */
  setUser: (user: User) => void;
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
      user: null, // Initial state for user
      isAuthenticated: false,

      /**
       * Faz login do usuário e salva sessão
       */
      login: (data: SessionData) => {
        set({
          session: data,
          isAuthenticated: true,
        });
      },

      /**
       * Faz logout do usuário e limpa sessão
       */
      logout: () => {
        set({
          session: null,
          user: null, // Clear user on logout
          isAuthenticated: false,
        });
      },

      /**
       * Define os dados do usuário
       */
      setUser: (user: User) => {
        set({ user });
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
          // Verify session with backend
          const status = await telegramApi.getStatus();

          if (!status.connected) {
            get().logout();
            return false;
          }

          // Fetch user info to get admin status
          try {
            const { userApi } = await import('@/api/user.api');
            const userInfo = await userApi.getAccountInfo(session.phoneNumber);
            console.log('User Info Fetch:', userInfo);


            // Map AccountInfoResponse to User
            // account info: phone_number, display_name, plan, plan_expiry, usage_count, created_at, is_admin
            // User: id, email, name, plan, usage_count, plan_expiry, created_at, updated_at, is_admin

            const user: User = {
              id: 0, // ID is not returned by getAccountInfo, we can ignore or fetch elsewhere if needed.
              email: '', // Not returned
              name: userInfo.display_name || '',
              plan: userInfo.plan.toUpperCase() as any,
              usage_count: userInfo.usage_count,
              plan_expiry: userInfo.plan_expiry,
              created_at: userInfo.created_at || '',
              updated_at: '',
              is_admin: userInfo.is_admin
            };

            console.log('Setting user state:', user);
            set({ user });
          } catch (e) {
            console.error("Failed to fetch user info", e);
            // Don't fail auth check just because profile fetch failed? 
            // Actually, if we can't get admin status, AdminRoute will fail safely (user.is_admin undefined -> falsy)
          }

          return true;
        } catch (error) {
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
