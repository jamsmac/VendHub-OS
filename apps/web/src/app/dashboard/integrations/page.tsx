"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { integrationsApi } from "@/lib/api";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Types
interface Integration {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  status: "draft" | "configuring" | "testing" | "active" | "paused" | "error";
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

const statusStyles: Record<
  string,
  { color: string; bg: string; icon: React.ReactNode }
> = {
  draft: {
    color: "text-muted-foreground",
    bg: "bg-muted",
    icon: <Clock className="h-4 w-4" />,
  },
  configuring: {
    color: "text-blue-600",
    bg: "bg-blue-100",
    icon: <Settings className="h-4 w-4 animate-spin" />,
  },
  testing: {
    color: "text-yellow-600",
    bg: "bg-yellow-100",
    icon: <TestTube className="h-4 w-4" />,
  },
  active: {
    color: "text-green-600",
    bg: "bg-green-100",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  paused: {
    color: "text-orange-600",
    bg: "bg-orange-100",
    icon: <Pause className="h-4 w-4" />,
  },
  error: {
    color: "text-red-600",
    bg: "bg-red-100",
    icon: <XCircle className="h-4 w-4" />,
  },
};

export default function IntegrationsPage() {
  const t = useTranslations("integrations");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterCategories = [
    { id: "all", label: t("filterAll"), icon: <Zap className="h-4 w-4" /> },
    {
      id: "payment",
      label: t("filterPayment"),
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      id: "fiscal",
      label: t("filterFiscal"),
      icon: <Receipt className="h-4 w-4" />,
    },
    {
      id: "sms",
      label: t("filterSms"),
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      id: "email",
      label: t("filterEmail"),
      icon: <Mail className="h-4 w-4" />,
    },
    {
      id: "analytics",
      label: t("filterAnalytics"),
      icon: <BarChart3 className="h-4 w-4" />,
    },
  ];

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await integrationsApi.getAll();
      setIntegrations(response.data.data || response.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const message = err.response?.data?.message || t("loadFailed");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await integrationsApi.getTemplates();
      setTemplates(response.data.data || response.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // Template loading is non-critical; silently ignore
      void err;
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
          integration.displayName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          integration.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === "all" ||
          integration.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [integrations, searchQuery, selectedCategory],
  );

  const stats = useMemo(
    () => ({
      total: integrations.length,
      active: integrations.filter((i) => i.status === "active").length,
      testing: integrations.filter((i) => i.status === "testing").length,
      errors: integrations.filter((i) => i.status === "error").length,
    }),
    [integrations],
  );

  const getStatusLabel = (status: string) => {
    const key = `status_${status}` as const;
    return t(key);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addIntegration")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsTotal")}
                </p>
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
                <p className="text-sm text-muted-foreground">
                  {t("statsActive")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.active}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsTesting")}
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.testing}
                </p>
              </div>
              <TestTube className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsErrors")}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.errors}
                </p>
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
            <p className="text-muted-foreground">{t("loading")}</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">
              {t("loadError")}
            </p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchIntegrations} variant="outline">
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {!loading && !error && (
        <>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {filterCategories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
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
              const status = statusStyles[integration.status];
              const totalRequests =
                integration.successCount + integration.errorCount;
              const successRate =
                totalRequests > 0
                  ? ((integration.successCount / totalRequests) * 100).toFixed(
                      1,
                    )
                  : "N/A";

              return (
                <Card
                  key={integration.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-2xl">
                          {integration.logo ||
                            categoryIcons[integration.category]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {integration.displayName}
                            </h3>
                            <span
                              className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.color}`}
                            >
                              {status.icon}
                              {getStatusLabel(integration.status)}
                            </span>
                            {integration.sandboxMode && (
                              <Badge variant="secondary">Sandbox</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {integration.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Stats */}
                        <div className="hidden md:flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-muted-foreground">
                              {t("successRate")}
                            </p>
                            <p className="font-semibold text-green-600">
                              {successRate}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">
                              {t("requests")}
                            </p>
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
                            aria-label={t("actionConfigure")}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t("actionTest")}
                          >
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t("actionDetails")}
                          >
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
                  <p className="text-lg font-medium">{t("notFound")}</p>
                  <p className="text-muted-foreground mb-4">{t("addFirst")}</p>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addIntegration")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

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
              description: t("newIntegrationDescription"),
              category: template.category,
              status: "draft",
              logo: template.logo,
              sandboxMode: true,
            });
            const newIntegration = response.data.data || response.data;
            setShowAddModal(false);
            setSelectedIntegration(newIntegration);
            setShowConfigModal(true);
            toast.success(t("integrationCreated"));
            fetchIntegrations();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (err: any) {
            const message = err.response?.data?.message || t("createFailed");
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
              toast.success(t("integrationSaved"));
              fetchIntegrations();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
              const message = err.response?.data?.message || t("saveFailed");
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
  const t = useTranslations("integrations");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAISetup, setShowAISetup] = useState(false);
  const [documentationUrl, setDocumentationUrl] = useState("");

  const filteredTemplates = templates.filter(
    (tpl) =>
      tpl.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("addIntegration")}</DialogTitle>
          <DialogDescription>{t("addDialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-1">
          {/* AI Setup Card */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-background rounded-lg shadow-sm">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{t("aiSetupTitle")}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("aiSetupDescription")}
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
                          toast.info(t("aiAnalyzing"));
                        }}
                        disabled={!documentationUrl}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Bot className="h-4 w-4 mr-2" />
                        {t("aiAnalyze")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowAISetup(false)}
                      >
                        {t("cancel")}
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
                    {t("aiSetupButton")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchTemplates")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Templates Grid */}
          <div>
            <h3 className="font-medium mb-3">{t("readyTemplates")}</h3>
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
                          <h4 className="font-semibold">
                            {template.displayName}
                          </h4>
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
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.supportedMethods.map((method) => (
                            <Badge
                              key={method}
                              variant="secondary"
                              className="text-xs"
                            >
                              {method}
                            </Badge>
                          ))}
                          {template.hasWebhooks && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-green-100 text-green-600"
                            >
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
                id: "custom",
                name: "custom",
                displayName: t("customIntegration"),
                description: "",
                category: "payment",
                country: "UZ",
                logo: "",
                website: "",
                documentationUrl: "",
                tags: [],
                hasWebhooks: false,
                supportedMethods: [],
                supportedCurrencies: ["UZS"],
              });
            }}
          >
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Settings className="h-8 w-8 text-muted-foreground mb-2" />
              <h4 className="font-semibold">{t("createCustom")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("createCustomDescription")}
              </p>
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
  const t = useTranslations("integrations");
  const [formData, setFormData] = useState({
    displayName: integration.displayName,
    description: integration.description,
    sandboxMode: integration.sandboxMode,
  });
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [aiMessage, setAiMessage] = useState("");
  const [aiChat, setAiChat] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content: t("aiChatGreeting", { name: integration.displayName }),
    },
  ]);

  const handleSendAiMessage = () => {
    if (!aiMessage.trim()) return;

    setAiChat([
      ...aiChat,
      { role: "user", content: aiMessage },
      {
        role: "assistant",
        content: t("aiChatAnalyzing"),
      },
    ]);
    setAiMessage("");
  };

  const status = statusStyles[integration.status];
  const statusLabel = t(`status_${integration.status}` as const);

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
              <h2 className="text-lg font-semibold">
                {integration.displayName}
              </h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <TestTube className="h-4 w-4 mr-1" />
              {t("configTest")}
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                await onSave({ ...integration, ...formData });
                onOpenChange(false);
              }}
            >
              {t("configSave")}
            </Button>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs
          defaultValue="general"
          className="flex-1 overflow-hidden flex flex-col"
        >
          <div className="px-6 border-b">
            <TabsList className="bg-transparent h-auto p-0 gap-4">
              <TabsTrigger
                value="general"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0"
              >
                <Settings className="h-4 w-4 mr-2" />
                {t("tabGeneral")}
              </TabsTrigger>
              <TabsTrigger
                value="credentials"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0"
              >
                <Eye className="h-4 w-4 mr-2" />
                {t("tabCredentials")}
              </TabsTrigger>
              <TabsTrigger
                value="endpoints"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0"
              >
                <Zap className="h-4 w-4 mr-2" />
                {t("tabEndpoints")}
              </TabsTrigger>
              <TabsTrigger
                value="webhooks"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0"
              >
                <Bell className="h-4 w-4 mr-2" />
                {t("tabWebhooks")}
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {t("tabAiAssistant")}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="general" className="mt-0 space-y-6">
              <div className="space-y-2">
                <Label>{t("fieldName")}</Label>
                <Input
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("fieldDescription")}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">{t("sandboxMode")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("sandboxDescription")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      sandboxMode: !formData.sandboxMode,
                    })
                  }
                  className={
                    formData.sandboxMode
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : ""
                  }
                >
                  {formData.sandboxMode ? t("sandboxOn") : t("sandboxOff")}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="credentials" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                {t("credentialsHint", {
                  mode: formData.sandboxMode
                    ? t("credentialsTestMode")
                    : t("credentialsProdMode"),
                })}
              </p>

              {["merchant_id", "secret_key", "api_key"].map((key) => (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets[key] ? "text" : "password"}
                      value={credentials[key] || ""}
                      onChange={(e) =>
                        setCredentials({
                          ...credentials,
                          [key]: e.target.value,
                        })
                      }
                      placeholder={t("credentialsEnter", { key })}
                      className="pr-20 font-mono text-sm"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          setShowSecrets({
                            ...showSecrets,
                            [key]: !showSecrets[key],
                          })
                        }
                        aria-label={
                          showSecrets[key]
                            ? t("credentialsHide")
                            : t("credentialsShow")
                        }
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
                          navigator.clipboard.writeText(credentials[key] || "");
                          toast.success(t("copied"));
                        }}
                        aria-label={t("credentialsCopy")}
                      >
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="endpoints" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("endpointsDescription")}
              </p>

              {["createPayment", "checkStatus", "cancelPayment", "refund"].map(
                (endpoint) => (
                  <Card key={endpoint}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium capitalize">
                          {endpoint.replace(/([A-Z])/g, " $1")}
                        </h4>
                        <Badge variant="secondary">POST</Badge>
                      </div>
                      <Input
                        placeholder="/api/v1/payments"
                        className="font-mono text-sm"
                      />
                    </CardContent>
                  </Card>
                ),
              )}
            </TabsContent>

            <TabsContent value="webhooks" className="mt-0 space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">{t("webhooksEnabled")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("webhooksDescription")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {t("sandboxOn")}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>{t("webhookUrl")}</Label>
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
                      toast.success(t("urlCopied"));
                    }}
                    aria-label={t("copyUrl")}
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
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendAiMessage()}
                  placeholder={t("aiInputPlaceholder")}
                />
                <Button
                  onClick={handleSendAiMessage}
                  disabled={!aiMessage.trim()}
                >
                  {t("aiSend")}
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
