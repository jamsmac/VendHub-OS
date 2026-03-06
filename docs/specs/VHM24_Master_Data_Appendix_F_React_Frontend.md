# VHM24 Master Data Management — React Frontend Implementation

## Appendix F to Technical Specification v1.0

Этот документ содержит примеры реализации frontend компонентов на React + TypeScript.

---

## 1. Структура проекта

```
src/
├── features/
│   └── directories/
│       ├── api/
│       │   └── directory.api.ts
│       ├── components/
│       │   ├── DirectoryList/
│       │   ├── DirectorySelect/
│       │   ├── EntryForm/
│       │   ├── EntryList/
│       │   ├── EntryTree/
│       │   ├── ImportWizard/
│       │   └── InlineCreate/
│       ├── hooks/
│       │   ├── useDirectory.ts
│       │   ├── useEntries.ts
│       │   ├── useSearch.ts
│       │   └── useLocalized.ts
│       ├── store/
│       │   └── directory.store.ts
│       ├── types/
│       │   └── directory.types.ts
│       └── utils/
│           └── validation.ts
```

---

## 2. Types

```typescript
// src/features/directories/types/directory.types.ts

export enum DirectoryType {
  MANUAL = "MANUAL",
  EXTERNAL = "EXTERNAL",
  PARAM = "PARAM",
  TEMPLATE = "TEMPLATE",
}

export enum DirectoryScope {
  HQ = "HQ",
  ORGANIZATION = "ORGANIZATION",
  LOCATION = "LOCATION",
}

export enum EntryOrigin {
  OFFICIAL = "OFFICIAL",
  LOCAL = "LOCAL",
}

export enum EntryStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  ACTIVE = "ACTIVE",
  DEPRECATED = "DEPRECATED",
  ARCHIVED = "ARCHIVED",
}

export enum FieldType {
  TEXT = "TEXT",
  NUMBER = "NUMBER",
  DATE = "DATE",
  DATETIME = "DATETIME",
  BOOLEAN = "BOOLEAN",
  SELECT_SINGLE = "SELECT_SINGLE",
  SELECT_MULTI = "SELECT_MULTI",
  REF = "REF",
  JSON = "JSON",
  FILE = "FILE",
  IMAGE = "IMAGE",
}

export interface DirectorySettings {
  allow_inline_create: boolean;
  allow_local_overlay: boolean;
  approval_required: boolean;
  prefetch: boolean;
  offline_enabled: boolean;
  offline_max_entries: number;
}

export interface DirectoryField {
  id: string;
  directory_id: string;
  name: string;
  display_name: string;
  description?: string;
  field_type: FieldType;
  ref_directory_id?: string;
  allow_free_text: boolean;
  is_required: boolean;
  is_unique: boolean;
  show_in_list: boolean;
  show_in_card: boolean;
  sort_order: number;
  default_value?: any;
  validation_rules?: ValidationRules;
  translations?: Record<string, string>;
}

export interface Directory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: DirectoryType;
  scope: DirectoryScope;
  organization_id?: string;
  is_hierarchical: boolean;
  is_system: boolean;
  icon?: string;
  settings: DirectorySettings;
  fields: DirectoryField[];
  created_at: string;
  updated_at: string;
}

export interface DirectoryEntry {
  id: string;
  directory_id: string;
  parent_id?: string;
  name: string;
  normalized_name: string;
  code?: string;
  external_key?: string;
  description?: string;
  translations?: Record<string, string>;
  origin: EntryOrigin;
  origin_source?: string;
  status: EntryStatus;
  version: number;
  deprecated_at?: string;
  replacement_entry_id?: string;
  tags?: string[];
  sort_order: number;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ValidationRules {
  regex?: string;
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  allowed_values?: string[];
  unique_scope?: "DIRECTORY" | "ORGANIZATION" | "GLOBAL";
  custom_message?: string;
  conditional_rules?: ConditionalRule[];
}

export interface ConditionalRule {
  if: { field: string; equals?: any; in?: any[] };
  then: {
    field: string;
    required?: boolean;
    min_value?: number;
    max_value?: number;
  };
}

export interface SearchResult {
  recent?: DirectoryEntry[];
  results: DirectoryEntry[];
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
```

---

## 3. API Client

