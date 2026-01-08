import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Copy, Briefcase, User, Menu, X, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/auth.store';

const navigation = [
  {
    name: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
    description: 'Visão geral',
  },
  {
    name: 'Nova Cópia',
    href: ROUTES.COPY,
    icon: Copy,
    description: 'Iniciar job',
  },
  {
    name: 'Jobs',
    href: ROUTES.JOBS,
    icon: Briefcase,
    description: 'Gerenciar',
  },
  {
    name: 'Conta',
    href: ROUTES.ACCOUNT,
    icon: User,
    description: 'Configurações',
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuthStore();

  const navItems = [
    ...navigation,
    ...(user?.is_admin ? [{
      name: 'Admin',
      href: '/admin',
      icon: Shield,
      description: 'Painel admin',
    }] : [])
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <motion.button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="lg:hidden fixed top-20 left-4 z-50 p-2.5 bg-card border border-border rounded-xl shadow-lg"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isMobileMenuOpen ? 'close' : 'menu'}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen z-40',
          'bg-card/80 backdrop-blur-xl border-r border-border/50',
          'flex flex-col transition-all duration-300 ease-out',
          isCollapsed ? 'w-20' : 'w-64',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
      >
        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-card border border-border rounded-full items-center justify-center hover:bg-muted transition-colors z-50"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </motion.div>
        </button>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto pt-6">
          {navItems.map((item, index) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                  'hover:bg-muted',
                  isActive
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
                    isActive
                      ? 'bg-white/20'
                      : 'bg-muted group-hover:bg-primary/10'
                  )}>
                    <item.icon className={cn(
                      'h-5 w-5 transition-colors',
                      isActive ? 'text-white' : 'text-current'
                    )} />
                  </div>

                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col min-w-0"
                    >
                      <span className="font-medium text-sm truncate">{item.name}</span>
                      <span className={cn(
                        'text-xs truncate',
                        isActive ? 'text-white/70' : 'text-muted-foreground'
                      )}>
                        {item.description}
                      </span>
                    </motion.div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn(
          'p-4 border-t border-border/50',
          isCollapsed ? 'text-center' : ''
        )}>
          <div className="text-xs text-muted-foreground">
            {isCollapsed ? (
              <span>© 2025</span>
            ) : (
              <p>© 2025 Clona Gram</p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
