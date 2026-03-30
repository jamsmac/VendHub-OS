"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { equipmentApi, machinesApi } from "@/lib/api";

/**
 * Must match EquipmentComponentType enum in backend entity
 * @see apps/api/src/modules/equipment/entities/equipment-component.entity.ts
 */
const COMPONENT_TYPES = [
  "hopper",
  "grinder",
  "brew_unit",
  "mixer",
  "pump",
  "heater",
  "dispenser",
  "compressor",
  "board",
  "motor",
  "valve",
  "sensor",
  "filter",
  "tank",
  "conveyor",
  "display",
  "card_reader",
  "other",
] as const;

/**
 * Must match EquipmentComponentStatus enum in backend entity
 * @see apps/api/src/modules/equipment/entities/equipment-component.entity.ts
 */
const COMPONENT_STATUSES = [
  "new",
  "installed",
  "in_use",
  "needs_maintenance",
  "in_repair",
  "repaired",
  "decommissioned",
  "disposed",
] as const;

const COMPONENT_TYPE_LABELS: Record<string, string> = {
  hopper: "Бункер",
  grinder: "Кофемолка",
  brew_unit: "Заварочный блок",
  mixer: "Миксер",
  pump: "Помпа",
  heater: "Нагреватель",
  dispenser: "Диспенсер",
  compressor: "Компрессор",
  board: "Плата",
  motor: "Мотор",
  valve: "Клапан",
  sensor: "Датчик",
  filter: "Фильтр",
  tank: "Бак",
  conveyor: "Конвейер",
  display: "Дисплей",
  card_reader: "Картридер",
  other: "Другое",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  installed: "Установлен",
  in_use: "В эксплуатации",
  needs_maintenance: "Требует обслуживания",
  in_repair: "В ремонте",
  repaired: "Отремонтирован",
  decommissioned: "Списан",
  disposed: "Утилизирован",
};

/**
 * Zod schema aligned with CreateEquipmentComponentDto
 * Required: name, componentType
 * Optional: componentStatus, serialNumber, machineId, notes, purchasePrice
 */
const componentSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(200),
  componentType: z.enum(COMPONENT_TYPES),
  componentStatus: z.enum(COMPONENT_STATUSES).default("new"),
  serialNumber: z.string().max(100).optional().or(z.literal("")),
  machineId: z.string().optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  notes: z.string().optional().or(z.literal("")),
});

type ComponentFormValues = z.infer<typeof componentSchema>;

export default function NewComponentPage() {
  const t = useTranslations("equipment");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const { data: machines } = useQuery({
    queryKey: ["machines-list"],
    queryFn: () => machinesApi.getAll().then((res) => res.data?.data || []),
  });

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: "",
      componentType: "other",
      componentStatus: "new",
      serialNumber: "",
      machineId: "__none__",
      purchasePrice: undefined,
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ComponentFormValues) => {
      const payload = {
        ...data,
        machineId: data.machineId === "__none__" ? undefined : data.machineId,
        serialNumber: data.serialNumber || undefined,
        notes: data.notes || undefined,
      };
      return equipmentApi.create(payload);
    },
    onSuccess: () => {
      toast.success(t("addComponent") + " ✓");
      router.push("/dashboard/equipment");
    },
    onError: () => toast.error(tCommon("error")),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/equipment">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("addComponent")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("tabComponents")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("colName")} *</FormLabel>
                      <FormControl>
                        <Input placeholder="Название компонента" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="componentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип компонента *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COMPONENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {COMPONENT_TYPE_LABELS[type] ?? type}
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
                  name="componentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("colStatus")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COMPONENT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABELS[s] ?? s}
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
                        <Input placeholder="SN-000001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="machineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("colMachine")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="— Не привязан —" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">— Не привязан —</SelectItem>
                          {(machines as Array<{ id: string; name: string }> || []).map(
                            (m: { id: string; name: string }) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Цена (UZS)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={100}
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Заметки</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Дополнительная информация о компоненте..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {mutation.isPending ? "Сохранение..." : tCommon("save")}
                </Button>
                <Link href="/dashboard/equipment">
                  <Button type="button" variant="outline">
                    {tCommon("cancel")}
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
