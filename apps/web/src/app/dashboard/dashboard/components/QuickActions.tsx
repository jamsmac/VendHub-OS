"use client";

import { useTranslations } from "next-intl";
import { Plus, FileText, Truck, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUICK_ACTION_KEYS, QUICK_ACTION_META } from "./constants";

const ICON_MAP: Record<string, typeof Plus> = {
  Plus,
  FileText,
  Truck,
  Settings,
};

export function QuickActions() {
  const t = useTranslations("dashboardMain");

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {QUICK_ACTION_KEYS.map((key) => {
        const meta = QUICK_ACTION_META[key];
        const Icon = ICON_MAP[meta.icon] || Plus;
        return (
          <Button
            key={key}
            variant="ghost"
            className="group h-auto flex-col items-center gap-2 rounded-xl border border-stone-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div
              className={`rounded-xl p-2.5 text-white ${meta.color} transition-transform group-hover:scale-110`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-espresso-dark">
              {t(`quickActions.${key}`)}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
