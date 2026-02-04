'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { integrationsApi } from '@/lib/api';
import {
  Plus,
  Search,
  Settings,
  CreditCard,
  MessageSquare,
  Mail,
  Bell,
  BarChart3,
  Package,
  Truck,
  Star,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  TestTube,
  Bot,
  Sparkles,
  Receipt,
  Pause,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Types
interface Integration {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  status: 'draft' | 'configuring' | 'testing' | 'active' | 'paused' | 'error';
  logo?: string;
  sandboxMode: boolean;
  lastUsedAt?: string;
  lastTestedAt?: string;
  successCount: number;
  errorCount: number;
}

interface Template {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  country: string;
  logo: string;
  website: string;
  documentationUrl: string;
  tags: string[];
  hasWebhooks: boolean;
  supportedMethods: string[];
  supportedCurrencies: string[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  payment: <CreditCard className="h-5 w-5" />,
  fiscal: <Receipt className="h-5 w-5" />,
  sms: <MessageSquare className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  push: <Bell className="h-5 w-5" />,
  analytics: <BarChart3 className="h-5 w-5" />,
  erp: <Package className="h-5 w-5" />,
  delivery: <Truck className="h-5 w-5" />,
  loyalty: <Star className="h-5 w-5" />,
};

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  draft: { color: 'text-muted-foreground', bg: 'bg-muted', icon: <Clock className="h-4 w-4" />, label: 'Черновик' },
  configuring: { color: 'text-blue-600', bg: 'bg-blue-100', icon: <Settings className="h-4 w-4 animate-spin" />, label: 'Настройка' },
  testing: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: <TestTube className="h-4 w-4" />, label: 'Тестирование' },
  active: { color: 'text-green-600', bg: 'bg-green-100', icon: <CheckCircle className="h-4 w-4" />, label: 'Активна' },
  paused: { color: 'text-orange-600', bg: 'bg-orange-100', icon: <Pause className="h-4 w-4" />, label: 'Приостановлена' },
  error: { color: 'text-red-600', bg: 'bg-red-100', icon: <XCircle className="h-4 w-4" />, label: 'Ошибка' },
};

