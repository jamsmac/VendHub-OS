'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Banknote,
  Calculator,
  Clock,
  CheckCircle2,
  CreditCard,
  TrendingUp,
  Eye,
  Check,
  DollarSign,
  Plus,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const employeeTabs = [
  { href: '/dashboard/employees', label: 'Сотрудники' },
  { href: '/dashboard/employees/departments', label: 'Отделы' },
  { href: '/dashboard/employees/attendance', label: 'Посещаемость' },
  { href: '/dashboard/employees/leave', label: 'Отпуска' },
  { href: '/dashboard/employees/payroll', label: 'Зарплата' },
  { href: '/dashboard/employees/reviews', label: 'Оценки' },
];

interface PayrollRecord {
  id: string;
  employee_id: string;
  employee?: { id: string; firstName: string; lastName: string };
  period_start: string;
  period_end: string;
  base_salary: number;
  overtime_pay: number;
  bonuses: number;
  deductions: number;
  tax: number;
  net_salary: number;
  working_days: number;
  status: string;
  paid_at?: string;
  created_at: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const payrollStatusLabels: Record<string, string> = {
  DRAFT: 'Черновик',
  CALCULATED: 'Рассчитано',
  APPROVED: 'Одобрено',
  PAID: 'Оплачено',
  CANCELLED: 'Отменено',
};

const payrollStatusColors: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  CALCULATED: 'bg-blue-500/10 text-blue-500',
  APPROVED: 'bg-amber-500/10 text-amber-500',
  PAID: 'bg-green-500/10 text-green-500',
  CANCELLED: 'bg-red-500/10 text-red-500',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('ru-RU').format(amount) + ' UZS';

const months = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export default function PayrollPage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [isCalculateOpen, setIsCalculateOpen] = useState(false);
  const [detailPayroll, setDetailPayroll] = useState<PayrollRecord | null>(null);
  const [payConfirmId, setPayConfirmId] = useState<string | null>(null);

