import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { PurchaseHistoryController } from "./purchase-history.controller";
import { PurchaseHistoryService } from "./purchase-history.service";

describe("PurchaseHistoryController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      PurchaseHistoryController,
      PurchaseHistoryService,
      [
        "create",
        "bulkCreate",
        "findAll",
        "getStats",
        "findById",
        "update",
        "receive",
        "cancel",
        "returnPurchase",
        "remove",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Auth required
  // =========================================================================

  it("GET /purchase-history returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/purchase-history")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // Role rejection
  // =========================================================================

  it("POST /purchase-history rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/purchase-history")
      .set("Authorization", "Bearer viewer-token")
      .send({
        purchaseDate: "2025-01-15",
        productId: TEST_UUID,
        quantity: 100,
        unitPrice: 15000,
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("DELETE /purchase-history/:id rejects viewer role", async () => {
    await request(app.getHttpServer())
      .delete(`/purchase-history/${TEST_UUID}`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // CRUD
  // =========================================================================

  it("POST /purchase-history returns 201 for admin", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/purchase-history")
      .set("Authorization", "Bearer admin-token")
      .send({
        purchaseDate: "2025-01-15",
        productId: TEST_UUID,
        quantity: 100,
        unitPrice: 15000,
      })
      .expect(HttpStatus.CREATED);
  });

  it("POST /purchase-history/bulk returns 201 for admin", async () => {
    mockService.bulkCreate.mockResolvedValue({ created: 1 });
    await request(app.getHttpServer())
      .post("/purchase-history/bulk")
      .set("Authorization", "Bearer admin-token")
      .send({
        purchases: [
          {
            purchaseDate: "2025-01-15",
            productId: TEST_UUID,
            quantity: 50,
            unitPrice: 10000,
          },
        ],
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /purchase-history returns 200 for viewer", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/purchase-history")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("GET /purchase-history/stats returns 200 for admin", async () => {
    mockService.getStats.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/purchase-history/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /purchase-history/:id returns 200 for viewer", async () => {
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/purchase-history/${TEST_UUID}`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("PATCH /purchase-history/:id returns 200 for admin", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/purchase-history/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ quantity: 200 })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Status transitions
  // =========================================================================

  it("POST /purchase-history/:id/receive returns 200 for admin", async () => {
    mockService.receive.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/purchase-history/${TEST_UUID}/receive`)
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.OK);
  });

  it("POST /purchase-history/:id/cancel returns 200 for admin", async () => {
    mockService.cancel.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/purchase-history/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /purchase-history/:id/return returns 200 for admin", async () => {
    mockService.returnPurchase.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/purchase-history/${TEST_UUID}/return`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Defective product" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /purchase-history/:id returns 204 for admin", async () => {
    mockService.remove.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/purchase-history/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // =========================================================================
  // Stats role check
  // =========================================================================

  it("GET /purchase-history/stats rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/purchase-history/stats")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
