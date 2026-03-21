/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PassportTabProps {
  machine: any;
}

export function PassportTab({ machine }: PassportTabProps) {
  return (
    <div className="space-y-6">
      {/* Acquisition Block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Приобретение</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Производитель</p>
              <p className="font-medium">{machine.manufacturer || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Модель</p>
              <p className="font-medium">{machine.model || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Год выпуска</p>
              <p className="font-medium">{machine.yearOfManufacture || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Серийный номер</p>
              <p className="font-medium font-mono text-xs">
                {machine.serialNumber || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Дата покупки</p>
              <p className="font-medium">{machine.purchaseDate || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Стоимость покупки</p>
              <p className="font-medium">
                {machine.purchasePrice
                  ? `${Number(machine.purchasePrice).toLocaleString("ru-RU")} UZS`
                  : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Data Block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Технические данные</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Тип</p>
              <Badge variant="outline">{machine.type}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Прошивка</p>
              <p className="font-medium font-mono text-xs">
                {machine.firmwareVersion || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Слотов</p>
              <p className="font-medium">{machine.maxProductSlots || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Статус связи</p>
              <Badge
                variant={
                  machine.connectionStatus === "online"
                    ? "default"
                    : "secondary"
                }
              >
                {machine.connectionStatus || "unknown"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ownership Block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Владение и амортизация</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Метод амортизации</p>
              <p className="font-medium">
                {machine.depreciationMethod || "linear"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Срок амортизации</p>
              <p className="font-medium">
                {machine.depreciationYears
                  ? `${machine.depreciationYears} лет`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Накопленная амортизация</p>
              <p className="font-medium">
                {machine.accumulatedDepreciation
                  ? `${Number(machine.accumulatedDepreciation).toLocaleString("ru-RU")} UZS`
                  : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
