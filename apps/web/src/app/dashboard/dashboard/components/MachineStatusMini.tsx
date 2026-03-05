"use client";

import { useMachines } from "@/lib/hooks";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { MACHINE_STATUS, MACHINE_STATUS_META, fmtShort } from "./constants";

export function MachineStatusMini() {
  const { data: machines } = useMachines();

  const machineList =
    machines && machines.length > 0
      ? machines.map((m: unknown) => {
          const machine = m as {
            id?: string;
            name?: string;
            status?: string;
            sales?: number;
            orders?: number;
            lastSync?: string;
            stock?: number;
            cpu?: number;
            temp?: number;
          };
          return {
            id: machine.id || machine.name || "unknown",
            name: machine.name || "Unknown Machine",
            status: (machine.status || "offline") as
              | "online"
              | "warning"
              | "offline",
            sales: machine.sales || 0,
            orders: machine.orders || 0,
            lastSync: machine.lastSync || "N/A",
            stock: machine.stock || 0,
            cpu: machine.cpu || 0,
            temp: machine.temp || 0,
          };
        })
      : MACHINE_STATUS;

  const topMachines = [...machineList]
    .sort((a: (typeof machineList)[0], b: (typeof machineList)[0]) => {
      const order: Record<string, number> = {
        offline: 0,
        warning: 1,
        online: 2,
      };
      return order[a.status] - order[b.status];
    })
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Статус автоматов</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-caramel-dark text-xs"
          >
            Все 16 <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {topMachines.map((m) => {
            const meta = MACHINE_STATUS_META[m.status];
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-stone-100 p-2.5 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-espresso-dark truncate">
                    {m.name}
                  </p>
                  <p className="text-xs text-espresso-light">
                    {m.id} · {m.lastSync}
                  </p>
                </div>
                <span className="text-sm font-semibold text-espresso-dark whitespace-nowrap">
                  {fmtShort(m.sales)}
                </span>
                {m.stock < 25 && (
                  <Badge variant="warning">Запас {m.stock}%</Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-3 flex gap-3 border-t border-stone-100 pt-3">
          {(["online", "warning", "offline"] as const).map(
            (status: "online" | "warning" | "offline") => {
              const count = machineList.filter(
                (m: (typeof machineList)[0]) => m.status === status,
              ).length;
              const meta = MACHINE_STATUS_META[status];
              return (
                <div key={status} className="flex items-center gap-1.5 text-xs">
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  <span className="text-espresso-light">{meta.label}:</span>
                  <span className="font-medium">{count}</span>
                </div>
              );
            },
          )}
        </div>
      </CardContent>
    </Card>
  );
}
