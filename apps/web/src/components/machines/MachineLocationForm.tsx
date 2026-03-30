"use client";

import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { MapPin, Navigation } from "lucide-react";
import type { MachineWizardValues } from "@/app/dashboard/machines/new/_components/wizard-schema";

interface StepLocationProps {
  form: UseFormReturn<MachineWizardValues>;
}

export function StepLocation({ form }: StepLocationProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Место установки</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Укажите адрес точки. Можно пропустить и назначить позже через
          «Перемещение».
        </p>
      </div>

      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Адрес
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="г. Ташкент, Чиланзарский район, ул. Бунёдкор, 1 — ТЦ Mega Planet, 1 этаж"
                rows={2}
                {...field}
              />
            </FormControl>
            <FormDescription>
              Полный адрес точки установки
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="latitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Широта
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="41.311081"
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
        <FormField
          control={form.control}
          name="longitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Долгота
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="69.279737"
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

      {/* Map placeholder — будет заменён на Yandex Maps */}
      <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 flex flex-col items-center justify-center h-[240px] gap-3">
        <MapPin className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Карта будет доступна после интеграции Yandex Maps
        </p>
        <p className="text-xs text-muted-foreground/60">
          Пока укажите координаты вручную или скопируйте из Google Maps
        </p>
      </div>
    </div>
  );
}
