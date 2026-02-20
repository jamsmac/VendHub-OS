'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Bell,
  Globe,
  Shield,
  Palette,
  Building,
  CreditCard,
  Mail,
  Smartphone,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface OrganizationSettings {
  name: string;
  email: string;
  phone: string;
  timezone: string;
  currency: string;
  language: string;
  address: string;
}

interface NotificationPreferences {
  email_orders: boolean;
  sms_alerts: boolean;
  telegram_bot: boolean;
  low_stock: boolean;
  maintenance: boolean;
  daily_report: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: string;
}

interface PaymentProvider {
  name: string;
  status: 'connected' | 'not_connected';
}

interface Integration {
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

const tabs = [
  { id: 'general', label: 'Основные', icon: Building },
  { id: 'notifications', label: 'Уведомления', icon: Bell },
  { id: 'security', label: 'Безопасность', icon: Shield },
  { id: 'payments', label: 'Платежи', icon: CreditCard },
  { id: 'appearance', label: 'Внешний вид', icon: Palette },
  { id: 'integrations', label: 'Интеграции', icon: Globe },
];

const notificationItems = [
  { id: 'email_orders', label: 'Email-уведомления о новых заказах', icon: Mail },
  { id: 'sms_alerts', label: 'SMS-оповещения о критических событиях', icon: Smartphone },
  { id: 'telegram_bot', label: 'Уведомления через Telegram-бот', icon: Bell },
  { id: 'low_stock', label: 'Предупреждения о низком запасе', icon: Bell },
  { id: 'maintenance', label: 'Напоминания об обслуживании', icon: Bell },
  { id: 'daily_report', label: 'Ежедневный отчёт о продажах', icon: Mail },
] as const;

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');

  // --- General Settings State ---
  const [generalForm, setGeneralForm] = useState<OrganizationSettings>({
    name: '',
    email: '',
    phone: '',
    timezone: 'Asia/Tashkent',
    currency: 'UZS',
    language: 'ru',
    address: '',
  });

