import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { twoFactorStepSchema, type TwoFactorStepFormData } from '../schemas/auth.schema';
import { cn } from '@/lib/cn';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

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
    <div className="space-y-8">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-6 ring-4 ring-primary/5"
        >
          <Lock className="h-10 w-10 text-primary" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">Verificação em Duas Etapas</h2>
        <p className="text-muted-foreground">
          Sua conta está protegida com 2FA. <br />
          Por favor, insira sua senha do Telegram
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Password Input */}
        <div className="group">
          <label htmlFor="password" className="block text-sm font-medium mb-2 text-muted-foreground group-focus-within:text-primary transition-colors">
            Senha 2FA
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-focus-within:bg-primary/10 transition-colors">
              <KeyRound className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua senha"
              className={cn(
                "w-full pl-12 pr-12 py-3 bg-background/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20",
                "transition-all duration-200 placeholder:text-muted-foreground/50",
                errors.password ? 'border-destructive/50 focus:border-destructive' : 'border-input focus:border-primary'
              )}
              disabled={isLoading}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="mt-1.5 text-sm text-destructive flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-destructive" />
              {errors.password.message}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              Senha configurada no app do Telegram
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl"
          >
            <p className="text-sm text-destructive font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              {error}
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "w-full py-3.5 px-6 rounded-xl font-semibold shadow-lg transition-all duration-300",
              "bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            )}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" className="text-white" />
                <span>Verificando...</span>
              </div>
            ) : (
              'Acessar Conta'
            )}
          </motion.button>

          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-2 disabled:opacity-50 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>
      </form>

      <div className="pt-2 text-center text-sm text-muted-foreground border-t border-border/50">
        <p className="mb-2">Esqueceu sua senha?</p>
        <a
          href="https://telegram.org/faq#login-and-sms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary-hover font-semibold inline-flex items-center gap-1.5 transition-colors group"
        >
          Saiba como recuperar
          <ArrowLeft className="w-3.5 h-3.5 rotate-180 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  );
}