const filterCategories = [
  { id: 'all', label: 'Все', icon: <Zap className="h-4 w-4" /> },
  { id: 'payment', label: 'Платежи', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'fiscal', label: 'Фискал', icon: <Receipt className="h-4 w-4" /> },
  { id: 'sms', label: 'SMS', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  { id: 'analytics', label: 'Аналитика', icon: <BarChart3 className="h-4 w-4" /> },
];

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await integrationsApi.getAll();
      setIntegrations(response.data.data || response.data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Не удалось загрузить интеграции';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await integrationsApi.getTemplates();
      setTemplates(response.data.data || response.data);
    } catch (err: any) {
      console.error('Failed to load templates:', err);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
    fetchTemplates();
  }, [fetchIntegrations, fetchTemplates]);

  const filteredIntegrations = useMemo(
    () =>
      integrations.filter((integration) => {
        const matchesSearch =
          integration.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          integration.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [integrations, searchQuery, selectedCategory],
  );

  const stats = useMemo(
    () => ({
      total: integrations.length,
      active: integrations.filter((i) => i.status === 'active').length,
      testing: integrations.filter((i) => i.status === 'testing').length,
      errors: integrations.filter((i) => i.status === 'error').length,
    }),
    [integrations],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Интеграции</h1>
          <p className="text-muted-foreground">Управляйте платёжными системами и сервисами</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить интеграцию
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего интеграций</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Активных</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">На тестировании</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.testing}</p>
              </div>
              <TestTube className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">С ошибками</p>
                <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
            <p className="text-muted-foreground">Загрузка интеграций...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Ошибка загрузки</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchIntegrations} variant="outline">
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {!loading && !error && <><div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск интеграций..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filterCategories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.icon}
              <span className="ml-1">{cat.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Integrations List */}
      <div className="space-y-4">
        {filteredIntegrations.map((integration) => {
          const status = statusConfig[integration.status];
          const totalRequests = integration.successCount + integration.errorCount;
          const successRate = totalRequests > 0
            ? ((integration.successCount / totalRequests) * 100).toFixed(1)
            : 'N/A';

          return (
            <Card key={integration.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-2xl">
                      {integration.logo || categoryIcons[integration.category]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{integration.displayName}</h3>
                        <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                        {integration.sandboxMode && (
                          <Badge variant="secondary">Sandbox</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{integration.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground">Успешность</p>
                        <p className="font-semibold text-green-600">{successRate}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Запросов</p>
                        <p className="font-semibold">{totalRequests}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setShowConfigModal(true);
                        }}
                        aria-label="Настроить"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Тестировать">
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Подробнее">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredIntegrations.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Интеграции не найдены</p>
              <p className="text-muted-foreground mb-4">Добавьте первую интеграцию для начала работы</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить интеграцию
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      </>}

      {/* Add Integration Dialog */}
      <AddIntegrationDialog
        open={showAddModal}
        onOpenChange={setShowAddModal}
        templates={templates}
        onSelect={async (template) => {
          try {
            const response = await integrationsApi.create({
              name: template.name,
              displayName: template.displayName,
              description: 'Новая интеграция',
              category: template.category,
              status: 'draft',
              logo: template.logo,
              sandboxMode: true,
            });
            const newIntegration = response.data.data || response.data;
            setShowAddModal(false);
            setSelectedIntegration(newIntegration);
            setShowConfigModal(true);
            toast.success('Интеграция создана');
            fetchIntegrations();
          } catch (err: any) {
            const message = err.response?.data?.message || 'Не удалось создать интеграцию';
            toast.error(message);
          }
        }}
      />

      {/* Configuration Dialog */}
      {selectedIntegration && (
        <ConfigurationDialog
          open={showConfigModal}
          onOpenChange={(open) => {
            setShowConfigModal(open);
            if (!open) setSelectedIntegration(null);
          }}
          integration={selectedIntegration}
          onSave={async (updated) => {
            try {
              await integrationsApi.update(updated.id, updated);
              toast.success('Интеграция сохранена');
              fetchIntegrations();
            } catch (err: any) {
              const message = err.response?.data?.message || 'Не удалось сохранить интеграцию';
              toast.error(message);
            }
          }}
        />
      )}
    </div>
  );
}

// Add Integration Dialog Component
function AddIntegrationDialog({
  open,
  onOpenChange,
  templates,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  onSelect: (template: Template) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAISetup, setShowAISetup] = useState(false);
  const [documentationUrl, setDocumentationUrl] = useState('');

  const filteredTemplates = templates.filter(
    (t) =>
      t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Добавить интеграцию</DialogTitle>
          <DialogDescription>Выберите готовый шаблон или настройте с помощью AI</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-1">
          {/* AI Setup Card */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-background rounded-lg shadow-sm">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Настройка с помощью AI</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Просто вставьте ссылку на API документацию, и AI автоматически настроит интеграцию
                </p>

                {showAISetup ? (
                  <div className="space-y-3">
                    <Input
                      type="url"
                      value={documentationUrl}
                      onChange={(e) => setDocumentationUrl(e.target.value)}
                      placeholder="https://docs.payment-provider.com/api"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          toast.info('AI анализирует документацию...');
                        }}
                        disabled={!documentationUrl}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Bot className="h-4 w-4 mr-2" />
                        Анализировать
                      </Button>
                      <Button variant="outline" onClick={() => setShowAISetup(false)}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowAISetup(true)}
                    className="border-purple-200 text-purple-600 hover:bg-purple-50"
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Настроить с AI
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск шаблонов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Templates Grid */}
          <div>
            <h3 className="font-medium mb-3">Готовые шаблоны</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                  onClick={() => onSelect(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-xl">
                        {template.logo}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{template.displayName}</h4>
                          <a
                            href={template.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.supportedMethods.map((method) => (
                            <Badge key={method} variant="secondary" className="text-xs">
                              {method}
                            </Badge>
                          ))}
                          {template.hasWebhooks && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-600">
                              webhooks
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Integration */}
          <Card
            className="cursor-pointer border-dashed border-2 hover:border-primary hover:bg-muted/50 transition-all"
            onClick={() => {
              onSelect({
                id: 'custom',
                name: 'custom',
                displayName: 'Своя интеграция',
                description: '',
                category: 'payment',
                country: 'UZ',
                logo: '⚙️',
                website: '',
                documentationUrl: '',
                tags: [],
                hasWebhooks: false,
                supportedMethods: [],
                supportedCurrencies: ['UZS'],
              });
            }}
          >
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Settings className="h-8 w-8 text-muted-foreground mb-2" />
              <h4 className="font-semibold">Создать свою интеграцию</h4>
              <p className="text-sm text-muted-foreground">Настройте все параметры вручную</p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Configuration Dialog Component
function ConfigurationDialog({
  open,
  onOpenChange,
  integration,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: Integration;
  onSave: (integration: Integration) => void;
}) {
  const [formData, setFormData] = useState({
    displayName: integration.displayName,
    description: integration.description,
    sandboxMode: integration.sandboxMode,
  });
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [aiMessage, setAiMessage] = useState('');
  const [aiChat, setAiChat] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: `Привет! Я помогу настроить интеграцию ${integration.displayName}. Что вы хотите настроить?\n\n• Эндпоинты API\n• Аутентификацию\n• Вебхуки\n• Маппинг полей\n\nИли просто вставьте ссылку на документацию, и я проанализирую её.`,
    },
  ]);

  const handleSendAiMessage = () => {
    if (!aiMessage.trim()) return;

    setAiChat([
      ...aiChat,
      { role: 'user', content: aiMessage },
      {
        role: 'assistant',
        content:
          'Анализирую вашу документацию... Найдено 3 эндпоинта и настройки аутентификации. Хотите, чтобы я применил эти настройки?',
      },
    ]);
    setAiMessage('');
  };

  const status = statusConfig[integration.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-xl">
              {integration.logo}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{integration.displayName}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <TestTube className="h-4 w-4 mr-1" />
              Тест
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                await onSave({ ...integration, ...formData });
                onOpenChange(false);
              }}
            >
              Сохранить
            </Button>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 border-b">
            <TabsList className="bg-transparent h-auto p-0 gap-4">
              <TabsTrigger value="general" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0">
                <Settings className="h-4 w-4 mr-2" />
                Основные
              </TabsTrigger>
              <TabsTrigger value="credentials" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0">
                <Eye className="h-4 w-4 mr-2" />
                Ключи
              </TabsTrigger>
              <TabsTrigger value="endpoints" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0">
                <Zap className="h-4 w-4 mr-2" />
                Эндпоинты
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0">
                <Bell className="h-4 w-4 mr-2" />
                Вебхуки
              </TabsTrigger>
              <TabsTrigger value="ai" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Помощник
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="general" className="mt-0 space-y-6">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">Режим песочницы</h4>
                  <p className="text-sm text-muted-foreground">Использовать тестовые данные</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, sandboxMode: !formData.sandboxMode })}
                  className={formData.sandboxMode ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
                >
                  {formData.sandboxMode ? 'Включён' : 'Выключен'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="credentials" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Введите API ключи для {formData.sandboxMode ? 'тестового' : 'продуктового'} режима
              </p>

              {['merchant_id', 'secret_key', 'api_key'].map((key) => (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets[key] ? 'text' : 'password'}
                      value={credentials[key] || ''}
                      onChange={(e) => setCredentials({ ...credentials, [key]: e.target.value })}
                      placeholder={`Введите ${key}`}
                      className="pr-20 font-mono text-sm"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setShowSecrets({ ...showSecrets, [key]: !showSecrets[key] })}
                        aria-label={showSecrets[key] ? 'Скрыть' : 'Показать'}
                      >
                        {showSecrets[key] ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          navigator.clipboard.writeText(credentials[key] || '');
                          toast.success('Скопировано');
                        }}
                        aria-label="Копировать"
                      >
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="endpoints" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">Настройка API эндпоинтов</p>

              {['createPayment', 'checkStatus', 'cancelPayment', 'refund'].map((endpoint) => (
                <Card key={endpoint}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium capitalize">
                        {endpoint.replace(/([A-Z])/g, ' $1')}
                      </h4>
                      <Badge variant="secondary">POST</Badge>
                    </div>
                    <Input placeholder="/api/v1/payments" className="font-mono text-sm" />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="webhooks" className="mt-0 space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">Вебхуки включены</h4>
                  <p className="text-sm text-muted-foreground">Получать уведомления о платежах</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Включён
                </Button>
              </div>

              <div className="space-y-2">
                <Label>URL вебхука</Label>
                <div className="flex gap-2">
                  <Input
                    value={`https://api.vendhub.uz/webhooks/${integration.name}`}
                    readOnly
                    className="font-mono text-sm bg-muted/50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `https://api.vendhub.uz/webhooks/${integration.name}`,
                      );
                      toast.success('URL скопирован');
                    }}
                    aria-label="Копировать URL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-0 h-[400px] flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {aiChat.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
                  placeholder="Введите сообщение или вставьте ссылку на документацию..."
                />
                <Button onClick={handleSendAiMessage} disabled={!aiMessage.trim()}>
                  Отправить
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
