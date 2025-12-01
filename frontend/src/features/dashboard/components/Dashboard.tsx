import { useDashboard } from '../hooks/useDashboard';
import { SessionStatus } from './SessionStatus';
import { QuickStats } from './QuickStats';
import { RecentJobs } from './RecentJobs';
import { AlertCircle } from 'lucide-react';

export function Dashboard() {
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar dashboard</h3>
          <p className="text-muted-foreground">
            Não foi possível carregar as informações. Tente recarregar a página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das suas atividades e jobs
        </p>
      </div>

      {/* Stats Grid */}
      <QuickStats stats={stats} isLoading={isLoading} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session Status - Takes 1 column */}
        <div className="lg:col-span-1">
          <SessionStatus status={sessionStatus} isLoading={isLoadingStatus} />
        </div>

        {/* Recent Jobs - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RecentJobs jobs={recentJobs} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