```typescript
// src/features/directories/api/directory.api.ts

import axios from "axios";
import {
  Directory,
  DirectoryEntry,
  SearchResult,
  PaginatedResponse,
} from "../types/directory.types";

const api = axios.create({
  baseURL: "/api",
});

// Interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const directoryApi = {
  // Directories
  getDirectories: async (
    filters?: Record<string, any>,
  ): Promise<Directory[]> => {
    const { data } = await api.get("/directories", { params: filters });
    return data.data;
  },

  getDirectory: async (id: string): Promise<Directory> => {
    const { data } = await api.get(`/directories/${id}`);
    return data.data;
  },

  getDirectoryBySlug: async (slug: string): Promise<Directory> => {
    const { data } = await api.get(`/directories/slug/${slug}`);
    return data.data;
  },

  createDirectory: async (dto: Partial<Directory>): Promise<Directory> => {
    const { data } = await api.post("/directories", dto);
    return data.data;
  },

  updateDirectory: async (
    id: string,
    dto: Partial<Directory>,
  ): Promise<Directory> => {
    const { data } = await api.patch(`/directories/${id}`, dto);
    return data.data;
  },

  deleteDirectory: async (id: string): Promise<void> => {
    await api.delete(`/directories/${id}`);
  },

  // Entries
  getEntries: async (
    directoryId: string,
    params?: {
      status?: string;
      origin?: string;
      parent_id?: string | null;
      tags?: string[];
      page?: number;
      limit?: number;
      sort?: string;
    },
  ): Promise<PaginatedResponse<DirectoryEntry>> => {
    const { data } = await api.get(`/directories/${directoryId}/entries`, {
      params,
    });
    return data;
  },

  getEntry: async (
    directoryId: string,
    entryId: string,
  ): Promise<DirectoryEntry> => {
    const { data } = await api.get(
      `/directories/${directoryId}/entries/${entryId}`,
    );
    return data.data;
  },

  createEntry: async (
    directoryId: string,
    dto: Partial<DirectoryEntry>,
  ): Promise<DirectoryEntry> => {
    const { data } = await api.post(`/directories/${directoryId}/entries`, dto);
    return data.data;
  },

  updateEntry: async (
    directoryId: string,
    entryId: string,
    dto: Partial<DirectoryEntry>,
  ): Promise<DirectoryEntry> => {
    const { data } = await api.patch(
      `/directories/${directoryId}/entries/${entryId}`,
      dto,
    );
    return data.data;
  },

  archiveEntry: async (directoryId: string, entryId: string): Promise<void> => {
    await api.delete(`/directories/${directoryId}/entries/${entryId}`);
  },

  restoreEntry: async (
    directoryId: string,
    entryId: string,
  ): Promise<DirectoryEntry> => {
    const { data } = await api.post(
      `/directories/${directoryId}/entries/${entryId}/restore`,
    );
    return data.data;
  },

  // Search
  searchEntries: async (
    directoryId: string,
    params: {
      q?: string;
      status?: string;
      limit?: number;
      include_recent?: boolean;
    },
  ): Promise<SearchResult> => {
    const { data } = await api.get(
      `/directories/${directoryId}/entries/search`,
      { params },
    );
    return data.data;
  },

  // Recent selections
  recordSelection: async (
    directoryId: string,
    entryId: string,
  ): Promise<void> => {
    await api.post(`/users/me/recent-selections/${directoryId}`, {
      entry_id: entryId,
    });
  },

  // Bulk operations
  bulkImport: async (
    directoryId: string,
    file: File,
    options: {
      mapping: Record<string, string>;
      mode: string;
      unique_key_field?: string;
      is_atomic?: boolean;
    },
  ): Promise<{ job_id: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(options.mapping));
    formData.append("mode", options.mode);
    if (options.unique_key_field) {
      formData.append("unique_key_field", options.unique_key_field);
    }
    if (options.is_atomic !== undefined) {
      formData.append("is_atomic", String(options.is_atomic));
    }

    const { data } = await api.post(
      `/directories/${directoryId}/entries/bulk-import`,
      formData,
    );
    return data.data;
  },

  getImportJob: async (directoryId: string, jobId: string) => {
    const { data } = await api.get(
      `/directories/${directoryId}/import-jobs/${jobId}`,
    );
    return data.data;
  },

  exportEntries: async (
    directoryId: string,
    params: {
      format: "xlsx" | "csv";
      status?: string;
      columns?: string[];
    },
  ): Promise<Blob> => {
    const { data } = await api.get(
      `/directories/${directoryId}/entries/export`,
      {
        params,
        responseType: "blob",
      },
    );
    return data;
  },
};
```

