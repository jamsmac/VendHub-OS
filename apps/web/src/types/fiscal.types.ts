/**
 * Fiscal Module Types
 * Types for fiscal device management, receipts, and shifts
 */

// ============================================
// Device Types
// ============================================

export type FiscalDeviceStatus = 'active' | 'inactive' | 'error' | 'maintenance';
export type FiscalShiftStatus = 'open' | 'closed';
export type FiscalReceiptStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
export type FiscalReceiptType = 'sale' | 'refund';
export type FiscalQueueStatus = 'pending' | 'processing' | 'success' | 'failed' | 'retry';

export interface FiscalDevice {
  id: string;
  organizationId: string;
  name: string;
  provider: string;
  serialNumber?: string;
  terminalId?: string;
  credentials: FiscalDeviceCredentials;
  status: FiscalDeviceStatus;
  sandboxMode: boolean;
  config: FiscalDeviceConfig;
  lastSync?: {
    syncedAt?: string;
    status?: string;
    error?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FiscalDeviceCredentials {
  login?: string;
  password?: string;
  companyTin?: string;
  apiKey?: string;
}

export interface FiscalDeviceConfig {
  baseUrl?: string;
  defaultCashier?: string;
  vatRates?: number[];
  autoOpenShift?: boolean;
  autoCloseShift?: boolean;
  closeShiftAt?: string;
}

// ============================================
// Shift Types
// ============================================

export interface FiscalShift {
  id: string;
  organizationId: string;
  deviceId: string;
  externalShiftId?: string;
  shiftNumber: number;
  status: FiscalShiftStatus;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  totalSales: number;
  totalRefunds: number;
  totalCash: number;
  totalCard: number;
  receiptsCount: number;
  zReportNumber?: string;
  zReportUrl?: string;
  vatSummary?: {
    rate: number;
    amount: number;
    taxAmount: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Receipt Types
// ============================================

export interface FiscalReceipt {
  id: string;
  organizationId: string;
  deviceId: string;
  shiftId: string;
  externalReceiptId?: string;
  orderId?: string;
  transactionId?: string;
  type: FiscalReceiptType;
  status: FiscalReceiptStatus;
  items: FiscalReceiptItem[];
  payment: FiscalPayment;
  total: number;
  vatTotal: number;
  fiscalNumber?: string;
  fiscalSign?: string;
  qrCodeUrl?: string;
  receiptUrl?: string;
  fiscalizedAt?: string;
  retryCount: number;
  lastError?: string;
  metadata?: FiscalReceiptMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface FiscalReceiptItem {
  name: string;
  ikpuCode: string;
  packageCode?: string;
  quantity: number;
  price: number;
  vatRate: number;
  vatAmount: number;
  unit: string;
  total: number;
}

export interface FiscalPayment {
  cash: number;
  card: number;
  other?: number;
}

export interface FiscalReceiptMetadata {
  machineId?: string;
  locationId?: string;
  operatorId?: string;
  comment?: string;
  rawRequest?: any;
  rawResponse?: any;
}

// ============================================
// Queue Types
// ============================================

export interface FiscalQueueItem {
  id: string;
  organizationId: string;
  deviceId: string;
  operation: FiscalQueueOperation;
  payload: any;
  status: FiscalQueueStatus;
  priority: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  lastError?: string;
  result?: any;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type FiscalQueueOperation =
  | 'receipt_sale'
  | 'receipt_refund'
  | 'shift_open'
  | 'shift_close'
  | 'x_report';

// ============================================
// Request/Response Types
// ============================================

export interface CreateFiscalDeviceRequest {
  name: string;
  provider: string;
  serialNumber?: string;
  terminalId?: string;
  credentials: FiscalDeviceCredentials;
  sandboxMode?: boolean;
  config?: FiscalDeviceConfig;
}

export interface UpdateFiscalDeviceRequest {
  name?: string;
  serialNumber?: string;
  terminalId?: string;
  credentials?: Partial<FiscalDeviceCredentials>;
  config?: Partial<FiscalDeviceConfig>;
  sandboxMode?: boolean;
}

export interface OpenShiftRequest {
  cashierName: string;
}

export interface OpenShiftResponse {
  success: boolean;
  shiftId: string;
  shiftNumber: number;
  openedAt: string;
}

export interface CloseShiftResponse {
  success: boolean;
  zReportNumber: string;
  zReportUrl: string;
  totalSales: number;
  totalRefunds: number;
  totalCash: number;
  totalCard: number;
  receiptsCount: number;
  vatSummary: { rate: number; amount: number }[];
}

export interface XReportResponse {
  success: boolean;
  shiftId: string;
  shiftNumber: number;
  totalSales: number;
  totalRefunds: number;
  totalCash: number;
  totalCard: number;
  receiptsCount: number;
  vatSummary: { rate: number; amount: number }[];
}

export interface CreateReceiptRequest {
  deviceId: string;
  orderId?: string;
  transactionId?: string;
  type: FiscalReceiptType;
  items: {
    name: string;
    ikpuCode: string;
    packageCode?: string;
    quantity: number;
    price: number;
    vatRate: number;
    unit: string;
  }[];
  payment: {
    cash: number;
    card: number;
    other?: number;
  };
  metadata?: FiscalReceiptMetadata;
}

export interface FiscalReceiptResponse {
  success: boolean;
  receiptId: string;
  fiscalNumber: string;
  fiscalSign: string;
  qrCodeUrl: string;
  receiptUrl: string;
  timestamp: string;
}

// ============================================
// Statistics Types
// ============================================

export interface DeviceStatistics {
  deviceId: string;
  deviceName: string;
  status: FiscalDeviceStatus;
  currentShift?: ShiftStatistics;
  todayStats: {
    receiptsCount: number;
    totalSales: number;
    totalRefunds: number;
  };
  queueStats: {
    pending: number;
    failed: number;
  };
}

export interface ShiftStatistics {
  shiftId: string;
  shiftNumber: number;
  status: FiscalShiftStatus;
  openedAt: string;
  closedAt?: string;
  cashierName: string;
  totalSales: number;
  totalRefunds: number;
  totalCash: number;
  totalCard: number;
  receiptsCount: number;
  netTotal: number;
}

// ============================================
// Filter Types
// ============================================

export interface FiscalReceiptFilters {
  deviceId?: string;
  shiftId?: string;
  type?: FiscalReceiptType;
  status?: FiscalReceiptStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface FiscalReceiptsResponse {
  receipts: FiscalReceipt[];
  total: number;
}
