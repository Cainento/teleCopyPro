import { memo } from 'react';
import { Clock, Zap, CheckCircle, XCircle, StopCircle, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { JobProgress } from './JobProgress';
import type { Job } from '@/api/types';

// Helper function to parse UTC timestamp correctly
const parseUTCTimestamp = (timestamp: string) => {
  // Ensure the timestamp has 'Z' suffix to indicate UTC
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`;
  return new Date(utcTimestamp);
};

interface JobCardProps {
  job: Job;
  onStop?: (jobId: string) => void;
  onClick?: (jobId: string) => void;
  isStoppingJob?: boolean;
}

export const JobCard = memo(function JobCard({
  job,
  onStop,
  onClick,
  isStoppingJob,
}: JobCardProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: 'Pendente',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    running: {
      icon: Zap,
      label: 'Em Execução',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    completed: {
      icon: CheckCircle,
      label: 'Concluído',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    failed: {
      icon: XCircle,
      label: 'Falhou',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    stopped: {
      icon: StopCircle,
      label: 'Parado',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  };

  const config = statusConfig[job.status];
  const StatusIcon = config.icon;

  const isActive = job.status === 'running' || job.status === 'pending';

  return (
    <div
      className={cn(
        'bg-card border rounded-lg p-4 transition-all hover:shadow-md',
        onClick && 'cursor-pointer hover:border-primary/50'
      )}
      onClick={() => onClick?.(job.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', config.bgColor, config.color)}>
              <StatusIcon className="h-3.5 w-3.5" />
              <span>{config.label}</span>
            </div>
            {job.real_time && (
              <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                <Zap className="h-3 w-3" />
                <span>Tempo Real</span>
              </div>
            )}
          </div>

          {/* Channels */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium truncate">{job.source_channel}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate">{job.target_channel}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <JobProgress
        messagesCopied={job.messages_copied}
        totalMessages={0}
        status={job.status}
        className="mb-3"
      />

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          {job.created_at && (
            <span>
              Criado{' '}
              {formatDistanceToNow(parseUTCTimestamp(job.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          )}
          {(job.started_at || job.completed_at) && job.status !== 'pending' && (
            <span>
              Atualizado{' '}
              {formatDistanceToNow(parseUTCTimestamp(job.completed_at || job.started_at!), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isActive && onStop && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStop(job.id);
              }}
              disabled={isStoppingJob}
              className="px-3 py-1 text-xs font-medium bg-warning/10 text-warning hover:bg-warning/20 rounded transition-colors disabled:opacity-50"
            >
              {isStoppingJob ? 'Parando...' : 'Parar'}
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {job.status === 'failed' && job.error_message && (
        <div className="mt-3 p-2 bg-destructive/5 border border-destructive/20 rounded text-xs text-destructive">
          <span className="font-medium">Erro:</span> {job.error_message}
        </div>
      )}
    </div>
  );
});
