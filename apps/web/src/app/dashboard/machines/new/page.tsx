"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { api, machineTemplatesApi } from "@/lib/api";

import {
  machineCreateSchema,
  CREATE_DEFAULTS,
  MACHINE_TYPES,
  generateMachineNumber,
  type MachineCreateValues,
  type MachineTypeValue,
} from "./_components/wizard-schema";

// ─── Template types ─────────────────────────────────────────────────────────

interface MachineTemplateItem {
  id: string;
  name: string;
  type: string;
  contentModel: string;
  manufacturer?: string;
  model?: string;
  maxProductSlots: number;
  defaultContainers: { slotNumber: number; name: string }[];
  defaultSlots: { slotNumber: string }[];
  defaultComponents: { name: string }[];
  isSystem: boolean;
}

const CONTENT_MODEL_SHORT: Record<string, string> = {
  containers: "бункеры",
  slots: "ячейки",
  mixed: "смешанный",
};

/**
 * Derive contentModel from machine type.
 * coffee/water use bunkers (grams/ml), combo uses both, rest use slots (pieces).
 */
const TYPE_TO_CONTENT_MODEL: Record<string, string> = {
  coffee: "containers",
  water: "containers",
  combo: "mixed",
  snack: "slots",
  drink: "slots",
  fresh: "slots",
  ice_cream: "slots",
};

/* ─── Clean payload for API ───
 * CreateMachineDto (backend) expects:
 *   REQUIRED: name, code, serialNumber
 *   OPTIONAL: type, status, manufacturer, model, yearManufactured, slotCount,
 *             locationId, assignedOperatorId, settings, paymentMethods, isActive
 *
 * Frontend field mapping:
 *   machineNumber → code (unique machine identifier)
 *   name → name (human-readable label)
 */
function toApiPayload(data: MachineCreateValues) {
  const clean = (val: string | undefined): string | undefined =>
    val && val.trim() !== "" ? val.trim() : undefined;

  // Build payload with ONLY fields that CreateMachineDto accepts
  const payload: Record<string, unknown> = {
    code: data.machineNumber,               // machineNumber → code (required)
    name: data.name?.trim() || data.machineNumber, // fallback to code if empty
    serialNumber: clean(data.serialNumber) || data.machineNumber, // fallback
    type: data.type,
    slotCount: data.slotCount,
    contentModel: TYPE_TO_CONTENT_MODEL[data.type] || "slots",
  };

  // Optional fields — only include if non-empty
  const manufacturer = clean(data.manufacturer);
  if (manufacturer) payload.manufacturer = manufacturer;

  const model = clean(data.model);
  if (model) payload.model = model;

  return payload;
}

