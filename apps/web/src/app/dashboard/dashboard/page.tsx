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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-espresso-dark font-display">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-espresso-light">
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
          className="gap-2 text-espresso-light"
        >
          <RefreshCw className="h-4 w-4" />
          {t("refresh")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-espresso/10 pb-1 overflow-x-auto">
        {TAB_IDS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-t-lg px-4 py-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-espresso text-white"
                  : "text-espresso-light hover:bg-espresso-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(`tabs.${tab.id}`)}
            </Button>
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
