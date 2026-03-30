"use client";

import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import type { MachineWizardValues } from "@/app/dashboard/machines/new/_components/wizard-schema";

const MACHINE_TYPES = [
  { value: "coffee", label: "Кофейный", description: "Горячие напитки" },
  { value: "snack", label: "Снэковый", description: "Снэки и закуски" },
  { value: "drink", label: "Напитки", description: "Холодные напитки" },
  { value: "combo", label: "Комбо", description: "Напитки + снэки" },
  { value: "fresh", label: "Фреш", description: "Свежие продукты" },
  { value: "ice_cream", label: "Мороженое", description: "Мороженое" },
  { value: "water", label: "Вода", description: "Питьевая вода" },
] as const;

interface StepBasicInfoProps {
  form: UseFormReturn<MachineWizardValues>;
}

export function StepBasicInfo({ form }: StepBasicInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Основная информация</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Укажите базовые данные автомата — номер, название и тип.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="machineNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Номер автомата *</FormLabel>
              <FormControl>
                <Input placeholder="VH-001" {...field} />
              </FormControl>
              <FormDescription>
                Уникальный номер в вашей организации
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название</FormLabel>
              <FormControl>
                <Input placeholder="Кофе у метро Чиланзар" {...field} />
              </FormControl>
              <FormDescription>
                Понятное название для быстрого поиска
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Тип автомата *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MACHINE_TYPES.map((mt) => (
                    <SelectItem key={mt.value} value={mt.value}>
                      <span className="font-medium">{mt.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        — {mt.description}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="serialNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Серийный номер</FormLabel>
              <FormControl>
                <Input placeholder="CF-2024-00158" {...field} />
              </FormControl>
              <FormDescription>
                С шильдика производителя
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="slotCount"
        render={({ field }) => (
          <FormItem className="max-w-[200px]">
            <FormLabel>Количество ячеек *</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                max={100}
                {...field}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </FormControl>
            <FormDescription>
              Сколько позиций для продуктов
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
