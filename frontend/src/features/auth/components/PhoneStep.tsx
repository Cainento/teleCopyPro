import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone, Key, Hash, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { phoneStepSchema, type PhoneStepFormInput, type PhoneStepFormData } from '../schemas/auth.schema';
import { cn } from '@/lib/cn';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface PhoneStepProps {
  onSubmit: (data: PhoneStepFormData) => void;
  isLoading: boolean;
  error?: string;
}

export function PhoneStep({ onSubmit, isLoading, error }: PhoneStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneStepFormInput>({
    resolver: zodResolver(phoneStepSchema),
    mode: 'onBlur',
  });

  const handleFormSubmit = (data: PhoneStepFormInput) => {
    const transformedData: PhoneStepFormData = {
      ...data,
      apiId: Number(data.apiId),
    };
    onSubmit(transformedData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent inline-block">
          Autenticação Telegram
        </h2>
        <p className="text-muted-foreground">
          Insira seu número de telefone e credenciais
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* Phone Number */}
        <div className="group">
          <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2 text-muted-foreground group-focus-within:text-primary transition-colors">
            Número de Telefone
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-focus-within:bg-primary/10 transition-colors">
              <Phone className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              {...register('phoneNumber')}
              id="phoneNumber"
              type="tel"
              placeholder="+5511999999999"
              className={cn(
                "w-full pl-12 pr-4 py-3 bg-background/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20",
                "transition-all duration-200 placeholder:text-muted-foreground/50",
                errors.phoneNumber ? 'border-destructive/50 focus:border-destructive' : 'border-input focus:border-primary'
              )}
              disabled={isLoading}
            />
          </div>
          {errors.phoneNumber && (
            <p className="mt-1.5 text-sm text-destructive flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-destructive" />
              {errors.phoneNumber.message}
            </p>
          )}
        </div>

        {/* API ID */}
        <div className="group">
          <label htmlFor="apiId" className="block text-sm font-medium mb-2 text-muted-foreground group-focus-within:text-primary transition-colors">
            API ID
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-focus-within:bg-primary/10 transition-colors">
              <Key className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              {...register('apiId', { valueAsNumber: false })}
              id="apiId"
              type="text"
              placeholder="1234567"
              className={cn(
                "w-full pl-12 pr-4 py-3 bg-background/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20",
                "transition-all duration-200 placeholder:text-muted-foreground/50",
                errors.apiId ? 'border-destructive/50 focus:border-destructive' : 'border-input focus:border-primary'
              )}
              disabled={isLoading}
            />
          </div>
          {errors.apiId && (
            <p className="mt-1.5 text-sm text-destructive flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-destructive" />
              {errors.apiId.message}
            </p>
          )}
        </div>

        {/* API Hash */}
        <div className="group">
          <label htmlFor="apiHash" className="block text-sm font-medium mb-2 text-muted-foreground group-focus-within:text-primary transition-colors">
            API Hash
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-focus-within:bg-primary/10 transition-colors">
              <Hash className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              {...register('apiHash')}
              id="apiHash"
              type="text"
              placeholder="abcdef1234567890..."
              className={cn(
                "w-full pl-12 pr-4 py-3 bg-background/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20",
                "transition-all duration-200 placeholder:text-muted-foreground/50",
                errors.apiHash ? 'border-destructive/50 focus:border-destructive' : 'border-input focus:border-primary'
              )}
              disabled={isLoading}
            />
          </div>
          {errors.apiHash && (
            <p className="mt-1.5 text-sm text-destructive flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-destructive" />
              {errors.apiHash.message}
            </p>
          )}

          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            <a
              href="https://my.telegram.org/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover hover:underline transition-colors"
            >
              Obter credenciais da API
            </a>
          </div>
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

        {/* Submit Button */}
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
              <span>Enviando código...</span>
            </div>
          ) : (
            'Enviar código de verificação'
          )}
        </motion.button>
      </form>
    </div>
  );
}
