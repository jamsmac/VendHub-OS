'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MessageSquare,
  Search,
  Filter,
  MoreVertical,
  Clock,
  User,
  Coffee,
  Phone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  MessageCircle,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Complaint {
  id: string;
  complaintNumber: string;
  complaintType: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
  description: string;
  customerPhone?: string;
  machine?: {
    id: string;
    name: string;
    address?: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName?: string;
  };
  refund?: {
    amount: number;
    status: string;
  };
  createdAt: string;
  resolvedAt?: string;
  slaDeadline?: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Ожидает', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  assigned: { label: 'Назначена', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  in_progress: { label: 'В работе', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  resolved: { label: 'Решена', color: 'text-green-600', bgColor: 'bg-green-100' },
  closed: { label: 'Закрыта', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  rejected: { label: 'Отклонена', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const typeConfig: Record<string, { label: string; icon: string }> = {
  product_not_dispensed: { label: 'Не выдан товар', icon: '💰' },
  product_defective: { label: 'Неисправный товар', icon: '⚠️' },
  product_not_available: { label: 'Нет товара', icon: '❌' },
  payment_issue: { label: 'Проблема с оплатой', icon: '💳' },
  machine_malfunction: { label: 'Неисправность', icon: '🔧' },
  machine_dirty: { label: 'Грязный аппарат', icon: '🧹' },
  other: { label: 'Другое', icon: '💬' },
};

export default function ComplaintsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: complaints, isLoading, isError } = useQuery({
    queryKey: ['complaints', debouncedSearch, statusFilter],
    queryFn: () =>
      api.get('/complaints', { params: { search: debouncedSearch, status: statusFilter } })
        .then((res) => res.data.data),
  });

  // Stats
  const stats = useMemo(() => ({
    total: complaints?.length || 0,
    pending: complaints?.filter((c: Complaint) => c.status === 'pending').length || 0,
    inProgress: complaints?.filter((c: Complaint) => c.status === 'in_progress').length || 0,
    overdue: complaints?.filter((c: Complaint) =>
      c.slaDeadline && new Date(c.slaDeadline) < new Date() && !['resolved', 'closed', 'rejected'].includes(c.status)
    ).length || 0,
  }), [complaints]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить жалобы</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['complaints'] })}>
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
          <h1 className="text-3xl font-bold">Жалобы</h1>
          <p className="text-muted-foreground">
            Управление обращениями клиентов
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/complaints/qr-codes">
            <Button variant="outline">
              QR-коды
            </Button>
          </Link>
          <Link href="/dashboard/complaints/settings">
            <Button variant="outline">
              SLA настройки
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ожидают</p>
                <p className="text-2xl font-bold text-muted-foreground">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">В работе</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Просрочено SLA</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру или телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilter ? statusConfig[statusFilter]?.label : 'Все статусы'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter(null)}>
              Все статусы
            </DropdownMenuItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                {config.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Complaint List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : complaints?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Жалобы не найдены</p>
            <p className="text-muted-foreground">
              Когда клиенты оставят жалобы, они появятся здесь
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {complaints?.map((complaint: Complaint) => {
            const status = statusConfig[complaint.status] || statusConfig.pending;
            const type = typeConfig[complaint.complaintType] || { label: complaint.complaintType, icon: '📋' };
            const isOverdue = complaint.slaDeadline && new Date(complaint.slaDeadline) < new Date() && !['resolved', 'closed', 'rejected'].includes(complaint.status);

            return (
              <Card key={complaint.id} className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{type.icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            #{complaint.complaintNumber} - {type.label}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                          {isOverdue && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                              Просрочено SLA
                            </span>
                          )}
                          {complaint.refund && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              Возврат
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {complaint.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {complaint.machine && (
                            <span className="flex items-center gap-1">
                              <Coffee className="h-3 w-3" />
                              {complaint.machine.name}
                            </span>
                          )}
                          {complaint.customerPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {complaint.customerPhone}
                            </span>
                          )}
                          {complaint.assignedTo && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {complaint.assignedTo.firstName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(complaint.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/complaints/${complaint.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Открыть
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label="Действия">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <User className="h-4 w-4 mr-2" />
                            Назначить
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Комментарий
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Создать возврат
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-green-600">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Решить
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <XCircle className="h-4 w-4 mr-2" />
                            Отклонить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
