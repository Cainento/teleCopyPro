
import { useState } from 'react';
import { X, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { userApi } from '@/api/user.api';

interface CardEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    phoneNumber: string;
}

export function CardEmailModal({
    isOpen,
    onClose,
    onSuccess,
    phoneNumber,
}: CardEmailModalProps) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const validateEmail = (email: string) => {
        return /\S+@\S+\.\S+/.test(email);
    };

    const handleSubmit = async () => {
        if (!validateEmail(email)) {
            setError('Por favor, insira um email válido');
            return;
        }

        setIsLoading(true);
        try {
            await userApi.updateProfile(phoneNumber, undefined, email);
            toast.success('Email salvo com sucesso!');
            onSuccess();
        } catch (error) {
            console.error('Error saving email:', error);
            setError('Erro ao salvar email. Tente novamente.');
            toast.error('Erro ao salvar email');
        } finally {
            setIsLoading(false);
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
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                        Precisamos do seu email
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Para processar o pagamento e enviar seu comprovante, precisamos de um email válido.
                    </p>
                </div>

                {/* Email Input */}
                <div className="mb-6">
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                        Seu melhor email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setError('');
                        }}
                        placeholder="exemplo@email.com"
                        className={cn(
                            "w-full px-4 py-3 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
                            error ? "border-destructive" : "border-border"
                        )}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSubmit();
                            }
                        }}
                    />
                    {error && (
                        <p className="mt-2 text-sm text-destructive">{error}</p>
                    )}
                </div>

                {/* Action Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !email}
                    className={cn(
                        "w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2",
                        email && !isLoading
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        'Continuar para Pagamento'
                    )}
                </button>
            </div>
        </div>
    );
}
