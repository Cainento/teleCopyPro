import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { Moon, Sun, Sparkles, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/lib/constants';

// Clona Gram Logo Component (consistent with LandingNavbar)
function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex items-center justify-center w-8 h-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-lg rotate-6 opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-lg -rotate-6 opacity-60" />
        <div className="relative bg-gradient-to-br from-primary to-secondary rounded-lg w-full h-full flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight">
          <span className="text-gradient">Clona</span>
          <span className="text-foreground">Gram</span>
        </span>
      </div>
    </div>
  );
}

export function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, session, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.HOME);
  };

  return (
    <header className="glass-strong border-b border-border/50 sticky top-0 z-40">
      <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <motion.button
          onClick={() => navigate(ROUTES.HOME)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="focus-ring rounded-lg"
        >
          <Logo />
        </motion.button>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            className="p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            aria-label="Alternar tema"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isDark ? 'dark' : 'light'}
                initial={{ y: -20, opacity: 0, rotate: -90 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: 20, opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                {isDark ? (
                  <Sun className="h-4 w-4 text-warning" />
                ) : (
                  <Moon className="h-4 w-4 text-primary" />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          {/* User Info & Logout */}
          {isAuthenticated && session && (
            <div className="flex items-center gap-2">
              {/* User badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {session.username ? `@${session.username}` : session.phoneNumber}
                </span>
              </div>

              {/* Logout button */}
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
