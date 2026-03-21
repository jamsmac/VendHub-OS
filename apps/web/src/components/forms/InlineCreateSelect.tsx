/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * InlineCreateSelect — Universal combobox with inline entity creation.
 * Based on DirectorySelect pattern but generalized for any API endpoint.
 *
 * Usage:
 *   <InlineCreateSelect
 *     endpoint="/counterparties"
 *     value={supplierId}
 *     onChange={(id) => setSupplierId(id)}
 *     displayField="name"
 *     searchParam="search"
 *     placeholder="Выберите поставщика..."
 *     createFields={[
 *       { name: "name", label: "Название", required: true },
 *       { name: "inn", label: "ИНН" },
 *     ]}
 *   />
 */

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface CreateField {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "tel";
  required?: boolean;
  placeholder?: string;
}

interface InlineCreateSelectProps {
  /** API endpoint path (e.g., "/counterparties", "/locations") */
  endpoint: string;
  /** Current selected ID */
  value: string | null;
  /** Callback when selection changes */
  onChange: (id: string | null, item?: any) => void;
  /** Field to display in the dropdown (default: "name") */
  displayField?: string;
  /** Secondary field to show as subtitle */
  secondaryField?: string;
  /** Query parameter name for search (default: "search") */
  searchParam?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Disable the select */
  disabled?: boolean;
  /** Allow creating new entries inline */
  allowCreate?: boolean;
  /** Fields for the inline create dialog */
  createFields?: CreateField[];
  /** Label for create button (default: "+ Создать") */
  createLabel?: string;
  /** Extra CSS class */
  className?: string;
  /** Error message */
  error?: string;
}

// ============================================================================
// Component
// ============================================================================

export function InlineCreateSelect({
  endpoint,
  value,
  onChange,
  displayField = "name",
  secondaryField,
  searchParam = "search",
  placeholder = "Выберите...",
  disabled = false,
  allowCreate = true,
  createFields = [{ name: "name", label: "Название", required: true }],
  createLabel = "+ Создать",
  className,
  error,
}: InlineCreateSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<Record<string, string>>(
    {},
  );
  const queryClient = useQueryClient();

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inline-select", endpoint, debouncedSearch],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params[searchParam] = debouncedSearch;
      const res = await api.get(endpoint, { params });
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : [];
    },
    enabled: open,
  });

  // Fetch selected item display name
  const { data: selectedItem } = useQuery({
    queryKey: ["inline-select", endpoint, "item", value],
    queryFn: async () => {
      const res = await api.get(`${endpoint}/${value}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!value,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await api.post(endpoint, data);
      return res.data?.data ?? res.data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: ["inline-select", endpoint],
      });
      onChange(created.id, created);
      setCreateOpen(false);
      setCreateForm({});
      toast.success("Создано");
    },
    onError: () => {
      toast.error("Ошибка создания");
    },
  });

  const handleCreate = () => {
    const required = createFields.filter((f) => f.required);
    const missing = required.filter((f) => !createForm[f.name]?.trim());
    if (missing.length > 0) {
      toast.error(`Заполните: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    createMutation.mutate(createForm);
  };

  const displayValue = selectedItem?.[displayField] || null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              !displayValue && "text-muted-foreground",
              error && "border-red-500",
              className,
            )}
          >
            <span className="truncate">{displayValue || placeholder}</span>
            <div className="flex items-center gap-1 shrink-0">
              {value && (
                <X
                  className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Поиск..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <CommandEmpty>Не найдено</CommandEmpty>
              ) : (
                <CommandGroup>
                  {items.map((item: any) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => {
                        onChange(item.id, item);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === item.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="truncate">{item[displayField]}</span>
                        {secondaryField && item[secondaryField] && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {item[secondaryField]}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Inline Create */}
              {allowCreate && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setCreateOpen(true);
                        setOpen(false);
                        // Pre-fill name from search
                        if (search) {
                          setCreateForm({ name: search });
                        }
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {createLabel}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Быстрое создание</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {createFields.map((field) => (
              <div key={field.name}>
                <Label>
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-0.5">*</span>
                  )}
                </Label>
                <Input
                  type={field.type || "text"}
                  placeholder={field.placeholder || field.label}
                  value={createForm[field.name] || ""}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      [field.name]: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
