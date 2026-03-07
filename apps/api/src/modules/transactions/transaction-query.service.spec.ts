import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException } from "@nestjs/common";

import { TransactionQueryService } from "./transaction-query.service";
import {
  Transaction,
  TransactionItem,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from "./entities/transaction.entity";

describe("TransactionQueryService", () => {
  let service: TransactionQueryService;
  let transactionRepo: jest.Mocked<Repository<Transaction>>;
  let _itemRepo: jest.Mocked<Repository<TransactionItem>>;

  const orgId = "org-uuid-1";
  const machineId = "machine-uuid-1";

  const mockTransaction = {
    id: "txn-uuid-1",
    organizationId: orgId,
    machineId,
    type: TransactionType.SALE,
    status: TransactionStatus.COMPLETED,
    amount: 12000,
    totalAmount: 12000,
    quantity: 1,
    currency: "UZS",
    paymentMethod: PaymentMethod.CASH,
    paymentId: null,
    transactionDate: new Date(),
    transactionNumber: "TRX20260301-000001",
    isFiscalized: false,
    metadata: {},
    items: [],
    createdAt: new Date("2026-03-01T10:30:00Z"),
    updatedAt: new Date(),
  } as unknown as Transaction;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockTransaction]),
    getCount: jest.fn().mockResolvedValue(1),
    getManyAndCount: jest.fn().mockResolvedValue([[mockTransaction], 1]),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    // Reset all mocks between tests
    Object.values(mockQueryBuilder).forEach((fn) => {
      if (typeof fn === "function" && "mockClear" in fn) {
        (fn as jest.Mock).mockClear();
      }
    });
    // Re-set the return values after clearing
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.addOrderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.addSelect.mockReturnThis();
    mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
    mockQueryBuilder.innerJoin.mockReturnThis();
    mockQueryBuilder.groupBy.mockReturnThis();
    mockQueryBuilder.addGroupBy.mockReturnThis();
    mockQueryBuilder.limit.mockReturnThis();
    mockQueryBuilder.setParameters.mockReturnThis();
    mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);
    mockQueryBuilder.getCount.mockResolvedValue(1);
    mockQueryBuilder.getRawOne.mockResolvedValue(null);
    mockQueryBuilder.getRawMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionQueryService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(TransactionItem),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionQueryService>(TransactionQueryService);
    transactionRepo = module.get(getRepositoryToken(Transaction));
    _itemRepo = module.get(getRepositoryToken(TransactionItem));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // FIND BY ID
  // ==========================================================================

  describe("findById", () => {
    it("should return transaction with items when found", async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findById("txn-uuid-1");

      expect(result).toEqual(mockTransaction);
      expect(transactionRepo.findOne).toHaveBeenCalledWith({
        where: { id: "txn-uuid-1" },
        relations: ["items"],
      });
    });

    it("should filter by organizationId when provided", async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);

      await service.findById("txn-uuid-1", orgId);

      expect(transactionRepo.findOne).toHaveBeenCalledWith({
        where: { id: "txn-uuid-1", organizationId: orgId },
        relations: ["items"],
      });
    });

    it("should throw NotFoundException when transaction not found", async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(service.findById("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // FIND BY NUMBER
  // ==========================================================================

  describe("findByNumber", () => {
    it("should return transaction by transaction number", async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findByNumber("TRX20260301-000001");

      expect(result).toEqual(mockTransaction);
      expect(transactionRepo.findOne).toHaveBeenCalledWith({
        where: { transactionNumber: "TRX20260301-000001" },
        relations: ["items"],
      });
    });

    it("should filter by organizationId when provided", async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);

      await service.findByNumber("TRX20260301-000001", orgId);

      expect(transactionRepo.findOne).toHaveBeenCalledWith({
        where: {
          transactionNumber: "TRX20260301-000001",
          organizationId: orgId,
        },
        relations: ["items"],
      });
    });

    it("should throw NotFoundException when transaction number not found", async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(service.findByNumber("TRX-UNKNOWN")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // QUERY (PAGINATED + FILTERS)
  // ==========================================================================

  describe("query", () => {
    it("should return paginated results with default params", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      const result = await service.query({ organizationId: orgId });

      expect(result).toEqual({
        data: [mockTransaction],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "t.organizationId = :organizationId",
        { organizationId: orgId },
      );
    });

    it("should apply machineId filter", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.query({ organizationId: orgId, machineId });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.machineId = :machineId",
        { machineId },
      );
    });

    it("should apply status filter array", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.query({
        organizationId: orgId,
        status: [TransactionStatus.COMPLETED, TransactionStatus.PENDING],
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.status IN (:...status)",
        { status: [TransactionStatus.COMPLETED, TransactionStatus.PENDING] },
      );
    });

    it("should apply payment method filter", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.query({
        organizationId: orgId,
        paymentMethod: [PaymentMethod.CASH, PaymentMethod.PAYME],
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.paymentMethod IN (:...paymentMethod)",
        { paymentMethod: [PaymentMethod.CASH, PaymentMethod.PAYME] },
      );
    });

    it("should apply date range filters", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);
      const dateFrom = new Date("2026-03-01");
      const dateTo = new Date("2026-03-31");

      await service.query({ organizationId: orgId, dateFrom, dateTo });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.createdAt >= :dateFrom",
        { dateFrom },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.createdAt <= :dateTo",
        { dateTo },
      );
    });

    it("should apply amount range filters", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.query({
        organizationId: orgId,
        minAmount: 5000,
        maxAmount: 50000,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.totalAmount >= :minAmount",
        { minAmount: 5000 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.totalAmount <= :maxAmount",
        { maxAmount: 50000 },
      );
    });

    it("should apply hasError filter", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.query({ organizationId: orgId, hasError: true });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.metadata->>'failureReason' IS NOT NULL",
      );
    });

    it("should handle custom pagination and sorting", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(50);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.query({
        organizationId: orgId,
        page: 3,
        limit: 10,
        sortBy: "totalAmount",
        sortOrder: "ASC",
      });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20); // (3-1)*10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        "t.totalAmount",
        "ASC",
      );
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5); // ceil(50/10)
    });

    it("should return empty data set with correct pagination", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.query({ organizationId: orgId });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // ==========================================================================
  // FIND ALL
  // ==========================================================================

  describe("findAll", () => {
    it("should delegate to query with defaults", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      const result = await service.findAll(orgId);

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("page", 1);
      expect(result).toHaveProperty("limit", 50);
    });

    it("should accept custom page and limit", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(100);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll(orgId, { page: 2, limit: 25 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
    });
  });

  // ==========================================================================
  // GET STATISTICS
  // ==========================================================================

  describe("getStatistics", () => {
    it("should return computed statistics for date range", async () => {
      const completedTxn1 = {
        ...mockTransaction,
        id: "txn-1",
        status: TransactionStatus.COMPLETED,
        totalAmount: 10000,
        paymentMethod: PaymentMethod.CASH,
        createdAt: new Date("2026-03-01T10:00:00Z"),
      } as any;
      const completedTxn2 = {
        ...mockTransaction,
        id: "txn-2",
        status: TransactionStatus.COMPLETED,
        totalAmount: 15000,
        paymentMethod: PaymentMethod.PAYME,
        createdAt: new Date("2026-03-01T14:00:00Z"),
      } as any;
      const pendingTxn = {
        ...mockTransaction,
        id: "txn-3",
        status: TransactionStatus.PENDING,
        totalAmount: 8000,
        paymentMethod: null,
        createdAt: new Date("2026-03-01T16:00:00Z"),
      } as any;

      mockQueryBuilder.getMany.mockResolvedValue([
        completedTxn1,
        completedTxn2,
        pendingTxn,
      ]);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          productId: "p1",
          productName: "Coffee",
          quantity: "5",
          revenue: "50000",
        },
      ]);

      const result = await service.getStatistics(
        orgId,
        new Date("2026-03-01"),
        new Date("2026-03-31"),
      );

      expect(result.totalTransactions).toBe(3);
      expect(result.totalRevenue).toBe(25000); // 10000 + 15000
      expect(result.averageTransaction).toBe(12500); // 25000 / 2
      expect(result.byStatus[TransactionStatus.COMPLETED]).toBe(2);
      expect(result.byStatus[TransactionStatus.PENDING]).toBe(1);
      expect(result.byPaymentMethod[PaymentMethod.CASH]).toBe(1);
      expect(result.byPaymentMethod[PaymentMethod.PAYME]).toBe(1);
      expect(result.successRate).toBeCloseTo(66.67, 1);
      expect(result.topProducts).toHaveLength(1);
      expect(result.topProducts[0].quantity).toBe(5);
      expect(result.topProducts[0].revenue).toBe(50000);
    });

    it("should return zero averages when no completed transactions", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.getStatistics(
        orgId,
        new Date("2026-03-01"),
        new Date("2026-03-31"),
      );

      expect(result.totalTransactions).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averageTransaction).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.topProducts).toEqual([]);
    });

    it("should filter by machineId when provided", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.getStatistics(
        orgId,
        new Date("2026-03-01"),
        new Date("2026-03-31"),
        machineId,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.machineId = :machineId",
        { machineId },
      );
    });
  });

  // ==========================================================================
  // FIND BY CUSTOMER PHONE
  // ==========================================================================

  describe("findByCustomerPhone", () => {
    it("should query transactions by customer phone in metadata", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      const result = await service.findByCustomerPhone("+998901234567", orgId);

      expect(result).toEqual([mockTransaction]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.metadata->>'customerPhone' = :phone",
        { phone: "+998901234567" },
      );
    });

    it("should return empty array when no transactions found", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findByCustomerPhone("+998000000000", orgId);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET TODAY TRANSACTIONS
  // ==========================================================================

  describe("getTodayTransactions", () => {
    it("should return paginated transactions for today", async () => {
      transactionRepo.findAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.getTodayTransactions(machineId);

      expect(result.data).toEqual([mockTransaction]);
      expect(result.total).toBe(1);
      expect(transactionRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ machineId }),
          relations: ["items"],
          order: { createdAt: "DESC" },
        }),
      );
    });

    it("should cap limit at 100", async () => {
      transactionRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getTodayTransactions(machineId, 1, 200);

      expect(transactionRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it("should handle empty results", async () => {
      transactionRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getTodayTransactions(machineId);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==========================================================================
  // GET REVENUE SUMMARY
  // ==========================================================================

  describe("getRevenueSummary", () => {
    it("should return revenue breakdown by payment type", async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({
        total: "500000",
        cash: "200000",
        card: "200000",
        mobile: "100000",
        count: "42",
      });

      const result = await service.getRevenueSummary(
        orgId,
        new Date("2026-03-01"),
        new Date("2026-03-31"),
      );

      expect(result.total).toBe(500000);
      expect(result.cash).toBe(200000);
      expect(result.card).toBe(200000);
      expect(result.mobile).toBe(100000);
      expect(result.count).toBe(42);
    });

    it("should return zeros when no transactions found", async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue(null);

      const result = await service.getRevenueSummary(
        orgId,
        new Date("2026-03-01"),
        new Date("2026-03-31"),
      );

      expect(result.total).toBe(0);
      expect(result.cash).toBe(0);
      expect(result.card).toBe(0);
      expect(result.mobile).toBe(0);
      expect(result.count).toBe(0);
    });

    it("should return zeros when result values are empty strings", async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({
        total: "",
        cash: "",
        card: "",
        mobile: "",
        count: "",
      });

      const result = await service.getRevenueSummary(
        orgId,
        new Date("2026-03-01"),
        new Date("2026-03-31"),
      );

      expect(result.total).toBe(0);
      expect(result.cash).toBe(0);
      expect(result.count).toBe(0);
    });
  });

  // ==========================================================================
  // GENERATE TRANSACTION NUMBER
  // ==========================================================================

  describe("generateTransactionNumber", () => {
    it("should generate a sequential transaction number", async () => {
      transactionRepo.count.mockResolvedValue(5);

      const result = await service.generateTransactionNumber(orgId);

      // Format: TRXYYYYMMdd-NNNNNN
      expect(result).toMatch(/^TRX\d{8}-000006$/);
    });

    it("should start numbering from 1 when no transactions today", async () => {
      transactionRepo.count.mockResolvedValue(0);

      const result = await service.generateTransactionNumber(orgId);

      expect(result).toMatch(/^TRX\d{8}-000001$/);
    });
  });

  // ==========================================================================
  // GET TOTAL PAID
  // ==========================================================================

  describe("getTotalPaid", () => {
    it("should return totalAmount for completed transaction", async () => {
      transactionRepo.findOne.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
        totalAmount: 25000,
      } as any);

      const result = await service.getTotalPaid("txn-uuid-1");

      expect(result).toBe(25000);
    });

    it("should return 0 for non-completed transaction", async () => {
      transactionRepo.findOne.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.PENDING,
        totalAmount: 25000,
      } as any);

      const result = await service.getTotalPaid("txn-uuid-1");

      expect(result).toBe(0);
    });

    it("should return 0 when transaction not found", async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      const result = await service.getTotalPaid("non-existent");

      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // GET TOTAL REFUNDED
  // ==========================================================================

  describe("getTotalRefunded", () => {
    it("should return sum of completed refund amounts", async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: "15000" });

      const result = await service.getTotalRefunded("txn-uuid-1");

      expect(result).toBe(15000);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("r.type = :type", {
        type: TransactionType.REFUND,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "r.status = :status",
        { status: TransactionStatus.COMPLETED },
      );
    });

    it("should return 0 when no refunds exist", async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: null });

      const result = await service.getTotalRefunded("txn-uuid-1");

      expect(result).toBe(0);
    });
  });
});