---

## 4. Hooks

### 4.1 useDirectory

```typescript
// src/features/directories/hooks/useDirectory.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { directoryApi } from "../api/directory.api";
import { Directory } from "../types/directory.types";

export function useDirectory(id: string) {
  return useQuery({
    queryKey: ["directory", id],
    queryFn: () => directoryApi.getDirectory(id),
    enabled: !!id,
  });
}

export function useDirectoryBySlug(slug: string) {
  return useQuery({
    queryKey: ["directory", "slug", slug],
    queryFn: () => directoryApi.getDirectoryBySlug(slug),
    enabled: !!slug,
  });
}

export function useDirectories(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["directories", filters],
    queryFn: () => directoryApi.getDirectories(filters),
  });
}

export function useCreateDirectory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: Partial<Directory>) => directoryApi.createDirectory(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directories"] });
    },
  });
}

export function useUpdateDirectory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<Directory> }) =>
      directoryApi.updateDirectory(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["directory", id] });
      queryClient.invalidateQueries({ queryKey: ["directories"] });
    },
  });
}
```

### 4.2 useEntries

```typescript
// src/features/directories/hooks/useEntries.ts

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { directoryApi } from "../api/directory.api";
import { DirectoryEntry } from "../types/directory.types";

interface UseEntriesParams {
  directoryId: string;
  status?: string;
  origin?: string;
  parent_id?: string | null;
  tags?: string[];
  sort?: string;
  limit?: number;
}

export function useEntries(params: UseEntriesParams) {
  const { directoryId, ...filters } = params;

  return useInfiniteQuery({
    queryKey: ["entries", directoryId, filters],
    queryFn: ({ pageParam = 1 }) =>
      directoryApi.getEntries(directoryId, { ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { page, total_pages } = lastPage.meta;
      return page < total_pages ? page + 1 : undefined;
    },
    enabled: !!directoryId,
  });
}

export function useEntry(directoryId: string, entryId: string) {
  return useQuery({
    queryKey: ["entry", directoryId, entryId],
    queryFn: () => directoryApi.getEntry(directoryId, entryId),
    enabled: !!directoryId && !!entryId,
  });
}

export function useCreateEntry(directoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: Partial<DirectoryEntry>) =>
      directoryApi.createEntry(directoryId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries", directoryId] });
    },
  });
}

export function useUpdateEntry(directoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      dto,
    }: {
      entryId: string;
      dto: Partial<DirectoryEntry>;
    }) => directoryApi.updateEntry(directoryId, entryId, dto),
    onSuccess: (_, { entryId }) => {
      queryClient.invalidateQueries({
        queryKey: ["entry", directoryId, entryId],
      });
      queryClient.invalidateQueries({ queryKey: ["entries", directoryId] });
    },
  });
}

export function useArchiveEntry(directoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) =>
      directoryApi.archiveEntry(directoryId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries", directoryId] });
    },
  });
}
```

### 4.3 useSearch

```typescript
// src/features/directories/hooks/useSearch.ts

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import debounce from "lodash/debounce";
import { directoryApi } from "../api/directory.api";
import { DirectoryEntry, SearchResult } from "../types/directory.types";

interface UseSearchParams {
  directoryId: string;
  initialQuery?: string;
  status?: string;
  limit?: number;
  includeRecent?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
}

export function useSearch({
  directoryId,
  initialQuery = "",
  status = "ACTIVE",
  limit = 50,
  includeRecent = true,
  debounceMs = 300,
  minQueryLength = 2,
}: UseSearchParams) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounced query update
  const debouncedSetQuery = useCallback(
    debounce((value: string) => {
      setDebouncedQuery(value);
    }, debounceMs),
    [debounceMs],
  );

  useEffect(() => {
    debouncedSetQuery(query);
    return () => {
      debouncedSetQuery.cancel();
    };
  }, [query, debouncedSetQuery]);

  // Search query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["search", directoryId, debouncedQuery, status],
    queryFn: () =>
      directoryApi.searchEntries(directoryId, {
        q: debouncedQuery,
        status,
        limit,
        include_recent: includeRecent,
      }),
    enabled:
      !!directoryId &&
      (debouncedQuery.length >= minQueryLength || debouncedQuery === ""),
  });

  // Record selection
  const recordSelection = useCallback(
    async (entry: DirectoryEntry) => {
      await directoryApi.recordSelection(directoryId, entry.id);
    },
    [directoryId],
  );

  return {
    query,
    setQuery,
    results: data?.results || [],
    recent: data?.recent || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch,
    recordSelection,
  };
}
```

