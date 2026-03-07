/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { InventoryTransferService } from "./inventory-transfer.service";
import {
  WarehouseInventory,
  OperatorInventory,
  MachineInventory,
  InventoryMovement,
  MovementType,
} from "../entities/inventory.entity";

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

/** Build a mock EntityManager for DataSource.transaction */
const buildManager = (overrides: Record<string, jest.Mock> = {}) => ({
  findOne: jest.fn(),
  create: jest.fn((_, data) => ({ id: uuid(), ...data })),
  save: jest.fn((_entity, data) => Promise.resolve(data)),
  ...overrides,
});

const buildTransactionRunner = (manager: any) =>
  jest.fn((cb: (m: any) => Promise<any>) => cb(manager));

describe("InventoryTransferService", () => {
  let service: InventoryTransferService;
  let manager: ReturnType<typeof buildManager>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    manager = buildManager();
    dataSource = { transaction: buildTransactionRunner(manager) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryTransferService,
        { provide: getRepositoryToken(WarehouseInventory), useValue: {} },
        { provide: getRepositoryToken(OperatorInventory), useValue: {} },
        { provide: getRepositoryToken(MachineInventory), useValue: {} },
        { provide: getRepositoryToken(InventoryMovement), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(InventoryTransferService);
  });

  // =========================================================================
  // warehouseStockIn
  // =========================================================================

  it("should add stock to existing warehouse inventory", async () => {
    const existing = {
      organizationId: ORG_ID,
      productId: PRODUCT_ID,
      currentQuantity: 50,
      reservedQuantity: 0,
      avgPurchasePrice: 1000,
    };
    manager.findOne.mockResolvedValueOnce(existing);

    const dto = {
      organizationId: ORG_ID,
      productId: PRODUCT_ID,
      quantity: 30,
      unitCost: 1200,
    };

    const result = await service.warehouseStockIn(dto, USER_ID);

    expect(result.warehouse.currentQuantity).toBe(80);
    expect(manager.save).toHaveBeenCalled();
  });

  it("should create warehouse inventory when product not found", async () => {
    manager.findOne.mockResolvedValueOnce(null);

    const dto = {
      organizationId: ORG_ID,
      productId: PRODUCT_ID,
      quantity: 100,
      unitCost: 500,
    };

    const result = await service.warehouseStockIn(dto, USER_ID);

    expect(manager.create).toHaveBeenCalledWith(
      WarehouseInventory,
      expect.objectContaining({ productId: PRODUCT_ID }),
    );
    expect(result.warehouse.currentQuantity).toBe(100);
  });

  // =========================================================================
  // transferWarehouseToOperator
  // =========================================================================

  it("should transfer from warehouse to operator", async () => {
    const warehouse = {
      organizationId: ORG_ID,
      productId: PRODUCT_ID,
      currentQuantity: 100,
      reservedQuantity: 0,
      avgPurchasePrice: 1000,
      get availableQuantity() {
        return Number(this.currentQuantity) - Number(this.reservedQuantity);
      },
    };

    manager.findOne
      .mockResolvedValueOnce(warehouse) // warehouse lookup
      .mockResolvedValueOnce(null); // operator lookup (will be created)

    const dto = {
      organizationId: ORG_ID,
      operatorId: OPERATOR_ID,
      productId: PRODUCT_ID,
      quantity: 25,
    };

    const result = await service.transferWarehouseToOperator(dto, USER_ID);

    expect(result.warehouse.currentQuantity).toBe(75);
    expect(result.operator.currentQuantity).toBe(25);
    expect(result.movement.movementType).toBe(
      MovementType.WAREHOUSE_TO_OPERATOR,
    );
  });

  it("should throw NotFoundException when product not in warehouse", async () => {
    manager.findOne.mockResolvedValueOnce(null);

    const dto = {
      organizationId: ORG_ID,
      operatorId: OPERATOR_ID,
      productId: PRODUCT_ID,
      quantity: 10,
    };

    await expect(
      service.transferWarehouseToOperator(dto, USER_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it("should throw BadRequestException when insufficient warehouse stock", async () => {
    const warehouse = {
      currentQuantity: 5,
      reservedQuantity: 0,
      get availableQuantity() {
        return Number(this.currentQuantity) - Number(this.reservedQuantity);
      },
    };
    manager.findOne.mockResolvedValueOnce(warehouse);

    const dto = {
      organizationId: ORG_ID,
      operatorId: OPERATOR_ID,
      productId: PRODUCT_ID,
      quantity: 50,
    };

    await expect(
      service.transferWarehouseToOperator(dto, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  // =========================================================================
  // transferOperatorToWarehouse
  // =========================================================================

  it("should return stock from operator to warehouse", async () => {
    const operator = {
      organizationId: ORG_ID,
      operatorId: OPERATOR_ID,
      productId: PRODUCT_ID,
      currentQuantity: 30,
    };
    const warehouse = {
      organizationId: ORG_ID,
      productId: PRODUCT_ID,
      currentQuantity: 70,
    };

    manager.findOne
      .mockResolvedValueOnce(operator)
      .mockResolvedValueOnce(warehouse);

    const dto = {
      organizationId: ORG_ID,
      operatorId: OPERATOR_ID,
      productId: PRODUCT_ID,
      quantity: 10,
    };

    const result = await service.transferOperatorToWarehouse(dto, USER_ID);

    expect(result.operator.currentQuantity).toBe(20);
    expect(result.warehouse.currentQuantity).toBe(80);
    expect(result.movement.movementType).toBe(
      MovementType.OPERATOR_TO_WAREHOUSE,
    );
  });

  it("should throw when operator has insufficient stock for return", async () => {
    const operator = { currentQuantity: 3 };
    manager.findOne.mockResolvedValueOnce(operator);

    const dto = {
      organizationId: ORG_ID,
      operatorId: OPERATOR_ID,
      productId: PRODUCT_ID,
      quantity: 10,
    };

    await expect(
      service.transferOperatorToWarehouse(dto, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  // =========================================================================
  // transferOperatorToMachine
  // =========================================================================

  it("should transfer from operator to machine (refill)", async () => {
    const operator = {
      organizationId: ORG_ID,
      operatorId: OPERATOR_ID,
      productId: PRODUCT_ID,
      currentQuantity: 40,
    };

    manager.findOne.mockResolvedValueOnce(operator).mockResolvedValueOnce(null); // machine inventory created

    const dto = {
      organizationId: ORG_ID,
      operatorId: OPERATOR_ID,
      machineId: MACHINE_ID,
      productId: PRODUCT_ID,
      quantity: 15,
      taskId: uuid(),
    };

    const result = await service.transferOperatorToMachine(dto, USER_ID);

    expect(result.operator.currentQuantity).toBe(25);
    expect(result.machine.currentQuantity).toBe(15);
    expect(result.movement.movementType).toBe(MovementType.OPERATOR_TO_MACHINE);
  });

  it("should throw when operator lacks stock for machine refill", async () => {
    const operator = { currentQuantity: 2 };
    manager.findOne.mockResolvedValueOnce(operator);

    const dto = {
      organizationId: ORG_ID,
      operatorId: OPERATOR_ID,
      machineId: MACHINE_ID,
      productId: PRODUCT_ID,
      quantity: 10,
    };

    await expect(
      service.transferOperatorToMachine(dto, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  // =========================================================================
  // transferMachineToOperator
  // =========================================================================

  it("should transfer from machine to operator (removal)", async () => {
    const machine = {
      organizationId: ORG_ID,
      machineId: MACHINE_ID,
      productId: PRODUCT_ID,
      currentQuantity: 20,
    };

    manager.findOne.mockResolvedValueOnce(machine).mockResolvedValueOnce(null); // operator inventory created

    const dto = {
      organizationId: ORG_ID,
      operatorId: OPERATOR_ID,
      machineId: MACHINE_ID,
      productId: PRODUCT_ID,
      quantity: 5,
    };

    const result = await service.transferMachineToOperator(dto, USER_ID);

    expect(result.machine.currentQuantity).toBe(15);
    expect(result.operator.currentQuantity).toBe(5);
    expect(result.movement.movementType).toBe(MovementType.MACHINE_TO_OPERATOR);
  });

  // =========================================================================
  // recordSale
  // =========================================================================

  it("should record a sale and update machine inventory", async () => {
    const machine = {
      organizationId: ORG_ID,
      machineId: MACHINE_ID,
      productId: PRODUCT_ID,
      currentQuantity: 10,
      totalSold: 50,
    };
    manager.findOne.mockResolvedValueOnce(machine);

    const dto = {
      organizationId: ORG_ID,
      machineId: MACHINE_ID,
      productId: PRODUCT_ID,
      quantity: 2,
      unitPrice: 5000,
    };

    const result = await service.recordSale(dto, USER_ID);

    expect(result.machine.currentQuantity).toBe(8);
    expect(result.machine.totalSold).toBe(52);
    expect(result.movement.movementType).toBe(MovementType.MACHINE_SALE);
  });

  it("should throw when insufficient machine stock for sale", async () => {
    const machine = { currentQuantity: 1 };
    manager.findOne.mockResolvedValueOnce(machine);

    const dto = {
      organizationId: ORG_ID,
      machineId: MACHINE_ID,
      productId: PRODUCT_ID,
      quantity: 5,
      unitPrice: 5000,
    };

    await expect(service.recordSale(dto, USER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  // =========================================================================
  // Multi-tenant isolation
  // =========================================================================

  it("should pass organizationId to all manager.findOne calls (tenant isolation)", async () => {
    const warehouse = {
      currentQuantity: 100,
      reservedQuantity: 0,
      avgPurchasePrice: 1000,
      get availableQuantity() {
        return Number(this.currentQuantity) - Number(this.reservedQuantity);
      },
    };
    const operator = { currentQuantity: 10 };

    manager.findOne
      .mockResolvedValueOnce(warehouse)
      .mockResolvedValueOnce(operator);

    const dto = {
      organizationId: ORG_ID,
      operatorId: OPERATOR_ID,
      productId: PRODUCT_ID,
      quantity: 5,
    };

    await service.transferWarehouseToOperator(dto, USER_ID);

    // Both findOne calls must include organizationId
    for (const call of manager.findOne.mock.calls) {
      expect(call[1].where).toHaveProperty("organizationId", ORG_ID);
    }
  });
});
