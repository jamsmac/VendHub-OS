import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { websiteConfigApi } from "../api";

export interface WebsiteConfig {
  id: string;
  organizationId: string;
  key: string;
  value: string;
  section: "general" | "seo" | "social" | "theme" | "analytics";
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Hook to fetch all website configs
 */
export function useWebsiteConfig() {
  return useQuery({
    queryKey: ["website-config"],
    queryFn: () => websiteConfigApi.getAll(),
  });
}

/**
 * Hook to fetch website configs by section
 */
export function useWebsiteConfigBySection(section: string) {
  return useQuery({
    queryKey: ["website-config", "section", section],
    queryFn: () => websiteConfigApi.getBySection(section),
  });
}

/**
 * Hook to fetch a single config by key
 */
export function useWebsiteConfigByKey(key: string, enabled = true) {
  return useQuery({
    queryKey: ["website-config", "key", key],
    queryFn: () => websiteConfigApi.getByKey(key),
    enabled,
  });
}

/**
 * Hook to update website config
 */
export function useUpdateWebsiteConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
      section,
    }: {
      key: string;
      value: string;
      section?: string;
    }) => {
      return websiteConfigApi.updateByKey(key, { value, section });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-config"] });
    },
  });
}

/**
 * Hook to bulk update website configs
 */
export function useBulkUpdateWebsiteConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      configs: Array<{
        key: string;
        value: string;
        section?: string;
      }>,
    ) => {
      return websiteConfigApi.bulkUpdate(configs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-config"] });
    },
  });
}

/**
 * Hook to create website config
 */
export function useCreateWebsiteConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      key: string;
      value: string;
      section?: string;
    }) => {
      return websiteConfigApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-config"] });
    },
  });
}

/**
 * Hook to delete website config
 */
export function useDeleteWebsiteConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      return websiteConfigApi.deleteByKey(key);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-config"] });
    },
  });
}
