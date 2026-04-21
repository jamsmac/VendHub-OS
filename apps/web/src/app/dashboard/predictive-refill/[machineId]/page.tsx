"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
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

// --- Chart helpers ---

interface ChartDataPoint {
  date: string;
  stock: number | null;
  projection: number | null;
}

function buildChartData(
  currentStock: number,
  dailyRate: number,
  capacity: number,
): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const today = new Date();

  for (let i = 14; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const estimatedStock = Math.min(
      capacity,
      Math.max(0, currentStock + dailyRate * i),
    );
    data.push({
      date: date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      }),
      stock: Math.round(estimatedStock),
      projection: null,
    });
  }

  data.push({
    date: today.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    }),
    stock: currentStock,
    projection: currentStock,
  });

  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const projected = Math.max(0, currentStock - dailyRate * i);
    data.push({
      date: date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      }),
      stock: null,
      projection: Math.round(projected),
    });
  }

  return data;
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
      {slots.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="mb-4 text-lg font-medium">
              Прогноз запасов (первый слот)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={buildChartData(
                  slots[0].currentStock,
                  slots[0].dailyRate,
                  slots[0].capacity,
                )}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis
                  label={{ value: "шт", angle: -90, position: "insideLeft" }}
                />
                <Tooltip />
                <Legend />
                <ReferenceLine
                  y={0}
                  stroke="red"
                  strokeDasharray="5 5"
                  label="Дефицит"
                />
                <ReferenceLine
                  x={new Date().toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                  stroke="gray"
                  strokeDasharray="3 3"
                  label="Сегодня"
                />
                <Line
                  type="monotone"
                  dataKey="stock"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Факт"
                  connectNulls={false}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="projection"
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  name="Прогноз"
                  connectNulls={false}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-2 text-sm italic text-muted-foreground">
              Прогноз, не гарантия
            </p>
          </CardContent>
        </Card>
      )}

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
