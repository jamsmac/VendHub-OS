import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { WarehouseController } from "./warehouse.controller";
import { WarehouseService } from "./warehouse.service";
import { StockTakeService } from "./stock-take.service";
import { InventoryBatchService } from "./services/inventory-batch.service";
import { StockReservationService } from "./services/stock-reservation.service";

describe("WarehouseController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;
  let mockStockTake: Record<string, jest.Mock>;
  let mockBatch: Record<string, jest.Mock>;
  let mockReservation: Record<string, jest.Mock>;

  beforeAll(async () => {
    mockStockTake = {
      getMovements: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createMovement: jest.fn().mockResolvedValue({ id: TEST_UUID }),
      completeMovement: jest.fn().mockResolvedValue({}),
      cancelMovement: jest.fn().mockResolvedValue({}),
      getBatches: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createBatch: jest.fn().mockResolvedValue({ id: TEST_UUID }),
      depleteFromBatch: jest.fn().mockResolvedValue({}),
    };
    mockBatch = {
      getStockSummary: jest.fn().mockResolvedValue({}),
      getExpiringBatches: jest.fn().mockResolvedValue([]),
      getExpiredBatches: jest.fn().mockResolvedValue([]),
      writeOffExpiredStock: jest.fn().mockResolvedValue({}),
      quarantineBatch: jest.fn().mockResolvedValue({}),
      releaseFromQuarantine: jest.fn().mockResolvedValue({}),
    };
    mockReservation = {
      getActiveReservations: jest.fn().mockResolvedValue([]),
      createReservation: jest.fn().mockResolvedValue({ id: TEST_UUID }),
      confirmReservation: jest.fn().mockResolvedValue({}),
      fulfillReservation: jest.fn().mockResolvedValue({}),
      cancelReservation: jest.fn().mockResolvedValue({}),
    };

    ({ app, mockService } = await createControllerTestApp(
      WarehouseController,
      WarehouseService,
      [
        "create",
        "findAll",
        "findById",
        "update",
        "remove",
        "getWarehouseInventory",
        "transferStock",
      ],
      [
        { provide: StockTakeService, useValue: mockStockTake },
        { provide: InventoryBatchService, useValue: mockBatch },
        { provide: StockReservationService, useValue: mockReservation },
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for verifyWarehouseAccess
    mockService.findById.mockResolvedValue({
      id: TEST_UUID,
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
    });
  });

  // ── Auth ────────────────────────────────────────────────

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/warehouses")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/warehouses")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator role on create", async () => {
    await request(app.getHttpServer())
      .post("/warehouses")
      .set("Authorization", "Bearer operator-token")
      .send({
        organizationId: TEST_UUID,
        name: "Test WH",
        code: "WH-001",
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── Warehouse CRUD ──────────────────────────────────────

  it("POST /warehouses creates warehouse (201)", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/warehouses")
      .set("Authorization", "Bearer admin-token")
      .send({
        organizationId: TEST_UUID,
        name: "Main Warehouse",
        code: "WH-001",
      })
      .expect(HttpStatus.CREATED);
    expect(mockService.create).toHaveBeenCalled();
  });

  it("GET /warehouses returns list (200)", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/warehouses")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /warehouses/:id returns warehouse (200)", async () => {
    await request(app.getHttpServer())
      .get(`/warehouses/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PATCH /warehouses/:id updates warehouse (200)", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/warehouses/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated WH" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /warehouses/:id soft-deletes (200)", async () => {
    mockService.remove.mockResolvedValue({ affected: 1 });
    await request(app.getHttpServer())
      .delete(`/warehouses/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── Stock ───────────────────────────────────────────────

  it("GET /warehouses/:id/stock returns inventory (200)", async () => {
    mockService.getWarehouseInventory.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/warehouses/${TEST_UUID}/stock`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /warehouses/:id/stock/summary returns summary (200)", async () => {
    await request(app.getHttpServer())
      .get(`/warehouses/${TEST_UUID}/stock/summary`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockBatch.getStockSummary).toHaveBeenCalled();
  });

  // ── Movements ───────────────────────────────────────────

  it("GET /warehouses/:id/movements returns movements (200)", async () => {
    await request(app.getHttpServer())
      .get(`/warehouses/${TEST_UUID}/movements`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockStockTake.getMovements).toHaveBeenCalled();
  });

  it("PATCH /warehouses/movements/:id/complete completes movement (200)", async () => {
    await request(app.getHttpServer())
      .patch(`/warehouses/movements/${TEST_UUID}/complete`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockStockTake.completeMovement).toHaveBeenCalled();
  });

  // ── Batches ─────────────────────────────────────────────

  it("GET /warehouses/:id/batches returns batches (200)", async () => {
    await request(app.getHttpServer())
      .get(`/warehouses/${TEST_UUID}/batches`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockStockTake.getBatches).toHaveBeenCalled();
  });

  it("GET /warehouses/:id/batches/expiring returns expiring (200)", async () => {
    await request(app.getHttpServer())
      .get(`/warehouses/${TEST_UUID}/batches/expiring`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockBatch.getExpiringBatches).toHaveBeenCalled();
  });

  // ── Reservations ────────────────────────────────────────

  it("GET /warehouses/:id/reservations returns reservations (200)", async () => {
    await request(app.getHttpServer())
      .get(`/warehouses/${TEST_UUID}/reservations`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockReservation.getActiveReservations).toHaveBeenCalled();
  });

  it("PATCH /warehouses/reservations/:id/confirm confirms (200)", async () => {
    await request(app.getHttpServer())
      .patch(`/warehouses/reservations/${TEST_UUID}/confirm`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockReservation.confirmReservation).toHaveBeenCalled();
  });
});
