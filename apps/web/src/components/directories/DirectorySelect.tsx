'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { directoriesApi } from '@/lib/api';
import { toast } from 'sonner';

interface DirectoryEntry {
  id: string;
  name: string;
  code: string | null;
  origin: 'OFFICIAL' | 'LOCAL';
  status: string;
  data: Record<string, unknown>;
}

interface DirectorySelectProps {
  directorySlug: string;
  value: string | null;
  onChange: (id: string | null, entry?: DirectoryEntry) => void;
  placeholder?: string;
  disabled?: boolean;
  allowInlineCreate?: boolean;
  className?: string;
  error?: string;
}

export function DirectorySelect({
  directorySlug,
  value,
  onChange,
  placeholder = 'Выберите...',
  disabled = false,
  allowInlineCreate = true,
  className,
  error,
}: DirectorySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newEntryName, setNewEntryName] = React.useState('');
  const [newEntryCode, setNewEntryCode] = React.useState('');
  const queryClient = useQueryClient();

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch directory by slug
  const { data: directoryData } = useQuery({
    queryKey: ['directory', directorySlug],
    queryFn: () => directoriesApi.getBySlug(directorySlug),
    staleTime: 5 * 60 * 1000,
  });

  const directory = directoryData?.data;
  const directoryId = directory?.id;

  // Search entries
  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ['directory-entries-search', directoryId, debouncedSearch],
    queryFn: () =>
      debouncedSearch
        ? directoriesApi.searchEntries(directoryId!, { q: debouncedSearch, limit: 50 })
        : directoriesApi.getEntries(directoryId!, { limit: 50, status: 'ACTIVE' }),
    enabled: !!directoryId && open,
    staleTime: 30 * 1000,
  });

  const entries: DirectoryEntry[] = searchData?.data?.data ?? searchData?.data ?? [];

  // Get selected entry details
  const { data: selectedEntryData } = useQuery({
    queryKey: ['directory-entry', directoryId, value],
    queryFn: () => directoriesApi.getEntry(directoryId!, value!),
    enabled: !!directoryId && !!value,
    staleTime: 5 * 60 * 1000,
  });

  const selectedEntry: DirectoryEntry | null = selectedEntryData?.data ?? null;

  // Inline create mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; code?: string }) =>
      directoriesApi.inlineCreateEntry(directoryId!, data),
    onSuccess: (response) => {
      const created = response.data;
      queryClient.invalidateQueries({ queryKey: ['directory-entries-search', directoryId] });
      onChange(created.id, created);
      setCreateDialogOpen(false);
      setNewEntryName('');
      setNewEntryCode('');
      toast.success('Запись создана');
    },
    onError: () => {
      toast.error('Не удалось создать запись');
    },
  });

  const handleSelect = (entryId: string) => {
    if (entryId === value) {
      onChange(null);
    } else {
      const entry = entries.find((e) => e.id === entryId);
      onChange(entryId, entry);
    }
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryName.trim()) return;
    createMutation.mutate({
      name: newEntryName.trim(),
      code: newEntryCode.trim() || undefined,
    });
  };

  const canInlineCreate =
    allowInlineCreate &&
    directory?.settings?.allow_inline_create !== false;

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground',
              error && 'border-destructive'
            )}
          >
            <span className="truncate">
              {selectedEntry
                ? `${selectedEntry.name}${selectedEntry.code ? ` (${selectedEntry.code})` : ''}`
                : placeholder}
            </span>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {value && !disabled && (
                <X
                  className="h-3 w-3 opacity-50 hover:opacity-100"
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Поиск..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isSearching ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : entries.length === 0 ? (
                <CommandEmpty>Ничего не найдено</CommandEmpty>
              ) : (
                <CommandGroup>
                  {entries.map((entry) => (
                    <CommandItem
                      key={entry.id}
                      value={entry.id}
                      onSelect={handleSelect}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === entry.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="truncate">{entry.name}</span>
                        {entry.code && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {entry.code}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={entry.origin === 'OFFICIAL' ? 'default' : 'secondary'}
                        className="text-[10px] px-1 py-0 ml-1 shrink-0"
                      >
                        {entry.origin === 'OFFICIAL' ? 'ОФ' : 'ЛОК'}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {canInlineCreate && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setCreateDialogOpen(true);
                        setNewEntryName(search);
                        setOpen(false);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Создать новую запись
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать запись</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entry-name">Название *</Label>
              <Input
                id="entry-name"
                value={newEntryName}
                onChange={(e) => setNewEntryName(e.target.value)}
                placeholder="Введите название"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-code">Код</Label>
              <Input
                id="entry-code"
                value={newEntryCode}
                onChange={(e) => setNewEntryCode(e.target.value)}
                placeholder="Введите код (опционально)"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={!newEntryName.trim() || createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Создать
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
