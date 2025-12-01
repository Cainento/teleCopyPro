import { motion, AnimatePresence } from 'framer-motion';
import { useAuthWizard } from '../hooks/useAuthWizard';
import { PhoneStep } from './PhoneStep';
import { CodeStep } from './CodeStep';
import { TwoFactorStep } from './TwoFactorStep';
import { SuccessStep } from './SuccessStep';

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
      case 'phone':
        return 1;
      case 'code':
        return 2;
      case '2fa':
        return 3;
      case 'success':
        return 4;
      default:
        return 1;
    }
  };

  const totalSteps = state.currentStep === '2fa' || state.currentStep === 'success' ? 3 : 2;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress Indicator */}
      {state.currentStep !== 'success' && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Etapa {getStepNumber()} de {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round((getStepNumber() / totalSteps) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(getStepNumber() / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Card Container */}
      <div className="bg-card border rounded-lg shadow-lg p-8">
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

      {/* Help Text */}
      {state.currentStep === 'phone' && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Suas credenciais são usadas apenas para autenticação e são armazenadas de forma segura
            no seu navegador.
          </p>
        </div>
      )}
    </div>
  );
}