export default function NewMachinePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<MachineCreateValues>({
    resolver: zodResolver(machineCreateSchema),
    defaultValues: CREATE_DEFAULTS,
    mode: "onTouched",
  });

  const selectedType = form.watch("type");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  // Fetch active templates for template selection
  const { data: allTemplates = [] } = useQuery<MachineTemplateItem[]>({
    queryKey: ["machine-templates", "active"],
    queryFn: () =>
      machineTemplatesApi.getActive().then((res) => res.data?.data ?? res.data),
    staleTime: 60_000,
  });

  // Filter templates by selected type
  const typeTemplates = allTemplates.filter((t) => t.type === selectedType);

  // Reset selected template when type changes
  useEffect(() => {
    setSelectedTemplateId(null);
  }, [selectedType]);

  // Fetch machine stats for auto-numbering.
  // If API is unavailable (not logged in, network error) — gracefully fallback to 0.
  const { data: statsData } = useQuery({
    queryKey: ["machines", "stats"],
    queryFn: () => api.get("/machines/stats"),
    retry: false,
    staleTime: 30_000,
  });

  // Auto-generate machine number when type changes
  useEffect(() => {
    // Graceful extraction — API may return { total } or { data: { total } } or fail entirely
    const raw = statsData?.data;
    const total: number =
      typeof raw?.total === "number"
        ? raw.total
        : typeof raw?.data?.total === "number"
          ? raw.data.total
          : 0;

    const autoNumber = generateMachineNumber(
      selectedType as MachineTypeValue,
      total,
    );
    const currentNumber = form.getValues("machineNumber");
    // Only auto-fill if empty or was previously auto-generated (starts with a known prefix)
    if (
      !currentNumber ||
      MACHINE_TYPES.some((t) => currentNumber.startsWith(t.prefix + "-"))
    ) {
      form.setValue("machineNumber", autoNumber);
    }
  }, [selectedType, statsData, form]);

  // Create machine mutation — either from template or directly
  const createMachine = useMutation({
    mutationFn: (data: MachineCreateValues) => {
      if (selectedTemplateId) {
        // Create via template — auto-provisions containers/slots/components
        return machineTemplatesApi.createMachineFromTemplate({
          templateId: selectedTemplateId,
          machineNumber: data.machineNumber,
          name: data.name?.trim() || data.machineNumber,
          serialNumber:
            data.serialNumber?.trim() || data.machineNumber,
          purchasePrice: undefined,
          locationId: undefined,
        });
      }
      // Standard creation — bare machine
      return api.post("/machines", toApiPayload(data));
    },
    onSuccess: (response) => {
      const d = response?.data ?? response;
      const machineId = d?.id ?? d?.data?.id;
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast.success(
        selectedTemplateId
          ? "Автомат создан по шаблону! Бункеры, ячейки и компоненты настроены."
          : "Автомат создан! Переходим к настройке...",
      );
      router.push(
        machineId ? `/dashboard/machines/${machineId}` : "/dashboard/machines",
      );
    },
    onError: (error: unknown) => {
      const resp = (error as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data;
      const raw = resp?.message;
      const message = Array.isArray(raw)
        ? raw.join("; ")
        : typeof raw === "string"
          ? raw
          : "Не удалось создать автомат";
      toast.error(message);
    },
  });

  const onSubmit = (data: MachineCreateValues) => {
    createMachine.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/machines">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Новый автомат</h1>
          <p className="text-sm text-muted-foreground">
            Укажите тип — остальное можно дополнить потом
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* ─── Step 1: Choose Type ─── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Тип автомата</CardTitle>
              <CardDescription>
                От типа зависит префикс номера и совместимые продукты
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {MACHINE_TYPES.map((mt) => (
                          <button
                            key={mt.value}
                            type="button"
                            onClick={() => field.onChange(mt.value)}
                            className={`
                              relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3
                              transition-all duration-150 cursor-pointer text-center
                              ${
                                field.value === mt.value
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                              }
                            `}
                          >
                            <span className="text-2xl">{mt.icon}</span>
                            <span className="text-sm font-medium">
                              {mt.label}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {mt.prefix}
                            </Badge>
                            {field.value === mt.value && (
                              <div className="absolute top-1.5 right-1.5">
                                <Check className="w-4 h-4 text-primary" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ─── Step 1.5: Template Selection (optional) ─── */}
          {typeTemplates.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Шаблон{" "}
                  <Badge variant="outline" className="ml-1 text-[10px] font-normal">
                    необязательно
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Выберите шаблон — бункеры, ячейки и компоненты будут созданы
                  автоматически
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* "No template" option */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateId(null)}
                    className={`
                      relative flex flex-col items-start gap-1 rounded-lg border-2 p-3
                      transition-all duration-150 cursor-pointer text-left
                      ${
                        selectedTemplateId === null
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                      }
                    `}
                  >
                    <span className="text-sm font-medium">Без шаблона</span>
                    <span className="text-xs text-muted-foreground">
                      Пустой автомат — настроите вручную
                    </span>
                    {selectedTemplateId === null && (
                      <div className="absolute top-1.5 right-1.5">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </button>
                  {/* Template options */}
                  {typeTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`
                        relative flex flex-col items-start gap-1 rounded-lg border-2 p-3
                        transition-all duration-150 cursor-pointer text-left
                        ${
                          selectedTemplateId === tpl.id
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                        }
                      `}
                    >
                      <span className="text-sm font-medium">{tpl.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[
                          CONTENT_MODEL_SHORT[tpl.contentModel],
                          tpl.defaultContainers?.length
                            ? `${tpl.defaultContainers.length} бунк.`
                            : null,
                          tpl.defaultSlots?.length
                            ? `${tpl.defaultSlots.length} яч.`
                            : null,
                          tpl.defaultComponents?.length
                            ? `${tpl.defaultComponents.length} комп.`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {tpl.manufacturer && (
                        <span className="text-[10px] text-muted-foreground">
                          {tpl.manufacturer} {tpl.model ?? ""}
                        </span>
                      )}
                      {selectedTemplateId === tpl.id && (
                        <div className="absolute top-1.5 right-1.5">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Step 2: Key Details ─── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Данные автомата</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="machineNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Номер автомата *
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 font-normal"
                        >
                          <Sparkles className="w-3 h-3" /> авто
                        </Badge>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="CF-001"
                          className="font-mono"
                        />
                      </FormControl>
                      <FormDescription>
                        Сгенерирован автоматически — можно изменить
                      </FormDescription>
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
                        <Input
                          {...field}
                          placeholder="С шильдика производителя"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название (необязательно)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Кофе у метро Чиланзар, ТЦ Mega Planet"
                      />
                    </FormControl>
                    <FormDescription>
                      Понятное название для быстрого поиска в списке
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Производитель</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Necta" />
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
                        <Input {...field} placeholder="Krea Touch" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slotCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Кол-во ячеек</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ─── Info banner ─── */}
          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              {selectedTemplateId ? (
                <p>
                  По шаблону автоматически создадутся{" "}
                  <strong>бункеры</strong>, <strong>ячейки</strong> и{" "}
                  <strong>компоненты</strong>. После создания можно дополнить
                  паспорт и назначить локацию.
                </p>
              ) : (
                <p>
                  После создания автомат откроется для настройки — там можно
                  заполнить <strong>паспорт</strong>, назначить{" "}
                  <strong>локацию</strong>, настроить <strong>ячейки</strong> и{" "}
                  <strong>компоненты</strong>.
                </p>
              )}
            </div>
          </div>

          {/* ─── Actions ─── */}
          <div className="flex justify-between">
            <Link href="/dashboard/machines">
              <Button variant="ghost">Отмена</Button>
            </Link>
            <Button
              type="submit"
              disabled={createMachine.isPending}
              className="gap-2 min-w-[180px]"
            >
              {createMachine.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Создать и настроить
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
