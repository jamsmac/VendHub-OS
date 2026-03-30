/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
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
  Truck,
  Zap,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
const SIM_PROVIDERS = ["Beeline", "Ucell", "Mobiuz", "UMS", "Perfectum", "Другой"];

// ── Connectivity types ──
const CONNECTIVITY_TYPES = [
  { value: "sim", label: "SIM-карта" },
  { value: "wifi", label: "WiFi (арендатор)" },
  { value: "fiber", label: "Оптика (арендатор)" },
  { value: "lan", label: "LAN-кабель" },
];

// ── Expense categories ──
const EXPENSE_CATEGORIES = [
  { value: "transport", label: "Перевозка" },
  { value: "electrical", label: "Электропроводка" },
  { value: "socket", label: "Розетка" },
  { value: "mounting", label: "Монтаж" },
  { value: "wiring", label: "Кабельная разводка" },
  { value: "decoration", label: "Оформление" },
  { value: "signage", label: "Вывеска" },
  { value: "connectivity", label: "Подключение связи" },
  { value: "rent_deposit", label: "Залог аренды" },
  { value: "repair", label: "Ремонт" },
  { value: "other", label: "Другое" },
];

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  capex: "Капитальные",
  opex: "Операционные",
};

const CONNECTIVITY_STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Активна", variant: "default" },
  inactive: { label: "Отключена", variant: "secondary" },
  suspended: { label: "Приостановлена", variant: "destructive" },
};

const CONNECTIVITY_TYPE_ICON: Record<string, typeof Signal> = {
  sim: Signal,
  wifi: Wifi,
  fiber: Globe,
  lan: Globe,
};

