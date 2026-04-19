"use client";

import { Badge } from "@/components/ui/badge";

const BADGE_CONFIG = {
  refill_now: { variant: "destructive" as const, label: "Срочно" },
  refill_soon: { variant: "outline" as const, label: "Скоро" },
  monitor: { variant: "secondary" as const, label: "Норма" },
};

export function RefillPriorityBadge({ action }: { action: string }) {
  const config =
    BADGE_CONFIG[action as keyof typeof BADGE_CONFIG] ?? BADGE_CONFIG.monitor;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
