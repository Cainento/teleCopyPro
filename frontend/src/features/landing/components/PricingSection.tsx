import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Zap, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { redirectToCheckout, STRIPE_PRICE_IDS } from '@/api/stripe.api';
import { useAuthStore } from '@/store/auth.store';

interface PlanOption {
  id: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  annualSavings: string;
  description: string;
  popular: boolean;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  features: Array<{ text: string; included: boolean }>;
}

const PLANS: PlanOption[] = [
  {
    id: 'FREE',
    name: 'Gratuito',
    monthlyPrice: 'R$ 0',
    annualPrice: 'R$ 0',
    annualSavings: '',
    description: 'Perfeito para começar',
    popular: false,
    features: [
      { text: 'Até 3 jobs históricos', included: true },
      { text: '1.000 mensagens por dia', included: true },
      { text: 'Suporte a mídia', included: true },
      { text: 'Jobs em tempo real', included: false },
      { text: 'Suporte prioritário', included: false },
    ],
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    monthlyPrice: 'R$ 59,90',
    annualPrice: 'R$ 599,00',
    annualSavings: 'Economize ~17%',
    description: 'Para usuários ativos',
    popular: true,
    stripePriceIdMonthly: STRIPE_PRICE_IDS.PREMIUM_MONTHLY,
    stripePriceIdAnnual: STRIPE_PRICE_IDS.PREMIUM_ANNUAL,
    features: [
      { text: 'Até 20 jobs históricos', included: true },
      { text: '10.000 mensagens por dia', included: true },
      { text: 'Suporte a mídia', included: true },
      { text: 'Até 5 jobs em tempo real', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    monthlyPrice: 'R$ 99,90',
    annualPrice: 'R$ 999,00',
    annualSavings: 'Economize ~17%',
    description: 'Uso ilimitado',
    popular: false,
    stripePriceIdMonthly: STRIPE_PRICE_IDS.ENTERPRISE_MONTHLY,
    stripePriceIdAnnual: STRIPE_PRICE_IDS.ENTERPRISE_ANNUAL,
    features: [
      { text: 'Jobs históricos ilimitados', included: true },
      { text: 'Mensagens ilimitadas', included: true },
      { text: 'Suporte a mídia', included: true },
      { text: 'Jobs em tempo real ilimitados', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
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
  const { isAuthenticated } = useAuthStore();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const handleSelectPlan = async (plan: PlanOption) => {
    console.log('handleSelectPlan called with plan:', plan.id);
    console.log('Plan object:', plan);
    console.log('STRIPE_PRICE_IDS:', STRIPE_PRICE_IDS);
    console.log('isAuthenticated:', isAuthenticated);

    // If user is not authenticated, redirect to login
    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting to login');
      navigate(ROUTES.LOGIN);
      return;
    }

    // Free plan doesn't need checkout
    if (plan.id === 'FREE' || !plan.stripePriceIdMonthly) {
      console.log('Free plan or no price ID, redirecting to dashboard');
      navigate(ROUTES.DASHBOARD);
      return;
    }

    const priceId = isAnnual ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly;
    console.log('Selected price ID:', priceId, 'isAnnual:', isAnnual);

    if (!priceId) {
      console.error('No price ID configured for plan:', plan.id);
      toast.error('Price ID não configurado para este plano');
      return;
    }

    setLoadingPlanId(plan.id);
    console.log('Calling redirectToCheckout with price ID:', priceId);

    try {
      await redirectToCheckout(priceId);
    } catch (error) {
      console.error('Erro ao redirecionar para checkout:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
      setLoadingPlanId(null);
    }
  };

  return (
    <section id="pricing" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 mb-12"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              Escolha o Plano Ideal
            </h2>
            <p className="text-muted-foreground">
              Atualize seu plano e desbloqueie recursos adicionais
            </p>
          </div>

          {/* Billing Period Toggle */}
          <div className="inline-flex items-center gap-3 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                !isAnnual ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                isAnnual ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Anual
              <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                Economize 17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Plans Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              variants={fadeInUp}
              className={cn(
                'relative bg-card border-2 rounded-lg p-6 flex flex-col transition-all',
                plan.popular && 'border-primary shadow-lg scale-105',
                !plan.popular && 'border-border'
              )}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                    <Zap className="h-3 w-3" />
                    <span>Mais Popular</span>
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                {plan.id !== 'FREE' && (
                  <Crown className={cn('h-8 w-8 mx-auto mb-3', plan.popular ? 'text-primary' : 'text-warning')} />
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold">
                    {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">
                    {plan.id === 'FREE' ? '' : isAnnual ? '/ano' : '/mês'}
                  </span>
                </div>
                {isAnnual && plan.annualSavings && (
                  <p className="text-xs text-success mt-1">{plan.annualSavings}</p>
                )}
                {plan.id === 'FREE' && (
                  <p className="text-xs text-muted-foreground mt-1">Para sempre</p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    {feature.included ? (
                      <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-muted rounded flex-shrink-0 mt-0.5" />
                    )}
                    <span className={cn('text-sm', !feature.included && 'text-muted-foreground')}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={loadingPlanId !== null}
                className={cn(
                  'w-full py-3 px-4 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2',
                  plan.popular &&
                    'bg-primary text-primary-foreground hover:scale-105 hover:shadow-lg',
                  !plan.popular &&
                    plan.id === 'FREE' &&
                    'bg-muted text-foreground hover:bg-muted/80',
                  !plan.popular &&
                    plan.id !== 'FREE' &&
                    'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground',
                  loadingPlanId === plan.id && 'opacity-70 cursor-wait'
                )}
              >
                {loadingPlanId === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
                {plan.id === 'FREE' ? 'Começar Grátis' : 'Fazer Upgrade'}
              </button>
            </motion.div>
          ))}
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-primary/5 border border-primary/20 rounded-lg p-6 mt-12 max-w-4xl mx-auto"
        >
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="text-primary">ℹ️</span>
            Informações Importantes
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Todos os planos incluem suporte a cópia de mídia (fotos, vídeos, documentos)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Você pode fazer upgrade a qualquer momento sem perder seus dados</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Jobs em tempo real permanecem ativos até serem manualmente parados</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Pagamentos processados de forma segura via Stripe</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
