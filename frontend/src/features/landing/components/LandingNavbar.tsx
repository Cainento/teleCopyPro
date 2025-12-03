import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useThemeStore } from '@/store/theme.store';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { label: 'Recursos', href: '#features' },
  { label: 'Como Funciona', href: '#how-it-works' },
  { label: 'Depoimentos', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
];

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'bg-card/95 backdrop-blur-md border-b shadow-sm' : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            TeleCopy Pro
          </button>

          {/* Right Side - Navigation Links + Theme Toggle + Login + Mobile Menu */}
          <div className="flex items-center gap-6">
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-accent transition-colors"
              aria-label="Alternar tema"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button
              onClick={() => navigate(ROUTES.LOGIN)}
              className="hidden md:block px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Entrar
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => {
                  navigate(ROUTES.LOGIN);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:scale-105 transition-transform mt-2"
              >
                Entrar
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
