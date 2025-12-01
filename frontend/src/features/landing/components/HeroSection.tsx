import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { ROUTES } from '@/lib/constants';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

export function HeroSection() {
  const navigate = useNavigate();

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4 pt-16">
      <motion.div
        className="max-w-4xl mx-auto text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-6"
          variants={fadeInUp}
        >
          Copie Mensagens do Telegram com Facilidade Profissional
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          variants={fadeInUp}
        >
          Transfira mensagens entre canais do Telegram automaticamente. Suporte para cópia histórica e em tempo real.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          variants={fadeInUp}
        >
          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:scale-105 hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            Começar Agora
            <ArrowRight className="h-5 w-5" />
          </button>

          <button
            onClick={scrollToHowItWorks}
            className="px-6 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
          >
            Ver Como Funciona
          </button>
        </motion.div>

        <motion.div
          className="mt-16 flex justify-center"
          variants={fadeInUp}
        >
          <button
            onClick={scrollToHowItWorks}
            className="p-2 rounded-full hover:bg-accent transition-colors animate-bounce"
            aria-label="Rolar para baixo"
          >
            <ChevronDown className="h-6 w-6 text-muted-foreground" />
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
