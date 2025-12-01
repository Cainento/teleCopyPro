import { create } from 'zustand';
import type { SessionStatus } from '@/types';

export interface SessionState {
  status: SessionStatus;
  userId?: number;
  username?: string;
  setStatus: (status: SessionStatus) => void;
  setUserInfo: (userId: number, username?: string) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'disconnected',
  userId: undefined,
  username: undefined,

  setStatus: (status: SessionStatus) => {
    set({ status });
  },

  setUserInfo: (userId: number, username?: string) => {
    set({ userId, username });
  },

  clearSession: () => {
    set({
      status: 'disconnected',
      userId: undefined,
      username: undefined,
    });
  },
}));
