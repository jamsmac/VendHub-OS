import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  avatar?: string;
  twoFactorEnabled: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, twoFactorCode?: string) => Promise<any>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string, twoFactorCode?: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(email, password, twoFactorCode);
          const data = response.data;

          if (data.requiresTwoFactor) {
            set({ isLoading: false });
            return { requiresTwoFactor: true };
          }

          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });

          return data;
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || 'Login failed');
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          isAuthenticated: false,
        });
        window.location.href = '/auth';
      },

      checkAuth: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        try {
          const response = await authApi.me();
          set({
            user: response.data,
            isAuthenticated: true,
          });
        } catch {
          set({ isAuthenticated: false, user: null });
        }
      },

      forgotPassword: async (email: string) => {
        await authApi.forgotPassword(email);
      },

      resetPassword: async (token: string, password: string) => {
        await authApi.resetPassword(token, password);
      },
    }),
    {
      name: 'vendhub-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
