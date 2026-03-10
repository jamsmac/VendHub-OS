import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

describe("BillingController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      BillingController,
      BillingService,
      [
        "createInvoice",
        "findAllInvoices",
        "getInvoiceStats",
        "findInvoiceById",
        "updateInvoice",
        "sendInvoice",
        "cancelInvoice",
        "removeInvoice",
        "recordPayment",
        "findAllPayments",
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
  // AUTH
  // ==========================================================================

  it("GET /billing/invoices returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/billing/invoices")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ==========================================================================
  // INVOICES
  // ==========================================================================

  it("POST /billing/invoices returns 201 with admin auth", async () => {
    mockService.createInvoice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/billing/invoices")
      .set("Authorization", "Bearer admin-token")
      .send({
        customerName: "Test Customer",
        issueDate: "2025-01-15",
        dueDate: "2025-02-15",
        lineItems: [
          {
            description: "Service fee",
            quantity: 1,
            unitPrice: 100000,
            amount: 100000,
          },
        ],
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /billing/invoices returns 200 with admin auth", async () => {
    mockService.findAllInvoices.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/billing/invoices")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /billing/invoices/stats returns 200 with admin auth", async () => {
    mockService.getInvoiceStats.mockResolvedValue({ total: 0 });
    await request(app.getHttpServer())
      .get("/billing/invoices/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /billing/invoices/:id returns 200 with admin auth", async () => {
    mockService.findInvoiceById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/billing/invoices/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PATCH /billing/invoices/:id returns 200 with admin auth", async () => {
    mockService.updateInvoice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/billing/invoices/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ customerName: "Updated Customer" })
      .expect(HttpStatus.OK);
  });

  it("POST /billing/invoices/:id/send returns 200 with admin auth", async () => {
    mockService.sendInvoice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/billing/invoices/${TEST_UUID}/send`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /billing/invoices/:id/cancel returns 200 with admin auth", async () => {
    mockService.cancelInvoice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/billing/invoices/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("DELETE /billing/invoices/:id returns 204 with admin auth", async () => {
    mockService.removeInvoice.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/billing/invoices/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ==========================================================================
  // PAYMENTS
  // ==========================================================================

  it("POST /billing/invoices/:id/payments returns 201 with admin auth", async () => {
    mockService.recordPayment.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/billing/invoices/${TEST_UUID}/payments`)
      .set("Authorization", "Bearer admin-token")
      .send({
        amount: 50000,
        paymentMethod: "cash",
        paymentDate: "2025-01-20",
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /billing/payments returns 200 with admin auth", async () => {
    mockService.findAllPayments.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/billing/payments")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // ROLE RESTRICTIONS
  // ==========================================================================

  it("GET /billing/invoices rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/billing/invoices")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /billing/invoices/:id/cancel rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post(`/billing/invoices/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("DELETE /billing/invoices/:id rejects operator role", async () => {
    await request(app.getHttpServer())
      .delete(`/billing/invoices/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
