import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Crown } from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface PricingTier {
  name: string;
  price: string;
  badge?: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Grátis',
    price: 'R$ 0',
    features: [
      'Até 100 mensagens',
      'Cópia histórica',
      '1 operação simultânea',
      'Dashboard básico',
    ],
    cta: 'Começar Grátis',
    highlighted: false,
  },
  {
    name: 'Premium',
    price: 'Sob Consulta',
    badge: 'Mais Popular',
    features: [
      'Mensagens ilimitadas',
      'Cópia em tempo real',
      'Operações simultâneas ilimitadas',
      'Dashboard completo',
      'Suporte prioritário',
    ],
    cta: 'Começar Agora',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Customizado',
    features: [
      'Tudo do Premium',
      'API dedicada',
      'SLA garantido',
      'Suporte 24/7',
      'Consultoria personalizada',
    ],
    cta: 'Falar com Vendas',
    highlighted: false,
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

export function PricingSection() {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Planos e Preços
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Escolha o plano perfeito para suas necessidades
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className={cn(
                'bg-card border rounded-lg p-6 flex flex-col',
                tier.highlighted && 'border-primary border-2 shadow-lg relative scale-105'
              )}
            >
              {tier.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Crown className="h-4 w-4" />
                    {tier.badge}
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="text-3xl font-bold text-primary mb-1">{tier.price}</div>
                {tier.price === 'R$ 0' && <p className="text-sm text-muted-foreground">Para sempre</p>}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate(ROUTES.LOGIN)}
                className={cn(
                  'w-full py-3 rounded-lg font-semibold transition-all duration-200',
                  tier.highlighted
                    ? 'bg-primary text-primary-foreground hover:scale-105 hover:shadow-lg'
                    : 'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                )}
              >
                {tier.cta}
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
