import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Play, Lock, Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { copyJobSchema, type CopyJobFormData } from '../schemas/copy.schema';
import { useCopy } from '../hooks/useCopy';
import { CopyModeSelector } from './CopyModeSelector';
import { ChannelInput } from './ChannelInput';
import { CopyOptions } from './CopyOptions';
import { ROUTES } from '@/lib/constants';

export function CopyForm() {
  const { handleSubmit: onSubmit, isLoading, canUseRealTime, canUseHistorical, usageStats } = useCopy();
  const navigate = useNavigate();
  const isFreePlan = usageStats?.plan?.toLowerCase() === 'free';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CopyJobFormData>({
    resolver: zodResolver(copyJobSchema),
    defaultValues: {
      sourceChannel: '',
      targetChannel: '',
      realTime: false,
      copyMedia: true,
    },
    mode: 'onBlur',
  });

  const realTime = watch('realTime');
  const copyMedia = watch('copyMedia');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Criar Nova Cópia</h2>
        <p className="text-muted-foreground">
          Configure os parâmetros para copiar mensagens entre canais do Telegram
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-card border rounded-lg p-6 space-y-6">
        {/* Copy Mode Selection */}
        <CopyModeSelector
          value={realTime}
          onChange={(value) => setValue('realTime', value)}
          disabled={isLoading}
          canUseRealTime={canUseRealTime}
          canUseHistorical={canUseHistorical}
        />

        {/* Limit Alerts */}
        {usageStats && (
          <div className="space-y-3">
            {/* Real-time blocked alert */}
            {!usageStats.can_create_realtime_job && usageStats.realtime_job_blocked_reason && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1 text-destructive">
                      Cópia em Tempo Real Indisponível
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {usageStats.realtime_job_blocked_reason}
                    </p>
                    {isFreePlan && (
                      <button
                        type="button"
                        onClick={() => navigate(`${ROUTES.ACCOUNT}#upgrade`)}
                        className="text-sm text-primary font-medium hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        Faça upgrade <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Historical blocked alert */}
            {!usageStats.can_create_historical_job && usageStats.historical_job_blocked_reason && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1 text-destructive">
                      Limite de Cópias Históricas Atingido
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {usageStats.historical_job_blocked_reason}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`${ROUTES.ACCOUNT}#upgrade`)}
                      className="text-sm text-primary font-medium hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      Faça upgrade <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Message limit alert */}
            {!usageStats.can_create_job && usageStats.message_limit_blocked_reason && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1 text-destructive">
                      Limite de Mensagens Atingido
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {usageStats.message_limit_blocked_reason}
                    </p>
                    {isFreePlan && (
                      <button
                        type="button"
                        onClick={() => navigate(`${ROUTES.ACCOUNT}#upgrade`)}
                        className="text-sm text-primary font-medium hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        Faça upgrade <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upgrade Banner - Only for FREE users */}
        {isFreePlan && (
          <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 p-5">
            {/* Decorative background elements */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-secondary/10 blur-2xl" />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    Desbloqueie todo o potencial
                    <Sparkles className="h-4 w-4 text-primary" />
                  </h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Cópia em tempo real, mais jobs e mensagens — faça upgrade agora!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`${ROUTES.ACCOUNT}#upgrade`)}
                className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
              >
                <Crown className="h-4 w-4" />
                Fazer Upgrade
              </button>
            </div>
          </div>
        )}

        {/* Channel Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Channel */}
          <ChannelInput
            {...register('sourceChannel')}
            id="sourceChannel"
            label="Canal de Origem"
            placeholder="@meu_canal ou -100123456789"
            error={errors.sourceChannel?.message}
            helpText="Canal de onde as mensagens serão copiadas"
            disabled={isLoading}
          />

          {/* Target Channel */}
          <ChannelInput
            {...register('targetChannel')}
            id="targetChannel"
            label="Canal de Destino"
            placeholder="@canal_destino ou -100987654321"
            error={errors.targetChannel?.message}
            helpText="Canal para onde as mensagens serão copiadas"
            disabled={isLoading}
          />
        </div>

        {/* Arrow Indicator (visual) */}
        <div className="flex justify-center lg:hidden">
          <div className="p-2 bg-muted rounded-full">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>
        </div>

        {/* Copy Options */}
        <CopyOptions
          copyMedia={copyMedia}
          onCopyMediaChange={(value) => setValue('copyMedia', value)}
          disabled={isLoading}
        />

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="text-primary">ℹ️</span>
            Informações Importantes
          </h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                Você precisa ser administrador do canal de destino
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                Para canais privados, use o ID numérico (ex: -100123456789)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                Para canais públicos, use o username com @ (ex: @meu_canal)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                Jobs em tempo real ficam ativos até serem manualmente parados
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          disabled={isLoading}
          className="px-6 py-2 border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Play className="h-4 w-4" />
          {isLoading ? 'Criando job...' : 'Iniciar Cópia'}
        </button>
      </div>
    </form>
  );
}
