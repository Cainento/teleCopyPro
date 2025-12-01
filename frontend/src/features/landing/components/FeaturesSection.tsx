import { motion } from 'framer-motion';
import { History, Zap, Layers, Activity, Shield, LayoutDashboard, type LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: History,
    title: 'Cópia Histórica',
    description: 'Copie todo o histórico de mensagens de um canal com poucos cliques',
  },
  {
    icon: Zap,
    title: 'Tempo Real',
    description: 'Monitore e copie novas mensagens automaticamente conforme chegam',
  },
  {
    icon: Layers,
    title: 'Múltiplos Canais',
    description: 'Gerencie operações de cópia para vários canais simultaneamente',
  },
  {
    icon: Activity,
    title: 'Acompanhamento em Tempo Real',
    description: 'Monitore o status e progresso de cada operação de cópia',
  },
  {
    icon: Shield,
    title: 'Seguro e Privado',
    description: 'Conecte-se com segurança usando suas próprias credenciais da API do Telegram',
  },
  {
    icon: LayoutDashboard,
    title: 'Interface Intuitiva',
    description: 'Gerencie todas as operações em um dashboard limpo e fácil de usar',
  },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
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

export function FeaturesSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Recursos Poderosos
          </h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-card border rounded-lg p-6 transition-shadow hover:shadow-lg"
              >
                <Icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
