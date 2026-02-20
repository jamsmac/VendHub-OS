'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { directoriesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Search,
  Plus,
  Database,
  Globe,
  Building2,
  Filter,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';

type ApiError = Error & { response?: { data?: { message?: string | string[] } } };

type DirectoryType = 'MANUAL' | 'EXTERNAL' | 'PARAM' | 'TEMPLATE';
type DirectoryScope = 'HQ' | 'ORGANIZATION' | 'LOCATION';

interface Directory {
  id: string;
  name: string;
  slug: string;
  type: DirectoryType;
  scope: DirectoryScope;
  description?: string;
  isSystem: boolean;
  recordCount?: number;
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<DirectoryType, string> = {
  MANUAL: 'Ручной',
  EXTERNAL: 'Внешний',
  PARAM: 'Параметр',
  TEMPLATE: 'Шаблон',
};

const SCOPE_LABELS: Record<DirectoryScope, string> = {
  HQ: 'Штаб-квартира',
  ORGANIZATION: 'Организация',
  LOCATION: 'Локация',
};

export default function DirectoriesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Form state for create dialog
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'MANUAL' as DirectoryType,
    scope: 'HQ' as DirectoryScope,
    description: '',
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch directories
  const { data: directories, isLoading } = useQuery({
    queryKey: ['directories', debouncedSearch, scopeFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (scopeFilter !== 'all') params.append('scope', scopeFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await directoriesApi.getAll(Object.fromEntries(params));
      return (response.data?.data ?? response.data) as Directory[];
    },
  });

  // Create directory mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => directoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directories'] });
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        slug: '',
        type: 'MANUAL',
        scope: 'HQ',
        description: '',
      });
      toast.success('Справочник успешно создан');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || error.message || 'Ошибка при создании справочника';
      toast.error(Array.isArray(message) ? message[0] : message);
    },
  });

  // Calculate stats
  const stats = useMemo(() => ({
    total: directories?.length || 0,
    system: directories?.filter((d) => d.isSystem).length || 0,
    custom: directories?.filter((d) => !d.isSystem).length || 0,
    external: directories?.filter((d) => d.type === 'EXTERNAL').length || 0,
  }), [directories]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDirectoryClick = (id: string) => {
    router.push(`/dashboard/directories/${id}`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Мастер-данные</h1>
          <p className="text-muted-foreground mt-1">
            Управление справочниками системы
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить справочник
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего справочников
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Системных
            </CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.system}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Пользовательских
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.custom}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Внешних
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.external}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск справочников..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Область" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все области</SelectItem>
                  <SelectItem value="HQ">Штаб-квартира</SelectItem>
                  <SelectItem value="ORGANIZATION">Организация</SelectItem>
                  <SelectItem value="LOCATION">Локация</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <Database className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="MANUAL">Ручной</SelectItem>
                  <SelectItem value="EXTERNAL">Внешний</SelectItem>
                  <SelectItem value="PARAM">Параметр</SelectItem>
                  <SelectItem value="TEMPLATE">Шаблон</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : directories && directories.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {directories.map((directory) => (
            <Card
              key={directory.id}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => handleDirectoryClick(directory.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{directory.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {directory.slug}
                    </p>
                  </div>
                  {directory.isSystem && (
                    <Badge variant="outline" className="ml-2">
                      <Settings2 className="mr-1 h-3 w-3" />
                      Системный
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {directory.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {directory.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">
                      {TYPE_LABELS[directory.type]}
                    </Badge>
                    <Badge variant="secondary">
                      {SCOPE_LABELS[directory.scope]}
                    </Badge>
                    {directory.recordCount !== undefined && (
                      <Badge variant="outline">
                        {directory.recordCount} записей
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Справочники не найдены</p>
            <p className="text-sm text-muted-foreground mt-1">
              Попробуйте изменить параметры фильтрации
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Directory Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) {
          setFormData({ name: '', slug: '', type: 'MANUAL', scope: 'HQ', description: '' });
        }
      }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Создать справочник</DialogTitle>
            <DialogDescription>
              Добавьте новый справочник в систему мастер-данных
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Введите название справочника"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="slug">Код (slug)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="example-directory"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Тип</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: DirectoryType) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Ручной</SelectItem>
                    <SelectItem value="EXTERNAL">Внешний</SelectItem>
                    <SelectItem value="PARAM">Параметр</SelectItem>
                    <SelectItem value="TEMPLATE">Шаблон</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="scope">Область</Label>
                <Select
                  value={formData.scope}
                  onValueChange={(value: DirectoryScope) =>
                    setFormData({ ...formData, scope: value })
                  }
                >
                  <SelectTrigger id="scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HQ">Штаб-квартира</SelectItem>
                    <SelectItem value="ORGANIZATION">Организация</SelectItem>
                    <SelectItem value="LOCATION">Локация</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Описание</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Краткое описание справочника"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Создание...' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
