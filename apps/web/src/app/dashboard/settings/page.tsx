"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";

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

interface _SecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: string;
}

interface PaymentProvider {
  name: string;
  status: "connected" | "not_connected";
}

interface Integration {
  name: string;
  description: string;
  status: "active" | "inactive";
}

type TabIcon = React.ComponentType<{ className?: string }>;

interface TabItem {
  id: string;
  labelKey: string;
  icon: TabIcon;
}

const tabItems: TabItem[] = [
  { id: "general", labelKey: "tabGeneral", icon: Building },
  { id: "notifications", labelKey: "tabNotifications", icon: Bell },
  { id: "security", labelKey: "tabSecurity", icon: Shield },
  { id: "payments", labelKey: "tabPayments", icon: CreditCard },
  { id: "appearance", labelKey: "tabAppearance", icon: Palette },
  { id: "integrations", labelKey: "tabIntegrations", icon: Globe },
];

interface NotificationItem {
  id: string;
  labelKey: string;
  icon: TabIcon;
}

const notificationItemDefs: NotificationItem[] = [
  { id: "email_orders", labelKey: "notifEmailOrders", icon: Mail },
  { id: "sms_alerts", labelKey: "notifSmsAlerts", icon: Smartphone },
  { id: "telegram_bot", labelKey: "notifTelegramBot", icon: Bell },
  { id: "low_stock", labelKey: "notifLowStock", icon: Bell },
  { id: "maintenance", labelKey: "notifMaintenance", icon: Bell },
  { id: "daily_report", labelKey: "notifDailyReport", icon: Mail },
];

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
  const t = useTranslations("settings");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");

  // --- General Settings State ---
  const [generalForm, setGeneralForm] = useState<OrganizationSettings>({
    name: "",
    email: "",
    phone: "",
    timezone: "Asia/Tashkent",
    currency: "UZS",
    language: "ru",
    address: "",
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
  const [sessionTimeout, setSessionTimeout] = useState("30");

  // --- Appearance ---
  const [theme, setTheme] = useState("light");
  const [primaryColor, setPrimaryColor] = useState("#6B4423");

  // ─── Queries ──────────────────────────────────────────────

  const {
    data: settings,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.get("/settings");
      const data = res.data?.data || res.data;
      if (data) {
        if (data.general) setGeneralForm(data.general);
        if (data.notifications) setNotifPrefs(data.notifications);
        if (data.security?.session_timeout)
          setSessionTimeout(data.security.session_timeout);
        if (data.appearance?.theme) setTheme(data.appearance.theme);
        if (data.appearance?.primaryColor)
          setPrimaryColor(data.appearance.primaryColor);
      }
      return data;
    },
  });

  const paymentProviders: PaymentProvider[] = useMemo(
    () =>
      settings?.payments || [
        { name: "Payme", status: "connected" },
        { name: "Click", status: "connected" },
        { name: "Uzum Bank", status: "not_connected" },
        { name: t("cash"), status: "connected" },
      ],
    [settings, t],
  );

  const integrations: Integration[] = useMemo(
    () =>
      settings?.integrations || [
        {
          name: "Telegram Bot",
          description: t("integrationTelegramDesc"),
          status: "active",
        },
        {
          name: "Google Maps",
          description: t("integrationGoogleMapsDesc"),
          status: "active",
        },
        {
          name: "OFD Soliq",
          description: t("integrationOfdDesc"),
          status: "inactive",
        },
        {
          name: "Sentry",
          description: t("integrationSentryDesc"),
          status: "active",
        },
      ],
    [settings, t],
  );

  // ─── Mutations ────────────────────────────────────────────

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      await api.put("/settings", {
        general: generalForm,
        notifications: notifPrefs,
        security: { session_timeout: sessionTimeout },
        appearance: { theme, primaryColor },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success(t("saveSuccess"));
    },
    onError: () => {
      toast.error(t("saveError"));
    },
  });

  const toggleTwoFactorMutation = useMutation({
    mutationFn: async () => {
      await api.post("/settings/2fa/toggle");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success(t("twoFactorSuccess"));
    },
    onError: () => {
      toast.error(t("twoFactorError"));
    },
  });

  // ─── Render ───────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("loadErrorTitle")}</p>
        <p className="text-muted-foreground mb-4">
          {t("loadErrorDescription")}
        </p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["settings"] })
          }
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full justify-start gap-3 ${
                    activeTab !== tab.id ? "text-muted-foreground" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {t(tab.labelKey)}
                </Button>
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
                  {activeTab === "general" && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold">
                        {t("organizationSettings")}
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("orgName")}
                          </label>
                          <Input
                            value={generalForm.name}
                            onChange={(e) =>
                              setGeneralForm({
                                ...generalForm,
                                name: e.target.value,
                              })
                            }
                            placeholder="VendHub HQ"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("contactEmail")}
                          </label>
                          <Input
                            type="email"
                            value={generalForm.email}
                            onChange={(e) =>
                              setGeneralForm({
                                ...generalForm,
                                email: e.target.value,
                              })
                            }
                            placeholder="admin@vendhub.uz"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("phone")}
                          </label>
                          <Input
                            type="tel"
                            value={generalForm.phone}
                            onChange={(e) =>
                              setGeneralForm({
                                ...generalForm,
                                phone: e.target.value,
                              })
                            }
                            placeholder="+998 71 200 0000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("timezone")}
                          </label>
                          <Select
                            value={generalForm.timezone}
                            onValueChange={(v) =>
                              setGeneralForm({ ...generalForm, timezone: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Asia/Tashkent">
                                Asia/Tashkent (UTC+5)
                              </SelectItem>
                              <SelectItem value="Asia/Samarkand">
                                Asia/Samarkand (UTC+5)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("currency")}
                          </label>
                          <Select
                            value={generalForm.currency}
                            onValueChange={(v) =>
                              setGeneralForm({ ...generalForm, currency: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UZS">
                                {t("currencyUzs")}
                              </SelectItem>
                              <SelectItem value="USD">
                                {t("currencyUsd")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("language")}
                          </label>
                          <Select
                            value={generalForm.language}
                            onValueChange={(v) =>
                              setGeneralForm({ ...generalForm, language: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ru">{t("langRu")}</SelectItem>
                              <SelectItem value="uz">{t("langUz")}</SelectItem>
                              <SelectItem value="en">{t("langEn")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {t("address")}
                        </label>
                        <Textarea
                          value={generalForm.address}
                          onChange={(e) =>
                            setGeneralForm({
                              ...generalForm,
                              address: e.target.value,
                            })
                          }
                          rows={3}
                          placeholder={t("addressPlaceholder")}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === "notifications" && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold">
                        {t("notificationsSettings")}
                      </h2>

                      <div className="space-y-4">
                        {notificationItemDefs.map((item) => {
                          const Icon = item.icon;
                          const key = item.id as keyof NotificationPreferences;
                          const label = t(item.labelKey);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {label}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setNotifPrefs({
                                    ...notifPrefs,
                                    [key]: !notifPrefs[key],
                                  })
                                }
                                className={`relative w-10 h-5 rounded-full p-0 ${
                                  notifPrefs[key] ? "bg-green-500" : "bg-input"
                                }`}
                                aria-label={t("toggleLabel", { label })}
                              >
                                <span
                                  className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow ${
                                    notifPrefs[key]
                                      ? "translate-x-5"
                                      : "translate-x-0.5"
                                  }`}
                                />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === "security" && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold">{t("security")}</h2>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">
                              {t("twoFactorAuth")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("twoFactorDescription")}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleTwoFactorMutation.mutate()}
                            disabled={toggleTwoFactorMutation.isPending}
                          >
                            {toggleTwoFactorMutation.isPending
                              ? t("twoFactorUpdating")
                              : settings?.security?.two_factor_enabled
                                ? t("disable2fa")
                                : t("enable2fa")}
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">
                              {t("sessionTimeout")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("sessionTimeoutDescription")}
                            </p>
                          </div>
                          <Select
                            value={sessionTimeout}
                            onValueChange={setSessionTimeout}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">
                                {t("timeout30min")}
                              </SelectItem>
                              <SelectItem value="60">
                                {t("timeout1hour")}
                              </SelectItem>
                              <SelectItem value="240">
                                {t("timeout4hours")}
                              </SelectItem>
                              <SelectItem value="480">
                                {t("timeout8hours")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">
                              {t("apiKeys")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("apiKeysDescription")}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toast.success(t("apiKeysComingSoon"))
                            }
                          >
                            {t("manage")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "payments" && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold">
                        {t("paymentsSettings")}
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paymentProviders.map((provider) => (
                          <div
                            key={provider.name}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <CreditCard className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{provider.name}</p>
                                <p
                                  className={`text-xs ${provider.status === "connected" ? "text-green-600" : "text-muted-foreground"}`}
                                >
                                  {provider.status === "connected"
                                    ? t("connected")
                                    : t("notConnected")}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant={
                                provider.status === "connected"
                                  ? "outline"
                                  : "default"
                              }
                              size="sm"
                              onClick={() =>
                                toast.success(
                                  t("providerComingSoon", {
                                    name: provider.name,
                                  }),
                                )
                              }
                            >
                              {provider.status === "connected"
                                ? t("configure")
                                : t("connect")}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "appearance" && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold">
                        {t("appearance")}
                      </h2>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            {t("theme")}
                          </label>
                          <div className="flex gap-3">
                            {[
                              { id: "light", labelKey: "themeLight" },
                              { id: "dark", labelKey: "themeDark" },
                              { id: "system", labelKey: "themeSystem" },
                            ].map((themeOption) => (
                              <Button
                                key={themeOption.id}
                                variant={
                                  theme === themeOption.id
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setTheme(themeOption.id)}
                              >
                                {theme === themeOption.id && (
                                  <Check className="h-4 w-4 mr-1" />
                                )}
                                {t(themeOption.labelKey)}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            {t("primaryColor")}
                          </label>
                          <div className="flex gap-2">
                            {[
                              "#6B4423",
                              "#2563eb",
                              "#059669",
                              "#dc2626",
                              "#7c3aed",
                            ].map((color) => (
                              <Button
                                key={color}
                                variant="ghost"
                                size="sm"
                                onClick={() => setPrimaryColor(color)}
                                className={`w-8 h-8 rounded-full p-0 border-2 shadow ${
                                  primaryColor === color
                                    ? "border-foreground scale-110"
                                    : "border-transparent"
                                }`}
                                style={{ backgroundColor: color }}
                                aria-label={t("colorLabel", { color })}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "integrations" && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold">
                        {t("integrationsTitle")}
                      </h2>

                      <div className="space-y-4">
                        {integrations.map((integration) => (
                          <div
                            key={integration.name}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{integration.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {integration.description}
                              </p>
                            </div>
                            <Badge
                              variant={
                                integration.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {integration.status === "active"
                                ? t("integrationActive")
                                : t("integrationInactive")}
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
                      {saveSettingsMutation.isPending
                        ? t("saving")
                        : t("saveSettings")}
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
