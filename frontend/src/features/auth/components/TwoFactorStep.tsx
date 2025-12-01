import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import { twoFactorStepSchema, type TwoFactorStepFormData } from '../schemas/auth.schema';

interface TwoFactorStepProps {
  onSubmit: (data: TwoFactorStepFormData) => void;
  onBack: () => void;
  isLoading: boolean;
  error?: string;
}

export function TwoFactorStep({ onSubmit, onBack, isLoading, error }: TwoFactorStepProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TwoFactorStepFormData>({
    resolver: zodResolver(twoFactorStepSchema),
    mode: 'onBlur',
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Autenticação de Dois Fatores</h2>
        <p className="text-muted-foreground">
          Sua conta está protegida com 2FA. <br />
          Insira sua senha do Telegram
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Senha 2FA
          </label>
          <div className="relative">
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua senha"
              className={`w-full pr-10 pl-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.password ? 'border-destructive' : 'border-input'
              }`}
              disabled={isLoading}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Esta é a senha que você configurou no aplicativo do Telegram
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
            {isLoading ? 'Verificando...' : 'Continuar'}
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
        <p>Esqueceu sua senha?</p>
        <a
          href="https://telegram.org/faq#login-and-sms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
        >
          Saiba como recuperar →
        </a>
      </div>
    </div>
  );
}
