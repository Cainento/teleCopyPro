import { Clock, Zap, Lock } from 'lucide-react';
import { cn } from '@/lib/cn';

interface CopyModeSelectorProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  canUseRealTime: boolean;
  canUseHistorical?: boolean;
}

export function CopyModeSelector({
  value,
  onChange,
  disabled,
  canUseRealTime,
  canUseHistorical = true,
}: CopyModeSelectorProps) {
  const modes = [
    {
      id: 'historical',
      value: false,
      icon: Clock,
      title: 'Cópia Histórica',
      description: 'Copia todas as mensagens existentes do canal',
      features: [
        'Copia mensagens passadas',
        'Executa em segundo plano',
        'Pode levar tempo dependendo do volume',
      ],
      blocked: !canUseHistorical,
    },
    {
      id: 'realtime',
      value: true,
      icon: Zap,
      title: 'Cópia em Tempo Real',
      description: 'Copia novas mensagens conforme chegam',
      features: [
        'Copia apenas mensagens novas',
        'Atualização instantânea',
        'Fica ativo até ser parado',
      ],
      blocked: !canUseRealTime,
    },
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium mb-3">Modo de Cópia</label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = value === mode.value;
          const isDisabled = disabled || mode.blocked;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => !isDisabled && onChange(mode.value)}
              disabled={isDisabled}
              className={cn(
                'relative p-4 border-2 rounded-lg text-left transition-all',
                'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
                isDisabled && 'opacity-50 cursor-not-allowed hover:border-border'
              )}
            >
              {/* Blocked Badge */}
              {mode.blocked && (
                <div className="absolute top-2 right-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-destructive/10 border border-destructive rounded-full text-xs font-medium text-destructive">
                    <Lock className="h-3 w-3" />
                    <span>Bloqueado</span>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{mode.title}</h4>
                  <p className="text-sm text-muted-foreground">{mode.description}</p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-1.5 text-sm">
                {mode.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
