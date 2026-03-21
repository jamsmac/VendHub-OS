"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertTriangle, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EntityPassportLink } from "@/components/entity-passport";
import { useMachineState } from "@/lib/hooks/use-machine-state";
import { entityEventsApi } from "@/lib/api";
import type {
  BunkerState,
  ComponentState,
} from "@/lib/hooks/use-machine-state";

interface ContentsTabProps {
  machineId: string;
}

export function ContentsTab({ machineId }: ContentsTabProps) {
  const { data: state, isLoading } = useMachineState(machineId);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [actualValues, setActualValues] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  const inventoryMutation = useMutation({
    mutationFn: async () => {
      // Record inventory check event for each bunker with discrepancy
      const events = (state?.bunkers || [])
        .filter((b) => {
          const actual = actualValues[b.containerId];
          return actual !== undefined && Math.abs(actual - b.remaining) > 0.5;
        })
        .map((b) => ({
          entityId: machineId,
          entityType: "machine",
          eventType: "inventory_check",
          quantity: actualValues[b.containerId],
          notes: `Слот ${b.slotNumber} (${b.ingredientName || "—"}): расчёт ${Math.round(b.remaining)}г → факт ${actualValues[b.containerId]}г, расхождение ${Math.round(actualValues[b.containerId] - b.remaining)}г`,
          metadata: {
            containerId: b.containerId,
            calculated: b.remaining,
            actual: actualValues[b.containerId],
            discrepancy: actualValues[b.containerId] - b.remaining,
          },
        }));

      for (const evt of events) {
        await entityEventsApi.create(evt);
      }
      return events.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["machine-state", machineId] });
      queryClient.invalidateQueries({ queryKey: ["entity-events"] });
      setInventoryOpen(false);
      setActualValues({});
      toast.success(`Инвентаризация завершена: ${count} расхождений записано`);
    },
    onError: () => toast.error("Ошибка сохранения инвентаризации"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="space-y-6">
      {/* Bunkers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Бункеры ({state.bunkers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.bunkers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет бункеров</p>
          ) : (
            <div className="space-y-3">
              {state.bunkers.map((bunker: BunkerState) => (
                <div
                  key={bunker.containerId}
                  className="flex items-center gap-4 rounded-lg border p-3"
                >
                  <div className="w-8 text-center">
                    <span className="text-lg font-bold text-muted-foreground">
                      {bunker.slotNumber}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <EntityPassportLink
                        entityId={bunker.containerId}
                        entityType="container"
                        code={`Слот ${bunker.slotNumber}`}
                        name={bunker.ingredientName || undefined}
                      >
                        {bunker.ingredientName || "Пустой слот"}
                      </EntityPassportLink>
                      {bunker.isLow && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={bunker.fillPercent}
                        className="h-2 flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {bunker.fillPercent}%
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>
                        {Math.round(bunker.remaining)}
                        {" / "}
                        {Math.round(bunker.capacity)} г
                      </span>
                      {bunker.daysUntilEmpty !== null && (
                        <span>~{bunker.daysUntilEmpty} дн.</span>
                      )}
                      {bunker.portionsLeft !== null && (
                        <span>{bunker.portionsLeft} порций</span>
                      )}
                    </div>
                  </div>
                  {bunker.batchId && (
                    <EntityPassportLink
                      entityId={bunker.batchId}
                      entityType="ingredient_batch"
                      code={bunker.batchNumber || undefined}
                    >
                      <Badge variant="outline" className="text-xs font-mono">
                        {bunker.batchNumber || "LOT"}
                      </Badge>
                    </EntityPassportLink>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Components */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Компоненты ({state.components.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.components.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет компонентов</p>
          ) : (
            <div className="space-y-3">
              {state.components.map((comp: ComponentState) => (
                <div
                  key={comp.componentId}
                  className="flex items-center gap-4 rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <EntityPassportLink
                        entityId={comp.componentId}
                        entityType="equipment_component"
                        code={comp.name}
                        name={comp.type}
                      >
                        {comp.name}
                      </EntityPassportLink>
                      <Badge variant="outline" className="text-xs">
                        {comp.type}
                      </Badge>
                      {comp.needsMaintenance && (
                        <Badge variant="destructive" className="text-xs">
                          ТО
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={comp.usagePercent}
                        className="h-2 flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {comp.cyclesSinceReset}
                        {comp.maxCycles ? ` / ${comp.maxCycles}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleaning Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Чистка и промывка</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                Чашек с последней промывки
              </p>
              <p className="text-2xl font-bold mt-1">
                {state.cleaning.cupsSinceFlush}
                <span className="text-sm font-normal text-muted-foreground">
                  {" / "}
                  {state.cleaning.flushThreshold}
                </span>
              </p>
              {state.cleaning.flushOverdue && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Промывка просрочена
                </Badge>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                Дней с глубокой чистки
              </p>
              <p className="text-2xl font-bold mt-1">
                {state.cleaning.daysSinceDeepClean}
                <span className="text-sm font-normal text-muted-foreground">
                  {" / "}
                  {state.cleaning.deepCleanIntervalDays}
                </span>
              </p>
              {state.cleaning.deepCleanOverdue && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Чистка просрочена
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Check Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => {
            // Pre-fill with calculated values
            const initial: Record<string, number> = {};
            state.bunkers.forEach((b: BunkerState) => {
              initial[b.containerId] = Math.round(b.remaining);
            });
            setActualValues(initial);
            setInventoryOpen(true);
          }}
        >
          <ClipboardCheck className="h-4 w-4 mr-2" />
          Провести инвентаризацию
        </Button>
      </div>

      {/* Inventory Check Dialog */}
      <Dialog open={inventoryOpen} onOpenChange={setInventoryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Инвентаризация бункеров</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Введите фактические остатки. Расхождения будут зафиксированы.
          </p>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {state.bunkers.map((bunker: BunkerState) => {
              const actual = actualValues[bunker.containerId] ?? 0;
              const diff = actual - bunker.remaining;
              return (
                <div
                  key={bunker.containerId}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Слот {bunker.slotNumber}: {bunker.ingredientName || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Расчёт: {Math.round(bunker.remaining)} г
                    </p>
                  </div>
                  <Input
                    type="number"
                    step="1"
                    className="w-24 h-9"
                    value={actual}
                    onChange={(e) =>
                      setActualValues({
                        ...actualValues,
                        [bunker.containerId]: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  {Math.abs(diff) > 0.5 && (
                    <Badge
                      variant={diff > 0 ? "default" : "destructive"}
                      className="text-xs w-16 justify-center"
                    >
                      {diff > 0 ? "+" : ""}
                      {Math.round(diff)}г
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInventoryOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => inventoryMutation.mutate()}
              disabled={inventoryMutation.isPending}
            >
              {inventoryMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ClipboardCheck className="h-4 w-4 mr-2" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
