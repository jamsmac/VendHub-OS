'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BellDot,
  BellOff,
  Send,
  AlertTriangle,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCheck,
  ClipboardList,
  Package,
  CreditCard,
  Wrench,
  Plus,
  FileText,
  Zap,
  Users,
  Mail,
  Smartphone,
  MessageSquare,
  Save,
  Edit,
  ExternalLink,
  Megaphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'system' | 'task' | 'inventory' | 'payment' | 'alert' | 'maintenance';
  channels: ('push' | 'email' | 'sms' | 'telegram' | 'in_app')[];
  priority: 'high' | 'medium' | 'low';
  status: 'read' | 'unread';
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
  read_at?: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'system' | 'task' | 'inventory' | 'payment' | 'alert' | 'maintenance';
  channels: ('push' | 'email' | 'sms' | 'telegram')[];
  subject: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

interface NotificationRule {
  id: string;
  name: string;
  event: string;
  conditions: string;
  recipients: string;
  channels: ('push' | 'email' | 'sms' | 'telegram')[];
  is_active: boolean;
  created_at: string;
}

interface NotificationCampaign {
  id: string;
  name: string;
  message: string;
  audience_count: number;
  channels: ('push' | 'email' | 'sms' | 'telegram')[];
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  scheduled_at?: string;
  created_at: string;
}

interface ChannelSettings {
  push: boolean;
  email: boolean;
  sms: boolean;
  telegram: boolean;
  in_app: boolean;
  sound: boolean;
}

interface TypeChannelPreferences {
  [type: string]: {
    push: boolean;
    email: boolean;
    sms: boolean;
    telegram: boolean;
  };
}

// ─── Constants / Mappings ─────────────────────────────────────

const typeLabels: Record<string, string> = {
  system: 'Системное',
  task: 'Задача',
  inventory: 'Инвентарь',
  payment: 'Платёж',
  alert: 'Тревога',
  maintenance: 'Обслуживание',
};

const typeIcons: Record<string, React.ReactNode> = {
  system: <Bell className="w-4 h-4" />,
  task: <ClipboardList className="w-4 h-4" />,
  inventory: <Package className="w-4 h-4" />,
  payment: <CreditCard className="w-4 h-4" />,
  alert: <AlertTriangle className="w-4 h-4" />,
  maintenance: <Wrench className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  system: 'bg-blue-500/10 text-blue-500',
  task: 'bg-violet-500/10 text-violet-500',
  inventory: 'bg-orange-500/10 text-orange-500',
  payment: 'bg-emerald-500/10 text-emerald-500',
  alert: 'bg-red-500/10 text-red-500',
  maintenance: 'bg-amber-500/10 text-amber-500',
};

const channelLabels: Record<string, string> = {
  push: 'Push',
  email: 'Email',
  sms: 'SMS',
  telegram: 'Telegram',
  in_app: 'In-App',
};

const channelColors: Record<string, string> = {
  push: 'bg-blue-500/10 text-blue-600',
  email: 'bg-green-500/10 text-green-600',
  sms: 'bg-purple-500/10 text-purple-600',
  telegram: 'bg-sky-500/10 text-sky-600',
  in_app: 'bg-muted text-muted-foreground',
};

const priorityLabels: Record<string, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/10 text-red-500',
  medium: 'bg-amber-500/10 text-amber-500',
  low: 'bg-green-500/10 text-green-500',
};

const campaignStatusLabels: Record<string, string> = {
  draft: 'Черновик',
  scheduled: 'Запланировано',
  sent: 'Отправлено',
  cancelled: 'Отменено',
};

const campaignStatusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-500/10 text-blue-500',
  sent: 'bg-green-500/10 text-green-500',
  cancelled: 'bg-red-500/10 text-red-500',
};

