/**
 * Transactions Service for VendHub OS (Composer)
 * Delegates to split services: TransactionQueryService, TransactionCreateService, TransactionReconcileService
 *
 * Maintains the same public API so existing controllers and tests continue to work.
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  Transaction,
  TransactionStatus,
  PaymentMethod,
  CollectionRecord,
  TransactionDailySummary,
  Commission,
} from "./entities/transaction.entity";
import {
  CreateCollectionRecordDto,
  QueryCollectionRecordsDto,
} from "./dto/collection-record.dto";
import {
  QueryDailySummariesDto,
  TransactionQueryCommissionsDto,
} from "./dto/daily-summary-query.dto";
import { TransactionQueryService } from "./transaction-query.service";
import { TransactionCreateService } from "./transaction-create.service";
import { TransactionReconcileService } from "./transaction-reconcile.service";

// Aliases for compatibility with service logic
type DispenseStatus =
  | "pending"
  | "dispensing"
  | "dispensed"
  | "failed"
  | "partial";

// ============================================================================
// DTOs (re-exported for backward compatibility)
// ============================================================================

export interface CreateTransactionDto {
  organizationId: string;
  machineId: string;
  locationId?: string;
  sessionId?: string;
  customerPhone?: string;
  customerTelegramId?: string;
  items: {
    productId: string;
    slotNumber: number;
    quantity: number;
    unitPrice: number;
    productName: string;
    productSku?: string;
  }[];
  currency?: string;
}

export interface ProcessPaymentDto {
  transactionId: string;
  method: PaymentMethod;
  amount: number;
  currency?: string;
  providerTransactionId?: string;
  providerData?: Record<string, unknown>;
}

export interface DispenseResultDto {
  transactionId: string;
  itemId: string;
  status: DispenseStatus;
  dispensedQuantity: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface QueryTransactionsDto {
  organizationId: string;
  machineId?: string;
  locationId?: string;
  operatorId?: string;
  status?: TransactionStatus[];
  paymentMethod?: PaymentMethod[];
  dateFrom?: Date | string;
  dateTo?: Date | string;
  minAmount?: number;
  maxAmount?: number;
  hasError?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface TransactionStatistics {
  totalTransactions: number;
  totalRevenue: number;
  averageTransaction: number;
  byStatus: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  byHour: { hour: number; count: number; revenue: number }[];
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  successRate: number;
}

// ============================================================================
// SERVICE (COMPOSER)
// ============================================================================

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly queryService: TransactionQueryService,
    private readonly createService: TransactionCreateService,
    private readonly reconcileService: TransactionReconcileService,
  ) {}

  // ============================================================================
  // TRANSACTION LIFECYCLE (delegated to TransactionCreateService)
  // ============================================================================

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    return this.createService.create(dto);
  }

  async processPayment(dto: ProcessPaymentDto): Promise<Transaction> {
    return this.createService.processPayment(dto);
  }

  async confirmPayment(
    providerTransactionId: string,
    provider: string,
    success: boolean,
    providerData?: Record<string, unknown>,
  ): Promise<Transaction> {
    return this.createService.confirmPayment(
      providerTransactionId,
      provider,
      success,
      providerData,
    );
  }

  async recordDispense(dto: DispenseResultDto): Promise<Transaction> {
    return this.createService.recordDispense(dto);
  }

  async cancel(id: string, reason: string): Promise<Transaction> {
    return this.createService.cancel(id, reason);
  }

  // ============================================================================
  // REFUNDS (delegated to TransactionCreateService)
  // ============================================================================

  async createRefund(
    transactionId: string,
    amount: number,
    reason: string,
  ): Promise<Transaction> {
    return this.createService.createRefund(transactionId, amount, reason);
  }

  async processRefund(
    refundId: string,
    success: boolean,
    referenceNumber?: string,
  ): Promise<Transaction> {
    return this.createService.processRefund(refundId, success, referenceNumber);
  }

  // ============================================================================
  // FISCALIZATION (delegated to TransactionCreateService)
  // ============================================================================

  async fiscalize(
    transactionId: string,
    fiscalData: Partial<{
      receiptNumber: string;
      fiscalSign: string;
      qrCode: string;
      ofdName: string;
    }>,
  ): Promise<Transaction> {
    return this.createService.fiscalize(transactionId, fiscalData);
  }

  // ============================================================================
  // QUERIES (delegated to TransactionQueryService)
  // ============================================================================

  async findById(id: string, organizationId?: string): Promise<Transaction> {
    return this.queryService.findById(id, organizationId);
  }

  async findByNumber(
    transactionNumber: string,
    organizationId?: string,
  ): Promise<Transaction> {
    return this.queryService.findByNumber(transactionNumber, organizationId);
  }

  async query(query: QueryTransactionsDto) {
    return this.queryService.query(query);
  }

  async getStatistics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    machineId?: string,
  ): Promise<TransactionStatistics> {
    return this.queryService.getStatistics(
      organizationId,
      dateFrom,
      dateTo,
      machineId,
    );
  }

  async findAll(
    organizationId: string,
    options?: { page?: number; limit?: number },
  ) {
    return this.queryService.findAll(organizationId, options);
  }

  async update(
    id: string,
    data: Partial<{
      metadata: Record<string, unknown>;
      notes: string;
      operatorId: string;
    }>,
  ): Promise<Transaction> {
    return this.createService.update(id, data);
  }

  async remove(id: string): Promise<void> {
    return this.createService.remove(id);
  }

  async findByCustomerPhone(
    phone: string,
    organizationId: string,
    limit = 20,
  ): Promise<Transaction[]> {
    return this.queryService.findByCustomerPhone(phone, organizationId, limit);
  }

  async getTodayTransactions(
    machineId: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: Transaction[]; total: number }> {
    return this.queryService.getTodayTransactions(machineId, page, limit);
  }

  async getRevenueSummary(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    total: number;
    cash: number;
    card: number;
    mobile: number;
    count: number;
  }> {
    return this.queryService.getRevenueSummary(
      organizationId,
      dateFrom,
      dateTo,
    );
  }

  // ============================================================================
  // COLLECTION RECORDS (delegated to TransactionReconcileService)
  // ============================================================================

  async getCollectionRecords(
    organizationId: string,
    params: QueryCollectionRecordsDto,
  ) {
    return this.reconcileService.getCollectionRecords(organizationId, params);
  }

  async createCollectionRecord(
    organizationId: string,
    userId: string,
    data: CreateCollectionRecordDto,
  ): Promise<CollectionRecord> {
    return this.reconcileService.createCollectionRecord(
      organizationId,
      userId,
      data,
    );
  }

  async verifyCollection(
    collectionId: string,
    userId: string,
    notes?: string,
  ): Promise<CollectionRecord> {
    return this.reconcileService.verifyCollection(collectionId, userId, notes);
  }

  // ============================================================================
  // DAILY SUMMARIES (delegated to TransactionReconcileService)
  // ============================================================================

  async getDailySummaries(
    organizationId: string,
    params: QueryDailySummariesDto,
  ) {
    return this.reconcileService.getDailySummaries(organizationId, params);
  }

  async rebuildDailySummary(
    organizationId: string,
    date: Date,
    machineId?: string,
  ): Promise<TransactionDailySummary> {
    return this.reconcileService.rebuildDailySummary(
      organizationId,
      date,
      machineId,
    );
  }

  // ============================================================================
  // COMMISSIONS (delegated to TransactionReconcileService)
  // ============================================================================

  async getCommissions(
    organizationId: string,
    params: TransactionQueryCommissionsDto,
  ) {
    return this.reconcileService.getCommissions(organizationId, params);
  }

  async calculateCommission(
    organizationId: string,
    contractId: string,
    periodStart: Date,
    periodEnd: Date,
    userId: string,
  ): Promise<Commission> {
    return this.reconcileService.calculateCommission(
      organizationId,
      contractId,
      periodStart,
      periodEnd,
      userId,
    );
  }
}
