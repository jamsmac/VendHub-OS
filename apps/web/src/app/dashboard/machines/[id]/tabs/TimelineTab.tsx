/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEntityTimeline } from "@/lib/hooks/use-entity-events";

const EVENT_LABELS: Record<string, string> = {
  contract_signed: "Контракт заключён",
  payment_made: "Оплата произведена",
  shipped: "Отправлен поставщиком",
  customs_cleared: "Таможня пройдена",
  received_at_warehouse: "Принят на склад",
  quality_checked: "Проверка качества",
  configured: "Настроен",
  issued_from_warehouse: "Выдан со склада",
  loaded_to_bunker: "Загружен в бункер",
  bunker_mixed: "Смешение партий",
  installed_in_machine: "Установлен в автомат",
  removed_from_machine: "Снят с автомата",
  loaded_to_slot: "Загружен в слот",
  sold: "Продажа",
  encashment: "Инкассация",
  refilled: "Дозаправка",
  cleaning_daily: "Ежедневная чистка",
  cleaning_deep: "Глубокая чистка",
  cleaning_full: "Полная чистка",
  flush_cycle: "Промывка",
  maintenance_scheduled: "Плановое ТО",
  maintenance_unscheduled: "Внеплановый ремонт",
  spare_part_replaced: "Замена запчасти",
  relocated: "Перемещение",
  deactivated: "Деактивирован",
  reactivated: "Реактивирован",
  written_off: "Списан",
  transferred_to_operator: "Передан оператору",
  returned_from_operator: "Возврат от оператора",
  inventory_check: "Инвентаризация",
};

interface TimelineTabProps {
  entityId: string;
}

export function TimelineTab({ entityId }: TimelineTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useEntityTimeline(entityId, page, 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Лента событий</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Нет событий
          </p>
        ) : (
          <>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-0">
                {data.data.map((event: any) => (
                  <div key={event.id} className="relative pl-10 pb-4">
                    {/* Dot on timeline */}
                    <div className="absolute left-[13px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />

                    <div className="rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {EVENT_LABELS[event.eventType] || event.eventType}
                          </p>
                          {event.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {event.notes}
                            </p>
                          )}
                          {event.quantity && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Кол-во: {event.quantity}
                            </Badge>
                          )}
                          {event.documentNumber && (
                            <Badge
                              variant="outline"
                              className="mt-1 ml-1 text-xs"
                            >
                              {event.documentNumber}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(event.eventDate),
                              "dd.MM.yyyy HH:mm",
                              {
                                locale: ru,
                              },
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(event.eventDate), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Load more */}
            {data.total > page * 30 && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Загрузить ещё
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center mt-2">
              Показано {data.data.length} из {data.total}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
