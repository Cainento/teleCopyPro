import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface SuccessStepProps {
  username?: string;
  phoneNumber: string;
}

export function SuccessStep({ username, phoneNumber }: SuccessStepProps) {
  return (
    <div className="py-8 text-center">
      <div className="relative inline-block mb-8">
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center relative z-10"
        >
          <CheckCircle className="h-12 w-12 text-success" />
        </motion.div>

        {/* Glow rings */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 bg-success/20 rounded-full"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2 mb-8"
      >
        <h2 className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Autenticação Concluída!
        </h2>
        <p className="text-muted-foreground text-lg">
          Você está autenticado como <br />
          <span className="font-semibold text-foreground inline-block mt-2 px-3 py-1 bg-muted/50 rounded-lg">
            {username ? `@${username}` : phoneNumber}
          </span>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center gap-3 text-sm text-muted-foreground bg-muted/30 py-3 px-6 rounded-full inline-flex mx-auto"
      >
        <LoadingSpinner size="sm" />
        <span>Redirecionando para o dashboard...</span>
      </motion.div>
    </div>
  );
}
