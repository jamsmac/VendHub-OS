/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Loader2,
  MapPin,
  ArrowRight,
  FileText,
  Building2,
  Calendar,
  Banknote,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { machinesApi, locationsApi } from "@/lib/api";

interface LocationsTabProps {
  machineId: string;
  machine: any;
}

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  expiring_soon: "bg-amber-100 text-amber-800",
  expired: "bg-red-100 text-red-800",
  draft: "bg-gray-100 text-gray-800",
  terminated: "bg-red-200 text-red-900",
};

export function LocationsTab({ machineId, machine }: LocationsTabProps) {
  // Location history
  const { data: history, isLoading } = useQuery({
    queryKey: ["machine-location-history", machineId],
    queryFn: async () => {
      const res = await machinesApi.getLocationHistory(machineId);
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
    },
  });

  // Full location data (includes contracts)
  const { data: location } = useQuery({
    queryKey: ["location", machine.locationId],
    queryFn: async () => {
      const res = await locationsApi.getById(machine.locationId);
      return res.data?.data ?? res.data;
    },
    enabled: !!machine.locationId,
  });

  // Active contract from location
  const activeContract = location?.contracts?.find(
    (c: any) => c.status === "active" || c.status === "expiring_soon",
  );

  return (
    <div className="space-y-4">
      {/* Current Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Текущая локация
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Наименование</p>
              <p className="font-medium">
                {location?.name || machine.name || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Адрес</p>
              <p className="font-medium">{machine.address || "Не указан"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Тип локации</p>
              <p className="font-medium">{location?.type || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Координаты</p>
              <p className="font-medium font-mono text-xs">
                {machine.latitude && machine.longitude
                  ? `${machine.latitude}, ${machine.longitude}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Дата установки</p>
              <p className="font-medium">
                {machine.installationDate
                  ? format(new Date(machine.installationDate), "dd.MM.yyyy", {
                      locale: ru,
                    })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Оператор</p>
              <p className="font-medium">
                {machine.assignedOperatorId ? "Назначен" : "Не назначен"}
              </p>
            </div>
          </div>

          {/* Link to location detail */}
          {machine.locationId && (
            <div className="mt-3">
              <Link href={`/dashboard/locations/${machine.locationId}`}>
                <Button variant="outline" size="sm">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  Открыть карточку локации
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lease Contract */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Договор аренды
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!machine.locationId ? (
            <p className="text-sm text-muted-foreground">
              Локация не привязана — нет данных о договоре
            </p>
          ) : !activeContract ? (
            <p className="text-sm text-muted-foreground">
              Нет активного договора аренды для этой локации
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium font-mono text-sm">
                    {activeContract.contractNumber}
                  </span>
                  <Badge
                    className={
                      CONTRACT_STATUS_COLORS[activeContract.status] ||
                      "bg-gray-100 text-gray-800"
                    }
                  >
                    {activeContract.status === "active"
                      ? "Активный"
                      : activeContract.status === "expiring_soon"
                        ? "Истекает скоро"
                        : activeContract.status}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {activeContract.type === "rent"
                    ? "Аренда"
                    : activeContract.type === "revenue_share"
                      ? "% от выручки"
                      : activeContract.type}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Период</p>
                    <p className="font-medium">
                      {activeContract.startDate
                        ? format(new Date(activeContract.startDate), "dd.MM.yyyy", { locale: ru })
                        : "—"}
                      {" — "}
                      {activeContract.endDate
                        ? format(new Date(activeContract.endDate), "dd.MM.yyyy", { locale: ru })
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Ежемесячная оплата</p>
                    <p className="font-medium">
                      {activeContract.monthlyAmount
                        ? `${Number(activeContract.monthlyAmount).toLocaleString("ru-RU")} ${activeContract.currency || "UZS"}`
                        : "—"}
                    </p>
                  </div>
                </div>
                {activeContract.revenueSharePercent > 0 && (
                  <div>
                    <p className="text-muted-foreground">Доля от выручки</p>
                    <p className="font-medium">
                      {activeContract.revenueSharePercent}%
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Арендодатель</p>
                  <p className="font-medium">
                    {activeContract.landlordName || "—"}
                  </p>
                </div>
              </div>

              {activeContract.title && (
                <p className="text-xs text-muted-foreground">
                  {activeContract.title}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">История перемещений</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !Array.isArray(history) || history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет истории перемещений
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((entry: any, idx: number) => (
                <div
                  key={entry.id || idx}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.locationName ||
                        entry.address ||
                        "Неизвестная локация"}
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                      {entry.installedAt && (
                        <span>
                          С{" "}
                          {format(new Date(entry.installedAt), "dd.MM.yyyy", {
                            locale: ru,
                          })}
                        </span>
                      )}
                      {entry.removedAt && (
                        <>
                          <ArrowRight className="h-3 w-3" />
                          <span>
                            До{" "}
                            {format(new Date(entry.removedAt), "dd.MM.yyyy", {
                              locale: ru,
                            })}
                          </span>
                        </>
                      )}
                    </div>
                    {entry.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Причина: {entry.reason}
                      </p>
                    )}
                  </div>
                  {!entry.removedAt && (
                    <Badge variant="default" className="text-xs shrink-0">
                      Текущая
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
