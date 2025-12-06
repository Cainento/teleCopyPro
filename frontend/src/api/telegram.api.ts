import axios from 'axios';
import apiClient from './client';
import { BACKEND_URL, STORAGE_KEYS } from '@/lib/constants';
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

  /**
   * Logout from Telegram (disconnect session and delete session file)
   * NOTE: Calls backend directly to bypass Vercel proxy which was canceling POST requests
   */
  logout: async (data?: { api_id?: number; api_hash?: string }): Promise<{ message: string }> => {
    // Get auth token from localStorage to include in request
    const authData = localStorage.getItem(STORAGE_KEYS.AUTH);
    let token = '';

    if (authData) {
      try {
        const parsedData = JSON.parse(authData);
        token = parsedData?.state?.session?.accessToken || '';
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }

    // Call backend directly to bypass Vercel proxy
    const response = await axios.post<{ message: string }>(
      `${BACKEND_URL}/api/telegram/logout`,
      data || {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        timeout: 30000,
      }
    );

    return response.data;
  },
};
