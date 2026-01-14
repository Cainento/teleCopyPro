
import { motion } from 'framer-motion';
import { MessageCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

export function SupportSection() {
    const telegramLink = 'https://t.me/+3Z_8tDtRmj8zYjRh';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 relative overflow-hidden group"
        >
            {/* Background gradient effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-50 pointer-events-none group-hover:opacity-70 transition-opacity" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                            Suporte VIP Exclusivo
                        </h3>
                        <p className="text-muted-foreground text-sm max-w-xl">
                            Como membro Premium, você tem acesso ao nosso grupo exclusivo de suporte no Telegram via community. Tire dúvidas, relate problemas e receba atendimento prioritário diretamente com nossa equipe.
                        </p>
                    </div>
                </div>

                <motion.a
                    href={telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                        'flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg',
                        'bg-indigo-600 hover:bg-indigo-700 text-white',
                        'dark:bg-indigo-500 dark:hover:bg-indigo-600'
                    )}
                >
                    <MessageCircle className="w-5 h-5" />
                    <span>Acessar Grupo VIP</span>
                    <ExternalLink className="w-4 h-4 opacity-70" />
                </motion.a>
            </div>
        </motion.div>
    );
}
