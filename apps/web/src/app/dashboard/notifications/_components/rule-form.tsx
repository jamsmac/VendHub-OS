"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NotificationRule } from "./notification-types";
import { eventKeys, recipientKeys } from "./notification-constants";

export interface RuleFormProps {
  rule: NotificationRule | null;
  onSubmit: (data: Partial<NotificationRule>) => void;
  isPending: boolean;
}

export function RuleForm({ rule, onSubmit, isPending }: RuleFormProps) {
  const t = useTranslations("notifications");
  const [formData, setFormData] = useState({
    name: rule?.name || "",
    event: rule?.event || "",
    conditions: rule?.conditions || "",
    recipients: rule?.recipients || "",
    channels:
      rule?.channels || ([] as ("push" | "email" | "sms" | "telegram")[]),
    is_active: rule?.is_active ?? true,
  });

  const toggleChannel = (ch: "push" | "email" | "sms" | "telegram") => {
    setFormData({
      ...formData,
      channels: formData.channels.includes(ch)
        ? formData.channels.filter((c) => c !== ch)
        : [...formData.channels, ch],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t("form_rule_name")}</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t("form_rule_name_placeholder")}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">
            {t("form_trigger_event")}
          </label>
          <Select
            value={formData.event}
            onValueChange={(v) => setFormData({ ...formData, event: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("form_select_event")} />
            </SelectTrigger>
            <SelectContent>
              {eventKeys.map((key) => (
                <SelectItem key={key} value={key}>
                  {t(`event_${key.replace(".", "_")}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">{t("form_recipients")}</label>
          <Select
            value={formData.recipients}
            onValueChange={(v) => setFormData({ ...formData, recipients: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("form_select_recipients")} />
            </SelectTrigger>
            <SelectContent>
              {recipientKeys.map((key) => (
                <SelectItem key={key} value={key}>
                  {t(`recipient_${key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">{t("form_conditions")}</label>
        <Input
          value={formData.conditions}
          onChange={(e) =>
            setFormData({ ...formData, conditions: e.target.value })
          }
          placeholder={t("form_conditions_placeholder")}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("form_conditions_hint")}
        </p>
      </div>
      <div>
        <label className="text-sm font-medium">
          {t("form_delivery_channels")}
        </label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {(["push", "email", "sms", "telegram"] as const).map((ch) => (
            <Button
              key={ch}
              type="button"
              variant={formData.channels.includes(ch) ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => toggleChannel(ch)}
            >
              {t(`channel_${ch}`)}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, is_active: checked })
            }
          />
          <span>{formData.is_active ? t("active") : t("inactive")}</span>
        </label>
        <Button type="submit" disabled={isPending}>
          {isPending ? t("saving") : rule ? t("btn_update") : t("btn_create")}
        </Button>
      </div>
    </form>
  );
}
