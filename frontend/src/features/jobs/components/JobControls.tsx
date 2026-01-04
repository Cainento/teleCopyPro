import { StopCircle, RefreshCw, PauseCircle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Job } from '@/api/types';

interface JobControlsProps {
  job: Job;
  onStop?: (jobId: string) => void;
  onPause?: (jobId: string) => void;
  onResume?: (jobId: string) => void;
  onRefresh?: () => void;
  isStoppingJob?: boolean;
  isPausingJob?: boolean;
  isResumingJob?: boolean;
  className?: string;
}

export function JobControls({
  job,
  onStop,
  onPause,
  onResume,
  onRefresh,
  isStoppingJob,
  isPausingJob,
  isResumingJob,
  className,
}: JobControlsProps) {
  const isRunning = job.status === 'running';
  const isPaused = job.status === 'paused';
  const isActive = isRunning || job.status === 'pending' || isPaused;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors"
          title="Atualizar dados"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="text-sm font-medium">Atualizar</span>
        </button>
      )}

      {/* Pause Button */}
      {isRunning && onPause && (
        <button
          onClick={() => onPause(job.id)}
          disabled={isPausingJob}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PauseCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            {isPausingJob ? 'Pausando...' : 'Pausar'}
          </span>
        </button>
      )}

      {/* Resume Button */}
      {isPaused && onResume && (
        <button
          onClick={() => onResume(job.id)}
          disabled={isResumingJob}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlayCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            {isResumingJob ? 'Retomar' : 'Continuar'}
          </span>
        </button>
      )}

      {/* Stop Button */}
      {isActive && onStop && (
        <button
          onClick={() => onStop(job.id)}
          disabled={isStoppingJob}
          className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <StopCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            {isStoppingJob ? 'Parando...' : 'Parar Job'}
          </span>
        </button>
      )}
    </div>
  );
}