### 4.4 useLocalized

```typescript
// src/features/directories/hooks/useLocalized.ts

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface LocalizableEntity {
  name: string;
  translations?: Record<string, string>;
}

export function useLocalized<T extends LocalizableEntity>(
  entity: T | null | undefined,
): string {
  const { i18n } = useTranslation();
  const currentLocale = i18n.language;
  const defaultLocale = "ru";

  return useMemo(() => {
    if (!entity) return "";

    // Try current locale
    if (entity.translations?.[currentLocale]) {
      return entity.translations[currentLocale];
    }

    // Try default locale
    if (entity.translations?.[defaultLocale]) {
      return entity.translations[defaultLocale];
    }

    // Fallback to name
    return entity.name;
  }, [entity, currentLocale, defaultLocale]);
}

// For field names
export function useLocalizedField(
  field:
    | { display_name: string; translations?: Record<string, string> }
    | null
    | undefined,
): string {
  const { i18n } = useTranslation();
  const currentLocale = i18n.language;
  const defaultLocale = "ru";

  return useMemo(() => {
    if (!field) return "";

    if (field.translations?.[currentLocale]) {
      return field.translations[currentLocale];
    }

    if (field.translations?.[defaultLocale]) {
      return field.translations[defaultLocale];
    }

    return field.display_name;
  }, [field, currentLocale, defaultLocale]);
}
```

---

## 5. Components

### 5.1 DirectorySelect (Autocomplete with Inline Create)

```tsx
// src/features/directories/components/DirectorySelect/DirectorySelect.tsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSearch } from "../../hooks/useSearch";
import { useLocalized } from "../../hooks/useLocalized";
import { useDirectory } from "../../hooks/useDirectory";
import { DirectoryEntry, EntryOrigin } from "../../types/directory.types";
import { InlineCreateModal } from "../InlineCreate/InlineCreateModal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Search, Plus, Shield, Pencil, Loader2 } from "lucide-react";

interface DirectorySelectProps {
  directoryId: string;
  value?: string;
  onChange: (entryId: string | null, entry?: DirectoryEntry) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DirectorySelect({
  directoryId,
  value,
  onChange,
  placeholder = "Выберите...",
  disabled = false,
  className,
}: DirectorySelectProps) {
  const [open, setOpen] = useState(false);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: directory } = useDirectory(directoryId);
  const { query, setQuery, results, recent, isLoading, recordSelection } =
    useSearch({
      directoryId,
      includeRecent: true,
    });

  // Selected entry display
  const [selectedEntry, setSelectedEntry] = useState<DirectoryEntry | null>(
    null,
  );
  const selectedName = useLocalized(selectedEntry);

  // Load selected entry
  useEffect(() => {
    if (value && results.length > 0) {
      const entry = results.find((e) => e.id === value);
      if (entry) {
        setSelectedEntry(entry);
      }
    }
  }, [value, results]);

  const handleSelect = useCallback(
    async (entry: DirectoryEntry) => {
      setSelectedEntry(entry);
      onChange(entry.id, entry);
      await recordSelection(entry);
      setOpen(false);
      setQuery("");
    },
    [onChange, recordSelection, setQuery],
  );

  const handleInlineCreate = useCallback(
    (entry: DirectoryEntry) => {
      handleSelect(entry);
      setShowInlineCreate(false);
    },
    [handleSelect],
  );

  const canInlineCreate = directory?.settings.allow_inline_create ?? true;
  const showCreateOption =
    canInlineCreate && query.length > 0 && results.length === 0;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
          >
            {selectedEntry ? (
              <span className="flex items-center gap-2">
                <OriginBadge origin={selectedEntry.origin} />
                {selectedName}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <Search className="h-4 w-4 opacity-50" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск..."
              className="h-10 border-0 focus-visible:ring-0"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {/* Recent selections */}
            {recent.length > 0 && !query && (
              <div className="p-2">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Недавние
                </div>
                {recent.map((entry) => (
                  <EntryItem
                    key={entry.id}
                    entry={entry}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* Search results */}
            {results.length > 0 && (
              <div className="p-2">
                {query && (
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Результаты поиска
                  </div>
                )}
                {results.map((entry) => (
                  <EntryItem
                    key={entry.id}
                    entry={entry}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* No results */}
            {!isLoading &&
              query &&
              results.length === 0 &&
              !showCreateOption && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Ничего не найдено
                </div>
              )}

            {/* Inline create option */}
            {showCreateOption && (
              <div className="border-t p-2">
                <button
                  type="button"
                  onClick={() => setShowInlineCreate(true)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Plus className="h-4 w-4 text-primary" />
                  <span>
                    Добавить «<strong>{query}</strong>» в справочник
                  </span>
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Inline Create Modal */}
      {showInlineCreate && directory && (
        <InlineCreateModal
          directory={directory}
          initialName={query}
          onCreated={handleInlineCreate}
          onClose={() => setShowInlineCreate(false)}
        />
      )}
    </>
  );
}

// Entry item component
function EntryItem({
  entry,
  onSelect,
}: {
  entry: DirectoryEntry;
  onSelect: (entry: DirectoryEntry) => void;
}) {
  const name = useLocalized(entry);

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
    >
      <OriginBadge origin={entry.origin} />
      <span className="flex-1 text-left">{name}</span>
      {entry.code && (
        <span className="text-xs text-muted-foreground">{entry.code}</span>
      )}
    </button>
  );
}

// Origin badge component
function OriginBadge({ origin }: { origin: EntryOrigin }) {
  if (origin === EntryOrigin.OFFICIAL) {
    return (
      <Badge variant="secondary" className="h-5 px-1">
        <Shield className="h-3 w-3" />
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="h-5 px-1">
      <Pencil className="h-3 w-3" />
    </Badge>
  );
}
```

