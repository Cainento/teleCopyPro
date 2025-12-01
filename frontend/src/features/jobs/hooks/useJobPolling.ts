import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { POLLING_INTERVALS } from '@/lib/constants';

/**
 * Hook to enable intelligent polling for active jobs
 * Automatically adjusts polling based on job status and browser visibility
 */
export function useJobPolling(jobs: Array<{ id: string; status: string }>) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check if there are any active jobs
    const hasActiveJobs = jobs.some(
      (job) => job.status === 'running' || job.status === 'pending'
    );

    if (!hasActiveJobs) return;

    // Poll for job updates when there are active jobs
    const interval = setInterval(() => {
      // Only refetch if document is visible
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      }
    }, POLLING_INTERVALS.JOB_PROGRESS);

    return () => clearInterval(interval);
  }, [jobs, queryClient]);

  // Listen for visibility changes to pause/resume polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refetch immediately when tab becomes visible
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient]);
}
