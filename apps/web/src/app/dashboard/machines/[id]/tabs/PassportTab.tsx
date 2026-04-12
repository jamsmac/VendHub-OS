/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wifi,
  Camera,
  Trash2,
  CheckCircle2,
  XCircle,
  Signal,
  Plus,
  TrendingUp,
  Receipt,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { machinesApi } from "@/lib/api";

interface PassportTabProps {
  machine: any;
}

// ── Uzbek SIM providers ──
const SIM_PROVIDER_KEYS = [
  "Beeline",
  "Ucell",
  "Mobiuz",
  "UMS",
  "Perfectum",
] as const;

// ── Connectivity types ──
const CONNECTIVITY_TYPE_KEYS = ["sim", "wifi", "fiber", "lan"] as const;
const CONNECTIVITY_TYPE_I18N: Record<string, string> = {
  sim: "connTypeSim",
  wifi: "connTypeWifi",
  fiber: "connTypeFiber",
  lan: "connTypeLan",
};

// ── Expense categories ──
const EXPENSE_CATEGORY_KEYS = [
  "transport",
  "electrical",
  "socket",
  "mounting",
  "wiring",
  "decoration",
  "signage",
  "connectivity",
  "rent_deposit",
  "repair",
  "other",
] as const;
const EXPENSE_CAT_I18N: Record<string, string> = {
  transport: "expCatTransport",
  electrical: "expCatElectrical",
  socket: "expCatSocket",
  mounting: "expCatMounting",
  wiring: "expCatWiring",
  decoration: "expCatDecoration",
  signage: "expCatSignage",
  connectivity: "expCatConnectivity",
  rent_deposit: "expCatRentDeposit",
  repair: "expCatRepair",
  other: "expCatOther",
};

const EXPENSE_TYPE_I18N: Record<string, string> = {
  capex: "expTypeCapex",
  opex: "expTypeOpex",
};

const CONNECTIVITY_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive"
> = {
  active: "default",
  inactive: "secondary",
  suspended: "destructive",
};
const CONNECTIVITY_STATUS_I18N: Record<string, string> = {
  active: "simActive",
  inactive: "simInactive",
  suspended: "simSuspended",
};

const CONNECTIVITY_TYPE_ICON: Record<string, typeof Signal> = {
  sim: Signal,
  wifi: Wifi,
  fiber: Globe,
  lan: Globe,
};

