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
          // Backend TransformInterceptor wraps response:
          // { success, data: { accessToken, user, ... }, timestamp }
          const payload = response.data?.data ?? response.data;

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
        const token = getAccessToken();
        const currentUser = _get().user;

        // Have in-memory token and user data — trust current state.
        // Token will be verified implicitly on the first data request.
        if (token && currentUser) {
          set({ isAuthenticated: true });
          return;
        }

        // No in-memory token AND no persisted auth state — definitely not authenticated.
        // (If the user was never logged in, don't make a network call.)
        if (!token && !_get().isAuthenticated) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        // Either:
        // - Have in-memory token but no user data (first load after login)
        // - No in-memory token but persisted auth state (page refresh — httpOnly cookie may still be valid)
        // Verify with server in both cases.
        try {
          const response = await authApi.me();
          const userData = response.data?.data ?? response.data;

          // Restore in-memory token from response if server returned one
          if (userData.accessToken) {
            setTokens(userData.accessToken);
          }

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
