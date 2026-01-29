import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  StopCircle,
  ArrowRight,
  Image,
  MessageSquare,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/formatters';
import type { Job } from '@/api/types';

interface JobCardProps {
  job: Job;
  onStop?: (jobId: string) => void;
  onPause?: (jobId: string) => void;
  onResume?: (jobId: string) => void;
  onClick?: (jobId: string) => void;
  isStoppingJob?: boolean;
  isPausingJob?: boolean;
  isResumingJob?: boolean;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pendente',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    gradient: 'from-slate-500/20 to-gray-500/10',
  },
  running: {
    icon: Zap,
    label: 'Em Execução',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    gradient: 'from-primary/20 to-blue-500/10',
  },
  paused: {
    icon: PauseCircle,
    label: 'Pausado',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    gradient: 'from-orange-500/20 to-amber-500/10',
  },
  completed: {
    icon: CheckCircle,
    label: 'Concluído',
    color: 'text-success',
    bgColor: 'bg-success/10',
    gradient: 'from-green-500/20 to-emerald-500/10',
  },
  failed: {
    icon: XCircle,
    label: 'Falhou',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    gradient: 'from-red-500/20 to-rose-500/10',
  },
  stopped: {
    icon: StopCircle,
    label: 'Parado',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    gradient: 'from-slate-500/20 to-gray-500/10',
  },
};

export const JobCard = memo(function JobCard({
  job,
  onStop,
  onPause,
  onResume,
  onClick,
  isStoppingJob,
  isPausingJob,
  isResumingJob,
}: JobCardProps) {
  const config = statusConfig[job.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5 transition-all duration-200 relative overflow-hidden',
        onClick && 'cursor-pointer hover:border-primary/50 hover:shadow-lg'
      )}
      onClick={() => onClick?.(job.id)}
    >
      {/* Background gradient */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none',
        config.gradient
      )} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-3">
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold',
                config.bgColor, config.color
              )}>
                <StatusIcon className={cn('h-3.5 w-3.5', job.status === 'running' && 'animate-pulse')} />
                <span>{config.label}</span>
              </div>
              {job.real_time && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-semibold">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Tempo Real</span>
                </div>
              )}
            </div>

            {/* Channels */}
            <div className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold truncate">{job.source_channel}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold truncate">{job.target_channel}</span>
            </div>
          </div>
        </div>

        {/* Job Info */}
        <div className="mb-4 space-y-2">
          {/* Messages Copied */}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-lg bg-success/10 flex items-center justify-center">
              <MessageSquare className="h-3.5 w-3.5 text-success" />
            </div>
            <span className="text-muted-foreground">Copiadas:</span>
            <span className="font-bold text-foreground">
              {job.messages_copied.toLocaleString('pt-BR')}
            </span>
          </div>

          {/* Messages Failed */}
          {job.messages_failed > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <span className="text-muted-foreground">Falhadas:</span>
              <span className="font-bold text-destructive">
                {job.messages_failed.toLocaleString('pt-BR')}
              </span>
            </div>
          )}

          {/* Copy Media */}
          {job.copy_media && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Image className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-muted-foreground">Cópia de mídia ativada</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            {job.created_at && (
              <span>
                Criado{' '}
                {formatRelativeTime(job.created_at)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Pause Button */}
            {job.status === 'running' && onPause && (
              <motion.button
                onClick={() => onPause(job.id)}
                disabled={isPausingJob}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 text-xs font-semibold bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                {isPausingJob ? 'Pausando...' : 'Pausar'}
              </motion.button>
            )}

            {/* Resume Button */}
            {job.status === 'paused' && onResume && (
              <motion.button
                onClick={() => onResume(job.id)}
                disabled={isResumingJob}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                {isResumingJob ? 'Retomando...' : 'Continuar'}
              </motion.button>
            )}

            {/* Stop Button */}
            {(job.status === 'running' || job.status === 'pending' || job.status === 'paused') && onStop && (
              <motion.button
                onClick={() => onStop(job.id)}
                disabled={isStoppingJob}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <StopCircle className="h-3.5 w-3.5" />
                {isStoppingJob ? 'Parando...' : 'Parar'}
              </motion.button>
            )}
          </div>
        </div>

        {/* Status Message (e.g. Wait Time) */}
        {job.status_message && (
          <div className="mt-4 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl text-xs text-orange-600 flex items-start gap-2">
            <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Status:</span> {job.status_message}
            </div>
          </div>
        )}

        {/* Error Message */}
        {job.status === 'failed' && job.error_message && (
          <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-xl text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Erro:</span> {job.error_message}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});
