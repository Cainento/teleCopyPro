import { StopCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Job } from '@/api/types';

interface JobControlsProps {
  job: Job;
  onStop?: (jobId: string) => void;
  onRefresh?: () => void;
  isStoppingJob?: boolean;
  className?: string;
}

export function JobControls({
  job,
  onStop,
  onRefresh,
  isStoppingJob,
  className,
}: JobControlsProps) {
  const isActive = job.status === 'running' || job.status === 'pending';

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

      {/* Stop Button */}
      {isActive && onStop && (
        <button
          onClick={() => onStop(job.id)}
          disabled={isStoppingJob}
          className="flex items-center gap-2 px-4 py-2 bg-warning/10 text-warning hover:bg-warning/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
