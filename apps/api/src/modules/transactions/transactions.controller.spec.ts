import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";

describe("TransactionsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      TransactionsController,
      TransactionsService,
      [
        "create",
        "processPayment",
        "recordDispense",
        "cancel",
        "query",
        "findById",
        "findByNumber",
        "getStatistics",
        "getCollectionRecords",
        "createCollectionRecord",
        "verifyCollection",
        "getDailySummaries",
        "rebuildDailySummary",
        "getCommissions",
        "createRefund",
        "processRefund",
        "fiscalize",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // AUTH
  // ============================================================================

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/transactions")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ============================================================================
  // TRANSACTION LIFECYCLE
  // ============================================================================

  it("POST /transactions returns 201", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", "Bearer admin-token")
      .send({
        machineId: TEST_UUID,
        items: [
          {
            productId: TEST_UUID,
            slotNumber: 1,
            quantity: 1,
            unitPrice: 5000,
            productName: "Cola",
          },
        ],
      })
      .expect(HttpStatus.CREATED);
  });

  it("POST /transactions rejects invalid body", async () => {
    await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.BAD_REQUEST);
  });

  it("POST /transactions/:id/payment returns 200", async () => {
    mockService.processPayment.mockResolvedValue({});
    await request(app.getHttpServer())
      .post(`/transactions/${TEST_UUID}/payment`)
      .set("Authorization", "Bearer admin-token")
      .send({ method: "cash", amount: 5000 })
      .expect(HttpStatus.OK);
  });

  it("POST /transactions/:id/dispense returns 200", async () => {
    mockService.recordDispense.mockResolvedValue({});
    await request(app.getHttpServer())
      .post(`/transactions/${TEST_UUID}/dispense`)
      .set("Authorization", "Bearer admin-token")
      .send({
        itemId: TEST_UUID,
        status: "dispensed",
        dispensedQuantity: 1,
      })
      .expect(HttpStatus.OK);
  });

  it("POST /transactions/:id/cancel returns 200", async () => {
    mockService.cancel.mockResolvedValue({});
    await request(app.getHttpServer())
      .post(`/transactions/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Customer request" })
      .expect(HttpStatus.OK);
  });

  // ============================================================================
  // QUERIES
  // ============================================================================

  it("GET /transactions returns 200", async () => {
    mockService.query.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/transactions")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /transactions/statistics returns 200", async () => {
    mockService.getStatistics.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/transactions/statistics?dateFrom=2025-01-01&dateTo=2025-01-31")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /transactions/:id returns 200", async () => {
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/transactions/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /transactions/number/:number returns 200", async () => {
    mockService.findByNumber.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get("/transactions/number/TXN-001")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ============================================================================
  // COLLECTIONS
  // ============================================================================

  it("GET /transactions/collections returns 200", async () => {
    mockService.getCollectionRecords.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/transactions/collections")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /transactions/collections returns 201", async () => {
    mockService.createCollectionRecord.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/transactions/collections")
      .set("Authorization", "Bearer admin-token")
      .send({
        machineId: TEST_UUID,
        cashAmount: 500000,
        coinAmount: 50000,
        totalAmount: 550000,
        collectedAt: "2026-02-03T10:00:00Z",
      })
      .expect(HttpStatus.CREATED);
  });

  // ============================================================================
  // DAILY SUMMARIES
  // ============================================================================

  it("GET /transactions/daily-summaries returns 200", async () => {
    mockService.getDailySummaries.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/transactions/daily-summaries")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /transactions/daily-summaries/rebuild returns 200", async () => {
    mockService.rebuildDailySummary.mockResolvedValue({});
    await request(app.getHttpServer())
      .post("/transactions/daily-summaries/rebuild")
      .set("Authorization", "Bearer admin-token")
      .send({ date: "2025-01-01" })
      .expect(HttpStatus.OK);
  });

  // ============================================================================
  // REFUNDS
  // ============================================================================

  it("POST /transactions/:id/refund returns 201", async () => {
    mockService.createRefund.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/transactions/${TEST_UUID}/refund`)
      .set("Authorization", "Bearer admin-token")
      .send({ amount: 5000, reason: "Defective product" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /transactions/refunds/:refundId/process returns 200", async () => {
    mockService.processRefund.mockResolvedValue({});
    await request(app.getHttpServer())
      .post(`/transactions/refunds/${TEST_UUID}/process`)
      .set("Authorization", "Bearer admin-token")
      .send({ success: true })
      .expect(HttpStatus.OK);
  });

  // ============================================================================
  // FISCALIZATION
  // ============================================================================

  it("POST /transactions/:id/fiscalize returns 200", async () => {
    mockService.fiscalize.mockResolvedValue({});
    await request(app.getHttpServer())
      .post(`/transactions/${TEST_UUID}/fiscalize`)
      .set("Authorization", "Bearer admin-token")
      .send({ receiptNumber: "FP-001" })
      .expect(HttpStatus.OK);
  });

  // ============================================================================
  // ROLE RESTRICTIONS
  // ============================================================================

  it("POST /transactions/:id/cancel rejects operator", async () => {
    await request(app.getHttpServer())
      .post(`/transactions/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer operator-token")
      .send({ reason: "test" })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /transactions rejects viewer (needs accountant+)", async () => {
    await request(app.getHttpServer())
      .get("/transactions")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /transactions/:id/refund rejects viewer", async () => {
    await request(app.getHttpServer())
      .post(`/transactions/${TEST_UUID}/refund`)
      .set("Authorization", "Bearer viewer-token")
      .send({ amount: 5000, reason: "test" })
      .expect(HttpStatus.FORBIDDEN);
  });
});
