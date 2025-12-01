import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { codeStepSchema, type CodeStepFormData } from '../schemas/auth.schema';

interface CodeStepProps {
  onSubmit: (data: CodeStepFormData) => void;
  onBack: () => void;
  phoneNumber: string;
  isLoading: boolean;
  error?: string;
}

export function CodeStep({ onSubmit, onBack, phoneNumber, isLoading, error }: CodeStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CodeStepFormData>({
    resolver: zodResolver(codeStepSchema),
    mode: 'onBlur',
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Código de Verificação</h2>
        <p className="text-muted-foreground">
          Enviamos um código de 5 dígitos para <br />
          <span className="font-medium text-foreground">{phoneNumber}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Code Input */}
        <div>
          <label htmlFor="code" className="block text-sm font-medium mb-2">
            Código de Verificação
          </label>
          <input
            {...register('code')}
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            placeholder="12345"
            className={`w-full text-center text-2xl tracking-widest py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.code ? 'border-destructive' : 'border-input'
            }`}
            disabled={isLoading}
            autoFocus
          />
          {errors.code && (
            <p className="mt-1 text-sm text-destructive">{errors.code.message}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Verifique o aplicativo do Telegram no seu celular
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Verificando...' : 'Verificar código'}
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-2 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        <p>Não recebeu o código?</p>
        <button
          type="button"
          onClick={onBack}
          className="text-primary hover:underline font-medium"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
