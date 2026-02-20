'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PackagePlus,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  ChevronDown,
  User,
  Warehouse,
  Send,
  Eye,
  Truck,
  Filter,
  Trash2,
  AlertTriangle,
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

interface MaterialRequest {
  id: string;
  requestNumber: string;
  requester: {
    firstName: string;
    lastName: string;
  };
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  items: {
    id: string;
    product: {
      name: string;
      sku: string;
    };
    requestedQuantity: number;
    approvedQuantity?: number;
  }[];
  totalItems: number;
  notes?: string;
  deliveryDate?: string;
  createdAt: string;
  approvedAt?: string;
  deliveredAt?: string;
}

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  submitted: 'На рассмотрении',
  approved: 'Одобрена',
  rejected: 'Отклонена',
  processing: 'Комплектуется',
  shipped: 'Отправлена',
  delivered: 'Доставлена',
  cancelled: 'Отменена',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-500/10 text-blue-500',
  approved: 'bg-green-500/10 text-green-500',
  rejected: 'bg-red-500/10 text-red-500',
  processing: 'bg-amber-500/10 text-amber-500',
  shipped: 'bg-purple-500/10 text-purple-500',
  delivered: 'bg-emerald-500/10 text-emerald-500',
  cancelled: 'bg-muted text-muted-foreground',
};

const priorityLabels: Record<string, string> = {
  low: 'Низкий',
  normal: 'Обычный',
  high: 'Высокий',
  urgent: 'Срочный',
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-500/10 text-blue-500',
  high: 'bg-amber-500/10 text-amber-500',
  urgent: 'bg-red-500/10 text-red-500',
};

export default function MaterialRequestsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch requests
  const { data: requests, isLoading, isError } = useQuery<MaterialRequest[]>({
    queryKey: ['material-requests', debouncedSearch, statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      const res = await api.get(`/material-requests?${params}`);
      return res.data;
    },
  });

  // Status transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      return api.post(`/material-requests/${id}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      toast.success('Статус обновлён');
    },
    onError: () => {
      toast.error('Ошибка обновления статуса');
    },
  });

  const stats = useMemo(() => ({
    total: requests?.length || 0,
    pending: requests?.filter((r) => r.status === 'submitted').length || 0,
    processing: requests?.filter((r) => ['approved', 'processing', 'shipped'].includes(r.status)).length || 0,
    urgent: requests?.filter((r) => r.priority === 'urgent' && !['delivered', 'cancelled', 'rejected'].includes(r.status)).length || 0,
  }), [requests]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить заявки</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['material-requests'] })}>
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
          <h1 className="text-2xl font-bold">Заявки на материалы</h1>
          <p className="text-muted-foreground">
            Управление заявками на пополнение
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
              <DialogTitle>Новая заявка</DialogTitle>
            </DialogHeader>
            <MaterialRequestForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['material-requests'] });
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
              <PackagePlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Всего заявок</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">На рассмотрении</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.processing}</p>
              <p className="text-sm text-muted-foreground">В обработке</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.urgent}</p>
              <p className="text-sm text-muted-foreground">Срочных</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
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
              <Package className="w-4 h-4 mr-2" />
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
              <TableHead>Заявитель</TableHead>
              <TableHead>Позиции</TableHead>
              <TableHead>Приоритет</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
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
                    <p className="font-medium">#{request.requestNumber}</p>
                    {request.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {request.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {request.requester.firstName} {request.requester.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span>{request.totalItems} позиций</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityColors[request.priority]}>
                      {priorityLabels[request.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[request.status]}>
                      {statusLabels[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(request.createdAt).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Действия">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedRequest(request)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Просмотр
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {request.status === 'draft' && (
                          <DropdownMenuItem
                            onClick={() => transitionMutation.mutate({ id: request.id, action: 'submit' })}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Отправить
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
                        {request.status === 'approved' && (
                          <DropdownMenuItem
                            onClick={() => transitionMutation.mutate({ id: request.id, action: 'process' })}
                          >
                            <Warehouse className="w-4 h-4 mr-2" />
                            Начать комплектацию
                          </DropdownMenuItem>
                        )}
                        {request.status === 'processing' && (
                          <DropdownMenuItem
                            onClick={() => transitionMutation.mutate({ id: request.id, action: 'ship' })}
                          >
                            <Truck className="w-4 h-4 mr-2" />
                            Отправить
                          </DropdownMenuItem>
                        )}
                        {request.status === 'shipped' && (
                          <DropdownMenuItem
                            onClick={() => transitionMutation.mutate({ id: request.id, action: 'deliver' })}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Подтвердить доставку
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
                  <PackagePlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Заявки не найдены</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Заявка #{selectedRequest?.requestNumber}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={statusColors[selectedRequest.status]}>
                  {statusLabels[selectedRequest.status]}
                </Badge>
                <Badge className={priorityColors[selectedRequest.priority]}>
                  {priorityLabels[selectedRequest.priority]}
                </Badge>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Заявитель</h4>
                <p className="font-medium">
                  {selectedRequest.requester.firstName} {selectedRequest.requester.lastName}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Позиции</h4>
                {selectedRequest.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.product.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.requestedQuantity} шт.</p>
                      {item.approvedQuantity !== undefined && (
                        <p className="text-sm text-green-500">
                          Одобрено: {item.approvedQuantity}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedRequest.notes && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Примечание</h4>
                  <p className="text-sm">{selectedRequest.notes}</p>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p>
                  Создана: {new Date(selectedRequest.createdAt).toLocaleString('ru-RU')}
                </p>
                {selectedRequest.approvedAt && (
                  <p>
                    Одобрена: {new Date(selectedRequest.approvedAt).toLocaleString('ru-RU')}
                  </p>
                )}
                {selectedRequest.deliveredAt && (
                  <p>
                    Доставлена: {new Date(selectedRequest.deliveredAt).toLocaleString('ru-RU')}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Material Request Form Component
function MaterialRequestForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    priority: 'normal',
    notes: '',
    items: [{ productId: '', quantity: 1 }],
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/material-requests', data);
    },
    onSuccess: () => {
      toast.success('Заявка создана');
      onSuccess();
    },
    onError: () => {
      toast.error('Ошибка создания заявки');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Приоритет</label>
        <Select
          value={formData.priority}
          onValueChange={(value) => setFormData({ ...formData, priority: value })}
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
      <div>
        <label className="text-sm font-medium">Примечание</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="h-20 resize-none"
          placeholder="Дополнительная информация о заявке"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Создание...' : 'Создать заявку'}
        </Button>
      </div>
    </form>
  );
}
