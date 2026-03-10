"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, api } from "../api";

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  organization_id: string;
  is_active: boolean;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  byRole: Record<string, number>;
  avgTasksPerMember: number;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  target: string;
  details: string;
  created_at: string;
}

export function useTeamMembers(organizationId?: string) {
  return useQuery({
    queryKey: ["team-members", organizationId],
    queryFn: async () => {
      const params = organizationId ? { organizationId } : undefined;
      const response = await usersApi.getAll(params);
      return response.data;
    },
  });
}

export function useTeamStats() {
  return useQuery({
    queryKey: ["team-stats"],
    queryFn: async () => {
      const response = await usersApi.getAll();
      const users: UserRow[] = response.data?.data ?? response.data ?? [];
      const activeMembers = users.filter((u) => u.is_active).length;
      const byRole: Record<string, number> = {};
      for (const u of users) {
        byRole[u.role] = (byRole[u.role] || 0) + 1;
      }
      return {
        totalMembers: users.length,
        activeMembers,
        byRole,
        avgTasksPerMember: 0,
      } satisfies TeamStats;
    },
  });
}

export function useUsersByRole(role: string) {
  return useQuery({
    queryKey: ["users-by-role", role],
    queryFn: async () => {
      const response = await usersApi.getAll();
      const users: UserRow[] = response.data?.data ?? response.data ?? [];
      return users.filter((u) => u.role === role);
    },
    enabled: !!role,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await usersApi.update(userId, {
        role,
        updated_at: new Date().toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["team-stats"] });
      queryClient.invalidateQueries({ queryKey: ["users-by-role"] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await usersApi.update(userId, {
        is_active: false,
        updated_at: new Date().toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["team-stats"] });
    },
  });
}

export function useActivityLog(limit = 20) {
  return useQuery({
    queryKey: ["activity-log", limit],
    queryFn: async () => {
      const response = await api.get("/audit", { params: { limit } });
      return response.data;
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await usersApi.update(userId, {
        is_active: true,
        updated_at: new Date().toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["team-stats"] });
    },
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<{
        full_name: string;
        phone: string;
        avatar_url: string;
      }>;
    }) => {
      const response = await usersApi.update(userId, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      const response = await usersApi.update(userId, {
        is_active: isActive,
        updated_at: new Date().toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["team-stats"] });
    },
  });
}
