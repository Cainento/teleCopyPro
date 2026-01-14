import { Crown, Check, Zap, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { redirectToCheckout, STRIPE_PRICE_IDS } from '@/api/stripe.api';
import { PaymentMethodModal } from './PaymentMethodModal';
import { PixQrCodeModal } from './PixQrCodeModal';
import { CardEmailModal } from './CardEmailModal';
import { useAccount, type Plan } from '../hooks/useAccount';

interface UpgradePlanProps {
    currentPlan: Plan;
    className?: string;
    onPlanUpdated?: () => void;
}

export interface PlanOption {
    id: Plan;
    name: string;
    monthlyPrice: string;
    annualPrice: string;
    monthlyPriceCents: number;
    annualPriceCents: number;
    annualSavings: string;
    description: string;
    popular: boolean;
    stripePriceIdMonthly?: string;
    stripePriceIdAnnual?: string;
    features: Array<{ text: string; included: boolean }>;
}

export const PLANS: PlanOption[] = [
    {
        id: 'FREE' as Plan,
        name: 'Gratuito',
        monthlyPrice: 'R$ 0',
        annualPrice: 'R$ 0',
        monthlyPriceCents: 0,
        annualPriceCents: 0,
        annualSavings: '',
        description: 'Perfeito para começar',
        popular: false,
        features: [
            { text: 'Até 3 jobs históricos', included: true },
            { text: '1.000 mensagens por dia', included: true },
            { text: 'Suporte a mídia', included: true },
            { text: 'Jobs em tempo real', included: false },
            { text: 'Suporte prioritário', included: false },
        ],
    },
    {
        id: 'PREMIUM' as Plan,
        name: 'Premium',
        monthlyPrice: 'R$ 59,90',
        annualPrice: 'R$ 599,00',
        monthlyPriceCents: 5990,
        annualPriceCents: 59900,
        annualSavings: 'Economize ~17%',
        description: 'Para usuários ativos',
        popular: true,
        stripePriceIdMonthly: STRIPE_PRICE_IDS.PREMIUM_MONTHLY,
        stripePriceIdAnnual: STRIPE_PRICE_IDS.PREMIUM_ANNUAL,
        features: [
            { text: 'Até 20 jobs históricos', included: true },
            { text: '10.000 mensagens por dia', included: true },
            { text: 'Suporte a mídia', included: true },
            { text: 'Até 5 jobs em tempo real', included: true },
            { text: 'Suporte prioritário', included: true },
        ],
    },
    {
        id: 'ENTERPRISE' as Plan,
        name: 'Enterprise',
        monthlyPrice: 'R$ 99,90',
        annualPrice: 'R$ 999,00',
        monthlyPriceCents: 9990,
        annualPriceCents: 99900,
        annualSavings: 'Economize ~17%',
        description: 'Uso ilimitado',
        popular: false,
        stripePriceIdMonthly: STRIPE_PRICE_IDS.ENTERPRISE_MONTHLY,
        stripePriceIdAnnual: STRIPE_PRICE_IDS.ENTERPRISE_ANNUAL,
        features: [
            { text: 'Jobs históricos ilimitados', included: true },
            { text: 'Mensagens ilimitadas', included: true },
            { text: 'Suporte a mídia', included: true },
            { text: 'Jobs em tempo real ilimitados', included: true },
            { text: 'Suporte prioritário', included: true },
        ],
    },
];

export function UpgradePlan({ currentPlan, className, onPlanUpdated }: UpgradePlanProps) {
    const [isAnnual, setIsAnnual] = useState(false);
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

    // Payment modal state
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
    const [showPixModal, setShowPixModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);

    const { accountData } = useAccount();

    const handleUpgrade = async (plan: PlanOption) => {
        console.log('[UpgradePlan] handleUpgrade called with plan:', plan.id);

        if (plan.id === 'FREE' || !plan.stripePriceIdMonthly) {
            console.log('[UpgradePlan] Skipping - FREE plan or no price ID');
            return;
        }

        // Store selected plan and show payment method modal
        setSelectedPlan(plan);
        setShowPaymentMethodModal(true);
    };

    const handleSelectPix = () => {
        setShowPaymentMethodModal(false);
        setShowPixModal(true);
    };

    const handleSelectCard = async () => {
        setShowPaymentMethodModal(false);

        if (!selectedPlan) return;

        // Check if user has email
        if (!accountData?.email) {
            console.log('[UpgradePlan] User needs to provide email');
            setShowEmailModal(true);
            return;
        }

        await proceedToCheckout();
    };

    const proceedToCheckout = async () => {
        if (!selectedPlan) return;

        const priceId = isAnnual ? selectedPlan.stripePriceIdAnnual : selectedPlan.stripePriceIdMonthly;
        console.log('[UpgradePlan] Selected price ID:', priceId, 'isAnnual:', isAnnual);

        if (!priceId) {
            console.error('[UpgradePlan] No price ID configured');
            toast.error('Price ID não configurado para este plano');
            return;
        }

        setLoadingPlanId(selectedPlan.id);
        console.log('[UpgradePlan] Calling redirectToCheckout');

        try {
            await redirectToCheckout(priceId);
        } catch (error) {
            console.error('[UpgradePlan] Erro ao redirecionar para checkout:', error);
            toast.error('Erro ao processar pagamento. Tente novamente.');
            setLoadingPlanId(null);
        }
    };

    const handleEmailSuccess = async () => {
        setShowEmailModal(false);
        // Force a page reload/data refresh to update context? 
        // Actually we can just proceed, userApi updated the backend.
        // However, useAccount might still have old data until refetch.
        // proceedToCheckout doesn't rely on accountData, it just redirects.
        // So we can just proceed.
        await proceedToCheckout();
    };

    const handlePixPaymentSuccess = () => {
        setShowPixModal(false);
        setSelectedPlan(null);
        toast.success('Pagamento confirmado! Seu plano foi atualizado.');
        // Trigger refresh of account data
        if (onPlanUpdated) {
            onPlanUpdated();
        }
        // Reload page to reflect new plan
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    const handleCloseModals = () => {
        setShowPaymentMethodModal(false);
        setShowPixModal(false);
        setShowEmailModal(false);
        setSelectedPlan(null);
    };

    // Get formatted price for selected plan
    const getSelectedPlanPrice = () => {
        if (!selectedPlan) return '';
        return isAnnual ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;
    };

    // Get plan display name
    const getSelectedPlanName = () => {
        if (!selectedPlan) return '';
        const cycle = isAnnual ? 'Anual' : 'Mensal';
        return `${selectedPlan.name} ${cycle}`;
    };

    return (
        <>
            <div className={cn('space-y-6', className)}>
                {/* Header */}
                <div className="text-center space-y-4">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Escolha o Plano Ideal</h3>
                        <p className="text-muted-foreground">
                            Atualize seu plano e desbloqueie recursos adicionais
                        </p>
                    </div>

                    {/* Billing Period Toggle */}
                    <div className="inline-flex items-center gap-3 p-1 bg-muted rounded-lg">
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={cn(
                                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                                !isAnnual ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            Mensal
                        </button>
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={cn(
                                'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                                isAnnual ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            Anual
                            <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                                Economize 17%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PLANS.map((plan) => {
                        const isCurrent = plan.id === currentPlan;
                        const isUpgrade = PLANS.findIndex((p) => p.id === currentPlan) < PLANS.findIndex((p) => p.id === plan.id);

                        return (
                            <div
                                key={plan.id}
                                className={cn(
                                    'relative bg-card border-2 rounded-lg p-6 transition-all',
                                    plan.popular && 'border-primary shadow-lg scale-105',
                                    !plan.popular && 'border-border',
                                    isCurrent && 'ring-2 ring-success ring-offset-2'
                                )}
                            >
                                {/* Popular Badge - Only show if not current plan */}
                                {plan.popular && !isCurrent && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <div className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                                            <Zap className="h-3 w-3" />
                                            <span>Mais Popular</span>
                                        </div>
                                    </div>
                                )}

                                {/* Current Plan Badge - Takes priority over popular badge */}
                                {isCurrent && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <div className="flex items-center gap-1 px-3 py-1 bg-success text-success-foreground rounded-full text-xs font-medium">
                                            <Check className="h-3 w-3" />
                                            <span>Plano Atual</span>
                                        </div>
                                    </div>
                                )}

                                {/* Plan Header */}
                                <div className="text-center mb-6">
                                    {plan.id !== 'FREE' && (
                                        <Crown className={cn('h-8 w-8 mx-auto mb-3', plan.popular ? 'text-primary' : 'text-warning')} />
                                    )}
                                    <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                                    <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-3xl font-bold">
                                            {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {isAnnual ? '/ano' : '/mês'}
                                        </span>
                                    </div>
                                    {isAnnual && plan.annualSavings && (
                                        <p className="text-xs text-success mt-1">{plan.annualSavings}</p>
                                    )}
                                </div>

                                {/* Features */}
                                <ul className="space-y-3 mb-6">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            {feature.included ? (
                                                <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <div className="h-5 w-5 border-2 border-muted rounded flex-shrink-0 mt-0.5" />
                                            )}
                                            <span className={cn('text-sm', !feature.included && 'text-muted-foreground')}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <button
                                    onClick={() => handleUpgrade(plan)}
                                    disabled={isCurrent || !isUpgrade || loadingPlanId !== null}
                                    className={cn(
                                        'w-full py-3 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2',
                                        isCurrent && 'bg-success/10 text-success cursor-default',
                                        !isCurrent &&
                                        isUpgrade &&
                                        plan.popular &&
                                        'bg-primary text-primary-foreground hover:bg-primary/90',
                                        !isCurrent &&
                                        isUpgrade &&
                                        !plan.popular &&
                                        'bg-muted text-foreground hover:bg-muted/80',
                                        !isUpgrade && 'bg-muted/50 text-muted-foreground cursor-not-allowed',
                                        loadingPlanId === plan.id && 'opacity-70 cursor-wait'
                                    )}
                                >
                                    {loadingPlanId === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {isCurrent ? 'Plano Atual' : isUpgrade ? 'Fazer Upgrade' : 'Plano Inferior'}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Info Box */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <span className="text-primary">ℹ️</span>
                        Informações Importantes
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>Aceitamos PIX (pagamento instantâneo) e Cartão de Crédito</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>Todos os planos incluem suporte a cópia de mídia (fotos, vídeos, documentos)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>Você pode fazer upgrade a qualquer momento sem perder seus dados</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>Jobs em tempo real permanecem ativos até serem manualmente parados</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Payment Method Selection Modal */}
            <PaymentMethodModal
                isOpen={showPaymentMethodModal}
                onClose={handleCloseModals}
                onSelectPix={handleSelectPix}
                onSelectCard={handleSelectCard}
                planName={getSelectedPlanName()}
                formattedPrice={getSelectedPlanPrice()}
            />

            {/* PIX QR Code Modal */}
            {selectedPlan && (
                <PixQrCodeModal
                    isOpen={showPixModal}
                    onClose={handleCloseModals}
                    onPaymentSuccess={handlePixPaymentSuccess}
                    plan={selectedPlan.id.toLowerCase() as 'premium' | 'enterprise'}
                    billingCycle={isAnnual ? 'annual' : 'monthly'}
                    planName={getSelectedPlanName()}
                    formattedPrice={getSelectedPlanPrice()}
                />
            )}

            {/* Email Collection Modal */}
            <CardEmailModal
                isOpen={showEmailModal}
                onClose={handleCloseModals}
                onSuccess={handleEmailSuccess}
                phoneNumber={accountData?.phoneNumber || ''}
            />
        </>
    );
}
