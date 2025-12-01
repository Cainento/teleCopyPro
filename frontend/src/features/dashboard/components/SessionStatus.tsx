import { CheckCircle, XCircle, Clock, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useSessionStore } from '@/store/session.store';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/formatters';
import type { StatusResponse } from '@/types';

interface SessionStatusProps {
  status?: StatusResponse;
  isLoading: boolean;
}

export function SessionStatus({ status, isLoading }: SessionStatusProps) {
  const navigate = useNavigate();
  const { session, logout } = useAuthStore();
  const { clearSession } = useSessionStore();

  const handleLogout = () => {
    logout();
    clearSession();
    navigate(ROUTES.LOGIN);
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <Clock className="h-5 w-5 text-warning animate-pulse" />;
    }

    if (status?.connected) {
      return <CheckCircle className="h-5 w-5 text-success" />;
    }

    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const getStatusText = () => {
    if (isLoading) return 'Verificando...';
    if (status?.connected) return 'Conectado';
    return 'Desconectado';
  };

  const getStatusColor = () => {
    if (isLoading) return 'text-warning';
    if (status?.connected) return 'text-success';
    return 'text-destructive';
  };

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Status da Sessão</h3>
          <p className="text-sm text-muted-foreground">
            Informações da conexão do Telegram
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground"
          title="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
          </div>
        </div>

        {/* User Info */}
        {session && (
          <>
            <div className="border-t pt-4">
              <div className="text-sm text-muted-foreground mb-1">Usuário</div>
              <div className="font-medium">
                {session.username ? `@${session.username}` : session.phoneNumber}
              </div>
            </div>

            {session.userId && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">ID do Usuário</div>
                <div className="font-mono text-sm">{session.userId}</div>
              </div>
            )}

            <div>
              <div className="text-sm text-muted-foreground mb-1">Telefone</div>
              <div className="font-medium">{session.phoneNumber}</div>
            </div>
          </>
        )}

        {/* Connection Message */}
        {status?.message && (
          <div className="border-t pt-4">
            <div className="text-sm text-muted-foreground mb-1">Mensagem</div>
            <div className="text-sm">{status.message}</div>
          </div>
        )}

        {/* Last Update */}
        <div className="border-t pt-4 text-xs text-muted-foreground">
          Última atualização: {formatRelativeTime(new Date())}
        </div>
      </div>
    </div>
  );
}
