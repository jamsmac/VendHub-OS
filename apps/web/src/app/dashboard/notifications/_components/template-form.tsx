"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NotificationTemplate } from "./notification-types";
import { typeKeys } from "./notification-constants";

export interface TemplateFormProps {
  template: NotificationTemplate | null;
  onSubmit: (data: Partial<NotificationTemplate>) => void;
  isPending: boolean;
}

export function TemplateForm({
  template,
  onSubmit,
  isPending,
}: TemplateFormProps) {
  const t = useTranslations("notifications");
  const [formData, setFormData] = useState({
    name: template?.name || "",
    type: template?.type || "system",
    channels: template?.channels || ([] as string[]),
    subject: template?.subject || "",
    body: template?.body || "",
    variables: template?.variables?.join(", ") || "",
    is_active: template?.is_active ?? true,
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
    onSubmit({
      ...formData,
      variables: formData.variables
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t("form_template_name")}</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t("form_template_name_placeholder")}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("form_type")}</label>
          <Select
            value={formData.type}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onValueChange={(v) => setFormData({ ...formData, type: v as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeKeys.map((key) => (
                <SelectItem key={key} value={key}>
                  {t(`type_${key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>
      <div>
        <label className="text-sm font-medium">{t("form_subject")}</label>
        <Input
          value={formData.subject}
          onChange={(e) =>
            setFormData({ ...formData, subject: e.target.value })
          }
          placeholder={t("form_subject_placeholder")}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t("form_message_body")}</label>
        <Textarea
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          placeholder={t("form_message_body_placeholder")}
          rows={4}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("form_available_variables")}
        </p>
      </div>
      <div>
        <label className="text-sm font-medium">
          {t("form_variables_comma")}
        </label>
        <Input
          value={formData.variables}
          onChange={(e) =>
            setFormData({ ...formData, variables: e.target.value })
          }
          placeholder="user_name, machine_name, quantity"
        />
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
          {isPending
            ? t("saving")
            : template
              ? t("btn_update")
              : t("btn_create")}
        </Button>
      </div>
    </form>
  );
}
