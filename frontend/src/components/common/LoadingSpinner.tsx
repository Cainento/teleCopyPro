import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export function LoadingSpinner({
  size = 'md',
  text,
  fullScreen = false,
  className,
}: LoadingSpinnerProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className="relative">
        {/* Glow effect */}
        <div className={cn(
          'absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse',
          size === 'sm' && 'blur-sm',
          size === 'md' && 'blur-md'
        )} />

        {/* Spinner */}
        <Loader2 className={cn('relative animate-spin text-primary', sizeClasses[size])} />
      </div>

      {text && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
