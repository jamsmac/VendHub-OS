/**
 * Transaction Query Service
 * Handles all read operations: find, query, statistics, revenue summaries
 * Split from transactions.service.ts
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import {
  Transaction,
  TransactionItem,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from "./entities/transaction.entity";
import {
  QueryTransactionsDto,
  TransactionStatistics,
} from "./transactions.service";

@Injectable()
export class TransactionQueryService {
  private readonly logger = new Logger(TransactionQueryService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private itemRepo: Repository<TransactionItem>,
  ) {}

  async findById(id: string, organizationId?: string): Promise<Transaction> {
    const where: Record<string, unknown> = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    const transaction = await this.transactionRepo.findOne({
      where,
      relations: ["items"],
    });

    if (!transaction) {
      throw new NotFoundException(`Транзакция ${id} не найдена`);
    }

    return transaction;
  }

  async findByNumber(
    transactionNumber: string,
    organizationId?: string,
  ): Promise<Transaction> {
    const where: Record<string, unknown> = { transactionNumber };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    const transaction = await this.transactionRepo.findOne({
      where,
      relations: ["items"],
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
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = query;

    const qb = this.transactionRepo.createQueryBuilder("t");
    qb.where("t.organizationId = :organizationId", { organizationId });

    if (machineId) {
      qb.andWhere("t.machineId = :machineId", { machineId });
    }

    if (query.operatorId) {
      qb.andWhere("t.userId = :operatorId", { operatorId: query.operatorId });
    }

    if (status?.length) {
      qb.andWhere("t.status IN (:...status)", { status });
    }

    if (paymentMethod?.length) {
      qb.andWhere("t.paymentMethod IN (:...paymentMethod)", { paymentMethod });
    }

    if (dateFrom) {
      qb.andWhere("t.createdAt >= :dateFrom", { dateFrom });
    }

    if (dateTo) {
      qb.andWhere("t.createdAt <= :dateTo", { dateTo });
    }

    if (minAmount !== undefined) {
      qb.andWhere("t.totalAmount >= :minAmount", { minAmount });
    }

    if (maxAmount !== undefined) {
      qb.andWhere("t.totalAmount <= :maxAmount", { maxAmount });
    }

    if (hasError !== undefined) {
      if (hasError) {
        qb.andWhere("t.metadata->>'failureReason' IS NOT NULL");
      } else {
        qb.andWhere("t.metadata->>'failureReason' IS NULL");
      }
    }

    const total = await qb.getCount();

    qb.leftJoinAndSelect("t.items", "items");
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
    const qb = this.transactionRepo.createQueryBuilder("t");
    qb.where("t.organizationId = :organizationId", { organizationId });
    qb.andWhere("t.createdAt BETWEEN :dateFrom AND :dateTo", {
      dateFrom,
      dateTo,
    });

    if (machineId) {
      qb.andWhere("t.machineId = :machineId", { machineId });
    }

    const transactions = await qb.getMany();

    const totalTransactions = transactions.length;
    const completedTransactions = transactions.filter(
      (t) => t.status === TransactionStatus.COMPLETED,
    );
    const totalRevenue = completedTransactions.reduce(
      (sum, t) => sum + Number(t.totalAmount),
      0,
    );
    const averageTransaction =
      completedTransactions.length > 0
        ? totalRevenue / completedTransactions.length
        : 0;

    const byStatus: Record<string, number> = {};
    const byPaymentMethod: Record<string, number> = {};
    const byHourMap: Record<number, { count: number; revenue: number }> = {};

    for (const t of transactions) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      if (t.paymentMethod) {
        byPaymentMethod[t.paymentMethod] =
          (byPaymentMethod[t.paymentMethod] || 0) + 1;
      }

      const hour = t.createdAt.getHours();
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
    const itemsQb = this.itemRepo.createQueryBuilder("i");
    itemsQb.innerJoin("i.transaction", "t");
    itemsQb.where("t.organizationId = :organizationId", { organizationId });
    itemsQb.andWhere("t.createdAt BETWEEN :dateFrom AND :dateTo", {
      dateFrom,
      dateTo,
    });
    itemsQb.andWhere("t.status = :status", {
      status: TransactionStatus.COMPLETED,
    });
    itemsQb.select("i.productId", "productId");
    itemsQb.addSelect("i.productName", "productName");
    itemsQb.addSelect("SUM(i.quantity)", "quantity");
    itemsQb.addSelect("SUM(i.totalAmount)", "revenue");
    itemsQb.groupBy("i.productId");
    itemsQb.addGroupBy("i.productName");
    itemsQb.orderBy("revenue", "DESC");
    itemsQb.limit(10);

    const topProducts = await itemsQb.getRawMany();

    const successRate =
      totalTransactions > 0
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

  /**
   * Find all transactions for organization (alias for query)
   */
  async findAll(
    organizationId: string,
    options?: { page?: number; limit?: number },
  ) {
    return this.query({
      organizationId,
      page: options?.page || 1,
      limit: options?.limit || 50,
    });
  }

  /**
   * Get transactions for customer by phone
   */
  async findByCustomerPhone(
    phone: string,
    organizationId: string,
    limit = 20,
  ): Promise<Transaction[]> {
    return this.transactionRepo
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.items", "items")
      .where("t.organizationId = :organizationId", { organizationId })
      .andWhere("t.metadata->>'customerPhone' = :phone", { phone })
      .orderBy("t.createdAt", "DESC")
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
        createdAt: Between(today, new Date()),
      },
      relations: ["items"],
      order: { createdAt: "DESC" },
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
      PaymentMethod.CARD,
      PaymentMethod.NFC,
      PaymentMethod.UZCARD,
      PaymentMethod.HUMO,
      PaymentMethod.VISA,
      PaymentMethod.MASTERCARD,
    ];
    const mobileMethods = [
      PaymentMethod.PAYME,
      PaymentMethod.CLICK,
      PaymentMethod.QR,
    ];

    const result = await this.transactionRepo
      .createQueryBuilder("t")
      .select("COUNT(*)", "count")
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.payment_method IN (:...cashMethods) THEN t.total_amount ELSE 0 END), 0)`,
        "cash",
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.payment_method IN (:...cardMethods) THEN t.total_amount ELSE 0 END), 0)`,
        "card",
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.payment_method IN (:...mobileMethods) THEN t.total_amount ELSE 0 END), 0)`,
        "mobile",
      )
      .addSelect("COALESCE(SUM(t.total_amount), 0)", "total")
      .where("t.organization_id = :organizationId", { organizationId })
      .andWhere("t.status = :status", { status: TransactionStatus.COMPLETED })
      .andWhere("t.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      })
      .setParameters({ cashMethods, cardMethods, mobileMethods })
      .getRawOne();

    return {
      total: parseFloat(result?.total || "0"),
      cash: parseFloat(result?.cash || "0"),
      card: parseFloat(result?.card || "0"),
      mobile: parseFloat(result?.mobile || "0"),
      count: parseInt(result?.count || "0"),
    };
  }

  async generateTransactionNumber(organizationId: string): Promise<string> {
    const date = new Date();
    const prefix = `TRX${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

    const count = await this.transactionRepo.count({
      where: {
        organizationId,
        createdAt: Between(
          new Date(date.setHours(0, 0, 0, 0)),
          new Date(date.setHours(23, 59, 59, 999)),
        ),
      },
    });

    return `${prefix}-${String(count + 1).padStart(6, "0")}`;
  }

  async getTotalPaid(transactionId: string): Promise<number> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
    });
    if (transaction && transaction.status === TransactionStatus.COMPLETED) {
      return Number(transaction.totalAmount);
    }
    return 0;
  }

  async getTotalRefunded(transactionId: string): Promise<number> {
    const result = await this.transactionRepo
      .createQueryBuilder("r")
      .where("r.originalTransactionId = :transactionId", { transactionId })
      .andWhere("r.type = :type", { type: TransactionType.REFUND })
      .andWhere("r.status = :status", { status: TransactionStatus.COMPLETED })
      .select("SUM(r.amount)", "total")
      .getRawOne();

    return parseFloat(result?.total || "0");
  }
}
