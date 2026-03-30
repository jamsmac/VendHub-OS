"use client";

import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy, Grid3X3 } from "lucide-react";
import type { MachineWizardValues } from "@/app/dashboard/machines/new/_components/wizard-schema";

interface StepSlotsProps {
  form: UseFormReturn<MachineWizardValues>;
}

/**
 * Auto-generate slot positions based on count.
 * Pattern: A1, A2, ..., A9, B1, B2, ... etc.
 */
function generatePositions(count: number): string[] {
  const positions: string[] = [];
  for (let i = 0; i < count; i++) {
    const row = String.fromCharCode(65 + Math.floor(i / 9)); // A, B, C...
    const col = (i % 9) + 1;
    positions.push(`${row}${col}`);
  }
  return positions;
}

export function StepSlots({ form }: StepSlotsProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "slots",
  });

  const slotCount = form.watch("slotCount") || 0;

  const handleAutoGenerate = () => {
    // Clear existing
    while (fields.length > 0) {
      remove(0);
    }
    // Generate new slots
    const positions = generatePositions(slotCount);
    positions.forEach((pos) => {
      append({
        position: pos,
        productName: "",
        price: 0,
        maxQuantity: 10,
      });
    });
  };

  const handleAddSlot = () => {
    const nextIndex = fields.length;
    const pos = generatePositions(nextIndex + 1)[nextIndex] || `S${nextIndex + 1}`;
    append({
      position: pos,
      productName: "",
      price: 0,
      maxQuantity: 10,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">Настройка ячеек</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Определите позиции ячеек. Продукты и цены можно назначить позже.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAutoGenerate}
          className="gap-2"
        >
          <Grid3X3 className="w-4 h-4" />
          Авто ({slotCount} шт.)
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 flex flex-col items-center justify-center h-[200px] gap-3">
          <Grid3X3 className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Нажмите «Авто» чтобы создать {slotCount} ячеек автоматически
          </p>
          <p className="text-xs text-muted-foreground/60">
            Или добавляйте по одной вручную
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSlot}
          >
            <Plus className="w-4 h-4 mr-1" /> Добавить вручную
          </Button>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[80px_1fr_120px_120px_40px] gap-3 px-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Позиция</span>
            <span>Продукт (опционально)</span>
            <span>Цена (UZS)</span>
            <span>Макс. кол-во</span>
            <span />
          </div>

          {/* Slot rows */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[80px_1fr_120px_120px_40px] gap-3 items-start"
              >
                <FormField
                  control={form.control}
                  name={`slots.${index}.position`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...f}
                          className="font-mono text-center"
                          placeholder="A1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`slots.${index}.productName`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...f} placeholder="Название продукта" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`slots.${index}.price`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...f}
                          onChange={(e) =>
                            f.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`slots.${index}.maxQuantity`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={999}
                          {...f}
                          onChange={(e) =>
                            f.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSlot}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Добавить ячейку
          </Button>
        </>
      )}
    </div>
  );
}
