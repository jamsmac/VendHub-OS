import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Repository } from "typeorm";
import { CalculatedStateService } from "./calculated-state.service";
import { Container } from "../containers/entities/container.entity";
import { EquipmentComponent } from "../equipment/entities/equipment-component.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import { SaleIngredient } from "../transactions/entities/sale-ingredient.entity";
import { EntityEvent } from "../entity-events/entities/entity-event.entity";
import { MachineCalculatedState } from "./dto/machine-state.dto";

describe("CalculatedStateService", () => {
  let service: CalculatedStateService;
  let machineRepo: jest.Mocked<Repository<Machine>>;
  let containerRepo: jest.Mocked<Repository<Container>>;
  let componentRepo: jest.Mocked<Repository<EquipmentComponent>>;
  let transactionRepo: jest.Mocked<Repository<Transaction>>;
  let eventRepo: jest.Mocked<Repository<EntityEvent>>;

  const orgId = "org-uuid-1";
  const machineId = "machine-uuid-1";

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockSaleIngredientQB = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ totalUsed: "0" }),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockTransactionQB = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ revenue: "0", salesCount: "0" }),
  };

  const mockMachine = {
    id: machineId,
    organizationId: orgId,
    machineNumber: "VM-001",
  } as unknown as Machine;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalculatedStateService,
        {
          provide: getRepositoryToken(Container),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(EquipmentComponent),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue(mockTransactionQB),
          },
        },
        {
          provide: getRepositoryToken(SaleIngredient),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockSaleIngredientQB),
          },
        },
        {
          provide: getRepositoryToken(EntityEvent),
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<CalculatedStateService>(CalculatedStateService);
    machineRepo = module.get(getRepositoryToken(Machine));
    containerRepo = module.get(getRepositoryToken(Container));
    componentRepo = module.get(getRepositoryToken(EquipmentComponent));
    transactionRepo = module.get(getRepositoryToken(Transaction));
    eventRepo = module.get(getRepositoryToken(EntityEvent));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // getMachineState — cache hit
  // ==========================================================================

  describe("getMachineState — cache hit", () => {
    it("should return cached state without querying repositories", async () => {
      const cachedState: MachineCalculatedState = {
        machineId,
        machineCode: "VM-001",
        calculatedAt: new Date("2026-03-20T12:00:00Z"),
        bunkers: [],
        components: [],
        cleaning: {
          cupsSinceFlush: 10,
          flushThreshold: 50,
          flushOverdue: false,
          daysSinceDeepClean: 2,
          deepCleanIntervalDays: 7,
          deepCleanOverdue: false,
          lastFlushDate: new Date("2026-03-18"),
          lastDeepCleanDate: new Date("2026-03-18"),
        },
        summary: {
          totalPortionsLeft: 0,
          lowStockBunkers: 0,
          componentsNeedingMaintenance: 0,
          overdueTasks: 0,
        },
      };

      mockCache.get.mockResolvedValue(cachedState);

      const result = await service.getMachineState(machineId, orgId);

      expect(result).toEqual(cachedState);
      expect(mockCache.get).toHaveBeenCalledWith(`machine-state:${machineId}`);
      expect(machineRepo.findOne).not.toHaveBeenCalled();
      expect(containerRepo.find).not.toHaveBeenCalled();
      expect(componentRepo.find).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getMachineState — cache miss with full calculation
  // ==========================================================================

  describe("getMachineState — cache miss with calculation", () => {
    it("should load machine, calculate state, and cache it for 5 minutes", async () => {
      mockCache.get.mockResolvedValue(null);
      machineRepo.findOne.mockResolvedValue(mockMachine);
      containerRepo.find.mockResolvedValue([]);
      componentRepo.find.mockResolvedValue([]);
      eventRepo.findOne.mockResolvedValue(null);
      transactionRepo.count.mockResolvedValue(0);

      const result = await service.getMachineState(machineId, orgId);

      expect(mockCache.get).toHaveBeenCalledWith(`machine-state:${machineId}`);
      expect(machineRepo.findOne).toHaveBeenCalledWith({
        where: { id: machineId, organizationId: orgId },
      });
      expect(result.machineId).toBe(machineId);
      expect(result.machineCode).toBe("VM-001");
      expect(result.calculatedAt).toBeInstanceOf(Date);
      expect(result.bunkers).toEqual([]);
      expect(result.components).toEqual([]);
      expect(result.cleaning).toBeDefined();
      expect(result.summary).toEqual({
        totalPortionsLeft: 0,
        lowStockBunkers: 0,
        componentsNeedingMaintenance: 0,
        overdueTasks: 0,
      });

      // Verify cached with 300s TTL
      expect(mockCache.set).toHaveBeenCalledWith(
        `machine-state:${machineId}`,
        expect.objectContaining({ machineId, machineCode: "VM-001" }),
        300,
      );
    });
  });

  // ==========================================================================
  // getMachineState — machine not found
  // ==========================================================================

  describe("getMachineState — machine not found", () => {
    it("should throw NotFoundException when machine does not exist", async () => {
      mockCache.get.mockResolvedValue(null);
      machineRepo.findOne.mockResolvedValue(null);

      await expect(service.getMachineState(machineId, orgId)).rejects.toThrow(
        NotFoundException,
      );

      expect(machineRepo.findOne).toHaveBeenCalledWith({
        where: { id: machineId, organizationId: orgId },
      });
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when machine belongs to another org", async () => {
      mockCache.get.mockResolvedValue(null);
      machineRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getMachineState(machineId, "wrong-org-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getMachineState — empty containers
  // ==========================================================================

  describe("getMachineState — empty containers", () => {
    it("should return empty bunkers array when machine has no containers", async () => {
      mockCache.get.mockResolvedValue(null);
      machineRepo.findOne.mockResolvedValue(mockMachine);
      containerRepo.find.mockResolvedValue([]);
      componentRepo.find.mockResolvedValue([]);
      eventRepo.findOne.mockResolvedValue(null);
      transactionRepo.count.mockResolvedValue(0);

      const result = await service.getMachineState(machineId, orgId);

      expect(result.bunkers).toEqual([]);
      expect(result.summary.totalPortionsLeft).toBe(0);
      expect(result.summary.lowStockBunkers).toBe(0);
    });
  });

  // ==========================================================================
  // getMachineState — bunker state calculation
  // ==========================================================================

  describe("getMachineState — bunker state calculation", () => {
    it("should calculate fill percentage and low stock from containers", async () => {
      const containers = [
        {
          id: "container-1",
          machineId,
          organizationId: orgId,
          slotNumber: 1,
          name: "Coffee",
          nomenclatureId: "nom-1",
          currentQuantity: 200,
          capacity: 1000,
          minLevel: 300,
        },
        {
          id: "container-2",
          machineId,
          organizationId: orgId,
          slotNumber: 2,
          name: "Sugar",
          nomenclatureId: "nom-2",
          currentQuantity: 800,
          capacity: 1000,
          minLevel: 100,
        },
      ] as unknown as Container[];

      mockCache.get.mockResolvedValue(null);
      machineRepo.findOne.mockResolvedValue(mockMachine);
      containerRepo.find.mockResolvedValue(containers);
      componentRepo.find.mockResolvedValue([]);
      eventRepo.findOne.mockResolvedValue(null);
      transactionRepo.count.mockResolvedValue(0);
      mockSaleIngredientQB.getRawOne.mockResolvedValue({ totalUsed: "0" });

      const result = await service.getMachineState(machineId, orgId);

      expect(result.bunkers).toHaveLength(2);

      // Container 1: 200/1000 = 20%, below minLevel 300 -> isLow = true
      expect(result.bunkers[0].containerId).toBe("container-1");
      expect(result.bunkers[0].fillPercent).toBe(20);
      expect(result.bunkers[0].isLow).toBe(true);
      expect(result.bunkers[0].remaining).toBe(200);
      expect(result.bunkers[0].capacity).toBe(1000);

      // Container 2: 800/1000 = 80%, above minLevel 100 -> isLow = false
      expect(result.bunkers[1].containerId).toBe("container-2");
      expect(result.bunkers[1].fillPercent).toBe(80);
      expect(result.bunkers[1].isLow).toBe(false);

      expect(result.summary.lowStockBunkers).toBe(1);
    });

    it("should handle zero capacity without division error", async () => {
      const containers = [
        {
          id: "container-1",
          machineId,
          organizationId: orgId,
          slotNumber: 1,
          name: "Empty Hopper",
          nomenclatureId: null,
          currentQuantity: 0,
          capacity: 0,
          minLevel: null,
        },
      ] as unknown as Container[];

      mockCache.get.mockResolvedValue(null);
      machineRepo.findOne.mockResolvedValue(mockMachine);
      containerRepo.find.mockResolvedValue(containers);
      componentRepo.find.mockResolvedValue([]);
      eventRepo.findOne.mockResolvedValue(null);
      transactionRepo.count.mockResolvedValue(0);
      mockSaleIngredientQB.getRawOne.mockResolvedValue({ totalUsed: "0" });

      const result = await service.getMachineState(machineId, orgId);

      expect(result.bunkers[0].fillPercent).toBe(0);
      expect(result.bunkers[0].isLow).toBe(false);
    });
  });

  // ==========================================================================
  // getMachineState — component maintenance states
  // ==========================================================================

  describe("getMachineState — component maintenance states", () => {
    it("should flag components that have exceeded max cycles", async () => {
      const components = [
        {
          id: "comp-1",
          machineId,
          organizationId: orgId,
          name: "Brew Group",
          componentType: "brew_group",
          currentHours: 5000,
          expectedLifeHours: 5000,
          lastMaintenanceDate: new Date("2026-01-01"),
        },
        {
          id: "comp-2",
          machineId,
          organizationId: orgId,
          name: "Water Pump",
          componentType: "pump",
          currentHours: 2000,
          expectedLifeHours: 10000,
          lastMaintenanceDate: null,
        },
      ] as unknown as EquipmentComponent[];

      mockCache.get.mockResolvedValue(null);
      machineRepo.findOne.mockResolvedValue(mockMachine);
      containerRepo.find.mockResolvedValue([]);
      componentRepo.find.mockResolvedValue(components);
      eventRepo.findOne.mockResolvedValue(null);
      transactionRepo.count.mockResolvedValue(0);

      const result = await service.getMachineState(machineId, orgId);

      expect(result.components).toHaveLength(2);

      // Comp 1: 5000/5000 = 100% -> needsMaintenance = true
      expect(result.components[0].componentId).toBe("comp-1");
      expect(result.components[0].usagePercent).toBe(100);
      expect(result.components[0].needsMaintenance).toBe(true);

      // Comp 2: 2000/10000 = 20% -> needsMaintenance = false
      expect(result.components[1].componentId).toBe("comp-2");
      expect(result.components[1].usagePercent).toBe(20);
      expect(result.components[1].needsMaintenance).toBe(false);

      expect(result.summary.componentsNeedingMaintenance).toBe(1);
    });

    it("should cap usage percent at 100 for overused components", async () => {
      const components = [
        {
          id: "comp-1",
          machineId,
          organizationId: orgId,
          name: "Grinder",
          componentType: "grinder",
          currentHours: 12000,
          expectedLifeHours: 5000,
          lastMaintenanceDate: null,
        },
      ] as unknown as EquipmentComponent[];

      mockCache.get.mockResolvedValue(null);
      machineRepo.findOne.mockResolvedValue(mockMachine);
      containerRepo.find.mockResolvedValue([]);
      componentRepo.find.mockResolvedValue(components);
      eventRepo.findOne.mockResolvedValue(null);
      transactionRepo.count.mockResolvedValue(0);

      const result = await service.getMachineState(machineId, orgId);

      expect(result.components[0].usagePercent).toBe(100);
      expect(result.components[0].needsMaintenance).toBe(true);
    });
  });

  // ==========================================================================
  // getMachineState — cleaning state
  // ==========================================================================

  describe("getMachineState — cleaning state", () => {
    it("should report flush overdue when sales exceed threshold", async () => {
      mockCache.get.mockResolvedValue(null);
      machineRepo.findOne.mockResolvedValue(mockMachine);
      containerRepo.find.mockResolvedValue([]);
      componentRepo.find.mockResolvedValue([]);

      // No flush event found
      eventRepo.findOne.mockResolvedValue(null);

      // 55 completed sales (exceeds flushThreshold of 50)
      transactionRepo.count.mockResolvedValue(55);

      const result = await service.getMachineState(machineId, orgId);

      expect(result.cleaning.cupsSinceFlush).toBe(55);
      expect(result.cleaning.flushOverdue).toBe(true);
      expect(result.cleaning.flushThreshold).toBe(50);
    });

    it("should report deep clean overdue when interval exceeded", async () => {
      mockCache.get.mockResolvedValue(null);
      machineRepo.findOne.mockResolvedValue(mockMachine);
      containerRepo.find.mockResolvedValue([]);
      componentRepo.find.mockResolvedValue([]);

      // No flush event
      eventRepo.findOne
        .mockResolvedValueOnce(null) // lastFlush
        .mockResolvedValueOnce(null); // lastDeepClean - null means 999 days

      transactionRepo.count.mockResolvedValue(0);

      const result = await service.getMachineState(machineId, orgId);

      // No deep clean ever recorded -> daysSinceDeepClean = 999
      expect(result.cleaning.daysSinceDeepClean).toBe(999);
      expect(result.cleaning.deepCleanOverdue).toBe(true);
      expect(result.cleaning.deepCleanIntervalDays).toBe(7);
    });
  });

  // ==========================================================================
  // getMachinePnL
  // ==========================================================================

  describe("getMachinePnL", () => {
    const periodStart = new Date("2026-03-01");
    const periodEnd = new Date("2026-03-31");

    /**
     * Helper: getMachinePnL calls transactionRepo.createQueryBuilder 3 times
     * (revenue, rent, maintenance) and saleIngredientRepo.createQueryBuilder
     * once (COGS). Each call returns a fresh chained query builder, so we
     * need to set up per-call return values.
     */
    function setupPnLMocks(opts: {
      revenue: string;
      salesCount: string;
      cogs: string;
      rent: string;
      maint: string;
    }) {
      const makeQB = (rawOneValue: Record<string, string>) => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(rawOneValue),
      });

      // transactionRepo.createQueryBuilder is called 3 times in order:
      // 1) revenue  2) rent  3) maintenance
      (transactionRepo.createQueryBuilder as jest.Mock)
        .mockReturnValueOnce(
          makeQB({ revenue: opts.revenue, salesCount: opts.salesCount }),
        )
        .mockReturnValueOnce(makeQB({ rent: opts.rent }))
        .mockReturnValueOnce(makeQB({ maint: opts.maint }));

      // saleIngredientRepo.createQueryBuilder is called once for COGS
      mockSaleIngredientQB.getRawOne.mockResolvedValue({ cogs: opts.cogs });
    }

    it("should calculate revenue, COGS, expenses, and net profit", async () => {
      setupPnLMocks({
        revenue: "1000000",
        salesCount: "100",
        cogs: "300000",
        rent: "150000",
        maint: "50000",
      });

      const result = await service.getMachinePnL(
        machineId,
        orgId,
        periodStart,
        periodEnd,
      );

      expect(result.periodStart).toEqual(periodStart);
      expect(result.periodEnd).toEqual(periodEnd);
      expect(result.revenue).toBe(1000000);
      expect(result.salesCount).toBe(100);
      expect(result.costOfGoods).toBe(300000);
      expect(result.grossProfit).toBe(700000); // 1M - 300K
      expect(result.rentCost).toBe(150000);
      expect(result.maintenanceCost).toBe(50000);
      expect(result.operatingExpenses).toBe(200000); // 150K + 50K
      expect(result.netProfit).toBe(500000); // 700K - 200K
      expect(result.marginPercent).toBe(50); // 500K / 1M * 100
      expect(result.avgTransaction).toBe(10000); // 1M / 100
    });

    it("should return zero margin and avg when no sales exist", async () => {
      setupPnLMocks({
        revenue: "0",
        salesCount: "0",
        cogs: "0",
        rent: "0",
        maint: "0",
      });

      const result = await service.getMachinePnL(
        machineId,
        orgId,
        periodStart,
        periodEnd,
      );

      expect(result.revenue).toBe(0);
      expect(result.salesCount).toBe(0);
      expect(result.costOfGoods).toBe(0);
      expect(result.grossProfit).toBe(0);
      expect(result.netProfit).toBe(0);
      expect(result.marginPercent).toBe(0);
      expect(result.avgTransaction).toBe(0);
    });

    it("should handle negative net profit (loss scenario)", async () => {
      setupPnLMocks({
        revenue: "200000",
        salesCount: "20",
        cogs: "150000",
        rent: "300000",
        maint: "100000",
      });

      const result = await service.getMachinePnL(
        machineId,
        orgId,
        periodStart,
        periodEnd,
      );

      expect(result.revenue).toBe(200000);
      expect(result.costOfGoods).toBe(150000);
      expect(result.grossProfit).toBe(50000); // 200K - 150K
      expect(result.operatingExpenses).toBe(400000); // 300K + 100K
      expect(result.netProfit).toBe(-350000); // 50K - 400K
      expect(result.marginPercent).toBe(-175); // -350K / 200K * 100
    });
  });

  // ==========================================================================
  // invalidateCache
  // ==========================================================================

  describe("invalidateCache", () => {
    it("should delete the cache key for the given machine", async () => {
      await service.invalidateCache(machineId);

      expect(mockCache.del).toHaveBeenCalledWith(`machine-state:${machineId}`);
    });
  });

  // ==========================================================================
  // organization isolation
  // ==========================================================================

  describe("organization isolation", () => {
    it("getMachineState should filter machine lookup by organizationId", async () => {
      mockCache.get.mockResolvedValue(null);
      machineRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getMachineState(machineId, "wrong-org-uuid"),
      ).rejects.toThrow(NotFoundException);

      expect(machineRepo.findOne).toHaveBeenCalledWith({
        where: { id: machineId, organizationId: "wrong-org-uuid" },
      });
    });

    it("containers query should filter by machineId and organizationId", async () => {
      mockCache.get.mockResolvedValue(null);
      machineRepo.findOne.mockResolvedValue(mockMachine);
      containerRepo.find.mockResolvedValue([]);
      componentRepo.find.mockResolvedValue([]);
      eventRepo.findOne.mockResolvedValue(null);
      transactionRepo.count.mockResolvedValue(0);

      await service.getMachineState(machineId, orgId);

      expect(containerRepo.find).toHaveBeenCalledWith({
        where: { machineId, organizationId: orgId },
        order: { slotNumber: "ASC" },
      });
    });
  });
});
