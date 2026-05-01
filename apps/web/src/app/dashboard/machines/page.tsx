"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Coffee,
  Plus,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wrench,
  Eye,
  Edit,
  Trash2,
  LayoutGrid,
  LayoutList,
  MapPin as MapPinIcon,
  Package,
  LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { machinesApi } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MachineMap } from "@/components/machines/MachineMap";
import Link from "next/link";

interface Machine {
  id: string;
  machineNumber: string;
  name: string;
  type?: string;
  connectionStatus?: string;
  status:
    | "active"
    | "low_stock"
    | "error"
    | "maintenance"
    | "offline"
    | "disabled";
  address: string;
  latitude?: number;
  longitude?: number;
  lastRefillDate?: string;
  lastCollectionDate?: string;
  currentCashAmount?: number;
  stockLevel?: number;
}

const statusStyles: Record<
  string,
  { color: string; icon: LucideIcon; bgColor: string }
> = {
  active: {
    color: "text-green-600",
    icon: CheckCircle,
    bgColor: "bg-green-100",
  },
  low_stock: {
    color: "text-yellow-600",
    icon: AlertTriangle,
    bgColor: "bg-yellow-100",
  },
  error: {
    color: "text-red-600",
    icon: XCircle,
    bgColor: "bg-red-100",
  },
  maintenance: {
    color: "text-blue-600",
    icon: Wrench,
    bgColor: "bg-blue-100",
  },
  offline: {
    color: "text-muted-foreground",
    icon: XCircle,
    bgColor: "bg-muted",
  },
  disabled: {
    color: "text-muted-foreground",
    icon: XCircle,
    bgColor: "bg-muted/50",
  },
};

const statusLabelKeys: Record<string, string> = {
  active: "statusActive",
  low_stock: "statusLowStock",
  error: "statusError",
  maintenance: "statusMaintenance",
  offline: "statusOffline",
  disabled: "statusDisabled",
};

