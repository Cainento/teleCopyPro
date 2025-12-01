import apiClient from './client';
import type {
  SendCodeRequest,
  SendCodeResponse,
  SignInRequest,
  SignInResponse,
  SignIn2FARequest,
  StatusRequest,
  StatusResponse,
} from '@/types';

export const telegramApi = {
  /**
   * Send verification code to phone number
   */
  sendCode: async (data: SendCodeRequest): Promise<SendCodeResponse> => {
    const response = await apiClient.post<SendCodeResponse>('/api/telegram/send_code', data);
    return response.data;
  },

  /**
   * Sign in with phone code
   */
  signIn: async (data: SignInRequest): Promise<SignInResponse> => {
    const response = await apiClient.post<SignInResponse>('/api/telegram/sign_in', data);
    return response.data;
  },

  /**
   * Sign in with 2FA password
   */
  signIn2FA: async (data: SignIn2FARequest): Promise<SignInResponse> => {
    const response = await apiClient.post<SignInResponse>('/api/telegram/sign_in_2fa', data);
    return response.data;
  },

  /**
   * Check Telegram session status (authenticated endpoint - requires JWT token)
   */
  getStatus: async (params?: Partial<StatusRequest>): Promise<StatusResponse> => {
    const response = await apiClient.get<StatusResponse>('/api/telegram/status', {
      params: params || {},
    });
    return response.data;
  },
};
