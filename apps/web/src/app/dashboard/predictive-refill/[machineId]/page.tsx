"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { RefillPriorityBadge } from "../components/RefillPriorityBadge";

// --- Types ---

interface SlotForecast {
  slotLabel: string;
  productName: string;
  currentStock: number;
  capacity: number;
  dailyRate: number;
  daysOfSupply: number;
  recommendedAction: string;
  machineName?: string;
}

// --- Component ---

export default function MachineRefillDetailPage({
  params,
}: {
  params: Promise<{ machineId: string }>;
}) {
  const { machineId } = use(params);
  const router = useRouter();

  const { data: forecast, isLoading } = useQuery({
    queryKey: ["predictive-refill-forecast", machineId],
    queryFn: () =>
      api
        .get<SlotForecast[]>(`/predictive-refill/forecast/${machineId}`)
        .then((r) => r.data),
  });

  // The response interceptor unwraps the TransformInterceptor envelope,
  // and .then(r => r.data) gives us the controller return value directly.
  // Guard against unexpected shapes (nested or plain array).
  const raw = forecast as unknown;
  const slots: SlotForecast[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown })?.data)
      ? (raw as { data: SlotForecast[] }).data
      : [];

  const machineName = slots[0]?.machineName ?? "Автомат";

  // Chart data
  const chartData = slots.map((slot) => {
    const fillPct =
      slot.capacity > 0
        ? Math.round((slot.currentStock / slot.capacity) * 100)
        : 0;
    return {
      name: slot.slotLabel || slot.productName,
      stock: slot.currentStock,
      capacity: slot.capacity,
      fillPct,
    };
  });

  // Bar color based on fill %
  const getBarColor = (fillPct: number) => {
    if (fillPct < 20) return "#dc2626"; // red-600
    if (fillPct < 50) return "#d97706"; // amber-600
    return "#16a34a"; // green-600
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/predictive-refill")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Назад
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{machineName}</h1>
          <p className="text-muted-foreground">
            Прогноз по слотам и уровни запаса
          </p>
        </div>
      </div>

      {/* Stock Level Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Уровни запаса по слотам</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : chartData.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              Нет данных для отображения
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, name: string) => {
                    if (name === "stock") return [value, "Остаток"];
                    if (name === "capacity") return [value, "Ёмкость"];
                    return [value, name];
                  }}
                />
                <Bar
                  dataKey="capacity"
                  fill="hsl(var(--muted))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={getBarColor(entry.fillPct)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Slots Detail Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Продукт</TableHead>
                  <TableHead>Остаток</TableHead>
                  <TableHead>Ёмкость</TableHead>
                  <TableHead>Заполн.</TableHead>
                  <TableHead>Расход/день</TableHead>
                  <TableHead>Дней запаса</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : slots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">Нет данных по слотам</p>
            <p className="text-muted-foreground">
              Прогнозные данные для этого автомата пока недоступны
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Продукт</TableHead>
                  <TableHead>Остаток</TableHead>
                  <TableHead>Ёмкость</TableHead>
                  <TableHead>Заполн.</TableHead>
                  <TableHead>Расход/день</TableHead>
                  <TableHead>Дней запаса</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot, idx) => {
                  const fillPct =
                    slot.capacity > 0
                      ? Math.round((slot.currentStock / slot.capacity) * 100)
                      : 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {slot.productName}
                        {slot.slotLabel && (
                          <span className="ml-1 text-muted-foreground text-xs">
                            ({slot.slotLabel})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{slot.currentStock}</TableCell>
                      <TableCell>{slot.capacity}</TableCell>
                      <TableCell>
                        <span
                          className={
                            fillPct < 20
                              ? "text-red-600 font-medium"
                              : fillPct < 50
                                ? "text-amber-600"
                                : "text-green-600"
                          }
                        >
                          {fillPct}%
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {slot.dailyRate.toFixed(1)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            slot.daysOfSupply <= 1
                              ? "text-red-600 font-bold"
                              : slot.daysOfSupply <= 3
                                ? "text-amber-600 font-medium"
                                : ""
                          }
                        >
                          {slot.daysOfSupply.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <RefillPriorityBadge action={slot.recommendedAction} />
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
