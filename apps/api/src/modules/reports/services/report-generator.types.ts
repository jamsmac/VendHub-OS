/**
 * Shared types for VendHub Report Generators
 * Extracted from vendhub-report-generator.service.ts
 */

export interface TransactionData {
  id: string;
  createdAt: Date;
  amount: number;
  paymentType: string;
  paymentStatus: string;
  brewStatus: string;
  machineId: string;
  machineCode: string;
  machineAddress: string;
  productId: string;
  productName: string;
  productCategory: string;
  ingredients?: Record<string, number>;
  costOfGoods?: number;
}

export interface AggregatedData {
  byPaymentType: Map<string, { count: number; amount: number }>;
  byMachine: Map<
    string,
    { count: number; amount: number; address: string; code: string }
  >;
  byProduct: Map<
    string,
    { count: number; amount: number; name: string; category: string }
  >;
  byMonth: Map<string, { count: number; amount: number }>;
  byWeekday: Map<number, { count: number; amount: number }>;
  byDate: Map<
    string,
    { count: number; amount: number; successful: number; failed: number }
  >;
  byHour: Map<number, { count: number; amount: number }>;
}
