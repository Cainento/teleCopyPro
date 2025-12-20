import { useState } from 'react';
import { X, CreditCard, QrCode } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPix: () => void;
    onSelectCard: () => void;
    planName: string;
    formattedPrice: string;
}

export function PaymentMethodModal({
    isOpen,
    onClose,
    onSelectPix,
    onSelectCard,
    planName,
    formattedPrice,
}: PaymentMethodModalProps) {
    const [selectedMethod, setSelectedMethod] = useState<'pix' | 'card' | null>(null);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (selectedMethod === 'pix') {
            onSelectPix();
        } else if (selectedMethod === 'card') {
            onSelectCard();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                        Como deseja pagar?
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {planName} • {formattedPrice}
                    </p>
                </div>

                {/* Payment options */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* PIX Option */}
                    <button
                        onClick={() => setSelectedMethod('pix')}
                        className={cn(
                            "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200",
                            selectedMethod === 'pix'
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                    >
                        <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors",
                            selectedMethod === 'pix'
                                ? "bg-primary/20"
                                : "bg-muted"
                        )}>
                            <QrCode className="w-8 h-8" />
                        </div>
                        <span className="font-semibold text-lg">PIX</span>
                        <span className="text-xs text-muted-foreground mt-1">Pagamento instantâneo</span>
                    </button>

                    {/* Card Option */}
                    <button
                        onClick={() => setSelectedMethod('card')}
                        className={cn(
                            "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200",
                            selectedMethod === 'card'
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                    >
                        <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors",
                            selectedMethod === 'card'
                                ? "bg-primary/20"
                                : "bg-muted"
                        )}>
                            <CreditCard className="w-8 h-8" />
                        </div>
                        <span className="font-semibold text-lg">Cartão</span>
                        <span className="text-xs text-muted-foreground mt-1">Crédito ou débito</span>
                    </button>
                </div>

                {/* Confirm button */}
                <button
                    onClick={handleConfirm}
                    disabled={!selectedMethod}
                    className={cn(
                        "w-full py-3 px-4 rounded-lg font-medium transition-all duration-200",
                        selectedMethod
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                >
                    Continuar
                </button>
            </div>
        </div>
    );
}
