import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Plus, Sparkles, Briefcase } from 'lucide-react';
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

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

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

  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    if (statusFilter !== 'all') {
      if (statusFilter === 'completed') {
        filtered = filtered.filter((job) => job.status === 'completed' || job.status === 'stopped');
      } else {
        filtered = filtered.filter((job) => job.status === statusFilter);
      }
    }

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

  const filters: Array<{ value: JobStatus; label: string; count: number }> = [
    { value: 'all', label: 'Todos', count: jobs.length },
    { value: 'running', label: 'Em Execução', count: jobs.filter((j) => j.status === 'running').length },
    { value: 'paused', label: 'Pausados', count: jobs.filter((j) => j.status === 'paused').length },
    { value: 'pending', label: 'Pendentes', count: jobs.filter((j) => j.status === 'pending').length },
    { value: 'completed', label: 'Concluídos', count: jobs.filter((j) => j.status === 'completed' || j.status === 'stopped').length },
    { value: 'failed', label: 'Falhados', count: jobs.filter((j) => j.status === 'failed').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            Jobs de <span className="text-gradient">Cópia</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredJobs.length} de {jobs.length} jobs
          </p>
        </div>

        <motion.button
          onClick={() => navigate('/copy')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn btn-primary shadow-glow group"
        >
          <Sparkles className="w-4 h-4" />
          <span>Novo Job</span>
          <Plus className="w-4 h-4" />
        </motion.button>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por canal ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-glass w-full pl-12 pr-4"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-2">
            {filters.map((filter) => (
              <motion.button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200',
                  statusFilter === filter.value
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {filter.label}
                <span className={cn(
                  'ml-1.5 px-1.5 py-0.5 rounded-md text-xs',
                  statusFilter === filter.value
                    ? 'bg-white/20'
                    : 'bg-muted-foreground/10'
                )}>
                  {filter.count}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Jobs Grid */}
      <AnimatePresence mode="wait">
        {filteredJobs.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-12 text-center"
          >
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Briefcase className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Nenhum job encontrado</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Crie seu primeiro job de cópia para começar'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <motion.button
                  onClick={() => navigate('/copy')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4" />
                  <span>Criar Novo Job</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`grid-${statusFilter}-${searchQuery}`} // Force remount when filter changes
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {filteredJobs.map((job) => (
              <motion.div
                key={job.id}
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                layout
              >
                <JobCard
                  job={job}
                  onStop={onStop}
                  onPause={onPause}
                  onResume={onResume}
                  onClick={onJobClick}
                  isStoppingJob={isStoppingJob}
                  isPausingJob={isPausingJob}
                  isResumingJob={isResumingJob}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
