import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { InventoryLevel, MovementType } from "./entities/inventory.entity";
import { UserRole } from "../../common/decorators";

// ============================================================================
// Mock service
// ============================================================================

const mockInventoryService = {
  getWarehouseInventory: jest.fn(),
  getOperatorInventory: jest.fn(),
  getMachineInventory: jest.fn(),
  getWarehouseLowStock: jest.fn(),
  transferWarehouseToOperator: jest.fn(),
  transferOperatorToWarehouse: jest.fn(),
  transferOperatorToMachine: jest.fn(),
  transferMachineToOperator: jest.fn(),
  getMovements: jest.fn(),
  getReservations: jest.fn(),
  getActiveReservations: jest.fn(),
  getReservationsSummary: jest.fn(),
  getReservationsByTask: jest.fn(),
  getReservationById: jest.fn(),
  createReservation: jest.fn(),
  confirmReservation: jest.fn(),
  fulfillReservation: jest.fn(),
  cancelReservation: jest.fn(),
};

// Reusable mock user factory
function makeUser(overrides: Partial<{
  id: string;
  organizationId: string;
  role: UserRole;
}> = {}) {
  return {
    id: "user-1",
    organizationId: "org-1",
    role: UserRole.MANAGER,
    ...overrides,
  };
}

describe("InventoryController (unit)", () => {
  let controller: InventoryController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
      ],
    })
      .overrideGuard(require("../auth/guards/jwt-auth.guard").JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require("../../common/guards").RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ==========================================================================
  // getWarehouseInventory
  // ==========================================================================

  describe("getWarehouseInventory", () => {
    it("should delegate to service with organizationId", async () => {
      const user = makeUser();
      const mockItems = [{ id: "wh-1", productId: "prod-1" }];
      mockInventoryService.getWarehouseInventory.mockResolvedValue(mockItems);

      const result = await controller.getWarehouseInventory(user as any);

      expect(mockInventoryService.getWarehouseInventory).toHaveBeenCalledWith("org-1");
      expect(result).toEqual(mockItems);
    });
  });

  // ==========================================================================
  // getOperatorInventory
  // ==========================================================================

  describe("getOperatorInventory", () => {
    it("should use query operatorId when provided", async () => {
      const user = makeUser();
      const mockItems = [{ id: "op-1", operatorId: "op-1" }];
      mockInventoryService.getOperatorInventory.mockResolvedValue(mockItems);

      const result = await controller.getOperatorInventory(user as any, "op-1");

      expect(mockInventoryService.getOperatorInventory).toHaveBeenCalledWith("org-1", "op-1");
      expect(result).toEqual(mockItems);
    });

    it("should use user.id when user is OPERATOR and no operatorId provided", async () => {
      const user = makeUser({ id: "op-user-1", role: UserRole.OPERATOR });
      mockInventoryService.getOperatorInventory.mockResolvedValue([]);

      await controller.getOperatorInventory(user as any, undefined);

      expect(mockInventoryService.getOperatorInventory).toHaveBeenCalledWith("org-1", "op-user-1");
    });

    it("should throw BadRequestException when no operatorId and user is not OPERATOR", () => {
      const user = makeUser({ role: UserRole.MANAGER });

      expect(() =>
        controller.getOperatorInventory(user as any, undefined),
      ).toThrow(BadRequestException);

      expect(mockInventoryService.getOperatorInventory).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getMachineInventory
  // ==========================================================================

  describe("getMachineInventory", () => {
    it("should delegate to service with machineId", async () => {
      const user = makeUser();
      const mockItems = [{ id: "mc-1" }];
      mockInventoryService.getMachineInventory.mockResolvedValue(mockItems);

      const result = await controller.getMachineInventory(user as any, "mc-1");

      expect(mockInventoryService.getMachineInventory).toHaveBeenCalledWith("org-1", "mc-1");
      expect(result).toEqual(mockItems);
    });
  });

  // ==========================================================================
  // getLowStock
  // ==========================================================================

  describe("getLowStock", () => {
    it("should delegate to getWarehouseLowStock", async () => {
      const user = makeUser();
      const alerts = [{ productId: "prod-1", currentQuantity: 1 }];
      mockInventoryService.getWarehouseLowStock.mockResolvedValue(alerts);

      const result = await controller.getLowStock(user as any);

      expect(mockInventoryService.getWarehouseLowStock).toHaveBeenCalledWith("org-1");
      expect(result).toEqual(alerts);
    });
  });

  // ==========================================================================
  // transfer — routing logic
  // ==========================================================================

  describe("transfer", () => {
    const user = makeUser();

    it("should route WAREHOUSE→OPERATOR to transferWarehouseToOperator", async () => {
      const dto = {
        fromLevel: InventoryLevel.WAREHOUSE,
        toLevel: InventoryLevel.OPERATOR,
        productId: "prod-1",
        quantity: 5,
        operatorId: "op-1",
      } as any;
      mockInventoryService.transferWarehouseToOperator.mockResolvedValue({ id: "mv-1" });

      const result = await controller.transfer(dto, user as any);

      expect(mockInventoryService.transferWarehouseToOperator).toHaveBeenCalledWith(
        {
          organizationId: "org-1",
          operatorId: "op-1",
          productId: "prod-1",
          quantity: 5,
          notes: undefined,
        },
        "user-1",
      );
      expect(result).toEqual({ id: "mv-1" });
    });

    it("should route OPERATOR→WAREHOUSE to transferOperatorToWarehouse", async () => {
      const dto = {
        fromLevel: InventoryLevel.OPERATOR,
        toLevel: InventoryLevel.WAREHOUSE,
        productId: "prod-1",
        quantity: 3,
        operatorId: "op-1",
      } as any;
      mockInventoryService.transferOperatorToWarehouse.mockResolvedValue({ id: "mv-2" });

      await controller.transfer(dto, user as any);

      expect(mockInventoryService.transferOperatorToWarehouse).toHaveBeenCalledWith(
        expect.objectContaining({ operatorId: "op-1", quantity: 3 }),
        "user-1",
      );
    });

    it("should route OPERATOR→MACHINE to transferOperatorToMachine", async () => {
      const dto = {
        fromLevel: InventoryLevel.OPERATOR,
        toLevel: InventoryLevel.MACHINE,
        productId: "prod-1",
        quantity: 2,
        operatorId: "op-1",
        machineId: "mc-1",
      } as any;
      mockInventoryService.transferOperatorToMachine.mockResolvedValue({ id: "mv-3" });

      await controller.transfer(dto, user as any);

      expect(mockInventoryService.transferOperatorToMachine).toHaveBeenCalledWith(
        expect.objectContaining({ machineId: "mc-1", operatorId: "op-1" }),
        "user-1",
      );
    });

    it("should route MACHINE→OPERATOR to transferMachineToOperator", async () => {
      const dto = {
        fromLevel: InventoryLevel.MACHINE,
        toLevel: InventoryLevel.OPERATOR,
        productId: "prod-1",
        quantity: 1,
        operatorId: "op-1",
        machineId: "mc-1",
      } as any;
      mockInventoryService.transferMachineToOperator.mockResolvedValue({ id: "mv-4" });

      await controller.transfer(dto, user as any);

      expect(mockInventoryService.transferMachineToOperator).toHaveBeenCalledWith(
        expect.objectContaining({ machineId: "mc-1" }),
        "user-1",
      );
    });

    it("should throw BadRequestException for unsupported transfer direction", async () => {
      const dto = {
        fromLevel: InventoryLevel.MACHINE,
        toLevel: InventoryLevel.WAREHOUSE,
        productId: "prod-1",
        quantity: 1,
      } as any;

      await expect(controller.transfer(dto, user as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // getMovements
  // ==========================================================================

  describe("getMovements", () => {
    it("should delegate with optional filters", async () => {
      const user = makeUser();
      const mockMovements = [{ id: "mv-1" }];
      mockInventoryService.getMovements.mockResolvedValue(mockMovements);

      const result = await controller.getMovements(
        user as any,
        "prod-1",
        "mc-1",
        MovementType.MACHINE_SALE,
      );

      expect(mockInventoryService.getMovements).toHaveBeenCalledWith("org-1", {
        productId: "prod-1",
        machineId: "mc-1",
        movementType: MovementType.MACHINE_SALE,
      });
      expect(result).toEqual(mockMovements);
    });

    it("should work without filters", async () => {
      const user = makeUser();
      mockInventoryService.getMovements.mockResolvedValue([]);

      await controller.getMovements(user as any, undefined, undefined, undefined);

      expect(mockInventoryService.getMovements).toHaveBeenCalledWith("org-1", {
        productId: undefined,
        machineId: undefined,
        movementType: undefined,
      });
    });
  });

  // ==========================================================================
  // getReservations — conditional routing
  // ==========================================================================

  describe("getReservations", () => {
    it("should call getActiveReservations when activeOnly=true", async () => {
      const user = makeUser();
      const active = [{ id: "res-1" }];
      mockInventoryService.getActiveReservations.mockResolvedValue(active);

      const result = await controller.getReservations(
        user as any,
        { activeOnly: true } as any,
      );

      expect(mockInventoryService.getActiveReservations).toHaveBeenCalledWith("org-1");
      expect(mockInventoryService.getReservations).not.toHaveBeenCalled();
      expect(result).toEqual(active);
    });

    it("should call getReservations when activeOnly is falsy", async () => {
      const user = makeUser();
      const paginated = { data: [], total: 0, page: 1, limit: 20 };
      mockInventoryService.getReservations.mockResolvedValue(paginated);

      const result = await controller.getReservations(
        user as any,
        { activeOnly: false, page: 1, limit: 20 } as any,
      );

      expect(mockInventoryService.getReservations).toHaveBeenCalledWith(
        "org-1",
        { activeOnly: false, page: 1, limit: 20 },
      );
      expect(mockInventoryService.getActiveReservations).not.toHaveBeenCalled();
      expect(result).toEqual(paginated);
    });
  });

  // ==========================================================================
  // getReservationsSummary
  // ==========================================================================

  describe("getReservationsSummary", () => {
    it("should delegate to service with organizationId", async () => {
      const user = makeUser();
      const summary = { byStatus: {}, totalActiveReservedQuantity: 10, expiringWithin24h: 2 };
      mockInventoryService.getReservationsSummary.mockResolvedValue(summary);

      const result = await controller.getReservationsSummary(user as any);

      expect(mockInventoryService.getReservationsSummary).toHaveBeenCalledWith("org-1");
      expect(result).toEqual(summary);
    });
  });

  // ==========================================================================
  // getReservationsByTask
  // ==========================================================================

  describe("getReservationsByTask", () => {
    it("should delegate with taskId and organizationId", async () => {
      const user = makeUser();
      const reservations = [{ id: "res-1", taskId: "task-1" }];
      mockInventoryService.getReservationsByTask.mockResolvedValue(reservations);

      const result = await controller.getReservationsByTask(
        "task-1",
        user as any,
      );

      expect(mockInventoryService.getReservationsByTask).toHaveBeenCalledWith("org-1", "task-1");
      expect(result).toEqual(reservations);
    });
  });

  // ==========================================================================
  // getReservation
  // ==========================================================================

  describe("getReservation", () => {
    it("should delegate to getReservationById", async () => {
      const user = makeUser();
      const reservation = { id: "res-1" };
      mockInventoryService.getReservationById.mockResolvedValue(reservation);

      const result = await controller.getReservation("res-1", user as any);

      expect(mockInventoryService.getReservationById).toHaveBeenCalledWith("org-1", "res-1");
      expect(result).toEqual(reservation);
    });
  });

  // ==========================================================================
  // createReservation
  // ==========================================================================

  describe("createReservation", () => {
    it("should map DTO fields and inject user context", async () => {
      const user = makeUser();
      const dto = {
        taskId: "task-1",
        productId: "prod-1",
        quantity: 5,
        inventoryLevel: InventoryLevel.WAREHOUSE,
        referenceId: "wh-1",
        expiresAt: undefined,
        notes: undefined,
      } as any;
      const mockRes = { id: "res-1" };
      mockInventoryService.createReservation.mockResolvedValue(mockRes);

      const result = await controller.createReservation(dto, user as any);

      expect(mockInventoryService.createReservation).toHaveBeenCalledWith({
        organizationId: "org-1",
        taskId: "task-1",
        productId: "prod-1",
        quantity: 5,
        inventoryLevel: InventoryLevel.WAREHOUSE,
        referenceId: "wh-1",
        expiresAt: undefined,
        notes: undefined,
        createdByUserId: "user-1",
      });
      expect(result).toEqual(mockRes);
    });
  });

  // ==========================================================================
  // confirmReservation
  // ==========================================================================

  describe("confirmReservation", () => {
    it("should call confirmReservation with id, adjustedQuantity, and organizationId", async () => {
      const dto = { adjustedQuantity: 3 } as any;
      const mockRes = { id: "res-1" };
      mockInventoryService.confirmReservation.mockResolvedValue(mockRes);

      const result = await controller.confirmReservation("res-1", dto, "org-1");

      expect(mockInventoryService.confirmReservation).toHaveBeenCalledWith("res-1", 3, "org-1");
      expect(result).toEqual(mockRes);
    });

    it("should pass undefined adjustedQuantity when not provided", async () => {
      const dto = {} as any;
      mockInventoryService.confirmReservation.mockResolvedValue({ id: "res-1" });

      await controller.confirmReservation("res-1", dto, "org-1");

      expect(mockInventoryService.confirmReservation).toHaveBeenCalledWith("res-1", undefined, "org-1");
    });
  });

  // ==========================================================================
  // fulfillReservation
  // ==========================================================================

  describe("fulfillReservation", () => {
    it("should call fulfillReservation with id, quantity, userId, and organizationId", async () => {
      const user = makeUser();
      const dto = { fulfilledQuantity: 5 } as any;
      const mockRes = { id: "res-1" };
      mockInventoryService.fulfillReservation.mockResolvedValue(mockRes);

      const result = await controller.fulfillReservation("res-1", dto, user as any, "org-1");

      expect(mockInventoryService.fulfillReservation).toHaveBeenCalledWith("res-1", 5, "user-1", "org-1");
      expect(result).toEqual(mockRes);
    });
  });

  // ==========================================================================
  // cancelReservation
  // ==========================================================================

  describe("cancelReservation", () => {
    it("should call cancelReservation with id, reason, userId, and organizationId", async () => {
      const user = makeUser();
      const dto = { reason: "Task cancelled" } as any;
      const mockRes = { id: "res-1" };
      mockInventoryService.cancelReservation.mockResolvedValue(mockRes);

      const result = await controller.cancelReservation("res-1", dto, user as any, "org-1");

      expect(mockInventoryService.cancelReservation).toHaveBeenCalledWith(
        "res-1",
        "Task cancelled",
        "user-1",
        "org-1",
      );
      expect(result).toEqual(mockRes);
    });

    it("should pass undefined reason when not provided in dto", async () => {
      const user = makeUser();
      const dto = {} as any;
      mockInventoryService.cancelReservation.mockResolvedValue({ id: "res-1" });

      await controller.cancelReservation("res-1", dto, user as any, "org-1");

      expect(mockInventoryService.cancelReservation).toHaveBeenCalledWith(
        "res-1",
        undefined,
        "user-1",
        "org-1",
      );
    });
  });
});