### 5.2 InlineCreateModal

```tsx
// src/features/directories/components/InlineCreate/InlineCreateModal.tsx

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useCreateEntry } from "../../hooks/useEntries";
import {
  Directory,
  DirectoryEntry,
  FieldType,
} from "../../types/directory.types";
import { useLocalizedField } from "../../hooks/useLocalized";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

interface InlineCreateModalProps {
  directory: Directory;
  initialName: string;
  onCreated: (entry: DirectoryEntry) => void;
  onClose: () => void;
}

export function InlineCreateModal({
  directory,
  initialName,
  onCreated,
  onClose,
}: InlineCreateModalProps) {
  const [error, setError] = useState<string | null>(null);
  const createEntry = useCreateEntry(directory.id);

  // Get required fields
  const requiredFields = directory.fields.filter(
    (f) => f.is_required && f.name !== "name",
  );
  const hasRequiredFields = requiredFields.length > 0;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: initialName,
      code: "",
      description: "",
      data: {} as Record<string, any>,
    },
  });

  const onSubmit = async (values: any) => {
    try {
      setError(null);
      const entry = await createEntry.mutateAsync({
        name: values.name,
        code: values.code || undefined,
        description: values.description || undefined,
        data: values.data,
      });
      onCreated(entry);
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.[0]?.message || "Ошибка при создании",
      );
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить в «{directory.name}»</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Name field */}
            <div className="grid gap-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                {...register("name", { required: "Обязательное поле" })}
                autoFocus
              />
              {errors.name && (
                <span className="text-sm text-destructive">
                  {errors.name.message}
                </span>
              )}
            </div>

            {/* Code field (optional) */}
            <div className="grid gap-2">
              <Label htmlFor="code">Код</Label>
              <Input id="code" {...register("code")} />
            </div>

            {/* Required custom fields */}
            {requiredFields.map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                register={register}
                errors={errors}
              />
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Создать и выбрать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Dynamic field input based on type
function FieldInput({
  field,
  register,
  errors,
}: {
  field: any;
  register: any;
  errors: any;
}) {
  const label = useLocalizedField(field);
  const fieldName = `data.${field.name}`;
  const fieldError = errors.data?.[field.name];

  switch (field.field_type) {
    case FieldType.TEXT:
      return (
        <div className="grid gap-2">
          <Label htmlFor={field.name}>
            {label} {field.is_required && "*"}
          </Label>
          <Input
            id={field.name}
            {...register(fieldName, {
              required: field.is_required && "Обязательное поле",
            })}
          />
          {fieldError && (
            <span className="text-sm text-destructive">
              {fieldError.message}
            </span>
          )}
        </div>
      );

    case FieldType.NUMBER:
      return (
        <div className="grid gap-2">
          <Label htmlFor={field.name}>
            {label} {field.is_required && "*"}
          </Label>
          <Input
            id={field.name}
            type="number"
            {...register(fieldName, {
              required: field.is_required && "Обязательное поле",
              valueAsNumber: true,
            })}
          />
          {fieldError && (
            <span className="text-sm text-destructive">
              {fieldError.message}
            </span>
          )}
        </div>
      );

    case FieldType.BOOLEAN:
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={field.name}
            {...register(fieldName)}
            className="h-4 w-4"
          />
          <Label htmlFor={field.name}>{label}</Label>
        </div>
      );

    // For SELECT types, we'd need another DirectorySelect
    // Simplified version here
    default:
      return null;
  }
}
```

