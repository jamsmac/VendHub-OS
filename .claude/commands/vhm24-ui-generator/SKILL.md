---
name: vhm24-ui-generator
description: |
  VendHub React UI Generator - создаёт React компоненты для админ-панели и PWA.
  Генерирует страницы, формы, таблицы с shadcn/ui, React Query, React Hook Form.
  Использовать при создании новых экранов, компонентов, интерфейсов.
---

# VHM24 UI Generator

Генерация React/TypeScript экранов для VendHub OS по дизайн-системе "Warm Brew".

## Предварительные требования

**Перед генерацией кода ОБЯЗАТЕЛЬНО:**
1. Использовать `vhm24-ux-spec` для создания спецификации
2. Получить утверждение спецификации
3. Только потом генерировать код

```
vhm24-ux-spec (спецификация) -> [Утверждение] -> vhm24-ui-generator (код)
```

## Стек технологий

| Слой | Технология | Версия |
|------|-----------|--------|
| Админ-панель | Next.js (App Router) | 16 |
| Клиентское PWA | Vite + React | 19 |
| UI-компоненты | shadcn/ui + Radix UI | latest |
| Стилизация | TailwindCSS | 3.4 |
| Состояние | Zustand | 5 |
| Формы | React Hook Form + Zod | 7.61 |
| Таблицы | @tanstack/react-table | 8 |
| HTTP-клиент | Axios (REST -> NestJS api/v1/*) | latest |
| Иконки | Lucide React | latest |
| Уведомления | Sonner | latest |
| Графики | Recharts | latest |
| Авторизация | Telegram WebApp, Cookies | - |

## Шаблон страницы админ-панели (Next.js App Router)

**ВАЖНО:** Актуальный паттерн — `"use client"` page.tsx с React Query (`@tanstack/react-query`), а НЕ серверные компоненты с Zustand stores. Все страницы — клиентские. Данные загружаются через `api` (Axios) из `@/lib/api`.

### Клиентская страница (page.tsx)

```tsx
// app/dashboard/machines/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Coffee, Loader2 } from "lucide-react";
import { machinesApi } from "@/lib/api";
import Link from "next/link";
import { toast } from "sonner";

export default function MachinesPage() {
  // React Query для загрузки данных — кэширование, рефетч, stale/fresh
  const { data: machines = [], isLoading, error } = useQuery({
    queryKey: ["machines"],
    queryFn: () => machinesApi.getAll(),
  });

  const { data: stats } = useQuery({
    queryKey: ["machines", "stats"],
    queryFn: () => machinesApi.getStats(),
  });

  if (error) toast.error("Ошибка загрузки автоматов");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Автоматы</h1>
        <Link href="/dashboard/machines/new">
          <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Добавить</Button>
        </Link>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Всего" value={stats?.total ?? 0} icon={<Coffee className="h-5 w-5" />} />
      </div>

      {/* Список — DataTable или карточки */}
      {isLoading ? <Loader2 className="animate-spin" /> : (
        <Card>
          <CardContent>{/* DataTable с machines */}</CardContent>
        </Card>
      )}
    </div>
  );
}
```

### API клиент (паттерн)

```tsx
// lib/api.ts — типичная структура API для модуля
export const machinesApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/machines", { params }).then(unwrap),
  getById: (id: string) => api.get(`/machines/${id}`).then(unwrap),
  getStats: () => api.get("/machines/stats").then(unwrap),
  getState: (id: string) => api.get(`/machines/${id}/state`).then(unwrap),
  create: (data: Record<string, unknown>) => api.post("/machines", data).then(unwrap),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/machines/${id}`, data).then(unwrap),
};
```

**НЕ ИСПОЛЬЗУЙ:** `useMachinesStore`, `@/stores/`, серверные компоненты с `async function`, `getServerSideProps`.

### Компонент StatCard

```tsx
// components/shared/stat-card.tsx
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ title, value, change, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {change !== undefined && (
              <span
                className={cn(
                  "text-sm",
                  trend === "up" && "text-green-600 dark:text-green-400",
                  trend === "down" && "text-red-600 dark:text-red-400",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {change > 0 ? "+" : ""}
                {change}%
              </span>
            )}
          </div>
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Паттерн таблицы данных (@tanstack/react-table + shadcn DataTable)

### Определение колонок

```tsx
// app/dashboard/machines/_components/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUZS } from "@/lib/formatters";
import type { Machine } from "@/types/machine";

