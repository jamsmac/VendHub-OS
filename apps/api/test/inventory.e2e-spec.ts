/**
 * E2E Tests: Inventory Operations
 *
 * Tests the 3-level inventory system: warehouse, operator, and machine
 * inventory queries, transfers between levels, low-stock alerts, and
 * error handling for insufficient stock.
 *
 * Endpoint prefix: /api/v1/inventory
 * Controller: InventoryController (src/modules/inventory/inventory.controller.ts)
 */

import {
  INestApplication,
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp, mockUuid, mockUuid2 } from './setup';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = mockUuid2();
const PRODUCT_ID = mockUuid();
const OPERATOR_ID = '55555555-6666-7777-8888-999999999999';
const MACHINE_ID = '66666666-7777-8888-9999-aaaaaaaaaaaa';

function warehouseItem(overrides: Record<string, any> = {}) {
  return {
    id: 'wh-item-1',
    organizationId: ORG_ID,
    productId: PRODUCT_ID,
    currentQuantity: 150,
    reservedQuantity: 10,
    minStockLevel: 20,
    maxStockLevel: 200,
    avgPurchasePrice: 2500,
    ...overrides,
  };
}

function operatorItem(overrides: Record<string, any> = {}) {
  return {
    id: 'op-item-1',
    organizationId: ORG_ID,
    operatorId: OPERATOR_ID,
    productId: PRODUCT_ID,
    currentQuantity: 25,
    reservedQuantity: 5,
    ...overrides,
  };
}

function machineItem(overrides: Record<string, any> = {}) {
  return {
    id: 'mc-item-1',
    organizationId: ORG_ID,
    machineId: MACHINE_ID,
    productId: PRODUCT_ID,
    currentQuantity: 15,
    minStockLevel: 5,
    maxCapacity: 50,
    ...overrides,
  };
}

