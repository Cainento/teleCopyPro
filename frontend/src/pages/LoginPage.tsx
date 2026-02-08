import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { AuthWizard } from '@/features/auth/components/AuthWizard';
import { ROUTES } from '@/lib/constants';

// Feature highlights
const features = [
  'Cópia histórica de mensagens',
  'Monitoramento em tempo real',
  'Suporte a mídia completo',
  'Dashboard profissional',
];

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary" />

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 10, repeat: Infinity, delay: 2 }}
            className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16">
          {/* Back to home */}
          <motion.button
            onClick={() => navigate(ROUTES.HOME)}
            whileHover={{ x: -4 }}
            className="absolute top-8 left-8 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Voltar</span>
          </motion.button>

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <img
              src="/ClonaGram logo.png"
              alt="ClonaGram"
              className="w-12 h-12 object-contain"
            />
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-bold text-white">
                Clona<span className="text-white/80">Gram</span>
              </span>
              <span className="text-xs text-white/60 font-medium tracking-wider uppercase">
                Telegram Copier
              </span>
            </div>
          </div>

          {/* Tagline */}
          <h1 className="text-3xl xl:text-4xl font-bold text-white mb-4 leading-tight">
            Clone mensagens do
            <br />
            Telegram com facilidade
          </h1>

          <p className="text-white/80 text-lg mb-10 max-w-md">
            A ferramenta mais completa para copiar e sincronizar mensagens entre canais do Telegram.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <span className="text-white/90">{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background gradient-mesh px-4 py-12">
        {/* Mobile back button */}
        <motion.button
          onClick={() => navigate(ROUTES.HOME)}
          whileHover={{ x: -4 }}
          className="lg:hidden absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Voltar</span>
        </motion.button>

        {/* Mobile Logo */}
        <div className="lg:hidden text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/ClonaGram logo.png"
              alt="ClonaGram"
              className="w-10 h-10 object-contain"
            />
            <div className="flex flex-col leading-none">
              <span className="text-xl font-bold">
                <span className="text-gradient">Clona</span>
                <span className="text-foreground">Gram</span>
              </span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Copie mensagens entre canais com facilidade
          </p>
        </div>

        {/* Auth Wizard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <AuthWizard />
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          <p>© 2026 Clona Gram. Todos os direitos reservados.</p>
        </motion.div>
      </div>
    </div>
  );
}
