import { cn } from '@/lib/cn';

interface JobProgressProps {
  messagesCopied: number;
  totalMessages: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  className?: string;
}

export function JobProgress({
  messagesCopied,
  totalMessages,
  status,
  className,
}: JobProgressProps) {
  const percentage =
    totalMessages > 0 ? Math.min(100, Math.round((messagesCopied / totalMessages) * 100)) : 0;

  const progressColor = {
    pending: 'bg-muted',
    running: 'bg-primary',
    completed: 'bg-success',
    failed: 'bg-destructive',
    stopped: 'bg-warning',
  }[status];

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300 ease-out', progressColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Progress Text */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {messagesCopied.toLocaleString('pt-BR')} / {totalMessages.toLocaleString('pt-BR')}{' '}
          mensagens
        </span>
        <span className="font-medium">{percentage}%</span>
      </div>
    </div>
  );
}
