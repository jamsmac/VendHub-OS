"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Search, Clock } from "lucide-react";
import { useMachines } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import { MACHINE_STATUS, MACHINE_STATUS_META, fmtShort } from "./constants";

export function MachinesTab() {
  const t = useTranslations("dashboardMain");
  const [machineSearch, setMachineSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: machines } = useMachines();

  const machineList =
    machines && machines.length > 0
      ? machines.map((m: unknown) => {
          const machine = m as {
            id?: string;
            name?: string;
            status?: string;
            sales?: number;
            orders?: number;
            lastSync?: string;
            stock?: number;
            cpu?: number;
            temp?: number;
          };
          return {
            id: machine.id || machine.name || "unknown",
            name: machine.name || "Unknown Machine",
            status: (machine.status || "offline") as
              | "online"
              | "warning"
              | "offline",
            sales: machine.sales || 0,
            orders: machine.orders || 0,
            lastSync: machine.lastSync || "N/A",
            stock: machine.stock || 0,
            cpu: machine.cpu || 0,
            temp: machine.temp || 0,
          };
        })
      : MACHINE_STATUS;

  const filtered = useMemo(() => {
    return machineList.filter((m: (typeof machineList)[0]) => {
      const matchSearch =
        m.name.toLowerCase().includes(machineSearch.toLowerCase()) ||
        m.id.toLowerCase().includes(machineSearch.toLowerCase());
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [machineSearch, statusFilter, machineList]);

  const totalRevenue = machineList.reduce(
    (s: number, m: (typeof machineList)[0]) => s + m.sales,
    0,
  );
  const totalOrders = machineList.reduce(
    (s: number, m: (typeof machineList)[0]) => s + m.orders,
    0,
  );

  const statusFilters = [
    { id: "all", labelKey: "all" as const },
    { id: "online", labelKey: "online" as const },
    { id: "warning", labelKey: "warning" as const },
    { id: "offline", labelKey: "offline" as const },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">
              {t("machinesTab.totalMachines")}
            </p>
            <p className="text-xl font-bold text-espresso-dark font-display">
              {machineList.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">
              {t("machinesTab.totalRevenue")}
            </p>
            <p className="text-xl font-bold text-espresso-dark font-display">
              {fmtShort(totalRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">
              {t("machinesTab.totalOrders")}
            </p>
            <p className="text-xl font-bold text-espresso-dark font-display">
              {formatNumber(totalOrders)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">
              {t("machinesTab.avgPerMachine")}
            </p>
            <p className="text-xl font-bold text-espresso-dark font-display">
              {fmtShort(Math.round(totalRevenue / (machineList.length || 1)))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso-light" />
          <Input
            placeholder={t("machinesTab.searchPlaceholder")}
            className="pl-9"
            value={machineSearch}
            onChange={(e) => setMachineSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {statusFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.id
                  ? "bg-espresso text-white"
                  : "bg-stone-100 text-espresso-light hover:bg-stone-200"
              }`}
            >
              {t(`machinesTab.${f.labelKey}`)}
              {f.id !== "all" && (
                <span className="ml-1">
                  (
                  {
                    machineList.filter(
                      (m: (typeof machineList)[0]) => m.status === f.id,
                    ).length
                  }
                  )
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Machines grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((m: (typeof machineList)[0]) => {
          const meta = MACHINE_STATUS_META[m.status];
          const statusLabel = t(
            `machinesTab.${m.status}` as
              | "machinesTab.online"
              | "machinesTab.warning"
              | "machinesTab.offline",
          );
          return (
            <Card
              key={m.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                  <Badge
                    variant={
                      meta.badge as
                        | "default"
                        | "secondary"
                        | "destructive"
                        | "outline"
                    }
                  >
                    {statusLabel}
                  </Badge>
                  <span className="ml-auto text-xs text-espresso-light">
                    {m.id}
                  </span>
                </div>
                <p className="text-sm font-semibold text-espresso-dark truncate">
                  {m.name}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-espresso-light">
                      {t("machinesTab.revenue")}
                    </p>
                    <p className="text-sm font-bold text-espresso-dark">
                      {fmtShort(m.sales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-espresso-light">
                      {t("machinesTab.orders")}
                    </p>
                    <p className="text-sm font-bold text-espresso-dark">
                      {m.orders}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-espresso-light">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {m.lastSync}
                  </span>
                  {m.stock < 30 ? (
                    <span className="text-red-600 font-medium">
                      {t("machinesTab.stockPercent", { percent: m.stock })}
                    </span>
                  ) : (
                    <span>
                      {t("machinesTab.stockPercent", { percent: m.stock })}
                    </span>
                  )}
                </div>
                {/* Stock bar */}
                <div className="mt-1.5 h-1 w-full rounded-full bg-stone-100">
                  <div
                    className={`h-full rounded-full ${m.stock < 25 ? "bg-red-500" : m.stock < 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${m.stock}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-espresso-light">
          {t("machinesTab.notFound")}
        </div>
      )}
    </div>
  );
}
