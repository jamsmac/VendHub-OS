'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownUp,
  Search,
  MoreVertical,
  Eye,
  FileText,
  Download,
  DollarSign,
  TrendingUp,
  Receipt,
  Wallet,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { transactionsApi } from '@/lib/api';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

// --- Types ---

interface Transaction {
  id: string;
  transaction_number: string;
  type: TransactionType;
  amount: number;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  machine_id: string;
  machine_name?: string;
  machine_number?: string;
  created_at: string;
  description?: string;
}

interface TransactionsResponse {
  data: Transaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats?: {
    total_revenue: number;
    today_count: number;
    average_check: number;
    collections_count: number;
  };
}

type TransactionType =
  | 'SALE'
  | 'REFUND'
  | 'COLLECTION'
  | 'ENCASHMENT'
  | 'EXPENSE'
  | 'TRANSFER'
  | 'COMMISSION'
  | 'ADJUSTMENT';

type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DISPUTED';

type PaymentMethod =
  | 'CASH'
  | 'PAYME'
  | 'CLICK'
  | 'UZUM'
  | 'CARD'
  | 'QR_CODE'
  | 'TELEGRAM_STARS'
  | 'MIXED'
  | 'OTHER';

// --- Config maps ---

const transactionTypeConfig: Record<
  TransactionType,
  { label: string; color: string; bgColor: string }
> = {
  SALE: { label: 'Продажа', color: 'text-green-700', bgColor: 'bg-green-100' },
  REFUND: { label: 'Возврат', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  COLLECTION: { label: 'Инкассация', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  ENCASHMENT: { label: 'Выемка', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  EXPENSE: { label: 'Расход', color: 'text-red-700', bgColor: 'bg-red-100' },
  TRANSFER: { label: 'Перевод', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  COMMISSION: { label: 'Комиссия', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  ADJUSTMENT: { label: 'Корректировка', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

const transactionStatusConfig: Record<
  TransactionStatus,
  { label: string; color: string; bgColor: string }
> = {
  PENDING: { label: 'Ожидание', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  PROCESSING: { label: 'Обработка', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  COMPLETED: { label: 'Завершена', color: 'text-green-700', bgColor: 'bg-green-100' },
  FAILED: { label: 'Ошибка', color: 'text-red-700', bgColor: 'bg-red-100' },
  CANCELLED: { label: 'Отменена', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  REFUNDED: { label: 'Возвращена', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  DISPUTED: { label: 'Спорная', color: 'text-orange-700', bgColor: 'bg-orange-100' },
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Наличные',
  PAYME: 'Payme',
  CLICK: 'Click',
  UZUM: 'Uzum Bank',
  CARD: 'Карта',
  QR_CODE: 'QR-код',
  TELEGRAM_STARS: 'Telegram Stars',
  MIXED: 'Смешанная',
  OTHER: 'Другое',
};

const paymentMethodOptions: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Все методы' },
  { value: 'CASH', label: 'Наличные' },
  { value: 'PAYME', label: 'Payme' },
  { value: 'CLICK', label: 'Click' },
  { value: 'UZUM', label: 'Uzum Bank' },
  { value: 'CARD', label: 'Карта' },
  { value: 'QR_CODE', label: 'QR-код' },
  { value: 'TELEGRAM_STARS', label: 'Telegram Stars' },
  { value: 'MIXED', label: 'Смешанная' },
  { value: 'OTHER', label: 'Другое' },
];

const statusOptions: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Все статусы' },
  { value: 'PENDING', label: 'Ожидание' },
  { value: 'PROCESSING', label: 'Обработка' },
  { value: 'COMPLETED', label: 'Завершена' },
  { value: 'FAILED', label: 'Ошибка' },
  { value: 'CANCELLED', label: 'Отменена' },
  { value: 'REFUNDED', label: 'Возвращена' },
  { value: 'DISPUTED', label: 'Спорная' },
];

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = {
    search: debouncedSearch || undefined,
    payment_method: paymentMethod !== 'ALL' ? paymentMethod : undefined,
    status: status !== 'ALL' ? status : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: () =>
      transactionsApi
        .getAll(queryParams)
        .then((res) => res.data as TransactionsResponse),
  });

  const transactions = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };
  const stats = response?.stats || {
    total_revenue: 0,
    today_count: 0,
    average_check: 0,
    collections_count: 0,
  };

  const handleExport = () => {
    toast.info('Экспорт транзакций будет доступен в следующей версии');
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить транзакции</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })}>
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
          <h1 className="text-3xl font-bold">Транзакции</h1>
          <p className="text-muted-foreground">
            Управление финансовыми операциями и транзакциями
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Общая выручка</p>
                <p className="text-2xl font-bold">
                  {formatPrice(stats.total_revenue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Транзакций сегодня</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.today_count}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Средний чек</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPrice(stats.average_check)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Инкассации</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.collections_count}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру транзакции или автомату..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
            placeholder="Дата от"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
            placeholder="Дата до"
          />
          <Select
            value={paymentMethod}
            onValueChange={(value) => {
              setPaymentMethod(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Метод оплаты" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата / время</TableHead>
                  <TableHead>Номер</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Автомат</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Способ оплаты</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ArrowDownUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Транзакции не найдены</p>
            <p className="text-muted-foreground">
              Попробуйте изменить параметры фильтрации
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата / время</TableHead>
                  <TableHead>Номер</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Автомат</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Способ оплаты</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const typeConf =
                    transactionTypeConfig[tx.type] || transactionTypeConfig.SALE;
                  const statusConf =
                    transactionStatusConfig[tx.status] ||
                    transactionStatusConfig.PENDING;

                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(tx.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-sm">
                        {tx.transaction_number}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${typeConf.bgColor} ${typeConf.color}`}
                        >
                          {typeConf.label}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {tx.machine_name || tx.machine_number || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-medium text-right">
                        {tx.type === 'REFUND' || tx.type === 'EXPENSE'
                          ? `- ${formatPrice(tx.amount)}`
                          : formatPrice(tx.amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {paymentMethodLabels[tx.payment_method] || tx.payment_method}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusConf.bgColor} ${statusConf.color} border-0`}
                        >
                          {statusConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label="Действия">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/dashboard/transactions/${tx.id}`}>
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Просмотр
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/dashboard/transactions/${tx.id}`}>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                Детали
                              </DropdownMenuItem>
                            </Link>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Показано {(meta.page - 1) * meta.limit + 1}
              {' '}-{' '}
              {Math.min(meta.page * meta.limit, meta.total)} из {meta.total}{' '}
              транзакций
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Назад
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {meta.page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперед
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
