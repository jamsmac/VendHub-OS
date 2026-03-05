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
import type { NotificationCampaign } from "./notification-types";

export interface CampaignFormProps {
  campaign: NotificationCampaign | null;
  onSubmit: (data: Partial<NotificationCampaign>) => void;
  isPending: boolean;
}

export function CampaignForm({
  campaign,
  onSubmit,
  isPending,
}: CampaignFormProps) {
  const t = useTranslations("notifications");
  const [formData, setFormData] = useState({
    name: campaign?.name || "",
    message: campaign?.message || "",
    audience_filter: "all",
    channels:
      campaign?.channels || ([] as ("push" | "email" | "sms" | "telegram")[]),
    scheduled_at: campaign?.scheduled_at || "",
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
        <label className="text-sm font-medium">{t("form_campaign_name")}</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t("form_campaign_name_placeholder")}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t("form_message")}</label>
        <Textarea
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
          placeholder={t("form_campaign_message_placeholder")}
          rows={4}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">
            {t("form_target_audience")}
          </label>
          <Select
            value={formData.audience_filter}
            onValueChange={(v) =>
              setFormData({ ...formData, audience_filter: v })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("audience_all")}</SelectItem>
              <SelectItem value="admins">{t("audience_admins")}</SelectItem>
              <SelectItem value="managers">{t("audience_managers")}</SelectItem>
              <SelectItem value="operators">
                {t("audience_operators")}
              </SelectItem>
              <SelectItem value="warehouse">
                {t("audience_warehouse")}
              </SelectItem>
              <SelectItem value="accountants">
                {t("audience_accountants")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">
            {t("form_schedule_optional")}
          </label>
          <Input
            type="datetime-local"
            value={formData.scheduled_at}
            onChange={(e) =>
              setFormData({ ...formData, scheduled_at: e.target.value })
            }
          />
        </div>
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
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? t("saving")
            : campaign
              ? t("btn_update")
              : t("btn_create")}
        </Button>
      </div>
    </form>
  );
}
