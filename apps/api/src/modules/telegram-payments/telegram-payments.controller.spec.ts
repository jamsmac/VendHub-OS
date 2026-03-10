import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { TelegramPaymentsController } from "./telegram-payments.controller";
import { TelegramPaymentsService } from "./telegram-payments.service";

describe("TelegramPaymentsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    // Set webhook secret for webhook tests
    process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret";

    ({ app, mockService } = await createControllerTestApp(
      TelegramPaymentsController,
      TelegramPaymentsService,
      [
        "createInvoice",
        "createInvoiceLink",
        "getUserPayments",
        "getPayment",
        "handlePreCheckoutQuery",
        "handleSuccessfulPayment",
        "getPayments",
        "getStats",
        "refundPayment",
      ],
    ));
  });

  afterAll(async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // AUTH - Guarded endpoints
  // ============================================================================

  it("returns 401 without auth on guarded endpoints", async () => {
    await request(app.getHttpServer())
      .post("/telegram-payments/invoice")
      .send({
        orderId: TEST_UUID,
        provider: "payme",
        currency: "UZS",
        telegramUserId: 12345,
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  it("POST /telegram-payments/invoice returns 201", async () => {
    mockService.createInvoice.mockResolvedValue({
      invoiceId: "inv_123",
      paymentUrl: "https://t.me/invoice/123",
    });
    await request(app.getHttpServer())
      .post("/telegram-payments/invoice")
      .set("Authorization", "Bearer admin-token")
      .send({
        orderId: TEST_UUID,
        provider: "payme",
        currency: "UZS",
        telegramUserId: 12345,
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /telegram-payments/my returns 200", async () => {
    mockService.getUserPayments.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/telegram-payments/my")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /telegram-payments/my/:id returns 200", async () => {
    mockService.getPayment.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/telegram-payments/my/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ============================================================================
  // WEBHOOK ENDPOINTS (no JWT auth, uses secret token header)
  // ============================================================================

  it("POST /telegram-payments/webhook/pre-checkout returns 200 with valid secret", async () => {
    mockService.handlePreCheckoutQuery.mockResolvedValue({
      ok: true,
      errorMessage: undefined,
    });
    // Global JWT guard requires Bearer token even on webhook endpoints
    await request(app.getHttpServer())
      .post("/telegram-payments/webhook/pre-checkout")
      .set("Authorization", "Bearer admin-token")
      .set("x-telegram-bot-api-secret-token", "test-secret")
      .send({
        preCheckoutQueryId: "query_123",
        telegramUserId: 12345,
        invoicePayload: "payload",
        currency: "UZS",
        totalAmount: 50000,
      })
      .expect(HttpStatus.OK);
  });

  it("POST /telegram-payments/webhook/pre-checkout rejects invalid secret", async () => {
    await request(app.getHttpServer())
      .post("/telegram-payments/webhook/pre-checkout")
      .set("Authorization", "Bearer admin-token")
      .set("x-telegram-bot-api-secret-token", "wrong-secret")
      .send({
        preCheckoutQueryId: "query_123",
        telegramUserId: 12345,
        invoicePayload: "payload",
        currency: "UZS",
        totalAmount: 50000,
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  it("GET /telegram-payments returns 200 for admin", async () => {
    mockService.getPayments.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/telegram-payments")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /telegram-payments/stats returns 200 for admin", async () => {
    mockService.getStats.mockResolvedValue({
      totalPayments: 0,
      totalAmount: 0,
    });
    await request(app.getHttpServer())
      .get("/telegram-payments/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /telegram-payments/:id returns 200 for admin", async () => {
    mockService.getPayment.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/telegram-payments/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /telegram-payments/:id/refund returns 201 for owner", async () => {
    mockService.refundPayment.mockResolvedValue({
      id: TEST_UUID,
      status: "refunded",
    });
    await request(app.getHttpServer())
      .post(`/telegram-payments/${TEST_UUID}/refund`)
      .set("Authorization", "Bearer owner-token")
      .send({})
      .expect(HttpStatus.CREATED);
  });

  // ============================================================================
  // ROLE RESTRICTIONS
  // ============================================================================

  it("POST /telegram-payments/:id/refund rejects viewer", async () => {
    await request(app.getHttpServer())
      .post(`/telegram-payments/${TEST_UUID}/refund`)
      .set("Authorization", "Bearer viewer-token")
      .send({})
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /telegram-payments rejects operator", async () => {
    await request(app.getHttpServer())
      .get("/telegram-payments")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
