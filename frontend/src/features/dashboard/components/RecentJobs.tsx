import { Link } from 'react-router-dom';
import { ArrowRight, Play, CheckCircle, XCircle, Clock, StopCircle } from 'lucide-react';
import { formatRelativeTime, formatNumber } from '@/lib/formatters';
import { ROUTES } from '@/lib/constants';
import type { CopyJob } from '@/types';

interface RecentJobsProps {
  jobs: CopyJob[];
  isLoading: boolean;
}

export function RecentJobs({ jobs, isLoading }: RecentJobsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="h-4 w-4 text-primary animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'stopped':
        return <StopCircle className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'running':
        return 'Em execução';
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
      case 'stopped':
        return 'Parado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-primary bg-primary/10';
      case 'completed':
        return 'text-success bg-success/10';
      case 'failed':
        return 'text-destructive bg-destructive/10';
      case 'stopped':
        return 'text-warning bg-warning/10';
      default:
        return 'text-muted-foreground bg-muted/10';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Jobs Recentes</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-md animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Jobs Recentes</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Nenhum job encontrado</p>
          <Link
            to={ROUTES.COPY}
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            Criar primeiro job
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Jobs Recentes</h3>
        <Link
          to={ROUTES.JOBS}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Ver todos
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <Link
            key={job.id}
            to={`${ROUTES.JOBS}?job=${job.id}`}
            className="block p-4 border rounded-md hover:bg-accent transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate">
                    {job.source_channel} → {job.target_channel}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(job.created_at)}
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                {getStatusIcon(job.status)}
                <span>{getStatusText(job.status)}</span>
              </div>
            </div>

            {job.status === 'running' && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{formatNumber(job.messages_copied)} mensagens</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {job.status === 'completed' && (
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-success" />
                  {formatNumber(job.messages_copied)} copiadas
                </span>
                {job.messages_failed > 0 && (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-destructive" />
                    {formatNumber(job.messages_failed)} falhadas
                  </span>
                )}
              </div>
            )}

            {job.status === 'failed' && job.error_message && (
              <div className="mt-2 text-xs text-destructive">
                {job.error_message}
              </div>
            )}
          </Link>
        ))}
      </div>

      {jobs.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <Link
            to={ROUTES.COPY}
            className="flex items-center justify-center gap-2 text-sm text-primary hover:underline font-medium"
          >
            Criar novo job
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
