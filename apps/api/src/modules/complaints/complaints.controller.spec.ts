import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { ComplaintsController } from "./complaints.controller";
import { ComplaintsService } from "./complaints.service";
import { StorageService } from "../storage/storage.service";

describe("ComplaintsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  const mockStorageService = {
    getAllowedMimeTypes: jest.fn().mockReturnValue(["image/jpeg", "image/png"]),
    validateFileSize: jest.fn().mockReturnValue(true),
    getMaxFileSize: jest.fn().mockReturnValue(10 * 1024 * 1024),
    uploadFile: jest.fn().mockResolvedValue({ url: "https://cdn/file.jpg" }),
  };

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      ComplaintsController,
      ComplaintsService,
      [
        "create",
        "createPublicComplaint",
        "getQrCodeByCode",
        "getMachineContext",
        "query",
        "getNewComplaints",
        "getStatistics",
        "findById",
        "findByNumber",
        "update",
        "assign",
        "resolve",
        "escalate",
        "reject",
        "submitFeedbackByToken",
        "generateFeedbackToken",
        "getComments",
        "addComment",
        "createRefund",
        "approveRefund",
        "processRefund",
        "rejectRefund",
        "generateQrCode",
        "getQrCodesForMachine",
        "getTemplates",
      ],
      [{ provide: StorageService, useValue: mockStorageService }],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── AUTH ──────────────────────────────────────────────────────
  it("returns 401 without auth on protected endpoint", async () => {
    await request(app.getHttpServer())
      .get("/complaints")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ── PUBLIC ENDPOINTS (tested with auth since test helper always enforces auth) ──
  it("GET /complaints/machines/:machineId returns 200", async () => {
    mockService.getMachineContext.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/complaints/machines/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /complaints/qr-codes/:code returns 200", async () => {
    mockService.getQrCodeByCode.mockResolvedValue({ code: "QR-123" });
    await request(app.getHttpServer())
      .get("/complaints/qr-codes/QR-123")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /complaints/feedback/:token returns 200", async () => {
    mockService.submitFeedbackByToken.mockResolvedValue({});
    await request(app.getHttpServer())
      .post("/complaints/feedback/valid-test-token")
      .send({ rating: 5, comment: "Great" })
      .expect(HttpStatus.OK);
  });

  // ── QUERY COMPLAINTS ─────────────────────────────────────────
  it("GET /complaints returns 200 with auth", async () => {
    mockService.query.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/complaints")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /complaints rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/complaints")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── NEW COMPLAINTS ───────────────────────────────────────────
  it("GET /complaints/new returns 200", async () => {
    mockService.getNewComplaints.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/complaints/new")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── MY COMPLAINTS ────────────────────────────────────────────
  it("GET /complaints/my returns 200 with operator", async () => {
    mockService.query.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/complaints/my")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.OK);
  });

  // ── STATISTICS ───────────────────────────────────────────────
  it("GET /complaints/statistics returns 200", async () => {
    mockService.getStatistics.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/complaints/statistics?dateFrom=2026-01-01&dateTo=2026-12-31")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── FIND BY ID ───────────────────────────────────────────────
  it("GET /complaints/:id returns 200", async () => {
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/complaints/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── FIND BY NUMBER ───────────────────────────────────────────
  it("GET /complaints/number/:number returns 200", async () => {
    mockService.findByNumber.mockResolvedValue({ number: "C-001" });
    await request(app.getHttpServer())
      .get("/complaints/number/C-001")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── CREATE ───────────────────────────────────────────────────
  it("POST /complaints returns 201", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/complaints")
      .set("Authorization", "Bearer admin-token")
      .send({
        organizationId: TEST_UUID,
        category: "product_not_dispensed",
        source: "manual",
        subject: "Test",
        description: "Test complaint",
      })
      .expect(HttpStatus.CREATED);
  });

  // ── UPDATE ───────────────────────────────────────────────────
  it("PATCH /complaints/:id returns 200", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/complaints/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ subject: "Updated" })
      .expect(HttpStatus.OK);
  });

  // ── ASSIGN ───────────────────────────────────────────────────
  it("POST /complaints/:id/assign returns 200", async () => {
    mockService.assign.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/complaints/${TEST_UUID}/assign`)
      .set("Authorization", "Bearer admin-token")
      .send({ assignedToId: TEST_UUID })
      .expect(HttpStatus.OK);
  });

  // ── RESOLVE ──────────────────────────────────────────────────
  it("POST /complaints/:id/resolve returns 200", async () => {
    mockService.resolve.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/complaints/${TEST_UUID}/resolve`)
      .set("Authorization", "Bearer admin-token")
      .send({ resolution: "Fixed the issue" })
      .expect(HttpStatus.OK);
  });

  // ── ESCALATE ─────────────────────────────────────────────────
  it("POST /complaints/:id/escalate returns 200", async () => {
    mockService.escalate.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/complaints/${TEST_UUID}/escalate`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Needs senior review" })
      .expect(HttpStatus.OK);
  });

  // ── REJECT ───────────────────────────────────────────────────
  it("POST /complaints/:id/reject returns 200", async () => {
    mockService.reject.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/complaints/${TEST_UUID}/reject`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Duplicate complaint" })
      .expect(HttpStatus.OK);
  });

  // ── COMMENTS ─────────────────────────────────────────────────
  it("GET /complaints/:id/comments returns 200", async () => {
    mockService.getComments.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/complaints/${TEST_UUID}/comments`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /complaints/:id/comments returns 201", async () => {
    mockService.addComment.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/complaints/${TEST_UUID}/comments`)
      .set("Authorization", "Bearer admin-token")
      .send({ content: "A comment" })
      .expect(HttpStatus.CREATED);
  });

  // ── REFUNDS ──────────────────────────────────────────────────
  it("POST /complaints/:id/refunds returns 201", async () => {
    mockService.createRefund.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/complaints/${TEST_UUID}/refunds`)
      .set("Authorization", "Bearer admin-token")
      .send({ amount: 10000, method: "cash", reason: "Refund" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /complaints/refunds/:refundId/approve returns 200", async () => {
    mockService.approveRefund.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/complaints/refunds/${TEST_UUID}/approve`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /complaints/refunds/:refundId/process returns 200", async () => {
    mockService.processRefund.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/complaints/refunds/${TEST_UUID}/process`)
      .set("Authorization", "Bearer admin-token")
      .send({ referenceNumber: "REF-001" })
      .expect(HttpStatus.OK);
  });

  it("POST /complaints/refunds/:refundId/reject returns 200", async () => {
    mockService.rejectRefund.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/complaints/refunds/${TEST_UUID}/reject`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Invalid refund request" })
      .expect(HttpStatus.OK);
  });

  // ── QR CODES ─────────────────────────────────────────────────
  it("POST /complaints/qr-codes/generate returns 201", async () => {
    mockService.generateQrCode.mockResolvedValue({ code: "QR-NEW" });
    await request(app.getHttpServer())
      .post("/complaints/qr-codes/generate")
      .set("Authorization", "Bearer admin-token")
      .send({ machineId: TEST_UUID })
      .expect(HttpStatus.CREATED);
  });

  it("GET /complaints/qr-codes/machine/:machineId returns 200", async () => {
    mockService.getQrCodesForMachine.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/complaints/qr-codes/machine/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── TEMPLATES ───────────────────────────────────────────────
  it("GET /complaints/templates returns 200", async () => {
    mockService.getTemplates.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/complaints/templates")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
