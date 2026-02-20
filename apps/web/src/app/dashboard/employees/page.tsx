'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  UserCog,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Mail,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  role: 'admin' | 'manager' | 'operator' | 'warehouse' | 'accountant';
  status: 'active' | 'inactive' | 'on_leave';
  hireDate: string;
  salary?: number;
  address?: string;
  photoUrl?: string;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  operator: 'Оператор',
  warehouse: 'Кладовщик',
  accountant: 'Бухгалтер',
};

const statusLabels: Record<string, string> = {
  active: 'Активный',
  inactive: 'Неактивный',
  on_leave: 'В отпуске',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500',
  inactive: 'bg-red-500/10 text-red-500',
  on_leave: 'bg-amber-500/10 text-amber-500',
};

export default function EmployeesPage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch employees
  const { data: employees, isLoading, isError } = useQuery<Employee[]>({
    queryKey: ['employees', debouncedSearch, statusFilter, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      const res = await api.get(`/employees?${params}`);
      return res.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Сотрудник удалён');
    },
    onError: () => {
      toast.error('Не удалось удалить сотрудника');
    },
  });

  const stats = useMemo(() => ({
    total: employees?.length || 0,
    active: employees?.filter((e) => e.status === 'active').length || 0,
    onLeave: employees?.filter((e) => e.status === 'on_leave').length || 0,
    inactive: employees?.filter((e) => e.status === 'inactive').length || 0,
  }), [employees]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить сотрудников</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}>
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
          <h1 className="text-2xl font-bold">Сотрудники</h1>
          <p className="text-muted-foreground">
            Управление персоналом организации
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Добавить сотрудника
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Новый сотрудник</DialogTitle>
            </DialogHeader>
            <EmployeeForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['employees'] });
              }}
            />
          </DialogContent>
        </Dialog>
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
              <UserCog className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Всего</p>
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
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.onLeave}</p>
              <p className="text-sm text-muted-foreground">В отпуске</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inactive}</p>
              <p className="text-sm text-muted-foreground">Неактивных</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск сотрудников..."
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
            <DropdownMenuItem onClick={() => setStatusFilter('active')}>
              Активные
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('on_leave')}>
              В отпуске
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
              Неактивные
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Briefcase className="w-4 h-4 mr-2" />
              Роль
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setRoleFilter('all')}>
              Все роли
            </DropdownMenuItem>
            {Object.entries(roleLabels).map(([value, label]) => (
              <DropdownMenuItem key={value} onClick={() => setRoleFilter(value)}>
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
              <TableHead>Сотрудник</TableHead>
              <TableHead>Должность</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Контакты</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата найма</TableHead>
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
            ) : employees?.length ? (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {employee.photoUrl ? (
                          <img
                            src={employee.photoUrl}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-primary">
                            {employee.firstName[0]}
                            {employee.lastName[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {employee.department}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{roleLabels[employee.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3" />
                        {employee.phone}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {employee.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[employee.status]}>
                      {statusLabels[employee.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(employee.hireDate).toLocaleDateString('ru-RU')}
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
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(employee.id)}
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
                  <UserCog className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Сотрудники не найдены</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Employee Form Component
function EmployeeForm({ employee, onSuccess }: { employee?: Employee; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    position: employee?.position || '',
    department: employee?.department || '',
    role: employee?.role || 'operator',
    hireDate: employee?.hireDate || new Date().toISOString().split('T')[0],
    salary: employee?.salary || '',
    address: employee?.address || '',
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (employee) {
        return api.patch(`/employees/${employee.id}`, data);
      }
      return api.post('/employees', data);
    },
    onSuccess: () => {
      toast.success(employee ? 'Сотрудник обновлён' : 'Сотрудник добавлен');
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Имя</label>
          <Input
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Фамилия</label>
          <Input
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
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
          <label className="text-sm font-medium">Должность</label>
          <Input
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Отдел</label>
          <Input
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Роль</label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите роль" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(roleLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Дата найма</label>
          <Input
            type="date"
            value={formData.hireDate}
            onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
            required
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
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Сохранение...' : employee ? 'Обновить' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}
