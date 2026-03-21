/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ExternalLink, Clock, Package, Wrench, Loader2 } from "lucide-react";
import {
  SlideOver,
  SlideOverBody,
  SlideOverFooter,
} from "@/components/ui/slide-over";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRecentEvents } from "@/lib/hooks/use-entity-events";

// ============================================================================
// EVENT TYPE → ICON + COLOR mapping
// ============================================================================

const EVENT_DISPLAY: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  contract_signed: { icon: "📝", color: "text-blue-600", label: "Контракт" },
  payment_made: { icon: "💰", color: "text-green-600", label: "Оплата" },
  received_at_warehouse: {
    icon: "📦",
    color: "text-purple-600",
    label: "Приход на склад",
  },
  quality_checked: {
    icon: "✅",
    color: "text-green-600",
    label: "Проверка качества",
  },
  configured: { icon: "⚙️", color: "text-gray-600", label: "Настройка" },
  issued_from_warehouse: {
    icon: "📤",
    color: "text-orange-600",
    label: "Выдача со склада",
  },
  loaded_to_bunker: {
    icon: "⬇️",
    color: "text-blue-600",
    label: "Загрузка бункера",
  },
  bunker_mixed: { icon: "🔄", color: "text-yellow-600", label: "Смешение" },
  installed_in_machine: {
    icon: "🔧",
    color: "text-blue-600",
    label: "Установка",
  },
  removed_from_machine: { icon: "↩️", color: "text-gray-600", label: "Снятие" },
  sold: { icon: "☕", color: "text-green-600", label: "Продажа" },
  encashment: { icon: "💵", color: "text-green-700", label: "Инкассация" },
  refilled: { icon: "🔋", color: "text-blue-500", label: "Дозаправка" },
  cleaning_daily: {
    icon: "🧹",
    color: "text-cyan-600",
    label: "Ежедневная чистка",
  },
  cleaning_deep: {
    icon: "🧽",
    color: "text-cyan-700",
    label: "Глубокая чистка",
  },
  cleaning_full: { icon: "✨", color: "text-cyan-800", label: "Полная чистка" },
  flush_cycle: { icon: "💧", color: "text-blue-400", label: "Промывка" },
  maintenance_scheduled: {
    icon: "📅",
    color: "text-orange-500",
    label: "Плановое ТО",
  },
  maintenance_unscheduled: {
    icon: "🚨",
    color: "text-red-600",
    label: "Внеплановый ремонт",
  },
  spare_part_replaced: {
    icon: "🔩",
    color: "text-gray-600",
    label: "Замена запчасти",
  },
  relocated: { icon: "🚚", color: "text-purple-600", label: "Перемещение" },
  deactivated: { icon: "⏸️", color: "text-gray-500", label: "Деактивация" },
  reactivated: { icon: "▶️", color: "text-green-500", label: "Реактивация" },
  written_off: { icon: "❌", color: "text-red-700", label: "Списание" },
  transferred_to_operator: {
    icon: "👤",
    color: "text-blue-500",
    label: "Передача оператору",
  },
  returned_from_operator: {
    icon: "↩️",
    color: "text-blue-400",
    label: "Возврат от оператора",
  },
  inventory_check: {
    icon: "📋",
    color: "text-yellow-600",
    label: "Инвентаризация",
  },
};

function getEventDisplay(eventType: string) {
  return (
    EVENT_DISPLAY[eventType] || {
      icon: "📌",
      color: "text-gray-500",
      label: eventType,
    }
  );
}

// ============================================================================
// ENTITY TYPE → ICON mapping
// ============================================================================

const ENTITY_ICONS: Record<string, React.ElementType> = {
  machine: Wrench,
  container: Package,
  ingredient_batch: Package,
  equipment_component: Wrench,
  product: Package,
};

// ============================================================================
// EntityPassport Component
// ============================================================================

interface EntityPassportProps {
  open: boolean;
  onClose: () => void;
  entityId: string;
  entityType: string;
  /** Code shown in header (e.g., KIUT-01, BNK-2025-00001) */
  code?: string;
  /** Display name */
  name?: string;
  /** Status badge text */
  status?: string;
  /** Key-value metrics to display below header */
  metrics?: { label: string; value: string }[];
  /** URL for "Open full card" button */
  fullCardUrl?: string;
}

export function EntityPassport({
  open,
  onClose,
  entityId,
  entityType,
  code,
  name,
  status,
  metrics,
  fullCardUrl,
}: EntityPassportProps) {
  const { data: events, isLoading } = useRecentEvents(open ? entityId : "", 10);

  const _Icon = ENTITY_ICONS[entityType] || Package;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={code || "Сущность"}
      subtitle={name}
      width="w-[440px]"
    >
      <SlideOverBody>
        {/* Status Badge */}
        {status && (
          <div className="mb-4">
            <Badge variant="outline" className="text-xs">
              {status}
            </Badge>
          </div>
        )}

        {/* Key Metrics */}
        {metrics && metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-sm font-medium mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>
        )}

        <Separator className="my-4" />

        {/* Recent Events Timeline */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Последние события
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !events || events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Нет событий
            </p>
          ) : (
            <div className="space-y-1">
              {events.map((event: any) => {
                const display = getEventDisplay(event.eventType);
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-base mt-0.5 shrink-0">
                      {display.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${display.color}`}>
                        {display.label}
                      </p>
                      {event.notes && (
                        <p className="text-xs text-muted-foreground truncate">
                          {event.notes}
                        </p>
                      )}
                      {event.quantity && (
                        <p className="text-xs text-muted-foreground">
                          Кол-во: {event.quantity}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(event.eventDate), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SlideOverBody>

      {fullCardUrl && (
        <SlideOverFooter>
          <Button asChild className="w-full">
            <a href={fullCardUrl}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Открыть полную карточку
            </a>
          </Button>
        </SlideOverFooter>
      )}
    </SlideOver>
  );
}

// ============================================================================
// EntityPassportLink — clickable inline link that opens EntityPassport
// ============================================================================

interface EntityPassportLinkProps {
  entityId: string;
  entityType: string;
  code?: string;
  name?: string;
  status?: string;
  metrics?: { label: string; value: string }[];
  fullCardUrl?: string;
  children: React.ReactNode;
  className?: string;
}

export function EntityPassportLink({
  entityId,
  entityType,
  code,
  name,
  status,
  metrics,
  fullCardUrl,
  children,
  className,
}: EntityPassportLinkProps) {
  const [open, setOpen] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ||
          "text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
        }
      >
        {children}
      </button>
      <EntityPassport
        open={open}
        onClose={() => setOpen(false)}
        entityId={entityId}
        entityType={entityType}
        code={code}
        name={name}
        status={status}
        metrics={metrics}
        fullCardUrl={fullCardUrl}
      />
    </>
  );
}
