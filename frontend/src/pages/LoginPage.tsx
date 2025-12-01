import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { AuthWizard } from '@/features/auth/components/AuthWizard';
import { ROUTES } from '@/lib/constants';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4 py-12">
      {/* Logo/Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
          TeleCopy Pro
        </h1>
        <p className="text-muted-foreground">
          Copie mensagens entre canais do Telegram com facilidade
        </p>
      </div>

      {/* Auth Wizard */}
      <AuthWizard />

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; 2025 TeleCopy Pro. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
