import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";

import { InventoryService } from "./inventory.service";
import { InventoryTransferService } from "./services/inventory-transfer.service";
import { InventoryReservationService } from "./services/inventory-reservation.service";
import { InventoryAdjustmentService } from "./services/inventory-adjustment.service";
import {
  WarehouseInventory,
  OperatorInventory,
  MachineInventory,
  InventoryMovement,
  MovementType,
} from "./entities/inventory.entity";

describe("InventoryService", () => {
  let service: InventoryService;
  let warehouseRepo: jest.Mocked<Repository<WarehouseInventory>>;
  let operatorRepo: jest.Mocked<Repository<OperatorInventory>>;
  let machineRepo: jest.Mocked<Repository<MachineInventory>>;
  let _movementRepo: jest.Mocked<Repository<InventoryMovement>>;
  let transferService: jest.Mocked<InventoryTransferService>;

  const orgId = "org-uuid-1";

  const mockWarehouse: Record<string, unknown> = {
    id: "wh-uuid-1",
    organizationId: orgId,
    productId: "product-uuid-1",
    currentQuantity: 100,
    reservedQuantity: 10,
    minStockLevel: 20,
    avgPurchasePrice: 5000,
    lastPurchasePrice: 5500,
    lastRestockedAt: new Date(),
    locationInWarehouse: "A1",
    availableQuantity: 90,
    createdAt: new Date(),
  };

  const mockOperator: Record<string, unknown> = {
    id: "op-inv-uuid-1",
    organizationId: orgId,
    operatorId: "operator-uuid-1",
    productId: "product-uuid-1",
    currentQuantity: 30,
    reservedQuantity: 0,
    lastReceivedAt: new Date(),
    availableQuantity: 30,
    createdAt: new Date(),
  };

  const mockMachineInventory = {
    id: "mi-uuid-1",
    organizationId: orgId,
    machineId: "machine-uuid-1",
    productId: "product-uuid-1",
    currentQuantity: 15,
    minStockLevel: 5,
    totalSold: 200,
    slotNumber: 1,
    lastRefilledAt: new Date(),
    createdAt: new Date(),
  } as unknown as MachineInventory;

  const mockMovement = {
    id: "mov-uuid-1",
    organizationId: orgId,
    movementType: MovementType.WAREHOUSE_TO_OPERATOR,
    productId: "product-uuid-1",
    quantity: 10,
    performedByUserId: "user-uuid-1",
    operationDate: new Date(),
    createdAt: new Date(),
  } as unknown as InventoryMovement;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    getRawOne: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryTransferService,
          useValue: {
            warehouseStockIn: jest.fn(),
            transferWarehouseToOperator: jest.fn(),
            transferOperatorToWarehouse: jest.fn(),
            transferOperatorToMachine: jest.fn(),
            transferMachineToOperator: jest.fn(),
            recordSale: jest.fn(),
          },
        },
        {
          provide: InventoryReservationService,
          useValue: {
            createReservation: jest.fn(),
            fulfillReservation: jest.fn(),
            cancelReservation: jest.fn(),
            confirmReservation: jest.fn(),
            getReservationsByTask: jest.fn(),
            getActiveReservations: jest.fn(),
            getReservationById: jest.fn(),
            getReservations: jest.fn(),
            getReservationsSummary: jest.fn(),
            expireOldReservations: jest.fn(),
          },
        },
        {
          provide: InventoryAdjustmentService,
          useValue: {
            createAdjustment: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WarehouseInventory),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(OperatorInventory),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(MachineInventory),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    warehouseRepo = module.get(getRepositoryToken(WarehouseInventory));
    operatorRepo = module.get(getRepositoryToken(OperatorInventory));
    machineRepo = module.get(getRepositoryToken(MachineInventory));
    _movementRepo = module.get(getRepositoryToken(InventoryMovement));
    transferService = module.get(InventoryTransferService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // WAREHOUSE INVENTORY
  // ============================================================================

  describe("getWarehouseInventory", () => {
    it("should return paginated warehouse inventory", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      warehouseRepo.findAndCount.mockResolvedValue([[mockWarehouse as any], 1]);

      const result = await service.getWarehouseInventory(orgId, 1, 50);

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total", 1);
      expect(result.data).toHaveLength(1);
      expect(warehouseRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
        }),
      );
    });

    it("should cap limit at 100", async () => {
      warehouseRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getWarehouseInventory(orgId, 1, 200);

      expect(warehouseRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  describe("getWarehouseLowStock", () => {
    it("should return items below minimum stock level", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockWarehouse]);

      const result = await service.getWarehouseLowStock(orgId);

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "wi.currentQuantity <= wi.minStockLevel",
      );
    });
  });

  // ============================================================================
  // OPERATOR INVENTORY
  // ============================================================================

  describe("getOperatorInventory", () => {
    it("should return paginated operator inventory", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      operatorRepo.findAndCount.mockResolvedValue([[mockOperator as any], 1]);

      const result = await service.getOperatorInventory(
        orgId,
        "operator-uuid-1",
        1,
        50,
      );

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total", 1);
      expect(operatorRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId, operatorId: "operator-uuid-1" },
        }),
      );
    });
  });

  // ============================================================================
  // MACHINE INVENTORY
  // ============================================================================

  describe("getMachineInventory", () => {
    it("should return machine inventory sorted by slot number", async () => {
      machineRepo.find.mockResolvedValue([mockMachineInventory]);

      const result = await service.getMachineInventory(orgId, "machine-uuid-1");

      expect(result).toHaveLength(1);
      expect(machineRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId, machineId: "machine-uuid-1" },
        order: { slotNumber: "ASC" },
      });
    });
  });

  describe("getMachinesNeedingRefill", () => {
    it("should return machines with stock below minimum", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockMachineInventory]);

      const result = await service.getMachinesNeedingRefill(orgId);

      expect(result).toHaveLength(1);
    });
  });

  // ============================================================================
  // TRANSFERS (delegated to InventoryTransferService)
  // ============================================================================

  describe("transferWarehouseToOperator", () => {
    it("should delegate to transfer service", async () => {
      const mockResult = {
        warehouse: mockWarehouse as unknown as WarehouseInventory,
        operator: mockOperator as unknown as OperatorInventory,
        movement: mockMovement,
      };
      transferService.transferWarehouseToOperator.mockResolvedValue(mockResult);

      const dto = {
        organizationId: orgId,
        operatorId: "operator-uuid-1",
        productId: "product-uuid-1",
        quantity: 20,
      };

      const result = await service.transferWarehouseToOperator(
        dto,
        "user-uuid-1",
      );

      expect(result).toHaveProperty("warehouse");
      expect(result).toHaveProperty("operator");
      expect(result).toHaveProperty("movement");
      expect(transferService.transferWarehouseToOperator).toHaveBeenCalledWith(
        dto,
        "user-uuid-1",
      );
    });

    it("should propagate NotFoundException from transfer service", async () => {
      transferService.transferWarehouseToOperator.mockRejectedValue(
        new NotFoundException(`Product missing-product not found in warehouse`),
      );

      await expect(
        service.transferWarehouseToOperator(
          {
            organizationId: orgId,
            operatorId: "operator-uuid-1",
            productId: "missing-product",
            quantity: 20,
          },
          "user-uuid-1",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should propagate BadRequestException for insufficient stock", async () => {
      transferService.transferWarehouseToOperator.mockRejectedValue(
        new BadRequestException("Insufficient warehouse stock."),
      );

      await expect(
        service.transferWarehouseToOperator(
          {
            organizationId: orgId,
            operatorId: "operator-uuid-1",
            productId: "product-uuid-1",
            quantity: 20,
          },
          "user-uuid-1",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("transferOperatorToWarehouse", () => {
    it("should propagate NotFoundException from transfer service", async () => {
      transferService.transferOperatorToWarehouse.mockRejectedValue(
        new NotFoundException(
          `Product missing-product not found with operator operator-uuid-1`,
        ),
      );

      await expect(
        service.transferOperatorToWarehouse(
          {
            organizationId: orgId,
            operatorId: "operator-uuid-1",
            productId: "missing-product",
            quantity: 10,
          },
          "user-uuid-1",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("transferOperatorToMachine", () => {
    it("should propagate BadRequestException for insufficient operator stock", async () => {
      transferService.transferOperatorToMachine.mockRejectedValue(
        new BadRequestException("Insufficient operator stock."),
      );

      await expect(
        service.transferOperatorToMachine(
          {
            organizationId: orgId,
            operatorId: "operator-uuid-1",
            machineId: "machine-uuid-1",
            productId: "product-uuid-1",
            quantity: 10,
          },
          "user-uuid-1",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("transferMachineToOperator", () => {
    it("should propagate NotFoundException from transfer service", async () => {
      transferService.transferMachineToOperator.mockRejectedValue(
        new NotFoundException(
          `Product missing-product not found in machine machine-uuid-1`,
        ),
      );

      await expect(
        service.transferMachineToOperator(
          {
            organizationId: orgId,
            operatorId: "operator-uuid-1",
            machineId: "machine-uuid-1",
            productId: "missing-product",
            quantity: 5,
          },
          "user-uuid-1",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // MOVEMENTS
  // ============================================================================

  describe("getMovements", () => {
    it("should return filtered movement history", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockMovement]);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.getMovements(orgId, {
        productId: "product-uuid-1",
      });

      expect(result).toHaveProperty("movements");
      expect(result).toHaveProperty("total");
    });

    it("should return movements with default limit of 20", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await service.getMovements(orgId);

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });
  });

  // ============================================================================
  // REPORTS
  // ============================================================================

  describe("getInventorySummary", () => {
    it("should return summary with warehouse, operator, and machine stats", async () => {
      // Reset getMany for warehouse QB
      const warehouseQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalProducts: "5",
          totalValue: "250000",
          lowStockCount: "2",
        }),
      };
      const operatorQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalOperators: "3",
          totalProducts: "10",
        }),
      };
      const machineQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalMachines: "8",
          totalProducts: "20",
          needsRefillCount: "3",
        }),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      warehouseRepo.createQueryBuilder.mockReturnValue(warehouseQb as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      operatorRepo.createQueryBuilder.mockReturnValue(operatorQb as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      machineRepo.createQueryBuilder.mockReturnValue(machineQb as any);

      const result = await service.getInventorySummary(orgId);

      expect(result.warehouse.totalProducts).toBe(5);
      expect(result.warehouse.totalValue).toBe(250000);
      expect(result.warehouse.lowStockCount).toBe(2);
      expect(result.operators.totalOperators).toBe(3);
      expect(result.machines.totalMachines).toBe(8);
      expect(result.machines.needsRefillCount).toBe(3);
    });
  });
});
