import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone, Key, Hash } from 'lucide-react';
import { phoneStepSchema, type PhoneStepFormInput, type PhoneStepFormData } from '../schemas/auth.schema';

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
    // Transform apiId from string to number
    const transformedData: PhoneStepFormData = {
      ...data,
      apiId: Number(data.apiId),
    };
    onSubmit(transformedData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Autenticação Telegram</h2>
        <p className="text-muted-foreground">
          Insira seu número de telefone e credenciais da API do Telegram
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Phone Number */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2">
            Número de Telefone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              {...register('phoneNumber')}
              id="phoneNumber"
              type="tel"
              placeholder="+5511999999999"
              className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.phoneNumber ? 'border-destructive' : 'border-input'
              }`}
              disabled={isLoading}
            />
          </div>
          {errors.phoneNumber && (
            <p className="mt-1 text-sm text-destructive">{errors.phoneNumber.message}</p>
          )}
        </div>

        {/* API ID */}
        <div>
          <label htmlFor="apiId" className="block text-sm font-medium mb-2">
            API ID
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              {...register('apiId', { valueAsNumber: false })}
              id="apiId"
              type="text"
              placeholder="1234567"
              className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.apiId ? 'border-destructive' : 'border-input'
              }`}
              disabled={isLoading}
            />
          </div>
          {errors.apiId && (
            <p className="mt-1 text-sm text-destructive">{errors.apiId.message}</p>
          )}
        </div>

        {/* API Hash */}
        <div>
          <label htmlFor="apiHash" className="block text-sm font-medium mb-2">
            API Hash
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              {...register('apiHash')}
              id="apiHash"
              type="text"
              placeholder="abcdef1234567890abcdef1234567890"
              className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.apiHash ? 'border-destructive' : 'border-input'
              }`}
              disabled={isLoading}
            />
          </div>
          {errors.apiHash && (
            <p className="mt-1 text-sm text-destructive">{errors.apiHash.message}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            <a
              href="https://my.telegram.org/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Como obter suas credenciais da API →
            </a>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? 'Enviando código...' : 'Enviar código de verificação'}
        </button>
      </form>
    </div>
  );
}
