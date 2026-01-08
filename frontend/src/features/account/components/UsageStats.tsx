import { motion } from 'framer-motion';
import { Zap, Clock, MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react';
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
      gradient: 'from-blue-500/20 to-cyan-500/10',
      iconColor: 'text-blue-500',
      progressGradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Clock,
      label: 'Jobs Históricos',
      stat: historicalJobs,
      gradient: 'from-amber-500/20 to-yellow-500/10',
      iconColor: 'text-amber-500',
      progressGradient: 'from-amber-500 to-yellow-500',
    },
    {
      icon: MessageSquare,
      label: 'Mensagens Hoje',
      stat: messagesPerDay,
      gradient: 'from-green-500/20 to-emerald-500/10',
      iconColor: 'text-green-500',
      progressGradient: 'from-green-500 to-emerald-500',
    },
  ];

  const formatValue = (value: number) => {
    if (value === -1) return '∞';
    return value.toLocaleString('pt-BR');
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage >= 90) return { color: 'text-destructive', status: 'critical' };
    if (percentage >= 70) return { color: 'text-warning', status: 'warning' };
    return { color: 'text-success', status: 'normal' };
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Estatísticas de Uso</h3>
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
          const usage = getUsageStatus(item.stat.percentage);

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5 relative overflow-hidden"
            >
              {/* Background gradient */}
              <div className={cn(
                'absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none',
                item.gradient
              )} />

              <div className="relative z-10">
                {/* Icon and Label */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br',
                    item.gradient.replace('/20', '/30').replace('/10', '/20')
                  )}>
                    <Icon className={cn('h-5 w-5', item.iconColor)} />
                  </div>
                  <h4 className="text-sm font-semibold">{item.label}</h4>
                </div>

                {/* Progress Bar */}
                {!isUnlimited && (
                  <div className="mb-4">
                    <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, item.stat.percentage)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={cn(
                          'h-full rounded-full bg-gradient-to-r',
                          item.progressGradient
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Usage Numbers */}
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className={cn('text-2xl font-bold', usage.color)}>
                      {formatValue(item.stat.current)}
                    </span>
                    {!isUnlimited && (
                      <>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-lg text-muted-foreground">
                          {formatValue(item.stat.max)}
                        </span>
                      </>
                    )}
                  </div>
                  {!isUnlimited && (
                    <span className={cn('text-sm font-semibold', usage.color)}>
                      {Math.round(item.stat.percentage)}%
                    </span>
                  )}
                </div>

                {/* Warning Message */}
                {!isUnlimited && item.stat.percentage >= 90 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-3 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-xs text-destructive"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Você está próximo do limite!</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="text-lg">ℹ️</span>
          Sobre os Limites
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
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
