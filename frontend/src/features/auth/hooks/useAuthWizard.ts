import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { telegramApi } from '@/api/telegram.api';
import { useAuthStore } from '@/store/auth.store';
import { useSessionStore } from '@/store/session.store';
import { ROUTES } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import type { AuthWizardState } from '../types';
import type { PhoneStepFormData, CodeStepFormData, TwoFactorStepFormData } from '../schemas/auth.schema';

export function useAuthWizard() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { setStatus, setUserInfo } = useSessionStore();

  const [state, setState] = useState<AuthWizardState>({
    currentStep: 'phone',
    phoneNumber: '',
    apiId: 0,
    apiHash: '',
    isLoading: false,
  });

  const updateState = useCallback((updates: Partial<AuthWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Step 1: Enviar código de verificação
   */
  const handlePhoneStep = useCallback(async (data: PhoneStepFormData) => {
    updateState({ isLoading: true, error: undefined });

    try {
      const response = await telegramApi.sendCode({
        phone_number: data.phoneNumber,
        api_id: data.apiId,
        api_hash: data.apiHash,
      });

      updateState({
        phoneNumber: data.phoneNumber,
        apiId: data.apiId,
        apiHash: data.apiHash,
        phoneCodeHash: response.phone_code_hash,
        currentStep: 'code',
        isLoading: false,
      });

      setStatus('waiting_code');
      toast.success('Código de verificação enviado!');
    } catch (error) {
      const message = getErrorMessage(error);
      updateState({ error: message, isLoading: false });
      toast.error(message);
    }
  }, [updateState, setStatus]);

  /**
   * Step 2: Verificar código
   */
  const handleCodeStep = useCallback(async (data: CodeStepFormData) => {
    updateState({ isLoading: true, error: undefined });

    try {
      const response = await telegramApi.signIn({
        phone_number: state.phoneNumber,
        phone_code: data.code,
      });

      // Verificar se precisa de 2FA
      if (response.requires_2fa || response.message.toLowerCase().includes('2fa') || response.message.toLowerCase().includes('password')) {
        updateState({
          currentStep: '2fa',
          isLoading: false,
        });
        setStatus('waiting_password');
        toast.info('Autenticação de dois fatores necessária');
        return;
      }

      // Login bem-sucedido
      if (response.user_id && response.access_token) {
        handleSuccessfulAuth(response.user_id, response.username, response.access_token, response.token_type || 'bearer');
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      const message = getErrorMessage(error);

      // Se o erro mencionar 2FA, ir para o step de 2FA
      if (message.toLowerCase().includes('2fa') || message.toLowerCase().includes('password')) {
        updateState({
          currentStep: '2fa',
          isLoading: false,
        });
        setStatus('waiting_password');
        toast.info('Autenticação de dois fatores necessária');
      } else {
        updateState({ error: message, isLoading: false });
        toast.error(message);
      }
    }
  }, [state.phoneNumber, updateState, setStatus]);

  /**
   * Step 3: Verificar senha 2FA
   */
  const handleTwoFactorStep = useCallback(async (data: TwoFactorStepFormData) => {
    updateState({ isLoading: true, error: undefined });

    try {
      const response = await telegramApi.signIn2FA({
        phone_number: state.phoneNumber,
        password: data.password,
      });

      if (response.user_id && response.access_token) {
        handleSuccessfulAuth(response.user_id, response.username, response.access_token, response.token_type || 'bearer');
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      const message = getErrorMessage(error);
      updateState({ error: message, isLoading: false });
      toast.error(message);
    }
  }, [state.phoneNumber, updateState]);

  /**
   * Finalizar autenticação com sucesso
   */
  const handleSuccessfulAuth = useCallback((userId: number, username: string | undefined, accessToken: string, tokenType: string) => {
    // Salvar sessão no Zustand (com persistência)
    login({
      phoneNumber: state.phoneNumber,
      userId,
      username,
      apiId: state.apiId,
      apiHash: state.apiHash,
      isAuthenticated: true,
      accessToken, // JWT token
      tokenType, // "bearer"
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 dias (JWT expiration)
    });

    // Atualizar estado da sessão
    setStatus('connected');
    setUserInfo(userId, username);

    // Atualizar wizard state
    updateState({
      userId,
      username,
      currentStep: 'success',
      isLoading: false,
    });

    toast.success(`Autenticado como ${username ? `@${username}` : state.phoneNumber}!`);

    // Redirecionar para dashboard após 1 segundo
    setTimeout(() => {
      navigate(ROUTES.DASHBOARD);
    }, 1000);
  }, [state.phoneNumber, state.apiId, state.apiHash, login, setStatus, setUserInfo, updateState, navigate]);

  /**
   * Voltar para o passo anterior
   */
  const handleBack = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep === 'code') {
        return { ...prev, currentStep: 'phone', error: undefined };
      }
      if (prev.currentStep === '2fa') {
        return { ...prev, currentStep: 'code', error: undefined };
      }
      return prev;
    });
  }, []);

  return {
    state,
    updateState,
    handlePhoneStep,
    handleCodeStep,
    handleTwoFactorStep,
    handleBack,
  };
}
