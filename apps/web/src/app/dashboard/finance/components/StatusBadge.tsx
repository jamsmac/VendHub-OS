"use client";

import { useTranslations } from "next-intl";
import { STATUS_CONFIG } from "./config";
import { StatusKey } from "./types";

export function StatusBadge({ status }: { status: StatusKey }) {
  const t = useTranslations("finance");
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
    >
      <Icon className="h-3 w-3" />
      {t(cfg.label)}
    </span>
  );
}
