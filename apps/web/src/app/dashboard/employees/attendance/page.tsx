'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Clock,
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  CalendarDays,
  LogIn,
  LogOut,
  Plus,
  Timer,
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

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee?: { id: string; firstName: string; lastName: string };
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  total_hours?: number;
  overtime_hours?: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
  note?: string;
  location?: string;
}

interface DailyReport {
  total_employees: number;
  present: number;
  late: number;
  absent: number;
  on_leave: number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const statusLabels: Record<string, string> = {
  PRESENT: 'Присутствует',
  ABSENT: 'Отсутствует',
  LATE: 'Опоздание',
  HALF_DAY: 'Полдня',
  ON_LEAVE: 'В отпуске',
};

const statusColors: Record<string, string> = {
  PRESENT: 'bg-green-500/10 text-green-500',
  ABSENT: 'bg-red-500/10 text-red-500',
  LATE: 'bg-amber-500/10 text-amber-500',
  HALF_DAY: 'bg-blue-500/10 text-blue-500',
  ON_LEAVE: 'bg-violet-500/10 text-violet-500',
};

export default function AttendancePage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);

  const { data: attendance, isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/employees/attendance?date=${selectedDate}`);
      return res.data;
    },
  });

  const { data: dailyReport } = useQuery<DailyReport>({
    queryKey: ['attendance-daily-report', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/employees/attendance/daily-report?date=${selectedDate}`);
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

  const stats = dailyReport || {
    total_employees: 0,
    present: 0,
    late: 0,
    absent: 0,
    on_leave: 0,
  };

  const formatTime = (time?: string) => {
    if (!time) return '--';
    return new Date(time).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatHours = (hours?: number) => {
    if (!hours && hours !== 0) return '--';
    return `${hours.toFixed(1)} ч`;
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
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total_employees}</p>
              <p className="text-sm text-muted-foreground">Всего</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.present}</p>
              <p className="text-sm text-muted-foreground">Присутствует</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.late}</p>
              <p className="text-sm text-muted-foreground">Опоздал</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <UserX className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.absent}</p>
              <p className="text-sm text-muted-foreground">Отсутствует</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.on_leave}</p>
              <p className="text-sm text-muted-foreground">В отпуске</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Дата:</label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-48"
          />
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
            <DialogTrigger asChild>
              <Button>
                <LogIn className="w-4 h-4 mr-2" />
                Отметить приход
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Отметить приход</DialogTitle>
              </DialogHeader>
              <CheckInForm
                employees={employees || []}
                onSuccess={() => {
                  setIsCheckInOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['attendance'] });
                  queryClient.invalidateQueries({ queryKey: ['attendance-daily-report'] });
                }}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Отметить уход
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Отметить уход</DialogTitle>
              </DialogHeader>
              <CheckOutForm
                employees={employees || []}
                onSuccess={() => {
                  setIsCheckOutOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['attendance'] });
                  queryClient.invalidateQueries({ queryKey: ['attendance-daily-report'] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сотрудник</TableHead>
              <TableHead>Приход</TableHead>
              <TableHead>Уход</TableHead>
              <TableHead>Отработано</TableHead>
              <TableHead>Переработка</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : attendance?.length ? (
              attendance.map((record) => (
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
                    <div className="flex items-center gap-1">
                      <LogIn className="w-3.5 h-3.5 text-green-500" />
                      {formatTime(record.check_in_time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      {formatTime(record.check_out_time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                      {formatHours(record.total_hours)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.overtime_hours && record.overtime_hours > 0 ? (
                      <span className="text-amber-600 font-medium">
                        +{formatHours(record.overtime_hours)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[record.status]}>
                      {statusLabels[record.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Нет данных о посещаемости за выбранную дату</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CheckInForm({
  employees,
  onSuccess,
}: {
  employees: Employee[];
  onSuccess: () => void;
}) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [formData, setFormData] = useState({
    employee_id: '',
    time: timeStr,
    note: '',
    location: '',
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/employees/attendance/check-in', {
        employee_id: data.employee_id,
        time: data.time,
        note: data.note || undefined,
        location: data.location || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Приход отмечен');
      onSuccess();
    },
    onError: () => {
      toast.error('Не удалось отметить приход');
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
      <div>
        <label className="text-sm font-medium">Время</label>
        <Input
          type="time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Заметка (необязательно)</label>
        <Input
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          placeholder="Причина или комментарий"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Локация (необязательно)</label>
        <Input
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Офис, удаленно и т.д."
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={mutation.isPending || !formData.employee_id}>
          {mutation.isPending ? 'Сохранение...' : 'Отметить приход'}
        </Button>
      </div>
    </form>
  );
}

function CheckOutForm({
  employees,
  onSuccess,
}: {
  employees: Employee[];
  onSuccess: () => void;
}) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [formData, setFormData] = useState({
    employee_id: '',
    time: timeStr,
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/employees/attendance/check-out', {
        employee_id: data.employee_id,
        time: data.time,
      });
    },
    onSuccess: () => {
      toast.success('Уход отмечен');
      onSuccess();
    },
    onError: () => {
      toast.error('Не удалось отметить уход');
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
      <div>
        <label className="text-sm font-medium">Время</label>
        <Input
          type="time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          required
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={mutation.isPending || !formData.employee_id}>
          {mutation.isPending ? 'Сохранение...' : 'Отметить уход'}
        </Button>
      </div>
    </form>
  );
}
