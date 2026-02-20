/**
 * Transaction Types for VendHub OS
 * Payment and sales transaction management
 */

export enum TransactionType {
  SALE = 'sale',
  REFUND = 'refund',
  COLLECTION = 'collection',
  ADJUSTMENT = 'adjustment',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  PAYME = 'payme',
  CLICK = 'click',
  QR = 'qr',
  UZCARD = 'uzcard',
  HUMO = 'humo',
  BONUS = 'bonus',
}

export interface ITransaction {
  id: string;
  organizationId: string;
  machineId: string;
  type: TransactionType;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;

  // Amounts
  amount: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;

  // Products
  items: ITransactionItem[];

  // Payment details
  paymentId?: string;
  paymentReference?: string;
  cardMask?: string;
  cardType?: string;

  // Fiscal data (Uzbekistan)
  fiscalSign?: string;
  fiscalReceiptNumber?: string;
  fiscalReceiptUrl?: string;
  fiscalQrCode?: string;

  // Refund
  refundedAt?: Date;
  refundReason?: string;
  originalTransactionId?: string;

  // Telemetry
  machineSlotId?: string;
  vendingSessionId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ITransactionItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  // Uzbekistan tax codes
  mxikCode?: string;
  ikpuCode?: string;
}

export interface ITransactionCreate {
  organizationId: string;
  machineId: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  items: ITransactionItemCreate[];
  paymentId?: string;
  paymentReference?: string;
  cardMask?: string;
  cardType?: string;
  currency?: string;
  machineSlotId?: string;
  vendingSessionId?: string;
}

export interface ITransactionItemCreate {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface ITransactionStats {
  totalTransactions: number;
  totalAmount: number;
  totalVat: number;
  averageTransaction: number;
  byPaymentMethod: Record<PaymentMethod, {
    count: number;
    amount: number;
  }>;
  byHour: Array<{
    hour: number;
    count: number;
    amount: number;
  }>;
  byDay: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    amount: number;
  }>;
}

export interface ICollectionRecord {
  id: string;
  organizationId: string;
  machineId: string;
  taskId?: string;
  collectedById: string;

  cashAmount: number;
  coinAmount: number;
  totalAmount: number;

  expectedCashAmount?: number;
  expectedCoinAmount?: number;
  difference?: number;

  notes?: string;
  photoUrl?: string;

  collectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Payment method labels
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Наличные',
  [PaymentMethod.CARD]: 'Банковская карта',
  [PaymentMethod.PAYME]: 'Payme',
  [PaymentMethod.CLICK]: 'Click',
  [PaymentMethod.QR]: 'QR-код',
  [PaymentMethod.UZCARD]: 'Uzcard',
  [PaymentMethod.HUMO]: 'Humo',
  [PaymentMethod.BONUS]: 'Бонусы',
};

// Payment method icons
export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: '💵',
  [PaymentMethod.CARD]: '💳',
  [PaymentMethod.PAYME]: '📱',
  [PaymentMethod.CLICK]: '📱',
  [PaymentMethod.QR]: '📲',
  [PaymentMethod.UZCARD]: '💳',
  [PaymentMethod.HUMO]: '💳',
  [PaymentMethod.BONUS]: '⭐',
};

// Transaction status labels
export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  [TransactionStatus.PENDING]: 'Ожидает',
  [TransactionStatus.PROCESSING]: 'Обработка',
  [TransactionStatus.COMPLETED]: 'Завершено',
  [TransactionStatus.FAILED]: 'Ошибка',
  [TransactionStatus.REFUNDED]: 'Возврат',
  [TransactionStatus.CANCELLED]: 'Отменено',
};

// Transaction status colors
export const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, string> = {
  [TransactionStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [TransactionStatus.PROCESSING]: 'bg-blue-100 text-blue-800',
  [TransactionStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [TransactionStatus.FAILED]: 'bg-red-100 text-red-800',
  [TransactionStatus.REFUNDED]: 'bg-purple-100 text-purple-800',
  [TransactionStatus.CANCELLED]: 'bg-gray-100 text-gray-500',
};

// Currency codes
export const CURRENCIES = {
  UZS: 'UZS',
  USD: 'USD',
  RUB: 'RUB',
} as const;

// Default currency
export const DEFAULT_CURRENCY = CURRENCIES.UZS;
