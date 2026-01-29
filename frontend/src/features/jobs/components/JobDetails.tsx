import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, Zap, Hash, Image, ArrowRight,
  MessageSquare, AlertCircle, CheckCircle, XCircle,
  StopCircle, PauseCircle, Calendar, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JobControls } from './JobControls';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/formatters';
import type { Job } from '@/api/types';

interface JobDetailsProps {
  job: Job;
  onStop?: (jobId: string) => void;
  onPause?: (jobId: string) => void;
  onResume?: (jobId: string) => void;
  onRefresh?: () => void;
  isStoppingJob?: boolean;
  isPausingJob?: boolean;
  isResumingJob?: boolean;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pendente',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    gradient: 'from-slate-500/20 to-gray-500/10',
  },
  running: {
    icon: Zap,
    label: 'Em Execução',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    gradient: 'from-primary/20 to-blue-500/10',
  },
  completed: {
    icon: CheckCircle,
    label: 'Concluído',
    color: 'text-success',
    bgColor: 'bg-success/10',
    gradient: 'from-green-500/20 to-emerald-500/10',
  },
  failed: {
    icon: XCircle,
    label: 'Falhou',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    gradient: 'from-red-500/20 to-rose-500/10',
  },
  stopped: {
    icon: StopCircle,
    label: 'Parado',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    gradient: 'from-amber-500/20 to-yellow-500/10',
  },
  paused: {
    icon: PauseCircle,
    label: 'Pausado',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    gradient: 'from-orange-500/20 to-amber-500/10',
  },
};

export function JobDetails({
  job,
  onStop,
  onPause,
  onResume,
  onRefresh,
  isStoppingJob,
  isPausingJob,
  isResumingJob,
}: JobDetailsProps) {
  const navigate = useNavigate();
  const config = statusConfig[job.status];
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => navigate('/jobs')}
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
            className="p-2.5 bg-muted/50 hover:bg-muted rounded-xl transition-colors"
            title="Voltar para lista"
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Detalhes do <span className="text-gradient">Job</span>
            </h1>
            <p className="text-sm text-muted-foreground font-mono">{job.id}</p>
          </div>
        </div>

        <JobControls
          job={job}
          onStop={onStop}
          onPause={onPause}
          onResume={onResume}
          onRefresh={onRefresh}
          isStoppingJob={isStoppingJob}
          isPausingJob={isPausingJob}
          isResumingJob={isResumingJob}
        />
      </motion.div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 relative overflow-hidden"
      >
        {/* Background gradient */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none',
          config.gradient
        )} />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Status</h3>
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold',
              config.bgColor, config.color
            )}>
              <StatusIcon className={cn('h-4 w-4', job.status === 'running' && 'animate-pulse')} />
              <span>{config.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Messages Copied */}
            <div className="p-4 bg-success/10 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-success" />
                </div>
                <span className="text-sm text-muted-foreground">Mensagens copiadas</span>
              </div>
              <p className="text-3xl font-bold text-success">
                {job.messages_copied.toLocaleString('pt-BR')}
              </p>
            </div>

            {/* Messages Failed */}
            <div className="p-4 bg-destructive/10 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <span className="text-sm text-muted-foreground">Mensagens falhadas</span>
              </div>
              <p className="text-3xl font-bold text-destructive">
                {job.messages_failed.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Status Message (e.g. Wait Time) */}
          {job.status_message && (
            <div className="mt-4 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl flex items-start gap-3">
              <Clock className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-orange-600">Status:</span>
                <span className="text-orange-600 ml-2">{job.status_message}</span>
              </div>
            </div>
          )}

          {job.status === 'failed' && job.error_message && (
            <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-destructive">Erro:</span>
                <span className="text-destructive ml-2">{job.error_message}</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Configuration Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6"
      >
        <h3 className="text-lg font-bold mb-4">Configuração</h3>

        <div className="space-y-4">
          {/* Channels */}
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">
              Canais
            </label>
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Hash className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold truncate">{job.source_channel}</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Hash className="h-4 w-4 text-success" />
                </div>
                <span className="font-semibold truncate">{job.target_channel}</span>
              </div>
            </div>
          </div>

          {/* Mode & Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                Modo
              </label>
              <div className={cn(
                'flex items-center gap-3 p-4 rounded-xl',
                job.real_time ? 'bg-primary/10' : 'bg-muted/30'
              )}>
                {job.real_time ? (
                  <>
                    <Zap className="h-5 w-5 text-primary" />
                    <div>
                      <span className="font-semibold">Tempo Real</span>
                      <p className="text-xs text-muted-foreground">Copia novas mensagens</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <span className="font-semibold">Histórico</span>
                      <p className="text-xs text-muted-foreground">Copia mensagens existentes</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                Mídia
              </label>
              <div className={cn(
                'flex items-center gap-3 p-4 rounded-xl',
                job.copy_media ? 'bg-primary/10' : 'bg-muted/30'
              )}>
                <Image className={cn('h-5 w-5', job.copy_media ? 'text-primary' : 'text-muted-foreground')} />
                <div>
                  <span className="font-semibold">
                    {job.copy_media ? 'Mídia habilitada' : 'Apenas texto'}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {job.copy_media ? 'Fotos, vídeos, arquivos' : 'Sem arquivos de mídia'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Timestamps Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6"
      >
        <h3 className="text-lg font-bold mb-4">Informações Temporais</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {job.created_at && (
            <div className="p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Criado em</span>
              </div>
              <p className="font-semibold">{formatDate(job.created_at)}</p>
            </div>
          )}

          {(job.completed_at || job.started_at) && (
            <div className="p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-success" />
                </div>
                <span className="text-sm text-muted-foreground">Última atualização</span>
              </div>
              <p className="font-semibold">{formatDate(job.completed_at || job.started_at!)}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
