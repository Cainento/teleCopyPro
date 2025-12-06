import { User, Phone, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useSessionStore } from '@/store/session.store';
import { useAccount } from '../hooks/useAccount';
import { PlanCard } from './PlanCard';
import { UsageStats } from './UsageStats';
import { UpgradePlan } from './UpgradePlan';
import { toast } from 'sonner';
import { ROUTES } from '@/lib/constants';
import { telegramApi } from '@/api/telegram.api';

export function AccountSettings() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const sessionData = useSessionStore((state) => state.session);
  const { accountData, limits, usage, isLoading } = useAccount();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Call backend to disconnect Telegram session and delete session file
      await telegramApi.logout({
        api_id: sessionData?.apiId,
        api_hash: sessionData?.apiHash,
      });

      toast.success('Você foi desconectado');
      logout();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Erro ao desconectar. Fazendo logout local...');
      // Even if backend logout fails, clear local session
      logout();
      navigate(ROUTES.LOGIN);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">Configurações da Conta</h2>
          <p className="text-muted-foreground">
            Gerencie sua conta, plano e visualize estatísticas de uso
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando dados da conta...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Configurações da Conta</h2>
        <p className="text-muted-foreground">
          Gerencie sua conta, plano e visualize estatísticas de uso
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {accountData.username || 'Usuário do Telegram'}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{accountData.phoneNumber}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
          </button>
        </div>
      </div>

      {/* Plan Card */}
      <PlanCard
        currentPlan={accountData.plan}
        limits={limits}
        expiryDate={accountData.planExpiry}
      />

      {/* Usage Stats */}
      <UsageStats
        realTimeJobs={usage.realTimeJobs}
        historicalJobs={usage.historicalJobs}
        messagesPerDay={usage.messagesPerDay}
        currentPlan={accountData.plan}
      />

      {/* Upgrade Plans - Only show for FREE and PREMIUM users */}
      {accountData.plan !== 'ENTERPRISE' && <UpgradePlan currentPlan={accountData.plan} />}
    </div>
  );
}
