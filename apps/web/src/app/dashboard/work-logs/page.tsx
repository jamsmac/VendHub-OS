'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Search,
  MapPin,
  Play,
  CheckCircle2,
  XCircle,
  Download,
  Timer,
  CalendarDays,
  FileText,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface WorkLog {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
  };
  type: 'shift' | 'task' | 'break' | 'overtime';
  clockIn: string;
  clockOut?: string;
  duration?: number; // minutes
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  machine?: {
    name: string;
    serialNumber: string;
  };
  notes?: string;
  status: 'active' | 'completed' | 'approved' | 'rejected';
  createdAt: string;
}

interface TimeOffRequest {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
  };
  type: 'vacation' | 'sick' | 'personal' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

const workLogTypeLabels: Record<string, string> = {
  shift: 'Смена',
  task: 'Задача',
  break: 'Перерыв',
  overtime: 'Переработка',
};

const workLogTypeColors: Record<string, string> = {
  shift: 'bg-blue-500/10 text-blue-500',
  task: 'bg-green-500/10 text-green-500',
  break: 'bg-amber-500/10 text-amber-500',
  overtime: 'bg-purple-500/10 text-purple-500',
};

const statusLabels: Record<string, string> = {
  active: 'Активен',
  completed: 'Завершён',
  approved: 'Одобрен',
  rejected: 'Отклонён',
  pending: 'Ожидает',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500',
  completed: 'bg-blue-500/10 text-blue-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-red-500/10 text-red-500',
  pending: 'bg-amber-500/10 text-amber-500',
};

const timeOffTypeLabels: Record<string, string> = {
  vacation: 'Отпуск',
  sick: 'Больничный',
  personal: 'Личные',
  unpaid: 'За свой счёт',
};

const timeOffTypeColors: Record<string, string> = {
  vacation: 'bg-blue-500/10 text-blue-500',
  sick: 'bg-red-500/10 text-red-500',
  personal: 'bg-purple-500/10 text-purple-500',
  unpaid: 'bg-muted text-muted-foreground',
};

export default function WorkLogsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('logs');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter] = useState<string>('today');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch work logs
  const { data: workLogs, isLoading: logsLoading, isError: logsError } = useQuery<WorkLog[]>({
    queryKey: ['work-logs', debouncedSearch, dateFilter, selectedDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('date', selectedDate);
      const res = await api.get(`/work-logs?${params}`);
      return res.data;
    },
    enabled: activeTab === 'logs',
  });

  // Fetch time off requests
  const { data: timeOffRequests, isLoading: timeOffLoading } = useQuery<TimeOffRequest[]>({
    queryKey: ['time-off-requests', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await api.get(`/work-logs/time-off?${params}`);
      return res.data;
    },
    enabled: activeTab === 'time-off',
  });

  // Approve time off mutation
  const approveTimeOffMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      return api.post(`/work-logs/time-off/${id}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
      toast.success('Статус обновлён');
    },
    onError: () => {
      toast.error('Ошибка обновления');
    },
  });

  // Approve work log mutation
  const approveWorkLogMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      return api.post(`/work-logs/${id}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-logs'] });
      toast.success('Статус обновлён');
    },
    onError: () => {
      toast.error('Ошибка обновления');
    },
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const stats = useMemo(() => ({
    totalHours: workLogs?.reduce((sum, log) => sum + (log.duration || 0), 0) || 0,
    activeNow: workLogs?.filter((l) => l.status === 'active').length || 0,
    pendingApproval: workLogs?.filter((l) => l.status === 'completed').length || 0,
    pendingTimeOff: timeOffRequests?.filter((r) => r.status === 'pending').length || 0,
  }), [workLogs, timeOffRequests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Табель учёта</h1>
          <p className="text-muted-foreground">
            Учёт рабочего времени и отпусков
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Отчёт
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Timer className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatDuration(stats.totalHours)}</p>
              <p className="text-sm text-muted-foreground">Всего часов</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Play className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.activeNow}</p>
              <p className="text-sm text-muted-foreground">Сейчас работают</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendingApproval}</p>
              <p className="text-sm text-muted-foreground">Ожидают подтверждения</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendingTimeOff}</p>
              <p className="text-sm text-muted-foreground">Заявок на отпуск</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="logs">
            <Clock className="w-4 h-4 mr-2" />
            Рабочее время
          </TabsTrigger>
          <TabsTrigger value="time-off">
            <CalendarDays className="w-4 h-4 mr-2" />
            Отпуска
            {stats.pendingTimeOff > 0 && (
              <Badge className="ml-2 bg-amber-500">{stats.pendingTimeOff}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Work Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по сотруднику..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Начало</TableHead>
                  <TableHead>Окончание</TableHead>
                  <TableHead>Длительность</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-24">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : workLogs?.length ? (
                  workLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {log.employee.firstName[0]}
                              {log.employee.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {log.employee.firstName} {log.employee.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {log.employee.position}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={workLogTypeColors[log.type]}>
                          {workLogTypeLabels[log.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {new Date(log.clockIn).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {log.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {log.location.address?.slice(0, 20)}...
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.clockOut ? (
                          <p className="font-medium">
                            {new Date(log.clockOut).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        ) : (
                          <Badge className="bg-green-500/10 text-green-500">
                            <Play className="w-3 h-3 mr-1" />
                            Активен
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.duration ? (
                          <span className="font-medium">{formatDuration(log.duration)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[log.status]}>
                          {statusLabels[log.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.status === 'completed' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-500 hover:text-green-600"
                              onClick={() => approveWorkLogMutation.mutate({ id: log.id, action: 'approve' })}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              onClick={() => approveWorkLogMutation.mutate({ id: log.id, action: 'reject' })}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Записей не найдено</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="time-off" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по сотруднику..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

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
                  <TableHead className="w-24">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeOffLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : timeOffRequests?.length ? (
                  timeOffRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {request.employee.firstName[0]}
                              {request.employee.lastName[0]}
                            </span>
                          </div>
                          <p className="font-medium">
                            {request.employee.firstName} {request.employee.lastName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={timeOffTypeColors[request.type]}>
                          {timeOffTypeLabels[request.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {new Date(request.startDate).toLocaleDateString('ru-RU')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          — {new Date(request.endDate).toLocaleDateString('ru-RU')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{request.days}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm line-clamp-2">{request.reason || '—'}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[request.status]}>
                          {statusLabels[request.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-500 hover:text-green-600"
                              onClick={() => approveTimeOffMutation.mutate({ id: request.id, action: 'approve' })}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              onClick={() => approveTimeOffMutation.mutate({ id: request.id, action: 'reject' })}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Заявок не найдено</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
