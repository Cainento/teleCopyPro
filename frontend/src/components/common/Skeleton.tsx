import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted/50 relative overflow-hidden',
        variant === 'text' && 'h-4 rounded',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-xl',
        className
      )}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// Skeleton presets for common components
export function CardSkeleton() {
  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="h-12 w-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-24" />
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-6 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border/50">
      <Skeleton className="h-10 w-10 rounded-lg" /> {/* Icon placeholder */}
      <div className="flex-1 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="circular" className="h-12 w-12" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
