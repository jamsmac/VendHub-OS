import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, setTokens, clearTokens, getAccessToken } from "../api";

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
  login: (
    email: string,
    password: string,
    twoFactorCode?: string,
  ) => Promise<
    | { requiresTwoFactor?: boolean }
    | { accessToken: string; refreshToken: string; user: User }
  >;
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

      login: async (
        email: string,
        password: string,
        twoFactorCode?: string,
      ) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(email, password, twoFactorCode);
          const data = response.data;

          if (data.requiresTwoFactor) {
            set({ isLoading: false });
            return { requiresTwoFactor: true };
          }

          // Store access token in memory; refresh token is in httpOnly cookie
          setTokens(data.accessToken);

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });

          return data;
        } catch (error: unknown) {
          set({ isLoading: false });
          const err = error as { response?: { data?: { message?: string } } };
          throw new Error(err.response?.data?.message || "Login failed");
        }
      },

      logout: () => {
        clearTokens();
        set({
          user: null,
          isAuthenticated: false,
        });
        window.location.href = "/auth";
      },

      checkAuth: async () => {
        const token = getAccessToken();
        const currentUser = _get().user;

        // Have both token and user data — trust current state.
        // Token will be verified implicitly on the first data request.
        if (token && currentUser) {
          set({ isAuthenticated: true });
          return;
        }

        // No token at all — not authenticated
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        // Have token but no user data — verify with server
        try {
          const response = await authApi.me();
          set({
            user: response.data,
            isAuthenticated: true,
          });
        } catch {
          clearTokens();
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
      name: "vendhub-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
