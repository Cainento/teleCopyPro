import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, CheckCircle, XCircle, Clock, StopCircle, Pause, Copy, Sparkles } from 'lucide-react';
import { formatRelativeTime, formatNumber } from '@/lib/formatters';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { CopyJob } from '@/types';

interface RecentJobsProps {
  jobs: CopyJob[];
  isLoading: boolean;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  running: { icon: Play, color: 'text-primary', bg: 'bg-primary/10', label: 'Em execução' },
  completed: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Concluído' },
  failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Falhou' },
  stopped: { icon: StopCircle, color: 'text-warning', bg: 'bg-warning/10', label: 'Parado' },
  paused: { icon: Pause, color: 'text-warning', bg: 'bg-warning/10', label: 'Pausado' },
  pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Pendente' },
};

function JobCard({ job, index }: { job: CopyJob; index: number }) {
  const config = statusConfig[job.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`${ROUTES.JOBS}?job=${job.id}`}
        className="block p-4 bg-muted/30 hover:bg-muted/50 rounded-xl transition-all duration-200 group"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          {/* Channel info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium truncate">
                {job.source_channel}
              </span>
              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium truncate">
                {job.target_channel}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatRelativeTime(job.created_at)}
            </div>
          </div>

          {/* Status badge */}
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0',
            config.bg, config.color
          )}>
            <Icon className={cn('w-3.5 h-3.5', job.status === 'running' && 'animate-pulse')} />
            <span>{config.label}</span>
          </div>
        </div>

        {/* Progress bar for running jobs */}
        {job.status === 'running' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progresso</span>
              <span>{formatNumber(job.messages_copied)} mensagens</span>
            </div>
            <div className="progress">
              <div className="progress-bar progress-bar-animated" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {/* Stats for completed jobs */}
        {job.status === 'completed' && (
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-success" />
              {formatNumber(job.messages_copied)} copiadas
            </span>
            {job.messages_failed > 0 && (
              <span className="flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-destructive" />
                {formatNumber(job.messages_failed)} falhadas
              </span>
            )}
          </div>
        )}

        {/* Error message for failed jobs */}
        {job.status === 'failed' && job.error_message && (
          <div className="mt-3 text-xs text-destructive bg-destructive/5 p-2 rounded-lg">
            {job.error_message}
          </div>
        )}
      </Link>
    </motion.div>
  );
}

export function RecentJobs({ jobs, isLoading }: RecentJobsProps) {
  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 h-full">
        <h3 className="text-lg font-bold mb-4">Jobs Recentes</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-muted/30 rounded-xl">
              <div className="h-4 skeleton rounded w-3/4 mb-2" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 h-full">
        <h3 className="text-lg font-bold mb-4">Jobs Recentes</h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground mb-4">Nenhum job encontrado</p>
          <Link to={ROUTES.COPY} className="btn btn-primary">
            <span>Criar Primeiro Job</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Jobs Recentes</h3>
        <Link
          to={ROUTES.JOBS}
          className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1 group"
        >
          Ver todos
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Jobs list */}
      <div className="space-y-3">
        {jobs.map((job, index) => (
          <JobCard key={job.id} job={job} index={index} />
        ))}
      </div>

      {/* Create new job CTA */}
      <div className="mt-6 pt-4 border-t border-border/50">
        <Link
          to={ROUTES.COPY}
          className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary-hover font-medium group"
        >
          <Sparkles className="w-4 h-4" />
          <span>Criar novo job</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
