/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, MapPin, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { machinesApi } from "@/lib/api";

interface LocationsTabProps {
  machineId: string;
  machine: any;
}

export function LocationsTab({ machineId, machine }: LocationsTabProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["machine-location-history", machineId],
    queryFn: async () => {
      const res = await machinesApi.getLocationHistory(machineId);
      return (res.data?.data ?? res.data ?? []) as any[];
    },
  });

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
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Адрес</p>
              <p className="font-medium">{machine.address || "Не указан"}</p>
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
          ) : !history || history.length === 0 ? (
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
