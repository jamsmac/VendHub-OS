/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, AlertTriangle, CheckCircle2, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { collectionsApi } from "@/lib/api";

interface EncashmentTabProps {
  machineId: string;
}

function formatUZS(v: number) {
  return Number(v).toLocaleString("ru-RU") + " сум";
}

export function EncashmentTab({ machineId }: EncashmentTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["collections", "machine", machineId],
    queryFn: async () => {
      const res = await collectionsApi.getAll({ machineId });
      const raw = res.data?.data ?? res.data;
      // API may return { items: [...] } or [...] or paginated object
      return Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
          ? raw.items
          : [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Belt-and-suspenders: React Query may cache a stale non-array value from before the queryFn fix.
  // Always validate shape here — a non-empty object is truthy but NOT iterable.
  const collections: any[] = Array.isArray(data) ? data : [];

  // Summary
  const totalAmount = collections.reduce(
    (sum: number, c: any) => sum + Number(c.totalAmount || 0),
    0,
  );
  const discrepancies = collections.filter(
    (c: any) => c.difference && Math.abs(Number(c.difference)) > 0,
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Всего инкассаций</p>
            <p className="text-2xl font-bold">{collections.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Общая сумма</p>
            <p className="text-2xl font-bold text-green-600">
              {formatUZS(totalAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">С расхождениями</p>
            <p className="text-2xl font-bold text-amber-600">
              {discrepancies.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Collection List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">История инкассаций</CardTitle>
        </CardHeader>
        <CardContent>
          {collections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет инкассаций
            </p>
          ) : (
            <div className="space-y-2">
              {collections.map((collection: any) => {
                const hasDiff =
                  collection.difference &&
                  Math.abs(Number(collection.difference)) > 0;
                return (
                  <div
                    key={collection.id}
                    className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatUZS(Number(collection.totalAmount || 0))}
                        </span>
                        {collection.isVerified ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Не проверено
                          </Badge>
                        )}
                        {hasDiff && (
                          <Badge
                            variant="destructive"
                            className="text-xs flex items-center gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {Number(collection.difference) > 0 ? "+" : ""}
                            {formatUZS(Number(collection.difference))}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Наличные:{" "}
                        {formatUZS(Number(collection.cashAmount || 0))}
                        {collection.coinAmount
                          ? ` · Монеты: ${formatUZS(Number(collection.coinAmount))}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {collection.collectedAt
                          ? format(
                              new Date(collection.collectedAt),
                              "dd.MM.yyyy HH:mm",
                              { locale: ru },
                            )
                          : "—"}
                      </p>
                      {collection.photoUrls?.length > 0 && (
                        <Camera className="h-3.5 w-3.5 text-muted-foreground inline ml-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
