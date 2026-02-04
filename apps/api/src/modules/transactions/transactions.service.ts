/**
 * Transactions Service for VendHub OS
 * Handles all vending machine transactions and payments
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Transaction,
  TransactionItem,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  CollectionRecord,
  TransactionDailySummary,
  Commission,
  CommissionStatus,
  CommissionType,
} from './entities/transaction.entity';
import { CreateCollectionRecordDto, QueryCollectionRecordsDto } from './dto/collection-record.dto';
import { QueryDailySummariesDto, QueryCommissionsDto } from './dto/daily-summary-query.dto';

// Aliases for compatibility with service logic
type DispenseStatus = 'pending' | 'dispensing' | 'dispensed' | 'failed' | 'partial';

// Interface for item metadata with dispense status
interface ItemMetadata {
  dispenseStatus?: DispenseStatus;
  dispensedQuantity?: number;
  dispenseError?: string;
  dispenseErrorMessage?: string;
  dispensedAt?: string;
}

// ============================================================================
// DTOs
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
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  hasError?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface TransactionStatistics {
  totalTransactions: number;
  totalRevenue: number;
  averageTransaction: number;
  byStatus: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  byHour: { hour: number; count: number; revenue: number }[];
  topProducts: { productId: string; productName: string; quantity: number; revenue: number }[];
  successRate: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private itemRepo: Repository<TransactionItem>,
    @InjectRepository(CollectionRecord)
    private collectionRecordRepo: Repository<CollectionRecord>,
    @InjectRepository(TransactionDailySummary)
    private dailySummaryRepo: Repository<TransactionDailySummary>,
    @InjectRepository(Commission)
    private commissionRepo: Repository<Commission>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // TRANSACTION LIFECYCLE
  // ============================================================================

  /**
   * Create new transaction (when customer starts purchase)
   */
  async create(dto: CreateTransactionDto): Promise<Transaction> {
    // Calculate totals
    const subtotal = dto.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const itemCount = dto.items.reduce((sum, item) => sum + item.quantity, 0);

    const transaction = this.transactionRepo.create({
      organizationId: dto.organizationId,
      machineId: dto.machineId,
      type: TransactionType.SALE,
      status: TransactionStatus.PENDING,
      amount: subtotal,
      totalAmount: subtotal,
      quantity: itemCount,
      currency: dto.currency || 'UZS',
      transactionDate: new Date(),
      metadata: {
        customerPhone: dto.customerPhone,
        customerTelegramId: dto.customerTelegramId,
        sessionId: dto.sessionId,
        locationId: dto.locationId,
      },
    });

    const saved = await this.transactionRepo.save(transaction);

    // Create items
    for (const item of dto.items) {
      const transactionItem = this.itemRepo.create({
        transactionId: saved.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.productSku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.unitPrice * item.quantity,
        slotNumber: String(item.slotNumber),
        metadata: { dispenseStatus: 'pending' },
      });
      await this.itemRepo.save(transactionItem);
    }

    this.eventEmitter.emit('transaction.created', saved);

    return this.findById(saved.id);
  }

  /**
   * Process payment for transaction
   */
  async processPayment(dto: ProcessPaymentDto): Promise<Transaction> {
    const transaction = await this.findById(dto.transactionId);

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Транзакция уже обработана');
    }

    // Update transaction with payment info
    transaction.paymentMethod = dto.method;
    if (dto.providerTransactionId) {
      transaction.paymentId = dto.providerTransactionId;
    }
    transaction.metadata = {
      ...transaction.metadata,
      paymentData: dto.providerData,
    };

    // For cash payments, mark as completed immediately
    if (dto.method === PaymentMethod.CASH) {
      transaction.status = TransactionStatus.COMPLETED;
      await this.transactionRepo.save(transaction);
      this.eventEmitter.emit('transaction.paid', transaction);
    } else {
      transaction.status = TransactionStatus.PROCESSING;
      await this.transactionRepo.save(transaction);
    }

    return this.findById(transaction.id);
  }

  /**
   * Confirm payment from provider callback
   */
  async confirmPayment(
    providerTransactionId: string,
    provider: string,
    success: boolean,
    providerData?: Record<string, unknown>,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { paymentId: providerTransactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Транзакция не найдена');
    }

    transaction.metadata = {
      ...transaction.metadata,
      paymentProvider: provider,
      paymentConfirmedAt: new Date().toISOString(),
      ...providerData,
    };

    if (success) {
      transaction.status = TransactionStatus.COMPLETED;
      await this.transactionRepo.save(transaction);
      this.eventEmitter.emit('transaction.paid', transaction);
    } else {
      // Payment failed
      transaction.status = TransactionStatus.FAILED;
      transaction.metadata = {
        ...transaction.metadata,
        failureReason: 'Платёж отклонён',
      };
      await this.transactionRepo.save(transaction);
      this.eventEmitter.emit('transaction.failed', transaction);
    }

    return this.findById(transaction.id);
  }

  /**
   * Record dispense result for an item
   */
  async recordDispense(dto: DispenseResultDto): Promise<Transaction> {
    const transaction = await this.findById(dto.transactionId);

    if (![TransactionStatus.COMPLETED, TransactionStatus.PROCESSING].includes(transaction.status)) {
      throw new BadRequestException('Транзакция не оплачена');
    }

    // Update item status in metadata
    const item = await this.itemRepo.findOne({
      where: { id: dto.itemId, transactionId: dto.transactionId },
    });

    if (!item) {
      throw new NotFoundException('Товар транзакции не найден');
    }

    item.metadata = {
      ...item.metadata,
      dispenseStatus: dto.status,
      dispensedQuantity: dto.dispensedQuantity,
      dispenseError: dto.errorCode,
      dispenseErrorMessage: dto.errorMessage,
      dispensedAt: new Date().toISOString(),
    };
    await this.itemRepo.save(item);

    // Update transaction metadata
    transaction.metadata = {
      ...transaction.metadata,
      lastDispenseAt: new Date().toISOString(),
    };

    // Update transaction status based on all items
    const items = await this.itemRepo.find({ where: { transactionId: transaction.id } });
    const allDispensed = items.every((i) => (i.metadata as ItemMetadata)?.dispenseStatus === 'dispensed');
    const anyFailed = items.some((i) => (i.metadata as ItemMetadata)?.dispenseStatus === 'failed');

    if (allDispensed) {
      transaction.status = TransactionStatus.COMPLETED;
      this.eventEmitter.emit('transaction.completed', transaction);
    } else if (anyFailed) {
      transaction.status = TransactionStatus.PARTIALLY_REFUNDED;
      this.eventEmitter.emit('transaction.partial', transaction);
    }

    await this.transactionRepo.save(transaction);

    return this.findById(transaction.id);
  }

  /**
   * Cancel transaction
   */
  async cancel(id: string, reason: string): Promise<Transaction> {
    const transaction = await this.findById(id);

    if ([TransactionStatus.COMPLETED, TransactionStatus.REFUNDED].includes(transaction.status)) {
      throw new BadRequestException('Невозможно отменить завершённую транзакцию');
    }

    transaction.status = TransactionStatus.CANCELLED;
    transaction.metadata = {
      ...transaction.metadata,
      cancellationReason: reason,
      cancelledAt: new Date().toISOString(),
    };

    await this.transactionRepo.save(transaction);

    // Note: Refunds should be handled separately if payment was already processed

    this.eventEmitter.emit('transaction.cancelled', transaction);

    return this.findById(id);
  }

  // ============================================================================
  // REFUNDS
  // ============================================================================

  async createRefund(transactionId: string, amount: number, reason: string): Promise<Transaction> {
    const transaction = await this.findById(transactionId);

    // Create refund transaction
    const refundTransaction = this.transactionRepo.create({
      organizationId: transaction.organizationId,
      machineId: transaction.machineId,
      type: TransactionType.REFUND,
      status: TransactionStatus.PENDING,
      amount,
      totalAmount: amount,
      currency: transaction.currency,
      originalTransactionId: transactionId,
      refundReason: reason,
      transactionDate: new Date(),
    });

    const saved = await this.transactionRepo.save(refundTransaction);

    // Update original transaction
    transaction.refundedAmount = (transaction.refundedAmount || 0) + amount;
    transaction.refundedAt = new Date();
    if (transaction.refundedAmount >= transaction.totalAmount) {
      transaction.status = TransactionStatus.REFUNDED;
    } else {
      transaction.status = TransactionStatus.PARTIALLY_REFUNDED;
    }
    await this.transactionRepo.save(transaction);

    this.eventEmitter.emit('transaction.refund.requested', { transaction, refund: saved });

    return saved;
  }

  async processRefund(refundId: string, success: boolean, referenceNumber?: string): Promise<Transaction> {
    const refund = await this.transactionRepo.findOne({ where: { id: refundId, type: TransactionType.REFUND } });
    if (!refund) {
      throw new NotFoundException('Возврат не найден');
    }

    refund.status = success ? TransactionStatus.COMPLETED : TransactionStatus.FAILED;
    refund.metadata = {
      ...refund.metadata,
      processedAt: new Date().toISOString(),
      referenceNumber,
    };

    await this.transactionRepo.save(refund);

    return refund;
  }

  // ============================================================================
  // FISCALIZATION
  // ============================================================================

  async fiscalize(transactionId: string, fiscalData: Partial<{
    receiptNumber: string;
    fiscalSign: string;
    qrCode: string;
    ofdName: string;
  }>): Promise<Transaction> {
    const transaction = await this.findById(transactionId);

    transaction.isFiscalized = true;
    if (fiscalData.receiptNumber) transaction.fiscalReceiptNumber = fiscalData.receiptNumber;
    if (fiscalData.fiscalSign) transaction.fiscalSign = fiscalData.fiscalSign;
    if (fiscalData.qrCode) transaction.fiscalQrCode = fiscalData.qrCode;
    transaction.fiscalizedAt = new Date();
    transaction.fiscalData = {
      ...transaction.fiscalData,
      ofdName: fiscalData.ofdName,
    };

    return this.transactionRepo.save(transaction);
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  async findById(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!transaction) {
      throw new NotFoundException(`Транзакция ${id} не найдена`);
    }

    return transaction;
  }

  async findByNumber(transactionNumber: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { transactionNumber },
      relations: ['items'],
    });

    if (!transaction) {
      throw new NotFoundException(`Транзакция ${transactionNumber} не найдена`);
    }

    return transaction;
  }

  async query(query: QueryTransactionsDto) {
    const {
      organizationId,
      machineId,
      status,
      paymentMethod,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      hasError,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const qb = this.transactionRepo.createQueryBuilder('t');
    qb.where('t.organizationId = :organizationId', { organizationId });

    if (machineId) {
      qb.andWhere('t.machineId = :machineId', { machineId });
    }

    if (query.operatorId) {
      qb.andWhere('t.userId = :operatorId', { operatorId: query.operatorId });
    }

    if (status?.length) {
      qb.andWhere('t.status IN (:...status)', { status });
    }

    if (paymentMethod?.length) {
      qb.andWhere('t.paymentMethod IN (:...paymentMethod)', { paymentMethod });
    }

    if (dateFrom) {
      qb.andWhere('t.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('t.createdAt <= :dateTo', { dateTo });
    }

    if (minAmount !== undefined) {
      qb.andWhere('t.totalAmount >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      qb.andWhere('t.totalAmount <= :maxAmount', { maxAmount });
    }

    if (hasError !== undefined) {
      if (hasError) {
        qb.andWhere("t.metadata->>'failureReason' IS NOT NULL");
      } else {
        qb.andWhere("t.metadata->>'failureReason' IS NULL");
      }
    }

    const total = await qb.getCount();

    qb.leftJoinAndSelect('t.items', 'items');
    qb.orderBy(`t.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStatistics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    machineId?: string,
  ): Promise<TransactionStatistics> {
    const qb = this.transactionRepo.createQueryBuilder('t');
    qb.where('t.organizationId = :organizationId', { organizationId });
    qb.andWhere('t.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });

    if (machineId) {
      qb.andWhere('t.machineId = :machineId', { machineId });
    }

    const transactions = await qb.getMany();

    const totalTransactions = transactions.length;
    const completedTransactions = transactions.filter(
      (t) => t.status === TransactionStatus.COMPLETED,
    );
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const averageTransaction = completedTransactions.length > 0
      ? totalRevenue / completedTransactions.length
      : 0;

    const byStatus: Record<string, number> = {};
    const byPaymentMethod: Record<string, number> = {};
    const byHourMap: Record<number, { count: number; revenue: number }> = {};

    for (const t of transactions) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      if (t.paymentMethod) {
        byPaymentMethod[t.paymentMethod] = (byPaymentMethod[t.paymentMethod] || 0) + 1;
      }

      const hour = t.created_at.getHours();
      if (!byHourMap[hour]) {
        byHourMap[hour] = { count: 0, revenue: 0 };
      }
      byHourMap[hour].count++;
      if (t.status === TransactionStatus.COMPLETED) {
        byHourMap[hour].revenue += Number(t.totalAmount);
      }
    }

    const byHour = Object.entries(byHourMap)
      .map(([hour, data]) => ({ hour: parseInt(hour), ...data }))
      .sort((a, b) => a.hour - b.hour);

    // Top products
    const itemsQb = this.itemRepo.createQueryBuilder('i');
    itemsQb.innerJoin('i.transaction', 't');
    itemsQb.where('t.organizationId = :organizationId', { organizationId });
    itemsQb.andWhere('t.created_at BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });
    itemsQb.andWhere('t.status = :status', { status: TransactionStatus.COMPLETED });
    itemsQb.select('i.productId', 'productId');
    itemsQb.addSelect('i.productName', 'productName');
    itemsQb.addSelect('SUM(i.quantity)', 'quantity');
    itemsQb.addSelect('SUM(i.totalAmount)', 'revenue');
    itemsQb.groupBy('i.productId');
    itemsQb.addGroupBy('i.productName');
    itemsQb.orderBy('revenue', 'DESC');
    itemsQb.limit(10);

    const topProducts = await itemsQb.getRawMany();

    const successRate = totalTransactions > 0
      ? (completedTransactions.length / totalTransactions) * 100
      : 0;

    return {
      totalTransactions,
      totalRevenue,
      averageTransaction,
      byStatus,
      byPaymentMethod,
      byHour,
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        quantity: parseInt(p.quantity),
        revenue: parseFloat(p.revenue),
      })),
      successRate,
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async generateTransactionNumber(organizationId: string): Promise<string> {
    const date = new Date();
    const prefix = `TRX${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

    const count = await this.transactionRepo.count({
      where: {
        organizationId,
        created_at: Between(
          new Date(date.setHours(0, 0, 0, 0)),
          new Date(date.setHours(23, 59, 59, 999)),
        ),
      },
    });

    return `${prefix}-${String(count + 1).padStart(6, '0')}`;
  }

  private async getTotalPaid(transactionId: string): Promise<number> {
    // Payment tracking is now in the main transaction - return transaction total if paid
    const transaction = await this.transactionRepo.findOne({ where: { id: transactionId } });
    if (transaction && transaction.status === TransactionStatus.COMPLETED) {
      return Number(transaction.totalAmount);
    }
    return 0;
  }

  private async getTotalRefunded(transactionId: string): Promise<number> {
    // Get total refunded amount from refund transactions
    const result = await this.transactionRepo
      .createQueryBuilder('r')
      .where('r.originalTransactionId = :transactionId', { transactionId })
      .andWhere('r.type = :type', { type: TransactionType.REFUND })
      .andWhere('r.status = :status', { status: TransactionStatus.COMPLETED })
      .select('SUM(r.amount)', 'total')
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  // ============================================================================
  // ADDITIONAL CRUD METHODS
  // ============================================================================

  /**
   * Find all transactions for organization (alias for query)
   */
  async findAll(organizationId: string, options?: { page?: number; limit?: number }) {
    return this.query({
      organizationId,
      page: options?.page || 1,
      limit: options?.limit || 50,
    });
  }

  /**
   * Update transaction metadata
   */
  async update(id: string, data: Partial<{
    metadata: Record<string, unknown>;
    notes: string;
    operatorId: string;
  }>): Promise<Transaction> {
    const transaction = await this.findById(id);

    if (data.metadata) {
      transaction.metadata = { ...transaction.metadata, ...data.metadata };
    }
    if (data.notes !== undefined) {
      transaction.notes = data.notes;
    }
    if (data.operatorId) {
      transaction.userId = data.operatorId;
    }

    await this.transactionRepo.save(transaction);
    return this.findById(id);
  }

  /**
   * Soft delete transaction (for cancelled/test transactions only)
   */
  async remove(id: string): Promise<void> {
    const transaction = await this.findById(id);

    if (![TransactionStatus.CANCELLED, TransactionStatus.FAILED].includes(transaction.status)) {
      throw new BadRequestException('Можно удалить только отменённые или неудачные транзакции');
    }

    await this.transactionRepo.softDelete(id);
    this.logger.log(`Transaction ${id} soft deleted`);
  }

  /**
   * Get transactions for customer by phone
   */
  async findByCustomerPhone(phone: string, organizationId: string, limit = 20): Promise<Transaction[]> {
    return this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.items', 'items')
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere("t.metadata->>'customerPhone' = :phone", { phone })
      .orderBy('t.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Get today's transactions for machine (paginated, max 100)
   */
  async getTodayTransactions(
    machineId: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: Transaction[]; total: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const safeLimit = Math.min(limit, 100);
    const [data, total] = await this.transactionRepo.findAndCount({
      where: {
        machineId,
        created_at: Between(today, new Date()),
      },
      relations: ['items'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return { data, total };
  }

  /**
   * Get revenue summary for period.
   * Optimized: uses SQL aggregation instead of fetching all transactions into memory.
   */
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
    const cashMethods = [PaymentMethod.CASH];
    const cardMethods = [
      PaymentMethod.CARD, PaymentMethod.NFC,
      PaymentMethod.UZCARD, PaymentMethod.HUMO,
      PaymentMethod.VISA, PaymentMethod.MASTERCARD,
    ];
    const mobileMethods = [PaymentMethod.PAYME, PaymentMethod.CLICK, PaymentMethod.QR];

    const result = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COUNT(*)', 'count')
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.payment_method IN (:...cashMethods) THEN t.total_amount ELSE 0 END), 0)`,
        'cash',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.payment_method IN (:...cardMethods) THEN t.total_amount ELSE 0 END), 0)`,
        'card',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.payment_method IN (:...mobileMethods) THEN t.total_amount ELSE 0 END), 0)`,
        'mobile',
      )
      .addSelect('COALESCE(SUM(t.total_amount), 0)', 'total')
      .where('t.organization_id = :organizationId', { organizationId })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.created_at BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .setParameters({ cashMethods, cardMethods, mobileMethods })
      .getRawOne();

    return {
      total: parseFloat(result?.total || '0'),
      cash: parseFloat(result?.cash || '0'),
      card: parseFloat(result?.card || '0'),
      mobile: parseFloat(result?.mobile || '0'),
      count: parseInt(result?.count || '0'),
    };
  }

  // ============================================================================
  // COLLECTION RECORDS
  // ============================================================================

  /**
   * Get paginated collection records for organization
   */
  async getCollectionRecords(
    organizationId: string,
    params: QueryCollectionRecordsDto,
  ) {
    const {
      machineId,
      collectedByUserId,
      dateFrom,
      dateTo,
      isVerified,
      page = 1,
      limit = 20,
    } = params;

    const qb = this.collectionRecordRepo.createQueryBuilder('cr');
    qb.where('cr.organizationId = :organizationId', { organizationId });

    if (machineId) {
      qb.andWhere('cr.machineId = :machineId', { machineId });
    }

    if (collectedByUserId) {
      qb.andWhere('cr.collectedByUserId = :collectedByUserId', { collectedByUserId });
    }

    if (dateFrom) {
      qb.andWhere('cr.collectedAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('cr.collectedAt <= :dateTo', { dateTo });
    }

    if (isVerified !== undefined) {
      qb.andWhere('cr.isVerified = :isVerified', { isVerified });
    }

    const total = await qb.getCount();

    qb.orderBy('cr.collectedAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new collection record
   */
  async createCollectionRecord(
    organizationId: string,
    userId: string,
    data: CreateCollectionRecordDto,
  ): Promise<CollectionRecord> {
    // Calculate difference from expected
    let difference: number | null = null;
    let differencePercent: number | null = null;

    if (data.expectedTotalAmount !== undefined && data.expectedTotalAmount !== null) {
      difference = data.totalAmount - data.expectedTotalAmount;
      differencePercent = data.expectedTotalAmount > 0
        ? (difference / data.expectedTotalAmount) * 100
        : 0;
    }

    const record = this.collectionRecordRepo.create({
      organizationId,
      machineId: data.machineId,
      taskId: data.taskId,
      collectedByUserId: userId,
      cashAmount: data.cashAmount,
      coinAmount: data.coinAmount,
      totalAmount: data.totalAmount,
      expectedCashAmount: data.expectedCashAmount,
      expectedCoinAmount: data.expectedCoinAmount,
      expectedTotalAmount: data.expectedTotalAmount,
      difference: difference as number,
      differencePercent: (differencePercent !== null ? Math.round(differencePercent * 100) / 100 : undefined) as number,
      counterBefore: data.counterBefore,
      counterAfter: data.counterAfter,
      salesCount: data.salesCount,
      photoUrl: data.photoUrl,
      photoUrls: data.photoUrls || [],
      notes: data.notes,
      latitude: data.latitude,
      longitude: data.longitude,
      collectedAt: data.collectedAt,
    } as Partial<CollectionRecord>);

    const saved = await this.collectionRecordRepo.save(record) as CollectionRecord;

    this.logger.log(
      `Collection record created for machine ${data.machineId}: ${data.totalAmount} UZS (diff: ${difference ?? 'N/A'})`,
    );

    this.eventEmitter.emit('collection.created', {
      collectionRecord: saved,
      organizationId,
      userId,
    });

    return saved;
  }

  /**
   * Verify a collection record
   */
  async verifyCollection(
    collectionId: string,
    userId: string,
    notes?: string,
  ): Promise<CollectionRecord> {
    const record = await this.collectionRecordRepo.findOne({
      where: { id: collectionId },
    });

    if (!record) {
      throw new NotFoundException(`Collection record ${collectionId} not found`);
    }

    if (record.isVerified) {
      throw new BadRequestException('Collection record is already verified');
    }

    record.isVerified = true;
    record.verifiedByUserId = userId;
    record.verifiedAt = new Date();

    if (notes) {
      record.notes = record.notes ? `${record.notes}\nVerification: ${notes}` : `Verification: ${notes}`;
    }

    const saved = await this.collectionRecordRepo.save(record);

    this.logger.log(`Collection ${collectionId} verified by user ${userId}`);

    this.eventEmitter.emit('collection.verified', {
      collectionRecord: saved,
      verifiedByUserId: userId,
    });

    return saved;
  }

  // ============================================================================
  // DAILY SUMMARIES
  // ============================================================================

  /**
   * Get paginated daily summaries for organization
   */
  async getDailySummaries(
    organizationId: string,
    params: QueryDailySummariesDto,
  ) {
    const {
      machineId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = params;

    const qb = this.dailySummaryRepo.createQueryBuilder('ds');
    qb.where('ds.organizationId = :organizationId', { organizationId });

    if (machineId) {
      qb.andWhere('ds.machineId = :machineId', { machineId });
    }

    if (dateFrom) {
      qb.andWhere('ds.summaryDate >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('ds.summaryDate <= :dateTo', { dateTo });
    }

    const total = await qb.getCount();

    qb.orderBy('ds.summaryDate', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Rebuild daily summary from actual transactions
   */
  async rebuildDailySummary(
    organizationId: string,
    date: Date,
    machineId?: string,
  ): Promise<TransactionDailySummary> {
    const summaryDate = new Date(date);
    summaryDate.setHours(0, 0, 0, 0);

    const dayStart = new Date(summaryDate);
    const dayEnd = new Date(summaryDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Build transaction query
    const qb = this.transactionRepo.createQueryBuilder('t');
    qb.where('t.organizationId = :organizationId', { organizationId });
    qb.andWhere('t.createdAt BETWEEN :dayStart AND :dayEnd', { dayStart, dayEnd });

    if (machineId) {
      qb.andWhere('t.machineId = :machineId', { machineId });
    }

    const transactions = await qb.getMany();

    // Calculate summary metrics
    const sales = transactions.filter((t) => t.type === TransactionType.SALE && t.status === TransactionStatus.COMPLETED);
    const refunds = transactions.filter((t) => t.type === TransactionType.REFUND && t.status === TransactionStatus.COMPLETED);
    const collections = transactions.filter((t) => t.type === TransactionType.COLLECTION);
    const expenses = transactions.filter((t) => t.type === TransactionType.EXPENSE && t.status === TransactionStatus.COMPLETED);

    const salesAmount = sales.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const salesVatAmount = sales.reduce((sum, t) => sum + Number(t.vatAmount || 0), 0);
    const refundsAmount = refunds.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const collectionsAmount = collections.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const expensesAmount = expenses.reduce((sum, t) => sum + Number(t.totalAmount), 0);

    // By payment method
    let cashAmount = 0;
    let cardAmount = 0;
    let mobileAmount = 0;

    for (const t of sales) {
      const amount = Number(t.totalAmount);
      switch (t.paymentMethod) {
        case PaymentMethod.CASH:
          cashAmount += amount;
          break;
        case PaymentMethod.CARD:
        case PaymentMethod.NFC:
        case PaymentMethod.UZCARD:
        case PaymentMethod.HUMO:
        case PaymentMethod.VISA:
        case PaymentMethod.MASTERCARD:
          cardAmount += amount;
          break;
        case PaymentMethod.PAYME:
        case PaymentMethod.CLICK:
        case PaymentMethod.QR:
          mobileAmount += amount;
          break;
      }
    }

    // Hourly breakdown
    const hourlyMap: Record<number, { count: number; amount: number }> = {};
    for (const t of sales) {
      const hour = t.created_at.getHours();
      if (!hourlyMap[hour]) {
        hourlyMap[hour] = { count: 0, amount: 0 };
      }
      hourlyMap[hour].count++;
      hourlyMap[hour].amount += Number(t.totalAmount);
    }
    const hourlyStats = Object.entries(hourlyMap)
      .map(([hour, data]) => ({ hour: parseInt(hour), ...data }))
      .sort((a, b) => a.hour - b.hour);

    // Top products
    const itemsQb = this.itemRepo.createQueryBuilder('i');
    itemsQb.innerJoin('i.transaction', 't');
    itemsQb.where('t.organizationId = :organizationId', { organizationId });
    itemsQb.andWhere('t.created_at BETWEEN :dayStart AND :dayEnd', { dayStart, dayEnd });
    itemsQb.andWhere('t.status = :status', { status: TransactionStatus.COMPLETED });
    itemsQb.andWhere('t.type = :type', { type: TransactionType.SALE });

    if (machineId) {
      itemsQb.andWhere('t.machineId = :machineId', { machineId });
    }

    itemsQb.select('i.productId', 'productId');
    itemsQb.addSelect('i.productName', 'productName');
    itemsQb.addSelect('SUM(i.quantity)', 'quantity');
    itemsQb.addSelect('SUM(i.totalAmount)', 'amount');
    itemsQb.groupBy('i.productId');
    itemsQb.addGroupBy('i.productName');
    itemsQb.orderBy('amount', 'DESC');
    itemsQb.limit(10);

    const topProductsRaw = await itemsQb.getRawMany();
    const topProducts = topProductsRaw.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      quantity: parseInt(p.quantity) || 0,
      amount: parseFloat(p.amount) || 0,
    }));

    const netAmount = salesAmount - refundsAmount - expensesAmount;

    // Upsert summary: find existing or create new
    let summary = await this.dailySummaryRepo.findOne({
      where: {
        organizationId,
        summaryDate: summaryDate,
        machineId: machineId || undefined,
      },
    });

    if (!summary) {
      summary = this.dailySummaryRepo.create({
        organizationId,
        machineId: machineId || undefined,
        summaryDate,
      } as Partial<TransactionDailySummary>);
    }

    summary.salesCount = sales.length;
    summary.salesAmount = salesAmount;
    summary.salesVatAmount = salesVatAmount;
    summary.cashAmount = cashAmount;
    summary.cardAmount = cardAmount;
    summary.mobileAmount = mobileAmount;
    summary.refundsCount = refunds.length;
    summary.refundsAmount = refundsAmount;
    summary.collectionsCount = collections.length;
    summary.collectionsAmount = collectionsAmount;
    summary.expensesAmount = expensesAmount;
    summary.netAmount = netAmount;
    summary.topProducts = topProducts;
    summary.hourlyStats = hourlyStats;
    summary.calculatedAt = new Date();

    const saved = await this.dailySummaryRepo.save(summary);

    this.logger.log(
      `Daily summary rebuilt for ${summaryDate.toISOString().split('T')[0]}` +
      (machineId ? ` (machine: ${machineId})` : ' (organization total)') +
      `: ${sales.length} sales, ${salesAmount} UZS`,
    );

    return saved;
  }

  // ============================================================================
  // COMMISSIONS
  // ============================================================================

  /**
   * Get paginated commissions for organization
   */
  async getCommissions(
    organizationId: string,
    params: QueryCommissionsDto,
  ) {
    const {
      contractId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = params;

    const qb = this.commissionRepo.createQueryBuilder('c');
    qb.where('c.organizationId = :organizationId', { organizationId });

    if (contractId) {
      qb.andWhere('c.contractId = :contractId', { contractId });
    }

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    if (dateFrom) {
      qb.andWhere('c.periodStart >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('c.periodEnd <= :dateTo', { dateTo });
    }

    const total = await qb.getCount();

    qb.orderBy('c.periodStart', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Calculate commission for a contract over a period
   */
  async calculateCommission(
    organizationId: string,
    contractId: string,
    periodStart: Date,
    periodEnd: Date,
    userId: string,
  ): Promise<Commission> {
    // Get all completed sale transactions for this contract in the period
    const qb = this.transactionRepo.createQueryBuilder('t');
    qb.where('t.organizationId = :organizationId', { organizationId });
    qb.andWhere('t.contractId = :contractId', { contractId });
    qb.andWhere('t.type = :type', { type: TransactionType.SALE });
    qb.andWhere('t.status = :status', { status: TransactionStatus.COMPLETED });
    qb.andWhere('t.createdAt BETWEEN :periodStart AND :periodEnd', { periodStart, periodEnd });

    const transactions = await qb.getMany();

    if (transactions.length === 0) {
      throw new BadRequestException(
        `No completed transactions found for contract ${contractId} in the specified period`,
      );
    }

    const baseAmount = transactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const transactionCount = transactions.length;
    const averageTransaction = baseAmount / transactionCount;

    // Default commission: 10% percentage-based
    // In production, this would come from the contract entity
    const commissionRate = 10;
    const commissionAmount = (baseAmount * commissionRate) / 100;
    const vatRate = 12; // Uzbekistan standard VAT
    const vatAmount = (commissionAmount * vatRate) / 100;
    const totalAmount = commissionAmount + vatAmount;

    const commission = this.commissionRepo.create({
      organizationId,
      contractId,
      periodStart,
      periodEnd,
      baseAmount,
      commissionRate,
      commissionAmount,
      vatAmount,
      totalAmount,
      currency: 'UZS',
      status: CommissionStatus.CALCULATED,
      commissionType: CommissionType.PERCENTAGE,
      calculatedByUserId: userId,
      calculatedAt: new Date(),
      calculationDetails: {
        transactionCount,
        averageTransaction: Math.round(averageTransaction * 100) / 100,
      },
    });

    const saved = await this.commissionRepo.save(commission);

    this.logger.log(
      `Commission calculated for contract ${contractId}: ${commissionAmount} UZS (${commissionRate}% of ${baseAmount} UZS, ${transactionCount} transactions)`,
    );

    this.eventEmitter.emit('commission.calculated', {
      commission: saved,
      organizationId,
      userId,
    });

    return saved;
  }
}
