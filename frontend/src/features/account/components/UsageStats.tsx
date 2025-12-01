import { Zap, Clock, MessageSquare, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Plan } from '../hooks/useAccount';

interface UsageStat {
  current: number;
  max: number;
  percentage: number;
}

interface UsageStatsProps {
  realTimeJobs: UsageStat;
  historicalJobs: UsageStat;
  messagesPerDay: UsageStat;
  currentPlan?: Plan;
  className?: string;
}

export function UsageStats({
  realTimeJobs,
  historicalJobs,
  messagesPerDay,
  currentPlan = 'FREE',
  className,
}: UsageStatsProps) {
  const stats = [
    {
      icon: Zap,
      label: 'Jobs em Tempo Real',
      stat: realTimeJobs,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      progressColor: 'bg-primary',
    },
    {
      icon: Clock,
      label: 'Jobs Históricos',
      stat: historicalJobs,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      progressColor: 'bg-warning',
    },
    {
      icon: MessageSquare,
      label: 'Mensagens Hoje',
      stat: messagesPerDay,
      color: 'text-success',
      bgColor: 'bg-success/10',
      progressColor: 'bg-success',
    },
  ];

  const formatValue = (value: number) => {
    if (value === -1) return '∞';
    return value.toLocaleString('pt-BR');
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 70) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Estatísticas de Uso</h3>
          <p className="text-sm text-muted-foreground">
            Acompanhe seu consumo de recursos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((item, index) => {
          const Icon = item.icon;
          const isUnlimited = item.stat.max === -1;
          const usageColor = getUsageColor(item.stat.percentage);

          return (
            <div key={index} className="bg-card border rounded-lg p-4">
              {/* Icon and Label */}
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2 rounded-lg', item.bgColor)}>
                  <Icon className={cn('h-5 w-5', item.color)} />
                </div>
                <h4 className="text-sm font-medium">{item.label}</h4>
              </div>

              {/* Progress Bar */}
              {!isUnlimited && (
                <div className="mb-3">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full transition-all duration-300', item.progressColor)}
                      style={{ width: `${Math.min(100, item.stat.percentage)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Usage Numbers */}
              <div className="flex items-baseline justify-between">
                <div>
                  <span className={cn('text-2xl font-bold', usageColor)}>
                    {formatValue(item.stat.current)}
                  </span>
                  {!isUnlimited && (
                    <>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className="text-lg text-muted-foreground">
                        {formatValue(item.stat.max)}
                      </span>
                    </>
                  )}
                </div>
                {!isUnlimited && (
                  <span className={cn('text-sm font-medium', usageColor)}>
                    {Math.round(item.stat.percentage)}%
                  </span>
                )}
              </div>

              {/* Warning Message */}
              {!isUnlimited && item.stat.percentage >= 90 && (
                <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                  Você está próximo do limite!
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <span className="text-primary">ℹ️</span>
          Sobre os Limites
        </h4>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {currentPlan !== 'ENTERPRISE' && (
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Os limites são resetados diariamente à meia-noite (horário local)</span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Jobs em tempo real contam contra o limite apenas enquanto ativos</span>
          </li>
          {currentPlan === 'FREE' && (
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Faça upgrade para Premium para aumentar seus limites</span>
            </li>
          )}
          {currentPlan === 'PREMIUM' && (
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Faça upgrade para Enterprise para ter limites ilimitados</span>
            </li>
          )}
          {currentPlan === 'ENTERPRISE' && (
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Você tem acesso ilimitado a todos os recursos da plataforma</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
