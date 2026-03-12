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
  Battery,
  Banknote,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wrench,
  Eye,
  Edit,
  Trash2,
  LayoutList,
  MapPin as MapPinIcon,
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
import { MachineMap } from "@/components/machines/MachineMap";
import Link from "next/link";

interface Machine {
  id: string;
  machineNumber: string;
  name: string;
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
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
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
    data: machines,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["machines", debouncedSearch, statusFilter],
    queryFn: () =>
      machinesApi
        .getAll({ search: debouncedSearch, status: statusFilter })
        .then((res) => res.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["machines-stats"],
    queryFn: () => machinesApi.getStats().then((res) => res.data),
  });

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

  const filteredMachines = machines?.filter((machine: Machine) => {
    if (search && !machine.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href="/dashboard/machines/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("addMachine")}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsTotal")}
                </p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Coffee className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsActive")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.active || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsNeedsAttention")}
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats?.needsAttention || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsErrors")}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {stats?.errors || 0}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
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
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="h-4 w-4 mr-1" />
            {tCommon("list")}
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("map")}
          >
            <MapPinIcon className="h-4 w-4 mr-1" />
            {tCommon("map")}
          </Button>
        </div>
      </div>

      {/* Machine List / Map */}
      {viewMode === "list" ? (
        <>
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
          ) : filteredMachines?.length === 0 ? (
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
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMachines?.map((machine: Machine) => {
                const status =
                  statusConfig[machine.status] || statusConfig.offline;
                return (
                  <Card
                    key={machine.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${status.bgColor}`}>
                            <status.icon
                              className={`h-5 w-5 ${status.color}`}
                            />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {machine.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              #{machine.machineNumber}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={tCommon("actions")}
                            >
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
                            <Link
                              href={`/dashboard/machines/${machine.id}/edit`}
                            >
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                {tCommon("edit")}
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setConfirmState({
                                  title: t("deleteConfirm"),
                                  action: () =>
                                    deleteMutation.mutate(machine.id),
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {tCommon("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">
                          {machine.address || tCommon("noAddress")}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Battery className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {tCommon("stock")}
                            </p>
                            <p className="text-sm font-medium">
                              {machine.stockLevel !== undefined
                                ? `${machine.stockLevel}%`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {tCommon("cashBox")}
                            </p>
                            <p className="text-sm font-medium">
                              {machine.currentCashAmount
                                ? `${Number(machine.currentCashAmount)}`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
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
          )}
        </>
      ) : (
        <MachineMap machines={mapData || []} />
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
