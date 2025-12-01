import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/lib/constants';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-primary/10 to-primary/5">
      <div className="container mx-auto px-4 max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Pronto para Começar?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Comece a copiar mensagens do Telegram em minutos. Experimente gratuitamente hoje!
          </p>
          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className="px-10 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:scale-105 hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto"
          >
            Começar Agora
            <ArrowRight className="h-5 w-5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