  // --- Notification Preferences ---
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    email_orders: true,
    sms_alerts: true,
    telegram_bot: true,
    low_stock: true,
    maintenance: true,
    daily_report: true,
  });

  // --- Security ---
  const [sessionTimeout, setSessionTimeout] = useState('30');

  // --- Appearance ---
  const [theme, setTheme] = useState('light');
  const [primaryColor, setPrimaryColor] = useState('#6B4423');

  // ─── Queries ──────────────────────────────────────────────

  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      const data = res.data?.data || res.data;
      if (data) {
        if (data.general) setGeneralForm(data.general);
        if (data.notifications) setNotifPrefs(data.notifications);
        if (data.security?.session_timeout) setSessionTimeout(data.security.session_timeout);
        if (data.appearance?.theme) setTheme(data.appearance.theme);
        if (data.appearance?.primaryColor) setPrimaryColor(data.appearance.primaryColor);
      }
      return data;
    },
  });

  const paymentProviders: PaymentProvider[] = useMemo(() =>
    settings?.payments || [
      { name: 'Payme', status: 'connected' },
      { name: 'Click', status: 'connected' },
      { name: 'Uzum Bank', status: 'not_connected' },
      { name: 'Наличные', status: 'connected' },
    ],
  [settings]);

  const integrations: Integration[] = useMemo(() =>
    settings?.integrations || [
      { name: 'Telegram Bot', description: 'Уведомления для клиентов и сотрудников', status: 'active' },
      { name: 'Google Maps', description: 'Карты и геолокация', status: 'active' },
      { name: 'OFD Soliq', description: 'Фискализация чеков', status: 'inactive' },
      { name: 'Sentry', description: 'Мониторинг ошибок', status: 'active' },
    ],
  [settings]);

  // ─── Mutations ────────────────────────────────────────────

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      await api.put('/settings', {
        general: generalForm,
        notifications: notifPrefs,
        security: { session_timeout: sessionTimeout },
        appearance: { theme, primaryColor },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Настройки сохранены');
    },
    onError: () => {
      toast.error('Не удалось сохранить настройки');
    },
  });

  const toggleTwoFactorMutation = useMutation({
    mutationFn: async () => {
      await api.post('/settings/2fa/toggle');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Статус 2FA обновлён');
    },
    onError: () => {
      toast.error('Не удалось изменить настройки 2FA');
    },
  });

  // ─── Render ───────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить настройки</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['settings'] })}>
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-muted-foreground">Управление настройками организации</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <SettingsSkeleton />
              ) : (
                <>
                  {activeTab === 'general' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold">Настройки организации</h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Название организации</label>
                          <Input
                            value={generalForm.name}
                            onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                            placeholder="VendHub HQ"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Контактный email</label>
                          <Input
                            type="email"
                            value={generalForm.email}
                            onChange={(e) => setGeneralForm({ ...generalForm, email: e.target.value })}
                            placeholder="admin@vendhub.uz"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Телефон</label>
                          <Input
                            type="tel"
                            value={generalForm.phone}
                            onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })}
                            placeholder="+998 71 200 0000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Часовой пояс</label>
                          <Select
                            value={generalForm.timezone}
                            onValueChange={(v) => setGeneralForm({ ...generalForm, timezone: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Asia/Tashkent">Asia/Tashkent (UTC+5)</SelectItem>
                              <SelectItem value="Asia/Samarkand">Asia/Samarkand (UTC+5)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Валюта</label>
                          <Select
                            value={generalForm.currency}
                            onValueChange={(v) => setGeneralForm({ ...generalForm, currency: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UZS">UZS - Узбекский сум</SelectItem>
                              <SelectItem value="USD">USD - Доллар США</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Язык</label>
                          <Select
                            value={generalForm.language}
                            onValueChange={(v) => setGeneralForm({ ...generalForm, language: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ru">Русский</SelectItem>
                              <SelectItem value="uz">Узбекский</SelectItem>
                              <SelectItem value="en">Английский</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Адрес</label>
                        <Textarea
                          value={generalForm.address}
                          onChange={(e) => setGeneralForm({ ...generalForm, address: e.target.value })}
                          rows={3}
                          placeholder="Ташкент, Юнусабадский район"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'notifications' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold">Настройки уведомлений</h2>

                      <div className="space-y-4">
                        {notificationItems.map((item) => {
                          const Icon = item.icon;
                          const key = item.id as keyof NotificationPreferences;
                          return (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm font-medium">{item.label}</span>
                              </div>
                              <button
                                onClick={() => setNotifPrefs({ ...notifPrefs, [key]: !notifPrefs[key] })}
                                className={`relative w-10 h-5 rounded-full transition-colors ${
                                  notifPrefs[key] ? 'bg-green-500' : 'bg-input'
                                }`}
                                aria-label={`Переключить ${item.label}`}
                              >
                                <span
                                  className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow ${
                                    notifPrefs[key] ? 'translate-x-5' : 'translate-x-0.5'
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold">Безопасность</h2>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Двухфакторная аутентификация</p>
                            <p className="text-xs text-muted-foreground">Дополнительный уровень защиты</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleTwoFactorMutation.mutate()}
                            disabled={toggleTwoFactorMutation.isPending}
                          >
                            {toggleTwoFactorMutation.isPending
                              ? 'Обновление...'
                              : settings?.security?.two_factor_enabled
                                ? 'Отключить 2FA'
                                : 'Включить 2FA'}
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Тайм-аут сессии</p>
                            <p className="text-xs text-muted-foreground">Автовыход при бездействии</p>
                          </div>
                          <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">30 минут</SelectItem>
                              <SelectItem value="60">1 час</SelectItem>
                              <SelectItem value="240">4 часа</SelectItem>
                              <SelectItem value="480">8 часов</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">API-ключи</p>
                            <p className="text-xs text-muted-foreground">Управление ключами доступа к API</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.success('Управление ключами будет доступно в следующей версии')}
                          >
                            Управление
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'payments' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold">Настройки платежей</h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paymentProviders.map((provider) => (
                          <div key={provider.name} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <CreditCard className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{provider.name}</p>
                                <p className={`text-xs ${provider.status === 'connected' ? 'text-green-600' : 'text-muted-foreground'}`}>
                                  {provider.status === 'connected' ? 'Подключён' : 'Не подключён'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant={provider.status === 'connected' ? 'outline' : 'default'}
                              size="sm"
                              onClick={() => toast.success(`Настройка ${provider.name} будет доступна в следующей версии`)}
                            >
                              {provider.status === 'connected' ? 'Настроить' : 'Подключить'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'appearance' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold">Внешний вид</h2>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Тема</label>
                          <div className="flex gap-3">
                            {[
                              { id: 'light', label: 'Светлая' },
                              { id: 'dark', label: 'Тёмная' },
                              { id: 'system', label: 'Системная' },
                            ].map((t) => (
                              <Button
                                key={t.id}
                                variant={theme === t.id ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTheme(t.id)}
                              >
                                {theme === t.id && <Check className="h-4 w-4 mr-1" />}
                                {t.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Основной цвет</label>
                          <div className="flex gap-2">
                            {['#6B4423', '#2563eb', '#059669', '#dc2626', '#7c3aed'].map((color) => (
                              <button
                                key={color}
                                onClick={() => setPrimaryColor(color)}
                                className={`w-8 h-8 rounded-full border-2 shadow transition-transform ${
                                  primaryColor === color ? 'border-foreground scale-110' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                                aria-label={`Цвет ${color}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'integrations' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold">Интеграции</h2>

                      <div className="space-y-4">
                        {integrations.map((integration) => (
                          <div key={integration.name} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{integration.name}</p>
                              <p className="text-sm text-muted-foreground">{integration.description}</p>
                            </div>
                            <Badge
                              variant={integration.status === 'active' ? 'default' : 'secondary'}
                            >
                              {integration.status === 'active' ? 'Активна' : 'Неактивна'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end mt-6 pt-6 border-t">
                    <Button
                      onClick={() => saveSettingsMutation.mutate()}
                      disabled={saveSettingsMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveSettingsMutation.isPending ? 'Сохранение...' : 'Сохранить настройки'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
