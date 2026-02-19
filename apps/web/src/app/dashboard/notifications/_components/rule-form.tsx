"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
    channels: rule?.channels || ([] as string[]),
    is_active: rule?.is_active ?? true,
  });

  const toggleChannel = (ch: string) => {
    setFormData({
      ...formData,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channels: formData.channels.includes(ch as any)
        ? formData.channels.filter((c) => c !== ch)
        : [...formData.channels, ch],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSubmit(formData as any);
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
            <button
              key={ch}
              type="button"
              onClick={() => toggleChannel(ch)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                formData.channels.includes(ch)
                  ? "bg-primary text-white border-primary"
                  : "bg-background border-input hover:bg-muted"
              }`}
            >
              {t(`channel_${ch}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() =>
              setFormData({ ...formData, is_active: !formData.is_active })
            }
            className={`relative w-10 h-5 rounded-full transition-colors ${
              formData.is_active ? "bg-green-500" : "bg-input"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform shadow ${
                formData.is_active ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span>{formData.is_active ? t("active") : t("inactive")}</span>
        </label>
        <Button type="submit" disabled={isPending}>
          {isPending ? t("saving") : rule ? t("btn_update") : t("btn_create")}
        </Button>
      </div>
    </form>
  );
}
