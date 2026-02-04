'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  Search,
  Filter,
  ChevronDown,
  Clock,
  CheckCircle2,
  Package,
  CreditCard,
  User,
  Coffee,
  Eye,
  Download,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    telegramId?: string;
  };
  machine: {
    id: string;
    name: string;
    serialNumber: string;
    address: string;
  };
  items: {
    id: string;
    product: {
      name: string;
      imageUrl?: string;
    };
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  paymentMethod: 'payme' | 'click' | 'uzum' | 'telegram_stars' | 'cash';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  status: 'pending' | 'confirmed' | 'processing' | 'ready' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

const paymentMethodLabels: Record<string, string> = {
  payme: 'Payme',
  click: 'Click',
  uzum: 'Uzum Bank',
  telegram_stars: 'Telegram Stars',
  cash: 'Наличные',
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'Ожидает',
  paid: 'Оплачен',
  failed: 'Ошибка',
  refunded: 'Возвращён',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500',
  paid: 'bg-green-500/10 text-green-500',
  failed: 'bg-red-500/10 text-red-500',
  refunded: 'bg-purple-500/10 text-purple-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждён',
  processing: 'Готовится',
  ready: 'Готов',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500',
  confirmed: 'bg-blue-500/10 text-blue-500',
  processing: 'bg-purple-500/10 text-purple-500',
  ready: 'bg-green-500/10 text-green-500',
  completed: 'bg-emerald-500/10 text-emerald-500',
  cancelled: 'bg-red-500/10 text-red-500',
};

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch orders
  const { data: orders, isLoading, isError, refetch } = useQuery<Order[]>({
    queryKey: ['orders', debouncedSearch, statusFilter, paymentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter);
      const res = await api.get(`/orders?${params}`);
      return res.data;
    },
  });

  const stats = useMemo(() => ({
    total: orders?.length || 0,
    pending: orders?.filter((o) => o.status === 'pending').length || 0,
    completed: orders?.filter((o) => o.status === 'completed').length || 0,
    totalRevenue: orders?.filter((o) => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalAmount, 0) || 0,
  }), [orders]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' UZS';
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить заказы</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}>
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
          <h1 className="text-2xl font-bold">Заказы</h1>
          <p className="text-muted-foreground">
            Управление заказами из Mini App
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Всего заказов</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Ожидают</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Завершено</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatMoney(stats.totalRevenue)}</p>
              <p className="text-sm text-muted-foreground">Выручка</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру заказа..."
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
              <CreditCard className="w-4 h-4 mr-2" />
              Оплата
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setPaymentFilter('all')}>
              Все статусы
            </DropdownMenuItem>
            {Object.entries(paymentStatusLabels).map(([value, label]) => (
              <DropdownMenuItem key={value} onClick={() => setPaymentFilter(value)}>
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
              <TableHead>Заказ</TableHead>
              <TableHead>Клиент</TableHead>
              <TableHead>Автомат</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Оплата</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : orders?.length ? (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">#{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.items.length} товаров
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {order.customer.firstName || 'Гость'}
                        </p>
                        {order.customer.phone && (
                          <p className="text-sm text-muted-foreground">
                            {order.customer.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium line-clamp-1">{order.machine.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.machine.serialNumber}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold">{formatMoney(order.totalAmount)}</p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge className={paymentStatusColors[order.paymentStatus]}>
                        {paymentStatusLabels[order.paymentStatus]}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {paymentMethodLabels[order.paymentMethod]}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[order.status]}>
                      {statusLabels[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Заказы не найдены</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Заказ #{selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <Badge className={statusColors[selectedOrder.status]}>
                  {statusLabels[selectedOrder.status]}
                </Badge>
                <Badge className={paymentStatusColors[selectedOrder.paymentStatus]}>
                  {paymentStatusLabels[selectedOrder.paymentStatus]}
                </Badge>
              </div>

              {/* Customer */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Клиент</h4>
                <p className="font-medium">
                  {selectedOrder.customer.firstName || 'Гость'}
                </p>
                {selectedOrder.customer.phone && (
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.customer.phone}
                  </p>
                )}
              </div>

              {/* Machine */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Автомат</h4>
                <p className="font-medium">{selectedOrder.machine.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.machine.address}
                </p>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Товары</h4>
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {formatMoney(item.price)}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">
                      {formatMoney(item.quantity * item.price)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                <span className="font-medium">Итого</span>
                <span className="text-xl font-bold text-primary">
                  {formatMoney(selectedOrder.totalAmount)}
                </span>
              </div>

              {/* Payment Info */}
              <div className="text-sm text-muted-foreground">
                <p>Способ оплаты: {paymentMethodLabels[selectedOrder.paymentMethod]}</p>
                <p>
                  Создан:{' '}
                  {new Date(selectedOrder.createdAt).toLocaleString('ru-RU')}
                </p>
                {selectedOrder.completedAt && (
                  <p>
                    Завершён:{' '}
                    {new Date(selectedOrder.completedAt).toLocaleString('ru-RU')}
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
