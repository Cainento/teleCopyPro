import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { JobDetails } from '@/features/jobs/components/JobDetails';
import { useJobs } from '@/features/jobs/hooks/useJobs';
import { Loader2, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const {
    useJob,
    stopJob,
    pauseJob,
    resumeJob,
    isStoppingJob,
    isPausingJob,
    isResumingJob
  } = useJobs();

  const { data: job, isLoading, error, refetch } = useJob(jobId || '');

  useEffect(() => {
    if (!jobId) {
      navigate('/jobs');
    }
  }, [jobId, navigate]);

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
            ) : error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  Erro ao carregar job
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Não foi possível carregar os detalhes do job.
                </p>
                <button
                  onClick={() => navigate('/jobs')}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Voltar para lista
                </button>
              </div>
            ) : job ? (
              <JobDetails
                job={job}
                onStop={stopJob}
                onPause={pauseJob}
                onResume={resumeJob}
                onRefresh={refetch}
                isStoppingJob={isStoppingJob}
                isPausingJob={isPausingJob}
                isResumingJob={isResumingJob}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