export function PassportTab({ machine }: PassportTabProps) {
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
          <CardTitle className="text-base">Приобретение</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Производитель</p>
              <p className="font-medium">{machine.manufacturer || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Модель</p>
              <p className="font-medium">{machine.model || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Год выпуска</p>
              <p className="font-medium">
                {machine.yearOfManufacture || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Серийный номер</p>
              <p className="font-medium font-mono text-xs">
                {machine.serialNumber || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Серийный с шильдика</p>
              <p className="font-medium font-mono text-xs">
                {machine.nameplateSerial || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Дата покупки</p>
              <p className="font-medium">{machine.purchaseDate || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Стоимость покупки</p>
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
          <CardTitle className="text-base">Технические данные</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Тип</p>
              <Badge variant="outline">{machine.type}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Прошивка</p>
              <p className="font-medium font-mono text-xs">
                {machine.firmwareVersion || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Слотов</p>
              <p className="font-medium">{machine.maxProductSlots || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Статус связи</p>
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
          CONNECTIVITY (Связь) — SIM, WiFi, Fiber
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
                  <DialogTitle>Добавить SIM-карту</DialogTitle>
                </DialogHeader>
                <AddSimForm
                  machineId={machine.id}
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
                  <DialogTitle>Добавить подключение</DialogTitle>
                </DialogHeader>
                <AddConnectivityForm
                  machineId={machine.id}
                  simCards={simCards}
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
                const badge = CONNECTIVITY_STATUS_BADGES[conn.status] || {
                  label: conn.status,
                  variant: "secondary" as const,
                };
                const typeLabel =
                  CONNECTIVITY_TYPES.find(
                    (t) => t.value === conn.connectivityType,
                  )?.label ?? conn.connectivityType;
                return (
                  <div
                    key={conn.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <Icon className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Тип</p>
                        <p className="font-medium">{typeLabel}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Провайдер</p>
                        <p className="font-medium">{conn.providerName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {conn.connectivityType === "sim"
                            ? "Номер"
                            : "Аккаунт"}
                        </p>
                        <p className="font-medium font-mono text-xs">
                          {conn.accountNumber || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Ежемесячно
                        </p>
                        <p className="font-medium">
                          {Number(conn.monthlyCost).toLocaleString("ru-RU")}{" "}
                          UZS
                        </p>
                      </div>
                    </div>
                    <Badge variant={badge.variant} className="shrink-0">
                      {badge.label}
                    </Badge>
                  </div>
                );
              })}
              {monthlyConnCost > 0 && (
                <div className="text-right text-sm text-muted-foreground">
                  Итого ежемесячно:{" "}
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
                  Подключения не настроены. Добавьте SIM-карту или другое
                  подключение.
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
                          <p className="text-muted-foreground">Оператор</p>
                          <p className="font-medium">
                            {sim.manufacturer ||
                              sim.metadata?.provider ||
                              "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Номер</p>
                          <p className="font-medium font-mono text-xs">
                            {sim.serialNumber ||
                              sim.metadata?.phoneNumber ||
                              "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Тариф</p>
                          <p className="font-medium">
                            {sim.metadata?.tariffPlan || "—"}
                          </p>
                        </div>
                        {sim.installedAt && (
                          <div>
                            <p className="text-muted-foreground">
                              Установлена
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
                        {sim.status === "installed" ? "Активна" : sim.status}
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
      {(simCards.length > 0 || (connectivity?.some((c: any) => c.connectivityType === "sim"))) && (
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
                  <DialogTitle>Внести расход за период</DialogTitle>
                </DialogHeader>
                <AddUsageForm
                  machineId={machine.id}
                  simCards={simCards}
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
                  <p className="text-xs text-muted-foreground">Записей</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-lg font-bold">
                    {totalDataUsed >= 1024
                      ? `${(totalDataUsed / 1024).toFixed(1)} ГБ`
                      : `${totalDataUsed} МБ`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Всего трафика
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-lg font-bold">
                    {totalSimCost.toLocaleString("ru-RU")}
                  </p>
                  <p className="text-xs text-muted-foreground">Всего UZS</p>
                </div>
              </div>
            )}

            {/* History table */}
            {!simUsage || simUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет данных о расходах. Нажмите «Внести данные» для добавления.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2 font-medium">Период</th>
                      <th className="text-right py-2 font-medium">Трафик</th>
                      <th className="text-right py-2 font-medium">Лимит</th>
                      <th className="text-right py-2 font-medium">
                        Стоимость
                      </th>
                      <th className="text-left py-2 font-medium">
                        Примечание
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
                          {Number(entry.dataUsedMb).toFixed(0)} МБ
                        </td>
                        <td className="py-2 text-right text-muted-foreground font-mono">
                          {entry.dataLimitMb
                            ? `${Number(entry.dataLimitMb).toFixed(0)} МБ`
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
          EXPENSES (Расходы на точку)
          ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Расходы на точку
          </CardTitle>
          <Dialog
            open={expenseDialogOpen}
            onOpenChange={setExpenseDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Добавить расход
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить расход</DialogTitle>
              </DialogHeader>
              <AddExpenseForm
                machineId={machine.id}
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
                <p className="text-xs text-muted-foreground">Итого (UZS)</p>
              </div>
            </div>
          )}

          {/* Expenses list */}
          {!expenses || expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Расходы не добавлены. Нажмите «Добавить расход» для начала учёта.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 font-medium">Дата</th>
                    <th className="text-left py-2 font-medium">Категория</th>
                    <th className="text-left py-2 font-medium">Описание</th>
                    <th className="text-left py-2 font-medium">Тип</th>
                    <th className="text-right py-2 font-medium">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp: any) => {
                    const catLabel =
                      EXPENSE_CATEGORIES.find(
                        (c) => c.value === exp.category,
                      )?.label ?? exp.category;
                    return (
                      <tr
                        key={exp.id}
                        className="border-b last:border-0"
                      >
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
                            {EXPENSE_TYPE_LABELS[exp.expenseType] ||
                              exp.expenseType}
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
          <CardTitle className="text-base">Инфраструктура на точке</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Camera className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Камера</p>
                {componentsLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : cameras.length > 0 ? (
                  <div className="space-y-0.5">
                    {cameras.map((cam: any) => (
                      <div key={cam.id} className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="font-medium">
                          {cam.name || cam.model || "Установлена"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-muted-foreground" />
                    <span>Нет</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Trash2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Мусорный бак</p>
                <div className="flex items-center gap-1">
                  {machine.hasTrashBin ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span className="font-medium">Есть</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                      <span>Нет</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Wifi className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Тип интернета</p>
                <p className="font-medium">
                  {connectivity && connectivity.length > 0
                    ? connectivity
                        .filter((c: any) => c.status === "active")
                        .map(
                          (c: any) =>
                            CONNECTIVITY_TYPES.find(
                              (t) => t.value === c.connectivityType,
                            )?.label ?? c.connectivityType,
                        )
                        .join(", ") || "Нет активных"
                    : simCards.length > 0
                      ? `Мобильный (${simCards[0].manufacturer || simCards[0].metadata?.provider || "SIM"})`
                      : "Не определён"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ownership Block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Владение и амортизация</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Метод амортизации</p>
              <p className="font-medium">
                {machine.depreciationMethod || "linear"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Срок амортизации</p>
              <p className="font-medium">
                {machine.depreciationYears
                  ? `${machine.depreciationYears} лет`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Накопленная амортизация</p>
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
}: {
  machineId: string;
  onSuccess: () => void;
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
      toast.success("SIM-карта добавлена");
      onSuccess();
    },
    onError: () => {
      toast.error("Ошибка при добавлении SIM-карты");
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
        <label className="text-sm font-medium">Оператор</label>
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите оператора" />
          </SelectTrigger>
          <SelectContent>
            {SIM_PROVIDERS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Номер телефона</label>
        <Input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+998 90 123 45 67"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Тариф</label>
        <Input
          value={tariffPlan}
          onChange={(e) => setTariffPlan(e.target.value)}
          placeholder="Business 5GB"
        />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={mutation.isPending || !provider}>
          {mutation.isPending ? "Сохранение..." : "Добавить"}
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
}: {
  machineId: string;
  simCards: any[];
  onSuccess: () => void;
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
      toast.success("Подключение добавлено");
      onSuccess();
    },
    onError: () => {
      toast.error("Ошибка при добавлении подключения");
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
        <label className="text-sm font-medium">Тип подключения</label>
        <Select value={connectivityType} onValueChange={setConnectivityType}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите тип" />
          </SelectTrigger>
          <SelectContent>
            {CONNECTIVITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">
          {connectivityType === "sim"
            ? "Оператор"
            : connectivityType === "wifi" || connectivityType === "fiber"
              ? "Арендатор / Провайдер"
              : "Провайдер"}
        </label>
        {connectivityType === "sim" ? (
          <Select value={providerName} onValueChange={setProviderName}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите оператора" />
            </SelectTrigger>
            <SelectContent>
              {SIM_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            placeholder={
              connectivityType === "wifi"
                ? "Имя арендатора или провайдера WiFi"
                : "Название провайдера"
            }
            required
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">
            {connectivityType === "sim" ? "Номер телефона" : "Аккаунт / ID"}
          </label>
          <Input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder={
              connectivityType === "sim" ? "+998 90 123 45 67" : "ID аккаунта"
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Тариф</label>
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
          <label className="text-sm font-medium">
            Привязать к SIM-карте (компонент)
          </label>
          <Select value={componentId} onValueChange={setComponentId}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите (необязательно)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Не привязывать</SelectItem>
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
          <label className="text-sm font-medium">Ежемесячная стоимость (UZS)</label>
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
          <label className="text-sm font-medium">Дата начала</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Примечание</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Дополнительная информация..."
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={
            mutation.isPending || !connectivityType || !providerName || !monthlyCost
          }
        >
          {mutation.isPending ? "Сохранение..." : "Добавить"}
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
}: {
  machineId: string;
  onSuccess: () => void;
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
      toast.success("Расход добавлен");
      onSuccess();
    },
    onError: () => {
      toast.error("Ошибка при добавлении расхода");
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
          <label className="text-sm font-medium">Категория</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Тип расхода</label>
          <Select value={expenseType} onValueChange={setExpenseType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="capex">Капитальный (разовый)</SelectItem>
              <SelectItem value="opex">Операционный (периодич.)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Описание</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Перевозка автомата на точку ТТЗ"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Сумма (UZS)</label>
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
          <label className="text-sm font-medium">Дата</label>
          <Input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Номер чека / накладной</label>
        <Input
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          placeholder="INV-2025-0042"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Примечание</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Дополнительная информация..."
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={
            mutation.isPending || !category || !description || !amount
          }
        >
          {mutation.isPending ? "Сохранение..." : "Добавить"}
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
}: {
  machineId: string;
  simCards: any[];
  onSuccess: () => void;
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
      toast.success("Данные о расходе сохранены");
      onSuccess();
    },
    onError: () => {
      toast.error("Ошибка при сохранении");
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
          <label className="text-sm font-medium">SIM-карта</label>
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
        <label className="text-sm font-medium">Период</label>
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
            <SelectValue placeholder="Выберите месяц" />
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
          <label className="text-sm font-medium">Использовано (МБ)</label>
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
          <label className="text-sm font-medium">Лимит тарифа (МБ)</label>
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
        <label className="text-sm font-medium">Стоимость (UZS)</label>
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
        <label className="text-sm font-medium">Примечание</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Повышенный расход из-за обновления..."
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending || !dataUsedMb || !cost}
        >
          {mutation.isPending ? "Сохранение..." : "Сохранить"}
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
