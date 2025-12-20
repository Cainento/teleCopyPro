import { useState, useEffect, useCallback } from 'react';
import { X, Copy, Check, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import {
    createPixOrder,
    getPixOrderStatus,
    isValidCpf,
    cleanCpf,
    type CreatePixOrderRequest,
    type CreatePixOrderResponse,
} from '@/api/pagbank.api';

interface PixQrCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPaymentSuccess: () => void;
    plan: 'premium' | 'enterprise';
    billingCycle: 'monthly' | 'annual';
    planName: string;
    formattedPrice: string;
}

type ModalStep = 'cpf' | 'qrcode' | 'success' | 'error' | 'expired';

export function PixQrCodeModal({
    isOpen,
    onClose,
    onPaymentSuccess,
    plan,
    billingCycle,
    planName,
    formattedPrice,
}: PixQrCodeModalProps) {
    const [step, setStep] = useState<ModalStep>('cpf');
    const [cpf, setCpf] = useState('');
    const [cpfError, setCpfError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [orderData, setOrderData] = useState<CreatePixOrderResponse | null>(null);
    const [copied, setCopied] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setStep('cpf');
            setCpf('');
            setCpfError('');
            setOrderData(null);
            setCopied(false);
        }
    }, [isOpen]);

    // Format CPF as user types (XXX.XXX.XXX-XX)
    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);

        // Format as XXX.XXX.XXX-XX
        if (value.length > 9) {
            value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
        } else if (value.length > 6) {
            value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
        } else if (value.length > 3) {
            value = `${value.slice(0, 3)}.${value.slice(3)}`;
        }

        setCpf(value);
        setCpfError('');
    };

    // Create PIX order
    const handleCreateOrder = async () => {
        const cleanedCpf = cleanCpf(cpf);

        if (!isValidCpf(cpf)) {
            setCpfError('CPF deve conter 11 dígitos');
            return;
        }

        setIsLoading(true);
        try {
            const request: CreatePixOrderRequest = {
                plan,
                billing_cycle: billingCycle,
                customer_tax_id: cleanedCpf,
            };

            const response = await createPixOrder(request);
            setOrderData(response);
            setStep('qrcode');
            toast.success('QR Code gerado com sucesso!');
        } catch (error: unknown) {
            console.error('Error creating PIX order:', error);
            const errorMessage = (error as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail
                || (error as { message?: string })?.message
                || 'Erro ao gerar QR Code';
            toast.error(errorMessage);
            setCpfError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Copy PIX code to clipboard
    const handleCopyCode = async () => {
        if (!orderData?.qr_code_text) return;

        try {
            await navigator.clipboard.writeText(orderData.qr_code_text);
            setCopied(true);
            toast.success('Código PIX copiado!');
            setTimeout(() => setCopied(false), 3000);
        } catch {
            toast.error('Erro ao copiar código');
        }
    };

    // Poll for payment status
    const checkPaymentStatus = useCallback(async () => {
        if (!orderData?.order_id || step !== 'qrcode') return;

        try {
            const status = await getPixOrderStatus(orderData.order_id);

            if (status.status === 'paid') {
                setStep('success');
                toast.success('Pagamento confirmado!');
                setTimeout(() => {
                    onPaymentSuccess();
                }, 2000);
            } else if (status.status === 'expired') {
                setStep('expired');
            } else if (status.status === 'cancelled') {
                setStep('error');
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
        }
    }, [orderData?.order_id, step, onPaymentSuccess]);

    // Start polling when QR code is displayed
    useEffect(() => {
        if (step !== 'qrcode' || !orderData) return;

        const interval = setInterval(() => {
            checkPaymentStatus();
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [step, orderData, checkPaymentStatus]);

    // Calculate time remaining
    useEffect(() => {
        if (!orderData?.expiration_date || step !== 'qrcode') return;

        const updateTimeRemaining = () => {
            const now = new Date();
            const expiration = new Date(orderData.expiration_date);
            const diff = expiration.getTime() - now.getTime();

            if (diff <= 0) {
                setStep('expired');
                setTimeRemaining('Expirado');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining(
                hours > 0
                    ? `${hours}h ${minutes}m ${seconds}s`
                    : `${minutes}m ${seconds}s`
            );
        };

        updateTimeRemaining();
        const interval = setInterval(updateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [orderData?.expiration_date, step]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={step === 'success' ? undefined : onClose}
            />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
                {/* Close button */}
                {step !== 'success' && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                {/* Step: CPF Input */}
                {step === 'cpf' && (
                    <>
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-semibold text-foreground mb-2">
                                Pagamento via PIX
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {planName} • {formattedPrice}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label htmlFor="cpf" className="block text-sm font-medium text-foreground mb-2">
                                CPF do pagador
                            </label>
                            <input
                                id="cpf"
                                type="text"
                                value={cpf}
                                onChange={handleCpfChange}
                                placeholder="000.000.000-00"
                                className={cn(
                                    "w-full px-4 py-3 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
                                    cpfError ? "border-destructive" : "border-border"
                                )}
                                maxLength={14}
                            />
                            {cpfError && (
                                <p className="mt-2 text-sm text-destructive">{cpfError}</p>
                            )}
                        </div>

                        <button
                            onClick={handleCreateOrder}
                            disabled={isLoading || cpf.length < 14}
                            className={cn(
                                "w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2",
                                cpf.length >= 14 && !isLoading
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Gerando QR Code...
                                </>
                            ) : (
                                'Gerar QR Code PIX'
                            )}
                        </button>
                    </>
                )}

                {/* Step: QR Code Display */}
                {step === 'qrcode' && orderData && (
                    <>
                        <div className="text-center mb-4">
                            <h2 className="text-xl font-semibold text-foreground mb-2">
                                Pagamento via PIX
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Escaneie o QR code ou use o código Copia e Cola
                            </p>
                        </div>

                        {/* QR Code Image */}
                        <div className="flex justify-center mb-4">
                            <div className="bg-white p-4 rounded-lg">
                                <img
                                    src={orderData.qr_code_url}
                                    alt="QR Code PIX"
                                    className="w-48 h-48"
                                />
                            </div>
                        </div>

                        {/* Amount and Timer */}
                        <div className="text-center mb-4">
                            <p className="text-2xl font-bold text-foreground">
                                {orderData.formatted_amount}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Expira em: <span className="font-medium text-amber-500">{timeRemaining}</span>
                            </p>
                        </div>

                        {/* Copy Code Button */}
                        <button
                            onClick={handleCopyCode}
                            className="w-full py-3 px-4 rounded-lg font-medium border border-primary text-primary hover:bg-primary/10 transition-all duration-200 flex items-center justify-center gap-2 mb-4"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    Código copiado!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-5 h-5" />
                                    Copiar código PIX
                                </>
                            )}
                        </button>

                        {/* Waiting indicator */}
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Aguardando pagamento...</span>
                        </div>
                    </>
                )}

                {/* Step: Success */}
                {step === 'success' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground mb-2">
                            Pagamento confirmado!
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Seu plano foi atualizado com sucesso.
                        </p>
                    </div>
                )}

                {/* Step: Expired */}
                {step === 'expired' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-10 h-10 text-amber-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground mb-2">
                            QR Code expirado
                        </h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            O tempo para pagamento expirou.
                        </p>
                        <button
                            onClick={() => {
                                setStep('cpf');
                                setOrderData(null);
                            }}
                            className="w-full py-3 px-4 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
                        >
                            Gerar novo QR Code
                        </button>
                    </div>
                )}

                {/* Step: Error */}
                {step === 'error' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-10 h-10 text-destructive" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground mb-2">
                            Erro no pagamento
                        </h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Ocorreu um erro ao processar seu pagamento.
                        </p>
                        <button
                            onClick={() => {
                                setStep('cpf');
                                setOrderData(null);
                            }}
                            className="w-full py-3 px-4 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
