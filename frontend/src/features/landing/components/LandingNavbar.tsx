import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/store/theme.store';
import { cn } from '@/lib/cn';

export function LandingNavbar() {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { theme, toggleTheme } = useThemeStore();

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Recursos', href: '#features' },
        { label: 'Como Funciona', href: '#how-it-works' },
        { label: 'FAQ', href: '#faq' },
    ];

    const handleNavClick = (href: string) => {
        setMobileMenuOpen(false);
        const element = document.querySelector(href);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const ThemeToggleButton = () => (
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
    );

    return (
        <>
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className={cn(
                    'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b',
                    isScrolled
                        ? 'glass-strong border-border/50 py-3'
                        : 'bg-transparent border-transparent py-5'
                )}
            >
                <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <img
                            src="/ClonaGram logo.png"
                            alt="ClonaGram"
                            className="w-8 h-8 object-contain"
                        />
                        <span className="text-xl font-bold tracking-tight">
                            <span className="text-gradient">Clona</span>
                            <span className="text-foreground">Gram</span>
                        </span>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <div className="flex items-center gap-6">
                            {navLinks.map((link) => (
                                <button
                                    key={link.label}
                                    onClick={() => handleNavClick(link.href)}
                                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                                >
                                    {link.label}
                                </button>
                            ))}
                        </div>

                        <div className="h-4 w-px bg-border/50" />

                        <div className="flex items-center gap-3">
                            <ThemeToggleButton />
                            <motion.button
                                onClick={() => navigate('/login')}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                                Começar
                                <ArrowRight className="w-3.5 h-3.5" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="flex items-center gap-4 md:hidden">
                        <ThemeToggleButton />
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="p-2 text-muted-foreground hover:text-foreground"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </motion.nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[60] bg-background md:hidden flex flex-col"
                    >
                        <div className="p-5 flex items-center justify-between border-b">
                            <span className="text-xl font-bold">Menu</span>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 text-muted-foreground hover:text-foreground bg-muted/50 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 p-6 flex flex-col gap-6">
                            <div className="flex flex-col gap-4">
                                {navLinks.map((link) => (
                                    <button
                                        key={link.label}
                                        onClick={() => handleNavClick(link.href)}
                                        className="text-lg font-medium text-muted-foreground hover:text-primary transition-colors text-left"
                                    >
                                        {link.label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-auto flex flex-col gap-4">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full py-3 font-semibold text-center bg-primary text-primary-foreground rounded-xl shadow-lg"
                                >
                                    Começar Agora
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
