/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { maintenanceApi, equipmentApi } from "@/lib/api";

interface MaintenanceTabProps {
  machineId: string;
}

export function MaintenanceTab({ machineId }: MaintenanceTabProps) {
  const { data: maintenanceData, isLoading: loadingMaint } = useQuery({
    queryKey: ["maintenance", "machine", machineId],
    queryFn: async () => {
      const res = await maintenanceApi.getAll({ machineId });
      return (res.data?.data ?? res.data ?? []) as any[];
    },
  });

  const { data: components, isLoading: loadingComp } = useQuery({
    queryKey: ["equipment", "machine", machineId],
    queryFn: async () => {
      const res = await equipmentApi.getAll({ machineId });
      return (res.data?.data ?? res.data ?? []) as any[];
    },
  });

  const isLoading = loadingMaint || loadingComp;
  const records = maintenanceData || [];

  // Categorize maintenance records
  const cleanings = records.filter((r: any) =>
    ["cleaning", "preventive"].includes(r.maintenanceType),
  );
  const repairs = records.filter((r: any) =>
    ["repair", "replacement"].includes(r.maintenanceType),
  );
  const inspections = records.filter((r: any) =>
    ["inspection", "calibration", "lubrication"].includes(r.maintenanceType),
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="cleanings" className="space-y-4">
      <TabsList>
        <TabsTrigger value="cleanings">Чистки ({cleanings.length})</TabsTrigger>
        <TabsTrigger value="repairs">Ремонты ({repairs.length})</TabsTrigger>
        <TabsTrigger value="inspections">ТО ({inspections.length})</TabsTrigger>
        <TabsTrigger value="replacements">Замены компонентов</TabsTrigger>
      </TabsList>

      <TabsContent value="cleanings">
        <MaintenanceList
          records={cleanings}
          emptyText="Нет записей о чистках"
        />
      </TabsContent>

      <TabsContent value="repairs">
        <MaintenanceList records={repairs} emptyText="Нет записей о ремонтах" />
      </TabsContent>

      <TabsContent value="inspections">
        <MaintenanceList records={inspections} emptyText="Нет записей о ТО" />
      </TabsContent>

      <TabsContent value="replacements">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Замены компонентов</CardTitle>
          </CardHeader>
          <CardContent>
            {!components || components.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Нет компонентов
              </p>
            ) : (
              <div className="space-y-2">
                {components
                  .filter((c: any) => c.replacementDate)
                  .map((comp: any) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{comp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {comp.componentType} · S/N: {comp.serialNumber || "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Заменён:{" "}
                          {format(
                            new Date(comp.replacementDate),
                            "dd.MM.yyyy",
                            {
                              locale: ru,
                            },
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                {components.filter((c: any) => c.replacementDate).length ===
                  0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Нет замен
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function MaintenanceList({
  records,
  emptyText,
}: {
  records: any[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {emptyText}
          </p>
        ) : (
          <div className="space-y-2">
            {records.map((record: any) => (
              <div
                key={record.id}
                className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
              >
                {record.isSuccessful ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {record.maintenanceType}
                    </Badge>
                    {record.totalCost > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {Number(record.totalCost).toLocaleString("ru-RU")} сум
                      </span>
                    )}
                  </div>
                  {record.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {record.description}
                    </p>
                  )}
                  {record.partsUsed?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Запчасти: {record.partsUsed.length} шт.
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {record.performedAt
                      ? format(new Date(record.performedAt), "dd.MM.yyyy", {
                          locale: ru,
                        })
                      : "—"}
                  </p>
                  {record.durationMinutes && (
                    <p className="text-xs text-muted-foreground">
                      {record.durationMinutes} мин
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
