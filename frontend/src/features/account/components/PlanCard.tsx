import { motion } from 'framer-motion';
import { Crown, Check, X, Calendar, Sparkles, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import type { Plan, PlanLimits } from '../hooks/useAccount';

interface PlanCardProps {
  currentPlan: Plan;
  limits: PlanLimits;
  expiryDate?: string;
  className?: string;
}

const PLAN_CONFIG = {
  FREE: {
    name: 'Gratuito',
    gradient: 'from-slate-500 to-gray-500',
    bgGradient: 'from-slate-500/20 to-gray-500/10',
    textColor: 'text-slate-500',
    icon: Sparkles,
  },
  PREMIUM: {
    name: 'Premium',
    gradient: 'from-primary to-blue-500',
    bgGradient: 'from-primary/20 to-blue-500/10',
    textColor: 'text-primary',
    icon: Crown,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    gradient: 'from-amber-500 to-yellow-500',
    bgGradient: 'from-amber-500/20 to-yellow-500/10',
    textColor: 'text-amber-500',
    icon: Zap,
  },
};

export function PlanCard({ currentPlan, limits, expiryDate, className }: PlanCardProps) {
  const config = PLAN_CONFIG[currentPlan];
  const Icon = config.icon;

  const formatLimit = (value: number) => {
    if (value === -1) return 'Ilimitado';
    return value.toLocaleString('pt-BR');
  };

  const features = [
    {
      label: 'Jobs em Tempo Real',
      value: formatLimit(limits.maxRealTimeJobs),
      enabled: limits.maxRealTimeJobs !== 0,
    },
    {
      label: 'Jobs Históricos',
      value: formatLimit(limits.maxHistoricalJobs),
      enabled: true,
    },
    {
      label: 'Mensagens por Dia',
      value: formatLimit(limits.maxMessagesPerDay),
      enabled: true,
    },
    {
      label: 'Suporte a Mídia',
      value: limits.mediaSupport ? 'Incluído' : 'Não incluído',
      enabled: limits.mediaSupport,
    },
    {
      label: 'Suporte Prioritário',
      value: limits.prioritySupport ? 'Incluído' : 'Não incluído',
      enabled: limits.prioritySupport,
    },
  ];

  return (
    <div className={cn(
      'bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 relative overflow-hidden',
      className
    )}>
      {/* Background gradient */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-30 pointer-events-none',
        config.bgGradient
      )} />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Plan Icon */}
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg',
                config.gradient
              )}
            >
              <Icon className="h-7 w-7 text-white" />
            </motion.div>

            <div>
              <p className="text-sm text-muted-foreground">Plano Atual</p>
              <h3 className={cn('text-2xl font-bold', config.textColor)}>
                {config.name}
              </h3>
            </div>
          </div>

          {/* Plan Badge */}
          <div className={cn(
            'px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r text-white shadow-md',
            config.gradient
          )}>
            {currentPlan}
          </div>
        </div>

        {/* Expiry Date */}
        {expiryDate && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-muted/30 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Válido até</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(expiryDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recursos Incluídos
          </h4>
          <div className="space-y-2">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl transition-colors',
                  feature.enabled ? 'bg-success/5' : 'bg-muted/30'
                )}
              >
                <div className="flex items-center gap-3">
                  {feature.enabled ? (
                    <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-success" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className={cn('text-sm', !feature.enabled && 'text-muted-foreground')}>
                    {feature.label}
                  </span>
                </div>
                <span className={cn(
                  'text-sm font-semibold',
                  feature.enabled ? 'text-success' : 'text-muted-foreground'
                )}>
                  {feature.value}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
