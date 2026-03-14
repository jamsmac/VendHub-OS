"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Car,
  Users,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { tripAnalyticsApi } from "@/lib/api";

type Tab =
  | "main"
  | "activity"
  | "employees"
  | "vehicles"
  | "anomalies"
  | "taxi";

interface MainDashboard {
  totalTrips: number;
  totalDistance: number;
  totalAnomalies: number;
  avgTripDistance: number;
  changePercent: { trips: number; distance: number; anomalies: number };
}

interface ActivityDashboard {
  distanceByDay: Array<{ date: string; distance: number; trips: number }>;
  tripsByHour: Array<{ hour: number; count: number }>;
}

interface EmployeeDashboard {
  topEmployees: Array<{
    employeeId: string;
    name: string;
    totalTrips: number;
    totalDistance: number;
    anomalies: number;
  }>;
}

interface VehicleDashboard {
  topVehicles: Array<{
    vehicleId: string;
    name: string;
    licensePlate: string;
    totalTrips: number;
    totalDistance: number;
  }>;
}

interface AnomalyDashboard {
  anomalies: Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
    tripId: string;
    createdAt: string;
  }>;
}

interface TaxiDashboard {
  totalTrips: number;
  totalCost: number;
  trips: Array<{
    id: string;
    date: string;
    from: string;
    to: string;
    cost: number;
    employeeName: string;
  }>;
}

