import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../../common/test-utils/controller-test.helper";
import { ContractController } from "./contract.controller";
import { ContractService } from "../services/contract.service";
import { CommissionService } from "../services/commission.service";

describe("ContractController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  const mockCommissionService = {
    calculate: jest.fn().mockResolvedValue({}),
    findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    markAsPaid: jest.fn().mockResolvedValue({}),
  };

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      ContractController,
      ContractService,
      [
        "create",
        "findAll",
        "findById",
        "update",
        "remove",
        "activate",
        "suspend",
        "terminate",
      ],
      [{ provide: CommissionService, useValue: mockCommissionService }],
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
      .get("/contracts")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ── LIST ─────────────────────────────────────────────────────
  it("GET /contracts returns 200 with auth", async () => {
    mockService.findAll.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get("/contracts")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /contracts rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/contracts")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /contracts rejects operator role", async () => {
    await request(app.getHttpServer())
      .get("/contracts")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── SINGLE ───────────────────────────────────────────────────
  it("GET /contracts/:id returns 200", async () => {
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/contracts/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── CREATE ───────────────────────────────────────────────────
  it("POST /contracts returns 201 with valid body", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/contracts")
      .set("Authorization", "Bearer admin-token")
      .send({
        contractorId: TEST_UUID,
        contractNumber: "CTR-001",
        startDate: "2026-01-01",
        commissionType: "percentage",
      })
      .expect(HttpStatus.CREATED);
  });

  // ── UPDATE ───────────────────────────────────────────────────
  it("PATCH /contracts/:id returns 200", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/contracts/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ notes: "Updated" })
      .expect(HttpStatus.OK);
  });

  // ── DELETE ───────────────────────────────────────────────────
  it("DELETE /contracts/:id returns 204", async () => {
    mockService.remove.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/contracts/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ── ACTIVATE ─────────────────────────────────────────────────
  it("POST /contracts/:id/activate returns 200", async () => {
    mockService.activate.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/contracts/${TEST_UUID}/activate`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── SUSPEND ──────────────────────────────────────────────────
  it("POST /contracts/:id/suspend returns 200", async () => {
    mockService.suspend.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/contracts/${TEST_UUID}/suspend`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── TERMINATE ────────────────────────────────────────────────
  it("POST /contracts/:id/terminate returns 200", async () => {
    mockService.terminate.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/contracts/${TEST_UUID}/terminate`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── COMMISSIONS ──────────────────────────────────────────────
  it("POST /contracts/:id/commissions/calculate returns 200", async () => {
    mockCommissionService.calculate.mockResolvedValue({});
    await request(app.getHttpServer())
      .post(`/contracts/${TEST_UUID}/commissions/calculate`)
      .set("Authorization", "Bearer admin-token")
      .send({
        contractId: TEST_UUID,
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
      })
      .expect(HttpStatus.OK);
  });

  it("GET /contracts/:id/commissions returns 200", async () => {
    mockCommissionService.findAll.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get(`/contracts/${TEST_UUID}/commissions`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /contracts/commissions/:id/pay returns 200", async () => {
    mockCommissionService.markAsPaid.mockResolvedValue({});
    await request(app.getHttpServer())
      .post(`/contracts/commissions/${TEST_UUID}/pay`)
      .set("Authorization", "Bearer admin-token")
      .send({ paymentTransactionId: TEST_UUID })
      .expect(HttpStatus.OK);
  });
});
