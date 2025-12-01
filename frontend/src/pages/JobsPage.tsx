import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { JobsList } from '@/features/jobs/components/JobsList';
import { useJobs } from '@/features/jobs/hooks/useJobs';
import { useJobPolling } from '@/features/jobs/hooks/useJobPolling';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export function JobsPage() {
  const navigate = useNavigate();
  const { jobs, isLoading, stopJob, isStoppingJob } = useJobs();

  // Enable intelligent polling for active jobs
  useJobPolling(jobs);

  const handleJobClick = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header - Full Width */}
      <Header />

      {/* Content Area - Sidebar + Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto px-4 py-6 lg:px-8">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <JobsList
                jobs={jobs}
                onStop={stopJob}
                onJobClick={handleJobClick}
                isStoppingJob={isStoppingJob}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
