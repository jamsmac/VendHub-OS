"use client";

import { UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Coffee,
  MapPin,
  Package,
  Receipt,
  Grid3X3,
  AlertCircle,
} from "lucide-react";
import type { MachineWizardValues } from "@/app/dashboard/machines/new/_components/wizard-schema";

interface StepReviewProps {
  form: UseFormReturn<MachineWizardValues>;
}

const TYPE_LABELS: Record<string, string> = {
  coffee: "Кофейный",
  snack: "Снэковый",
  drink: "Напитки",
  combo: "Комбо",
  fresh: "Фреш",
  ice_cream: "Мороженое",
  water: "Вода",
};

const DEPRECIATION_LABELS: Record<string, string> = {
  linear: "Линейный",
  accelerated: "Ускоренный",
  units_of_production: "По выработке",
};

function formatPrice(value: number | undefined): string {
  if (!value) return "—";
  return new Intl.NumberFormat("ru-RU").format(value) + " UZS";
}

function ReviewSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 pl-6">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </>
  );
}

export function StepReview({ form }: StepReviewProps) {
  const values = form.getValues();
  const filledSlots = values.slots?.filter((s) => s.productName) || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Проверка данных</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Проверьте всё перед созданием. Вы можете вернуться к любому шагу.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-5">
        <ReviewSection icon={Coffee} title="Основное">
          <ReviewRow label="Номер" value={values.machineNumber} />
          <ReviewRow label="Название" value={values.name} />
          <ReviewRow
            label="Тип"
            value={
              <Badge variant="secondary">
                {TYPE_LABELS[values.type] || values.type}
              </Badge>
            }
          />
          <ReviewRow label="Серийный номер" value={values.serialNumber} />
          <ReviewRow label="Ячеек" value={values.slotCount} />
        </ReviewSection>

        <Separator />

        <ReviewSection icon={Receipt} title="Паспорт">
          <ReviewRow label="Производитель" value={values.manufacturer} />
          <ReviewRow label="Модель" value={values.model} />
          <ReviewRow label="Год выпуска" value={values.yearOfManufacture} />
          <ReviewRow label="Дата покупки" value={values.purchaseDate} />
          <ReviewRow
            label="Цена покупки"
            value={formatPrice(values.purchasePrice)}
          />
          <ReviewRow
            label="Амортизация"
            value={
              values.depreciationMethod
                ? DEPRECIATION_LABELS[values.depreciationMethod]
                : undefined
            }
          />
          <ReviewRow
            label="Срок (лет)"
            value={values.depreciationYears}
          />
          <ReviewRow label="Прошивка" value={values.firmwareVersion} />
        </ReviewSection>

        <Separator />

        <ReviewSection icon={MapPin} title="Локация">
          <ReviewRow
            label="Адрес"
            value={values.address || "Не указан (назначить позже)"}
          />
          <ReviewRow
            label="Координаты"
            value={
              values.latitude && values.longitude
                ? `${values.latitude}, ${values.longitude}`
                : "—"
            }
          />
        </ReviewSection>

        <Separator />

        <ReviewSection icon={Grid3X3} title="Ячейки">
          <ReviewRow
            label="Создано ячеек"
            value={
              values.slots?.length ? (
                <Badge variant="secondary">{values.slots.length} шт.</Badge>
              ) : (
                "Не настроены (добавить позже)"
              )
            }
          />
          <ReviewRow
            label="С продуктами"
            value={
              filledSlots.length > 0
                ? `${filledSlots.length} из ${values.slots?.length || 0}`
                : "—"
            }
          />
        </ReviewSection>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30 p-4">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-200">
            Автомат будет создан со статусом «Неактивен»
          </p>
          <p className="text-blue-700 dark:text-blue-300 mt-1">
            Чтобы активировать, перейдите на страницу автомата и измените статус
            на «Активен». Перед этим рекомендуется заполнить ячейки продуктами и
            назначить оператора.
          </p>
        </div>
      </div>
    </div>
  );
}
