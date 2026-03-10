import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { ClientController } from "./client.controller";
import { ClientService } from "./client.service";

describe("ClientController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      ClientController,
      ClientService,
      [
        "createClient",
        "findClientById",
        "updateClient",
        "createOrder",
        "getOrderHistory",
        "getWallet",
        "getLoyaltyAccount",
        "getClients",
        "topUpWallet",
        "adjustWallet",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // PUBLIC ENDPOINT
  // ==========================================================================

  it("POST /client/register creates client without auth (public)", async () => {
    mockService.createClient.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/client/register")
      .send({ telegramId: "123456789", firstName: "Aziz" })
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // AUTH
  // ==========================================================================

  it("GET /client/profile/me returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/client/profile/me")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ==========================================================================
  // CUSTOMER-FACING ENDPOINTS (all roles allowed)
  // ==========================================================================

  it("GET /client/profile/me returns 200 with admin auth", async () => {
    mockService.findClientById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get("/client/profile/me")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /client/profile/me returns 200 with viewer auth", async () => {
    mockService.findClientById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get("/client/profile/me")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("PUT /client/profile/me returns 200 with admin auth", async () => {
    mockService.updateClient.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put("/client/profile/me")
      .set("Authorization", "Bearer admin-token")
      .send({ firstName: "Updated" })
      .expect(HttpStatus.OK);
  });

  it("POST /client/orders returns 201 with admin auth", async () => {
    mockService.createOrder.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/client/orders")
      .set("Authorization", "Bearer admin-token")
      .send({
        items: [{ productId: TEST_UUID, quantity: 1 }],
        paymentProvider: "wallet",
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /client/orders/me returns 200 with admin auth", async () => {
    mockService.getOrderHistory.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/client/orders/me")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /client/wallet/me returns 200 with admin auth", async () => {
    mockService.getWallet.mockResolvedValue({ balance: 0 });
    await request(app.getHttpServer())
      .get("/client/wallet/me")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /client/loyalty/me returns 200 with admin auth", async () => {
    mockService.getLoyaltyAccount.mockResolvedValue({ points: 0 });
    await request(app.getHttpServer())
      .get("/client/loyalty/me")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // ADMIN ENDPOINTS
  // ==========================================================================

  it("GET /client/admin/clients returns 200 with admin auth", async () => {
    mockService.getClients.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/client/admin/clients")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /client/admin/clients/:id returns 200 with admin auth", async () => {
    mockService.findClientById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/client/admin/clients/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /client/admin/wallet/:clientId/top-up returns 200 with admin auth", async () => {
    mockService.topUpWallet.mockResolvedValue({ balance: 10000 });
    await request(app.getHttpServer())
      .post(`/client/admin/wallet/${TEST_UUID}/top-up`)
      .set("Authorization", "Bearer admin-token")
      .send({ amount: 10000 })
      .expect(HttpStatus.OK);
  });

  it("POST /client/admin/wallet/:clientId/adjust returns 200 with admin auth", async () => {
    mockService.adjustWallet.mockResolvedValue({ balance: 5000 });
    await request(app.getHttpServer())
      .post(`/client/admin/wallet/${TEST_UUID}/adjust`)
      .set("Authorization", "Bearer admin-token")
      .send({ amount: -5000, reason: "Refund for defective product" })
      .expect(HttpStatus.OK);
  });

  it("GET /client/admin/orders returns 200 with admin auth", async () => {
    mockService.getOrderHistory.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/client/admin/orders")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // ROLE RESTRICTIONS
  // ==========================================================================

  it("GET /client/admin/clients rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/client/admin/clients")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /client/admin/wallet/:clientId/top-up rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post(`/client/admin/wallet/${TEST_UUID}/top-up`)
      .set("Authorization", "Bearer viewer-token")
      .send({ amount: 10000 })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /client/admin/wallet/:clientId/adjust rejects operator role", async () => {
    await request(app.getHttpServer())
      .post(`/client/admin/wallet/${TEST_UUID}/adjust`)
      .set("Authorization", "Bearer operator-token")
      .send({ amount: -5000, reason: "Test" })
      .expect(HttpStatus.FORBIDDEN);
  });
});
