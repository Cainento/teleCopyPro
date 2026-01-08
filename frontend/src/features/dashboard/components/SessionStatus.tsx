import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, LogOut, User, Phone, Hash, Wifi } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useSessionStore } from '@/store/session.store';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/formatters';
import { cn } from '@/lib/cn';
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

  const isConnected = status?.connected;

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold mb-1">Status da Sessão</h3>
          <p className="text-sm text-muted-foreground">
            Conexão com Telegram
          </p>
        </div>
        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2.5 hover:bg-destructive/10 rounded-xl transition-colors text-muted-foreground hover:text-destructive"
          title="Sair"
        >
          <LogOut className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Connection Status */}
      <div className="mb-6">
        <div className={cn(
          'p-4 rounded-xl flex items-center gap-4 transition-colors',
          isLoading ? 'bg-warning/10' : isConnected ? 'bg-success/10' : 'bg-destructive/10'
        )}>
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            isLoading ? 'bg-warning/20' : isConnected ? 'bg-success/20' : 'bg-destructive/20'
          )}>
            {isLoading ? (
              <Clock className="h-6 w-6 text-warning animate-pulse" />
            ) : isConnected ? (
              <Wifi className="h-6 w-6 text-success" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className={cn(
              'font-semibold',
              isLoading ? 'text-warning' : isConnected ? 'text-success' : 'text-destructive'
            )}>
              {isLoading ? 'Verificando...' : isConnected ? 'Conectado' : 'Desconectado'}
            </p>
          </div>
          {isConnected && (
            <div className="ml-auto">
              <div className="status-dot status-dot-success" />
            </div>
          )}
        </div>
      </div>

      {/* User Info */}
      {session && (
        <div className="space-y-4">
          {/* Username */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Usuário</p>
              <p className="font-medium truncate">
                {session.username ? `@${session.username}` : 'Sem username'}
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Phone className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="font-medium truncate">{session.phoneNumber}</p>
            </div>
          </div>

          {/* User ID */}
          {session.userId && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Hash className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">ID do Usuário</p>
                <p className="font-mono text-sm truncate">{session.userId}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connection Message */}
      {status?.message && (
        <div className="mt-6 p-3 bg-muted/30 rounded-xl">
          <p className="text-xs text-muted-foreground mb-1">Mensagem</p>
          <p className="text-sm">{status.message}</p>
        </div>
      )}

      {/* Last Update */}
      <div className="mt-6 pt-4 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-2">
        <Clock className="w-3 h-3" />
        <span>Atualizado: {formatRelativeTime(new Date())}</span>
      </div>
    </div>
  );
}
