/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { InventoryAdjustmentService } from "./inventory-adjustment.service";
import {
  WarehouseInventory,
  OperatorInventory,
  MachineInventory,
  InventoryMovement,
  InventoryAdjustment,
  MovementType,
  InventoryLevel,
  AdjustmentType,
} from "../entities/inventory.entity";
import type { AdjustInventoryDto } from "../inventory.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

const ORG_ID = uuid();
const USER_ID = uuid();
const PRODUCT_ID = uuid();
const OPERATOR_ID = uuid();
const MACHINE_ID = uuid();

const buildManager = (overrides: Record<string, jest.Mock> = {}) => ({
  findOne: jest.fn(),
  create: jest.fn((_entity: any, data: any) => ({ id: uuid(), ...data })),
  save: jest.fn((_entity: any, data: any) => Promise.resolve(data)),
  ...overrides,
});

const buildTransactionRunner = (manager: any) =>
  jest.fn((cb: (m: any) => Promise<any>) => cb(manager));

describe("InventoryAdjustmentService", () => {
  let service: InventoryAdjustmentService;
  let manager: ReturnType<typeof buildManager>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    manager = buildManager();
    dataSource = { transaction: buildTransactionRunner(manager) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryAdjustmentService,
        { provide: getRepositoryToken(WarehouseInventory), useValue: {} },
        { provide: getRepositoryToken(OperatorInventory), useValue: {} },
        { provide: getRepositoryToken(MachineInventory), useValue: {} },
        { provide: getRepositoryToken(InventoryMovement), useValue: {} },
        { provide: getRepositoryToken(InventoryAdjustment), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(InventoryAdjustmentService);
  });

  // =========================================================================
  // Positive adjustment (actual > system)
  // =========================================================================

  it("should create a positive adjustment for warehouse level", async () => {
    const existing: any = {
      organizationId: ORG_ID,
      productId: PRODUCT_ID,
      currentQuantity: 40,
    };
    manager.findOne.mockResolvedValueOnce(existing);

    const dto: AdjustInventoryDto = {
      organizationId: ORG_ID,
      inventoryLevel: InventoryLevel.WAREHOUSE,
      referenceId: ORG_ID,
      productId: PRODUCT_ID,
      actualQuantity: 50,
      adjustmentType: AdjustmentType.STOCKTAKE,
      reason: "Count found extra stock",
      adjustedByUserId: USER_ID,
    };

    const result = await service.createAdjustment(dto);

    expect(result.adjustment.difference).toBe(10);
    expect(result.adjustment.systemQuantity).toBe(40);
    expect(result.adjustment.actualQuantity).toBe(50);
    expect(result.adjustment.isApproved).toBe(false);
    expect(result.movement).toBeDefined();
    expect(result.movement!.movementType).toBe(MovementType.ADJUSTMENT);
  });

  // =========================================================================
  // Negative adjustment (actual < system)
  // =========================================================================

  it("should create a negative adjustment for warehouse level", async () => {
    const existing: any = {
      organizationId: ORG_ID,
      productId: PRODUCT_ID,
      currentQuantity: 60,
    };
    manager.findOne.mockResolvedValueOnce(existing);

    const dto: AdjustInventoryDto = {
      organizationId: ORG_ID,
      inventoryLevel: InventoryLevel.WAREHOUSE,
      referenceId: ORG_ID,
      productId: PRODUCT_ID,
      actualQuantity: 55,
      adjustmentType: AdjustmentType.DAMAGE,
      reason: "Damaged goods removed",
      adjustedByUserId: USER_ID,
    };

    const result = await service.createAdjustment(dto);

    expect(result.adjustment.difference).toBe(-5);
    expect(result.movement).toBeDefined();
    expect(result.movement!.quantity).toBe(5); // absolute value
  });

  // =========================================================================
  // Zero difference
  // =========================================================================

  it("should create adjustment without movement when no difference", async () => {
    const existing: any = { currentQuantity: 30 };
    manager.findOne.mockResolvedValueOnce(existing);

    const dto: AdjustInventoryDto = {
      organizationId: ORG_ID,
      inventoryLevel: InventoryLevel.WAREHOUSE,
      referenceId: ORG_ID,
      productId: PRODUCT_ID,
      actualQuantity: 30,
      adjustmentType: AdjustmentType.STOCKTAKE,
      adjustedByUserId: USER_ID,
    };

    const result = await service.createAdjustment(dto);

    expect(result.adjustment.difference).toBe(0);
    expect(result.movement).toBeUndefined();
  });

  // =========================================================================
  // Operator level adjustment
  // =========================================================================

  it("should adjust operator inventory", async () => {
    const existing: any = { currentQuantity: 20 };
    manager.findOne.mockResolvedValueOnce(existing);

    const dto: AdjustInventoryDto = {
      organizationId: ORG_ID,
      inventoryLevel: InventoryLevel.OPERATOR,
      referenceId: OPERATOR_ID,
      productId: PRODUCT_ID,
      actualQuantity: 18,
      adjustmentType: AdjustmentType.THEFT,
      reason: "Suspected theft",
      adjustedByUserId: USER_ID,
    };

    const result = await service.createAdjustment(dto);

    expect(result.adjustment.inventoryLevel).toBe(InventoryLevel.OPERATOR);
    expect(result.movement).toBeDefined();
    expect(result.movement!.operatorId).toBe(OPERATOR_ID);
  });

  // =========================================================================
  // Machine level adjustment
  // =========================================================================

  it("should adjust machine inventory", async () => {
    const existing: any = { currentQuantity: 10 };
    manager.findOne.mockResolvedValueOnce(existing);

    const dto: AdjustInventoryDto = {
      organizationId: ORG_ID,
      inventoryLevel: InventoryLevel.MACHINE,
      referenceId: MACHINE_ID,
      productId: PRODUCT_ID,
      actualQuantity: 12,
      adjustmentType: AdjustmentType.CORRECTION,
      reason: "Recount shows extra items",
      adjustedByUserId: USER_ID,
    };

    const result = await service.createAdjustment(dto);

    expect(result.adjustment.inventoryLevel).toBe(InventoryLevel.MACHINE);
    expect(result.movement).toBeDefined();
    expect(result.movement!.machineId).toBe(MACHINE_ID);
  });

  // =========================================================================
  // Adjustment type is recorded
  // =========================================================================

  it("should record the correct adjustment type", async () => {
    manager.findOne.mockResolvedValueOnce({ currentQuantity: 10 });

    const dto: AdjustInventoryDto = {
      organizationId: ORG_ID,
      inventoryLevel: InventoryLevel.WAREHOUSE,
      referenceId: ORG_ID,
      productId: PRODUCT_ID,
      actualQuantity: 8,
      adjustmentType: AdjustmentType.EXPIRY,
      reason: "Expired product",
      adjustedByUserId: USER_ID,
    };

    const result = await service.createAdjustment(dto);
    expect(result.adjustment.adjustmentType).toBe(AdjustmentType.EXPIRY);
  });

  // =========================================================================
  // Audit trail: adjustedByUserId
  // =========================================================================

  it("should record the user who performed the adjustment", async () => {
    manager.findOne.mockResolvedValueOnce({ currentQuantity: 10 });

    const dto: AdjustInventoryDto = {
      organizationId: ORG_ID,
      inventoryLevel: InventoryLevel.WAREHOUSE,
      referenceId: ORG_ID,
      productId: PRODUCT_ID,
      actualQuantity: 15,
      adjustmentType: AdjustmentType.CORRECTION,
      adjustedByUserId: USER_ID,
    };

    const result = await service.createAdjustment(dto);

    expect(result.adjustment.adjustedByUserId).toBe(USER_ID);
    expect(result.movement!.performedByUserId).toBe(USER_ID);
  });

  // =========================================================================
  // Movement metadata includes adjustmentId
  // =========================================================================

  it("should include adjustmentId in movement metadata", async () => {
    manager.findOne.mockResolvedValueOnce({ currentQuantity: 10 });

    const dto: AdjustInventoryDto = {
      organizationId: ORG_ID,
      inventoryLevel: InventoryLevel.WAREHOUSE,
      referenceId: ORG_ID,
      productId: PRODUCT_ID,
      actualQuantity: 15,
      adjustmentType: AdjustmentType.STOCKTAKE,
      adjustedByUserId: USER_ID,
    };

    const result = await service.createAdjustment(dto);

    expect(result.movement!.metadata).toHaveProperty("adjustmentId");
    expect(result.movement!.metadata).toHaveProperty("difference", 5);
  });

  // =========================================================================
  // No inventory record found (system quantity = 0)
  // =========================================================================

  it("should handle missing inventory record (system qty = 0)", async () => {
    manager.findOne.mockResolvedValueOnce(null);

    const dto: AdjustInventoryDto = {
      organizationId: ORG_ID,
      inventoryLevel: InventoryLevel.WAREHOUSE,
      referenceId: ORG_ID,
      productId: PRODUCT_ID,
      actualQuantity: 25,
      adjustmentType: AdjustmentType.CORRECTION,
      adjustedByUserId: USER_ID,
    };

    const result = await service.createAdjustment(dto);

    // No inventory record means no movement is created even though difference != 0
    // because the code checks `difference !== 0 && inventoryRecord`
    expect(result.adjustment.systemQuantity).toBe(0);
    expect(result.adjustment.difference).toBe(25);
    expect(result.movement).toBeUndefined();
  });

  // =========================================================================
  // Reason and notes are persisted
  // =========================================================================

  it("should persist reason and notes in the adjustment", async () => {
    manager.findOne.mockResolvedValueOnce({ currentQuantity: 5 });

    const dto: AdjustInventoryDto = {
      organizationId: ORG_ID,
      inventoryLevel: InventoryLevel.WAREHOUSE,
      referenceId: ORG_ID,
      productId: PRODUCT_ID,
      actualQuantity: 5,
      adjustmentType: AdjustmentType.STOCKTAKE,
      reason: "Quarterly audit",
      notes: "All items verified",
      adjustedByUserId: USER_ID,
    };

    const result = await service.createAdjustment(dto);

    expect(result.adjustment.reason).toBe("Quarterly audit");
    expect(result.adjustment.notes).toBe("All items verified");
  });

  // =========================================================================
  // Warehouse inventory quantity is updated
  // =========================================================================

  it("should update warehouse inventory to actualQuantity", async () => {
    const existing: any = { currentQuantity: 40 };
    manager.findOne.mockResolvedValueOnce(existing);

    const dto: AdjustInventoryDto = {
      organizationId: ORG_ID,
      inventoryLevel: InventoryLevel.WAREHOUSE,
      referenceId: ORG_ID,
      productId: PRODUCT_ID,
      actualQuantity: 35,
      adjustmentType: AdjustmentType.CORRECTION,
      adjustedByUserId: USER_ID,
    };

    await service.createAdjustment(dto);

    // save is called for WarehouseInventory with updated quantity
    const warehouseSaveCall = manager.save.mock.calls.find(
      (c: any[]) => c[0] === WarehouseInventory,
    );
    expect(warehouseSaveCall).toBeDefined();
    expect(warehouseSaveCall![1].currentQuantity).toBe(35);
  });

  // =========================================================================
  // Multi-tenant: organizationId propagated
  // =========================================================================

  it("should filter by organizationId in all queries", async () => {
    manager.findOne.mockResolvedValueOnce({ currentQuantity: 10 });

    const dto: AdjustInventoryDto = {
      organizationId: ORG_ID,
      inventoryLevel: InventoryLevel.WAREHOUSE,
      referenceId: ORG_ID,
      productId: PRODUCT_ID,
      actualQuantity: 10,
      adjustmentType: AdjustmentType.STOCKTAKE,
      adjustedByUserId: USER_ID,
    };

    await service.createAdjustment(dto);

    expect(manager.findOne).toHaveBeenCalledWith(
      WarehouseInventory,
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG_ID }),
      }),
    );
  });
});
