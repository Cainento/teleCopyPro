import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Zap, Loader2, Sparkles, X } from 'lucide-react';
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
  gradient: string;
  iconColor: string;
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
    gradient: 'from-slate-500/20 to-gray-500/10',
    iconColor: 'text-slate-500',
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
    gradient: 'from-primary/30 to-blue-500/20',
    iconColor: 'text-primary',
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
    gradient: 'from-amber-500/30 to-yellow-500/20',
    iconColor: 'text-amber-500',
    features: [
      { text: 'Jobs históricos ilimitados', included: true },
      { text: 'Mensagens ilimitadas', included: true },
      { text: 'Suporte a mídia', included: true },
      { text: 'Jobs em tempo real ilimitados', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
  },
];

function PlanCard({
  plan,
  isAnnual,
  onSelect,
  isLoading
}: {
  plan: PlanOption;
  isAnnual: boolean;
  onSelect: () => void;
  isLoading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: plan.popular ? -8 : -4 }}
      className={cn(
        'relative bg-card/80 backdrop-blur-sm rounded-2xl p-6 flex flex-col',
        'border transition-all duration-300',
        plan.popular
          ? 'border-primary shadow-xl shadow-primary/10 scale-105 z-10'
          : 'border-border/50 hover:border-primary/30'
      )}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-primary to-secondary rounded-full shadow-lg"
          >
            <Zap className="h-3.5 w-3.5 text-white" />
            <span className="text-xs font-semibold text-white">Mais Popular</span>
          </motion.div>
        </div>
      )}

      {/* Background gradient */}
      <div className={cn(
        'absolute inset-0 rounded-2xl bg-gradient-to-br opacity-50 pointer-events-none',
        plan.gradient
      )} />

      {/* Content */}
      <div className="relative z-10">
        {/* Plan header */}
        <div className="text-center mb-6">
          <div className={cn(
            'w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center',
            'bg-gradient-to-br',
            plan.gradient
          )}>
            {plan.id === 'FREE' ? (
              <Sparkles className={cn('h-7 w-7', plan.iconColor)} />
            ) : (
              <Crown className={cn('h-7 w-7', plan.iconColor)} />
            )}
          </div>

          <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </div>

        {/* Price */}
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">
              {isAnnual ? plan.annualPrice : plan.monthlyPrice}
            </span>
            <span className="text-muted-foreground">
              {plan.id === 'FREE' ? '' : isAnnual ? '/ano' : '/mês'}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {isAnnual && plan.annualSavings && (
              <motion.p
                key="savings"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="text-xs text-success mt-2 font-medium"
              >
                {plan.annualSavings}
              </motion.p>
            )}
            {plan.id === 'FREE' && (
              <motion.p
                key="forever"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground mt-2"
              >
                Para sempre
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-3"
            >
              {feature.included ? (
                <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-success" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <X className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className={cn(
                'text-sm',
                feature.included ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {feature.text}
              </span>
            </motion.li>
          ))}
        </ul>

        {/* CTA Button */}
        <motion.button
          onClick={onSelect}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'w-full py-3.5 px-4 rounded-xl font-semibold transition-all duration-200',
            'flex items-center justify-center gap-2',
            plan.popular
              ? 'btn-primary shadow-glow'
              : plan.id === 'FREE'
                ? 'bg-muted text-foreground hover:bg-muted-hover'
                : 'btn-outline',
            isLoading && 'opacity-70 cursor-wait'
          )}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {plan.id === 'FREE' ? 'Começar Grátis' : 'Fazer Upgrade'}
        </motion.button>
      </div>
    </motion.div>
  );
}

export function PricingSection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const handleSelectPlan = async (plan: PlanOption) => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    if (plan.id === 'FREE' || !plan.stripePriceIdMonthly) {
      navigate(ROUTES.DASHBOARD);
      return;
    }

    const priceId = isAnnual ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly;
    if (!priceId) {
      toast.error('Price ID não configurado para este plano');
      return;
    }

    setLoadingPlanId(plan.id);
    try {
      await redirectToCheckout(priceId);
    } catch (error) {
      console.error('Erro ao redirecionar para checkout:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
      setLoadingPlanId(null);
    }
  };

  return (
    <section id="pricing" className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 gradient-mesh opacity-30" />

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center space-y-4 mb-12"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-primary bg-primary/10 rounded-full"
          >
            Planos e Preços
          </motion.span>

          <h2 className="heading-2">
            Escolha o Plano <span className="text-gradient">Ideal</span>
          </h2>

          <p className="body-large text-muted-foreground max-w-2xl mx-auto">
            Atualize seu plano e desbloqueie recursos adicionais para suas operações.
          </p>

          {/* Billing Period Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-1 p-1.5 bg-muted/50 backdrop-blur-sm rounded-xl border border-border/50"
          >
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                'px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                !isAnnual
                  ? 'bg-card shadow-md text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                'px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2',
                isAnnual
                  ? 'bg-card shadow-md text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Anual
              <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full font-semibold">
                -17%
              </span>
            </button>
          </motion.div>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto items-start">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isAnnual={isAnnual}
              onSelect={() => handleSelectPlan(plan)}
              isLoading={loadingPlanId === plan.id}
            />
          ))}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-6 px-6 py-4 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-success" />
              <span>Cancelamento fácil</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-success" />
              <span>Pagamento seguro</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-success" />
              <span>Suporte dedicado</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
