import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export function CTASection() {
    const navigate = useNavigate();

    return (
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-secondary z-0" />

            {/* Decorative Circles */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-black/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            <div className="absolute inset-0 bg-grid-white/[0.05]" />

            <div className="container mx-auto relative z-10 px-4 md:px-6">
                <div className="max-w-4xl mx-auto text-center text-white">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-medium mb-6 backdrop-blur-sm"
                    >
                        <Sparkles className="w-4 h-4" />
                        Comece agora mesmo
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-bold mb-6 tracking-tight"
                    >
                        Pronto para automatizar seu Telegram?
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed"
                    >
                        Junte-se a milhares de usuários que economizam tempo e escalam seus negócios com o Clona Gram.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <button
                            onClick={() => navigate('/login')}
                            className="px-8 py-4 bg-white text-primary rounded-xl font-bold shadow-xl hover:shadow-2xl hover:bg-white/90 transition-all flex items-center justify-center gap-2 text-lg transform hover:-translate-y-1"
                        >
                            Criar Conta Grátis
                            <ArrowRight className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-8 py-4 bg-black/20 hover:bg-black/30 text-white rounded-xl font-bold border border-white/20 backdrop-blur-md transition-all flex items-center justify-center gap-2 text-lg"
                        >
                            Saber Mais
                        </button>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
