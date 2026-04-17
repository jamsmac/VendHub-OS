"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  ClipboardList,
  MapPin,
  Wrench,
  BarChart3,
  Package,
  FileText,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

// Tab components
import { OverviewTab } from "./tabs/OverviewTab";
import { ContentsTab } from "./tabs/ContentsTab";
import { EncashmentTab } from "./tabs/EncashmentTab";
import { MaintenanceTab } from "./tabs/MaintenanceTab";
import { TasksTab } from "./tabs/TasksTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { LocationsTab } from "./tabs/LocationsTab";
import { TimelineTab } from "./tabs/TimelineTab";
import { PassportTab } from "./tabs/PassportTab";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  low_stock: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-800",
  maintenance: "bg-blue-100 text-blue-800",
  offline: "bg-gray-100 text-gray-800",
  disabled: "bg-gray-200 text-gray-600",
};

export default function MachineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const _router = useRouter();

  const { data: machine, isLoading } = useQuery({
    queryKey: ["machine", id],
    queryFn: async () => {
      const res = await api.get(`/machines/${id}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Автомат не найден
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ================================================================
          STICKY HEADER (Spec v2 Section 4.0)
          ================================================================ */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 -mx-4 sm:-mx-6 sm:px-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/machines">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono">
                  {machine.machineNumber}
                </h1>
                <Badge
                  className={
                    STATUS_COLORS[machine.status] || "bg-gray-100 text-gray-800"
                  }
                >
                  {machine.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {machine.name}
                {machine.address && ` · ${machine.address}`}
              </p>
              {machine.serialNumber && (
                <p className="text-xs text-muted-foreground font-mono">
                  S/N: {machine.serialNumber}
                </p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline">
              <Banknote className="h-4 w-4 mr-1" />
              Инкассация
            </Button>
            <Button size="sm" variant="outline">
              <Package className="h-4 w-4 mr-1" />
              Загрузить
            </Button>
            <Button size="sm" variant="outline">
              <ClipboardList className="h-4 w-4 mr-1" />+ Задача
            </Button>
          </div>
        </div>

        {/* Operator & last activity */}
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          {machine.assignedOperatorId && <span>Оператор: назначен</span>}
          {machine.lastRefillDate && (
            <span>
              Последняя загрузка:{" "}
              {new Date(machine.lastRefillDate).toLocaleDateString("ru-RU")}
            </span>
          )}
          {machine.lastCollectionDate && (
            <span>
              Последняя инкассация:{" "}
              {new Date(machine.lastCollectionDate).toLocaleDateString("ru-RU")}
            </span>
          )}
        </div>
      </div>

      {/* ================================================================
          8 TABS (Spec v2 Sections 4.1-4.8)
          ================================================================ */}
      <Tabs defaultValue="overview" className="mt-4">
        <TabsList className="grid grid-cols-5 lg:grid-cols-9 w-full">
          <TabsTrigger value="overview" className="text-xs">
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="contents" className="text-xs">
            <Package className="h-3.5 w-3.5 mr-1" />
            Содержимое
          </TabsTrigger>
          <TabsTrigger value="encashment" className="text-xs">
            <Banknote className="h-3.5 w-3.5 mr-1" />
            Инкассация
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="text-xs">
            <Wrench className="h-3.5 w-3.5 mr-1" />
            Обслуживание
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">
            <ClipboardList className="h-3.5 w-3.5 mr-1" />
            Задачи
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            Аналитика
          </TabsTrigger>
          <TabsTrigger value="locations" className="text-xs">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            Локация
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Лента
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1" />
            Настройки
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="overview">
            <OverviewTab machineId={id} machine={machine} />
          </TabsContent>

          <TabsContent value="contents">
            <ContentsTab machineId={id} />
          </TabsContent>

          <TabsContent value="encashment">
            <EncashmentTab machineId={id} />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceTab machineId={id} />
          </TabsContent>

          <TabsContent value="tasks">
            <TasksTab machineId={id} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab machineId={id} />
          </TabsContent>

          <TabsContent value="locations">
            <LocationsTab machineId={id} machine={machine} />
          </TabsContent>

          <TabsContent value="timeline">
            <TimelineTab entityId={id} />
          </TabsContent>

          <TabsContent value="settings">
            <PassportTab machine={machine} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
