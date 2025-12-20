import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Copy, Briefcase, User, Menu, X, Shield } from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/auth.store';

const navigation = [
  {
    name: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    name: 'Nova Cópia',
    href: ROUTES.COPY,
    icon: Copy,
  },
  {
    name: 'Jobs',
    href: ROUTES.JOBS,
    icon: Briefcase,
  },
  {
    name: 'Conta',
    href: ROUTES.ACCOUNT,
    icon: User,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuthStore();

  const navItems = [
    ...navigation,
    ...(user?.is_admin ? [{
      name: 'Admin',
      href: '/admin',
      icon: Shield,
    }] : [])
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-card border rounded-md shadow-lg"
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-full bg-card border-r z-40 transition-transform duration-300',
          'w-64 flex flex-col',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
      >
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="text-xs text-muted-foreground text-center">
            <p>&copy; 2025 TeleCopy Pro</p>
          </div>
        </div>
      </aside>
    </>
  );
}
