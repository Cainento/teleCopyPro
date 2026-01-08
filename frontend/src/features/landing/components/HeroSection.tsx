import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, CheckCircle } from 'lucide-react';

export function HeroSection() {
    const navigate = useNavigate();

    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-background" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3" />
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
                {/* Gradient Mask for Seamless Blend */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
            </div>

            <div className="container mx-auto relative z-10 px-4 md:px-6">
                <div className="flex flex-col items-center justify-center text-center max-w-5xl mx-auto relative">

                    {/* Floating Elements - Positioned relative to the main content */}
                    {/* Top Right Floating Element */}
                    <motion.div
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute hidden md:flex top-[-20px] right-0 lg:-right-6 translate-x-1/2 -translate-y-1/2 p-4 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 items-center gap-3 z-20"
                    >
                        <div className="p-2 bg-success/10 rounded-xl">
                            <CheckCircle className="w-6 h-6 text-success" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold">100% Online</p>
                            <p className="text-xs text-muted-foreground">Sistema ativo</p>
                        </div>
                    </motion.div>

                    {/* Bottom Left Floating Element - Adjusted position to not overlap with text/buttons too much if resized */}
                    <motion.div
                        animate={{ y: [0, 20, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                        className="absolute hidden md:flex bottom-[100px] left-0 lg:-left-6 -translate-x-1/2 translate-y-1/2 p-4 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 items-center gap-3 z-20"
                    >
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold">Criptografado</p>
                            <p className="text-xs text-muted-foreground">Segurança total</p>
                        </div>
                    </motion.div>

                    {/* Main Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8"
                        >
                            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                            A Nova Era da Cópia de Mensagens
                        </motion.div>

                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1] max-w-4xl">
                            Copie mensagens do <span className="text-gradient">Telegram</span> com <span className="text-gradient-secondary">Inteligência</span>
                        </h1>

                        <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-2xl">
                            Automatize seus canais e grupos em tempo real. Duplique conteúdo, filtre mídias e gerencie tudo em um único painel profissional.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mb-12 w-full sm:w-auto">
                            <motion.button
                                onClick={() => navigate('/login')}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 text-lg w-full sm:w-auto"
                            >
                                Começar Gratuitamente
                                <ArrowRight className="w-5 h-5" />
                            </motion.button>

                            <motion.button
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-4 bg-muted/50 hover:bg-muted text-foreground rounded-xl font-bold border border-border/50 transition-all flex items-center justify-center gap-2 text-lg w-full sm:w-auto"
                            >
                                Conhecer Recursos
                            </motion.button>
                        </div>

                        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-success" />
                                <span>Instalação instantânea</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-success" />
                                <span>Sem necessidade de bot</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-success" />
                                <span>Suporte 24/7</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
