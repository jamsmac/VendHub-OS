import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { TransactionReconcileService } from "./transaction-reconcile.service";
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

describe("TransactionReconcileService", () => {
  let service: TransactionReconcileService;
  let _transactionRepo: jest.Mocked<Repository<Transaction>>;
  let _itemRepo: jest.Mocked<Repository<TransactionItem>>;
  let collectionRecordRepo: jest.Mocked<Repository<CollectionRecord>>;
  let dailySummaryRepo: jest.Mocked<Repository<TransactionDailySummary>>;
  let commissionRepo: jest.Mocked<Repository<Commission>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const machineId = "machine-uuid-1";

  const mockCollectionRecord = {
    id: "col-uuid-1",
    organizationId: orgId,
    machineId,
    collectedByUserId: userId,
    cashAmount: 500000,
    coinAmount: 50000,
    totalAmount: 550000,
    expectedCashAmount: 510000,
    expectedCoinAmount: 48000,
    expectedTotalAmount: 558000,
    difference: -8000,
    differencePercent: -1.43,
    isVerified: false,
    verifiedByUserId: null,
    verifiedAt: null,
    notes: null,
    collectedAt: new Date("2026-03-01T10:00:00Z"),
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as CollectionRecord;

  const mockDailySummary = {
    id: "summary-uuid-1",
    organizationId: orgId,
    machineId: null,
    summaryDate: new Date("2026-03-01"),
    salesCount: 10,
    salesAmount: 120000,
    salesVatAmount: 14400,
    cashAmount: 60000,
    cardAmount: 40000,
    mobileAmount: 20000,
    refundsCount: 1,
    refundsAmount: 12000,
    collectionsCount: 0,
    collectionsAmount: 0,
    expensesAmount: 0,
    netAmount: 108000,
    topProducts: [],
    hourlyStats: [],
    calculatedAt: new Date(),
  } as unknown as TransactionDailySummary;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    // Reset all mock return values
    Object.values(mockQueryBuilder).forEach((fn) => {
      if (typeof fn === "function" && "mockClear" in fn) {
        (fn as jest.Mock).mockClear();
      }
    });
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.addSelect.mockReturnThis();
    mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
    mockQueryBuilder.innerJoin.mockReturnThis();
    mockQueryBuilder.groupBy.mockReturnThis();
    mockQueryBuilder.addGroupBy.mockReturnThis();
    mockQueryBuilder.limit.mockReturnThis();
    mockQueryBuilder.getMany.mockResolvedValue([]);
    mockQueryBuilder.getCount.mockResolvedValue(0);
    mockQueryBuilder.getRawMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionReconcileService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
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
        {
          provide: getRepositoryToken(CollectionRecord),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(TransactionDailySummary),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Commission),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionReconcileService>(
      TransactionReconcileService,
    );
    _transactionRepo = module.get(getRepositoryToken(Transaction));
    _itemRepo = module.get(getRepositoryToken(TransactionItem));
    collectionRecordRepo = module.get(getRepositoryToken(CollectionRecord));
    dailySummaryRepo = module.get(getRepositoryToken(TransactionDailySummary));
    commissionRepo = module.get(getRepositoryToken(Commission));
    eventEmitter = module.get(EventEmitter2);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // COLLECTION RECORDS — GET
  // ==========================================================================

  describe("getCollectionRecords", () => {
    it("should return paginated collection records for organization", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockCollectionRecord]);

      const result = await service.getCollectionRecords(orgId, {});

      expect(result).toEqual({
        data: [mockCollectionRecord],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "cr.organizationId = :organizationId",
        { organizationId: orgId },
      );
    });

    it("should apply machineId and date filters", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);
      const dateFrom = new Date("2026-03-01");
      const dateTo = new Date("2026-03-31");

      await service.getCollectionRecords(orgId, {
        machineId,
        dateFrom,
        dateTo,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "cr.machineId = :machineId",
        { machineId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "cr.collectedAt >= :dateFrom",
        { dateFrom },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "cr.collectedAt <= :dateTo",
        { dateTo },
      );
    });

    it("should filter by verification status", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getCollectionRecords(orgId, { isVerified: false });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "cr.isVerified = :isVerified",
        { isVerified: false },
      );
    });

    it("should filter by collectedByUserId", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getCollectionRecords(orgId, {
        collectedByUserId: userId,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "cr.collectedByUserId = :collectedByUserId",
        { collectedByUserId: userId },
      );
    });

    it("should return empty results correctly", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getCollectionRecords(orgId, {});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // ==========================================================================
  // COLLECTION RECORDS — CREATE
  // ==========================================================================

  describe("createCollectionRecord", () => {
    it("should create a collection record with discrepancy calculation", async () => {
      collectionRecordRepo.create.mockReturnValue(mockCollectionRecord);
      collectionRecordRepo.save.mockResolvedValue(mockCollectionRecord);

      const result = await service.createCollectionRecord(orgId, userId, {
        machineId,
        cashAmount: 500000,
        coinAmount: 50000,
        totalAmount: 550000,
        expectedCashAmount: 510000,
        expectedCoinAmount: 48000,
        expectedTotalAmount: 558000,
        collectedAt: new Date("2026-03-01T10:00:00Z"),
      });

      expect(result).toEqual(mockCollectionRecord);
      expect(collectionRecordRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          machineId,
          collectedByUserId: userId,
          totalAmount: 550000,
          difference: -8000, // 550000 - 558000
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "collection.created",
        expect.objectContaining({
          collectionRecord: mockCollectionRecord,
          organizationId: orgId,
          userId,
        }),
      );
    });

    it("should handle collection without expected amounts (no discrepancy)", async () => {
      const noDiscrepancyRecord = {
        ...mockCollectionRecord,
        expectedTotalAmount: null,
        difference: null,
        differencePercent: null,
      } as any;
      collectionRecordRepo.create.mockReturnValue(noDiscrepancyRecord);
      collectionRecordRepo.save.mockResolvedValue(noDiscrepancyRecord);

      await service.createCollectionRecord(orgId, userId, {
        machineId,
        cashAmount: 500000,
        coinAmount: 50000,
        totalAmount: 550000,
        collectedAt: new Date("2026-03-01T10:00:00Z"),
      });

      // When expectedTotalAmount is undefined, difference should be null
      expect(collectionRecordRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          difference: null,
        }),
      );
    });

    it("should calculate zero differencePercent when expected is zero", async () => {
      collectionRecordRepo.create.mockImplementation((data) => data as any);
      collectionRecordRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      await service.createCollectionRecord(orgId, userId, {
        machineId,
        cashAmount: 5000,
        coinAmount: 0,
        totalAmount: 5000,
        expectedTotalAmount: 0,
        collectedAt: new Date("2026-03-01T10:00:00Z"),
      });

      expect(collectionRecordRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          difference: 5000,
          differencePercent: 0,
        }),
      );
    });
  });

  // ==========================================================================
  // VERIFY COLLECTION
  // ==========================================================================

  describe("verifyCollection", () => {
    it("should verify an unverified collection record", async () => {
      const unverifiedRecord = {
        ...mockCollectionRecord,
        isVerified: false,
        notes: null,
      } as any;
      collectionRecordRepo.findOne.mockResolvedValue(unverifiedRecord);
      collectionRecordRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      const result = await service.verifyCollection(
        "col-uuid-1",
        "verifier-uuid",
        "Amounts confirmed",
      );

      expect(result.isVerified).toBe(true);
      expect(result.verifiedByUserId).toBe("verifier-uuid");
      expect(result.verifiedAt).toBeInstanceOf(Date);
      expect(result.notes).toContain("Verification: Amounts confirmed");
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "collection.verified",
        expect.objectContaining({
          verifiedByUserId: "verifier-uuid",
        }),
      );
    });

    it("should append verification notes to existing notes", async () => {
      const recordWithNotes = {
        ...mockCollectionRecord,
        isVerified: false,
        notes: "Initial notes from operator",
      } as any;
      collectionRecordRepo.findOne.mockResolvedValue(recordWithNotes);
      collectionRecordRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      const result = await service.verifyCollection(
        "col-uuid-1",
        "verifier-uuid",
        "All good",
      );

      expect(result.notes).toBe(
        "Initial notes from operator\nVerification: All good",
      );
    });

    it("should throw NotFoundException for non-existent collection", async () => {
      collectionRecordRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyCollection("non-existent", userId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for already verified collection", async () => {
      collectionRecordRepo.findOne.mockResolvedValue({
        ...mockCollectionRecord,
        isVerified: true,
      } as any);

      await expect(
        service.verifyCollection("col-uuid-1", userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // DAILY SUMMARIES — GET
  // ==========================================================================

  describe("getDailySummaries", () => {
    it("should return paginated daily summaries", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockDailySummary]);

      const result = await service.getDailySummaries(orgId, {});

      expect(result).toEqual({
        data: [mockDailySummary],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it("should apply machineId and date filters", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);
      const dateFrom = new Date("2026-03-01");
      const dateTo = new Date("2026-03-31");

      await service.getDailySummaries(orgId, {
        machineId,
        dateFrom,
        dateTo,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "ds.machineId = :machineId",
        { machineId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "ds.summaryDate >= :dateFrom",
        { dateFrom },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "ds.summaryDate <= :dateTo",
        { dateTo },
      );
    });

    it("should return empty results correctly", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getDailySummaries(orgId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // ==========================================================================
  // REBUILD DAILY SUMMARY
  // ==========================================================================

  describe("rebuildDailySummary", () => {
    it("should rebuild summary from actual transactions", async () => {
      const saleTxn = {
        id: "txn-1",
        type: TransactionType.SALE,
        status: TransactionStatus.COMPLETED,
        totalAmount: 50000,
        vatAmount: 6000,
        paymentMethod: PaymentMethod.CASH,
        createdAt: new Date("2026-03-01T10:00:00Z"),
      } as any;
      const refundTxn = {
        id: "txn-2",
        type: TransactionType.REFUND,
        status: TransactionStatus.COMPLETED,
        totalAmount: 10000,
        createdAt: new Date("2026-03-01T14:00:00Z"),
      } as any;

      mockQueryBuilder.getMany.mockResolvedValue([saleTxn, refundTxn]);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          productId: "p1",
          productName: "Coffee",
          quantity: "3",
          amount: "36000",
        },
      ]);
      dailySummaryRepo.findOne.mockResolvedValue(null);
      dailySummaryRepo.create.mockImplementation((data) => data as any);
      dailySummaryRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      const result = await service.rebuildDailySummary(
        orgId,
        new Date("2026-03-01"),
      );

      expect(result.salesCount).toBe(1);
      expect(result.salesAmount).toBe(50000);
      expect(result.salesVatAmount).toBe(6000);
      expect(result.cashAmount).toBe(50000);
      expect(result.refundsCount).toBe(1);
      expect(result.refundsAmount).toBe(10000);
      expect(result.netAmount).toBe(40000); // 50000 - 10000
      expect(result.topProducts).toHaveLength(1);
      expect(result.topProducts[0].productName).toBe("Coffee");
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it("should update existing summary instead of creating new", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      dailySummaryRepo.findOne.mockResolvedValue(mockDailySummary);
      dailySummaryRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      await service.rebuildDailySummary(orgId, new Date("2026-03-01"));

      // Should NOT call create since existing summary found
      expect(dailySummaryRepo.create).not.toHaveBeenCalled();
      expect(dailySummaryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockDailySummary.id,
        }),
      );
    });

    it("should filter by machineId when provided", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      dailySummaryRepo.findOne.mockResolvedValue(null);
      dailySummaryRepo.create.mockImplementation((data) => data as any);
      dailySummaryRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      await service.rebuildDailySummary(
        orgId,
        new Date("2026-03-01"),
        machineId,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.machineId = :machineId",
        { machineId },
      );
    });

    it("should categorize payment methods correctly", async () => {
      const cashTxn = {
        type: TransactionType.SALE,
        status: TransactionStatus.COMPLETED,
        totalAmount: 10000,
        vatAmount: 0,
        paymentMethod: PaymentMethod.CASH,
        createdAt: new Date("2026-03-01T09:00:00Z"),
      } as any;
      const cardTxn = {
        type: TransactionType.SALE,
        status: TransactionStatus.COMPLETED,
        totalAmount: 20000,
        vatAmount: 0,
        paymentMethod: PaymentMethod.UZCARD,
        createdAt: new Date("2026-03-01T10:00:00Z"),
      } as any;
      const mobileTxn = {
        type: TransactionType.SALE,
        status: TransactionStatus.COMPLETED,
        totalAmount: 15000,
        vatAmount: 0,
        paymentMethod: PaymentMethod.PAYME,
        createdAt: new Date("2026-03-01T11:00:00Z"),
      } as any;

      mockQueryBuilder.getMany.mockResolvedValue([cashTxn, cardTxn, mobileTxn]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      dailySummaryRepo.findOne.mockResolvedValue(null);
      dailySummaryRepo.create.mockImplementation((data) => data as any);
      dailySummaryRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      const result = await service.rebuildDailySummary(
        orgId,
        new Date("2026-03-01"),
      );

      expect(result.cashAmount).toBe(10000);
      expect(result.cardAmount).toBe(20000);
      expect(result.mobileAmount).toBe(15000);
      expect(result.salesAmount).toBe(45000);
    });
  });

  // ==========================================================================
  // COMMISSIONS — GET
  // ==========================================================================

  describe("getCommissions", () => {
    it("should return paginated commissions for organization", async () => {
      const mockCommission = {
        id: "comm-uuid-1",
        organizationId: orgId,
        contractId: "contract-uuid-1",
        commissionAmount: 50000,
        status: CommissionStatus.CALCULATED,
      } as any;
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockCommission]);

      const result = await service.getCommissions(orgId, {});

      expect(result.data).toEqual([mockCommission]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should apply contractId and status filters", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getCommissions(orgId, {
        contractId: "contract-uuid-1",
        status: CommissionStatus.CALCULATED,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "c.contractId = :contractId",
        { contractId: "contract-uuid-1" },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "c.status = :status",
        { status: CommissionStatus.CALCULATED },
      );
    });

    it("should apply date range filters", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);
      const dateFrom = new Date("2026-01-01");
      const dateTo = new Date("2026-03-31");

      await service.getCommissions(orgId, { dateFrom, dateTo });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "c.periodStart >= :dateFrom",
        { dateFrom },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "c.periodEnd <= :dateTo",
        { dateTo },
      );
    });
  });

  // ==========================================================================
  // CALCULATE COMMISSION
  // ==========================================================================

  describe("calculateCommission", () => {
    it("should calculate 10% commission with VAT from transactions", async () => {
      const txn1 = {
        totalAmount: 100000,
        type: TransactionType.SALE,
        status: TransactionStatus.COMPLETED,
      } as any;
      const txn2 = {
        totalAmount: 200000,
        type: TransactionType.SALE,
        status: TransactionStatus.COMPLETED,
      } as any;

      mockQueryBuilder.getMany.mockResolvedValue([txn1, txn2]);
      commissionRepo.create.mockImplementation((data) => data as any);
      commissionRepo.save.mockImplementation((data) =>
        Promise.resolve({ id: "comm-uuid-new", ...data } as any),
      );

      const periodStart = new Date("2026-03-01");
      const periodEnd = new Date("2026-03-31");

      const result = await service.calculateCommission(
        orgId,
        "contract-uuid-1",
        periodStart,
        periodEnd,
        userId,
      );

      // baseAmount = 300000, commission = 10% = 30000, VAT = 12% of 30000 = 3600
      expect(result.baseAmount).toBe(300000);
      expect(result.commissionRate).toBe(10);
      expect(result.commissionAmount).toBe(30000);
      expect(result.vatAmount).toBe(3600);
      expect(result.totalAmount).toBe(33600); // 30000 + 3600
      expect(result.currency).toBe("UZS");
      expect(result.status).toBe(CommissionStatus.CALCULATED);
      expect(result.commissionType).toBe(CommissionType.PERCENTAGE);
      expect(result.calculationDetails.transactionCount).toBe(2);
      expect(result.calculationDetails.averageTransaction).toBe(150000);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "commission.calculated",
        expect.objectContaining({
          organizationId: orgId,
          userId,
        }),
      );
    });

    it("should throw BadRequestException when no transactions found", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await expect(
        service.calculateCommission(
          orgId,
          "contract-uuid-1",
          new Date("2026-03-01"),
          new Date("2026-03-31"),
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should filter by contractId and completed sales only", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service
        .calculateCommission(
          orgId,
          "contract-uuid-1",
          new Date("2026-03-01"),
          new Date("2026-03-31"),
          userId,
        )
        .catch(() => {
          /* expected */
        });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.contractId = :contractId",
        { contractId: "contract-uuid-1" },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("t.type = :type", {
        type: TransactionType.SALE,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "t.status = :status",
        { status: TransactionStatus.COMPLETED },
      );
    });

    it("should round average transaction to 2 decimal places", async () => {
      const txn1 = { totalAmount: 100000 } as any;
      const txn2 = { totalAmount: 100001 } as any;
      const txn3 = { totalAmount: 100002 } as any;

      mockQueryBuilder.getMany.mockResolvedValue([txn1, txn2, txn3]);
      commissionRepo.create.mockImplementation((data) => data as any);
      commissionRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      const result = await service.calculateCommission(
        orgId,
        "contract-uuid-1",
        new Date("2026-03-01"),
        new Date("2026-03-31"),
        userId,
      );

      // 300003 / 3 = 100001
      expect(result.calculationDetails.averageTransaction).toBe(100001);
    });
  });
});