// Конфигурация статусов
const statusConfig: Record<string, { label: string; variant: string }> = {
  online: { label: "Онлайн", variant: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  offline: { label: "Офлайн", variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  maintenance: { label: "На ТО", variant: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  pending: { label: "Ожидает", variant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

export const columns: ColumnDef<Machine>[] = [
  {
    accessorKey: "name",
    header: "Название",
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.getValue("name")}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const config = statusConfig[status] ?? statusConfig.pending;
      return (
        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", config.variant)}>
          {config.label}
        </span>
      );
    },
    // Фильтрация по статусу
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "revenue",
    header: "Выручка",
    cell: ({ row }) => formatUZS(row.getValue("revenue")),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Действия</span>,
    cell: ({ row }) => {
      const machine = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Действия</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 dark:text-red-400">
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
```

### Компонент DataTable

```tsx
// components/shared/data-table.tsx
"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;          // Ключ колонки для поиска
  searchPlaceholder?: string;  // Плейсхолдер поля поиска
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Поиск...",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
  });

  return (
    <div className="space-y-4">
      {/* Поле поиска */}
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Таблица */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Нет данных для отображения.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Пагинация */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Показано {table.getRowModel().rows.length} из {data.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Вперёд
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Использование DataTable

```tsx
// Внутри клиентского компонента страницы
import { columns } from "./columns";
import { DataTable } from "@/components/shared/data-table";

<DataTable
  columns={columns}
  data={machines}
  searchKey="name"
  searchPlaceholder="Поиск по названию..."
/>
```

## Паттерн формы (React Hook Form + Zod + shadcn Form)

```tsx
// app/dashboard/machines/_components/machine-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Zod-схема валидации
const machineSchema = z.object({
  name: z
    .string()
    .min(2, "Название должно содержать минимум 2 символа")
    .max(100, "Название не должно превышать 100 символов"),
  serialNumber: z
    .string()
    .min(1, "Серийный номер обязателен"),
  locationId: z
    .string()
    .min(1, "Выберите локацию"),
  status: z.enum(["online", "offline", "maintenance"], {
    required_error: "Выберите статус",
  }),
});

type MachineFormValues = z.infer<typeof machineSchema>;

interface MachineFormProps {
  defaultValues?: Partial<MachineFormValues>;
  machineId?: number;
  onSuccess?: () => void;
}

export function MachineForm({ defaultValues, machineId, onSuccess }: MachineFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!machineId;

  const mutation = useMutation({
    mutationFn: (values: MachineFormValues) =>
      isEditing
        ? api.patch(`/machines/${machineId}`, values)
        : api.post("/machines", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast.success(isEditing ? "Автомат обновлён" : "Автомат создан");
      onSuccess?.();
    },
    onError: () => toast.error("Ошибка сохранения"),
  });

  const form = useForm<MachineFormValues>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      name: "",
      serialNumber: "",
      locationId: "",
      status: "offline",
      ...defaultValues,
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: MachineFormValues) {
    try {
      mutation.mutate(values);
    } catch {
      // mutation.onError handles toast
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Название */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название</FormLabel>
              <FormControl>
                <Input placeholder="Например: Автомат #12" {...field} />
              </FormControl>
              <FormDescription>Отображаемое имя автомата в системе</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Серийный номер */}
        <FormField
          control={form.control}
          name="serialNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Серийный номер</FormLabel>
              <FormControl>
                <Input placeholder="VH-XXXX-XXXX" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Статус */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Статус</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="online">Онлайн</SelectItem>
                  <SelectItem value="offline">Офлайн</SelectItem>
                  <SelectItem value="maintenance">На ТО</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Кнопки */}
        <div className="flex items-center gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Сохранить" : "Создать"}
          </Button>
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Сбросить
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

## Паттерн API-хуков (Axios + React Query)

**ВАЖНО:** Актуальный паттерн — React Query (`@tanstack/react-query`) для кэширования и рефетча, а НЕ Zustand stores для серверных данных. Zustand используется ТОЛЬКО для клиентского UI-состояния (sidebar toggle, modal state и т.п.).

### Настройка Axios

```tsx
// lib/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1",
  timeout: 15000,
  withCredentials: true,
});

// Глобальная обёртка для распаковки ответов
const unwrap = (res: { data: unknown }) => {
  const d = res?.data as Record<string, unknown>;
  return d?.data ?? d;
};

// API-модуль для конкретной сущности
export const machinesApi = {
  getAll: (params?: Record<string, unknown>) => api.get("/machines", { params }).then(unwrap),
  getById: (id: string) => api.get(`/machines/${id}`).then(unwrap),
  getStats: () => api.get("/machines/stats").then(unwrap),
  getState: (id: string) => api.get(`/machines/${id}/state`).then(unwrap),
  create: (data: Record<string, unknown>) => api.post("/machines", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/machines/${id}`, data),
  delete: (id: string) => api.delete(`/machines/${id}`),
};
```

### React Query хуки

```tsx
// Пример использования в компоненте
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { machinesApi } from "@/lib/api";

// Загрузка списка (с кэшированием)
const { data: machines = [], isLoading } = useQuery({
  queryKey: ["machines"],
  queryFn: () => machinesApi.getAll(),
});

// Загрузка по ID
const { data: machine } = useQuery({
  queryKey: ["machines", id],
  queryFn: () => machinesApi.getById(id),
  enabled: !!id,
});

// Мутация (создание/обновление)
const queryClient = useQueryClient();
const createMutation = useMutation({
  mutationFn: (data: Record<string, unknown>) => machinesApi.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["machines"] });
    toast.success("Автомат создан");
  },
  onError: () => toast.error("Ошибка создания"),
});
```

**НЕ ИСПОЛЬЗУЙ для серверных данных:** `create` from `"zustand"`, `useMachinesStore`, `@/stores/machines-store`.

## Цветовая система

```
Первичный:     amber-500  (#f59e0b) - кнопки, активные состояния, акценты
Успех:         green-500  (#10b981) - онлайн, завершено, положительный
Ошибка:        red-500    (#ef4444) - офлайн, отменено, отрицательный
Предупреждение: yellow-500 (#eab308) - ожидание, техобслуживание
Информация:    blue-500   (#3b82f6) - информация, в процессе
Фон:           gray-50 (светлая тема) / gray-900 (тёмная тема)
Текст:         gray-900 (светлая) / gray-100 (тёмная)
Приглушённый:  gray-500 (светлая) / gray-400 (тёмная)
```

Применение в компонентах:

```tsx
// Первичная кнопка - amber
<Button className="bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700">
  Действие
</Button>

// Бейджи статусов
<Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Онлайн</Badge>
<Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Офлайн</Badge>
<Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">На ТО</Badge>
<Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">В процессе</Badge>
```

## Паттерны тёмной темы

Всегда добавлять `dark:` варианты для всех цветовых классов:

```tsx
// Фоны
className="bg-white dark:bg-gray-800"
className="bg-gray-50 dark:bg-gray-900"
className="bg-gray-100 dark:bg-gray-800/50"

// Текст
className="text-gray-900 dark:text-gray-100"
className="text-gray-500 dark:text-gray-400"

// Границы
className="border-gray-200 dark:border-gray-700"

// Акцентные фоны с прозрачностью
className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"

// Карточки
className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"

// Интерактивные элементы
className="hover:bg-gray-100 dark:hover:bg-gray-700/50"

// Использование CSS-переменных shadcn/ui (предпочтительно)
className="bg-background text-foreground"
className="text-muted-foreground"
className="border-border"
className="bg-card text-card-foreground"
```

## Форматирование валюты UZS

```typescript
// lib/formatters.ts

/** Форматирование суммы в UZS */
export function formatUZS(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value) + " UZS";
}

/** Форматирование суммы в UZS (сокращённый вариант) */
export function formatUZSShort(value: number): string {
  if (value >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " млрд UZS";
  }
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + " млн UZS";
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(0) + " тыс UZS";
  }
  return formatUZS(value);
}

// Примеры:
// formatUZS(2450000)          -> "2 450 000 UZS"
// formatUZSShort(2450000)     -> "2.5 млн UZS"
// formatUZSShort(1500000000)  -> "1.5 млрд UZS"
// formatUZSShort(45000)       -> "45 тыс UZS"
```

## Паттерны состояний: загрузка, пустота, ошибка

### Состояние загрузки

```tsx
// components/shared/loading-state.tsx
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Загрузка данных..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Скелетон для карточки
export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 animate-pulse">
      <div className="h-4 w-1/3 bg-muted rounded mb-3" />
      <div className="h-8 w-1/2 bg-muted rounded mb-2" />
      <div className="h-3 w-1/4 bg-muted rounded" />
    </div>
  );
}

// Скелетон для таблицы
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-border">
          <div className="h-4 w-1/4 bg-muted rounded" />
          <div className="h-4 w-1/6 bg-muted rounded" />
          <div className="h-4 w-1/5 bg-muted rounded" />
          <div className="h-4 w-1/12 bg-muted rounded ml-auto" />
        </div>
      ))}
    </div>
  );
}
```

### Пустое состояние

```tsx
// components/shared/empty-state.tsx
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = <PackageOpen className="h-12 w-12" />,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-muted-foreground/50 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Использование:
<EmptyState
  title="Нет автоматов"
  description="Добавьте первый автомат для начала работы с системой."
  actionLabel="Добавить автомат"
  onAction={() => router.push("/machines/new")}
/>
```

### Состояние ошибки

```tsx
// components/shared/error-state.tsx
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Произошла ошибка",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" className="max-w-lg mx-auto my-8">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
            Попробовать снова
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Использование:
<ErrorState
  message="Не удалось загрузить список автоматов."
  onRetry={() => fetchMachines()}
/>
```

### Объединённый паттерн для страницы

```tsx
// Типичная обёртка контента на странице с React Query
function PageContent() {
  const router = useRouter();
  const { data: machines = [], isLoading, error, refetch } = useQuery({
    queryKey: ["machines"],
    queryFn: () => machinesApi.getAll(),
  });

  if (isLoading) return <LoadingState message="Загрузка автоматов..." />;
  if (error) return <ErrorState message="Ошибка загрузки" onRetry={() => refetch()} />;
  if (machines.length === 0) {
    return (
      <EmptyState
        title="Нет автоматов"
        description="Начните с добавления первого автомата."
        actionLabel="Добавить автомат"
        onAction={() => router.push("/dashboard/machines/new")}
      />
    );
  }

  return <DataTable columns={columns} data={machines} searchKey="name" />;
}
```

## Чек-лист перед завершением

Перед сдачей сгенерированного кода проверить:

- [ ] TypeScript с корректными интерфейсами и типами
- [ ] Используются компоненты shadcn/ui (Card, Button, Input, Select, и т.д.)
- [ ] API-вызовы через Axios к NestJS REST эндпоинтам (api/v1/*)
- [ ] Серверные данные через React Query (useQuery/useMutation), НЕ Zustand
- [ ] Формы через React Hook Form + Zod валидацию
- [ ] Таблицы через @tanstack/react-table + DataTable
- [ ] Поддержка тёмной темы (dark: префикс)
- [ ] Интерфейс на русском языке
- [ ] Валюта в формате UZS
- [ ] Иконки из Lucide React
- [ ] Уведомления через Sonner (toast.success / toast.error)
- [ ] Адаптивная сетка (md:, lg: брейкпоинты)
- [ ] Состояния загрузки (скелетоны или спиннер)
- [ ] Пустые состояния для списков
- [ ] Состояния ошибок с возможностью повтора

## Ссылки

- **Дизайн-система**: См. [references/design-system.md](references/design-system.md) - цвета, типографика
- **Паттерны экранов**: См. [references/screen-patterns.md](references/screen-patterns.md) - дашборд, список, деталь, форма
- **Карта навигации**: См. [references/navigation-map.md](references/navigation-map.md) - кнопка -> экран
- **TypeScript-паттерны**: См. [references/typescript-patterns.md](references/typescript-patterns.md) - пропсы, хуки, формы

## Ассеты

- `components.jsx` - Legacy UI-компоненты (для справки)
- `constants.js` - Константы статусов/типов, форматтеры
