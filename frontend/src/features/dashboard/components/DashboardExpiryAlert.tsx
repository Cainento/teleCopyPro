import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount } from '@/features/account/hooks/useAccount';
import { redirectToCheckout } from '@/api/stripe.api';
import { PLANS } from '@/features/account/components/UpgradePlan';
import { PaymentMethodModal } from '@/features/account/components/PaymentMethodModal';
import { PixQrCodeModal } from '@/features/account/components/PixQrCodeModal';
import { CardEmailModal } from '@/features/account/components/CardEmailModal';

export function DashboardExpiryAlert() {
    const navigate = useNavigate();
    const { accountData, isLoading } = useAccount();
    const [isOpen, setIsOpen] = useState(false);

    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
    const [showPixModal, setShowPixModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !accountData.planExpiry) return;

        // Check if expiring in less than 7 days
        const expiry = new Date(accountData.planExpiry);
        const now = new Date();
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Only show for Pix users (no stripe sub id) and if expiring soon
        const isStripe = !!accountData.stripeSubscriptionId;
        const isPremium = accountData.plan === 'PREMIUM' || accountData.plan === 'ENTERPRISE';

        if (isPremium && !isStripe && diffDays <= 7 && diffDays >= 0) {
            // Check if we already dismissed it this session? 
            // For now, let's just show it.
            const hasSeen = sessionStorage.getItem('seenExpiryPopup');
            if (!hasSeen) {
                setIsOpen(true);
                sessionStorage.setItem('seenExpiryPopup', 'true');
            }
        }
    }, [accountData, isLoading]);

    if (!isOpen) {
        // If the main alert is closed, we still might be in payment flow.
        // We render modals IF they are open, even if the alert is closed.
        if (!showPaymentMethodModal && !showPixModal && !showEmailModal) return null;
    }

    const currentPlanOption = PLANS.find(p => p.id === accountData.plan);
    const isAnnual = false; // Default to monthly renewal

    const handleRenew = () => {
        setIsOpen(false); // Close the alert popup
        setShowPaymentMethodModal(true);
    };

    const handleSelectPix = () => {
        setShowPaymentMethodModal(false);
        setShowPixModal(true);
    };

    const handleSelectCard = async () => {
        setShowPaymentMethodModal(false);

        if (!currentPlanOption) return;

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
            toast.error('Price ID não configurado');
            return;
        }

        setLoadingPlanId(currentPlanOption.id);

        try {
            await redirectToCheckout(priceId);
        } catch (error) {
            toast.error('Erro ao processar pagamento');
            setLoadingPlanId(null);
        }
    };

    const handleEmailSuccess = async () => {
        setShowEmailModal(false);
        await proceedToCheckout();
    };

    const handlePixPaymentSuccess = () => {
        setShowPixModal(false);
        toast.success('Renovação confirmada!');
        setTimeout(() => window.location.reload(), 1500);
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

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pointer-events-none"
                    >
                        <div className="bg-background border border-border shadow-2xl rounded-xl p-4 w-full max-w-md pointer-events-auto flex items-start gap-4 ring-1 ring-primary/20">
                            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                <AlertTriangle className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-start justify-between">
                                    <h3 className="font-semibold text-lg">Sua assinatura expira em breve!</h3>
                                    <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 mb-3">
                                    Renove agora para evitar a interrupção dos seus jobs em tempo real.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleRenew}
                                        disabled={!!loadingPlanId}
                                        className="btn btn-primary btn-sm flex-1 flex items-center justify-center gap-2"
                                    >
                                        {loadingPlanId === currentPlanOption?.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                        Renovar Agora
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            navigate('/account');
                                        }}
                                        className="btn btn-outline btn-sm"
                                    >
                                        Gerenciar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Payment Modals */}
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
        </>
    );
}
