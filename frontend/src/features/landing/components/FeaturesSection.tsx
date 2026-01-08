import { motion } from 'framer-motion';
import { History, Zap, Layers, Activity, Shield, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  iconColor: string;
}

const features: Feature[] = [
  {
    icon: History,
    title: 'Cópia Histórica',
    description: 'Copie todo o histórico de mensagens de um canal com poucos cliques. Suporte a milhares de mensagens.',
    gradient: 'from-blue-500/20 to-cyan-500/10',
    iconColor: 'text-blue-500',
  },
  {
    icon: Zap,
    title: 'Tempo Real',
    description: 'Monitore e copie novas mensagens automaticamente conforme chegam ao canal de origem.',
    gradient: 'from-yellow-500/20 to-orange-500/10',
    iconColor: 'text-yellow-500',
  },
  {
    icon: Layers,
    title: 'Múltiplos Canais',
    description: 'Gerencie operações de cópia para vários canais simultaneamente sem complicações.',
    gradient: 'from-purple-500/20 to-pink-500/10',
    iconColor: 'text-purple-500',
  },
  {
    icon: Activity,
    title: 'Monitoramento Completo',
    description: 'Acompanhe o status e progresso de cada operação em tempo real no dashboard.',
    gradient: 'from-green-500/20 to-emerald-500/10',
    iconColor: 'text-green-500',
  },
  {
    icon: Shield,
    title: 'Seguro e Privado',
    description: 'Conecte-se com segurança usando suas credenciais. Seus dados nunca são compartilhados.',
    gradient: 'from-teal-500/20 to-cyan-500/10',
    iconColor: 'text-teal-500',
  },
  {
    icon: LayoutDashboard,
    title: 'Interface Intuitiva',
    description: 'Dashboard moderno e fácil de usar. Configure tudo em poucos minutos.',
    gradient: 'from-indigo-500/20 to-blue-500/10',
    iconColor: 'text-indigo-500',
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
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group relative"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/10 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />

      {/* Card */}
      <div className={cn(
        'relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6',
        'hover:border-primary/30 hover:shadow-xl transition-all duration-300',
        'overflow-hidden'
      )}>
        {/* Background gradient */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500',
          feature.gradient
        )} />

        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center mb-5',
              'bg-gradient-to-br',
              feature.gradient.replace('/20', '/30').replace('/10', '/20')
            )}
          >
            <Icon className={cn('h-7 w-7', feature.iconColor)} />
          </motion.div>

          {/* Title */}
          <h3 className="text-xl font-bold mb-3 group-hover:text-gradient transition-all duration-300">
            {feature.title}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* Decorative corner */}
        <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-gradient-to-br from-transparent via-transparent to-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
      </div>
    </motion.div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 gradient-mesh opacity-50" />

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-primary bg-primary/10 rounded-full"
          >
            Recursos Poderosos
          </motion.span>

          <h2 className="heading-2 mb-4">
            Tudo que você precisa para{' '}
            <span className="text-gradient">copiar mensagens</span>
          </h2>

          <p className="body-large text-muted-foreground max-w-2xl mx-auto">
            Ferramentas profissionais para gerenciar suas operações de cópia
            do Telegram com eficiência e segurança.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
