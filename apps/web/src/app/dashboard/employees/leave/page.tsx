'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarOff,
  Filter,
  ChevronDown,
  Check,
  X,
  Ban,
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
import { Textarea } from '@/components/ui/textarea';
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

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee?: { id: string; firstName: string; lastName: string };
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status: string;
  approved_by?: string;
  rejected_reason?: string;
  created_at: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const leaveTypeLabels: Record<string, string> = {
  ANNUAL: 'Ежегодный',
  SICK: 'Больничный',
  UNPAID: 'Без оплаты',
  MATERNITY: 'Декретный',
  PATERNITY: 'Отцовский',
  BEREAVEMENT: 'По утрате',
  STUDY: 'Учебный',
  OTHER: 'Другое',
};

const leaveTypeColors: Record<string, string> = {
  ANNUAL: 'bg-blue-500/10 text-blue-500',
  SICK: 'bg-red-500/10 text-red-500',
  UNPAID: 'bg-muted text-muted-foreground',
  MATERNITY: 'bg-pink-500/10 text-pink-500',
  PATERNITY: 'bg-cyan-500/10 text-cyan-500',
  BEREAVEMENT: 'bg-violet-500/10 text-violet-500',
  STUDY: 'bg-amber-500/10 text-amber-500',
  OTHER: 'bg-muted text-muted-foreground',
};

const leaveStatusLabels: Record<string, string> = {
  PENDING: 'Ожидает',
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
  CANCELLED: 'Отменено',
};

const leaveStatusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-500',
  APPROVED: 'bg-green-500/10 text-green-500',
  REJECTED: 'bg-red-500/10 text-red-500',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export default function LeavePage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: leaveRequests, isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests', statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('leave_type', typeFilter);
      const res = await api.get(`/employees/leave?${params}`);
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
      return api.post(`/employees/leave/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Заявка одобрена');
    },
    onError: () => {
      toast.error('Не удалось одобрить заявку');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api.post(`/employees/leave/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Заявка отклонена');
      setRejectDialogId(null);
      setRejectReason('');
    },
    onError: () => {
      toast.error('Не удалось отклонить заявку');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/employees/leave/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Заявка отменена');
    },
    onError: () => {
      toast.error('Не удалось отменить заявку');
    },
  });

  const requests = leaveRequests || [];
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'PENDING').length,
    approvedThisMonth: requests.filter((r) => {
      if (r.status !== 'APPROVED') return false;
      const now = new Date();
      const created = new Date(r.created_at);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length,
    onLeaveNow: requests.filter((r) => {
      if (r.status !== 'APPROVED') return false;
      const now = new Date();
      return new Date(r.start_date) <= now && new Date(r.end_date) >= now;
    }).length,
  };

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
              <CalendarDays className="w-5 h-5 text-primary" />
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
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Ожидает решения</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approvedThisMonth}</p>
              <p className="text-sm text-muted-foreground">Одобрено в этом месяце</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <CalendarOff className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.onLeaveNow}</p>
              <p className="text-sm text-muted-foreground">Сейчас в отпуске</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
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
              {Object.entries(leaveStatusLabels).map(([value, label]) => (
                <DropdownMenuItem key={value} onClick={() => setStatusFilter(value)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <CalendarDays className="w-4 h-4 mr-2" />
                Тип отпуска
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                Все типы
              </DropdownMenuItem>
              {Object.entries(leaveTypeLabels).map(([value, label]) => (
                <DropdownMenuItem key={value} onClick={() => setTypeFilter(value)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Создать заявку
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Новая заявка на отпуск</DialogTitle>
            </DialogHeader>
            <LeaveRequestForm
              employees={employees || []}
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialogId} onOpenChange={(open) => { if (!open) { setRejectDialogId(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить заявку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Причина отклонения</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm min-h-[80px] resize-none"
                placeholder="Укажите причину отклонения"
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setRejectDialogId(null); setRejectReason(''); }}>
                Отмена
              </Button>
              <Button
                variant="destructive"
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                onClick={() => rejectDialogId && rejectMutation.mutate({ id: rejectDialogId, reason: rejectReason })}
              >
                {rejectMutation.isPending ? 'Отклонение...' : 'Отклонить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сотрудник</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Период</TableHead>
              <TableHead>Дней</TableHead>
              <TableHead>Причина</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Действия</TableHead>
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
            ) : requests.length ? (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {request.employee?.firstName?.[0]}
                          {request.employee?.lastName?.[0]}
                        </span>
                      </div>
                      <span className="font-medium">
                        {request.employee?.firstName} {request.employee?.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={leaveTypeColors[request.leave_type] || 'bg-muted text-muted-foreground'}>
                      {leaveTypeLabels[request.leave_type] || request.leave_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(request.start_date).toLocaleDateString('ru-RU')} --{' '}
                      {new Date(request.end_date).toLocaleDateString('ru-RU')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{request.total_days}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                      {request.reason || '--'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={leaveStatusColors[request.status] || 'bg-muted text-muted-foreground'}>
                      {leaveStatusLabels[request.status] || request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {request.status === 'PENDING' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => approveMutation.mutate(request.id)}
                            disabled={approveMutation.isPending}
                            title="Одобрить"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setRejectDialogId(request.id)}
                            title="Отклонить"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {(request.status === 'PENDING' || request.status === 'APPROVED') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => cancelMutation.mutate(request.id)}
                          disabled={cancelMutation.isPending}
                          title="Отменить"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Заявки на отпуск не найдены</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function LeaveRequestForm({
  employees,
  onSuccess,
}: {
  employees: Employee[];
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/employees/leave', data);
    },
    onSuccess: () => {
      toast.success('Заявка создана');
      onSuccess();
    },
    onError: () => {
      toast.error('Не удалось создать заявку');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const totalDays = (() => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  })();

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
      <div>
        <label className="text-sm font-medium">Тип отпуска</label>
        <Select
          value={formData.leave_type}
          onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите тип" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(leaveTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Дата начала</label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Дата окончания</label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            min={formData.start_date}
            required
          />
        </div>
      </div>
      {totalDays > 0 && (
        <p className="text-sm text-muted-foreground">
          Итого дней: <span className="font-semibold text-foreground">{totalDays}</span>
        </p>
      )}
      <div>
        <label className="text-sm font-medium">Причина</label>
        <Textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm min-h-[80px] resize-none"
          placeholder="Причина отпуска"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          disabled={mutation.isPending || !formData.employee_id || !formData.leave_type || !formData.start_date || !formData.end_date}
        >
          {mutation.isPending ? 'Создание...' : 'Создать заявку'}
        </Button>
      </div>
    </form>
  );
}
