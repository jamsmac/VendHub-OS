"use client";

import { useState, useMemo } from "react";
import { MapPin } from "lucide-react";
import { useRecentActivity } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import { ACTIVITY_FEED, ACTIVITY_CONFIG, type ActivityType } from "./constants";

export function ActivityTab() {
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const { data: activityLogs } = useRecentActivity(50);

  const activityFeed =
    activityLogs && activityLogs.length > 0
      ? activityLogs.map((log: unknown) => {
          const l = log as {
            id?: string;
            action?: string;
            resource?: string;
            details?: string;
            timestamp?: string;
          };
          return {
            id: parseInt(l.id || "0", 10) || Math.random(),
            type: (l.action?.toLowerCase() || "sale") as ActivityType,
            text: l.action || "Событие",
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

  const ACTIVITY_FILTERS = [
    { id: "all", label: "Все" },
    { id: "sale", label: "Продажи" },
    { id: "refill", label: "Загрузки" },
    { id: "alert", label: "Алерты" },
    { id: "task", label: "Задачи" },
    { id: "collection", label: "Инкассация" },
    { id: "maintenance", label: "ТО" },
  ];

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
                      {type === "sale"
                        ? "Продажи"
                        : type === "refill"
                          ? "Загрузки"
                          : type === "alert"
                            ? "Алерты"
                            : type === "task"
                              ? "Задачи"
                              : type === "collection"
                                ? "Инкассация"
                                : "ТО"}
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
        {ACTIVITY_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActivityFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activityFilter === f.id
                ? "bg-espresso text-white"
                : "bg-stone-100 text-espresso-light hover:bg-stone-200"
            }`}
          >
            {f.label}
          </button>
        ))}
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
          Нет событий по выбранному фильтру
        </div>
      )}
    </div>
  );
}
