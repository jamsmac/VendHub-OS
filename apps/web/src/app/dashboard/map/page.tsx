"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Coffee,
  Search,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  WifiOff,
  Wrench,
  RefreshCw,
  List,
  ChevronRight,
  ExternalLink,
  Thermometer,
  Battery,
  Signal,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { machinesApi } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

interface MachineMapItem {
  id: string;
  machineNumber: string;
  name: string;
  status: "online" | "offline" | "warning" | "error" | "maintenance";
  latitude: number;
  longitude: number;
  locationName: string;
  address: string;
  lastSeen: string;
  slotsCount: number;
  emptySlotsCount: number;
  todaySales: number;
  todayRevenue: number;
  errors: number;
  temperature?: number;
  signalStrength?: number;
  batteryLevel?: number;
}

// ============================================================================
// Constants
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: any }
> = {
  online: {
    label: "Онлайн",
    color: "text-green-600",
    bgColor: "bg-green-500",
    icon: CheckCircle,
  },
  offline: {
    label: "Офлайн",
    color: "text-gray-500",
    bgColor: "bg-gray-400",
    icon: WifiOff,
  },
  warning: {
    label: "Внимание",
    color: "text-yellow-600",
    bgColor: "bg-yellow-500",
    icon: AlertTriangle,
  },
  error: {
    label: "Ошибка",
    color: "text-red-600",
    bgColor: "bg-red-500",
    icon: XCircle,
  },
  maintenance: {
    label: "ТО",
    color: "text-blue-600",
    bgColor: "bg-blue-500",
    icon: Wrench,
  },
};

const TASHKENT_CENTER = { lat: 41.2995, lng: 69.2401 };

// ============================================================================
// Component
// ============================================================================