const eventOptions = [
  { value: 'machine.offline', label: 'Автомат оффлайн' },
  { value: 'machine.error', label: 'Ошибка автомата' },
  { value: 'inventory.low', label: 'Низкий запас' },
  { value: 'inventory.empty', label: 'Закончился товар' },
  { value: 'task.created', label: 'Задача создана' },
  { value: 'task.assigned', label: 'Задача назначена' },
  { value: 'task.completed', label: 'Задача завершена' },
  { value: 'task.overdue', label: 'Задача просрочена' },
  { value: 'payment.received', label: 'Платёж получен' },
  { value: 'payment.failed', label: 'Ошибка платежа' },
  { value: 'maintenance.due', label: 'Плановое обслуживание' },
  { value: 'alert.critical', label: 'Критическая тревога' },
];

const recipientOptions = [
  { value: 'all_admins', label: 'Все администраторы' },
  { value: 'all_managers', label: 'Все менеджеры' },
  { value: 'all_operators', label: 'Все операторы' },
  { value: 'machine_owner', label: 'Владелец автомата' },
  { value: 'assigned_operator', label: 'Назначенный оператор' },
  { value: 'warehouse_staff', label: 'Склад' },
  { value: 'accountants', label: 'Бухгалтерия' },
];

// ─── Main Page Component ──────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // --- All Tab State ---
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // --- Templates Tab State ---
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  // --- Rules Tab State ---
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);

  // --- Campaigns Tab State ---
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<NotificationCampaign | null>(null);

  // --- Settings Tab State ---
  const [channelSettings, setChannelSettings] = useState<ChannelSettings>({
    push: true,
    email: true,
    sms: false,
    telegram: true,
    in_app: true,
    sound: true,
  });
  const [typePreferences, setTypePreferences] = useState<TypeChannelPreferences>({
    system: { push: true, email: true, sms: false, telegram: true },
    task: { push: true, email: true, sms: true, telegram: true },
    inventory: { push: true, email: true, sms: false, telegram: false },
    payment: { push: false, email: true, sms: false, telegram: true },
    alert: { push: true, email: true, sms: true, telegram: true },
    maintenance: { push: true, email: true, sms: false, telegram: false },
  });

  // ─── Queries ──────────────────────────────────────────────

  const { data: notificationsRes, isLoading: notificationsLoading, isError: notificationsError } = useQuery({
    queryKey: ['notifications', debouncedSearch, typeFilter, channelFilter, priorityFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (channelFilter !== 'all') params.channel = channelFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/notifications', { params });
      return res.data;
    },
  });

  const notifications: Notification[] = notificationsRes?.data || notificationsRes || [];

  const { data: unreadCountRes } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return res.data;
    },
  });

  const unreadCount: number = unreadCountRes?.count ?? unreadCountRes ?? 0;

  const { data: templatesRes, isLoading: templatesLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const res = await api.get('/notifications/templates');
      return res.data;
    },
  });

  const templates: NotificationTemplate[] = templatesRes?.data || templatesRes || [];

  const { data: rulesRes, isLoading: rulesLoading } = useQuery({
    queryKey: ['notification-rules'],
    queryFn: async () => {
      const res = await api.get('/notifications/rules');
      return res.data;
    },
  });

  const rules: NotificationRule[] = rulesRes?.data || rulesRes || [];

  const { data: campaignsRes, isLoading: campaignsLoading } = useQuery({
    queryKey: ['notification-campaigns'],
    queryFn: async () => {
      const res = await api.get('/notifications/campaigns');
      return res.data;
    },
  });

  const campaigns: NotificationCampaign[] = campaignsRes?.data || campaignsRes || [];

  // ─── Stats ────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: notifications.length,
    unread: typeof unreadCount === 'number' ? unreadCount : notifications.filter((n) => n.status === 'unread').length,
    sentToday: notifications.filter((n) => {
      const today = new Date().toDateString();
      return new Date(n.created_at).toDateString() === today;
    }).length,
    errors: 0,
  }), [notifications, unreadCount]);

  // ─── Mutations ────────────────────────────────────────────

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Уведомление отмечено как прочитанное');
    },
    onError: () => {
      toast.error('Не удалось отметить как прочитанное');
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Все уведомления отмечены как прочитанные');
    },
    onError: () => {
      toast.error('Не удалось отметить все как прочитанные');
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Уведомление удалено');
    },
    onError: () => {
      toast.error('Не удалось удалить уведомление');
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: Partial<NotificationTemplate>) => {
      if (editingTemplate) {
        return api.patch(`/notifications/templates/${editingTemplate.id}`, data);
      }
      return api.post('/notifications/templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      toast.success(editingTemplate ? 'Шаблон обновлён' : 'Шаблон создан');
    },
    onError: () => {
      toast.error('Ошибка сохранения шаблона');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Шаблон удалён');
    },
    onError: () => {
      toast.error('Не удалось удалить шаблон');
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: Partial<NotificationRule>) => {
      if (editingRule) {
        return api.patch(`/notifications/rules/${editingRule.id}`, data);
      }
      return api.post('/notifications/rules', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
      setIsRuleDialogOpen(false);
      setEditingRule(null);
      toast.success(editingRule ? 'Правило обновлено' : 'Правило создано');
    },
    onError: () => {
      toast.error('Ошибка сохранения правила');
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await api.patch(`/notifications/rules/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
      toast.success('Статус правила обновлён');
    },
    onError: () => {
      toast.error('Ошибка обновления статуса');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
      toast.success('Правило удалено');
    },
    onError: () => {
      toast.error('Не удалось удалить правило');
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: Partial<NotificationCampaign>) => {
      if (editingCampaign) {
        return api.patch(`/notifications/campaigns/${editingCampaign.id}`, data);
      }
      return api.post('/notifications/campaigns', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-campaigns'] });
      setIsCampaignDialogOpen(false);
      setEditingCampaign(null);
      toast.success(editingCampaign ? 'Кампания обновлена' : 'Кампания создана');
    },
    onError: () => {
      toast.error('Ошибка сохранения кампании');
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-campaigns'] });
      toast.success('Кампания удалена');
    },
    onError: () => {
      toast.error('Не удалось удалить кампанию');
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { channels: ChannelSettings; preferences: TypeChannelPreferences }) => {
      await api.post('/notifications/settings', data);
    },
    onSuccess: () => {
      toast.success('Настройки сохранены');
    },
    onError: () => {
      toast.error('Ошибка сохранения настроек');
    },
  });

  // ─── Helpers ──────────────────────────────────────────────

  const openNotificationDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailOpen(true);
    if (notification.status === 'unread') {
      markReadMutation.mutate(notification.id);
    }
  };

  // ─── Render ───────────────────────────────────────────────

  if (notificationsError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить уведомления</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}>
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Центр уведомлений
              {stats.unread > 0 && (
                <Badge className="bg-red-500 text-white hover:bg-red-600">
                  {stats.unread}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              Управление уведомлениями и каналами доставки
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || stats.unread === 0}
        >
          <CheckCheck className="w-4 h-4 mr-2" />
          Прочитать все
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">Все</TabsTrigger>
          <TabsTrigger value="templates">Шаблоны</TabsTrigger>
          <TabsTrigger value="rules">Правила</TabsTrigger>
          <TabsTrigger value="campaigns">Кампании</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        {/* ═══════════ TAB 1: ALL NOTIFICATIONS ═══════════ */}
        <TabsContent value="all" className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Всего уведомлений</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <BellDot className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
                  <p className="text-sm text-muted-foreground">Непрочитанных</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.sentToday}</p>
                  <p className="text-sm text-muted-foreground">Отправлено сегодня</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                  <p className="text-sm text-muted-foreground">Ошибки доставки</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск уведомлений..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="system">Системное</SelectItem>
                <SelectItem value="task">Задача</SelectItem>
                <SelectItem value="inventory">Инвентарь</SelectItem>
                <SelectItem value="payment">Платёж</SelectItem>
                <SelectItem value="alert">Тревога</SelectItem>
                <SelectItem value="maintenance">Обслуживание</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Все каналы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все каналы</SelectItem>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="in_app">In-App</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Все" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все приоритеты</SelectItem>
                <SelectItem value="high">Высокий</SelectItem>
                <SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="low">Низкий</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Все" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="read">Прочитано</SelectItem>
                <SelectItem value="unread">Непрочитано</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notifications Table */}
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[300px]">Уведомление</TableHead>
                  <TableHead>Каналы</TableHead>
                  <TableHead>Приоритет</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notificationsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <TableRow
                      key={notification.id}
                      className={`cursor-pointer hover:bg-muted/50 ${notification.status === 'unread' ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''}`}
                      onClick={() => openNotificationDetail(notification)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${typeColors[notification.type] || 'bg-muted text-muted-foreground'}`}>
                            {typeIcons[notification.type] || <Bell className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium truncate ${notification.status === 'unread' ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground truncate max-w-[280px]">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {notification.channels.map((ch) => (
                            <Badge key={ch} variant="outline" className={`text-xs ${channelColors[ch] || ''}`}>
                              {channelLabels[ch] || ch}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[notification.priority]}>
                          {priorityLabels[notification.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${notification.status === 'unread' ? 'bg-blue-500' : 'bg-muted-foreground/30'}`}
                          />
                          <span className="text-sm">
                            {notification.status === 'unread' ? 'Непрочитано' : 'Прочитано'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(notification.created_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" aria-label="Действия">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {notification.status === 'unread' && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markReadMutation.mutate(notification.id);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Прочитать
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotificationMutation.mutate(notification.id);
                              }}
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
                    <TableCell colSpan={6} className="text-center py-12">
                      <BellOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Уведомления не найдены</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ═══════════ TAB 2: TEMPLATES ═══════════ */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Шаблоны уведомлений</h2>
              <p className="text-sm text-muted-foreground">
                Настройте шаблоны для автоматических уведомлений
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setIsTemplateDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать шаблон
            </Button>
          </div>

          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Каналы</TableHead>
                  <TableHead>Переменные</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templatesLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : templates.length > 0 ? (
                  templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{template.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeColors[template.type]}>
                          {typeLabels[template.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.channels.map((ch) => (
                            <Badge key={ch} variant="outline" className={`text-xs ${channelColors[ch]}`}>
                              {channelLabels[ch]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((v) => (
                            <code
                              key={v}
                              className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono"
                            >
                              {`{{${v}}}`}
                            </code>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={template.is_active ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}>
                          {template.is_active ? 'Активный' : 'Неактивный'}
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
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingTemplate(template);
                                setIsTemplateDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
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
                    <TableCell colSpan={6} className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Шаблоны не найдены</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Создайте первый шаблон для автоматических уведомлений
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ═══════════ TAB 3: RULES ═══════════ */}
        <TabsContent value="rules" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Правила уведомлений</h2>
              <p className="text-sm text-muted-foreground">
                Автоматическая отправка уведомлений по событиям
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingRule(null);
                setIsRuleDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать правило
            </Button>
          </div>

          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Правило</TableHead>
                  <TableHead>Событие</TableHead>
                  <TableHead>Получатели</TableHead>
                  <TableHead>Каналы</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rules.length > 0 ? (
                  rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span className="font-medium">{rule.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {rule.event}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{rule.recipients}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rule.channels.map((ch) => (
                            <Badge key={ch} variant="outline" className={`text-xs ${channelColors[ch]}`}>
                              {channelLabels[ch]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() =>
                            toggleRuleMutation.mutate({ id: rule.id, is_active: !rule.is_active })
                          }
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            rule.is_active ? 'bg-green-500' : 'bg-input'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow ${
                              rule.is_active ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Действия">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingRule(rule);
                                setIsRuleDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
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
                    <TableCell colSpan={6} className="text-center py-12">
                      <Zap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Правила не найдены</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Настройте автоматическую отправку уведомлений
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ═══════════ TAB 4: CAMPAIGNS ═══════════ */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Кампании</h2>
              <p className="text-sm text-muted-foreground">
                Массовая рассылка уведомлений по аудиториям
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingCampaign(null);
                setIsCampaignDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать кампанию
            </Button>
          </div>

          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Кампания</TableHead>
                  <TableHead>Аудитория</TableHead>
                  <TableHead>Каналы</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Отправлено / Доставлено / Ошибки</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : campaigns.length > 0 ? (
                  campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Megaphone className="w-4 h-4 text-primary" />
                          <span className="font-medium">{campaign.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{campaign.audience_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {campaign.channels.map((ch) => (
                            <Badge key={ch} variant="outline" className={`text-xs ${channelColors[ch]}`}>
                              {channelLabels[ch]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={campaignStatusColors[campaign.status]}>
                          {campaignStatusLabels[campaign.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-green-600">{campaign.sent_count}</span>
                          <span>/</span>
                          <span className="text-blue-600">{campaign.delivered_count}</span>
                          <span>/</span>
                          <span className="text-red-600">{campaign.failed_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(campaign.created_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Действия">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingCampaign(campaign);
                                setIsCampaignDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteCampaignMutation.mutate(campaign.id)}
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
                    <TableCell colSpan={7} className="text-center py-12">
                      <Megaphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Кампании не найдены</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Создайте кампанию для массовой рассылки
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ═══════════ TAB 5: SETTINGS ═══════════ */}
        <TabsContent value="settings" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Настройки каналов</h2>
            <p className="text-sm text-muted-foreground">
              Управление каналами доставки уведомлений
            </p>
          </div>

          {/* Channel Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Push */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Push-уведомления</p>
                      <p className="text-xs text-muted-foreground">Уведомления в браузере</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChannelSettings({ ...channelSettings, push: !channelSettings.push })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      channelSettings.push ? 'bg-green-500' : 'bg-input'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow ${
                        channelSettings.push ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                {channelSettings.push && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      toast.success('Подписка на push-уведомления активирована');
                    }}
                  >
                    Подписаться
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Email */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-xs text-muted-foreground">admin@vendhub.uz</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChannelSettings({ ...channelSettings, email: !channelSettings.email })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      channelSettings.email ? 'bg-green-500' : 'bg-input'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow ${
                        channelSettings.email ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* SMS */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">SMS</p>
                      <p className="text-xs text-muted-foreground">+998 90 123 45 67</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChannelSettings({ ...channelSettings, sms: !channelSettings.sms })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      channelSettings.sms ? 'bg-green-500' : 'bg-input'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow ${
                        channelSettings.sms ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Telegram */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-sky-500" />
                    </div>
                    <div>
                      <p className="font-medium">Telegram</p>
                      <p className="text-xs text-muted-foreground">@vendhub_admin</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChannelSettings({ ...channelSettings, telegram: !channelSettings.telegram })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      channelSettings.telegram ? 'bg-green-500' : 'bg-input'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow ${
                        channelSettings.telegram ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* In-App */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <BellDot className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">In-App</p>
                      <p className="text-xs text-muted-foreground">Всегда включено</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500">Активно</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Звук уведомлений</span>
                  <button
                    onClick={() => setChannelSettings({ ...channelSettings, sound: !channelSettings.sound })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      channelSettings.sound ? 'bg-green-500' : 'bg-input'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow ${
                        channelSettings.sound ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-Type Channel Preferences */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Настройки по типам</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Выберите каналы доставки для каждого типа уведомлений
            </p>
          </div>

          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип уведомления</TableHead>
                  <TableHead className="text-center">Push</TableHead>
                  <TableHead className="text-center">Email</TableHead>
                  <TableHead className="text-center">SMS</TableHead>
                  <TableHead className="text-center">Telegram</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(typePreferences).map(([type, prefs]) => (
                  <TableRow key={type}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded flex items-center justify-center ${typeColors[type]}`}>
                          {typeIcons[type]}
                        </span>
                        <span className="font-medium">{typeLabels[type]}</span>
                      </div>
                    </TableCell>
                    {(['push', 'email', 'sms', 'telegram'] as const).map((channel) => (
                      <TableCell key={channel} className="text-center">
                        <button
                          onClick={() =>
                            setTypePreferences({
                              ...typePreferences,
                              [type]: {
                                ...prefs,
                                [channel]: !prefs[channel],
                              },
                            })
                          }
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            prefs[channel]
                              ? 'bg-primary border-primary text-white'
                              : 'border-input bg-background'
                          }`}
                        >
                          {prefs[channel] && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={() =>
                saveSettingsMutation.mutate({
                  channels: channelSettings,
                  preferences: typePreferences,
                })
              }
              disabled={saveSettingsMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveSettingsMutation.isPending ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════ DIALOGS ═══════════ */}

      {/* Notification Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && (
                <>
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColors[selectedNotification.type]}`}
                  >
                    {typeIcons[selectedNotification.type]}
                  </span>
                  {selectedNotification.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed">{selectedNotification.message}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Тип:</span>{' '}
                  <Badge className={typeColors[selectedNotification.type]}>
                    {typeLabels[selectedNotification.type]}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Приоритет:</span>{' '}
                  <Badge className={priorityColors[selectedNotification.priority]}>
                    {priorityLabels[selectedNotification.priority]}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Каналы:</span>{' '}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedNotification.channels.map((ch) => (
                      <Badge key={ch} variant="outline" className={`text-xs ${channelColors[ch]}`}>
                        {channelLabels[ch]}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Дата:</span>{' '}
                  <span>
                    {new Date(selectedNotification.created_at).toLocaleString('ru-RU')}
                  </span>
                </div>
              </div>
              {selectedNotification.related_entity_type && selectedNotification.related_entity_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const entityPath =
                      selectedNotification.related_entity_type === 'machine'
                        ? 'machines'
                        : selectedNotification.related_entity_type === 'task'
                          ? 'tasks'
                          : selectedNotification.related_entity_type || '';
                    router.push(`/dashboard/${entityPath}/${selectedNotification.related_entity_id}`);
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Перейти к объекту
                </Button>
              )}
              <div className="flex justify-end gap-2 pt-2">
                {selectedNotification.status === 'unread' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      markReadMutation.mutate(selectedNotification.id);
                      setSelectedNotification({ ...selectedNotification, status: 'read' });
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Отметить прочитанным
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailOpen(false)}
                >
                  Закрыть
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
            </DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editingTemplate}
            onSubmit={(data) => createTemplateMutation.mutate(data)}
            isPending={createTemplateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Rule Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Редактировать правило' : 'Новое правило'}
            </DialogTitle>
          </DialogHeader>
          <RuleForm
            rule={editingRule}
            onSubmit={(data) => createRuleMutation.mutate(data)}
            isPending={createRuleMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Редактировать кампанию' : 'Новая кампания'}
            </DialogTitle>
          </DialogHeader>
          <CampaignForm
            campaign={editingCampaign}
            onSubmit={(data) => createCampaignMutation.mutate(data)}
            isPending={createCampaignMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Template Form Component ──────────────────────────────────

function TemplateForm({
  template,
  onSubmit,
  isPending,
}: {
  template: NotificationTemplate | null;
  onSubmit: (data: Partial<NotificationTemplate>) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || 'system',
    channels: template?.channels || ([] as string[]),
    subject: template?.subject || '',
    body: template?.body || '',
    variables: template?.variables?.join(', ') || '',
    is_active: template?.is_active ?? true,
  });

  const toggleChannel = (ch: string) => {
    setFormData({
      ...formData,
      channels: formData.channels.includes(ch as any)
        ? formData.channels.filter((c) => c !== ch)
        : [...formData.channels, ch],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      variables: formData.variables
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    } as any);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Название шаблона</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Например: Уведомление о низком запасе"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Тип</label>
          <Select
            value={formData.type}
            onValueChange={(v) => setFormData({ ...formData, type: v as any })}
          >
            <SelectTrigger>
              <SelectValue />
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
        <div>
          <label className="text-sm font-medium">Каналы доставки</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {(['push', 'email', 'sms', 'telegram'] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => toggleChannel(ch)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  formData.channels.includes(ch)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background border-input hover:bg-muted'
                }`}
              >
                {channelLabels[ch]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Тема</label>
        <Input
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Тема уведомления"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Текст сообщения</label>
        <Textarea
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          placeholder="Текст уведомления. Используйте переменные: {{user_name}}, {{machine_name}} и т.д."
          rows={4}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Доступные переменные: {'{{user_name}}'}, {'{{machine_name}}'}, {'{{product_name}}'}, {'{{quantity}}'}, {'{{date}}'}
        </p>
      </div>
      <div>
        <label className="text-sm font-medium">Переменные (через запятую)</label>
        <Input
          value={formData.variables}
          onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
          placeholder="user_name, machine_name, quantity"
        />
      </div>
      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              formData.is_active ? 'bg-green-500' : 'bg-input'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow ${
                formData.is_active ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span>{formData.is_active ? 'Активный' : 'Неактивный'}</span>
        </label>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Сохранение...' : template ? 'Обновить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
}

// ─── Rule Form Component ──────────────────────────────────────

function RuleForm({
  rule,
  onSubmit,
  isPending,
}: {
  rule: NotificationRule | null;
  onSubmit: (data: Partial<NotificationRule>) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    event: rule?.event || '',
    conditions: rule?.conditions || '',
    recipients: rule?.recipients || '',
    channels: rule?.channels || ([] as string[]),
    is_active: rule?.is_active ?? true,
  });

  const toggleChannel = (ch: string) => {
    setFormData({
      ...formData,
      channels: formData.channels.includes(ch as any)
        ? formData.channels.filter((c) => c !== ch)
        : [...formData.channels, ch],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as any);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Название правила</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Например: Тревога при оффлайн автомате"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Событие-триггер</label>
          <Select
            value={formData.event}
            onValueChange={(v) => setFormData({ ...formData, event: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите событие" />
            </SelectTrigger>
            <SelectContent>
              {eventOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Получатели</label>
          <Select
            value={formData.recipients}
            onValueChange={(v) => setFormData({ ...formData, recipients: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите получателей" />
            </SelectTrigger>
            <SelectContent>
              {recipientOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Условия (опционально)</label>
        <Input
          value={formData.conditions}
          onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
          placeholder='Например: priority == "high" AND region == "tashkent"'
        />
        <p className="text-xs text-muted-foreground mt-1">
          Дополнительные условия фильтрации событий
        </p>
      </div>
      <div>
        <label className="text-sm font-medium">Каналы доставки</label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {(['push', 'email', 'sms', 'telegram'] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => toggleChannel(ch)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                formData.channels.includes(ch)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background border-input hover:bg-muted'
              }`}
            >
              {channelLabels[ch]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              formData.is_active ? 'bg-green-500' : 'bg-input'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow ${
                formData.is_active ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span>{formData.is_active ? 'Активно' : 'Неактивно'}</span>
        </label>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Сохранение...' : rule ? 'Обновить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
}

// ─── Campaign Form Component ──────────────────────────────────

function CampaignForm({
  campaign,
  onSubmit,
  isPending,
}: {
  campaign: NotificationCampaign | null;
  onSubmit: (data: Partial<NotificationCampaign>) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    message: campaign?.message || '',
    audience_filter: 'all',
    channels: campaign?.channels || ([] as string[]),
    scheduled_at: campaign?.scheduled_at || '',
  });

  const toggleChannel = (ch: string) => {
    setFormData({
      ...formData,
      channels: formData.channels.includes(ch as any)
        ? formData.channels.filter((c) => c !== ch)
        : [...formData.channels, ch],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as any);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Название кампании</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Например: Обновление графика работы"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Сообщение</label>
        <Textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Текст сообщения для рассылки..."
          rows={4}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Целевая аудитория</label>
          <Select
            value={formData.audience_filter}
            onValueChange={(v) => setFormData({ ...formData, audience_filter: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все пользователи</SelectItem>
              <SelectItem value="admins">Администраторы</SelectItem>
              <SelectItem value="managers">Менеджеры</SelectItem>
              <SelectItem value="operators">Операторы</SelectItem>
              <SelectItem value="warehouse">Кладовщики</SelectItem>
              <SelectItem value="accountants">Бухгалтерия</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Запланировать (опционально)</label>
          <Input
            type="datetime-local"
            value={formData.scheduled_at}
            onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Каналы доставки</label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {(['push', 'email', 'sms', 'telegram'] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => toggleChannel(ch)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                formData.channels.includes(ch)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background border-input hover:bg-muted'
              }`}
            >
              {channelLabels[ch]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Сохранение...' : campaign ? 'Обновить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
}
