"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Activity, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, routesApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/auth";
import { RefillPriorityBadge } from "./components/RefillPriorityBadge";

// --- Types ---

interface RefillRecommendation {
  id: string;
  machineId: string;
  machineName: string;
  productName: string;
  slotLabel?: string;
  currentStock: number;
  capacity: number;
  daysOfSupply: number;
  priorityScore: number;
  recommendedAction: string;
  sellingPrice: number;
  costPrice: number;
  margin: number;
  dailyProfit: number;
}

interface RecommendationsResponse {
  data: RefillRecommendation[];
  total: number;
}

type FilterTab = "all" | "refill_now" | "refill_soon" | "monitor";

// --- Component ---

export default function PredictiveRefillPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { user } = useAuthStore();

  // Fetch recommendations with optional action filter
  const actionParam = activeTab === "all" ? undefined : activeTab;

  const { data: response, isLoading } = useQuery({
    queryKey: ["predictive-refill-recommendations", actionParam],
    queryFn: () =>
      api
        .get<RecommendationsResponse>("/predictive-refill/recommendations", {
          params: { action: actionParam, limit: 100 },
        })
        .then((r) => r.data),
  });

  // Fetch all recommendations (unfiltered) for KPI counts
  const { data: allData } = useQuery({
    queryKey: ["predictive-refill-recommendations", "all-kpi"],
    queryFn: () =>
      api
        .get<RecommendationsResponse>("/predictive-refill/recommendations", {
          params: { limit: 100 },
        })
        .then((r) => r.data),
  });

  const recommendations: RefillRecommendation[] = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : [];

  const allRecommendations: RefillRecommendation[] = Array.isArray(
    allData?.data,
  )
    ? allData.data
    : Array.isArray(allData)
      ? allData
      : [];

  // KPI calculations
  const refillNowCount = allRecommendations.filter(
    (r) => r.recommendedAction === "refill_now",
  ).length;
  const refillSoonCount = allRecommendations.filter(
    (r) => r.recommendedAction === "refill_soon",
  ).length;
  const machinesAffected = new Set(
    allRecommendations
      .filter((r) => r.recommendedAction !== "monitor")
      .map((r) => r.machineId),
  ).size;

  // Mark acted mutation
  const markActedMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/predictive-refill/recommendations/${id}/mark-acted`),
    onSuccess: () => {
      toast.success("Рекомендация отмечена как выполненная");
      queryClient.invalidateQueries({
        queryKey: ["predictive-refill-recommendations"],
      });
    },
    onError: () => {
      toast.error("Не удалось отметить рекомендацию");
    },
  });

  // Add to Route mutation
  const addToRouteMutation = useMutation({
    mutationFn: async (machineIds: string[]) => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await routesApi.create({
        name: `Дозаправка ${today}`,
        plannedDate: new Date().toISOString(),
        ...(user?.id ? { operatorId: user.id } : {}),
        type: "refill",
      });
      const routeId = res.data.id;
      for (let i = 0; i < machineIds.length; i++) {
        await routesApi.addStop(routeId, {
          machineId: machineIds[i],
          sequenceNumber: i + 1,
        });
      }
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Маршрут создан");
      setSelectedIds(new Set());
      router.push(`/dashboard/routes/${data.id}`);
    },
    onError: () => {
      toast.error("Ошибка при создании маршрута");
    },
  });

  const toggleSelection = (_id: string, machineId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(machineId)) {
        next.delete(machineId);
      } else {
        next.add(machineId);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    const visibleMachineIds = recommendations.map((r) => r.machineId);
    const allSelected = visibleMachineIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleMachineIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleMachineIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleAddToRoute = () => {
    addToRouteMutation.mutate(Array.from(selectedIds));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Прогнозная дозаправка</h1>
        <p className="text-muted-foreground">
          Рекомендации по пополнению автоматов на основе прогноза спроса
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Срочная дозаправка
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-red-600">
                    {refillNowCount}
                  </p>
                )}
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
                  Скоро потребуется
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-amber-600">
                    {refillSoonCount}
                  </p>
                )}
              </div>
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Автоматов затронуто
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-blue-600">
                    {machinesAffected}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {allRecommendations.length > 0
                    ? new Intl.NumberFormat("ru-RU").format(
                        allRecommendations
                          .filter((r) => r.recommendedAction === "refill_now")
                          .reduce(
                            (sum, r) => sum + Number(r.dailyProfit || 0),
                            0,
                          ),
                      )
                    : "0"}{" "}
                  UZS/день под угрозой
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FilterTab)}
      >
        <TabsList>
          <TabsTrigger value="all">Все</TabsTrigger>
          <TabsTrigger value="refill_now">Срочно</TabsTrigger>
          <TabsTrigger value="refill_soon">Скоро</TabsTrigger>
          <TabsTrigger value="monitor">Норма</TabsTrigger>
        </TabsList>
      </Tabs>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} выбрано
          </span>
          <Button
            size="sm"
            onClick={handleAddToRoute}
            disabled={addToRouteMutation.isPending}
          >
            {addToRouteMutation.isPending
              ? "Создание..."
              : "Добавить в маршрут"}
          </Button>
        </div>
      )}

      {/* Recommendations Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Приоритет</TableHead>
                  <TableHead>Автомат</TableHead>
                  <TableHead>Продукт</TableHead>
                  <TableHead>Остаток</TableHead>
                  <TableHead>Дней запаса</TableHead>
                  <TableHead>Балл</TableHead>
                  <TableHead className="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : recommendations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Нет рекомендаций</p>
            <p className="text-muted-foreground">
              {activeTab !== "all"
                ? "Нет рекомендаций с выбранным фильтром"
                : "Все автоматы заполнены"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={
                        recommendations.length > 0 &&
                        recommendations.every((r) =>
                          selectedIds.has(r.machineId),
                        )
                      }
                      onChange={toggleAllVisible}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Приоритет</TableHead>
                  <TableHead>Автомат</TableHead>
                  <TableHead>Продукт</TableHead>
                  <TableHead>Остаток</TableHead>
                  <TableHead>Дней запаса</TableHead>
                  <TableHead>Балл</TableHead>
                  <TableHead className="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendations.map((rec) => {
                  const fillPct =
                    rec.capacity > 0
                      ? Math.round((rec.currentStock / rec.capacity) * 100)
                      : 0;
                  return (
                    <TableRow
                      key={rec.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.push(
                          `/dashboard/predictive-refill/${rec.machineId}`,
                        )
                      }
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(rec.machineId)}
                          onChange={() =>
                            toggleSelection(rec.id, rec.machineId)
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <RefillPriorityBadge action={rec.recommendedAction} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {rec.machineName}
                      </TableCell>
                      <TableCell>
                        {rec.productName}
                        {rec.slotLabel && (
                          <span className="ml-1 text-muted-foreground text-xs">
                            ({rec.slotLabel})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            fillPct < 20
                              ? "text-red-600 font-medium"
                              : fillPct < 50
                                ? "text-amber-600"
                                : ""
                          }
                        >
                          {rec.currentStock}/{rec.capacity}
                        </span>
                        <span className="ml-1 text-muted-foreground text-xs">
                          ({fillPct}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            rec.daysOfSupply <= 1
                              ? "text-red-600 font-bold"
                              : rec.daysOfSupply <= 3
                                ? "text-amber-600 font-medium"
                                : ""
                          }
                        >
                          {rec.daysOfSupply.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {rec.priorityScore.toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={markActedMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            markActedMutation.mutate(rec.id);
                          }}
                        >
                          Выполнено
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