### 5.3 EntryList (Table View)

```tsx
// src/features/directories/components/EntryList/EntryList.tsx

import React, { useState, useMemo } from "react";
import { useEntries, useArchiveEntry } from "../../hooks/useEntries";
import { useDirectory } from "../../hooks/useDirectory";
import { useLocalized } from "../../hooks/useLocalized";
import {
  DirectoryEntry,
  EntryStatus,
  EntryOrigin,
} from "../../types/directory.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  Pencil,
  MoreHorizontal,
  Archive,
  Edit,
  Eye,
  Search,
  AlertTriangle,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface EntryListProps {
  directoryId: string;
  onEdit?: (entry: DirectoryEntry) => void;
  onView?: (entry: DirectoryEntry) => void;
}

export function EntryList({ directoryId, onEdit, onView }: EntryListProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: directory } = useDirectory(directoryId);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useEntries({ directoryId, status: "ACTIVE" });

  const archiveEntry = useArchiveEntry(directoryId);

  // Flatten pages
  const entries = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  // Filter by search
  const filteredEntries = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) || e.code?.toLowerCase().includes(q),
    );
  }, [entries, search]);

  // Get visible columns from directory fields
  const visibleFields = useMemo(() => {
    return directory?.fields.filter((f) => f.show_in_list) || [];
  }, [directory]);

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  // Archive handler
  const handleArchive = async (entry: DirectoryEntry) => {
    if (entry.origin === EntryOrigin.OFFICIAL) {
      alert("Нельзя архивировать OFFICIAL записи");
      return;
    }
    if (confirm(`Архивировать "${entry.name}"?`)) {
      await archiveEntry.mutateAsync(entry.id);
    }
  };

  if (isLoading) {
    return <EntryListSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[300px] pl-8"
            />
          </div>
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              Выбрано: {selectedIds.size}
            </span>
          )}
        </div>

        {selectedIds.size > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Действия</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Изменить категорию</DropdownMenuItem>
              <DropdownMenuItem>Добавить теги</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Архивировать
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedIds.size === filteredEntries.length &&
                    filteredEntries.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Код</TableHead>
              <TableHead>Происхождение</TableHead>
              {visibleFields.map((field) => (
                <TableHead key={field.id}>{field.display_name}</TableHead>
              ))}
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                visibleFields={visibleFields}
                selected={selectedIds.has(entry.id)}
                onSelect={(checked) => handleSelectOne(entry.id, checked)}
                onEdit={onEdit}
                onView={onView}
                onArchive={() => handleArchive(entry)}
              />
            ))}

            {filteredEntries.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4 + visibleFields.length}
                  className="text-center py-8"
                >
                  Записи не найдены
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load more */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Загрузка..." : "Загрузить ещё"}
          </Button>
        </div>
      )}
    </div>
  );
}

// Entry row component
function EntryRow({
  entry,
  visibleFields,
  selected,
  onSelect,
  onEdit,
  onView,
  onArchive,
}: {
  entry: DirectoryEntry;
  visibleFields: any[];
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit?: (entry: DirectoryEntry) => void;
  onView?: (entry: DirectoryEntry) => void;
  onArchive: () => void;
}) {
  const name = useLocalized(entry);
  const isOfficial = entry.origin === EntryOrigin.OFFICIAL;
  const isDeprecated = entry.status === EntryStatus.DEPRECATED;

  return (
    <TableRow className={isDeprecated ? "opacity-60" : ""}>
      <TableCell>
        <Checkbox checked={selected} onCheckedChange={onSelect} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {isOfficial ? (
            <Shield className="h-4 w-4 text-blue-500" />
          ) : (
            <Pencil className="h-4 w-4 text-gray-400" />
          )}
          <span>{name}</span>
          {isDeprecated && (
            <Badge variant="outline" className="text-orange-500">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Устарел
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>{entry.code || "—"}</TableCell>
      <TableCell>
        <Badge variant={isOfficial ? "default" : "secondary"}>
          {isOfficial ? "Официальный" : "Локальный"}
        </Badge>
      </TableCell>
      {visibleFields.map((field) => (
        <TableCell key={field.id}>
          {renderFieldValue(entry.data[field.name], field)}
        </TableCell>
      ))}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView?.(entry)}>
              <Eye className="mr-2 h-4 w-4" />
              Просмотр
            </DropdownMenuItem>
            {!isOfficial && (
              <>
                <DropdownMenuItem onClick={() => onEdit?.(entry)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Редактировать
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onArchive}
                  className="text-destructive"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Архивировать
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// Render field value based on type
function renderFieldValue(value: any, field: any): React.ReactNode {
  if (value === undefined || value === null) {
    return "—";
  }

  switch (field.field_type) {
    case "BOOLEAN":
      return value ? "Да" : "Нет";
    case "NUMBER":
      return typeof value === "number" ? value.toLocaleString() : value;
    case "DATE":
      return new Date(value).toLocaleDateString();
    case "DATETIME":
      return new Date(value).toLocaleString();
    default:
      return String(value);
  }
}

// Skeleton loader
function EntryListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-[300px]" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
```