export default function MapPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedMachine, setSelectedMachine] = useState<MachineMapItem | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  // Fetch machines map data
  const {
    data: machinesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["machines-map"],
    queryFn: async () => {
      const res = await machinesApi.getMap();
      return (res.data?.data || res.data || []) as MachineMapItem[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const machines = (machinesData || []).filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();

      return (
        m.machineNumber.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.locationName?.toLowerCase().includes(q) ||
        m.address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Status counts
  const statusCounts = (machinesData || []).reduce(
    (acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      acc.total++;
      return acc;
    },
    { total: 0 } as Record<string, number>,
  );

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current || viewMode !== "map") return;

    // Check if Google Maps is already loaded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== "undefined" && (window as any).google?.maps) {
      initMap();
      return;
    }

    // Load Google Maps script
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) return; // Show placeholder if no API key

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);

    return () => {
      // Cleanup markers

      markersRef.current.forEach((m) => m.setMap?.(null));
      markersRef.current = [];
    };
  }, [viewMode]);

  const initMap = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!mapRef.current || !(window as any).google?.maps) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;

    googleMapRef.current = new google.maps.Map(mapRef.current, {
      center: TASHKENT_CENTER,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!googleMapRef.current || !machines.length) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;

    if (!google?.maps) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Add new markers
    const bounds = new google.maps.LatLngBounds();

    machines.forEach((machine) => {
      if (!machine.latitude || !machine.longitude) return;

      const statusConfig =
        STATUS_CONFIG[machine.status] || STATUS_CONFIG.offline;
      const position = { lat: machine.latitude, lng: machine.longitude };
      bounds.extend(position);

      const marker = new google.maps.Marker({
        position,
        map: googleMapRef.current,
        title: `${machine.machineNumber} — ${machine.name}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: statusConfig.bgColor.replace("bg-", "").includes("green")
            ? "#22c55e"
            : statusConfig.bgColor.includes("red")
              ? "#ef4444"
              : statusConfig.bgColor.includes("yellow")
                ? "#eab308"
                : statusConfig.bgColor.includes("blue")
                  ? "#3b82f6"
                  : "#9ca3af",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      marker.addListener("click", () => setSelectedMachine(machine));
      markersRef.current.push(marker);
    });

    if (machines.length > 1) {
      googleMapRef.current.fitBounds(bounds, { padding: 50 });
    } else if (machines.length === 1 && machines[0].latitude) {
      googleMapRef.current.setCenter({
        lat: machines[0].latitude,
        lng: machines[0].longitude,
      });
      googleMapRef.current.setZoom(15);
    }
  }, [machines, googleMapRef.current]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Карта автоматов</h1>
          <p className="text-muted-foreground">
            Расположение и статус всех автоматов в реальном времени
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Обновить
          </Button>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="rounded-r-none"
            >
              <MapPin className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          Все ({statusCounts.total || 0})
        </Button>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <Button
            key={key}
            variant={statusFilter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(key)}
            className="gap-1.5"
          >
            <div className={`w-2 h-2 rounded-full ${config.bgColor}`} />
            {config.label} ({statusCounts[key] || 0})
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по номеру, названию или адресу..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Map View */}
      {viewMode === "map" ? (
        <div className="relative">
          <div
            ref={mapRef}
            className="w-full h-[calc(100vh-320px)] min-h-[400px] rounded-lg border bg-muted"
          >
            {/* Placeholder when no Google Maps API key */}
            {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MapPin className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">
                  Google Maps API Key не настроен
                </p>
                <p className="text-sm">
                  Добавьте NEXT_PUBLIC_GOOGLE_MAPS_KEY в .env
                </p>
                <p className="text-sm mt-4">
                  {machines.length} автоматов найдено
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4 mr-2" />
                  Список
                </Button>
              </div>
            )}
          </div>

          {/* Floating Stats */}
          <div className="absolute top-3 right-3 bg-card/95 backdrop-blur border rounded-lg p-3 shadow-lg">
            <p className="text-sm font-medium mb-1">
              Автоматов: {machines.length}
            </p>
            <div className="space-y-1">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const count = machines.filter((m) => m.status === key).length;
                if (!count) return null;
                return (
                  <div key={key} className="flex items-center gap-1.5 text-xs">
                    <div className={`w-2 h-2 rounded-full ${config.bgColor}`} />
                    <span>
                      {config.label}: {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : machines.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Coffee className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">Автоматы не найдены</p>
                <p className="text-sm text-muted-foreground">
                  Попробуйте изменить фильтры
                </p>
              </CardContent>
            </Card>
          ) : (
            machines.map((machine) => {
              const statusConfig =
                STATUS_CONFIG[machine.status] || STATUS_CONFIG.offline;
              const StatusIcon = statusConfig.icon;
              const stockPercent =
                machine.slotsCount > 0
                  ? Math.round(
                      ((machine.slotsCount - machine.emptySlotsCount) /
                        machine.slotsCount) *
                        100,
                    )
                  : 0;

              return (
                <Card
                  key={machine.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedMachine(machine)}
                >
                  <CardContent className="py-4 flex items-center gap-4">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${statusConfig.bgColor}/20`}
                    >
                      <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{machine.machineNumber}</p>
                        <span className="text-sm text-muted-foreground">
                          {machine.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {machine.locationName ||
                          machine.address ||
                          "Адрес не указан"}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2 justify-end">
                        <Badge variant="secondary" className="text-xs">
                          Заполнен: {stockPercent}%
                        </Badge>
                        {machine.errors > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {machine.errors} ошибок
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Сегодня: {machine.todaySales} продаж /{" "}
                        {machine.todayRevenue?.toLocaleString()} сум
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Machine Detail Sheet */}
      <Sheet
        open={!!selectedMachine}
        onOpenChange={(open) => !open && setSelectedMachine(null)}
      >
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedMachine &&
            (() => {
              const m = selectedMachine;
              const statusConfig =
                STATUS_CONFIG[m.status] || STATUS_CONFIG.offline;
              const StatusIcon = statusConfig.icon;
              const stockPercent =
                m.slotsCount > 0
                  ? Math.round(
                      ((m.slotsCount - m.emptySlotsCount) / m.slotsCount) * 100,
                    )
                  : 0;

              return (
                <>
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Coffee className="h-5 w-5" />
                      {m.machineNumber}
                    </SheetTitle>
                    <SheetDescription>{m.name}</SheetDescription>
                  </SheetHeader>

                  <div className="space-y-6 mt-6">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          className={`h-5 w-5 ${statusConfig.color}`}
                        />
                        <span className={`font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Последний раз:{" "}
                        {new Date(m.lastSeen).toLocaleString("ru-RU")}
                      </span>
                    </div>

                    {/* Location */}
                    <div>
                      <p className="text-sm font-medium mb-1">Расположение</p>
                      <p className="text-sm text-muted-foreground">
                        {m.locationName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.address}
                      </p>
                      {m.latitude && m.longitude && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 {m.latitude.toFixed(5)}, {m.longitude.toFixed(5)}
                        </p>
                      )}
                    </div>

                    {/* Today Stats */}
                    <div>
                      <p className="text-sm font-medium mb-2">Сегодня</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xl font-bold">{m.todaySales}</p>
                          <p className="text-xs text-muted-foreground">
                            Продаж
                          </p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xl font-bold">
                            {m.todayRevenue?.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Выручка (сум)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stock */}
                    <div>
                      <p className="text-sm font-medium mb-2">Заполненность</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${stockPercent > 50 ? "bg-green-500" : stockPercent > 20 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {stockPercent}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.slotsCount - m.emptySlotsCount} / {m.slotsCount}{" "}
                        слотов заполнено
                      </p>
                    </div>

                    {/* Telemetry */}
                    {(m.temperature !== undefined ||
                      m.signalStrength !== undefined ||
                      m.batteryLevel !== undefined) && (
                      <div>
                        <p className="text-sm font-medium mb-2">Телеметрия</p>
                        <div className="grid grid-cols-3 gap-2">
                          {m.temperature !== undefined && (
                            <div className="p-2 bg-muted/50 rounded-lg text-center">
                              <Thermometer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                              <p className="text-sm font-medium">
                                {m.temperature}°C
                              </p>
                            </div>
                          )}
                          {m.signalStrength !== undefined && (
                            <div className="p-2 bg-muted/50 rounded-lg text-center">
                              <Signal className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                              <p className="text-sm font-medium">
                                {m.signalStrength}%
                              </p>
                            </div>
                          )}
                          {m.batteryLevel !== undefined && (
                            <div className="p-2 bg-muted/50 rounded-lg text-center">
                              <Battery className="h-4 w-4 mx-auto mb-1 text-green-500" />
                              <p className="text-sm font-medium">
                                {m.batteryLevel}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {m.errors > 0 && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-700 dark:text-red-400">
                            {m.errors} активных ошибок
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/machines/${m.id}`}
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Подробнее
                        </Button>
                      </Link>
                    </div>
                  </div>
                </>
              );
            })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
