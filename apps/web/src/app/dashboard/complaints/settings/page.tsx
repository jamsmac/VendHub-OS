"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Clock, Shield, Bell } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api";

const complaintSettingsSchema = z.object({
  slaCritical: z.coerce.number().int().min(1).max(720),
  slaHigh: z.coerce.number().int().min(1).max(720),
  slaMedium: z.coerce.number().int().min(1).max(720),
  slaLow: z.coerce.number().int().min(1).max(720),
  autoAssign: z.boolean(),
  autoEscalate: z.boolean(),
  emailOnNew: z.boolean(),
  emailOnEscalation: z.boolean(),
  telegramOnNew: z.boolean(),
  telegramOnSlaWarning: z.boolean(),
  slaWarningPercentage: z.coerce.number().int().min(50).max(95),
});

type ComplaintSettingsValues = z.infer<typeof complaintSettingsSchema>;

const DEFAULTS: ComplaintSettingsValues = {
  slaCritical: 2,
  slaHigh: 8,
  slaMedium: 24,
  slaLow: 72,
  autoAssign: true,
  autoEscalate: true,
  emailOnNew: true,
  emailOnEscalation: true,
  telegramOnNew: true,
  telegramOnSlaWarning: true,
  slaWarningPercentage: 80,
};

export default function ComplaintsSettingsPage() {
  const t = useTranslations("complaints");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();

  const form = useForm<ComplaintSettingsValues>({
    resolver: zodResolver(complaintSettingsSchema),
    defaultValues: DEFAULTS,
  });

  // Load settings from API
  const { data: settings, isLoading } = useQuery({
    queryKey: ["complaint-settings"],
    queryFn: async () => {
      const res = await api.get("/complaints/settings");
      return res.data;
    },
  });

  // Populate form when server data arrives
  useEffect(() => {
    if (!settings) return;
    form.reset({
      slaCritical: settings.sla?.critical ?? DEFAULTS.slaCritical,
      slaHigh: settings.sla?.high ?? DEFAULTS.slaHigh,
      slaMedium: settings.sla?.medium ?? DEFAULTS.slaMedium,
      slaLow: settings.sla?.low ?? DEFAULTS.slaLow,
      autoAssign: settings.autoAssign ?? DEFAULTS.autoAssign,
      autoEscalate: settings.autoEscalate ?? DEFAULTS.autoEscalate,
      emailOnNew: settings.notifications?.emailOnNew ?? DEFAULTS.emailOnNew,
      emailOnEscalation:
        settings.notifications?.emailOnEscalation ?? DEFAULTS.emailOnEscalation,
      telegramOnNew:
        settings.notifications?.telegramOnNew ?? DEFAULTS.telegramOnNew,
      telegramOnSlaWarning:
        settings.notifications?.telegramOnSlaWarning ??
        DEFAULTS.telegramOnSlaWarning,
      slaWarningPercentage:
        settings.notifications?.slaWarningPercentage ??
        DEFAULTS.slaWarningPercentage,
    });
  }, [settings, form]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (values: ComplaintSettingsValues) => {
      await api.put("/complaints/settings", {
        sla: {
          critical: values.slaCritical,
          high: values.slaHigh,
          medium: values.slaMedium,
          low: values.slaLow,
        },
        autoAssign: values.autoAssign,
        autoEscalate: values.autoEscalate,
        notifications: {
          emailOnNew: values.emailOnNew,
          emailOnEscalation: values.emailOnEscalation,
          telegramOnNew: values.telegramOnNew,
          telegramOnSlaWarning: values.telegramOnSlaWarning,
          slaWarningPercentage: values.slaWarningPercentage,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaint-settings"] });
      toast.success(t("toastSettingsSaved"));
    },
    onError: () => toast.error(t("toastSettingsSaveError")),
  });

  const onSubmit = form.handleSubmit((values) => saveMutation.mutate(values));

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
          <p className="text-muted-foreground">{t("settingsSubtitle")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          {/* SLA Timeouts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("slaResponseTime")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("slaDescription")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    {t("priorityCritical")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      {...form.register("slaCritical")}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {t("hours")}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    {t("priorityHigh")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      {...form.register("slaHigh")}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {t("hours")}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    {t("priorityMedium")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      {...form.register("slaMedium")}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {t("hours")}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    {t("priorityLow")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={1} {...form.register("slaLow")} />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {t("hours")}
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
                {t("automation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("autoAssignTitle")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("autoAssignDescription")}
                  </p>
                </div>
                <Switch
                  checked={form.watch("autoAssign")}
                  onCheckedChange={(v) =>
                    form.setValue("autoAssign", v, { shouldDirty: true })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("autoEscalateTitle")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("autoEscalateDescription")}
                  </p>
                </div>
                <Switch
                  checked={form.watch("autoEscalate")}
                  onCheckedChange={(v) =>
                    form.setValue("autoEscalate", v, { shouldDirty: true })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t("notifications")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("emailOnNewTitle")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("emailOnNewDescription")}
                  </p>
                </div>
                <Switch
                  checked={form.watch("emailOnNew")}
                  onCheckedChange={(v) =>
                    form.setValue("emailOnNew", v, { shouldDirty: true })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("emailOnEscalationTitle")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("emailOnEscalationDescription")}
                  </p>
                </div>
                <Switch
                  checked={form.watch("emailOnEscalation")}
                  onCheckedChange={(v) =>
                    form.setValue("emailOnEscalation", v, { shouldDirty: true })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("telegramOnNewTitle")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("telegramOnNewDescription")}
                  </p>
                </div>
                <Switch
                  checked={form.watch("telegramOnNew")}
                  onCheckedChange={(v) =>
                    form.setValue("telegramOnNew", v, { shouldDirty: true })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("slaWarningTitle")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("slaWarningDescription", {
                      percentage: form.watch("slaWarningPercentage"),
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={50}
                    max={95}
                    className="w-20"
                    {...form.register("slaWarningPercentage")}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Switch
                    checked={form.watch("telegramOnSlaWarning")}
                    onCheckedChange={(v) =>
                      form.setValue("telegramOnSlaWarning", v, {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex gap-2">
            <Button
              onClick={onSubmit}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? t("settingsSaving") : tCommon("save")}
            </Button>
            <Link href="/dashboard/complaints">
              <Button variant="outline">{tCommon("cancel")}</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