export default function TripAnalyticsPage() {
  const t = useTranslations("tripAnalytics");
  const [activeTab, setActiveTab] = useState<Tab>("main");
  const [days, setDays] = useState(30);

  const periodParams = {
    from: new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  };

  const tabs: Array<{ key: Tab; label: string; icon: typeof MapPin }> = [
    { key: "main", label: t("tabMain"), icon: MapPin },
    { key: "activity", label: t("tabActivity"), icon: Activity },
    { key: "employees", label: t("tabEmployees"), icon: Users },
    { key: "vehicles", label: t("tabVehicles"), icon: Car },
    { key: "anomalies", label: t("tabAnomalies"), icon: AlertTriangle },
    { key: "taxi", label: t("tabTaxi"), icon: Car },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-espresso-dark flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-espresso-light">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant="ghost"
              size="sm"
              onClick={() => setDays(d)}
              className={
                days === d
                  ? "bg-espresso text-white hover:bg-espresso-dark"
                  : "bg-espresso-50 text-espresso-light hover:bg-espresso-100"
              }
            >
              {t(`last${d}days`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-espresso/10 pb-px">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === key
                ? "border-espresso text-espresso-dark"
                : "border-transparent text-espresso-light hover:text-espresso"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "main" && <MainTab params={periodParams} />}
      {activeTab === "activity" && <ActivityTab params={periodParams} />}
      {activeTab === "employees" && <EmployeesTab params={periodParams} />}
      {activeTab === "vehicles" && <VehiclesTab params={periodParams} />}
      {activeTab === "anomalies" && <AnomaliesTab params={periodParams} />}
      {activeTab === "taxi" && <TaxiTab params={periodParams} />}
    </div>
  );
}

// ── Main Overview ──

function MainTab({ params }: { params: Record<string, string> }) {
  const t = useTranslations("tripAnalytics");
  const { data, isLoading } = useQuery<MainDashboard>({
    queryKey: ["trip-analytics-main", params],
    queryFn: async () => {
      const res = await tripAnalyticsApi.getMain(params);
      return res.data;
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState />;

  const cards = [
    {
      label: t("totalTrips"),
      value: data.totalTrips,
      change: data.changePercent.trips,
    },
    {
      label: t("totalDistance"),
      value: `${new Intl.NumberFormat("ru-RU").format(data.totalDistance)} ${t("km")}`,
      change: data.changePercent.distance,
    },
    {
      label: t("totalAnomalies"),
      value: data.totalAnomalies,
      change: data.changePercent.anomalies,
      invertColor: true,
    },
    {
      label: t("avgDistance"),
      value: `${new Intl.NumberFormat("ru-RU").format(data.avgTripDistance)} ${t("km")}`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-espresso/10 bg-white p-5"
        >
          <p className="text-xs text-espresso-light">{c.label}</p>
          <p className="mt-2 text-2xl font-bold text-espresso-dark">
            {c.value}
          </p>
          {c.change !== undefined && (
            <div
              className={`mt-1 flex items-center gap-1 text-xs ${
                (c.invertColor ? c.change <= 0 : c.change >= 0)
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {c.change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {c.change > 0 ? "+" : ""}
              {c.change}% {t("vsLastPeriod")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Activity ──

function ActivityTab({ params }: { params: Record<string, string> }) {
  const t = useTranslations("tripAnalytics");
  const { data, isLoading } = useQuery<ActivityDashboard>({
    queryKey: ["trip-analytics-activity", params],
    queryFn: async () => {
      const res = await tripAnalyticsApi.getActivity(params);
      return res.data;
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-espresso/10 bg-white p-5">
        <h3 className="mb-4 text-sm font-medium text-espresso-dark">
          {t("distanceByDay")}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.distanceByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
            <XAxis dataKey="date" stroke="#92400e" fontSize={11} />
            <YAxis stroke="#92400e" fontSize={11} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="distance"
              name={t("distance")}
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Line
              type="monotone"
              dataKey="trips"
              name={t("trips")}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-espresso/10 bg-white p-5">
        <h3 className="mb-4 text-sm font-medium text-espresso-dark">
          {t("tripsByHour")}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.tripsByHour}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
            <XAxis dataKey="hour" stroke="#92400e" fontSize={11} />
            <YAxis stroke="#92400e" fontSize={11} />
            <Tooltip />
            <Bar
              dataKey="count"
              name={t("trips")}
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Employees ──

function EmployeesTab({ params }: { params: Record<string, string> }) {
  const t = useTranslations("tripAnalytics");
  const { data, isLoading } = useQuery<EmployeeDashboard>({
    queryKey: ["trip-analytics-employees", params],
    queryFn: async () => {
      const res = await tripAnalyticsApi.getEmployees(params);
      return res.data;
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!data?.topEmployees?.length) return <EmptyState />;

  return (
    <div className="rounded-xl border border-espresso/10 bg-white">
      <div className="p-4 border-b border-espresso/10">
        <h3 className="text-sm font-medium text-espresso-dark">
          {t("topEmployees")}
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-3 text-xs">{t("employee")}</TableHead>
            <TableHead className="px-4 py-3 text-xs text-right">
              {t("trips")}
            </TableHead>
            <TableHead className="px-4 py-3 text-xs text-right">
              {t("distance")}
            </TableHead>
            <TableHead className="px-4 py-3 text-xs text-right">
              {t("anomalies")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.topEmployees.map((emp) => (
            <TableRow
              key={emp.employeeId}
              className="border-b border-espresso/5"
            >
              <TableCell className="px-4 py-3 text-sm font-medium text-espresso-dark">
                {emp.name}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-espresso text-right">
                {emp.totalTrips}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-espresso text-right">
                {new Intl.NumberFormat("ru-RU").format(emp.totalDistance)}{" "}
                {t("km")}
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                <Badge
                  variant="secondary"
                  className={
                    emp.anomalies > 0
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  }
                >
                  {emp.anomalies}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Vehicles ──

function VehiclesTab({ params }: { params: Record<string, string> }) {
  const t = useTranslations("tripAnalytics");
  const { data, isLoading } = useQuery<VehicleDashboard>({
    queryKey: ["trip-analytics-vehicles", params],
    queryFn: async () => {
      const res = await tripAnalyticsApi.getVehicles(params);
      return res.data;
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!data?.topVehicles?.length) return <EmptyState />;

  return (
    <div className="rounded-xl border border-espresso/10 bg-white">
      <div className="p-4 border-b border-espresso/10">
        <h3 className="text-sm font-medium text-espresso-dark">
          {t("topVehicles")}
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-3 text-xs">{t("vehicle")}</TableHead>
            <TableHead className="px-4 py-3 text-xs">№</TableHead>
            <TableHead className="px-4 py-3 text-xs text-right">
              {t("trips")}
            </TableHead>
            <TableHead className="px-4 py-3 text-xs text-right">
              {t("distance")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.topVehicles.map((v) => (
            <TableRow key={v.vehicleId} className="border-b border-espresso/5">
              <TableCell className="px-4 py-3 text-sm font-medium text-espresso-dark">
                {v.name}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-espresso-light">
                {v.licensePlate}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-espresso text-right">
                {v.totalTrips}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-espresso text-right">
                {new Intl.NumberFormat("ru-RU").format(v.totalDistance)}{" "}
                {t("km")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Anomalies ──

function AnomaliesTab({ params }: { params: Record<string, string> }) {
  const t = useTranslations("tripAnalytics");
  const { data, isLoading } = useQuery<AnomalyDashboard>({
    queryKey: ["trip-analytics-anomalies", params],
    queryFn: async () => {
      const res = await tripAnalyticsApi.getAnomalies(params);
      return res.data;
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!data?.anomalies?.length) return <EmptyState />;

  const severityColor: Record<string, string> = {
    low: "bg-blue-100 text-blue-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <div className="rounded-xl border border-espresso/10 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-3 text-xs">{t("date")}</TableHead>
            <TableHead className="px-4 py-3 text-xs">{t("type")}</TableHead>
            <TableHead className="px-4 py-3 text-xs">{t("severity")}</TableHead>
            <TableHead className="px-4 py-3 text-xs">
              {t("description")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.anomalies.map((a) => (
            <TableRow key={a.id} className="border-b border-espresso/5">
              <TableCell className="px-4 py-3 text-sm text-espresso whitespace-nowrap">
                {new Date(a.createdAt).toLocaleDateString("ru-RU")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-espresso-dark">
                {a.type}
              </TableCell>
              <TableCell className="px-4 py-3">
                <Badge
                  variant="secondary"
                  className={
                    severityColor[a.severity] ?? "bg-gray-100 text-gray-700"
                  }
                >
                  {a.severity}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-espresso-light max-w-[300px] truncate">
                {a.description}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Taxi ──

function TaxiTab({ params }: { params: Record<string, string> }) {
  const t = useTranslations("tripAnalytics");
  const { data, isLoading } = useQuery<TaxiDashboard>({
    queryKey: ["trip-analytics-taxi", params],
    queryFn: async () => {
      const res = await tripAnalyticsApi.getTaxi(params);
      return res.data;
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState />;

  const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-espresso/10 bg-white p-5">
          <p className="text-xs text-espresso-light">{t("taxiTrips")}</p>
          <p className="mt-2 text-2xl font-bold text-espresso-dark">
            {data.totalTrips}
          </p>
        </div>
        <div className="rounded-xl border border-espresso/10 bg-white p-5">
          <p className="text-xs text-espresso-light">{t("taxiCost")}</p>
          <p className="mt-2 text-2xl font-bold text-espresso-dark">
            {fmt(data.totalCost)} UZS
          </p>
        </div>
      </div>

      {data.trips?.length > 0 && (
        <div className="rounded-xl border border-espresso/10 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3 text-xs">{t("date")}</TableHead>
                <TableHead className="px-4 py-3 text-xs">
                  {t("employee")}
                </TableHead>
                <TableHead className="px-4 py-3 text-xs">→</TableHead>
                <TableHead className="px-4 py-3 text-xs text-right">
                  {t("taxiCost")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.trips.map((trip) => (
                <TableRow key={trip.id} className="border-b border-espresso/5">
                  <TableCell className="px-4 py-3 text-sm text-espresso whitespace-nowrap">
                    {new Date(trip.date).toLocaleDateString("ru-RU")}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-espresso-dark">
                    {trip.employeeName}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-espresso-light">
                    {trip.from} → {trip.to}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-medium text-espresso-dark text-right">
                    {fmt(trip.cost)} UZS
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Shared Components ──

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-espresso/10 bg-white p-5"
        >
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  const t = useTranslations("tripAnalytics");
  return (
    <div className="py-16 text-center text-espresso-light">
      <MapPin className="mx-auto h-12 w-12 mb-3 opacity-30" />
      <p>{t("noData")}</p>
    </div>
  );
}
