"use client";

import { useTranslations } from "next-intl";
import { STATUS_CONFIG } from "./config";
import { StatusKey } from "./types";

export function StatusBadge({ status }: { status: StatusKey }) {
  const t = useTranslations("finance");
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  const Icon = cfg.icon;

  const statusLabels: Record<StatusKey, string> = {
    completed: t("statusCompleted"),
    pending: t("statusPending"),
    failed: t("statusFailed"),
    paid: t("statusPaid"),
    overdue: t("statusOverdue"),
    matched: t("statusMatched"),
    discrepancy: t("statusDiscrepancy"),
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
    >
      <Icon className="h-3 w-3" />
      {statusLabels[status]}
    </span>
  );
}
