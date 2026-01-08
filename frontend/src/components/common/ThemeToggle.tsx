import { Moon, Sun, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import { useThemeStore } from '@/store/theme.store';
import { cn } from '@/lib/cn';
import type { Theme } from '@/types';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const themes: Array<{ value: Theme; icon: typeof Sun; label: string }> = [
    { value: 'light', icon: Sun, label: 'Claro' },
    { value: 'dark', icon: Moon, label: 'Escuro' },
    { value: 'system', icon: Monitor, label: 'Sistema' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-xl relative">
      {themes.map(({ value, icon: Icon, label }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              'relative flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium z-10',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title={label}
            aria-label={`Mudar para tema ${label.toLowerCase()}`}
          >
            {isActive && (
              <motion.div
                layoutId="theme-active"
                className="absolute inset-0 bg-background shadow-sm border border-border/50 rounded-lg -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
