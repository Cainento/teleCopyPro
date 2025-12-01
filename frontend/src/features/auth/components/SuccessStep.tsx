import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface SuccessStepProps {
  username?: string;
  phoneNumber: string;
}

export function SuccessStep({ username, phoneNumber }: SuccessStepProps) {
  return (
    <div className="space-y-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="inline-flex items-center justify-center w-20 h-20 bg-success/10 rounded-full"
      >
        <CheckCircle className="h-12 w-12 text-success" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold mb-2">Autenticação Concluída!</h2>
        <p className="text-muted-foreground">
          Você está autenticado como <br />
          <span className="font-medium text-foreground">
            {username ? `@${username}` : phoneNumber}
          </span>
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
        <span>Redirecionando para o dashboard...</span>
      </div>
    </div>
  );
}
