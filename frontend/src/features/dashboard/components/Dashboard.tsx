import { motion } from 'framer-motion';
import { useDashboard } from '../hooks/useDashboard';
import { SessionStatus } from './SessionStatus';
import { QuickStats } from './QuickStats';
import { RecentJobs } from './RecentJobs';
import { AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/auth.store';

// Get greeting based on time
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function Dashboard() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const {
    sessionStatus,
    isLoadingStatus,
    statusError,
    stats,
    recentJobs,
    isLoading,
  } = useDashboard();

  // Error state
  if (statusError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center py-16"
      >
        <div className="text-center max-w-md bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-xl font-bold mb-2">Erro ao carregar dashboard</h3>
          <p className="text-muted-foreground mb-6">
            Não foi possível carregar as informações. Tente recarregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Recarregar Página
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            {getGreeting()}, <span className="text-gradient">{session?.username || 'Usuário'}</span>! 👋
          </h1>
          <p className="text-muted-foreground">
            Aqui está o resumo das suas atividades e jobs
          </p>
        </div>

        <motion.button
          onClick={() => navigate(ROUTES.COPY)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn btn-primary shadow-glow group w-full md:w-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Nova Cópia</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </motion.div>

      {/* Stats Grid */}
      <QuickStats stats={stats} isLoading={isLoading} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session Status - Takes 1 column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <SessionStatus status={sessionStatus} isLoading={isLoadingStatus} />
        </motion.div>

        {/* Recent Jobs - Takes 2 columns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <RecentJobs jobs={recentJobs} isLoading={isLoading} />
        </motion.div>
      </div>
    </div>
  );
}
