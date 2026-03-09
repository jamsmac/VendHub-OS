"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { useRecentActivity } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import {
  ACTIVITY_FEED,
  ACTIVITY_CONFIG,
  ACTIVITY_TYPE_I18N_MAP,
  type ActivityType,
} from "./constants";

const ACTIVITY_FILTER_IDS = [
  "all",
  "sale",
  "refill",
  "alert",
  "task",
  "collection",
  "maintenance",
] as const;

export function ActivityTab() {
  const t = useTranslations("dashboardMain");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const { data: activityLogs } = useRecentActivity(50);

  const activityFeed =
    activityLogs && activityLogs.length > 0
      ? activityLogs.map((log: unknown, index: number) => {
          const l = log as {
            id?: string;
            action?: string;
            resource?: string;
            details?: string;
            timestamp?: string;
          };
          return {
            id: l.id || `activity-${index}`,
            type: (l.action?.toLowerCase() || "sale") as ActivityType,
            text: l.action || t("format.event"),
            machine: l.resource || "Unknown",
            detail: l.details || "N/A",
            time: timeAgo(l.timestamp || ""),
          };
        })
      : ACTIVITY_FEED;

  const filtered = useMemo(() => {
    if (activityFilter === "all") return activityFeed;
    return activityFeed.filter(
      (a: (typeof activityFeed)[0]) => a.type === activityFilter,
    );
  }, [activityFilter, activityFeed]);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {Object.entries(ACTIVITY_CONFIG).map(
          ([type, cfg]: [string, unknown]) => {
            const c = cfg as {
              icon: React.ComponentType<{ className?: string }>;
              bg: string;
              color: string;
            };
            const Icon = c.icon;
            const count = activityFeed.filter(
              (a: (typeof activityFeed)[0]) => a.type === type,
            ).length;
            const i18nKey = ACTIVITY_TYPE_I18N_MAP[type as ActivityType];
            return (
              <Card key={type}>
                <CardContent className="p-3 flex items-center gap-2">
                  <div className={`rounded-lg p-1.5 ${c.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${c.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-espresso-dark">
                      {count}
                    </p>
                    <p className="text-xs text-espresso-light capitalize">
                      {t(`activityTab.${i18nKey}`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {ACTIVITY_FILTER_IDS.map((id) => {
          const labelKey =
            id === "all"
              ? "filterAll"
              : ACTIVITY_TYPE_I18N_MAP[id as ActivityType];
          return (
            <button
              key={id}
              onClick={() => setActivityFilter(id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activityFilter === id
                  ? "bg-espresso text-white"
                  : "bg-stone-100 text-espresso-light hover:bg-stone-200"
              }`}
            >
              {t(`activityTab.${labelKey}`)}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-stone-100">
            {filtered.map((event: (typeof activityFeed)[0], idx: number) => {
              const cfg = ACTIVITY_CONFIG[event.type as ActivityType];
              const c = cfg as {
                icon: React.ComponentType<{ className?: string }>;
                bg: string;
                color: string;
              };
              const Icon = c.icon;
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-4 hover:bg-stone-50/50 transition-colors"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center gap-1">
                    <div className={`rounded-lg p-2 ${c.bg}`}>
                      <Icon className={`h-4 w-4 ${c.color}`} />
                    </div>
                    {idx < filtered.length - 1 && (
                      <div className="w-px flex-1 bg-stone-200 min-h-[16px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-espresso-dark">
                      {event.text}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-espresso-light">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {event.machine}
                      </span>
                      <span>·</span>
                      <span>{event.detail}</span>
                    </div>
                  </div>

                  {/* Time */}
                  <span className="text-xs text-espresso-light whitespace-nowrap shrink-0">
                    {event.time}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-espresso-light">
          {t("activityTab.noEvents")}
        </div>
      )}
    </div>
  );
}
