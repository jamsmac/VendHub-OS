import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException } from "@nestjs/common";

import { AnalyticsService } from "./analytics.service";
import {
  AnalyticsSnapshot,
  DailyStats,
  SnapshotType,
} from "../entities/analytics-snapshot.entity";
import { Transaction } from "../../transactions/entities/transaction.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { Task } from "../../tasks/entities/task.entity";

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let snapshotRepo: jest.Mocked<Repository<AnalyticsSnapshot>>;
  let dailyStatsRepo: jest.Mocked<Repository<DailyStats>>;
  let transactionRepo: jest.Mocked<Repository<Transaction>>;
  let _machineRepo: jest.Mocked<Repository<Machine>>;
  let _taskRepo: jest.Mocked<Repository<Task>>;

  const orgId = "org-uuid-1";
  const snapshotId = "snapshot-uuid-1";

  const mockSnapshot: AnalyticsSnapshot = {
    id: snapshotId,
    organizationId: orgId,
    snapshotType: SnapshotType.DAILY,
    snapshotDate: new Date("2025-01-15"),
    totalTransactions: 100,
    totalRevenue: 5000000,
    totalUnitsSold: 200,
    averageTransactionValue: 50000,
    machineId: null,
    locationId: null,
    productId: null,
    metadata: {},
  } as unknown as AnalyticsSnapshot;

  const mockDailyStats: DailyStats = {
    id: "stats-uuid-1",
    organizationId: orgId,
    statDate: new Date("2025-01-15"),
    totalRevenue: 5000000,
    totalSalesCount: 100,
    averageSaleAmount: 50000,
  } as unknown as DailyStats;

  const mockSnapshotQb: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockSnapshot], 1]),
    getRawOne: jest.fn().mockResolvedValue({
      totalTransactions: "700",
      totalRevenue: "35000000",
      totalUnitsSold: "1400",
      stockRefills: "35",
      maintenanceTasksCompleted: "21",
      outOfStockIncidents: "2",
      incidentsReported: "5",
      complaintsReceived: "1",
      operationalCosts: "500000",
      uptimeMinutes: "40000",
      downtimeMinutes: "2000",
    }),
  };

  const mockTransactionQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({
      total: "5000000",
      totalTransactions: "100",
      totalRevenue: "5000000",
      totalUnitsSold: "200",
      averageTransactionValue: "50000",
      totalSalesCount: "100",
      averageSaleAmount: "50000",
      totalCollections: "0",
      collectionsCount: "0",
      activeMachinesCount: "5",
      inventoryUnitsSold: "200",
    }),
    getRawMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(42),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockTaskQb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(3),
    getRawOne: jest.fn().mockResolvedValue({
      stockRefills: "5",
      maintenanceTasksCompleted: "3",
      totalTasksCompleted: "10",
      refillTasksCompleted: "5",
      collectionTasksCompleted: "2",
      cleaningTasksCompleted: "2",
      repairTasksCompleted: "1",
      count: "3",
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(AnalyticsSnapshot),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn().mockImplementation((d) => d),
            save: jest
              .fn()
              .mockImplementation(async (d) => ({ id: snapshotId, ...d })),
            createQueryBuilder: jest.fn().mockReturnValue(mockSnapshotQb),
          },
        },
        {
          provide: getRepositoryToken(DailyStats),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn().mockImplementation((d) => d),
            save: jest
              .fn()
              .mockImplementation(async (d) => ({ id: "stats-uuid-1", ...d })),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockTransactionQb),
          },
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: {
            count: jest.fn().mockResolvedValue(10),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockTaskQb),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    snapshotRepo = module.get(getRepositoryToken(AnalyticsSnapshot));
    dailyStatsRepo = module.get(getRepositoryToken(DailyStats));
    transactionRepo = module.get(getRepositoryToken(Transaction));
    _machineRepo = module.get(getRepositoryToken(Machine));
    _taskRepo = module.get(getRepositoryToken(Task));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getSnapshot", () => {
    it("should return a snapshot by ID", async () => {
      snapshotRepo.findOne.mockResolvedValue(mockSnapshot);

      const result = await service.getSnapshot(snapshotId);

      expect(result).toEqual(mockSnapshot);
    });

    it("should throw NotFoundException when snapshot not found", async () => {
      snapshotRepo.findOne.mockResolvedValue(null);

      await expect(service.getSnapshot("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getSnapshots", () => {
    it("should return paginated snapshots", async () => {
      const result = await service.getSnapshots(orgId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should apply snapshotType filter", async () => {
      await service.getSnapshots(orgId, {
        snapshotType: SnapshotType.DAILY,
        page: 1,
        limit: 20,
      });

      expect(mockSnapshotQb.andWhere).toHaveBeenCalledWith(
        "snapshot.snapshotType = :snapshotType",
        { snapshotType: SnapshotType.DAILY },
      );
    });
  });

  describe("createDailySnapshot", () => {
    it("should create a new daily snapshot", async () => {
      snapshotRepo.findOne.mockResolvedValue(null);

      const result = await service.createDailySnapshot(
        orgId,
        new Date("2025-01-15"),
      );

      expect(result).toBeDefined();
      expect(snapshotRepo.save).toHaveBeenCalled();
      expect(snapshotRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          snapshotType: SnapshotType.DAILY,
          organizationId: orgId,
        }),
      );
    });

    it("should update existing daily snapshot", async () => {
      snapshotRepo.findOne.mockResolvedValue(mockSnapshot);

      await service.createDailySnapshot(orgId, new Date("2025-01-15"));

      expect(snapshotRepo.save).toHaveBeenCalled();
    });
  });

  describe("createWeeklySnapshot", () => {
    it("should create a weekly snapshot from daily aggregations", async () => {
      snapshotRepo.findOne.mockResolvedValue(null);

      const result = await service.createWeeklySnapshot(
        orgId,
        new Date("2025-01-13"),
      );

      expect(result).toBeDefined();
      expect(snapshotRepo.save).toHaveBeenCalled();
    });
  });

  describe("getDailyStats", () => {
    it("should return daily stats for date range", async () => {
      dailyStatsRepo.find.mockResolvedValue([mockDailyStats]);

      const result = await service.getDailyStats(
        orgId,
        "2025-01-01",
        "2025-01-31",
      );

      expect(result).toHaveLength(1);
      expect(dailyStatsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: orgId }),
          order: { statDate: "ASC" },
        }),
      );
    });
  });

  describe("getDashboardData", () => {
    it("should return dashboard shape with KPIs, charts, and recent transactions", async () => {
      const result = await service.getDashboardData(orgId);

      expect(result).toHaveProperty("revenue");
      expect(result).toHaveProperty("transactions");
      expect(result).toHaveProperty("machines");
      expect(result).toHaveProperty("tasks");
      expect(result).toHaveProperty("recentTransactions");
      expect(result).toHaveProperty("revenueTrend");
      expect(result).toHaveProperty("paymentMethods");
      expect(result).toHaveProperty("topMachines");
      expect(result.revenue).toHaveProperty("today");
      expect(result.revenue).toHaveProperty("yesterday");
      expect(result.revenue).toHaveProperty("changePercent");
      expect(result.machines).toHaveProperty("total");
      expect(result.machines).toHaveProperty("active");
    });

    it("should return zeros when no transactions exist", async () => {
      mockTransactionQb.getRawOne.mockResolvedValue({ total: "0" });
      mockTransactionQb.getCount.mockResolvedValue(0);
      mockTransactionQb.getMany.mockResolvedValue([]);
      mockTaskQb.getCount.mockResolvedValue(0);

      const result = await service.getDashboardData(orgId);

      expect(result.revenue.today).toBe(0);
      expect(result.transactions.today).toBe(0);
      expect(result.tasks.completedToday).toBe(0);
    });
  });

  describe("updateDailyStats", () => {
    it("should create daily stats for a given date", async () => {
      dailyStatsRepo.findOne.mockResolvedValue(null);

      const result = await service.updateDailyStats(orgId, "2025-01-15");

      expect(result).toBeDefined();
      expect(dailyStatsRepo.create).toHaveBeenCalled();
      expect(dailyStatsRepo.save).toHaveBeenCalled();
    });

    it("should update existing daily stats", async () => {
      dailyStatsRepo.findOne.mockResolvedValue(mockDailyStats);

      await service.updateDailyStats(orgId, "2025-01-15");

      expect(dailyStatsRepo.save).toHaveBeenCalled();
    });
  });

  describe("nightlyAggregation", () => {
    it("should aggregate data for all organizations", async () => {
      mockTransactionQb.getRawMany.mockResolvedValue([
        { organizationId: orgId },
      ]);
      snapshotRepo.findOne.mockResolvedValue(null);
      dailyStatsRepo.findOne.mockResolvedValue(null);

      await service.nightlyAggregation();

      expect(transactionRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
