# VendHub OS - Directories Frontend Implementation

**Статус Backend:** ✅ 100% ГОТОВ (directory.entity.ts, field, entry, source, sync-log)
**Задача:** Создать Frontend UI для модуля Directories (справочники)

---

## 📁 СТРУКТУРА ФАЙЛОВ ДЛЯ СОЗДАНИЯ

```
apps/web/src/
├── pages/directories/
│   ├── index.tsx                    # Список справочников
│   ├── [slug]/index.tsx             # Записи справочника
│   ├── [slug]/[entryId].tsx         # Детали/редактирование записи
│   └── builder/index.tsx            # Конструктор справочников
├── components/directories/
│   ├── DirectoryCard.tsx            # Карточка справочника
│   ├── DirectoryGrid.tsx            # Сетка справочников
│   ├── EntryTable.tsx               # Таблица записей
│   ├── EntryForm.tsx                # Форма записи (динамическая)
│   ├── FieldRenderer.tsx            # Рендер полей по типу
│   ├── FieldEditor.tsx              # Редактор полей
│   ├── HierarchyTree.tsx            # Дерево для иерархических
│   ├── SyncStatusBadge.tsx          # Статус синхронизации
│   └── DirectoryBuilder.tsx         # Конструктор справочника
├── hooks/
│   └── useDirectories.ts            # React Query hooks
└── lib/
    └── directories-api.ts           # API клиент
```

---

## 🗃️ СУЩЕСТВУЮЩИЕ BACKEND ТИПЫ

### Из directory.entity.ts:

```typescript
// Directory Types
enum DirectoryType {
  MANUAL = 'MANUAL',      // Ручной ввод
  EXTERNAL = 'EXTERNAL',  // Внешний источник
  PARAM = 'PARAM',        // Параметры системы
  TEMPLATE = 'TEMPLATE',  // Шаблоны
}

// Directory Scope
enum DirectoryScope {
  HQ = 'HQ',                      // Глобальный (вся сеть)
  ORGANIZATION = 'ORGANIZATION', // Уровень организации
  LOCATION = 'LOCATION',         // Уровень локации
}

// Field Types (12 типов!)
enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  BOOLEAN = 'BOOLEAN',
  SELECT_SINGLE = 'SELECT_SINGLE',
  SELECT_MULTI = 'SELECT_MULTI',
  REF = 'REF',          // Ссылка на другой справочник
  JSON = 'JSON',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
}

// Entry Origin
enum EntryOrigin {
  OFFICIAL = 'OFFICIAL',  // Из внешнего источника
  LOCAL = 'LOCAL',        // Локальное добавление
}

// Entry Status
enum EntryStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}
```

---

## 📄 1. DIRECTORIES LIST PAGE

