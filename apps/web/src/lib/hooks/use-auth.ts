"use client";

/**
 * Auth hook for VendHub Admin Panel
 *
 * Provides authentication via NestJS backend (JWT + TOTP).
 * Manages access/refresh tokens, user session, and role.
 *
 * Flow:
 * 1. Login → POST /api/v1/auth/login → receive JWT pair
 * 2. Store tokens in memory + httpOnly cookies
 * 3. Auto-refresh on 401 (handled by apiClient)
 * 4. TOTP support for 2FA
 */

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, setTokens, clearTokens } from "../api";
import { useAuthStore } from "../store/auth";
import type { UserRole } from "@/types";

// Response types for auth API
interface AuthUser {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface LoginResponse {
  requiresTwoFactor?: boolean;
  challengeToken?: string;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ═══════════════════════════════════════
// AUTH HOOK
// ═══════════════════════════════════════

export function useAuth() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated: storeIsAuthenticated } = useAuthStore();
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");

  // Check if user is authenticated.
  // After page refresh, in-memory token is lost but httpOnly cookie persists.
  // Trust storeIsAuthenticated from Zustand persist (user state survives refresh).
  const isAuthenticated =
    storeIsAuthenticated && (!!user || storeIsAuthenticated);

  // Fetch current user profile (on mount, if authenticated or possibly authenticated)
  // After page refresh: in-memory token is null but httpOnly cookie is still valid,
  // so we allow the query when the persisted store says we were authenticated.
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const response = await authApi.me();
        return response.data as AuthUser;
      } catch {
        // Cookie invalid — clear state
        clearTokens();
        useAuthStore.getState().logout();
        return null;
      }
    },
    enabled: storeIsAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Sync server user → Zustand auth store
  useEffect(() => {
    if (currentUser && !user) {
      useAuthStore.setState({
        user: {
          id: String(currentUser.id),
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          role: currentUser.role,
          organizationId: "",
          twoFactorEnabled: false,
        },
        isAuthenticated: true,
      });
    }
  }, [currentUser, user]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (params: {
      email: string;
      password: string;
      totpCode?: string;
    }) => {
      const response = await authApi.login(
        params.email,
        params.password,
        params.totpCode,
      );
      return response.data as LoginResponse;
    },
    onSuccess: (data) => {
      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setChallengeToken(data.challengeToken || "");
        return;
      }

      // Store tokens
      setTokens(data.accessToken, data.refreshToken);

      // Update auth store
      useAuthStore.setState({
        user: {
          id: String(data.user.id),
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
          organizationId: "",
          twoFactorEnabled: false,
        },
        isAuthenticated: true,
      });

      // Invalidate all queries to refetch with auth
      queryClient.invalidateQueries();
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        // Ignore logout errors — always clear local state
      }
    },
    onSettled: () => {
      clearTokens();
      useAuthStore.getState().logout();
      queryClient.clear();
    },
  });

  // TOTP verification mutation — calls POST /auth/2fa/complete
  const verifyTotpMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await authApi.complete2FA(challengeToken, code);
      return response.data as LoginResponse;
    },
    onSuccess: (data) => {
      setRequiresTwoFactor(false);
      setTokens(data.accessToken, data.refreshToken);
      useAuthStore.setState({
        user: {
          id: String(data.user.id),
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
          organizationId: "",
          twoFactorEnabled: false,
        },
        isAuthenticated: true,
      });
      queryClient.invalidateQueries();
    },
  });

  // Login handler
  const login = useCallback(
    async (email: string, password: string) => {
      return loginMutation.mutateAsync({ email, password });
    },
    [loginMutation],
  );

  // Logout handler
  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  // TOTP verify handler
  const verifyTotp = useCallback(
    (code: string) => {
      return verifyTotpMutation.mutateAsync(code);
    },
    [verifyTotpMutation],
  );

  // Derive user-like shape for backward compatibility
  const userForDisplay = user
    ? {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role: user.role as UserRole,
        avatar: undefined as string | undefined,
        lastLogin: undefined as string | undefined,
      }
    : null;

  return {
    // State
    user: userForDisplay,
    isAuthenticated,
    isLoading: isLoadingUser || loginMutation.isPending,
    requiresTwoFactor,

    // Actions
    login,
    logout,
    verifyTotp,

    // Error state
    loginError: loginMutation.error as { message?: string } | null,
    logoutError: logoutMutation.error,
  };
}

// ═══════════════════════════════════════
// ROLE GUARD HOOK
// ═══════════════════════════════════════

/**
 * Check if current user has required role
 */
export function useRequireRole(requiredRoles: UserRole[]) {
  const { user, isAuthenticated } = useAuth();

  const hasAccess =
    isAuthenticated && user && requiredRoles.includes(user.role as UserRole);

  return {
    hasAccess: !!hasAccess,
    user,
    isAuthenticated,
    currentRole: user?.role,
  };
}
