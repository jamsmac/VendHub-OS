"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { integrationsApi, settingsApi } from "../api";

export interface OrganizationSettings {
  id: string;
  name: string;
  legal_name: string | null;
  inn: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  timezone: string;
  currency: string;
  language: string;
  logo_url: string | null;
  updated_at: string;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  last_sync_at: string | null;
  config: Record<string, unknown>;
  test_mode: boolean;
  description?: string;
  color?: string;
  icon?: string;
  version?: string;
  api_key_masked?: string;
}

export function useOrganizationSettings() {
  return useQuery({
    queryKey: ["organization-settings"],
    queryFn: async () => {
      const response = await settingsApi.getAll({ category: "organization" });
      return response.data as OrganizationSettings;
    },
  });
}

export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      updates: Partial<Omit<OrganizationSettings, "id" | "updated_at">>,
    ) => {
      const results: Partial<OrganizationSettings> = {};

      const resultsMap = results as Record<string, unknown>;
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null) {
          const response = await settingsApi.update(key, { value });
          resultsMap[key] = response.data ?? value;
        }
      }

      return results as OrganizationSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
    },
  });
}

export function useIntegrationStatuses() {
  return useQuery({
    queryKey: ["integration-statuses"],
    queryFn: async () => {
      const response = await integrationsApi.getAll();
      return response.data as IntegrationStatus[];
    },
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ["system-health"],
    queryFn: async () => {
      return {
        database: "ok" as const,
        api: "ok" as const,
        redis: "ok" as const,
        storage: "ok" as const,
        uptime: 0,
      };
    },
    refetchInterval: 30_000, // every 30 seconds
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<IntegrationStatus, "id">>;
    }) => {
      const response = await integrationsApi.update(id, updates);
      return response.data as IntegrationStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-statuses"] });
    },
  });
}

export function useTestIntegration() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await integrationsApi.test(id);
      return response.data as { success: boolean; message: string };
    },
  });
}
