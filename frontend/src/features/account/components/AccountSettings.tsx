import { User, Phone, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useAccount } from '../hooks/useAccount';
import { PlanCard } from './PlanCard';
import { UsageStats } from './UsageStats';
import { ActivationKey } from './ActivationKey';
import { UpgradePlan } from './UpgradePlan';
import { toast } from 'sonner';
import { ROUTES } from '@/lib/constants';

export function AccountSettings() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const { accountData, limits, usage, activatePlan, isActivating, isLoading } = useAccount();

  const handleLogout = () => {
    toast.success('Você foi desconectado');
    logout();
    navigate(ROUTES.LOGIN);
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
            className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Plan Card */}
        <PlanCard
          currentPlan={accountData.plan}
          limits={limits}
          expiryDate={accountData.planExpiry}
        />

        {/* Right Column - Activation Key */}
        <ActivationKey onActivate={activatePlan} isActivating={isActivating} />
      </div>

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
