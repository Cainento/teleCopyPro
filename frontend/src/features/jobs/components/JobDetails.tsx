import { ArrowLeft, Clock, Zap, Hash, Image, ArrowRight, MessageSquare, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { JobControls } from './JobControls';
import type { Job } from '@/api/types';

// Helper function to convert UTC timestamp to local time
const formatLocalTime = (timestamp: string) => {
  // Ensure the timestamp has 'Z' suffix to indicate UTC
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`;
  // Parse and convert to local time automatically
  const localDate = new Date(utcTimestamp);
  // Format the date
  return format(localDate, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
};

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

  const statusConfig = {
    pending: {
      label: 'Pendente',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    running: {
      label: 'Em Execução',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    completed: {
      label: 'Concluído',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    failed: {
      label: 'Falhou',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    stopped: {
      label: 'Parado',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    paused: {
      label: 'Pausado',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  };

  const config = statusConfig[job.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/jobs')}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="Voltar para lista"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold">Detalhes do Job</h2>
            <p className="text-sm text-muted-foreground">ID: {job.id}</p>
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
      </div>

      {/* Status Card */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Status</h3>
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
            {config.label}
          </div>
        </div>

        <div className="space-y-3">
          {/* Messages Copied */}
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Mensagens copiadas</p>
              <p className="text-xl font-bold text-foreground">
                {job.messages_copied.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Messages Failed (only show if > 0) */}
          {job.messages_failed > 0 && (
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Mensagens falhadas</p>
                <p className="text-xl font-bold text-destructive">
                  {job.messages_failed.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          )}
        </div>

        {job.status === 'failed' && job.error_message && (
          <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded text-sm text-destructive">
            <span className="font-medium">Erro:</span> {job.error_message}
          </div>
        )}
      </div>

      {/* Configuration Card */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Configuração</h3>

        <div className="space-y-4">
          {/* Channels */}
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">
              Canais
            </label>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 flex-1">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{job.source_channel}</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{job.target_channel}</span>
              </div>
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">
              Modo
            </label>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              {job.real_time ? (
                <>
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-medium">Tempo Real</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    (Copia novas mensagens conforme chegam)
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Histórico</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    (Copia mensagens existentes)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Copy Media */}
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">
              Opções
            </label>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Image className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {job.copy_media ? 'Copiar mídia habilitado' : 'Copiar apenas texto'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Timestamps Card */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Informações Temporais</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {job.created_at && (
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Criado em
              </label>
              <p className="text-sm">
                {formatLocalTime(job.created_at)}
              </p>
            </div>
          )}

          {(job.completed_at || job.started_at) && (
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Última atualização
              </label>
              <p className="text-sm">
                {formatLocalTime(job.completed_at || job.started_at!)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Card */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Estatísticas</h3>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Copiadas</p>
            <p className="text-2xl font-bold text-primary">
              {job.messages_copied.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="p-4 bg-destructive/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Falharam</p>
            <p className="text-2xl font-bold text-destructive">
              {job.messages_failed.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