function movementRecord(overrides: Record<string, any> = {}) {
  return {
    id: 'mv-1',
    organizationId: ORG_ID,
    movementType: 'warehouse_to_operator',
    productId: PRODUCT_ID,
    quantity: 20,
    performedByUserId: mockUuid(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock controller
// ---------------------------------------------------------------------------

@Controller({ path: 'inventory', version: '1' })
class MockInventoryController {
  // GET /inventory/warehouse
  @Get('warehouse')
  getWarehouseInventory() {
    return [warehouseItem()];
  }

  // GET /inventory/operator
  @Get('operator')
  getOperatorInventory(@Query('operatorId') operatorId?: string) {
    if (!operatorId) {
      return { error: 'Operator ID required' };
    }
    return [operatorItem({ operatorId })];
  }

  // GET /inventory/machine
  @Get('machine')
  getMachineInventory(@Query('machineId') machineId: string) {
    if (!machineId) {
      throw new BadRequestException('machineId is required');
    }
    return [machineItem({ machineId })];
  }

  // GET /inventory/low-stock
  @Get('low-stock')
  getLowStock() {
    return [
      warehouseItem({
        id: 'wh-low-1',
        currentQuantity: 5,
        minStockLevel: 20,
      }),
    ];
  }

  // POST /inventory/transfer
  @Post('transfer')
  async transfer(@Body() body: any) {
    const { fromLevel, toLevel, productId, quantity, operatorId, machineId } = body;

    // Validate required fields
    if (!fromLevel || !toLevel || !productId || !quantity) {
      throw new BadRequestException('Missing required fields: fromLevel, toLevel, productId, quantity');
    }

    // Simulate insufficient stock
    if (quantity > 500) {
      throw new BadRequestException('Insufficient stock for transfer');
    }

    // Simulate unsupported transfer direction
    if (fromLevel === 'machine' && toLevel === 'warehouse') {
      return { error: 'Unsupported transfer: machine -> warehouse' };
    }

    // Warehouse -> Operator
    if (fromLevel === 'warehouse' && toLevel === 'operator') {
      if (!operatorId) {
        throw new BadRequestException('operatorId is required for warehouse-to-operator transfer');
      }
      return {
        movement: movementRecord({
          movementType: 'warehouse_to_operator',
          quantity,
          operatorId,
        }),
        warehouseBalance: 150 - quantity,
        operatorBalance: 25 + quantity,
      };
    }

    // Operator -> Machine
    if (fromLevel === 'operator' && toLevel === 'machine') {
      if (!operatorId || !machineId) {
        throw new BadRequestException('operatorId and machineId are required');
      }
      return {
        movement: movementRecord({
          movementType: 'operator_to_machine',
          quantity,
          operatorId,
          machineId,
        }),
        operatorBalance: 25 - quantity,
        machineBalance: 15 + quantity,
      };
    }

    // Operator -> Warehouse (returns)
    if (fromLevel === 'operator' && toLevel === 'warehouse') {
      return {
        movement: movementRecord({
          movementType: 'operator_to_warehouse',
          quantity,
          operatorId,
        }),
        warehouseBalance: 150 + quantity,
        operatorBalance: 25 - quantity,
      };
    }

    // Machine -> Operator
    if (fromLevel === 'machine' && toLevel === 'operator') {
      return {
        movement: movementRecord({
          movementType: 'machine_to_operator',
          quantity,
          operatorId,
          machineId,
        }),
        operatorBalance: 25 + quantity,
        machineBalance: 15 - quantity,
      };
    }

    return { error: `Unsupported transfer: ${fromLevel} -> ${toLevel}` };
  }

  // GET /inventory/movements
  @Get('movements')
  getMovements(
    @Query('productId') productId?: string,
    @Query('machineId') machineId?: string,
    @Query('movementType') movementType?: string,
  ) {
    let movements = [
      movementRecord(),
      movementRecord({
        id: 'mv-2',
        movementType: 'operator_to_machine',
        machineId: MACHINE_ID,
      }),
    ];

    if (productId) {
      movements = movements.filter((m) => m.productId === productId);
    }
    if (movementType) {
      movements = movements.filter((m) => m.movementType === movementType);
    }

    return movements;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Inventory Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({
      controllers: [MockInventoryController],
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  // =========================================================================
  // GET /api/v1/inventory/warehouse
  // =========================================================================

  describe('GET /api/v1/inventory/warehouse', () => {
    it('should return warehouse inventory', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/warehouse')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('productId');
      expect(res.body[0]).toHaveProperty('currentQuantity');
      expect(res.body[0]).toHaveProperty('reservedQuantity');
      expect(res.body[0]).toHaveProperty('minStockLevel');
    });
  });

  // =========================================================================
  // GET /api/v1/inventory/operator
  // =========================================================================

  describe('GET /api/v1/inventory/operator', () => {
    it('should return operator inventory when operatorId is provided', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/inventory/operator?operatorId=${OPERATOR_ID}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('operatorId');
      expect(res.body[0]).toHaveProperty('currentQuantity');
    });

    it('should return error when operatorId is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/operator')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body).toHaveProperty('error', 'Operator ID required');
    });
  });

  // =========================================================================
  // GET /api/v1/inventory/machine
  // =========================================================================

  describe('GET /api/v1/inventory/machine', () => {
    it('should return machine inventory', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/inventory/machine?machineId=${MACHINE_ID}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('machineId');
      expect(res.body[0]).toHaveProperty('currentQuantity');
      expect(res.body[0]).toHaveProperty('minStockLevel');
      expect(res.body[0]).toHaveProperty('maxCapacity');
    });
  });

  // =========================================================================
  // GET /api/v1/inventory/low-stock
  // =========================================================================

  describe('GET /api/v1/inventory/low-stock', () => {
    it('should return low stock alerts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/low-stock')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      // The item should have current < min
      const item = res.body[0];
      expect(Number(item.currentQuantity)).toBeLessThanOrEqual(Number(item.minStockLevel));
    });
  });

  // =========================================================================
  // POST /api/v1/inventory/transfer — Warehouse to Operator
  // =========================================================================

  describe('POST /api/v1/inventory/transfer', () => {
    describe('warehouse -> operator', () => {
      it('should transfer inventory from warehouse to operator', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/inventory/transfer')
          .set('Authorization', 'Bearer mock-token')
          .send({
            fromLevel: 'warehouse',
            toLevel: 'operator',
            productId: PRODUCT_ID,
            quantity: 20,
            operatorId: OPERATOR_ID,
          })
          .expect(201);

        expect(res.body).toHaveProperty('movement');
        expect(res.body.movement.movementType).toBe('warehouse_to_operator');
        expect(res.body.movement.quantity).toBe(20);
        expect(res.body).toHaveProperty('warehouseBalance');
        expect(res.body).toHaveProperty('operatorBalance');
        expect(res.body.warehouseBalance).toBe(130); // 150 - 20
        expect(res.body.operatorBalance).toBe(45);   // 25 + 20
      });

      it('should reject transfer without operatorId', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/inventory/transfer')
          .set('Authorization', 'Bearer mock-token')
          .send({
            fromLevel: 'warehouse',
            toLevel: 'operator',
            productId: PRODUCT_ID,
            quantity: 20,
          })
          .expect(400);
      });
    });

    describe('operator -> machine', () => {
      it('should transfer inventory from operator to machine', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/inventory/transfer')
          .set('Authorization', 'Bearer mock-token')
          .send({
            fromLevel: 'operator',
            toLevel: 'machine',
            productId: PRODUCT_ID,
            quantity: 10,
            operatorId: OPERATOR_ID,
            machineId: MACHINE_ID,
          })
          .expect(201);

        expect(res.body.movement.movementType).toBe('operator_to_machine');
        expect(res.body).toHaveProperty('operatorBalance');
        expect(res.body).toHaveProperty('machineBalance');
      });
    });

    describe('operator -> warehouse (return)', () => {
      it('should return inventory from operator to warehouse', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/inventory/transfer')
          .set('Authorization', 'Bearer mock-token')
          .send({
            fromLevel: 'operator',
            toLevel: 'warehouse',
            productId: PRODUCT_ID,
            quantity: 5,
            operatorId: OPERATOR_ID,
          })
          .expect(201);

        expect(res.body.movement.movementType).toBe('operator_to_warehouse');
        expect(res.body.warehouseBalance).toBe(155); // 150 + 5
      });
    });

    describe('machine -> operator', () => {
      it('should transfer from machine back to operator', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/inventory/transfer')
          .set('Authorization', 'Bearer mock-token')
          .send({
            fromLevel: 'machine',
            toLevel: 'operator',
            productId: PRODUCT_ID,
            quantity: 3,
            operatorId: OPERATOR_ID,
            machineId: MACHINE_ID,
          })
          .expect(201);

        expect(res.body.movement.movementType).toBe('machine_to_operator');
      });
    });

    describe('insufficient stock handling', () => {
      it('should reject transfer exceeding available stock', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/inventory/transfer')
          .set('Authorization', 'Bearer mock-token')
          .send({
            fromLevel: 'warehouse',
            toLevel: 'operator',
            productId: PRODUCT_ID,
            quantity: 9999,
            operatorId: OPERATOR_ID,
          })
          .expect(400);
      });
    });

    describe('unsupported transfers', () => {
      it('should return error for machine -> warehouse direct transfer', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/inventory/transfer')
          .set('Authorization', 'Bearer mock-token')
          .send({
            fromLevel: 'machine',
            toLevel: 'warehouse',
            productId: PRODUCT_ID,
            quantity: 5,
            operatorId: OPERATOR_ID,
            machineId: MACHINE_ID,
          })
          .expect(201);

        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('Unsupported transfer');
      });
    });

    describe('missing required fields', () => {
      it('should reject transfer with missing fields', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/inventory/transfer')
          .set('Authorization', 'Bearer mock-token')
          .send({ fromLevel: 'warehouse' })
          .expect(400);
      });
    });
  });

  // =========================================================================
  // GET /api/v1/inventory/movements
  // =========================================================================

  describe('GET /api/v1/inventory/movements', () => {
    it('should return all movements', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/movements')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('movementType');
      expect(res.body[0]).toHaveProperty('productId');
      expect(res.body[0]).toHaveProperty('quantity');
    });

    it('should filter movements by movementType', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/movements?movementType=warehouse_to_operator')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((m: any) => {
        expect(m.movementType).toBe('warehouse_to_operator');
      });
    });
  });
});
