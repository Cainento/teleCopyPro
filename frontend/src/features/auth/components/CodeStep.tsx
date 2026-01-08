import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { codeStepSchema, type CodeStepFormData } from '../schemas/auth.schema';
import { cn } from '@/lib/cn';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

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
    <div className="space-y-8">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-6 ring-4 ring-primary/5"
        >
          <ShieldCheck className="h-10 w-10 text-primary" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">Código de Verificação</h2>
        <p className="text-muted-foreground">
          Enviamos um código de 5 dígitos para <br />
          <span className="font-semibold text-foreground bg-muted/50 px-2 py-0.5 rounded-md mt-1 inline-block">
            {phoneNumber}
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Code Input */}
        <div>
          <label htmlFor="code" className="sr-only">
            Código de Verificação
          </label>
          <input
            {...register('code')}
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            placeholder="• • • • •"
            className={cn(
              "w-full text-center text-4xl tracking-[0.5em] py-4 bg-background/50 border rounded-2xl",
              "focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-300",
              "font-mono placeholder:text-muted-foreground/20 placeholder:tracking-[0.5em]",
              errors.code ? 'border-destructive/50 focus:border-destructive' : 'border-input focus:border-primary'
            )}
            disabled={isLoading}
            autoFocus
          />
          {errors.code ? (
            <p className="mt-2 text-sm text-destructive text-center flex items-center justify-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-destructive" />
              {errors.code.message}
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" />
              Verifique seu app do Telegram
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-center"
          >
            <p className="text-sm text-destructive font-medium">
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
              'Verificar Código'
            )}
          </motion.button>

          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-2 disabled:opacity-50 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar e corrigir número
          </button>
        </div>
      </form>

      <div className="pt-2 text-center text-sm text-muted-foreground border-t border-border/50">
        <p className="mb-2">Não recebeu o código?</p>
        <button
          type="button"
          onClick={onBack}
          className="text-primary hover:text-primary-hover font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
