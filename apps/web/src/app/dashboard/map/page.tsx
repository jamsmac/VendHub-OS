"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Coffee,
  Search,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  WifiOff,
  Wrench,
  RefreshCw,
  List,
  ChevronRight,
  ExternalLink,
  Thermometer,
  Battery,
  Signal,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { machinesApi } from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/utils";

// ============================================================================
// Leaflet map — dynamic import required (Leaflet uses window on import)
// ============================================================================

const LeafletDashboardMap = dynamic(
  () =>
    import("./LeafletDashboardMap").then((m) => ({
      default: m.LeafletDashboardMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[calc(100vh-320px)] min-h-[400px] rounded-lg border bg-muted flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Загрузка карты…</p>
        </div>
      </div>
    ),
  },
);

// ============================================================================
// Types
// ============================================================================

interface MachineMapItem {
  id: string;
  machineNumber: string;
  name: string;
  status: "online" | "offline" | "warning" | "error" | "maintenance";
  latitude: number;
  longitude: number;
  locationName: string;
  address: string;
  lastSeen: string;
  slotsCount: number;
  emptySlotsCount: number;
  todaySales: number;
  todayRevenue: number;
  errors: number;
  temperature?: number;
  signalStrength?: number;
  batteryLevel?: number;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<
  string,
  { labelKey: string; color: string; bgColor: string; icon: LucideIcon }
> = {
  online: {
    labelKey: "status_online",
    color: "text-green-600",
    bgColor: "bg-green-500",
    icon: CheckCircle,
  },
  offline: {
    labelKey: "status_offline",
    color: "text-gray-500",
    bgColor: "bg-gray-400",
    icon: WifiOff,
  },
  warning: {
    labelKey: "status_warning",
    color: "text-yellow-600",
    bgColor: "bg-yellow-500",
    icon: AlertTriangle,
  },
  error: {
    labelKey: "status_error",
    color: "text-red-600",
    bgColor: "bg-red-500",
    icon: XCircle,
  },
  maintenance: {
    labelKey: "status_maintenance",
    color: "text-blue-600",
    bgColor: "bg-blue-500",
    icon: Wrench,
  },
};

// ============================================================================
// Component
// ============================================================================

export default function MapPage() {
  const t = useTranslations("map");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState<MachineMapItem | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Fetch machines map data
  const {
    data: machinesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["machines-map"],
    queryFn: async () => {
      const res = await machinesApi.getMap();
      return (res.data?.data || res.data || []) as MachineMapItem[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const machines = (machinesData || []).filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.machineNumber.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.locationName?.toLowerCase().includes(q) ||
        m.address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Status counts
  const statusCounts = (machinesData || []).reduce(
    (acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      acc.total++;
      return acc;
    },
    { total: 0 } as Record<string, number>,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            {t("refresh")}
          </Button>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="rounded-r-none"
            >
              <MapPin className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          {t("filterAll", { count: statusCounts.total || 0 })}
        </Button>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <Button
            key={key}
            variant={statusFilter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(key)}
            className="gap-1.5"
          >
            <div className={`w-2 h-2 rounded-full ${config.bgColor}`} />
            {t(config.labelKey)} ({statusCounts[key] || 0})
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Map View */}
      {viewMode === "map" ? (
        <div className="relative">
          {/* Leaflet map — no API key needed, uses OpenStreetMap */}
          <LeafletDashboardMap
            machines={machines}
            onMachineClick={(clicked) =>
              setSelectedMachine(
                machines.find((m) => m.id === clicked.id) ?? null,
              )
            }
            className="w-full h-[calc(100vh-320px)] min-h-[400px] rounded-lg border"
          />

          {/* Floating stats overlay — z-[1000] to stay above Leaflet tiles */}
          <div className="absolute top-3 right-3 z-[1000] bg-card/95 backdrop-blur border rounded-lg p-3 shadow-lg">
            <p className="text-sm font-medium mb-1">
              {t("machinesCount", { count: machines.length })}
            </p>
            <div className="space-y-1">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const count = machines.filter((m) => m.status === key).length;
                if (!count) return null;
                return (
                  <div key={key} className="flex items-center gap-1.5 text-xs">
                    <div className={`w-2 h-2 rounded-full ${config.bgColor}`} />
                    <span>
                      {t(config.labelKey)}: {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : machines.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Coffee className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">{t("notFound")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("tryChangeFilters")}
                </p>
              </CardContent>
            </Card>
          ) : (
            machines.map((machine) => {
              const statusConfig =
                STATUS_CONFIG[machine.status] || STATUS_CONFIG.offline;
              const StatusIcon = statusConfig.icon;
              const stockPercent =
                machine.slotsCount > 0
                  ? Math.round(
                      ((machine.slotsCount - machine.emptySlotsCount) /
                        machine.slotsCount) *
                        100,
                    )
                  : 0;

              return (
                <Card
                  key={machine.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedMachine(machine)}
                >
                  <CardContent className="py-4 flex items-center gap-4">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${statusConfig.bgColor}/20`}
                    >
                      <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{machine.machineNumber}</p>
                        <span className="text-sm text-muted-foreground">
                          {machine.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {machine.locationName ||
                          machine.address ||
                          t("noAddress")}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2 justify-end">
                        <Badge variant="secondary" className="text-xs">
                          {t("stockFilled", { percent: stockPercent })}
                        </Badge>
                        {machine.errors > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {t("errorsCount", { count: machine.errors })}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("todayStats", {
                          sales: machine.todaySales,
                          revenue: formatNumber(machine.todayRevenue ?? 0),
                        })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Machine Detail Sheet */}
      <Sheet
        open={!!selectedMachine}
        onOpenChange={(open) => !open && setSelectedMachine(null)}
      >
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedMachine &&
            (() => {
              const m = selectedMachine;
              const statusConfig =
                STATUS_CONFIG[m.status] || STATUS_CONFIG.offline;
              const StatusIcon = statusConfig.icon;
              const stockPercent =
                m.slotsCount > 0
                  ? Math.round(
                      ((m.slotsCount - m.emptySlotsCount) / m.slotsCount) * 100,
                    )
                  : 0;

              return (
                <>
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Coffee className="h-5 w-5" />
                      {m.machineNumber}
                    </SheetTitle>
                    <SheetDescription>{m.name}</SheetDescription>
                  </SheetHeader>

                  <div className="space-y-6 mt-6">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          className={`h-5 w-5 ${statusConfig.color}`}
                        />
                        <span className={`font-medium ${statusConfig.color}`}>
                          {t(statusConfig.labelKey)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("lastSeen")} {formatDateTime(m.lastSeen)}
                      </span>
                    </div>

                    {/* Location */}
                    <div>
                      <p className="text-sm font-medium mb-1">
                        {t("location")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {m.locationName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.address}
                      </p>
                      {m.latitude && m.longitude && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {m.latitude.toFixed(5)}, {m.longitude.toFixed(5)}
                        </p>
                      )}
                    </div>

                    {/* Today Stats */}
                    <div>
                      <p className="text-sm font-medium mb-2">{t("today")}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xl font-bold">{m.todaySales}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("sales")}
                          </p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xl font-bold">
                            {formatNumber(m.todayRevenue ?? 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("revenueUzs")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stock */}
                    <div>
                      <p className="text-sm font-medium mb-2">
                        {t("stockLevel")}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${stockPercent > 50 ? "bg-green-500" : stockPercent > 20 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {stockPercent}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("slotsFilled", {
                          filled: m.slotsCount - m.emptySlotsCount,
                          total: m.slotsCount,
                        })}
                      </p>
                    </div>

                    {/* Telemetry */}
                    {(m.temperature !== undefined ||
                      m.signalStrength !== undefined ||
                      m.batteryLevel !== undefined) && (
                      <div>
                        <p className="text-sm font-medium mb-2">
                          {t("telemetry")}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {m.temperature !== undefined && (
                            <div className="p-2 bg-muted/50 rounded-lg text-center">
                              <Thermometer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                              <p className="text-sm font-medium">
                                {m.temperature}°C
                              </p>
                            </div>
                          )}
                          {m.signalStrength !== undefined && (
                            <div className="p-2 bg-muted/50 rounded-lg text-center">
                              <Signal className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                              <p className="text-sm font-medium">
                                {m.signalStrength}%
                              </p>
                            </div>
                          )}
                          {m.batteryLevel !== undefined && (
                            <div className="p-2 bg-muted/50 rounded-lg text-center">
                              <Battery className="h-4 w-4 mx-auto mb-1 text-green-500" />
                              <p className="text-sm font-medium">
                                {m.batteryLevel}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {m.errors > 0 && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-700 dark:text-red-400">
                            {t("activeErrors", { count: m.errors })}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/machines/${m.id}`}
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t("details")}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </>
              );
            })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