**Файл:** `apps/web/src/pages/directories/index.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Database,
  Plus,
  Search,
  Settings,
  FolderTree,
  Globe,
  Building,
  MapPin,
  ExternalLink,
  FileText,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { directoriesApi } from '@/lib/directories-api';

const scopeIcons = {
  HQ: Globe,
  ORGANIZATION: Building,
  LOCATION: MapPin,
};

const typeColors = {
  MANUAL: 'bg-blue-500',
  EXTERNAL: 'bg-purple-500',
  PARAM: 'bg-orange-500',
  TEMPLATE: 'bg-green-500',
};

const typeLabels = {
  MANUAL: 'Ручной',
  EXTERNAL: 'Внешний',
  PARAM: 'Параметры',
  TEMPLATE: 'Шаблон',
};

export default function DirectoriesListPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<string>('');

  const { data: directories, isLoading } = useQuery({
    queryKey: ['directories', { search, type: typeFilter, scope: scopeFilter }],
    queryFn: () => directoriesApi.listDirectories({ search, type: typeFilter, scope: scopeFilter }),
  });

  const filteredDirectories = directories || [];

  // Group by type
  const systemDirectories = filteredDirectories.filter(d => d.isSystem);
  const customDirectories = filteredDirectories.filter(d => !d.isSystem);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Справочники (MDM)
          </h1>
          <p className="text-muted-foreground">
            Управление справочными данными системы
          </p>
        </div>
        <Link href="/directories/builder">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Создать справочник
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Тип справочника" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все типы</SelectItem>
                <SelectItem value="MANUAL">Ручные</SelectItem>
                <SelectItem value="EXTERNAL">Внешние</SelectItem>
                <SelectItem value="PARAM">Параметры</SelectItem>
                <SelectItem value="TEMPLATE">Шаблоны</SelectItem>
              </SelectContent>
            </Select>

            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Область видимости" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все области</SelectItem>
                <SelectItem value="HQ">Глобальные (HQ)</SelectItem>
                <SelectItem value="ORGANIZATION">Организация</SelectItem>
                <SelectItem value="LOCATION">Локация</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* System Directories */}
      {systemDirectories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Системные справочники
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {systemDirectories.map((directory) => (
              <DirectoryCard key={directory.id} directory={directory} />
            ))}
          </div>
        </div>
      )}

      {/* Custom Directories */}
      {customDirectories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Пользовательские справочники
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {customDirectories.map((directory) => (
              <DirectoryCard key={directory.id} directory={directory} />
            ))}
          </div>
        </div>
      )}

      {filteredDirectories.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Справочники не найдены</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Directory Card Component
function DirectoryCard({ directory }: { directory: Directory }) {
  const ScopeIcon = scopeIcons[directory.scope];

  return (
    <Link href={`/directories/${directory.slug}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {directory.icon ? (
                <span className="text-2xl">{directory.icon}</span>
              ) : (
                <Database className="w-5 h-5 text-muted-foreground" />
              )}
              <CardTitle className="text-base">{directory.name}</CardTitle>
            </div>
            <Badge className={typeColors[directory.type]} variant="secondary">
              {typeLabels[directory.type]}
            </Badge>
          </div>
          {directory.description && (
            <CardDescription className="line-clamp-2">
              {directory.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ScopeIcon className="w-4 h-4" />
              <span>{directory.scope}</span>
            </div>
            <div className="flex items-center gap-2">
              {directory.isHierarchical && (
                <FolderTree className="w-4 h-4 text-muted-foreground" title="Иерархический" />
              )}
              {directory.type === 'EXTERNAL' && (
                <ExternalLink className="w-4 h-4 text-muted-foreground" title="Внешний источник" />
              )}
              <Badge variant="outline">{directory._count?.entries || 0} записей</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

---

## 📄 2. DIRECTORY ENTRIES PAGE

**Файл:** `apps/web/src/pages/directories/[slug]/index.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
  CheckCircle,
  Clock,
  AlertCircle,
  Globe,
  User,
  ChevronRight,
  FolderTree,
} from 'lucide-react';
import Link from 'next/link';
import { directoriesApi, Directory, DirectoryEntry, DirectoryField } from '@/lib/directories-api';
import { EntryForm } from '@/components/directories/EntryForm';
import { FieldRenderer } from '@/components/directories/FieldRenderer';
import { HierarchyTree } from '@/components/directories/HierarchyTree';

const statusColors = {
  DRAFT: 'bg-gray-500',
  PENDING_APPROVAL: 'bg-yellow-500',
  ACTIVE: 'bg-green-500',
  DEPRECATED: 'bg-orange-500',
  ARCHIVED: 'bg-red-500',
};

const statusLabels = {
  DRAFT: 'Черновик',
  PENDING_APPROVAL: 'На проверке',
  ACTIVE: 'Активно',
  DEPRECATED: 'Устарело',
  ARCHIVED: 'В архиве',
};

const originIcons = {
  OFFICIAL: Globe,
  LOCAL: User,
};

export default function DirectoryEntriesPage() {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DirectoryEntry | null>(null);

  const { data: directory, isLoading } = useQuery({
    queryKey: ['directory', slug],
    queryFn: () => directoriesApi.getDirectoryBySlug(slug as string),
  });

  const { data: entries } = useQuery({
    queryKey: ['directory-entries', slug, { search, status: statusFilter }],
    queryFn: () => directoriesApi.listEntries(slug as string, { search, status: statusFilter }),
    enabled: !!directory,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<DirectoryEntry>) =>
      directoriesApi.createEntry(directory!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory-entries', slug] });
      setIsCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: Partial<DirectoryEntry> }) =>
      directoriesApi.updateEntry(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory-entries', slug] });
      setEditingEntry(null);
    },
  });

  if (isLoading || !directory) {
    return <div>Загрузка...</div>;
  }

  const visibleFields = directory.fields?.filter(f => f.showInList) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/directories" className="hover:text-primary">
              Справочники
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span>{directory.name}</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {directory.icon && <span className="text-2xl">{directory.icon}</span>}
            {directory.name}
            {directory.isHierarchical && (
              <FolderTree className="w-5 h-5 text-muted-foreground" />
            )}
          </h1>
          {directory.description && (
            <p className="text-muted-foreground mt-1">{directory.description}</p>
          )}
        </div>
        
        {directory.settings?.allow_inline_create && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Добавить запись
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Новая запись</DialogTitle>
              </DialogHeader>
              <EntryForm
                fields={directory.fields || []}
                isHierarchical={directory.isHierarchical}
                entries={entries || []}
                onSubmit={(data) => createMutation.mutate(data)}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или коду..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              {Object.entries(statusLabels).map(([status, label]) => (
                <Badge
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  className={`cursor-pointer ${statusFilter === status ? statusColors[status] : ''}`}
                  onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hierarchical View or Table */}
      {directory.isHierarchical ? (
        <Card>
          <CardContent className="pt-6">
            <HierarchyTree
              entries={entries || []}
              fields={visibleFields}
              onEdit={setEditingEntry}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Код</TableHead>
                  {visibleFields.map((field) => (
                    <TableHead key={field.id}>{field.displayName}</TableHead>
                  ))}
                  <TableHead>Источник</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries?.map((entry) => {
                  const OriginIcon = originIcons[entry.origin];
                  
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1 rounded">
                          {entry.code || '-'}
                        </code>
                      </TableCell>
                      {visibleFields.map((field) => (
                        <TableCell key={field.id}>
                          <FieldRenderer
                            field={field}
                            value={entry.data?.[field.name]}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <OriginIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {entry.origin === 'OFFICIAL' ? 'Офиц.' : 'Лок.'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[entry.status]}>
                          {statusLabels[entry.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingEntry(entry)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Archive className="w-4 h-4 mr-2" />
                              Архивировать
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editingEntry && (
        <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Редактирование: {editingEntry.name}</DialogTitle>
            </DialogHeader>
            <EntryForm
              fields={directory.fields || []}
              isHierarchical={directory.isHierarchical}
              entries={entries || []}
              initialData={editingEntry}
              onSubmit={(data) => updateMutation.mutate({ entryId: editingEntry.id, data })}
              isLoading={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
```

---

## 📄 3. DYNAMIC ENTRY FORM

**Файл:** `apps/web/src/components/directories/EntryForm.tsx`

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DirectoryField, DirectoryEntry } from '@/lib/directories-api';

interface EntryFormProps {
  fields: DirectoryField[];
  isHierarchical: boolean;
  entries: DirectoryEntry[];
  initialData?: DirectoryEntry;
  onSubmit: (data: Partial<DirectoryEntry>) => void;
  isLoading: boolean;
}

export function EntryForm({
  fields,
  isHierarchical,
  entries,
  initialData,
  onSubmit,
  isLoading,
}: EntryFormProps) {
  // Build dynamic schema based on fields
  const schemaShape: Record<string, z.ZodTypeAny> = {
    name: z.string().min(1, 'Название обязательно'),
    code: z.string().optional(),
    description: z.string().optional(),
  };

  if (isHierarchical) {
    schemaShape.parentId = z.string().optional();
  }

  // Add field-specific validation
  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;

    switch (field.fieldType) {
      case 'TEXT':
        fieldSchema = z.string();
        if (field.validationRules?.minLength) {
          fieldSchema = (fieldSchema as z.ZodString).min(field.validationRules.minLength);
        }
        if (field.validationRules?.maxLength) {
          fieldSchema = (fieldSchema as z.ZodString).max(field.validationRules.maxLength);
        }
        break;
      case 'NUMBER':
        fieldSchema = z.number();
        if (field.validationRules?.min !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).min(field.validationRules.min);
        }
        if (field.validationRules?.max !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).max(field.validationRules.max);
        }
        break;
      case 'BOOLEAN':
        fieldSchema = z.boolean();
        break;
      case 'DATE':
      case 'DATETIME':
        fieldSchema = z.date();
        break;
      case 'SELECT_SINGLE':
      case 'REF':
        fieldSchema = z.string();
        break;
      case 'SELECT_MULTI':
        fieldSchema = z.array(z.string());
        break;
      default:
        fieldSchema = z.any();
    }

    if (!field.isRequired) {
      fieldSchema = fieldSchema.optional().nullable();
    }

    schemaShape[`data.${field.name}`] = fieldSchema;
  });

  const schema = z.object(schemaShape);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      description: initialData?.description || '',
      parentId: initialData?.parentId || '',
      ...Object.fromEntries(
        fields.map((f) => [`data.${f.name}`, initialData?.data?.[f.name] ?? f.defaultValue ?? null])
      ),
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    const data: Record<string, unknown> = {};
    Object.entries(values).forEach(([key, value]) => {
      if (key.startsWith('data.')) {
        const fieldName = key.replace('data.', '');
        if (!data.data) data.data = {};
        (data.data as Record<string, unknown>)[fieldName] = value;
      } else {
        data[key] = value;
      }
    });
    onSubmit(data as Partial<DirectoryEntry>);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core fields */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Название *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Код</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Описание</FormLabel>
              <FormControl>
                <Textarea {...field} rows={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Parent selector for hierarchical */}
        {isHierarchical && (
          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Родительский элемент</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите родителя (или оставьте пустым)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Корневой элемент</SelectItem>
                    {entries
                      .filter((e) => e.id !== initialData?.id)
                      .map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Dynamic fields */}
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium mb-4">Дополнительные поля</h4>
          <div className="grid grid-cols-2 gap-4">
            {fields
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((field) => (
                <DynamicField key={field.id} field={field} form={form} entries={entries} />
              ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {initialData ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Dynamic field component
function DynamicField({
  field,
  form,
  entries,
}: {
  field: DirectoryField;
  form: any;
  entries: DirectoryEntry[];
}) {
  const fieldName = `data.${field.name}`;

  switch (field.fieldType) {
    case 'TEXT':
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.displayName}
                {field.isRequired && ' *'}
              </FormLabel>
              <FormControl>
                <Input {...formField} />
              </FormControl>
              {field.description && (
                <FormDescription>{field.description}</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case 'NUMBER':
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.displayName}
                {field.isRequired && ' *'}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...formField}
                  onChange={(e) => formField.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case 'BOOLEAN':
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel>{field.displayName}</FormLabel>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
              </div>
              <FormControl>
                <Switch
                  checked={formField.value}
                  onCheckedChange={formField.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      );

    case 'DATE':
    case 'DATETIME':
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>{field.displayName}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formField.value
                        ? format(new Date(formField.value), 'PPP', { locale: ru })
                        : 'Выберите дату'}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formField.value ? new Date(formField.value) : undefined}
                    onSelect={formField.onChange}
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case 'SELECT_SINGLE':
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>{field.displayName}</FormLabel>
              <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {field.validationRules?.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case 'REF':
      // For REF type, we'd need to fetch the referenced directory's entries
      // This is simplified - in production you'd fetch refDirectoryId entries
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>{field.displayName}</FormLabel>
              <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите из справочника..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* Would be populated from refDirectoryId */}
                  <SelectItem value="">Загрузка...</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    default:
      return null;
  }
}
```

---

## ⏱️ ОЦЕНКА ВРЕМЕНИ

| Компонент | Часы |
|-----------|------|
| DirectoriesListPage | 3 |
| DirectoryEntriesPage | 5 |
| EntryForm (dynamic) | 4 |
| FieldRenderer | 2 |
| HierarchyTree | 3 |
| API Client + Hooks | 2 |
| **ИТОГО** | **19** |

---

*Этот промпт фокусируется только на Frontend, т.к. Backend уже 100% готов*
