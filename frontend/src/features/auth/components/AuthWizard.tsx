import { motion, AnimatePresence } from 'framer-motion';
import { useAuthWizard } from '../hooks/useAuthWizard';
import { PhoneStep } from './PhoneStep';
import { CodeStep } from './CodeStep';
import { TwoFactorStep } from './TwoFactorStep';
import { SuccessStep } from './SuccessStep';
import { cn } from '@/lib/cn';

export function AuthWizard() {
  const {
    state,
    handlePhoneStep,
    handleCodeStep,
    handleTwoFactorStep,
    handleBack,
  } = useAuthWizard();

  const getStepNumber = () => {
    switch (state.currentStep) {
      case 'phone': return 1;
      case 'code': return 2;
      case '2fa': return 3;
      case 'success': return 4;
      default: return 1;
    }
  };

  const totalSteps = state.currentStep === '2fa' || state.currentStep === 'success' ? 3 : 2;
  const currentStepNum = getStepNumber();
  const progress = (currentStepNum / totalSteps) * 100;

  return (
    <div className="w-full max-w-md mx-auto relative z-10">
      {/* Progress Indicator */}
      {state.currentStep !== 'success' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-muted-foreground/80 tracking-wide uppercase">
              Etapa {currentStepNum} de {totalSteps}
            </span>
            <span className="text-sm font-bold text-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm border border-border/20">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      )}

      {/* Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl overflow-hidden relative",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-secondary/5 before:pointer-events-none"
        )}
      >
        <div className="p-8 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {state.currentStep === 'phone' && (
                <PhoneStep
                  onSubmit={handlePhoneStep}
                  isLoading={state.isLoading}
                  error={state.error}
                />
              )}

              {state.currentStep === 'code' && (
                <CodeStep
                  onSubmit={handleCodeStep}
                  onBack={handleBack}
                  phoneNumber={state.phoneNumber}
                  isLoading={state.isLoading}
                  error={state.error}
                />
              )}

              {state.currentStep === '2fa' && (
                <TwoFactorStep
                  onSubmit={handleTwoFactorStep}
                  onBack={handleBack}
                  isLoading={state.isLoading}
                  error={state.error}
                />
              )}

              {state.currentStep === 'success' && (
                <SuccessStep
                  username={state.username}
                  phoneNumber={state.phoneNumber}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Help Text */}
      {state.currentStep === 'phone' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-sm text-muted-foreground/80 px-4"
        >
          <p className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success/50" />
            Suas credenciais são encriptadas e armazenadas localmente no seu dispositivo.
          </p>
        </motion.div>
      )}
    </div>
  );
}
