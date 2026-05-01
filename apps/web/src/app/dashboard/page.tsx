"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { TAB_IDS, type TabId } from "./components/constants";
import { KpiCards } from "./components/KpiCards";
import { HourlyChart } from "./components/HourlyChart";
import { MachineStatusMini } from "./components/MachineStatusMini";
import { QuickActions } from "./components/QuickActions";
import { TopProducts } from "./components/TopProducts";
import { AlertsList } from "./components/AlertsList";
import { RecentOrders } from "./components/RecentOrders";
import { SalesTab } from "./components/SalesTab";
import { MachinesTab } from "./components/MachinesTab";
import { ActivityTab } from "./components/ActivityTab";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const t = useTranslations("dashboardMain");

  return (
    <div className="space-y-6">
      {/* Header — handoff: font-display title + dated subtitle + Refresh action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(new Date(), {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" />
          {t("refresh")}
        </Button>
      </div>

      {/* Tabs — handoff: underline-indicator instead of pill-fill */}
      <div
        className="flex gap-1 border-b border-border/60 overflow-x-auto"
        role="tablist"
      >
        {TAB_IDS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap transition-colors duration-micro ${
                isActive
                  ? "text-foreground font-medium after:absolute after:content-[''] after:left-3 after:right-3 after:-bottom-px after:h-0.5 after:bg-hub-sand after:rounded-full"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(`tabs.${tab.id}`)}
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <KpiCards />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <HourlyChart />
            <MachineStatusMini />
          </div>

          <QuickActions />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <TopProducts />
            <AlertsList />
            <RecentOrders />
          </div>
        </div>
      )}

      {/* Tab: Sales */}
      {activeTab === "sales" && <SalesTab />}

      {/* Tab: Machines */}
      {activeTab === "machines" && <MachinesTab />}

      {/* Tab: Activity */}
      {activeTab === "activity" && <ActivityTab />}
    </div>
  );
}
