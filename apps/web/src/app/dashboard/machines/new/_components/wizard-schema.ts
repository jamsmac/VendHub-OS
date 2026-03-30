import { z } from "zod";

/**
 * Machine Quick Create — минималистичная схема.
 *
 * Философия: "Create Fast, Enrich Later"
 * - Шаг 1: Тип + серийный номер → номер автомата генерируется авто
 * - Шаг 2: → Готово! Переход на карточку для дополнения
 *
 * Всё остальное (паспорт, локация, ячейки, компоненты) заполняется
 * на детальной странице /machines/[id] — там уже есть табы для этого.
 */

export const MACHINE_TYPES = [
  { value: "coffee", label: "Кофейный", prefix: "CF", icon: "☕" },
  { value: "snack", label: "Снэковый", prefix: "SN", icon: "🍫" },
  { value: "drink", label: "Напитки", prefix: "DR", icon: "🥤" },
  { value: "combo", label: "Комбо", prefix: "CB", icon: "🍱" },
  { value: "fresh", label: "Фреш", prefix: "FR", icon: "🥗" },
  { value: "ice_cream", label: "Мороженое", prefix: "IC", icon: "🍦" },
  { value: "water", label: "Вода", prefix: "WA", icon: "💧" },
] as const;

export type MachineTypeValue = (typeof MACHINE_TYPES)[number]["value"];

const machineTypeValues = MACHINE_TYPES.map(
  (mt) => mt.value,
) as unknown as readonly [string, ...string[]];

export const machineCreateSchema = z.object({
  // Required — minimum to create
  type: z.enum(machineTypeValues, {
    required_error: "Выберите тип автомата",
  }),
  serialNumber: z.string().max(100).optional().or(z.literal("")),
  machineNumber: z
    .string()
    .min(1, "Номер автомата обязателен")
    .max(50, "Макс. 50 символов"),

  // Optional — nice to have at creation
  name: z.string().max(255).optional().or(z.literal("")),
  slotCount: z.coerce
    .number()
    .int()
    .min(1, "Минимум 1")
    .max(100, "Максимум 100")
    .default(12),
  manufacturer: z.string().max(100).optional().or(z.literal("")),
  model: z.string().max(100).optional().or(z.literal("")),
});

export type MachineCreateValues = z.infer<typeof machineCreateSchema>;

export const CREATE_DEFAULTS: MachineCreateValues = {
  type: "coffee",
  serialNumber: "",
  machineNumber: "", // Will be auto-generated
  name: "",
  slotCount: 12,
  manufacturer: "",
  model: "",
};

/**
 * Generate machine number from type prefix + counter.
 *
 * Pattern: {PREFIX}-{NNN}
 * Example: CF-001, SN-042, DR-007
 *
 * @param type - Machine type (coffee, snack, etc.)
 * @param existingCount - How many machines of this type already exist
 */
export function generateMachineNumber(
  type: MachineTypeValue,
  existingCount: number,
): string {
  const typeDef = MACHINE_TYPES.find((t) => t.value === type);
  const prefix = typeDef?.prefix || "VH";
  const number = String(existingCount + 1).padStart(3, "0");
  return `${prefix}-${number}`;
}

/**
 * Extended machine form values — used by enrichment forms
 * (MachinePassportForm, MachineLocationForm, MachineSlotsForm, etc.)
 * These forms live on the detail page and the optional "advanced create" flow.
 */
const slotSchema = z.object({
  position: z.string().min(1, "Позиция обязательна").max(10),
  productName: z.string().max(255).optional().or(z.literal("")),
  price: z.number().min(0).default(0),
  maxQuantity: z.number().int().min(1).max(999).default(10),
});

export const machineEnrichSchema = machineCreateSchema.extend({
  yearOfManufacture: z.coerce.number().int().min(2000).max(2030).optional(),
  purchaseDate: z.string().optional().or(z.literal("")),
  purchasePrice: z.coerce.number().min(0).optional(),
  depreciationMethod: z
    .enum(["linear", "accelerated", "units_of_production"] as const)
    .optional(),
  depreciationYears: z.coerce.number().int().min(1).max(20).optional(),
  firmwareVersion: z.string().max(50).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  slots: z.array(slotSchema).optional().default([]),
});

/** Full form type used by enrichment/edit components */
export type MachineWizardValues = z.infer<typeof machineEnrichSchema>;

export const STEP_FIELDS: Record<number, (keyof MachineWizardValues)[]> = {
  0: ["machineNumber", "type", "slotCount"],
  1: [],
  2: [],
  3: [],
  4: [],
};
