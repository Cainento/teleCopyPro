import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';
import type { Theme } from '@/types';

/**
 * Estado da store de tema
 */
export interface ThemeState {
  /** Tema atual: 'light', 'dark' ou 'system' */
  theme: Theme;
  /** Define o tema manualmente */
  setTheme: (theme: Theme) => void;
  /** Alterna entre light e dark */
  toggleTheme: () => void;
}

/**
 * Aplica o tema ao documento HTML
 *
 * Adiciona a classe correspondente ao elemento raiz (html)
 * para ativar as variáveis CSS do tema.
 *
 * @param theme - Tema a ser aplicado ('light', 'dark' ou 'system')
 *
 * @remarks
 * Se theme='system', detecta preferência do sistema operacional
 * via media query `prefers-color-scheme`
 */
function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
}

/**
 * Store de Tema - Gerencia preferências de tema do usuário
 *
 * Utiliza Zustand com persistência em localStorage para:
 * - Armazenar preferência de tema (light/dark/system)
 * - Aplicar tema automaticamente ao carregar a página
 * - Sincronizar com preferências do sistema
 * - Toggle simples entre light e dark
 *
 * Features:
 * - Persistência automática em localStorage
 * - Sincronização com mudanças nas preferências do sistema
 * - Aplicação automática do tema ao hidratar
 *
 * @example
 * ```typescript
 * // Toggle simples (usado no Header)
 * function ThemeToggle() {
 *   const { theme, toggleTheme } = useThemeStore();
 *   const isDark = theme === 'dark';
 *
 *   return (
 *     <button onClick={toggleTheme}>
 *       {isDark ? <Sun /> : <Moon />}
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Definir tema específico
 * function SettingsPage() {
 *   const { theme, setTheme } = useThemeStore();
 *
 *   return (
 *     <select value={theme} onChange={(e) => setTheme(e.target.value)}>
 *       <option value="light">Claro</option>
 *       <option value="dark">Escuro</option>
 *       <option value="system">Sistema</option>
 *     </select>
 *   );
 * }
 * ```
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',

      /**
       * Define o tema manualmente
       *
       * @param theme - Tema a ser aplicado ('light', 'dark' ou 'system')
       */
      setTheme: (theme: Theme) => {
        set({ theme });
        applyTheme(theme);
      },

      /**
       * Alterna entre light e dark
       *
       * Ignora o modo 'system' e apenas alterna entre os dois temas fixos.
       * Ideal para um botão de toggle simples.
       */
      toggleTheme: () => {
        const { theme } = get();
        const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
        get().setTheme(nextTheme);
      },
    }),
    {
      name: STORAGE_KEYS.THEME,
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      applyTheme('system');
    }
  });
}