---

## 6. Store (Zustand)

```typescript
// src/features/directories/store/directory.store.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Directory, DirectoryEntry } from "../types/directory.types";

interface DirectoryCache {
  directory: Directory;
  entries: DirectoryEntry[];
  updatedAt: string;
}

interface DirectoryStore {
  // Cache
  cache: Record<string, DirectoryCache>;
  setCache: (directoryId: string, data: DirectoryCache) => void;
  getCache: (directoryId: string) => DirectoryCache | null;
  invalidateCache: (directoryId: string) => void;
  clearCache: () => void;

  // Offline queue
  pendingChanges: Array<{
    id: string;
    directoryId: string;
    entryId?: string;
    action: "create" | "update" | "delete";
    data: any;
    createdAt: string;
  }>;
  addPendingChange: (
    change: Omit<DirectoryStore["pendingChanges"][0], "id" | "createdAt">,
  ) => void;
  removePendingChange: (id: string) => void;
  clearPendingChanges: () => void;

  // UI state
  selectedDirectoryId: string | null;
  setSelectedDirectoryId: (id: string | null) => void;
}

export const useDirectoryStore = create<DirectoryStore>()(
  persist(
    (set, get) => ({
      // Cache
      cache: {},
      setCache: (directoryId, data) =>
        set((state) => ({
          cache: { ...state.cache, [directoryId]: data },
        })),
      getCache: (directoryId) => get().cache[directoryId] || null,
      invalidateCache: (directoryId) =>
        set((state) => {
          const { [directoryId]: _, ...rest } = state.cache;
          return { cache: rest };
        }),
      clearCache: () => set({ cache: {} }),

      // Offline queue
      pendingChanges: [],
      addPendingChange: (change) =>
        set((state) => ({
          pendingChanges: [
            ...state.pendingChanges,
            {
              ...change,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      removePendingChange: (id) =>
        set((state) => ({
          pendingChanges: state.pendingChanges.filter((c) => c.id !== id),
        })),
      clearPendingChanges: () => set({ pendingChanges: [] }),

      // UI state
      selectedDirectoryId: null,
      setSelectedDirectoryId: (id) => set({ selectedDirectoryId: id }),
    }),
    {
      name: "directory-store",
      partialize: (state) => ({
        cache: state.cache,
        pendingChanges: state.pendingChanges,
      }),
    },
  ),
);
```

---

**Конец Appendix F**
