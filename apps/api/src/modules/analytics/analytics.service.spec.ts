import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { DashboardStatsService } from "./analytics.service";
import {
  DashboardWidget,
  WidgetType,
  TimeRange,
} from "./entities/analytics.entity";
import {
  DailyStats,
  AnalyticsSnapshot,
  SnapshotType,
} from "../reports/entities/analytics-snapshot.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Task } from "../tasks/entities/task.entity";

describe("DashboardStatsService", () => {
  let service: DashboardStatsService;
  let dailyStatsRepo: jest.Mocked<Repository<DailyStats>>;
  let widgetRepo: jest.Mocked<Repository<DashboardWidget>>;
  let snapshotRepo: jest.Mocked<Repository<AnalyticsSnapshot>>;
  let transactionRepo: jest.Mocked<Repository<Transaction>>;
  let machineRepo: jest.Mocked<Repository<Machine>>;
  let taskRepo: jest.Mocked<Repository<Task>>;

  const orgId = "550e8400-e29b-41d4-a716-446655440000";
  const userId = "550e8400-e29b-41d4-a716-446655440001";

  const mockDailyStats = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    organizationId: orgId,
    statDate: new Date("2025-01-01"),
    totalRevenue: 1000,
    totalSalesCount: 50,
    averageSaleAmount: 20,
    totalCollections: 1000,
    collectionsCount: 5,
    activeMachinesCount: 10,
    onlineMachinesCount: 8,
    offlineMachinesCount: 2,
    refillTasksCompleted: 5,
    collectionTasksCompleted: 3,
    cleaningTasksCompleted: 2,
    repairTasksCompleted: 1,
    totalTasksCompleted: 11,
    inventoryUnitsRefilled: 200,
    inventoryUnitsSold: 300,
    topProducts: [
      {
        productId: "prod-1",
        name: "Coffee",
        quantity: 50,
        revenue: 500,
      },
    ],
    topMachines: [
      {
        machineId: "mach-1",
        machineNumber: "M001",
        salesCount: 30,
        revenue: 600,
      },
    ],
    activeOperatorsCount: 3,
    lastUpdatedAt: new Date(),
    lastFullRebuildAt: null,
    isFinalized: false,
    metadata: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    createdById: null,
    updatedById: null,
  } as unknown as DailyStats;

  const mockWidget = {
    id: "550e8400-e29b-41d4-a716-446655440003",
    organizationId: orgId,
    userId,
    title: "Sales Chart",
    widgetType: WidgetType.SALES_CHART,
    chartType: "line",
    timeRange: TimeRange.LAST_7_DAYS,
    position: 0,
    width: 6,
    height: 4,
    config: {},
    isVisible: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdById: null,
    updatedById: null,
  } as unknown as DashboardWidget;

  const mockSnapshot = {
    id: "550e8400-e29b-41d4-a716-446655440004",
    organizationId: orgId,
    snapshotType: SnapshotType.DAILY,
    snapshotDate: new Date("2025-01-01"),
    machineId: null,
    locationId: null,
    productId: null,
    totalTransactions: 50,
    totalRevenue: 1000,
    totalUnitsSold: 300,
    averageTransactionValue: 20,
    uptimeMinutes: 1440,
    downtimeMinutes: 0,
    availabilityPercentage: 100,
    stockRefills: 5,
    outOfStockIncidents: 0,
    maintenanceTasksCompleted: 1,
    incidentsReported: 0,
    complaintsReceived: 0,
    operationalCosts: 100,
    profitMargin: 50,
    detailedMetrics: {},
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdById: null,
    updatedById: null,
  } as unknown as AnalyticsSnapshot;

  const _createMockQueryBuilder = (
    result: unknown[] = [],
    rawResult: Record<string, unknown> | null = null,
  ) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
    getOne: jest.fn().mockResolvedValue(result[0] || null),
    getCount: jest.fn().mockResolvedValue(result.length),
    getRawMany: jest.fn().mockResolvedValue(rawResult || result),
    getRawOne: jest.fn().mockResolvedValue(rawResult || result[0] || null),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: result.length }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardStatsService,
        {
          provide: getRepositoryToken(DailyStats),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DashboardWidget),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AnalyticsSnapshot),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardStatsService>(DashboardStatsService);
    dailyStatsRepo = module.get(getRepositoryToken(DailyStats));
    widgetRepo = module.get(getRepositoryToken(DashboardWidget));
    snapshotRepo = module.get(getRepositoryToken(AnalyticsSnapshot));
    transactionRepo = module.get(getRepositoryToken(Transaction));
    machineRepo = module.get(getRepositoryToken(Machine));
    taskRepo = module.get(getRepositoryToken(Task));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // aggregateDailyStats
  // ==========================================================================

  describe("aggregateDailyStats", () => {
    it("should aggregate daily stats for an organization", async () => {
      dailyStatsRepo.findOne.mockResolvedValue(null);
      transactionRepo.find.mockResolvedValue([]);
      machineRepo.find.mockResolvedValue([]);
      taskRepo.find.mockResolvedValue([]);
      dailyStatsRepo.create.mockReturnValue(mockDailyStats);
      dailyStatsRepo.save.mockResolvedValue(mockDailyStats);

      const result = await service.aggregateDailyStats(orgId, "2025-01-01");

      expect(result).toEqual(mockDailyStats);
      expect(dailyStatsRepo.findOne).toHaveBeenCalled();
      expect(dailyStatsRepo.save).toHaveBeenCalled();
    });

    it("should update existing daily stats", async () => {
      const existingStats = { ...mockDailyStats };

      dailyStatsRepo.findOne.mockResolvedValue(existingStats);
      transactionRepo.find.mockResolvedValue([]);
      machineRepo.find.mockResolvedValue([]);
      taskRepo.find.mockResolvedValue([]);
      dailyStatsRepo.save.mockResolvedValue(existingStats);

      const result = await service.aggregateDailyStats(orgId, "2025-01-01");

      expect(result.organizationId).toEqual(orgId);
      expect(dailyStatsRepo.save).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getDailyStats
  // ==========================================================================

  describe("getDailyStats", () => {
    it("should return daily stats within date range", async () => {
      const stats = [mockDailyStats];
      dailyStatsRepo.find.mockResolvedValue(stats);

      const result = await service.getDailyStats(
        orgId,
        "2025-01-01",
        "2025-01-31",
      );

      expect(result).toEqual(stats);
      expect(dailyStatsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: orgId,
          }),
          order: { statDate: "ASC" },
        }),
      );
    });
  });

  // ==========================================================================
  // getDashboard
  // ==========================================================================

  describe("getDashboard", () => {
    it("should return dashboard with visible widgets and latest stats", async () => {
      const widgets = [mockWidget];
      widgetRepo.find.mockResolvedValue(widgets);
      dailyStatsRepo.findOne.mockResolvedValue(mockDailyStats);

      const result = await service.getDashboard(orgId, userId);

      expect(result.widgets).toEqual(widgets);
      expect(result.latestStats).toEqual(mockDailyStats);
      expect(widgetRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId, userId, isVisible: true },
        }),
      );
    });
  });

  // ==========================================================================
  // createWidget
  // ==========================================================================

  describe("createWidget", () => {
    it("should create a new widget with auto-assigned position", async () => {
      const dto = {
        title: "New Widget",
        widgetType: WidgetType.SALES_CHART,
        timeRange: TimeRange.LAST_7_DAYS,
      };

      widgetRepo.count.mockResolvedValue(2);
      widgetRepo.create.mockReturnValue(mockWidget);
      widgetRepo.save.mockResolvedValue(mockWidget);

      const result = await service.createWidget(userId, orgId, dto);

      expect(result).toEqual(mockWidget);
      expect(widgetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          organizationId: orgId,
          title: "New Widget",
          position: 2,
        }),
      );
      expect(widgetRepo.save).toHaveBeenCalled();
    });

    it("should use provided position if specified", async () => {
      const dto = {
        title: "New Widget",
        widgetType: WidgetType.REVENUE_CHART,
        timeRange: TimeRange.LAST_30_DAYS,
        position: 5,
      };

      widgetRepo.create.mockReturnValue(mockWidget);
      widgetRepo.save.mockResolvedValue(mockWidget);

      await service.createWidget(userId, orgId, dto);

      expect(widgetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          position: 5,
        }),
      );
    });
  });

  // ==========================================================================
  // updateWidget
  // ==========================================================================

  describe("updateWidget", () => {
    it("should update widget for the owner", async () => {
      const dto = { title: "Updated Title" };
      const updatedWidget = { ...mockWidget, title: "Updated Title" };

      widgetRepo.findOne.mockResolvedValue(mockWidget);
      widgetRepo.save.mockResolvedValue(updatedWidget);

      const result = await service.updateWidget(
        "550e8400-e29b-41d4-a716-446655440003",
        userId,
        dto,
      );

      expect(result.title).toBe("Updated Title");
      expect(widgetRepo.save).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if not widget owner", async () => {
      const otherUserId = "550e8400-e29b-41d4-a716-446655440099";
      widgetRepo.findOne.mockResolvedValue(mockWidget);

      await expect(
        service.updateWidget(
          "550e8400-e29b-41d4-a716-446655440003",
          otherUserId,
          {
            title: "New Title",
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException when widget not found", async () => {
      widgetRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateWidget("nonexistent-id", userId, { title: "Title" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // deleteWidget
  // ==========================================================================

  describe("deleteWidget", () => {
    it("should soft delete widget for the owner", async () => {
      widgetRepo.findOne.mockResolvedValue(mockWidget);
      widgetRepo.softDelete.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });

      await expect(
        service.deleteWidget("550e8400-e29b-41d4-a716-446655440003", userId),
      ).resolves.toBeUndefined();

      expect(widgetRepo.softDelete).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440003",
      );
    });

    it("should throw ForbiddenException if not widget owner", async () => {
      const otherUserId = "550e8400-e29b-41d4-a716-446655440099";
      widgetRepo.findOne.mockResolvedValue(mockWidget);

      await expect(
        service.deleteWidget(
          "550e8400-e29b-41d4-a716-446655440003",
          otherUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException when widget not found", async () => {
      widgetRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteWidget("nonexistent-id", userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // reorderWidgets
  // ==========================================================================

  describe("reorderWidgets", () => {
    it("should update widget positions", async () => {
      const widgetIds = ["widget-1", "widget-2", "widget-3"];
      widgetRepo.update.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });

      await service.reorderWidgets(userId, widgetIds);

      expect(widgetRepo.update).toHaveBeenCalledTimes(3);
      expect(widgetRepo.update).toHaveBeenNthCalledWith(
        1,
        { id: "widget-1", userId },
        { position: 0 },
      );
      expect(widgetRepo.update).toHaveBeenNthCalledWith(
        2,
        { id: "widget-2", userId },
        { position: 1 },
      );
      expect(widgetRepo.update).toHaveBeenNthCalledWith(
        3,
        { id: "widget-3", userId },
        { position: 2 },
      );
    });
  });

  // ==========================================================================
  // getSnapshots
  // ==========================================================================

  describe("getSnapshots", () => {
    it("should return snapshots within date range and type", async () => {
      const snapshots = [mockSnapshot];
      snapshotRepo.find.mockResolvedValue(snapshots);

      const result = await service.getSnapshots(
        orgId,
        SnapshotType.DAILY,
        "2025-01-01",
        "2025-01-31",
      );

      expect(result).toEqual(snapshots);
      expect(snapshotRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: orgId,
            snapshotType: SnapshotType.DAILY,
          }),
          order: { snapshotDate: "ASC" },
        }),
      );
    });
  });

  // ==========================================================================
  // getTopMachines
  // ==========================================================================

  describe("getTopMachines", () => {
    it("should return top machines by revenue", async () => {
      const stats = [
        {
          ...mockDailyStats,
          topMachines: [
            {
              machineId: "mach-1",
              machineNumber: "M001",
              salesCount: 30,
              revenue: 600,
            },
            {
              machineId: "mach-2",
              machineNumber: "M002",
              salesCount: 20,
              revenue: 400,
            },
          ],
        },
      ];

      jest
        .spyOn(service, "getDailyStats")
        .mockResolvedValue(stats as unknown as DailyStats[]);

      const result = await service.getTopMachines(
        orgId,
        "2025-01-01",
        "2025-01-31",
        10,
      );

      expect(result).toHaveLength(2);
      expect(result[0].machineId).toBe("mach-1");
      expect(result[0].revenue).toBe(600);
    });

    it("should respect limit parameter", async () => {
      jest.spyOn(service, "getDailyStats").mockResolvedValue([]);

      await service.getTopMachines(orgId, "2025-01-01", "2025-01-31", 5);

      expect(service.getDailyStats).toHaveBeenCalledWith(
        orgId,
        "2025-01-01",
        "2025-01-31",
      );
    });
  });

  // ==========================================================================
  // getTopProducts
  // ==========================================================================

  describe("getTopProducts", () => {
    it("should return top products by revenue", async () => {
      const stats = [
        {
          ...mockDailyStats,
          topProducts: [
            {
              productId: "prod-1",
              name: "Coffee",
              quantity: 50,
              revenue: 500,
            },
            {
              productId: "prod-2",
              name: "Tea",
              quantity: 30,
              revenue: 300,
            },
          ],
        },
      ];

      jest
        .spyOn(service, "getDailyStats")
        .mockResolvedValue(stats as unknown as DailyStats[]);

      const result = await service.getTopProducts(
        orgId,
        "2025-01-01",
        "2025-01-31",
        10,
      );

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe("prod-1");
      expect(result[0].revenue).toBe(500);
    });
  });

  // ==========================================================================
  // getRevenueTrend
  // ==========================================================================

  describe("getRevenueTrend", () => {
    it("should return revenue trend over time", async () => {
      const stats = [mockDailyStats];
      jest
        .spyOn(service, "getDailyStats")
        .mockResolvedValue(stats as unknown as DailyStats[]);

      const result = await service.getRevenueTrend(
        orgId,
        "2025-01-01",
        "2025-01-31",
      );

      expect(result).toHaveLength(1);
      expect(result[0].revenue).toBe(mockDailyStats.totalRevenue);
      expect(result[0].salesCount).toBe(mockDailyStats.totalSalesCount);
      expect(result[0].averageSale).toBe(mockDailyStats.averageSaleAmount);
    });

    it("should format dates as ISO strings", async () => {
      const stats = [mockDailyStats];
      jest
        .spyOn(service, "getDailyStats")
        .mockResolvedValue(stats as unknown as DailyStats[]);

      const result = await service.getRevenueTrend(
        orgId,
        "2025-01-01",
        "2025-01-31",
      );

      expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
