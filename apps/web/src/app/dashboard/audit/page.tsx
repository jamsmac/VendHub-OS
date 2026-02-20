'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FileText,
  Search,
  Filter,
  Shield,
  AlertTriangle,
  Clock,
  User,
  Eye,
  Activity,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { auditApi } from '@/lib/api';

interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  action: string;
  category?: string;
  severity?: string;
  description?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: { field: string; oldValue: any; newValue: any }[];
  ipAddress?: string;
  isSuccess: boolean;
  errorMessage?: string;
  createdAt: string;
}

interface AuditStats {
  totalEvents: number;
  byAction: Record<string, number>;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byEntityType: Record<string, number>;
  securityEvents: number;
  failedOperations: number;
}

const severityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  debug: { label: 'Отладка', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  info: { label: 'Инфо', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  warning: { label: 'Внимание', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  error: { label: 'Ошибка', color: 'text-red-600', bgColor: 'bg-red-100' },
  critical: { label: 'Критично', color: 'text-red-800', bgColor: 'bg-red-200' },
};

const actionLabels: Record<string, string> = {
  create: 'Создание',
  update: 'Изменение',
  delete: 'Удаление',
  soft_delete: 'Мягкое удаление',
  restore: 'Восстановление',
  login: 'Вход',
  logout: 'Выход',
  login_failed: 'Неудачный вход',
  password_change: 'Смена пароля',
  password_reset: 'Сброс пароля',
  permission_change: 'Изменение прав',
  settings_change: 'Изменение настроек',
  export: 'Экспорт',
  import: 'Импорт',
  bulk_update: 'Массовое обновление',
  bulk_delete: 'Массовое удаление',
  payment_processed: 'Платёж',
  refund_issued: 'Возврат',
  machine_status_change: 'Смена статуса автомата',
  inventory_adjustment: 'Корректировка запаса',
  fiscal_operation: 'Фискальная операция',
};

const categoryLabels: Record<string, string> = {
  authentication: 'Аутентификация',
  authorization: 'Авторизация',
  data_access: 'Доступ к данным',
  data_modification: 'Изменение данных',
  system: 'Система',
  security: 'Безопасность',
  compliance: 'Соответствие',
  financial: 'Финансы',
  operational: 'Операции',
  integration: 'Интеграции',
};

function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function LogCardSkeleton() {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['audit', 'logs', debouncedSearch, severityFilter, categoryFilter],
    queryFn: () =>
      auditApi
        .getLogs({
          search: debouncedSearch || undefined,
          severity: severityFilter ? [severityFilter] : undefined,
          category: categoryFilter ? [categoryFilter] : undefined,
          limit: 50,
        })
        .then((res) => res.data.data || res.data),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['audit', 'statistics'],
    queryFn: () =>
      auditApi
        .getStatistics({
          dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          dateTo: new Date().toISOString(),
        })
        .then((res) => res.data),
  });

  const logList: AuditLog[] = Array.isArray(logs) ? logs : [];
  const stats: AuditStats | null = statsData || null;

  const quickStats = useMemo(() => ({
    total: stats?.totalEvents || logList.length,
    security: stats?.securityEvents || 0,
    failed: stats?.failedOperations || logList.filter((l) => !l.isSuccess).length,
    today: logList.filter(
      (l) => new Date(l.createdAt).toDateString() === new Date().toDateString()
    ).length,
  }), [stats, logList]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить журнал аудита</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['audit'] })}>
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
          <h1 className="text-3xl font-bold">Аудит</h1>
          <p className="text-muted-foreground">Журнал действий и безопасности системы</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['audit'] });
            toast.success('Данные обновлены');
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {statsLoading || isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Всего событий</p>
                    <p className="text-2xl font-bold">{quickStats.total}</p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Безопасность</p>
                    <p className="text-2xl font-bold text-yellow-600">{quickStats.security}</p>
                  </div>
                  <Shield className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ошибки</p>
                    <p className="text-2xl font-bold text-red-600">{quickStats.failed}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Сегодня</p>
                    <p className="text-2xl font-bold text-blue-600">{quickStats.today}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по действиям, пользователям..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Поиск в журнале аудита"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {severityFilter ? severityConfig[severityFilter]?.label : 'Важность'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSeverityFilter(null)}>
              Все уровни
            </DropdownMenuItem>
            {Object.entries(severityConfig).map(([key, config]) => (
              <DropdownMenuItem key={key} onClick={() => setSeverityFilter(key)}>
                {config.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {categoryFilter ? categoryLabels[categoryFilter] : 'Категория'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setCategoryFilter(null)}>
              Все категории
            </DropdownMenuItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <DropdownMenuItem key={key} onClick={() => setCategoryFilter(key)}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Audit Log List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => <LogCardSkeleton key={i} />)}
        </div>
      ) : logList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Записей не найдено</p>
            <p className="text-muted-foreground">Нет записей аудита по выбранным фильтрам</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logList.map((log: AuditLog) => {
            const severity = severityConfig[log.severity || 'info'] || severityConfig.info;

            return (
              <Card
                key={log.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${log.isSuccess ? 'bg-muted' : 'bg-red-100'}`}>
                        {log.isSuccess ? (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {actionLabels[log.action] || log.action}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${severity.bgColor} ${severity.color}`}>
                            {severity.label}
                          </span>
                          {log.category && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {categoryLabels[log.category] || log.category}
                            </span>
                          )}
                          {!log.isSuccess && (
                            <Badge variant="destructive" className="text-xs">Ошибка</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {log.userName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.userName}
                            </span>
                          )}
                          {log.entityType && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {log.entityName || log.entityType}
                            </span>
                          )}
                          {log.description && (
                            <span className="max-w-[300px] truncate">{log.description}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString('ru-RU')}
                      </p>
                      {log.ipAddress && (
                        <p className="text-xs text-muted-foreground mt-0.5">{log.ipAddress}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Детали записи аудита
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Действие</p>
                  <p className="font-medium">{actionLabels[selectedLog.action] || selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Статус</p>
                  <Badge variant={selectedLog.isSuccess ? 'default' : 'destructive'}>
                    {selectedLog.isSuccess ? 'Успешно' : 'Ошибка'}
                  </Badge>
                </div>
                {selectedLog.userName && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Пользователь</p>
                    <p>{selectedLog.userName}</p>
                    {selectedLog.userEmail && (
                      <p className="text-sm text-muted-foreground">{selectedLog.userEmail}</p>
                    )}
                  </div>
                )}
                {selectedLog.userRole && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Роль</p>
                    <p>{selectedLog.userRole}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Объект</p>
                  <p>{selectedLog.entityName || selectedLog.entityType}</p>
                  {selectedLog.entityId && (
                    <p className="text-xs text-muted-foreground font-mono">{selectedLog.entityId}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Дата и время</p>
                  <p>{new Date(selectedLog.createdAt).toLocaleString('ru-RU')}</p>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">IP-адрес</p>
                    <p className="font-mono">{selectedLog.ipAddress}</p>
                  </div>
                )}
                {selectedLog.severity && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Важность</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${severityConfig[selectedLog.severity]?.bgColor} ${severityConfig[selectedLog.severity]?.color}`}>
                      {severityConfig[selectedLog.severity]?.label}
                    </span>
                  </div>
                )}
              </div>

              {selectedLog.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Описание</p>
                  <p className="text-sm">{selectedLog.description}</p>
                </div>
              )}

              {selectedLog.errorMessage && (
                <div>
                  <p className="text-sm font-medium text-red-500 mb-1">Сообщение об ошибке</p>
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg font-mono">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}

              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Изменения</p>
                  <div className="border rounded-lg divide-y">
                    {selectedLog.changes.map((change, i) => (
                      <div key={i} className="p-3 text-sm">
                        <p className="font-medium">{change.field}</p>
                        <div className="flex gap-4 mt-1">
                          <span className="text-red-500 line-through">
                            {JSON.stringify(change.oldValue)}
                          </span>
                          <span className="text-green-600">
                            {JSON.stringify(change.newValue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
