"use client";

import { useQuery } from "@tanstack/react-query";
import { directoriesApi } from "../api";

export interface DirectoryField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "date" | "json";
  required: boolean;
  options?: string[];
  default_value?: unknown;
}

export interface DbDirectory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  fields: DirectoryField[];
  is_active: boolean;
  entries_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbDirectoryEntry {
  id: string;
  directory_id: string;
  data: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useDirectories() {
  return useQuery({
    queryKey: ["directories"],
    queryFn: async () => {
      const response = await directoriesApi.getAll();
      return response.data as DbDirectory[];
    },
  });
}

export function useDirectory(slug: string) {
  return useQuery({
    queryKey: ["directories", slug],
    queryFn: async () => {
      const response = await directoriesApi.getBySlug(slug);
      return response.data as DbDirectory;
    },
    enabled: !!slug,
  });
}

export function useDirectoryEntries(directoryId: string) {
  return useQuery({
    queryKey: ["directory-entries", directoryId],
    queryFn: async () => {
      const response = await directoriesApi.getEntries(directoryId);
      return response.data as DbDirectoryEntry[];
    },
    enabled: !!directoryId,
  });
}

export function useDirectoryStats() {
  return useQuery({
    queryKey: ["directory-stats"],
    queryFn: async () => {
      const dirResponse = await directoriesApi.getAll();
      const directories = dirResponse.data as DbDirectory[];

      let totalEntries = 0;
      for (const dir of directories) {
        totalEntries += dir.entries_count || 0;
      }

      return {
        totalDirectories: directories.length,
        totalEntries,
      };
    },
  });
}
