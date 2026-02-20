'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Calendar,
  User,
  Coffee,
  Play,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface MaintenanceRequest {
  id: string;
  requestNumber: string;
  machineId: string;
  machine: {
    name: string;
    serialNumber: string;
    address: string;
  };
  type: 'preventive' | 'corrective' | 'emergency' | 'inspection';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'submitted' | 'approved' | 'scheduled' | 'in_progress' | 'completed' | 'verified' | 'rejected' | 'cancelled';
  title: string;
  description: string;
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
  scheduledDate?: string;
  completedAt?: string;
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  preventive: 'Профилактика',
  corrective: 'Ремонт',
  emergency: 'Аварийный',
  inspection: 'Осмотр',
};

const typeColors: Record<string, string> = {
  preventive: 'bg-blue-500/10 text-blue-500',
  corrective: 'bg-amber-500/10 text-amber-500',
  emergency: 'bg-red-500/10 text-red-500',
  inspection: 'bg-green-500/10 text-green-500',
};

const priorityLabels: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/10 text-blue-500',
  high: 'bg-amber-500/10 text-amber-500',
  critical: 'bg-red-500/10 text-red-500',
};

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  submitted: 'Подана',
  approved: 'Одобрена',
  scheduled: 'Запланирована',
  in_progress: 'В работе',
  completed: 'Завершена',
  verified: 'Проверена',
  rejected: 'Отклонена',
  cancelled: 'Отменена',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-500/10 text-blue-500',
  approved: 'bg-green-500/10 text-green-500',
  scheduled: 'bg-purple-500/10 text-purple-500',
  in_progress: 'bg-amber-500/10 text-amber-500',
  completed: 'bg-emerald-500/10 text-emerald-500',
  verified: 'bg-green-600/10 text-green-600',
  rejected: 'bg-red-500/10 text-red-500',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function MaintenancePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch maintenance requests
  const { data: requests, isLoading, isError } = useQuery<MaintenanceRequest[]>({
    queryKey: ['maintenance', debouncedSearch, statusFilter, typeFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      const res = await api.get(`/maintenance?${params}`);
      return res.data;
    },
  });

  // Status transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      return api.post(`/maintenance/${id}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      toast.success('Статус обновлён');
    },
    onError: () => {
      toast.error('Ошибка обновления статуса');
    },
  });

  const stats = useMemo(() => ({
    total: requests?.length || 0,
    inProgress: requests?.filter((r) => r.status === 'in_progress').length || 0,
    scheduled: requests?.filter((r) => r.status === 'scheduled').length || 0,
    critical: requests?.filter((r) => r.priority === 'critical' && !['completed', 'verified', 'cancelled'].includes(r.status)).length || 0,
  }), [requests]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить заявки</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['maintenance'] })}>
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Техобслуживание</h1>
          <p className="text-muted-foreground">
            Управление заявками на обслуживание и ремонт
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Создать заявку
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Новая заявка на ТО</DialogTitle>
            </DialogHeader>
            <MaintenanceForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['maintenance'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Всего заявок</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Play className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">В работе</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.scheduled}</p>
              <p className="text-sm text-muted-foreground">Запланировано</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.critical}</p>
              <p className="text-sm text-muted-foreground">Критических</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск заявок..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Статус
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>
              Все статусы
            </DropdownMenuItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <DropdownMenuItem key={value} onClick={() => setStatusFilter(value)}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Wrench className="w-4 h-4 mr-2" />
              Тип
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTypeFilter('all')}>
              Все типы
            </DropdownMenuItem>
            {Object.entries(typeLabels).map(([value, label]) => (
              <DropdownMenuItem key={value} onClick={() => setTypeFilter(value)}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Приоритет
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setPriorityFilter('all')}>
              Все приоритеты
            </DropdownMenuItem>
            {Object.entries(priorityLabels).map(([value, label]) => (
              <DropdownMenuItem key={value} onClick={() => setPriorityFilter(value)}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Заявка</TableHead>
              <TableHead>Автомат</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Приоритет</TableHead>
              <TableHead>Исполнитель</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : requests?.length ? (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">#{request.requestNumber}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {request.title}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{request.machine.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.machine.serialNumber}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={typeColors[request.type]}>
                      {typeLabels[request.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityColors[request.priority]}>
                      {priorityLabels[request.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {request.assignedTo.firstName} {request.assignedTo.lastName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Не назначен</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[request.status]}>
                      {statusLabels[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Действия">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {request.status === 'draft' && (
                          <DropdownMenuItem
                            onClick={() => transitionMutation.mutate({ id: request.id, action: 'submit' })}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Подать заявку
                          </DropdownMenuItem>
                        )}
                        {request.status === 'submitted' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => transitionMutation.mutate({ id: request.id, action: 'approve' })}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Одобрить
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => transitionMutation.mutate({ id: request.id, action: 'reject' })}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Отклонить
                            </DropdownMenuItem>
                          </>
                        )}
                        {request.status === 'scheduled' && (
                          <DropdownMenuItem
                            onClick={() => transitionMutation.mutate({ id: request.id, action: 'start' })}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Начать работу
                          </DropdownMenuItem>
                        )}
                        {request.status === 'in_progress' && (
                          <DropdownMenuItem
                            onClick={() => transitionMutation.mutate({ id: request.id, action: 'complete' })}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Завершить
                          </DropdownMenuItem>
                        )}
                        {request.status === 'completed' && (
                          <DropdownMenuItem
                            onClick={() => transitionMutation.mutate({ id: request.id, action: 'verify' })}
                          >
                            <FileCheck className="w-4 h-4 mr-2" />
                            Подтвердить
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Wrench className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Заявки не найдены</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Maintenance Form Component
function MaintenanceForm({ request, onSuccess }: { request?: MaintenanceRequest; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    machineId: request?.machineId || '',
    type: request?.type || 'corrective',
    priority: request?.priority || 'medium',
    title: request?.title || '',
    description: request?.description || '',
    scheduledDate: request?.scheduledDate || '',
    estimatedCost: request?.estimatedCost || '',
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (request) {
        return api.patch(`/maintenance/${request.id}`, data);
      }
      return api.post('/maintenance', data);
    },
    onSuccess: () => {
      toast.success(request ? 'Заявка обновлена' : 'Заявка создана');
      onSuccess();
    },
    onError: () => {
      toast.error('Ошибка сохранения');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Заголовок</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Краткое описание проблемы"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Тип работ</label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите тип работ" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Приоритет</label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите приоритет" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Описание</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="h-24 resize-none"
          placeholder="Подробное описание проблемы и необходимых работ"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Плановая дата</label>
          <Input
            type="date"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Оценка стоимости (UZS)</label>
          <Input
            type="number"
            value={formData.estimatedCost}
            onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Сохранение...' : request ? 'Обновить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
}
