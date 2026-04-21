/**
 * Transaction Reconcile Service
 * Handles collections, daily summaries, and commissions
 * Split from transactions.service.ts
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
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
} from "./entities/transaction.entity";
import {
  CreateCollectionRecordDto,
  QueryCollectionRecordsDto,
} from "./dto/collection-record.dto";
import {
  QueryDailySummariesDto,
  TransactionQueryCommissionsDto,
} from "./dto/daily-summary-query.dto";

@Injectable()
export class TransactionReconcileService {
  private readonly logger = new Logger(TransactionReconcileService.name);

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

    const qb = this.collectionRecordRepo.createQueryBuilder("cr");
    qb.where("cr.organizationId = :organizationId", { organizationId });

    if (machineId) {
      qb.andWhere("cr.machineId = :machineId", { machineId });
    }

    if (collectedByUserId) {
      qb.andWhere("cr.collectedByUserId = :collectedByUserId", {
        collectedByUserId,
      });
    }

    if (dateFrom) {
      qb.andWhere("cr.collectedAt >= :dateFrom", { dateFrom });
    }

    if (dateTo) {
      qb.andWhere("cr.collectedAt <= :dateTo", { dateTo });
    }

    if (isVerified !== undefined) {
      qb.andWhere("cr.isVerified = :isVerified", { isVerified });
    }

    const total = await qb.getCount();

    qb.orderBy("cr.collectedAt", "DESC");
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

    if (
      data.expectedTotalAmount !== undefined &&
      data.expectedTotalAmount !== null
    ) {
      difference = data.totalAmount - data.expectedTotalAmount;
      differencePercent =
        data.expectedTotalAmount > 0
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
      differencePercent: (differencePercent !== null
        ? Math.round(differencePercent * 100) / 100
        : undefined) as number,
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

    const saved = (await this.collectionRecordRepo.save(
      record,
    )) as CollectionRecord;

    this.logger.log(
      `Collection record created for machine ${data.machineId}: ${data.totalAmount} UZS (diff: ${difference ?? "N/A"})`,
    );

    this.eventEmitter.emit("collection.created", {
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
      throw new NotFoundException(
        `Collection record ${collectionId} not found`,
      );
    }

    if (record.isVerified) {
      throw new BadRequestException("Collection record is already verified");
    }

    record.isVerified = true;
    record.verifiedByUserId = userId;
    record.verifiedAt = new Date();

    if (notes) {
      record.notes = record.notes
        ? `${record.notes}\nVerification: ${notes}`
        : `Verification: ${notes}`;
    }

    const saved = await this.collectionRecordRepo.save(record);

    this.logger.log(`Collection ${collectionId} verified by user ${userId}`);

    this.eventEmitter.emit("collection.verified", {
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
    const { machineId, dateFrom, dateTo, page = 1, limit = 20 } = params;

    const qb = this.dailySummaryRepo.createQueryBuilder("ds");
    qb.where("ds.organizationId = :organizationId", { organizationId });

    if (machineId) {
      qb.andWhere("ds.machineId = :machineId", { machineId });
    }

    if (dateFrom) {
      qb.andWhere("ds.summaryDate >= :dateFrom", { dateFrom });
    }

    if (dateTo) {
      qb.andWhere("ds.summaryDate <= :dateTo", { dateTo });
    }

    const total = await qb.getCount();

    qb.orderBy("ds.summaryDate", "DESC");
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
    const qb = this.transactionRepo.createQueryBuilder("t");
    qb.where("t.organizationId = :organizationId", { organizationId });
    qb.andWhere("t.createdAt BETWEEN :dayStart AND :dayEnd", {
      dayStart,
      dayEnd,
    });

    if (machineId) {
      qb.andWhere("t.machineId = :machineId", { machineId });
    }

    const transactions = await qb.getMany();

    // Calculate summary metrics
    const sales = transactions.filter(
      (t) =>
        t.type === TransactionType.SALE &&
        t.status === TransactionStatus.COMPLETED,
    );
    const refunds = transactions.filter(
      (t) =>
        t.type === TransactionType.REFUND &&
        t.status === TransactionStatus.COMPLETED,
    );
    const collections = transactions.filter(
      (t) => t.type === TransactionType.COLLECTION,
    );
    const expenses = transactions.filter(
      (t) =>
        t.type === TransactionType.EXPENSE &&
        t.status === TransactionStatus.COMPLETED,
    );

    const salesAmount = sales.reduce(
      (sum, t) => sum + Number(t.totalAmount),
      0,
    );
    const salesVatAmount = sales.reduce(
      (sum, t) => sum + Number(t.vatAmount || 0),
      0,
    );
    const refundsAmount = refunds.reduce(
      (sum, t) => sum + Number(t.totalAmount),
      0,
    );
    const collectionsAmount = collections.reduce(
      (sum, t) => sum + Number(t.totalAmount),
      0,
    );
    const expensesAmount = expenses.reduce(
      (sum, t) => sum + Number(t.totalAmount),
      0,
    );

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
      const hour = t.createdAt.getHours();
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
    const itemsQb = this.itemRepo.createQueryBuilder("i");
    itemsQb.innerJoin("i.transaction", "t");
    itemsQb.where("t.organizationId = :organizationId", { organizationId });
    itemsQb.andWhere("t.createdAt BETWEEN :dayStart AND :dayEnd", {
      dayStart,
      dayEnd,
    });
    itemsQb.andWhere("t.status = :status", {
      status: TransactionStatus.COMPLETED,
    });
    itemsQb.andWhere("t.type = :type", { type: TransactionType.SALE });

    if (machineId) {
      itemsQb.andWhere("t.machineId = :machineId", { machineId });
    }

    itemsQb.select("i.productId", "productId");
    itemsQb.addSelect("i.productName", "productName");
    itemsQb.addSelect("SUM(i.quantity)", "quantity");
    itemsQb.addSelect("SUM(i.totalAmount)", "amount");
    itemsQb.groupBy("i.productId");
    itemsQb.addGroupBy("i.productName");
    itemsQb.orderBy("amount", "DESC");
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
    const summaryWhere: FindOptionsWhere<TransactionDailySummary> = {
      organizationId,
      summaryDate,
    };
    if (machineId) summaryWhere.machineId = machineId;
    let summary = await this.dailySummaryRepo.findOne({
      where: summaryWhere,
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
      `Daily summary rebuilt for ${summaryDate.toISOString().split("T")[0]}` +
        (machineId ? ` (machine: ${machineId})` : " (organization total)") +
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
    params: TransactionQueryCommissionsDto,
  ) {
    const {
      contractId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = params;

    const qb = this.commissionRepo.createQueryBuilder("c");
    qb.where("c.organizationId = :organizationId", { organizationId });

    if (contractId) {
      qb.andWhere("c.contractId = :contractId", { contractId });
    }

    if (status) {
      qb.andWhere("c.status = :status", { status });
    }

    if (dateFrom) {
      qb.andWhere("c.periodStart >= :dateFrom", { dateFrom });
    }

    if (dateTo) {
      qb.andWhere("c.periodEnd <= :dateTo", { dateTo });
    }

    const total = await qb.getCount();

    qb.orderBy("c.periodStart", "DESC");
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
    const qb = this.transactionRepo.createQueryBuilder("t");
    qb.where("t.organizationId = :organizationId", { organizationId });
    qb.andWhere("t.contractId = :contractId", { contractId });
    qb.andWhere("t.type = :type", { type: TransactionType.SALE });
    qb.andWhere("t.status = :status", { status: TransactionStatus.COMPLETED });
    qb.andWhere("t.createdAt BETWEEN :periodStart AND :periodEnd", {
      periodStart,
      periodEnd,
    });

    const transactions = await qb.getMany();

    if (transactions.length === 0) {
      throw new BadRequestException(
        `No completed transactions found for contract ${contractId} in the specified period`,
      );
    }

    const baseAmount = transactions.reduce(
      (sum, t) => sum + Number(t.totalAmount),
      0,
    );
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
      currency: "UZS",
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

    this.eventEmitter.emit("commission.calculated", {
      commission: saved,
      organizationId,
      userId,
    });

    return saved;
  }
}