  const { data: payrolls, isLoading } = useQuery<PayrollRecord[]>({
    queryKey: ['payrolls', selectedMonth, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('month', String(Number(selectedMonth) + 1));
      params.append('year', selectedYear);
      const res = await api.get(`/employees/payroll?${params}`);
      return res.data;
    },
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/employees/payroll/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast.success('Зарплата одобрена');
    },
    onError: () => {
      toast.error('Не удалось одобрить');
    },
  });

  const payMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/employees/payroll/${id}/pay`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast.success('Зарплата выплачена');
      setPayConfirmId(null);
    },
    onError: () => {
      toast.error('Не удалось выплатить');
    },
  });

  const records = payrolls || [];
  const totalPayroll = records.reduce((sum, r) => sum + (r.net_salary || 0), 0);
  const avgSalary = records.length > 0 ? totalPayroll / records.length : 0;
  const pendingApproval = records.filter((r) => r.status === 'CALCULATED').length;
  const paidThisMonth = records.filter((r) => r.status === 'PAID').length;

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    years.push(String(y));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Сотрудники</h1>
          <p className="text-muted-foreground">
            Управление персоналом организации
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b">
        {employeeTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              pathname === tab.href
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{formatCurrency(totalPayroll)}</p>
              <p className="text-sm text-muted-foreground">Всего к выплате</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{formatCurrency(Math.round(avgSalary))}</p>
              <p className="text-sm text-muted-foreground">Средняя зарплата</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingApproval}</p>
              <p className="text-sm text-muted-foreground">Ожидает одобрения</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{paidThisMonth}</p>
              <p className="text-sm text-muted-foreground">Выплачено</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Период:</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={idx} value={String(idx)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isCalculateOpen} onOpenChange={setIsCalculateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Calculator className="w-4 h-4 mr-2" />
              Рассчитать зарплату
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Расчет зарплаты</DialogTitle>
            </DialogHeader>
            <CalculatePayrollForm
              employees={employees || []}
              onSuccess={() => {
                setIsCalculateOpen(false);
                queryClient.invalidateQueries({ queryKey: ['payrolls'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailPayroll} onOpenChange={(open) => !open && setDetailPayroll(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Детали зарплаты</DialogTitle>
          </DialogHeader>
          {detailPayroll && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {detailPayroll.employee?.firstName?.[0]}
                    {detailPayroll.employee?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {detailPayroll.employee?.firstName} {detailPayroll.employee?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(detailPayroll.period_start).toLocaleDateString('ru-RU')} --{' '}
                    {new Date(detailPayroll.period_end).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <Badge className={`ml-auto ${payrollStatusColors[detailPayroll.status]}`}>
                  {payrollStatusLabels[detailPayroll.status]}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Базовая зарплата</span>
                  <span className="font-medium">{formatCurrency(detailPayroll.base_salary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Переработка</span>
                  <span className="font-medium text-blue-600">+{formatCurrency(detailPayroll.overtime_pay)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Бонусы</span>
                  <span className="font-medium text-green-600">+{formatCurrency(detailPayroll.bonuses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Удержания</span>
                  <span className="font-medium text-red-600">-{formatCurrency(detailPayroll.deductions)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Налог</span>
                  <span className="font-medium text-red-600">-{formatCurrency(detailPayroll.tax)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Итого к выплате</span>
                    <span className="font-bold text-lg">{formatCurrency(detailPayroll.net_salary)}</span>
                  </div>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Рабочих дней</span>
                  <span>{detailPayroll.working_days}</span>
                </div>
                {detailPayroll.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Дата выплаты</span>
                    <span>{new Date(detailPayroll.paid_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pay Confirmation Dialog */}
      <Dialog open={!!payConfirmId} onOpenChange={(open) => !open && setPayConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтвердите выплату</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Вы уверены, что хотите подтвердить выплату зарплаты? Это действие нельзя отменить.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setPayConfirmId(null)}>
              Отмена
            </Button>
            <Button
              disabled={payMutation.isPending}
              onClick={() => payConfirmId && payMutation.mutate(payConfirmId)}
            >
              {payMutation.isPending ? 'Оплата...' : 'Подтвердить выплату'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сотрудник</TableHead>
              <TableHead>Период</TableHead>
              <TableHead className="text-right">Оклад</TableHead>
              <TableHead className="text-right">Переработка</TableHead>
              <TableHead className="text-right">Бонусы</TableHead>
              <TableHead className="text-right">Удержания</TableHead>
              <TableHead className="text-right">Налог</TableHead>
              <TableHead className="text-right">К выплате</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={10}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : records.length ? (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {record.employee?.firstName?.[0]}
                          {record.employee?.lastName?.[0]}
                        </span>
                      </div>
                      <span className="font-medium">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(record.period_start).toLocaleDateString('ru-RU')} --{' '}
                      {new Date(record.period_end).toLocaleDateString('ru-RU')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(record.base_salary)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {record.overtime_pay > 0 ? (
                      <span className="text-blue-600">{formatCurrency(record.overtime_pay)}</span>
                    ) : '--'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {record.bonuses > 0 ? (
                      <span className="text-green-600">{formatCurrency(record.bonuses)}</span>
                    ) : '--'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {record.deductions > 0 ? (
                      <span className="text-red-600">{formatCurrency(record.deductions)}</span>
                    ) : '--'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {record.tax > 0 ? (
                      <span className="text-red-600">{formatCurrency(record.tax)}</span>
                    ) : '--'}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold">{formatCurrency(record.net_salary)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={payrollStatusColors[record.status] || 'bg-muted text-muted-foreground'}>
                      {payrollStatusLabels[record.status] || record.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDetailPayroll(record)}
                        title="Подробнее"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {record.status === 'CALCULATED' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => approveMutation.mutate(record.id)}
                          disabled={approveMutation.isPending}
                          title="Одобрить"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {record.status === 'APPROVED' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => setPayConfirmId(record.id)}
                          title="Выплатить"
                        >
                          <CreditCard className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <Banknote className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Нет данных о зарплатах за выбранный период</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CalculatePayrollForm({
  employees,
  onSuccess,
}: {
  employees: Employee[];
  onSuccess: () => void;
}) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    employee_id: '',
    period_start: firstDay,
    period_end: lastDay,
    working_days: '22',
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/employees/payroll/calculate', {
        employee_id: data.employee_id,
        period_start: data.period_start,
        period_end: data.period_end,
        working_days: Number(data.working_days),
      });
    },
    onSuccess: () => {
      toast.success('Зарплата рассчитана');
      onSuccess();
    },
    onError: () => {
      toast.error('Не удалось рассчитать зарплату');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Сотрудник</label>
        <Select
          value={formData.employee_id}
          onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите сотрудника" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Начало периода</label>
          <Input
            type="date"
            value={formData.period_start}
            onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Конец периода</label>
          <Input
            type="date"
            value={formData.period_end}
            onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Рабочих дней</label>
        <Input
          type="number"
          value={formData.working_days}
          onChange={(e) => setFormData({ ...formData, working_days: e.target.value })}
          min="1"
          max="31"
          required
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          disabled={mutation.isPending || !formData.employee_id}
        >
          {mutation.isPending ? 'Расчет...' : 'Рассчитать'}
        </Button>
      </div>
    </form>
  );
}
