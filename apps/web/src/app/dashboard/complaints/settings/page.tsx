"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Clock, AlertTriangle, Shield, Bell } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState } from "react";

interface SlaConfig {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface NotificationSettings {
  emailOnNew: boolean;
  emailOnEscalation: boolean;
  telegramOnNew: boolean;
  telegramOnSlaWarning: boolean;
  slaWarningPercentage: number;
}

export default function ComplaintsSettingsPage() {
  const t = useTranslations("complaints");
  const tCommon = useTranslations("common");

  // SLA settings (defaults from backend DEFAULT_SLA_CONFIG)
  const [sla, setSla] = useState<SlaConfig>({
    critical: 2,
    high: 8,
    medium: 24,
    low: 72,
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailOnNew: true,
    emailOnEscalation: true,
    telegramOnNew: true,
    telegramOnSlaWarning: true,
    slaWarningPercentage: 80,
  });

  const [autoAssign, setAutoAssign] = useState(true);
  const [autoEscalate, setAutoEscalate] = useState(true);

  const handleSave = () => {
    // TODO: Save to API when complaints settings endpoint is available
    toast.success("Настройки SLA сохранены");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/complaints">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("slaSettings")}</h1>
          <p className="text-muted-foreground">
            Настройка SLA, уведомлений и автоматизации жалоб
          </p>
        </div>
      </div>

      {/* SLA Timeouts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Время реагирования (SLA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Максимальное время на решение жалобы в зависимости от приоритета
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Критический
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={sla.critical}
                  onChange={(e) =>
                    setSla((s) => ({
                      ...s,
                      critical: parseInt(e.target.value) || 1,
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  часов
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Высокий
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={sla.high}
                  onChange={(e) =>
                    setSla((s) => ({
                      ...s,
                      high: parseInt(e.target.value) || 1,
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  часов
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                Средний
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={sla.medium}
                  onChange={(e) =>
                    setSla((s) => ({
                      ...s,
                      medium: parseInt(e.target.value) || 1,
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  часов
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Низкий
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={sla.low}
                  onChange={(e) =>
                    setSla((s) => ({
                      ...s,
                      low: parseInt(e.target.value) || 1,
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  часов
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Автоматизация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Автоматическое назначение</p>
              <p className="text-sm text-muted-foreground">
                Автоматически назначать жалобы на ближайшего оператора
              </p>
            </div>
            <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Автоматическая эскалация</p>
              <p className="text-sm text-muted-foreground">
                Эскалировать жалобу при нарушении SLA
              </p>
            </div>
            <Switch
              checked={autoEscalate}
              onCheckedChange={setAutoEscalate}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email при новой жалобе</p>
              <p className="text-sm text-muted-foreground">
                Отправлять email менеджеру при поступлении жалобы
              </p>
            </div>
            <Switch
              checked={notifications.emailOnNew}
              onCheckedChange={(v) =>
                setNotifications((n) => ({ ...n, emailOnNew: v }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email при эскалации</p>
              <p className="text-sm text-muted-foreground">
                Уведомлять руководителя при эскалации
              </p>
            </div>
            <Switch
              checked={notifications.emailOnEscalation}
              onCheckedChange={(v) =>
                setNotifications((n) => ({ ...n, emailOnEscalation: v }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Telegram при новой жалобе</p>
              <p className="text-sm text-muted-foreground">
                Мгновенное уведомление через Telegram бот
              </p>
            </div>
            <Switch
              checked={notifications.telegramOnNew}
              onCheckedChange={(v) =>
                setNotifications((n) => ({ ...n, telegramOnNew: v }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Предупреждение о SLA</p>
              <p className="text-sm text-muted-foreground">
                Telegram уведомление при достижении{" "}
                {notifications.slaWarningPercentage}% времени SLA
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={50}
                max={95}
                className="w-20"
                value={notifications.slaWarningPercentage}
                onChange={(e) =>
                  setNotifications((n) => ({
                    ...n,
                    slaWarningPercentage: parseInt(e.target.value) || 80,
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">%</span>
              <Switch
                checked={notifications.telegramOnSlaWarning}
                onCheckedChange={(v) =>
                  setNotifications((n) => ({ ...n, telegramOnSlaWarning: v }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex gap-2">
        <Button onClick={handleSave} className="gap-2">
          {tCommon("save")}
        </Button>
        <Link href="/dashboard/complaints">
          <Button variant="outline">{tCommon("cancel")}</Button>
        </Link>
      </div>
    </div>
  );
}
