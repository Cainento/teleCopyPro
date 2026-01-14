import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, CreditCard, Calendar, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cancelSubscription, redirectToCheckout } from '@/api/stripe.api';
import { type AccountData } from '../hooks/useAccount';
import { PLANS } from './UpgradePlan';
import { PaymentMethodModal } from './PaymentMethodModal';
import { PixQrCodeModal } from './PixQrCodeModal';
import { CardEmailModal } from './CardEmailModal';

interface SubscriptionManagementProps {
    accountData: AccountData;
}

export function SubscriptionManagement({ accountData }: SubscriptionManagementProps) {
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    // Payment modal state
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
    const [showPixModal, setShowPixModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    // Defaulting to monthly for renewal for now as simpler flow
    const isAnnual = false;
    const [, setLoadingPlanId] = useState<string | null>(null);

    // Derive state from account data
    const isStripe = !!accountData.stripeSubscriptionId;
    const isPremiumOrEnterprise = accountData.plan === 'PREMIUM' || accountData.plan === 'ENTERPRISE';

    if (!isPremiumOrEnterprise) {
        return null;
    }

    // Determine current plan option
    const currentPlanOption = PLANS.find(p => p.id === accountData.plan);

    const handleRenew = () => {
        if (!currentPlanOption) return;
        setShowPaymentMethodModal(true);
    };

    const handleSelectPix = () => {
        setShowPaymentMethodModal(false);
        setShowPixModal(true);
    };

    const handleSelectCard = async () => {
        setShowPaymentMethodModal(false);

        if (!currentPlanOption) return;

        // Check if user has email
        if (!accountData?.email) {
            setShowEmailModal(true);
            return;
        }

        await proceedToCheckout();
    };

    const proceedToCheckout = async () => {
        if (!currentPlanOption) return;

        const priceId = isAnnual ? currentPlanOption.stripePriceIdAnnual : currentPlanOption.stripePriceIdMonthly;

        if (!priceId) {
            toast.error('Price ID não configurado para este plano');
            return;
        }

        setLoadingPlanId(currentPlanOption.id);

        try {
            await redirectToCheckout(priceId);
        } catch (error) {
            console.error('Error redirecting to checkout:', error);
            toast.error('Erro ao processar pagamento. Tente novamente.');
            setLoadingPlanId(null);
        }
    };

    const handleEmailSuccess = async () => {
        setShowEmailModal(false);
        await proceedToCheckout();
    };

    const handlePixPaymentSuccess = () => {
        setShowPixModal(false);
        toast.success('Renovação confirmada! Seu plano foi atualizado.');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    const handleCloseModals = () => {
        setShowPaymentMethodModal(false);
        setShowPixModal(false);
        setShowEmailModal(false);
    };

    // Get formatted price
    const getSelectedPlanPrice = () => {
        if (!currentPlanOption) return '';
        return isAnnual ? currentPlanOption.annualPrice : currentPlanOption.monthlyPrice;
    };

    // Get plan display name
    const getSelectedPlanName = () => {
        if (!currentPlanOption) return '';
        const cycle = isAnnual ? 'Anual' : 'Mensal';
        return `${currentPlanOption.name} ${cycle}`;
    };

    const handleCancelSubscription = async () => {
        try {
            setIsCancelling(true);
            await cancelSubscription({ immediately: false }); // Default to cancel at period end
            toast.success('Assinatura cancelada com sucesso. O acesso continua até o fim do período.');
            setShowCancelConfirm(false);
            // Ideally trigger a refresh here, but for now relies on page reload or future refresh
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            toast.error('Erro ao cancelar assinatura. Entre em contato com o suporte.');
        } finally {
            setIsCancelling(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    // Helper to check if expiring soon (e.g. within 5 days)
    const isExpiringSoon = () => {
        if (!accountData.planExpiry) return false;
        const expiry = new Date(accountData.planExpiry);
        const now = new Date();
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7 && diffDays >= 0;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                    <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Gerenciar Assinatura</h3>
                    <p className="text-sm text-muted-foreground">
                        Detalhes do seu plano {accountData.plan.toLowerCase()}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Card */}
                <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Status Atual</span>
                        {accountData.subscriptionStatus === 'active' || !accountData.subscriptionStatus ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                <span className={isCancelling ? "text-muted-foreground" : ""}>Ativo</span>
                            </span>
                        ) : accountData.subscriptionStatus === 'canceling' ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                Cancelamento Pendente
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                {accountData.subscriptionStatus}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="text-lg font-semibold capitalize">
                            {isStripe ? 'Assinatura Recorrente' : 'Plano Pré-pago (Pix)'}
                        </span>
                    </div>
                    {isStripe && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Cobrança automática via cartão
                        </p>
                    )}
                </div>

                {/* Expiry Card */}
                <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Visualizar até</span>
                        {isExpiringSoon() && (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                Expira em breve
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-lg font-semibold">
                            {formatDate(accountData.planExpiry)}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Data de renovação ou expiração
                    </p>
                </div>
            </div>

            {/* Stripe Cancellation Area */}
            {isStripe && accountData.subscriptionStatus !== 'canceled' && accountData.subscriptionStatus !== 'canceling' && (
                <div className="mt-8 pt-6 border-t border-border/50">
                    {!showCancelConfirm ? (
                        <button
                            onClick={() => setShowCancelConfirm(true)}
                            className="text-sm text-destructive hover:underline flex items-center gap-2"
                        >
                            <XCircle className="w-4 h-4" />
                            Cancelar assinatura recorrente
                        </button>
                    ) : (
                        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-destructive mb-2">
                                Tem certeza que deseja cancelar?
                            </h4>
                            <p className="text-xs text-muted-foreground mb-4">
                                Ao cancelar, sua assinatura continuará ativa até {formatDate(accountData.planExpiry)}.
                                Após isso, sua conta será revertida para o plano Gratuito e seus jobs em tempo real serão parados.
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                                >
                                    Manter Assinatura
                                </button>
                                <button
                                    onClick={handleCancelSubscription}
                                    disabled={isCancelling}
                                    className="text-xs font-medium px-3 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-2"
                                >
                                    {isCancelling && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Confirmar Cancelamento
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Cancellation Pending Notice */}
            {isStripe && accountData.subscriptionStatus === 'canceling' && (
                <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-semibold text-amber-500">Cancelamento programado</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                            Sua assinatura será cancelada em {formatDate(accountData.planExpiry)}. Até lá, você mantém acesso total às funcionalidades premium.
                        </p>
                    </div>
                </div>
            )}

            {/* Pix Renewal Hint AND BUTTON */}
            {!isStripe && isExpiringSoon() && (
                <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-primary">Sua assinatura está acabando</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                                Para evitar interrupções nos seus jobs, renove seu plano antes de {formatDate(accountData.planExpiry)}.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleRenew}
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                        Renovar Agora
                    </button>
                </div>
            )}

            {/* Modals for renewal flow */}
            <PaymentMethodModal
                isOpen={showPaymentMethodModal}
                onClose={handleCloseModals}
                onSelectPix={handleSelectPix}
                onSelectCard={handleSelectCard}
                planName={getSelectedPlanName()}
                formattedPrice={getSelectedPlanPrice()}
            />

            {currentPlanOption && (
                <PixQrCodeModal
                    isOpen={showPixModal}
                    onClose={handleCloseModals}
                    onPaymentSuccess={handlePixPaymentSuccess}
                    plan={currentPlanOption.id.toLowerCase() as 'premium' | 'enterprise'}
                    billingCycle={isAnnual ? 'annual' : 'monthly'}
                    planName={getSelectedPlanName()}
                    formattedPrice={getSelectedPlanPrice()}
                />
            )}

            <CardEmailModal
                isOpen={showEmailModal}
                onClose={handleCloseModals}
                onSuccess={handleEmailSuccess}
                phoneNumber={accountData?.phoneNumber || ''}
            />
        </motion.div>
    );
}
