import { motion } from 'framer-motion';
import { Activity, CheckCircle, XCircle, MessageSquare, TrendingUp } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/cn';

interface QuickStatsProps {
  stats: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalMessagesCopied: number;
    totalMessagesFailed: number;
  };
  isLoading: boolean;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export function QuickStats({ stats, isLoading }: QuickStatsProps) {
  const statCards = [
    {
      title: 'Jobs Ativos',
      value: stats.activeJobs,
      icon: Activity,
      gradient: 'from-blue-500/20 to-cyan-500/10',
      iconColor: 'text-blue-500',
      trend: null,
    },
    {
      title: 'Jobs Concluídos',
      value: stats.completedJobs,
      icon: CheckCircle,
      gradient: 'from-green-500/20 to-emerald-500/10',
      iconColor: 'text-green-500',
      trend: null,
    },
    {
      title: 'Mensagens Copiadas',
      value: stats.totalMessagesCopied,
      icon: MessageSquare,
      gradient: 'from-purple-500/20 to-pink-500/10',
      iconColor: 'text-purple-500',
      trend: null,
    },
    {
      title: 'Jobs com Erro',
      value: stats.failedJobs,
      icon: XCircle,
      gradient: 'from-red-500/20 to-orange-500/10',
      iconColor: 'text-red-500',
      trend: null,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl skeleton" />
            </div>
            <div className="space-y-2">
              <div className="h-4 skeleton rounded w-20" />
              <div className="h-8 skeleton rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.title}
            variants={fadeInUp}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group relative card-premium p-6 overflow-hidden"
          >
            {/* Background gradient */}
            <div className={cn(
              'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500',
              stat.gradient
            )} />

            {/* Content */}
            <div className="relative z-10">
              {/* Icon */}
              <div className="flex items-start justify-between mb-4">
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    'p-3 rounded-xl bg-gradient-to-br',
                    stat.gradient.replace('/20', '/30').replace('/10', '/20')
                  )}
                >
                  <Icon className={cn('h-6 w-6', stat.iconColor)} />
                </motion.div>

                {stat.trend !== null && (
                  <div className="flex items-center gap-1 text-xs font-medium text-success">
                    <TrendingUp className="w-3 h-3" />
                    <span>{stat.trend}%</span>
                  </div>
                )}
              </div>

              {/* Value */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <motion.p
                  key={stat.value}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-bold"
                >
                  {formatNumber(stat.value)}
                </motion.p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
