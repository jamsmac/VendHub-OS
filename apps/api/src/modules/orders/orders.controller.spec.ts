import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

describe("OrdersController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      OrdersController,
      OrdersService,
      [
        "createOrder",
        "getUserOrders",
        "getOrder",
        "getOrders",
        "getStats",
        "getOrderByNumber",
        "updateStatus",
        "updateOrderPaymentStatus",
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

  it("GET /orders returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/orders")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // Role rejection
  // =========================================================================

  it("GET /orders (admin list) rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/orders")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /orders/:id/cancel rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post(`/orders/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer viewer-token")
      .send({})
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // User endpoints (all roles)
  // =========================================================================

  it("POST /orders returns 201 for viewer (all roles allowed)", async () => {
    mockService.createOrder.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", "Bearer viewer-token")
      .send({
        items: [{ productId: TEST_UUID, quantity: 1 }],
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /orders/my returns 200 for viewer", async () => {
    mockService.getUserOrders.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    await request(app.getHttpServer())
      .get("/orders/my")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("GET /orders/my/:id returns 200 for viewer", async () => {
    mockService.getOrder.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/orders/my/${TEST_UUID}`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Admin endpoints
  // =========================================================================

  it("GET /orders returns 200 for admin", async () => {
    mockService.getOrders.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    await request(app.getHttpServer())
      .get("/orders")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /orders/stats returns 200 for admin", async () => {
    mockService.getStats.mockResolvedValue({ totalOrders: 0 });
    await request(app.getHttpServer())
      .get("/orders/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /orders/:id returns 200 for admin", async () => {
    mockService.getOrder.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/orders/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /orders/by-number/:orderNumber returns 200 for admin", async () => {
    mockService.getOrderByNumber.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get("/orders/by-number/ORD-001")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Status updates
  // =========================================================================

  it("PUT /orders/:id/status returns 200 for admin", async () => {
    mockService.updateStatus.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/orders/${TEST_UUID}/status`)
      .set("Authorization", "Bearer admin-token")
      .send({ status: "confirmed" })
      .expect(HttpStatus.OK);
  });

  it("PUT /orders/:id/payment returns 200 for admin", async () => {
    mockService.updateOrderPaymentStatus.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/orders/${TEST_UUID}/payment`)
      .set("Authorization", "Bearer admin-token")
      .send({ paymentStatus: "paid" })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Quick actions
  // =========================================================================

  it("POST /orders/:id/confirm returns 200 for admin", async () => {
    mockService.updateStatus.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/orders/${TEST_UUID}/confirm`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /orders/:id/complete returns 200 for admin", async () => {
    mockService.updateStatus.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/orders/${TEST_UUID}/complete`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /orders/:id/cancel returns 200 for owner", async () => {
    mockService.updateStatus.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/orders/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer owner-token")
      .send({})
      .expect(HttpStatus.OK);
  });
});
