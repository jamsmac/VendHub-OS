import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, setTokens, clearTokens } from "../api";

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
          // Response interceptor already strips the TransformInterceptor envelope
          const payload = response.data;

          if (payload.requiresTwoFactor) {
            set({ isLoading: false });
            return { requiresTwoFactor: true };
          }

          // Store access token in memory (httpOnly cookie handles persistence)
          setTokens(payload.accessToken);

          set({
            user: payload.user,
            isAuthenticated: true,
            isLoading: false,
          });

          return payload;
        } catch (error: unknown) {
          set({ isLoading: false });
          const err = error as {
            response?: {
              data?: { message?: string; data?: { message?: string } };
            };
          };
          throw new Error(
            err.response?.data?.data?.message ||
              err.response?.data?.message ||
              "Login failed",
          );
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
        const currentUser = _get().user;

        // Have user data and persisted auth state — trust current state.
        // httpOnly cookie will be verified implicitly on the first data request.
        if (currentUser && _get().isAuthenticated) {
          set({ isAuthenticated: true });
          return;
        }

        // No persisted auth state — definitely not authenticated.
        if (!_get().isAuthenticated) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        // Persisted isAuthenticated but no user data (page refresh).
        // httpOnly cookie is still valid — verify with server.
        try {
          const response = await authApi.me();
          const userData = response.data;

          set({
            user: userData,
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
