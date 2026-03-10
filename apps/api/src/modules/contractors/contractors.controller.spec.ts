import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { ContractorsController } from "./contractors.controller";
import { ContractorsService } from "./contractors.service";

describe("ContractorsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      ContractorsController,
      ContractorsService,
      [
        "createContractor",
        "getContractors",
        "getStats",
        "getContractorsByServiceType",
        "getContractor",
        "updateContractor",
        "deleteContractor",
        "createInvoice",
        "getContractorInvoices",
        "getInvoices",
        "updateInvoice",
        "approveInvoice",
        "recordInvoicePayment",
        "cancelInvoice",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── AUTH ──────────────────────────────────────────────────────
  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/contractors")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ── LIST ─────────────────────────────────────────────────────
  it("GET /contractors returns 200 with auth", async () => {
    mockService.getContractors.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get("/contractors")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /contractors rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/contractors")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /contractors rejects operator role", async () => {
    await request(app.getHttpServer())
      .get("/contractors")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── STATS ────────────────────────────────────────────────────
  it("GET /contractors/stats returns 200", async () => {
    mockService.getStats.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/contractors/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── BY SERVICE TYPE ──────────────────────────────────────────
  it("GET /contractors/by-service/:serviceType returns 200", async () => {
    mockService.getContractorsByServiceType.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/contractors/by-service/maintenance")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── SINGLE ───────────────────────────────────────────────────
  it("GET /contractors/:id returns 200", async () => {
    mockService.getContractor.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/contractors/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── CREATE ───────────────────────────────────────────────────
  it("POST /contractors returns 201 with valid body", async () => {
    mockService.createContractor.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/contractors")
      .set("Authorization", "Bearer admin-token")
      .send({
        companyName: "Test Contractor",
        serviceType: "maintenance",
      })
      .expect(HttpStatus.CREATED);
  });

  // ── UPDATE ───────────────────────────────────────────────────
  it("PUT /contractors/:id returns 200", async () => {
    mockService.updateContractor.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/contractors/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ companyName: "Updated" })
      .expect(HttpStatus.OK);
  });

  // ── DELETE ───────────────────────────────────────────────────
  it("DELETE /contractors/:id returns 204", async () => {
    mockService.deleteContractor.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/contractors/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("DELETE /contractors/:id rejects operator role", async () => {
    await request(app.getHttpServer())
      .delete(`/contractors/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── INVOICES ─────────────────────────────────────────────────
  it("POST /contractors/:id/invoices returns 201", async () => {
    mockService.createInvoice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/contractors/${TEST_UUID}/invoices`)
      .set("Authorization", "Bearer admin-token")
      .send({
        invoiceNumber: "INV-001",
        amount: 100000,
        issueDate: "2026-03-01",
        dueDate: "2026-03-31",
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /contractors/:id/invoices returns 200", async () => {
    mockService.getContractorInvoices.mockResolvedValue({
      items: [],
      total: 0,
    });
    await request(app.getHttpServer())
      .get(`/contractors/${TEST_UUID}/invoices`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /contractors/invoices/all returns 200", async () => {
    mockService.getInvoices.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get("/contractors/invoices/all")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PUT /contractors/invoices/:invoiceId returns 200", async () => {
    mockService.updateInvoice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/contractors/invoices/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ description: "Updated" })
      .expect(HttpStatus.OK);
  });

  it("POST /contractors/invoices/:invoiceId/approve returns 200", async () => {
    mockService.approveInvoice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/contractors/invoices/${TEST_UUID}/approve`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /contractors/invoices/:invoiceId/pay returns 200", async () => {
    mockService.recordInvoicePayment.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/contractors/invoices/${TEST_UUID}/pay`)
      .set("Authorization", "Bearer admin-token")
      .send({ amount: 100000, paymentDate: "2026-03-10" })
      .expect(HttpStatus.OK);
  });

  it("POST /contractors/invoices/:invoiceId/cancel returns 200", async () => {
    mockService.cancelInvoice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/contractors/invoices/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
