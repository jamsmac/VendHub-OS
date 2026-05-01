"use client";

import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTrendDir = "up" | "down" | "flat";

/**
 * Trend semantics — independent of arrow direction.
 *
 * Example: "−18% MTTR" is a "good" trend pointing down (faster recovery).
 * Example: "+3 critical alerts" is a "bad" trend pointing up.
 */
export type KpiTrendKind = "good" | "bad" | "neutral";

export interface KpiCardProps {
  /** Lucide-react icon node, sized 5×5 (h-5 w-5). */
  icon: React.ReactNode;
  /** Uppercase label above value (rendered with .text-label semantic). */
  label: string;
  /** Primary metric — display-3xl, tabular numerics. */
  value: string;
  /** Optional trend chip (e.g. "−18%", "+3"). */
  trend?: string;
  trendDir?: KpiTrendDir;
  trendKind?: KpiTrendKind;
  /** Footer note (e.g. "vs прошлая неделя", "SLA 98%"). */
  foot?: React.ReactNode;
  /** Override icon-tint class. Default: bg-hub-sand/10 text-hub-sand. */
  iconClassName?: string;
  className?: string;
}

/**
 * KpiCard — handoff-aligned KPI tile.
 *
 * Visual: rounded-xl card with sand-tinted icon badge, semantic label,
 * display-weight value, optional colored trend, and footer note.
 *
 * Typography: font-display + tabular for metric, .text-label for label
 * (uppercase tracking automatic).
 *
 * Used in: /dashboard/incidents, /dashboard, /dashboard/tasks,
 * /dashboard/machines.
 */
export function KpiCard({
  icon,
  label,
  value,
  trend,
  trendDir = "flat",
  trendKind = "neutral",
  foot,
  iconClassName,
  className,
}: KpiCardProps) {
  const trendColorClass =
    trendKind === "good"
      ? "text-success"
      : trendKind === "bad"
        ? "text-destructive"
        : "text-muted-foreground";

  const TrendIcon =
    trendDir === "up" ? TrendingUp : trendDir === "down" ? TrendingDown : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/80 p-4 shadow-card-md transition-shadow duration-short hover:shadow-card-lg",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            iconClassName ?? "bg-hub-sand/10 text-hub-sand",
          )}
        >
          {icon}
        </div>
        <p className="text-label text-muted-foreground">{label}</p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="font-display text-3xl font-bold tabular leading-none">
          {value}
        </p>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-1 text-sm font-medium tabular",
              trendColorClass,
            )}
          >
            {TrendIcon && <TrendIcon className="w-3.5 h-3.5" />}
            {trend}
          </span>
        )}
      </div>
      {foot && <p className="mt-2 text-xs text-muted-foreground">{foot}</p>}
    </div>
  );
}
