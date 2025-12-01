import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { Moon, Sun } from 'lucide-react';

export function Header() {
  const { isAuthenticated, session } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="border-b bg-card">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* App Title */}
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          TeleCopy Pro
        </h1>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {isAuthenticated && session && (
            <div className="text-sm text-muted-foreground">
              {session.username ? `@${session.username}` : session.phoneNumber}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
