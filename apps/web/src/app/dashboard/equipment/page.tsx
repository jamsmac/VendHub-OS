"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Cog,
  Package,
  Droplets,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Coffee,
  User,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { equipmentApi, sparePartsApi, washingSchedulesApi } from "@/lib/api";
import Link from "next/link";

// --- Interfaces ---

interface Component {
  id: string;
  serialNumber: string;
  componentType: string;
  status: string;
  machineName?: string;
  machineId?: string;
  lastMaintenanceDate?: string;
  installDate?: string;
  notes?: string;
}

interface SparePart {
  id: string;
  partNumber: string;
  name: string;
  quantity: number;
  minQuantity: number;
  supplier?: string;
  costPrice?: number;
  description?: string;
}

interface WashingSchedule {
  id: string;
  machineName?: string;
  machineId?: string;
  frequency: string;
  nextWashDate?: string;
  lastWashDate?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName?: string;
  };
  status: string;
}

// --- Config Maps ---

type TabType = "components" | "spare-parts" | "washing";

const componentStatusStyles: Record<
  string,
  { color: string; bgColor: string }
> = {
  active: { color: "text-green-600", bgColor: "bg-green-100" },
  installed: { color: "text-blue-600", bgColor: "bg-blue-100" },
  maintenance: { color: "text-yellow-600", bgColor: "bg-yellow-100" },
  repair: { color: "text-orange-600", bgColor: "bg-orange-100" },
  decommissioned: {
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  in_storage: { color: "text-purple-600", bgColor: "bg-purple-100" },
  in_transit: { color: "text-cyan-600", bgColor: "bg-cyan-100" },
  defective: { color: "text-red-600", bgColor: "bg-red-100" },
};

const washingStatusStyles: Record<string, { color: string; bgColor: string }> =
  {
    active: { color: "text-green-600", bgColor: "bg-green-100" },
    overdue: { color: "text-red-600", bgColor: "bg-red-100" },
    completed: { color: "text-blue-600", bgColor: "bg-blue-100" },
    paused: { color: "text-muted-foreground", bgColor: "bg-muted" },
  };

export default function EquipmentPage() {
  const t = useTranslations("equipment");
  const [activeTab, setActiveTab] = useState<TabType>("components");
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // --- Queries ---

  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ["equipment", "components", debouncedSearch, statusFilter],
    queryFn: () =>
      equipmentApi
        .getAll({ search: debouncedSearch, status: statusFilter })
        .then((res) => res.data.data),
    enabled: activeTab === "components",
  });

  const { data: spareParts, isLoading: sparePartsLoading } = useQuery({
    queryKey: ["equipment", "spare-parts", debouncedSearch],
    queryFn: () =>
      sparePartsApi
        .getAll({ search: debouncedSearch })
        .then((res) => res.data.data),
    enabled: activeTab === "spare-parts",
  });

  const { data: washingSchedules, isLoading: washingLoading } = useQuery({
    queryKey: ["equipment", "washing", debouncedSearch],
    queryFn: () =>
      washingSchedulesApi.getAll({ search }).then((res) => res.data.data),
    enabled: activeTab === "washing",
  });

  // --- Mutations ---

  const deleteComponentMutation = useMutation({
    mutationFn: equipmentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", "components"] });
    },
  });

  const deleteSparePartMutation = useMutation({
    mutationFn: sparePartsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", "spare-parts"] });
    },
  });

  const deleteWashingMutation = useMutation({
    mutationFn: washingSchedulesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", "washing"] });
    },
  });

  // --- Tabs config ---

  const tabs = [
    { id: "components" as const, label: t("tabComponents"), icon: Cog },
    { id: "spare-parts" as const, label: t("tabSpareParts"), icon: Package },
    { id: "washing" as const, label: t("tabWashing"), icon: Droplets },
  ];

  // --- Stats ---

  const componentStats = {
    total: components?.length || 0,
    active:
      components?.filter((c: Component) =>
        ["active", "installed"].includes(c.status),
      ).length || 0,
    maintenance:
      components?.filter((c: Component) =>
        ["maintenance", "repair"].includes(c.status),
      ).length || 0,
    inStorage:
      components?.filter((c: Component) => c.status === "in_storage").length ||
      0,
  };

  const sparePartStats = {
    total: spareParts?.length || 0,
    inStock: spareParts?.filter((p: SparePart) => p.quantity > 0).length || 0,
    lowStock:
      spareParts?.filter(
        (p: SparePart) => p.quantity > 0 && p.quantity <= p.minQuantity,
      ).length || 0,
    outOfStock:
      spareParts?.filter((p: SparePart) => p.quantity === 0).length || 0,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const washingStats = {
    total: washingSchedules?.length || 0,
    active:
      washingSchedules?.filter((w: WashingSchedule) => w.status === "active")
        .length || 0,
    overdue:
      washingSchedules?.filter(
        (w: WashingSchedule) =>
          w.nextWashDate && new Date(w.nextWashDate) < today,
      ).length || 0,
    today:
      washingSchedules?.filter((w: WashingSchedule) => {
        if (!w.nextWashDate) return false;
        const d = new Date(w.nextWashDate);
        return d >= today && d < tomorrow;
      }).length || 0,
  };

  const isLoading = componentsLoading || sparePartsLoading || washingLoading;

  // --- Component status helpers ---

  const getComponentStatusLabel = (status: string) => {
    const key = `componentStatus_${status}` as const;
    return t(key);
  };

  const getComponentTypeLabel = (componentType: string) => {
    const key = `componentType_${componentType}` as const;
    return t(key);
  };

  const getWashingFrequencyLabel = (frequency: string) => {
    const key = `washingFrequency_${frequency}` as const;
    return t(key);
  };

  const getWashingStatusLabel = (status: string) => {
    const key = `washingStatus_${status}` as const;
    return t(key);
  };

  // --- Status filter options per tab ---

  const componentStatusKeys = [
    "active",
    "installed",
    "maintenance",
    "repair",
    "decommissioned",
    "in_storage",
    "in_transit",
    "defective",
  ];

  const washingStatusKeys = ["active", "overdue", "completed", "paused"];

  // --- Render Stats ---

  const renderStats = () => {
    if (activeTab === "components") {
      return (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("statsComponentsTotal")}
                  </p>
                  <p className="text-2xl font-bold">{componentStats.total}</p>
                </div>
                <Cog className="h-8 w-8 text-muted-foreground" />
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
                    {componentStats.active}
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
                    {t("statsNeedsMaintenance")}
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {componentStats.maintenance}
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
                    {t("statsInStorage")}
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {componentStats.inStorage}
                  </p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (activeTab === "spare-parts") {
      return (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("statsSparePartsTotal")}
                  </p>
                  <p className="text-2xl font-bold">{sparePartStats.total}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("statsInStock")}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {sparePartStats.inStock}
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
                    {t("statsLowStock")}
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {sparePartStats.lowStock}
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
                    {t("statsOutOfStock")}
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {sparePartStats.outOfStock}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // washing tab
    return (
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsSchedulesTotal")}
                </p>
                <p className="text-2xl font-bold">{washingStats.total}</p>
              </div>
              <Droplets className="h-8 w-8 text-muted-foreground" />
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
                  {washingStats.active}
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
                  {t("statsOverdue")}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {washingStats.overdue}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsToday")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {washingStats.today}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // --- Render Components List ---

  const renderComponents = () => {
    const filtered = components?.filter(
      (c: Component) =>
        c.serialNumber?.toLowerCase().includes(search.toLowerCase()) ||
        getComponentTypeLabel(c.componentType)
          ?.toLowerCase()
          .includes(search.toLowerCase()),
    );

    if (filtered?.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Cog className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("componentsNotFound")}</p>
            <p className="text-muted-foreground mb-4">
              {t("componentsAddFirst")}
            </p>
            <Link href="/dashboard/equipment/components/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("addComponent")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {filtered?.map((component: Component) => {
          const statusStyles =
            componentStatusStyles[component.status] ||
            componentStatusStyles.active;
          const typeLabel =
            getComponentTypeLabel(component.componentType) ||
            component.componentType;

          return (
            <Card
              key={component.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <Cog className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {component.serialNumber} - {typeLabel}
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${statusStyles.bgColor} ${statusStyles.color}`}
                        >
                          {getComponentStatusLabel(component.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {component.machineName && (
                          <span className="flex items-center gap-1">
                            <Coffee className="h-3 w-3" />
                            {component.machineName}
                          </span>
                        )}
                        {component.lastMaintenanceDate && (
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {t("maintenanceDate")}{" "}
                            {new Date(
                              component.lastMaintenanceDate,
                            ).toLocaleDateString("ru-RU")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t("actionsLabel")}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link
                        href={`/dashboard/equipment/components/${component.id}`}
                      >
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          {t("actionView")}
                        </DropdownMenuItem>
                      </Link>
                      <Link
                        href={`/dashboard/equipment/components/${component.id}/edit`}
                      >
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          {t("actionEdit")}
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setConfirmState({
                            title: t("deleteComponentConfirm"),
                            action: () =>
                              deleteComponentMutation.mutate(component.id),
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("actionDelete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // --- Render Spare Parts Table ---

  const renderSpareParts = () => {
    const filtered = spareParts?.filter(
      (p: SparePart) =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.partNumber?.toLowerCase().includes(search.toLowerCase()),
    );

    if (filtered?.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("sparePartsNotFound")}</p>
            <p className="text-muted-foreground mb-4">
              {t("sparePartsAddFirst")}
            </p>
            <Link href="/dashboard/equipment/spare-parts/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("addSparePart")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t("colPartNumber")}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t("colName")}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    {t("colQuantity")}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    {t("colMin")}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t("colSupplier")}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    {t("colCost")}
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                    {t("actionsLabel")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((part: SparePart) => {
                  const isLow =
                    part.quantity > 0 && part.quantity <= part.minQuantity;
                  const isOut = part.quantity === 0;

                  return (
                    <tr key={part.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 text-muted-foreground font-mono text-sm">
                        {part.partNumber || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{part.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={
                              isOut
                                ? "text-red-600 font-medium"
                                : isLow
                                  ? "text-yellow-600 font-medium"
                                  : ""
                            }
                          >
                            {part.quantity}
                          </span>
                          {isOut && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                              {t("stockNone")}
                            </span>
                          )}
                          {isLow && (
                            <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-600">
                              <AlertTriangle className="h-3 w-3" />
                              {t("stockLow")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {part.minQuantity}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {part.supplier || "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {part.costPrice != null
                          ? new Intl.NumberFormat("ru-RU").format(
                              part.costPrice,
                            ) + " UZS"
                          : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={t("actionsLabel")}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link
                                href={`/dashboard/equipment/spare-parts/${part.id}`}
                              >
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t("actionView")}
                                </DropdownMenuItem>
                              </Link>
                              <Link
                                href={`/dashboard/equipment/spare-parts/${part.id}/edit`}
                              >
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t("actionEdit")}
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setConfirmState({
                                    title: t("deleteSparePartConfirm"),
                                    action: () =>
                                      deleteSparePartMutation.mutate(part.id),
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("actionDelete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  // --- Render Washing Schedules ---

  const renderWashingSchedules = () => {
    const filtered = washingSchedules?.filter((w: WashingSchedule) =>
      w.machineName?.toLowerCase().includes(search.toLowerCase()),
    );

    if (filtered?.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Droplets className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("washingNotFound")}</p>
            <p className="text-muted-foreground mb-4">{t("washingAddFirst")}</p>
            <Link href="/dashboard/equipment/washing/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("createSchedule")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t("colMachine")}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t("colFrequency")}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t("colNextWash")}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t("colLastWash")}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t("colAssignee")}
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                    {t("colStatus")}
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                    {t("actionsLabel")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((schedule: WashingSchedule) => {
                  const isOverdue =
                    schedule.nextWashDate &&
                    new Date(schedule.nextWashDate) < today;
                  const statusStyles = isOverdue
                    ? washingStatusStyles.overdue
                    : washingStatusStyles[schedule.status] ||
                      washingStatusStyles.active;
                  const statusLabel = isOverdue
                    ? getWashingStatusLabel("overdue")
                    : getWashingStatusLabel(schedule.status);

                  return (
                    <tr
                      key={schedule.id}
                      className={`border-b hover:bg-muted/50 ${isOverdue ? "bg-red-50" : ""}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Coffee className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {schedule.machineName || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {getWashingFrequencyLabel(schedule.frequency) ||
                          schedule.frequency}
                      </td>
                      <td className="py-3 px-4">
                        {schedule.nextWashDate ? (
                          <div className="flex items-center gap-1">
                            {isOverdue && (
                              <AlertTriangle className="h-3 w-3 text-red-600" />
                            )}
                            <span
                              className={
                                isOverdue ? "text-red-600 font-medium" : ""
                              }
                            >
                              {new Date(
                                schedule.nextWashDate,
                              ).toLocaleDateString("ru-RU")}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {schedule.lastWashDate
                          ? new Date(schedule.lastWashDate).toLocaleDateString(
                              "ru-RU",
                            )
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {schedule.assignedTo ? (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {schedule.assignedTo.firstName}{" "}
                            {schedule.assignedTo.lastName}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${statusStyles.bgColor} ${statusStyles.color}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={t("actionsLabel")}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link
                                href={`/dashboard/equipment/washing/${schedule.id}`}
                              >
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t("actionView")}
                                </DropdownMenuItem>
                              </Link>
                              <Link
                                href={`/dashboard/equipment/washing/${schedule.id}/edit`}
                              >
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t("actionEdit")}
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setConfirmState({
                                    title: t("deleteScheduleConfirm"),
                                    action: () =>
                                      deleteWashingMutation.mutate(schedule.id),
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("actionDelete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  // --- Render content based on active tab ---

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    switch (activeTab) {
      case "components":
        return renderComponents();
      case "spare-parts":
        return renderSpareParts();
      case "washing":
        return renderWashingSchedules();
      default:
        return null;
    }
  };

  // --- Get the add button config per tab ---

  const addButtonConfig: Record<TabType, { label: string; href: string }> = {
    components: {
      label: t("addComponent"),
      href: "/dashboard/equipment/components/new",
    },
    "spare-parts": {
      label: t("addSparePart"),
      href: "/dashboard/equipment/spare-parts/new",
    },
    washing: {
      label: t("createSchedule"),
      href: "/dashboard/equipment/washing/new",
    },
  };

  // --- Status filter options per tab ---

  const currentFilterOptions: Record<string, string> =
    activeTab === "components"
      ? Object.fromEntries(
          componentStatusKeys.map((key) => [key, getComponentStatusLabel(key)]),
        )
      : activeTab === "washing"
        ? Object.fromEntries(
            washingStatusKeys.map((key) => [key, getWashingStatusLabel(key)]),
          )
        : {};

  const hasFilter = Object.keys(currentFilterOptions).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href={addButtonConfig[activeTab].href}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {addButtonConfig[activeTab].label}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => {
              setActiveTab(tab.id);
              setSearch("");
              setStatusFilter(null);
            }}
            className="gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {hasFilter && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                {statusFilter
                  ? currentFilterOptions[statusFilter]
                  : t("allStatuses")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                {t("allStatuses")}
              </DropdownMenuItem>
              {Object.entries(currentFilterOptions).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setStatusFilter(key)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      {renderContent()}

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