export default function MachinesPage() {
  const t = useTranslations("machines");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);
  const queryClient = useQueryClient();

  const statusConfig = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(statusStyles).map(([key, style]) => [
          key,
          {
            ...style,
            label: t(statusLabelKeys[key] as Parameters<typeof t>[0]),
          },
        ]),
      ),
    [t],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: machinesResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["machines", debouncedSearch, statusFilter],
    queryFn: () =>
      machinesApi
        .getAll({
          search: debouncedSearch || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        })
        .then((res) => res.data),
  });

  // Safe extraction — API returns { data: Machine[], total } after TransformInterceptor unwrap,
  // but we guard against unexpected shapes (plain array, nested, or error responses).
  const machines: Machine[] = useMemo(() => {
    const raw = machinesResponse;
    if (Array.isArray(raw?.data?.data)) return raw.data.data;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [machinesResponse]);
  const _paginationTotal: number =
    machinesResponse?.data?.total ?? machinesResponse?.total ?? 0;

  // Compute all stats from machine list
  const stats = useMemo(() => {
    const total = machines.length;
    // Active group: active + low_stock (working machines)
    const active = machines.filter(
      (m) => m.status === "active" || m.status === "low_stock",
    ).length;
    const needsRefill = machines.filter((m) => m.status === "low_stock").length;
    // Inactive group breakdown
    const inactive = total - active;
    const repair = machines.filter((m) => m.status === "error").length;
    const maintenance = machines.filter(
      (m) => m.status === "maintenance",
    ).length;
    const idle = machines.filter((m) => m.status === "offline").length;
    const preSale = machines.filter((m) => m.status === "disabled").length;
    // Type breakdown
    const byType: Record<string, number> = {};
    machines.forEach((m) => {
      const tp = m.type || "other";
      byType[tp] = (byType[tp] || 0) + 1;
    });
    return {
      total,
      active,
      needsRefill,
      inactive,
      repair,
      maintenance,
      idle,
      preSale,
      byType,
    };
  }, [machines]);

  const { data: mapData } = useQuery({
    queryKey: ["machines", "map"],
    queryFn: () => machinesApi.getMap().then((res) => res.data),
    enabled: viewMode === "map",
  });

  const deleteMutation = useMutation({
    mutationFn: machinesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast.success(t("deleted"));
    },
    onError: () => {
      toast.error(t("deleteFailed"));
    },
  });

  const filteredMachines = machines.filter((machine: Machine) => {
    if (search) {
      const q = search.toLowerCase();
      const matchesName = machine.name?.toLowerCase().includes(q);
      const matchesNumber = machine.machineNumber?.toLowerCase().includes(q);
      if (!matchesName && !matchesNumber) return false;
    }
    if (statusFilter && machine.status !== statusFilter) {
      return false;
    }
    return true;
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{tCommon("loadError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadFailed")}</p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["machines"] })
          }
        >
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  // Inline subtitle (handoff: live segments)
  const subtitleSegments = [
    `${stats.total} всего`,
    stats.active > 0 && `${stats.active} активных`,
    stats.needsRefill > 0 && `${stats.needsRefill} к пополнению`,
    stats.inactive > 0 && `${stats.inactive} неактивных`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      {/* Header — handoff: font-display title + live inline-stats subtitle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subtitleSegments.join(" · ")}
          </p>
        </div>
        <Link href="/dashboard/machines/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t("addMachine")}
          </Button>
        </Link>
      </div>

      {/* ── Stats Dashboard ────────────────────────────────────── */}

      {/* Row 1: Health bar — full width */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Total */}
            <div className="flex flex-col items-center justify-center px-8 py-6 border-r">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {t("statsTotal")}
              </p>
              <p className="text-4xl font-bold tracking-tight">{stats.total}</p>
            </div>
            {/* Active/Inactive visual bar */}
            <div className="flex-1 flex flex-col justify-center px-6 py-5 gap-3">
              {/* Bar */}
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                {stats.active > 0 && (
                  <div
                    className="bg-emerald-500 transition-all duration-700"
                    style={{
                      width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%`,
                    }}
                  />
                )}
                {stats.needsRefill > 0 && (
                  <div
                    className="bg-amber-400 transition-all duration-700"
                    style={{
                      width: `${stats.total > 0 ? (stats.needsRefill / stats.total) * 100 : 0}%`,
                    }}
                  />
                )}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="font-medium">{stats.active}</span>
                  <span className="text-muted-foreground">
                    {t("statsActive")}
                  </span>
                </span>
                {stats.needsRefill > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="font-medium">{stats.needsRefill}</span>
                    <span className="text-muted-foreground">
                      {t("statsNeedsRefill")}
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="font-medium">{stats.inactive}</span>
                  <span className="text-muted-foreground">
                    {t("statsInactive")}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Sub-statuses + type breakdown */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Inactive breakdown — 4 compact cards */}
        {(
          [
            {
              key: "repair",
              value: stats.repair,
              icon: AlertTriangle,
              color: "text-red-500",
              bg: "bg-red-500/10",
            },
            {
              key: "service",
              value: stats.maintenance,
              icon: Wrench,
              color: "text-blue-500",
              bg: "bg-blue-500/10",
            },
            {
              key: "idle",
              value: stats.idle,
              icon: XCircle,
              color: "text-gray-400",
              bg: "bg-gray-500/10",
            },
            {
              key: "preSale",
              value: stats.preSale,
              icon: Package,
              color: "text-violet-500",
              bg: "bg-violet-500/10",
            },
          ] as const
        ).map((item) => (
          <Card
            key={item.key}
            className="group hover:shadow-md transition-shadow"
          >
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.bg}`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold leading-none">
                    {item.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {t(
                      `stats${item.key.charAt(0).toUpperCase() + item.key.slice(1)}` as Parameters<
                        typeof t
                      >[0],
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Type distribution — last card, wider feel */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              {t("statsByType")}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent/10"
                  >
                    <span className="font-medium">{count}</span>
                    <span className="text-muted-foreground capitalize">
                      {t(`type_${type}` as Parameters<typeof t>[0]) ?? type}
                    </span>
                  </span>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilter
                ? statusConfig[statusFilter]?.label
                : tCommon("allStatuses")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter(null)}>
              {tCommon("allStatuses")}
            </DropdownMenuItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                <config.icon className={`h-4 w-4 mr-2 ${config.color}`} />
                {config.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Mode Toggle */}
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="h-4 w-4 mr-1" />
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("map")}
          >
            <MapPinIcon className="h-4 w-4 mr-1" />
          </Button>
        </div>
      </div>

      {/* Machine Grid / List / Map */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-3" />
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMachines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Coffee className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("notFound")}</p>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter
                ? tCommon("changeFilters")
                : t("addFirst")}
            </p>
            <Link href="/dashboard/machines/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("addMachine")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMachines.map((machine: Machine) => {
            const status = statusConfig[machine.status] || statusConfig.offline;
            return (
              <Card
                key={machine.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${status.bgColor}`}>
                        <status.icon className={`h-5 w-5 ${status.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {machine.name || machine.machineNumber}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          #{machine.machineNumber}
                        </p>
                      </div>
                    </div>
                    <MachineActions
                      machine={machine}
                      statusConfig={statusConfig}
                      t={t}
                      tCommon={tCommon}
                      onDelete={(id) =>
                        setConfirmState({
                          title: t("deleteConfirm"),
                          action: () => deleteMutation.mutate(id),
                        })
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">
                      {machine.address || tCommon("noAddress")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="capitalize">
                      {machine.type || "—"}
                    </Badge>
                    <Badge
                      variant={
                        machine.connectionStatus === "online"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {machine.connectionStatus === "online"
                        ? t("statsOnline")
                        : t("statsOffline")}
                    </Badge>
                  </div>
                  <div className="pt-3 border-t">
                    <Link href={`/dashboard/machines/${machine.id}`}>
                      <Button variant="outline" className="w-full">
                        {tCommon("details")}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : viewMode === "list" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnName")}</TableHead>
                <TableHead>{t("columnNumber")}</TableHead>
                <TableHead>{t("columnType")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead>{t("columnConnection")}</TableHead>
                <TableHead>{t("columnAddress")}</TableHead>
                <TableHead className="text-right">
                  {tCommon("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.map((machine: Machine) => {
                const status =
                  statusConfig[machine.status] || statusConfig.offline;
                return (
                  <TableRow key={machine.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/machines/${machine.id}`}
                        className="hover:underline"
                      >
                        {machine.name || machine.machineNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      #{machine.machineNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {machine.type || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <status.icon className={`h-4 w-4 ${status.color}`} />
                        <span className={status.color}>{status.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          machine.connectionStatus === "online"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {machine.connectionStatus === "online"
                          ? t("statsOnline")
                          : t("statsOffline")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {machine.address || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <MachineActions
                        machine={machine}
                        statusConfig={statusConfig}
                        t={t}
                        tCommon={tCommon}
                        onDelete={(id) =>
                          setConfirmState({
                            title: t("deleteConfirm"),
                            action: () => deleteMutation.mutate(id),
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <MachineMap
          machines={
            Array.isArray(mapData?.data)
              ? mapData.data
              : Array.isArray(mapData)
                ? mapData
                : []
          }
        />
      )}
      {/* Pagination info */}
      {filteredMachines.length > 0 && viewMode !== "map" && (
        <p className="text-sm text-muted-foreground text-center">
          {t("showingMachines", {
            count: filteredMachines.length,
            total: machines.length,
          })}
        </p>
      )}
      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title ?? ""}
        onConfirm={() => confirmState?.action()}
      />
    </div>
  );
}

// Extracted dropdown menu to avoid duplication between grid and table views
function MachineActions({
  machine,
  statusConfig: _sc,
  t: _t,
  tCommon,
  onDelete,
}: {
  machine: Machine;
  statusConfig: Record<
    string,
    { color: string; icon: LucideIcon; bgColor: string; label: string }
  >;
  t: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
  onDelete: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={tCommon("actions")}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <Link href={`/dashboard/machines/${machine.id}`}>
          <DropdownMenuItem>
            <Eye className="h-4 w-4 mr-2" />
            {tCommon("view")}
          </DropdownMenuItem>
        </Link>
        <Link href={`/dashboard/machines/${machine.id}/edit`}>
          <DropdownMenuItem>
            <Edit className="h-4 w-4 mr-2" />
            {tCommon("edit")}
          </DropdownMenuItem>
        </Link>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => onDelete(machine.id)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {tCommon("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
