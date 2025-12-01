import { Crown, Check, X, Calendar } from 'lucide-react';
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
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: null,
  },
  PREMIUM: {
    name: 'Premium',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    icon: Crown,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    icon: Crown,
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
      value: 'Incluído',
      enabled: limits.mediaSupport,
    },
    {
      label: 'Suporte Prioritário',
      value: 'Incluído',
      enabled: limits.prioritySupport,
    },
  ];

  return (
    <div className={cn('bg-card border rounded-lg p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn('p-2 rounded-lg', config.bgColor)}>
              <Icon className={cn('h-6 w-6', config.color)} />
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Plano Atual</p>
            <h3 className={cn('text-2xl font-bold', config.color)}>{config.name}</h3>
          </div>
        </div>

        <div className={cn('px-4 py-2 rounded-full text-sm font-medium', config.bgColor, config.color)}>
          {currentPlan}
        </div>
      </div>

      {/* Expiry Date */}
      {expiryDate && (
        <div className="flex items-center gap-2 mb-6 p-3 bg-muted/50 rounded-lg">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Válido até</p>
            <p className="text-xs text-muted-foreground">
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
            <div
              key={index}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg transition-colors',
                feature.enabled ? 'bg-success/5' : 'bg-muted/50'
              )}
            >
              <div className="flex items-center gap-3">
                {feature.enabled ? (
                  <Check className="h-4 w-4 text-success flex-shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className={cn('text-sm', !feature.enabled && 'text-muted-foreground')}>
                  {feature.label}
                </span>
              </div>
              <span className={cn('text-sm font-medium', feature.enabled ? 'text-success' : 'text-muted-foreground')}>
                {feature.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
