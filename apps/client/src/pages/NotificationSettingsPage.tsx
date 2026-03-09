import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bell,
  BellOff,
  MessageCircle,
  Gift,
  ShoppingBag,
  AlertTriangle,
  Megaphone,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationsApi } from "../lib/api";

interface NotificationSettings {
  orders: boolean;
  promotions: boolean;
  loyalty: boolean;
  quests: boolean;
  system: boolean;
  pushEnabled: boolean;
}

export function NotificationSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<NotificationSettings>({
    orders: true,
    promotions: true,
    loyalty: true,
    quests: true,
    system: true,
    pushEnabled: false,
  });

  const SETTINGS_CONFIG = [
    {
      key: "orders" as const,
      icon: ShoppingBag,
      label: t("notificationOrders"),
      description: t("notificationOrdersDescription"),
      color: "text-blue-500",
      bg: "bg-blue-100",
    },
    {
      key: "promotions" as const,
      icon: Megaphone,
      label: t("notificationPromotions"),
      description: t("notificationPromotionsDescription"),
      color: "text-orange-500",
      bg: "bg-orange-100",
    },
    {
      key: "loyalty" as const,
      icon: Gift,
      label: t("notificationLoyalty"),
      description: t("notificationLoyaltyDescription"),
      color: "text-purple-500",
      bg: "bg-purple-100",
    },
    {
      key: "quests" as const,
      icon: MessageCircle,
      label: t("notificationQuestsAchievements"),
      description: t("notificationQuestsDescription"),
      color: "text-green-500",
      bg: "bg-green-100",
    },
    {
      key: "system" as const,
      icon: AlertTriangle,
      label: t("notificationSystem"),
      description: t("notificationSystemDescription"),
      color: "text-red-500",
      bg: "bg-red-100",
    },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const res = await notificationsApi.getSettings();
      return res.data as NotificationSettings;
    },
  });

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (newSettings: Partial<NotificationSettings>) =>
      notificationsApi.updateSettings(newSettings as Record<string, boolean>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success(t("notificationSaved"));
    },
    onError: () => toast.error(t("notificationSaveError")),
  });

  const pushMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      if (enable) {
        if (!("Notification" in window)) {
          throw new Error(t("notificationBrowserNotSupported"));
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          throw new Error(t("notificationPermissionDenied"));
        }
        const registration = await navigator.serviceWorker?.ready;
        if (registration) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
          });
          const subJson = subscription.toJSON();
          await notificationsApi.subscribePush({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh ?? "",
              auth: subJson.keys?.auth ?? "",
            },
          });
        }
      } else {
        await notificationsApi.unsubscribePush();
      }
    },
    onSuccess: (_data, enable) => {
      setSettings((s) => ({ ...s, pushEnabled: enable }));
      toast.success(
        enable ? t("notificationPushEnabled") : t("notificationPushDisabled"),
      );
    },
    onError: (error: Error) => toast.error(error.message || t("error")),
  });

  const handleToggle = (key: keyof NotificationSettings) => {
    if (key === "pushEnabled") {
      pushMutation.mutate(!settings.pushEnabled);
      return;
    }
    const newValue = !settings[key];
    setSettings((s) => ({ ...s, [key]: newValue }));
    updateMutation.mutate({ [key]: newValue });
  };

  const allEnabled = SETTINGS_CONFIG.every((c) => settings[c.key]);
  const toggleAll = () => {
    const newValue = !allEnabled;
    const updates: Partial<NotificationSettings> = {};
    SETTINGS_CONFIG.forEach((c) => {
      updates[c.key] = newValue;
    });
    setSettings((s) => ({ ...s, ...updates }));
    updateMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-6 border-b">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">
            {t("notificationSettingsTitle")}
          </h1>
        </div>
        <p className="text-sm text-gray-500">
          {t("notificationSettingsSubtitle")}
        </p>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* Push Notifications Toggle */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.pushEnabled ? "bg-primary-100" : "bg-gray-100"}`}
              >
                {settings.pushEnabled ? (
                  <Bell className="h-5 w-5 text-primary-600" />
                ) : (
                  <BellOff className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{t("notificationPush")}</p>
                <p className="text-xs text-gray-500">
                  {t("notificationPushDescription")}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle("pushEnabled")}
              disabled={pushMutation.isPending}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                settings.pushEnabled ? "bg-primary-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  settings.pushEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Category Settings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
              {t("notificationCategoriesTitle")}
            </h2>
            <button
              onClick={toggleAll}
              className="text-xs text-primary-500 font-medium"
            >
              {allEnabled
                ? t("notificationDisableAll")
                : t("notificationEnableAll")}
            </button>
          </div>

          <div className="bg-white rounded-xl border divide-y">
            {SETTINGS_CONFIG.map((config) => (
              <div
                key={config.key}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bg}`}
                  >
                    <config.icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{config.label}</p>
                    <p className="text-xs text-gray-500">
                      {config.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(config.key)}
                  disabled={updateMutation.isPending}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    settings[config.key] ? "bg-primary-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      settings[config.key] ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quiet Hours Info */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex gap-3">
            <Bell className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-amber-800">
                {t("notificationQuietHours")}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {t("notificationQuietHoursDescription")}
              </p>
            </div>
          </div>
        </div>

        {/* Telegram Bot Link */}
        <a
          href="https://t.me/vendhub_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white rounded-xl border p-4"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="h-5 w-5 text-blue-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">
              {t("notificationTelegramBot")}
            </p>
            <p className="text-xs text-gray-500">
              {t("notificationTelegramDescription")}
            </p>
          </div>
          <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />
        </a>
      </div>
    </div>
  );
}
