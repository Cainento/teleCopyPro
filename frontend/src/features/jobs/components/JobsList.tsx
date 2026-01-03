import { useState, useMemo } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JobCard } from './JobCard';
import { cn } from '@/lib/cn';
import type { Job } from '@/api/types';

interface JobsListProps {
  jobs: Job[];
  onStop?: (jobId: string) => void;
  onPause?: (jobId: string) => void;
  onResume?: (jobId: string) => void;
  onJobClick?: (jobId: string) => void;
  isStoppingJob?: boolean;
  isPausingJob?: boolean;
  isResumingJob?: boolean;
}

type JobStatus = 'all' | 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped';

export function JobsList({
  jobs,
  onStop,
  onPause,
  onResume,
  onJobClick,
  isStoppingJob,
  isPausingJob,
  isResumingJob,
}: JobsListProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus>('all');

  // Filter jobs based on search and status
  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'completed') {
        // Special case: completed filter includes both 'completed' and 'stopped'
        filtered = filtered.filter((job) => job.status === 'completed' || job.status === 'stopped');
      } else {
        filtered = filtered.filter((job) => job.status === statusFilter);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.source_channel.toLowerCase().includes(query) ||
          job.target_channel.toLowerCase().includes(query) ||
          job.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [jobs, searchQuery, statusFilter]);

  // Status filters
  const filters: Array<{ value: JobStatus; label: string; count: number }> = [
    { value: 'all', label: 'Todos', count: jobs.length },
    {
      value: 'running',
      label: 'Em Execução',
      count: jobs.filter((j) => j.status === 'running').length,
    },
    {
      value: 'paused',
      label: 'Pausados',
      count: jobs.filter((j) => j.status === 'paused').length,
    },
    {
      value: 'pending',
      label: 'Pendentes',
      count: jobs.filter((j) => j.status === 'pending').length,
    },
    {
      value: 'completed',
      label: 'Concluídos',
      count: jobs.filter((j) => j.status === 'completed' || j.status === 'stopped').length,
    },
    {
      value: 'failed',
      label: 'Falhados',
      count: jobs.filter((j) => j.status === 'failed').length,
    },
    // 'stopped' status removed from filters list as it is merged into 'completed'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Jobs de Cópia</h2>
          <p className="text-sm text-muted-foreground">
            {filteredJobs.length} de {jobs.length} jobs
          </p>
        </div>

        <button
          onClick={() => navigate('/copy')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="h-4 w-4" />
          Novo Job
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por canal ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  statusFilter === filter.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <div className="bg-card border rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-4 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum job encontrado</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Crie seu primeiro job de cópia para começar'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => navigate('/copy')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                Criar Novo Job
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onStop={onStop}
              onPause={onPause}
              onResume={onResume}
              onClick={onJobClick}
              isStoppingJob={isStoppingJob}
              isPausingJob={isPausingJob}
              isResumingJob={isResumingJob}
            />
          ))}
        </div>
      )}
    </div>
  );
}
