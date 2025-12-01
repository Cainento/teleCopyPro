import { useState } from 'react';
import { Key, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ActivationKeyProps {
  onActivate: (key: string) => Promise<boolean>;
  isActivating: boolean;
  className?: string;
}

export function ActivationKey({ onActivate, isActivating, className }: ActivationKeyProps) {
  const [activationKey, setActivationKey] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleKeyChange = (value: string) => {
    // Format as TCP-PREMIUM-XXXX-XXXX-XXXX or TCP-ENTERPRISE-XXXX-XXXX-XXXX
    const cleaned = value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    setActivationKey(cleaned.slice(0, 32)); // Max length for TCP-ENTERPRISE-XXXX-XXXX-XXXX

    // Validate format: TCP-PREMIUM-XXXX-XXXX-XXXX or TCP-ENTERPRISE-XXXX-XXXX-XXXX
    const valid = /^TCP-(PREMIUM|ENTERPRISE)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleaned);
    setIsValid(valid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isActivating) return;

    // Send the key as-is (with dashes)
    const success = await onActivate(activationKey);
    if (success) {
      setActivationKey('');
      setIsValid(false);
    }
  };

  return (
    <div className={cn('bg-card border rounded-lg p-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-warning/10 rounded-lg">
          <Key className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Ativar Plano Premium</h3>
          <p className="text-sm text-muted-foreground">
            Insira sua chave de ativação para fazer upgrade
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="activation-key" className="block text-sm font-medium">
            Chave de Ativação
          </label>
          <div className="relative">
            <input
              id="activation-key"
              type="text"
              value={activationKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="TCP-PREMIUM-XXXX-XXXX-XXXX"
              disabled={isActivating}
              className={cn(
                'w-full px-4 py-3 border rounded-md font-mono text-center text-lg tracking-wider',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isValid && 'border-success',
                activationKey && !isValid && 'border-destructive'
              )}
            />
            {isValid && !isActivating && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Check className="h-5 w-5 text-success" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Formato: TCP-PREMIUM-XXXX-XXXX-XXXX ou TCP-ENTERPRISE-XXXX-XXXX-XXXX
          </p>
        </div>

        <button
          type="submit"
          disabled={!isValid || isActivating}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors',
            'bg-warning text-warning-foreground hover:bg-warning/90',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isActivating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Ativando...
            </>
          ) : (
            <>
              <Key className="h-4 w-4" />
              Ativar Plano
            </>
          )}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">Como obter uma chave?</h4>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Compre um plano Premium ou Enterprise</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Receba sua chave de ativação por email</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Insira a chave acima e clique em "Ativar Plano"</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
