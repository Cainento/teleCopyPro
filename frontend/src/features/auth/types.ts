import type { AuthStep } from '@/types';

export interface AuthWizardState {
  currentStep: AuthStep;
  phoneNumber: string;
  apiId: number;
  apiHash: string;
  phoneCodeHash?: string;
  userId?: number;
  username?: string;
  isLoading: boolean;
  error?: string;
}

export interface AuthStepProps {
  onNext: () => void;
  onBack?: () => void;
  state: AuthWizardState;
  updateState: (updates: Partial<AuthWizardState>) => void;
}
