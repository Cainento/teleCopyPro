import { motion } from 'framer-motion';
import { User, Phone, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useAccount } from '../hooks/useAccount';
import { PlanCard } from './PlanCard';
import { UsageStats } from './UsageStats';
import { UpgradePlan } from './UpgradePlan';
import { toast } from 'sonner';
import { ROUTES } from '@/lib/constants';
import { telegramApi } from '@/api/telegram.api';
import { cn } from '@/lib/cn';
import { SupportSection } from './SupportSection';
import { SubscriptionManagement } from './SubscriptionManagement';

import { useLocation } from 'react-router-dom';
import { verifySession } from '@/api/stripe.api';
import { useEffect } from 'react';

// ... imports

export function AccountSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, session: sessionData } = useAuthStore();
  const { accountData, limits, usage, isLoading, refetch } = useAccount();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Check for payment success and verify session
  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(location.search);
      const paymentStatus = params.get('payment');
      const sessionId = params.get('session_id');

      if (paymentStatus === 'success' && sessionId) {
        setIsVerifying(true);
        try {
          console.log('Verifying payment session:', sessionId);
          const result = await verifySession(sessionId);

          if (result.verified) {
            toast.success('Pagamento confirmado! Sua assinatura está ativa.');
            // Refetch account data to update UI
            await refetch();
          } else {
            toast.warning('Pagamento não confirmado ainda. Verifique novamente em instantes.');
          }
        } catch (error) {
          console.error('Error verifying payment:', error);
          toast.error('Erro ao verificar pagamento.');
        } finally {
          setIsVerifying(false);
          // Clean URL
          navigate(location.pathname, { replace: true });
        }
      } else if (paymentStatus === 'success' && !sessionId) {
        // Fallback for when session_id is missing (legacy flow)
        toast.info('Pagamento recebido. Atualizando status...');
        setTimeout(() => refetch(), 2000);
        navigate(location.pathname, { replace: true });
      }
    };

    verifyPayment();
  }, [location, navigate, refetch]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
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
      logout();
      navigate(ROUTES.LOGIN);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            Configurações da <span className="text-gradient">Conta</span>
          </h1>
          <p className="text-muted-foreground">
            Gerencie sua conta, plano e estatísticas de uso
          </p>
        </motion.div>

        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground">Carregando dados da conta...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold mb-1">
          Configurações da <span className="text-gradient">Conta</span>
        </h1>
        <p className="text-muted-foreground">
          Gerencie sua conta, plano e estatísticas de uso
        </p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>

            <div>
              <h3 className="text-xl font-bold">
                {accountData.username ? `@${accountData.username}` : 'Usuário do Telegram'}
              </h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{accountData.phoneNumber}</span>
              </div>
            </div>
          </div>

          <motion.button
            onClick={handleLogout}
            disabled={isLoggingOut}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
              'bg-destructive/10 text-destructive hover:bg-destructive/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span>{isLoggingOut ? 'Saindo...' : 'Desconectar'}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <PlanCard
          currentPlan={accountData.plan}
          limits={limits}
          expiryDate={accountData.planExpiry}
        />
      </motion.div>

      {/* Subscription Management */}
      {(accountData.plan === 'PREMIUM' || accountData.plan === 'ENTERPRISE') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <SubscriptionManagement accountData={accountData} />
        </motion.div>
      )}

      {/* Support Section - Only for PREMIUM and ENTERPRISE */}
      {(accountData.plan === 'PREMIUM' || accountData.plan === 'ENTERPRISE') && (
        <SupportSection />
      )}

      {/* Usage Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <UsageStats
          realTimeJobs={usage.realTimeJobs}
          historicalJobs={usage.historicalJobs}
          messagesPerDay={usage.messagesPerDay}
          currentPlan={accountData.plan}
        />
      </motion.div>


      {/* Upgrade Plans - Only show for FREE and PREMIUM users */}
      {accountData.plan !== 'ENTERPRISE' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <UpgradePlan currentPlan={accountData.plan} />
        </motion.div>
      )}
    </div>
  );
}
