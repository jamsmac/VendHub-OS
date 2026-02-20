'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Star,
  FileText,
  CheckCircle2,
  ChevronDown,
  DollarSign,
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

interface Contractor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  type: 'repair' | 'supply' | 'logistics' | 'cleaning' | 'other';
  status: 'active' | 'inactive' | 'pending';
  rating: number;
  contractNumber?: string;
  contractEndDate?: string;
  totalOrders: number;
  totalSpent: number;
  address?: string;
  notes?: string;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  repair: 'Ремонт',
  supply: 'Поставка',
  logistics: 'Логистика',
  cleaning: 'Клининг',
  other: 'Другое',
};

const typeColors: Record<string, string> = {
  repair: 'bg-blue-500/10 text-blue-500',
  supply: 'bg-green-500/10 text-green-500',
  logistics: 'bg-purple-500/10 text-purple-500',
  cleaning: 'bg-amber-500/10 text-amber-500',
  other: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  active: 'Активный',
  inactive: 'Неактивный',
  pending: 'Ожидает',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500',
  inactive: 'bg-red-500/10 text-red-500',
  pending: 'bg-amber-500/10 text-amber-500',
};

export default function ContractorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch contractors
  const { data: contractors, isLoading, isError } = useQuery<Contractor[]>({
    queryKey: ['contractors', debouncedSearch, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      const res = await api.get(`/contractors?${params}`);
      return res.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/contractors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Подрядчик удалён');
    },
    onError: () => {
      toast.error('Не удалось удалить подрядчика');
    },
  });

  const stats = useMemo(() => ({
    total: contractors?.length || 0,
    active: contractors?.filter((c) => c.status === 'active').length || 0,
    totalSpent: contractors?.reduce((sum, c) => sum + c.totalSpent, 0) || 0,
  }), [contractors]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' UZS';
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить подрядчиков</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['contractors'] })}>
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
          <h1 className="text-2xl font-bold">Подрядчики</h1>
          <p className="text-muted-foreground">
            Управление подрядчиками и контрактами
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Добавить подрядчика
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Новый подрядчик</DialogTitle>
            </DialogHeader>
            <ContractorForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['contractors'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Всего подрядчиков</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Активных</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatMoney(stats.totalSpent)}</p>
              <p className="text-sm text-muted-foreground">Общие расходы</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск подрядчиков..."
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
              <Building2 className="w-4 h-4 mr-2" />
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
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Подрядчик</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Контактное лицо</TableHead>
              <TableHead>Рейтинг</TableHead>
              <TableHead>Заказов</TableHead>
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
            ) : contractors?.length ? (
              contractors.map((contractor) => (
                <TableRow key={contractor.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{contractor.name}</p>
                        {contractor.contractNumber && (
                          <p className="text-sm text-muted-foreground">
                            №{contractor.contractNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={typeColors[contractor.type]}>
                      {typeLabels[contractor.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{contractor.contactPerson}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {contractor.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < contractor.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted'
                          }`}
                        />
                      ))}
                      <span className="text-sm ml-1">{contractor.rating.toFixed(1)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{contractor.totalOrders}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(contractor.totalSpent)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[contractor.status]}>
                      {statusLabels[contractor.status]}
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
                        <DropdownMenuItem>
                          <FileText className="w-4 h-4 mr-2" />
                          Договор
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(contractor.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Подрядчики не найдены</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Contractor Form Component
function ContractorForm({ contractor, onSuccess }: { contractor?: Contractor; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: contractor?.name || '',
    contactPerson: contractor?.contactPerson || '',
    email: contractor?.email || '',
    phone: contractor?.phone || '',
    type: contractor?.type || 'repair',
    contractNumber: contractor?.contractNumber || '',
    contractEndDate: contractor?.contractEndDate || '',
    address: contractor?.address || '',
    notes: contractor?.notes || '',
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (contractor) {
        return api.patch(`/contractors/${contractor.id}`, data);
      }
      return api.post('/contractors', data);
    },
    onSuccess: () => {
      toast.success(contractor ? 'Подрядчик обновлён' : 'Подрядчик добавлен');
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
        <label className="text-sm font-medium">Название компании</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Контактное лицо</label>
          <Input
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Тип услуг</label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите тип услуг" />
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
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Телефон</label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Номер договора</label>
          <Input
            value={formData.contractNumber}
            onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Окончание договора</label>
          <Input
            type="date"
            value={formData.contractEndDate}
            onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Адрес</label>
        <Input
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Примечания</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="h-20 resize-none"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Сохранение...' : contractor ? 'Обновить' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}
