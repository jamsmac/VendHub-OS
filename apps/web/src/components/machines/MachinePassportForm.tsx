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
import { Separator } from "@/components/ui/separator";
import type { MachineWizardValues } from "@/app/dashboard/machines/new/_components/wizard-schema";

const DEPRECIATION_METHODS = [
  { value: "linear", label: "Линейный", description: "Равномерное списание" },
  { value: "accelerated", label: "Ускоренный", description: "Больше в начале" },
  {
    value: "units_of_production",
    label: "По выработке",
    description: "По количеству продаж",
  },
] as const;

interface StepPassportProps {
  form: UseFormReturn<MachineWizardValues>;
}

export function StepPassport({ form }: StepPassportProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Паспорт автомата</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Данные производителя и учётные параметры. Можно заполнить позже.
        </p>
      </div>

      {/* Manufacturer section */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Производитель
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="manufacturer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Производитель</FormLabel>
                <FormControl>
                  <Input placeholder="Necta" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Модель</FormLabel>
                <FormControl>
                  <Input placeholder="Krea Touch" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="yearOfManufacture"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Год выпуска</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={2000}
                    max={2030}
                    placeholder="2024"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator />

      {/* Purchase section */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Данные покупки
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Дата покупки</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="purchasePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Цена покупки (UZS)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="25 000 000"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormDescription>
                  Для расчёта амортизации и ROI
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator />

      {/* Depreciation section */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Амортизация
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="depreciationMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Метод амортизации</FormLabel>
                <Select
                  value={field.value || ""}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите метод" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DEPRECIATION_METHODS.map((dm) => (
                      <SelectItem key={dm.value} value={dm.value}>
                        <span className="font-medium">{dm.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          — {dm.description}
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
            name="depreciationYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Срок амортизации (лет)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    placeholder="5"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <FormField
        control={form.control}
        name="firmwareVersion"
        render={({ field }) => (
          <FormItem className="max-w-[300px]">
            <FormLabel>Версия прошивки</FormLabel>
            <FormControl>
              <Input placeholder="v2.4.1" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