export function PassportTab({ machine }: PassportTabProps) {
  const t = useTranslations("machineDetail");
  const queryClient = useQueryClient();
  const [simDialogOpen, setSimDialogOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [connDialogOpen, setConnDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  // Fetch components
  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ["machine-components", machine.id],
    queryFn: async () => {
      const res = await machinesApi.getComponents(machine.id);
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
    enabled: !!machine.id,
  });

  // Fetch SIM usage history
  const { data: simUsage } = useQuery({
    queryKey: ["sim-usage", machine.id],
    queryFn: async () => {
      const res = await machinesApi.getSimUsage(machine.id);
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
    enabled: !!machine.id,
  });

  // Fetch connectivity services
  const { data: connectivity } = useQuery({
    queryKey: ["machine-connectivity", machine.id],
    queryFn: async () => {
      const res = await machinesApi.getConnectivity(machine.id);
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
    enabled: !!machine.id,
  });

  // Fetch expenses
  const { data: expenses } = useQuery({
    queryKey: ["machine-expenses", machine.id],
    queryFn: async () => {
      const res = await machinesApi.getExpenses(machine.id);
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
    enabled: !!machine.id,
  });

  const simCards =
    components?.filter((c: any) => c.componentType === "sim_card") ?? [];
  const cameras =
    components?.filter((c: any) => c.componentType === "camera") ?? [];

  // Total SIM costs
  const totalSimCost =
    simUsage?.reduce((sum: number, u: any) => sum + Number(u.cost || 0), 0) ??
    0;
  const totalDataUsed =
    simUsage?.reduce(
      (sum: number, u: any) => sum + Number(u.dataUsedMb || 0),
      0,
    ) ?? 0;

  // Total expenses
  const totalCapex =
    expenses
      ?.filter((e: any) => e.expenseType === "capex")
      .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) ?? 0;
  const totalOpex =
    expenses
      ?.filter((e: any) => e.expenseType === "opex")
      .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) ?? 0;

  // Monthly connectivity cost
  const monthlyConnCost =
    connectivity
      ?.filter((c: any) => c.status === "active")
      .reduce((sum: number, c: any) => sum + Number(c.monthlyCost || 0), 0) ??
    0;

  return (
    <div className="space-y-6">
      {/* Acquisition Block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("acquisition")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("manufacturer")}</p>
              <p className="font-medium">{machine.manufacturer || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("model")}</p>
              <p className="font-medium">{machine.model || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("yearOfManufacture")}</p>
              <p className="font-medium">{machine.yearOfManufacture || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("serialNumber")}</p>
              <p className="font-medium font-mono text-xs">
                {machine.serialNumber || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("nameplateSerial")}</p>
              <p className="font-medium font-mono text-xs">
                {machine.nameplateSerial || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("purchaseDate")}</p>
              <p className="font-medium">{machine.purchaseDate || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("purchasePrice")}</p>
              <p className="font-medium">
                {machine.purchasePrice
                  ? `${Number(machine.purchasePrice).toLocaleString("ru-RU")} UZS`
                  : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Data Block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("technicalData")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("type")}</p>
              <Badge variant="outline">{machine.type}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">{t("firmware")}</p>
              <p className="font-medium font-mono text-xs">
                {machine.firmwareVersion || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("slotsCount")}</p>
              <p className="font-medium">{machine.maxProductSlots || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("connectionStatus")}</p>
              <Badge
                variant={
                  machine.connectionStatus === "online"
                    ? "default"
                    : "secondary"
                }
              >
                {machine.connectionStatus || "unknown"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          CONNECTIVITY
          ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Signal className="h-4 w-4" />
            Связь
          </CardTitle>
          <div className="flex gap-2">
            <Dialog open={simDialogOpen} onOpenChange={setSimDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  SIM-карта
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("addSimCard")}</DialogTitle>
                </DialogHeader>
                <AddSimForm
                  machineId={machine.id}
                  t={t}
                  onSuccess={() => {
                    setSimDialogOpen(false);
                    queryClient.invalidateQueries({
                      queryKey: ["machine-components", machine.id],
                    });
                  }}
                />
              </DialogContent>
            </Dialog>
            <Dialog open={connDialogOpen} onOpenChange={setConnDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Подключение
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("addConnection")}</DialogTitle>
                </DialogHeader>
                <AddConnectivityForm
                  machineId={machine.id}
                  simCards={simCards}
                  t={t}
                  onSuccess={() => {
                    setConnDialogOpen(false);
                    queryClient.invalidateQueries({
                      queryKey: ["machine-connectivity", machine.id],
                    });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active connectivity services */}
          {connectivity && connectivity.length > 0 ? (
            <div className="space-y-3">
              {connectivity.map((conn: any) => {
                const Icon =
                  CONNECTIVITY_TYPE_ICON[conn.connectivityType] || Globe;
                const badgeVariant =
                  CONNECTIVITY_STATUS_VARIANTS[conn.status] || "secondary";
                const badgeLabel = t(
                  CONNECTIVITY_STATUS_I18N[conn.status] || "simActive",
                );
                const typeLabel = t(
                  CONNECTIVITY_TYPE_I18N[conn.connectivityType] ||
                    "connTypeSim",
                );
                return (
                  <div
                    key={conn.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <Icon className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t("type")}</p>
                        <p className="font-medium">{typeLabel}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("provider")}</p>
                        <p className="font-medium">{conn.providerName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {conn.connectivityType === "sim"
                            ? t("phoneNumber")
                            : t("account")}
                        </p>
                        <p className="font-medium font-mono text-xs">
                          {conn.accountNumber || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("monthly")}</p>
                        <p className="font-medium">
                          {Number(conn.monthlyCost).toLocaleString("ru-RU")} UZS
                        </p>
                      </div>
                    </div>
                    <Badge variant={badgeVariant} className="shrink-0">
                      {badgeLabel}
                    </Badge>
                  </div>
                );
              })}
              {monthlyConnCost > 0 && (
                <div className="text-right text-sm text-muted-foreground">
                  {t("totalMonthly")}{" "}
                  <span className="font-medium text-foreground">
                    {monthlyConnCost.toLocaleString("ru-RU")} UZS
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Fallback: show SIM cards from components */
            <>
              {componentsLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : simCards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noConnectionsConfigured")}
                </p>
              ) : (
                <div className="space-y-3">
                  {simCards.map((sim: any) => (
                    <div
                      key={sim.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <Signal className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">
                            {t("operator")}
                          </p>
                          <p className="font-medium">
                            {sim.manufacturer || sim.metadata?.provider || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("number")}</p>
                          <p className="font-medium font-mono text-xs">
                            {sim.serialNumber ||
                              sim.metadata?.phoneNumber ||
                              "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("tariff")}</p>
                          <p className="font-medium">
                            {sim.metadata?.tariffPlan || "—"}
                          </p>
                        </div>
                        {sim.installedAt && (
                          <div>
                            <p className="text-muted-foreground">
                              {t("installed")}
                            </p>
                            <p className="font-medium">
                              {new Date(sim.installedAt).toLocaleDateString(
                                "ru-RU",
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={
                          sim.status === "installed" ? "default" : "secondary"
                        }
                        className="shrink-0"
                      >
                        {sim.status === "installed"
                          ? t("simActive")
                          : sim.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* SIM Usage History */}
      {(simCards.length > 0 ||
        connectivity?.some((c: any) => c.connectivityType === "sim")) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Расход трафика и стоимость
            </CardTitle>
            <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Внести данные
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("addUsageForPeriod")}</DialogTitle>
                </DialogHeader>
                <AddUsageForm
                  machineId={machine.id}
                  simCards={simCards}
                  t={t}
                  onSuccess={() => {
                    setUsageDialogOpen(false);
                    queryClient.invalidateQueries({
                      queryKey: ["sim-usage", machine.id],
                    });
                  }}
                />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {/* Summary stats */}
            {(simUsage?.length ?? 0) > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-lg font-bold">{simUsage?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("records")}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-lg font-bold">
                    {totalDataUsed >= 1024
                      ? `${(totalDataUsed / 1024).toFixed(1)} GB`
                      : `${totalDataUsed} MB`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("totalTraffic")}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-lg font-bold">
                    {totalSimCost.toLocaleString("ru-RU")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("totalUzs")}
                  </p>
                </div>
              </div>
            )}

            {/* History table */}
            {!simUsage || simUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("noUsageData")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2 font-medium">
                        {t("period")}
                      </th>
                      <th className="text-right py-2 font-medium">
                        {t("traffic")}
                      </th>
                      <th className="text-right py-2 font-medium">
                        {t("limit")}
                      </th>
                      <th className="text-right py-2 font-medium">
                        {t("cost")}
                      </th>
                      <th className="text-left py-2 font-medium">
                        {t("note")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {simUsage.map((entry: any) => (
                      <tr key={entry.id} className="border-b last:border-0">
                        <td className="py-2">
                          {formatPeriod(entry.periodStart, entry.periodEnd)}
                        </td>
                        <td className="py-2 text-right font-mono">
                          {Number(entry.dataUsedMb).toFixed(0)} MB
                        </td>
                        <td className="py-2 text-right text-muted-foreground font-mono">
                          {entry.dataLimitMb
                            ? `${Number(entry.dataLimitMb).toFixed(0)} MB`
                            : "—"}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {Number(entry.cost).toLocaleString("ru-RU")} UZS
                        </td>
                        <td className="py-2 text-muted-foreground text-xs max-w-[200px] truncate">
                          {entry.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════
          EXPENSES
          ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Расходы на точку
          </CardTitle>
          <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Добавить расход
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("addExpense")}</DialogTitle>
              </DialogHeader>
              <AddExpenseForm
                machineId={machine.id}
                t={t}
                onSuccess={() => {
                  setExpenseDialogOpen(false);
                  queryClient.invalidateQueries({
                    queryKey: ["machine-expenses", machine.id],
                  });
                }}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          {expenses && expenses.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-bold">
                  {totalCapex.toLocaleString("ru-RU")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Капитальные (UZS)
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-bold">
                  {totalOpex.toLocaleString("ru-RU")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Операционные (UZS)
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-bold">
                  {(totalCapex + totalOpex).toLocaleString("ru-RU")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("totalUzsShort")}
                </p>
              </div>
            </div>
          )}

          {/* Expenses list */}
          {!expenses || expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("noExpenses")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 font-medium">
                      {t("dateColumn")}
                    </th>
                    <th className="text-left py-2 font-medium">
                      {t("category")}
                    </th>
                    <th className="text-left py-2 font-medium">
                      {t("description")}
                    </th>
                    <th className="text-left py-2 font-medium">{t("type")}</th>
                    <th className="text-right py-2 font-medium">
                      {t("amount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp: any) => {
                    const catLabel = t(
                      EXPENSE_CAT_I18N[exp.category] || "expCatOther",
                    );
                    return (
                      <tr key={exp.id} className="border-b last:border-0">
                        <td className="py-2">
                          {new Date(exp.expenseDate).toLocaleDateString(
                            "ru-RU",
                          )}
                        </td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">
                            {catLabel}
                          </Badge>
                        </td>
                        <td className="py-2 max-w-[200px] truncate">
                          {exp.description}
                        </td>
                        <td className="py-2">
                          <Badge
                            variant={
                              exp.expenseType === "capex"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {t(
                              EXPENSE_TYPE_I18N[exp.expenseType] ||
                                "expTypeCapex",
                            )}
                          </Badge>
                        </td>
                        <td className="py-2 text-right font-medium">
                          {Number(exp.amount).toLocaleString("ru-RU")} UZS
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Infrastructure Block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("infrastructureOnPoint")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Camera className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">{t("camera")}</p>
                {componentsLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : cameras.length > 0 ? (
                  <div className="space-y-0.5">
                    {cameras.map((cam: any) => (
                      <div key={cam.id} className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="font-medium">
                          {cam.name || cam.model || t("cameraInstalled")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-muted-foreground" />
                    <span>{t("trashBinNo")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Trash2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">{t("trashBin")}</p>
                <div className="flex items-center gap-1">
                  {machine.hasTrashBin ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span className="font-medium">{t("trashBinYes")}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                      <span>{t("trashBinNo")}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Wifi className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">{t("internetType")}</p>
                <p className="font-medium">
                  {connectivity && connectivity.length > 0
                    ? connectivity
                        .filter((c: any) => c.status === "active")
                        .map((c: any) =>
                          t(
                            CONNECTIVITY_TYPE_I18N[c.connectivityType] ||
                              "connTypeSim",
                          ),
                        )
                        .join(", ") || t("noActiveConnections")
                    : simCards.length > 0
                      ? t("mobileProvider", {
                          provider:
                            simCards[0].manufacturer ||
                            simCards[0].metadata?.provider ||
                            "SIM",
                        })
                      : t("notDetermined")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ownership Block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("ownershipAndDepreciation")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("depreciationMethod")}</p>
              <p className="font-medium">
                {machine.depreciationMethod || "linear"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("depreciationPeriod")}</p>
              <p className="font-medium">
                {machine.depreciationYears
                  ? t("yearsCount", { count: machine.depreciationYears })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("accumulatedDepreciation")}
              </p>
              <p className="font-medium">
                {machine.accumulatedDepreciation
                  ? `${Number(machine.accumulatedDepreciation).toLocaleString("ru-RU")} UZS`
                  : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Add SIM Card Form
// ============================================================================

function AddSimForm({
  machineId,
  onSuccess,
  t,
}: {
  machineId: string;
  onSuccess: () => void;
  t: (key: string, params?: any) => string;
}) {
  const [provider, setProvider] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tariffPlan, setTariffPlan] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      return machinesApi.installComponent(machineId, {
        componentType: "sim_card",
        name: `SIM ${provider} ${phoneNumber}`.trim(),
        manufacturer: provider,
        serialNumber: phoneNumber,
        metadata: { provider, phoneNumber, tariffPlan },
      });
    },
    onSuccess: () => {
      toast.success(t("simCardAdded"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("simCardAddError"));
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <label className="text-sm font-medium">{t("operatorLabel")}</label>
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger>
            <SelectValue placeholder={t("selectProvider")} />
          </SelectTrigger>
          <SelectContent>
            {[...SIM_PROVIDER_KEYS, t("simProviderOther")].map((p: string) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">{t("phoneNumberLabel")}</label>
        <Input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+998 90 123 45 67"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t("tariffLabel")}</label>
        <Input
          value={tariffPlan}
          onChange={(e) => setTariffPlan(e.target.value)}
          placeholder="Business 5GB"
        />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={mutation.isPending || !provider}>
          {mutation.isPending ? t("saving") : t("add")}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Add Connectivity Form (WiFi, Fiber, SIM subscription)
// ============================================================================

function AddConnectivityForm({
  machineId,
  simCards,
  onSuccess,
  t,
}: {
  machineId: string;
  simCards: any[];
  onSuccess: () => void;
  t: (key: string, params?: any) => string;
}) {
  const [connectivityType, setConnectivityType] = useState("");
  const [providerName, setProviderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [tariffName, setTariffName] = useState("");
  const [monthlyCost, setMonthlyCost] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [componentId, setComponentId] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      return machinesApi.addConnectivity(machineId, {
        connectivityType,
        providerName,
        accountNumber: accountNumber || undefined,
        tariffName: tariffName || undefined,
        monthlyCost: Number(monthlyCost),
        startDate,
        componentId: componentId || undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t("connectionAdded"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("connectionAddError"));
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <label className="text-sm font-medium">{t("connection")}</label>
        <Select value={connectivityType} onValueChange={setConnectivityType}>
          <SelectTrigger>
            <SelectValue placeholder={t("selectConnectionType")} />
          </SelectTrigger>
          <SelectContent>
            {CONNECTIVITY_TYPE_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {t(CONNECTIVITY_TYPE_I18N[key])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">
          {connectivityType === "sim"
            ? t("operatorLabel")
            : connectivityType === "wifi" || connectivityType === "fiber"
              ? t("tenantOrProvider")
              : t("providerLabel")}
        </label>
        {connectivityType === "sim" ? (
          <Select value={providerName} onValueChange={setProviderName}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectProvider")} />
            </SelectTrigger>
            <SelectContent>
              {[...SIM_PROVIDER_KEYS, t("simProviderOther")].map(
                (p: string) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            placeholder={
              connectivityType === "wifi"
                ? t("tenantOrWifiProvider")
                : t("providerName")
            }
            required
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">
            {connectivityType === "sim" ? t("phoneNumberSim") : t("accountId")}
          </label>
          <Input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder={
              connectivityType === "sim" ? "+998 90 123 45 67" : t("accountId")
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("tariffLabel")}</label>
          <Input
            value={tariffName}
            onChange={(e) => setTariffName(e.target.value)}
            placeholder="Безлимит 50GB"
          />
        </div>
      </div>

      {/* Link to existing SIM component */}
      {connectivityType === "sim" && simCards.length > 0 && (
        <div>
          <label className="text-sm font-medium">{t("linkToSimCard")}</label>
          <Select value={componentId} onValueChange={setComponentId}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectOptional")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("doNotLink")}</SelectItem>
              {simCards.map((sim: any) => (
                <SelectItem key={sim.id} value={sim.id}>
                  {sim.manufacturer || sim.metadata?.provider || "SIM"}{" "}
                  {sim.serialNumber || ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">
            Ежемесячная стоимость (UZS)
          </label>
          <Input
            type="number"
            value={monthlyCost}
            onChange={(e) => setMonthlyCost(e.target.value)}
            placeholder="50000"
            required
            min="0"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("startDate")}</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">{t("noteLabel")}</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("additionalInfo")}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={
            mutation.isPending ||
            !connectivityType ||
            !providerName ||
            !monthlyCost
          }
        >
          {mutation.isPending ? t("saving") : t("add")}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Add Expense Form
// ============================================================================

function AddExpenseForm({
  machineId,
  onSuccess,
  t,
}: {
  machineId: string;
  onSuccess: () => void;
  t: (key: string, params?: any) => string;
}) {
  const [category, setCategory] = useState("");
  const [expenseType, setExpenseType] = useState("capex");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      return machinesApi.addExpense(machineId, {
        category,
        expenseType,
        description,
        amount: Number(amount),
        expenseDate,
        invoiceNumber: invoiceNumber || undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t("expenseAdded"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("expenseAddError"));
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("category")}</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectCategory")} />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORY_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {t(EXPENSE_CAT_I18N[key])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">{t("expenseTypeLabel")}</label>
          <Select value={expenseType} onValueChange={setExpenseType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="capex">{t("expTypeCapexOneTime")}</SelectItem>
              <SelectItem value="opex">{t("expTypeOpexRecurring")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">{t("descriptionLabel")}</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("amountUzs")}</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500000"
            required
            min="0"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("date")}</label>
          <Input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">{t("invoiceNumber")}</label>
        <Input
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          placeholder="INV-2025-0042"
        />
      </div>

      <div>
        <label className="text-sm font-medium">{t("noteLabel")}</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("additionalInfo")}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending || !category || !description || !amount}
        >
          {mutation.isPending ? t("saving") : t("add")}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Add Usage Record Form (supports historical data entry)
// ============================================================================

function AddUsageForm({
  machineId,
  simCards,
  onSuccess,
  t,
}: {
  machineId: string;
  simCards: any[];
  onSuccess: () => void;
  t: (key: string, params?: any) => string;
}) {
  // Default to previous month
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [componentId, setComponentId] = useState(simCards[0]?.id || "");
  const [periodStart, setPeriodStart] = useState(
    prevMonth.toISOString().split("T")[0],
  );
  const [periodEnd, setPeriodEnd] = useState(
    prevMonthEnd.toISOString().split("T")[0],
  );
  const [dataUsedMb, setDataUsedMb] = useState("");
  const [dataLimitMb, setDataLimitMb] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  // Quick-select month helper
  const setMonth = (year: number, month: number) => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    setPeriodStart(start.toISOString().split("T")[0]);
    setPeriodEnd(end.toISOString().split("T")[0]);
  };

  // Generate last 12 months for quick selection
  const months: { label: string; year: number; month: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }

  const mutation = useMutation({
    mutationFn: async () => {
      return machinesApi.addSimUsage(machineId, {
        componentId,
        periodStart,
        periodEnd,
        dataUsedMb: Number(dataUsedMb),
        dataLimitMb: dataLimitMb ? Number(dataLimitMb) : undefined,
        cost: Number(cost),
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t("usageDataSaved"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("usageDataSaveError"));
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      {/* SIM selection (if multiple) */}
      {simCards.length > 1 && (
        <div>
          <label className="text-sm font-medium">{t("simCardLabel")}</label>
          <Select value={componentId} onValueChange={setComponentId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {simCards.map((sim: any) => (
                <SelectItem key={sim.id} value={sim.id}>
                  {sim.manufacturer || sim.metadata?.provider || "SIM"}{" "}
                  {sim.serialNumber || ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Quick month picker */}
      <div>
        <label className="text-sm font-medium">{t("periodLabel")}</label>
        <Select
          value={`${periodStart}`}
          onValueChange={(val) => {
            const m = months.find(
              (m) =>
                new Date(m.year, m.month, 1).toISOString().split("T")[0] ===
                val,
            );
            if (m) setMonth(m.year, m.month);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("selectMonth")} />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => {
              const val = new Date(m.year, m.month, 1)
                .toISOString()
                .split("T")[0];
              return (
                <SelectItem key={val} value={val}>
                  {m.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {periodStart} — {periodEnd}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("dataUsed")}</label>
          <Input
            type="number"
            value={dataUsedMb}
            onChange={(e) => setDataUsedMb(e.target.value)}
            placeholder="2300"
            required
            min="0"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("dataLimit")}</label>
          <Input
            type="number"
            value={dataLimitMb}
            onChange={(e) => setDataLimitMb(e.target.value)}
            placeholder="5120"
            min="0"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">{t("costUzs")}</label>
        <Input
          type="number"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="50000"
          required
          min="0"
        />
      </div>

      <div>
        <label className="text-sm font-medium">{t("noteLabel")}</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("additionalInfo")}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending || !dataUsedMb || !cost}
        >
          {mutation.isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

// ── Helpers ──

function formatPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (s.getDate() === 1) {
    const lastDay = new Date(s.getFullYear(), s.getMonth() + 1, 0).getDate();
    if (e.getDate() === lastDay) {
      return s.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    }
  }
  return `${s.toLocaleDateString("ru-RU")} — ${e.toLocaleDateString("ru-RU")}`;
}
