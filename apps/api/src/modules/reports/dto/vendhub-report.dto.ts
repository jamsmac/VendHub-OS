/**
 * VendHub Report DTOs - Спецификация v11.0
 * Две структуры отчетов: A (По типам платежей) и B (Финансовая аналитика)
 */

import { IsEnum, IsDateString, IsOptional, IsArray, IsUUID, IsBoolean, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// ENUMS - Типы данных VendHub
// ============================================================================

/**
 * Типы платежей (order_resource)
 */
export enum PaymentResourceType {
  QR = 'QR',                    // Таможенный платеж (QR-оплата)
  CASH = 'CASH',                // Оплата наличными
  CREDIT = 'CREDIT',            // Оплата кредита
  VIP = 'VIP',                  // VIP-заказы
  TEST = 'TEST',                // testShipment
}

/**
 * Статус оплаты
 */
export enum PaymentStatusType {
  PAID = 'Оплачено',
  REFUNDED = 'Возвращен',
}

/**
 * Статус доставки (brew_status)
 */
export enum BrewStatusType {
  DELIVERED = 'Доставлен',
  DELIVERY_CONFIRMED = 'Доставка подтверждена',
  DELIVERY_FAILED = 'Сбой доставки',
  NOT_DELIVERED = 'Не доставлено',
}

/**
 * QR платежные системы
 */
export enum QRPaymentSystem {
  PAYME = 'Payme',
  CLICK = 'Click',
  UZUM = 'Uzum',
}

/**
 * Структура отчета
 */
export enum ReportStructure {
  A = 'A',                      // По типам платежей
  B = 'B',                      // Финансовая аналитика
  FULL = 'A+B',                 // Полная (обе структуры)
}

// ============================================================================
// INGREDIENT CONSTANTS
// ============================================================================

/**
 * Ингредиенты VendHub (14 наименований)
 */
export const VENDHUB_INGREDIENTS = {
  COFFEE_BEANS: { name: 'Кофе зерновой', nameUz: 'Kofe donasi', unit: 'г', pricePerUnit: 239 },
  DRY_MILK: { name: 'Сухое молоко', nameUz: 'Quruq sut', unit: 'г', pricePerUnit: 120 },
  SUGAR: { name: 'Сахар', nameUz: 'Shakar', unit: 'г', pricePerUnit: 15 },
  CHOCOLATE: { name: 'Шоколад', nameUz: 'Shokolad', unit: 'г', pricePerUnit: 178.2 },
  MACCOFFEE_3IN1: { name: 'MacCoffee 3в1', nameUz: 'MacCoffee 3in1', unit: 'г', pricePerUnit: 80 },
  BERRY_TEA: { name: 'Ягодный чай', nameUz: 'Rezavorli choy', unit: 'г', pricePerUnit: 144 },
  LEMON_TEA: { name: 'Лимонный чай', nameUz: 'Limonli choy', unit: 'г', pricePerUnit: 144 },
  MATCHA: { name: 'Матча', nameUz: 'Matcha', unit: 'г', pricePerUnit: 235.2 },
  SYRUP_VANILLA: { name: 'Сироп ваниль', nameUz: 'Vanil siropi', unit: 'мл', pricePerUnit: 75 },
  SYRUP_CARAMEL: { name: 'Сироп карамель', nameUz: 'Karamel siropi', unit: 'мл', pricePerUnit: 75 },
  SYRUP_COCONUT: { name: 'Сироп кокос', nameUz: 'Kokos siropi', unit: 'мл', pricePerUnit: 75 },
  WATER: { name: 'Вода', nameUz: 'Suv', unit: 'мл', pricePerUnit: 1.058 },
  ICE: { name: 'Лёд', nameUz: 'Muz', unit: 'г', pricePerUnit: 2 },
  CUP: { name: 'Стакан', nameUz: 'Stakan', unit: 'шт', pricePerUnit: 3800 },
} as const;

// ============================================================================
// REQUEST DTOs
// ============================================================================

/**
 * Запрос на генерацию VendHub отчета
 */
export class GenerateVendHubReportDto {
  @ApiProperty({ description: 'Дата начала периода' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ description: 'Дата окончания периода' })
  @IsDateString()
  dateTo: string;

  @ApiProperty({ enum: ReportStructure, description: 'Структура отчета' })
  @IsEnum(ReportStructure)
  structure: ReportStructure;

  @ApiPropertyOptional({ type: [String], description: 'ID автоматов (фильтр)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  machineIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'ID продуктов (фильтр)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'ID локаций (фильтр)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  locationIds?: string[];

  @ApiPropertyOptional({ description: 'Включить тестовые заказы' })
  @IsOptional()
  @IsBoolean()
  includeTestOrders?: boolean;

  @ApiPropertyOptional({ description: 'Язык отчета (ru/uz)' })
  @IsOptional()
  @IsString()
  language?: 'ru' | 'uz';
}

// ============================================================================
// RESPONSE DTOs - Структура A (По типам платежей)
// ============================================================================

/**
 * Сводка по типам платежей
 */
export interface PaymentTypeSummaryDto {
  paymentType: PaymentResourceType;
  orderCount: number;
  totalAmount: number;
  percentByCount: number;
  percentByAmount: number;
  averageCheck: number;
}

/**
 * Детализация QR-платежей
 */
export interface QRPaymentDetailDto {
  system: QRPaymentSystem;
  paymentCount: number;
  totalAmount: number;
  percentOfQR: number;
  averagePayment: number;
  successCount?: number;
  cancelledCount?: number;
  cancelledAmount?: number;
}

/**
 * Сводка Structure A
 */
export interface StructureASummaryDto {
  period: { from: Date; to: Date };
  byPaymentType: PaymentTypeSummaryDto[];
  totalPaid: {
    orderCount: number;
    totalAmount: number;
    averageCheck: number;
  };
  testOrderCount: number;
  qrDetails: QRPaymentDetailDto[];
}

/**
 * По месяцам (Structure A)
 */
export interface MonthlyPaymentTypeDto {
  month: string;           // "2025-01"
  monthName: string;       // "Январь 2025"
  cash: { count: number; amount: number };
  qr: { count: number; amount: number };
  vip: { count: number; amount: number };
  credit: { count: number; amount: number };
  total: { count: number; amount: number };
}

/**
 * По дням недели (Structure A) - 7 строк
 */
export interface WeekdayPaymentTypeDto {
  dayOfWeek: number;       // 0-6
  dayName: string;         // "Понедельник"
  cash: { count: number; amount: number };
  qr: { count: number; amount: number };
  vip: { count: number; amount: number };
  total: { count: number; amount: number };
}

/**
 * По автоматам (Structure A)
 */
export interface MachinePaymentTypeDto {
  machineId: string;
  machineCode: string;
  address: string;
  cash: { count: number; amount: number };
  qr: { count: number; amount: number };
  vip: { count: number; amount: number };
  credit: { count: number; amount: number };
  total: { count: number; amount: number };
  revenuePercent: number;
}

/**
 * По продуктам (Structure A)
 */
export interface ProductPaymentTypeDto {
  productId: string;
  productName: string;
  cash: { count: number; amount: number };
  qr: { count: number; amount: number };
  vip: { count: number; amount: number };
  total: { count: number; amount: number };
}

/**
 * Детальный отчет по месяцу (Нал_/QR_)
 */
export interface MonthlyDetailedDto {
  month: string;
  paymentType: PaymentResourceType;
  products: {
    productId: string;
    productName: string;
    orderCount: number;
    totalAmount: number;
    averageCheck: number;
    percentOfTotal: number;
  }[];
  machines: {
    machineId: string;
    machineCode: string;
    address: string;
    orderCount: number;
    totalAmount: number;
    averageCheck: number;
  }[];
  summary: {
    totalOrders: number;
    totalAmount: number;
    averageCheck: number;
  };
}

/**
 * Сверка QR
 */
export interface QRReconciliationDto {
  month: string;
  orderQR: { count: number; amount: number };
  payme: { count: number; amount: number };
  click: { count: number; amount: number };
  externalTotal: number;
  difference: number;
  differencePercent: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
}

/**
 * Кросс-анализ (TOP-5 × TOP-5)
 */
export interface CrossAnalysisDto {
  topProducts: string[];
  topMachines: string[];
  matrix: number[][];      // [product][machine] = orderCount
  hourlyAnalysis: {
    hour: number;
    orderCount: number;
    totalAmount: number;
    averageCheck: number;
  }[];
}

// ============================================================================
// RESPONSE DTOs - Структура B (Финансовая аналитика)
// ============================================================================

/**
 * Сводка Structure B
 */
export interface StructureBSummaryDto {
  period: { from: Date; to: Date; dayCount: number };
  orders: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  finance: {
    totalRevenue: number;
    costOfGoods: number;      // Себестоимость (кофейные)
    grossProfit: number;
    marginPercent: number;
    averageCheck: number;
    ordersPerDay: number;
  };
  byPaymentType: {
    type: string;
    orderCount: number;
    totalAmount: number;
  }[];
}

/**
 * По месяцам (Structure B) - Финансовые показатели
 */
export interface MonthlyFinancialDto {
  month: string;
  monthName: string;
  dayCount: number;
  orderCount: number;
  successfulCount: number;
  failedCount: number;
  revenue: number;
  costOfGoods: number;
  profit: number;
  marginPercent: number;
  averageCheck: number;
  ordersPerDay: number;
}

/**
 * По дням (Structure B) - По ДАТАМ (много строк)
 */
export interface DailyFinancialDto {
  date: string;            // "2025-01-15"
  dayOfWeek: string;       // "Среда"
  orderCount: number;
  successfulCount: number;
  failedCount: number;
  revenue: number;
  costOfGoods: number;
  profit: number;
  marginPercent: number;
  averageCheck: number;
}

/**
 * По автоматам (Structure B)
 */
export interface MachineFinancialDto {
  machineId: string;
  machineCode: string;
  address: string;
  orderCount: number;
  successfulCount: number;
  failedCount: number;
  revenue: number;
  costOfGoods: number;
  profit: number;
  marginPercent: number;
  revenuePercent: number;
}

/**
 * По продуктам (Structure B) - С категорией и себестоимостью
 */
export interface ProductFinancialDto {
  productId: string;
  productName: string;
  category: string;
  orderCount: number;
  revenue: number;
  costPerUnit: number;
  costOfGoods: number;
  profit: number;
  marginPercent: number;
  revenuePercent: number;
}

/**
 * Расход ингредиентов - Сводка
 */
export interface IngredientConsumptionSummaryDto {
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  pricePerUnit: number;
  totalConsumption: number;
  packagesUsed: number;
  totalCost: number;
}

/**
 * Расход ингредиентов - По месяцам
 */
export interface IngredientConsumptionMonthlyDto {
  month: string;
  ingredients: Record<string, number>;  // ingredientCode -> consumption
  totalCost: number;
}

/**
 * Расход ингредиентов - По автоматам
 */
export interface IngredientConsumptionByMachineDto {
  machineId: string;
  machineCode: string;
  address: string;
  ingredients: Record<string, number>;
  totalCost: number;
}

/**
 * Сбои доставки
 */
export interface DeliveryFailureDto {
  date: string;
  time: string;
  machineId: string;
  machineCode: string;
  address: string;
  productName: string;
  flavor: string;
  price: number;
  paymentType: string;
  status: string;
}

/**
 * История цен
 */
export interface PriceHistoryDto {
  detectedAt: string;
  productName: string;
  flavor: string;
  oldPrice: number;
  newPrice: number;
  changeAmount: number;
  changePercent: number;
}

/**
 * Закупки
 */
export interface PurchaseRecordDto {
  date: string;
  ingredientName: string;
  supplier: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalAmount: number;
  notes?: string;
}

// ============================================================================
// FULL REPORT RESPONSE
// ============================================================================

/**
 * Полный отчет VendHub (Structure A)
 */
export interface VendHubReportStructureA {
  summary: StructureASummaryDto;
  byMonths: MonthlyPaymentTypeDto[];
  byWeekdays: WeekdayPaymentTypeDto[];
  byMachines: MachinePaymentTypeDto[];
  byProducts: ProductPaymentTypeDto[];

  // Наличные детализация
  cashSummary: {
    months: MonthlyDetailedDto[];
    products: ProductPaymentTypeDto[];
    machines: MachinePaymentTypeDto[];
  };

  // QR детализация
  qrSummary: {
    months: MonthlyDetailedDto[];
    products: ProductPaymentTypeDto[];
    machines: MachinePaymentTypeDto[];
    qrShare: MachinePaymentTypeDto[];  // Доля QR по автоматам
    payme: QRPaymentDetailDto[];
    click: QRPaymentDetailDto[];
  };

  // VIP и Кредит
  vipSummary: {
    total: PaymentTypeSummaryDto;
    details: any[];
    products: ProductPaymentTypeDto[];
  };
  creditSummary: {
    total: PaymentTypeSummaryDto;
    details: any[];
  };

  // Служебные
  qrReconciliation: QRReconciliationDto[];
  crossAnalysis: CrossAnalysisDto;
  dailyReport: any[];  // Ежедневно по датам (223 строки)
  averageCheck: any;
}

/**
 * Полный отчет VendHub (Structure B)
 */
export interface VendHubReportStructureB {
  summary: StructureBSummaryDto;
  byMonths: MonthlyFinancialDto[];
  byDays: DailyFinancialDto[];
  byMachines: MachineFinancialDto[];
  byProducts: ProductFinancialDto[];

  // Ингредиенты
  ingredients: {
    summary: IngredientConsumptionSummaryDto[];
    byMonths: IngredientConsumptionMonthlyDto[];
    byMachines: IngredientConsumptionByMachineDto[];
    byDays: Record<string, Record<string, number>>[];
  };

  // Дополнительные
  qrReconciliation: QRReconciliationDto[];
  deliveryFailures: DeliveryFailureDto[];
  priceHistory: PriceHistoryDto[];
  purchases: PurchaseRecordDto[];
}

/**
 * Полный объединенный отчет VendHub (Structure A+B)
 */
export interface VendHubFullReportDto {
  metadata: {
    reportId: string;
    generatedAt: Date;
    generationTimeMs: number;
    period: { from: Date; to: Date };
    structure: ReportStructure;
    language: 'ru' | 'uz';
    organizationId: string;
    filters: {
      machineIds?: string[];
      productIds?: string[];
      locationIds?: string[];
      includeTestOrders?: boolean;
    };
  };

  structureA?: VendHubReportStructureA;
  structureB?: VendHubReportStructureB;

  // Сводная аналитика (только в FULL)
  analytics?: {
    topProducts: { name: string; revenue: number; count: number }[];
    topMachines: { code: string; address: string; revenue: number }[];
    trends: {
      revenueGrowth: number;
      orderGrowth: number;
      marginTrend: number;
    };
    alerts: {
      type: 'low_stock' | 'high_failure_rate' | 'margin_decline' | 'qr_discrepancy';
      severity: 'info' | 'warning' | 'critical';
      message: string;
      data?: any;
    }[];
  };
}

// ============================================================================
// EXCEL SHEET DEFINITIONS
// ============================================================================

/**
 * Определения листов Excel для Structure A
 */
export const STRUCTURE_A_SHEETS = {
  // Общие (6)
  CONTENTS: 'Содержание',
  SUMMARY: 'Сводка',
  BY_MONTHS: 'По_месяцам',
  BY_DAYS: 'По_дням',               // По дням недели!
  BY_MACHINES: 'По_автоматам',
  BY_PRODUCTS: 'По_продуктам',

  // Наличные (12)
  CASH_SUMMARY: 'Наличные',
  CASH_MONTHS: 'Наличные_месяцы',
  CASH_PRODUCTS: 'Наличные_продукты',
  CASH_MACHINES: 'Наличные_автоматы',
  // + Нал_Май ... Нал_Декабрь (8 листов)

  // QR (16)
  QR_SUMMARY: 'QR_Сводка',
  QR_MONTHS: 'QR_месяцы',
  QR_PRODUCTS: 'QR_продукты',
  QR_MACHINES: 'QR_автоматы',
  QR_SHARE: 'QR_доля_автоматы',
  QR_PAYME: 'QR_Payme',
  QR_CLICK: 'QR_Click',
  // + QR_Май ... QR_Декабрь (8 листов)

  // VIP и Кредит (5)
  VIP_SUMMARY: 'VIP',
  VIP_DETAILS: 'VIP_детализация',
  VIP_PRODUCTS: 'VIP_продукты',
  CREDIT_SUMMARY: 'Кредит',
  CREDIT_DETAILS: 'Кредит_детализация',

  // Продукты по месяцам (8)
  // Прод_Май ... Прод_Декабрь

  // Служебные (7)
  QR_RECONCILIATION: 'Сверка_QR',
  STATUSES: 'Статусы',
  FAILURES: 'Сбои',
  CROSS_ANALYSIS: 'Кросс_анализ',
  DAILY: 'Ежедневно',               // По датам!
  AVERAGE_CHECK: 'Средний_чек',
  VERIFICATION: 'Верификация',
} as const;

/**
 * Определения листов Excel для Structure B
 */
export const STRUCTURE_B_SHEETS = {
  // Общие (5)
  SUMMARY: 'Сводка',
  BY_MONTHS: 'По месяцам',
  BY_DAYS: 'По дням',               // По датам!
  BY_MACHINES: 'По автоматам',
  BY_PRODUCTS: 'По продуктам',

  // Ингредиенты (5)
  INGREDIENTS_SUMMARY: 'Расход ингр. сводка',
  INGREDIENTS_MONTHS: 'Расход ингр. по месяцам',
  INGREDIENTS_MACHINES: 'Расход ингр. по автоматам',
  INGREDIENTS_DAYS: 'Расход ингр. по дням',

  // Дополнительные (4)
  QR_RECONCILIATION: 'Сверка QR',
  FAILURES: 'Сбои',
  PRICE_HISTORY: 'История цен',
  PURCHASES: 'Закупки',
} as const;

/**
 * Правила верификации
 */
export const VERIFICATION_RULES = {
  // Payme файлы
  PAYME_HEADER_ROW: 6,
  PAYME_AMOUNT_COLUMN: 'СУММА БЕЗ КОМИССИИ',

  // Фильтры
  INGREDIENT_FILTER: ['Доставлен', 'Доставка подтверждена'] as string[],
  PAYMENT_FILTER: ['Оплачено'] as string[],

  // Допуски сверки QR
  QR_TOLERANCE_OK: 0.01,        // < 1%
  QR_TOLERANCE_WARNING: 0.03,   // 1-3%
  // > 3% = CRITICAL

  // Холодные напитки
  COLD_DRINKS_MACHINE: '039ec91c0000',
} as const;
