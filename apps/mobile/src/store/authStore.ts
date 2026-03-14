/**
 * Auth Store - Zustand
 * Manages authentication state
 */

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { api, setOnSessionExpired } from "../services/api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  role: string;
  organizationId: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const ACCESS_TOKEN_KEY = "vendhub_access_token";
const REFRESH_TOKEN_KEY = "vendhub_refresh_token";
const USER_KEY = "vendhub_user";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await api.post("/auth/login", { email, password });
      const { accessToken, refreshToken, user } = response.data;

      // Store tokens securely
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      // Update API headers
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      const message = axiosError.response?.data?.message || "Login error";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      // Invalidate JWT on server (best-effort, don't block logout on failure)
      try {
        await api.post("/auth/logout");
      } catch {
        // Server may be unreachable — continue with local cleanup
      }

      // Clear stored tokens
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);

      // Clear API headers
      delete api.defaults.headers.common["Authorization"];

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error: unknown) {
      console.error("Logout error:", error);
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });

      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      const userStr = await SecureStore.getItemAsync(USER_KEY);

      if (!accessToken || !refreshToken || !userStr) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      // Set token in API headers
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

      // Verify token by fetching user
      try {
        const response = await api.get("/auth/me");
        const user = response.data;

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Token invalid, try refresh
        try {
          const refreshResponse = await api.post("/auth/refresh", {
            refreshToken,
          });
          const {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            user,
          } = refreshResponse.data;

          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

          api.defaults.headers.common["Authorization"] =
            `Bearer ${newAccessToken}`;

          set({
            user,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Refresh failed, logout
          await get().logout();
        }
      }
    } catch (error: unknown) {
      console.error("Check auth error:", error);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));

// When the API interceptor detects an expired session, force logout in Zustand
setOnSessionExpired(() => {
  useAuthStore.getState().logout();
});
