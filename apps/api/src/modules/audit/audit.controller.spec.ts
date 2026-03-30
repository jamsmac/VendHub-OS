import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";

describe("AuditController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      AuditController,
      AuditService,
      [
        "queryAuditLogs",
        "getAuditLogById",
        "createAuditLog",
        "getEntityHistory",
        "getStatistics",
        "getSnapshots",
        "getSnapshot",
        "createSnapshot",
        "getUserSessions",
        "endSession",
        "terminateAllUserSessions",
        "markSessionSuspicious",
        "getReports",
        "generateReport",
        "cleanupExpiredLogs",
        "cleanupExpiredSnapshots",
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

  it("GET /audit/logs returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/audit/logs")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ==========================================================================
  // AUDIT LOGS
  // ==========================================================================

  it("GET /audit/logs returns 200 with admin auth", async () => {
    mockService.queryAuditLogs.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/audit/logs")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /audit/logs/:id returns 200 with admin auth", async () => {
    mockService.getAuditLogById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/audit/logs/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /audit/logs returns 201 with admin auth", async () => {
    mockService.createAuditLog.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/audit/logs")
      .set("Authorization", "Bearer admin-token")
      .send({
        entity_type: "users",
        entity_id: TEST_UUID,
        action: "create",
      })
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // ENTITY HISTORY
  // ==========================================================================

  it("GET /audit/history/:entityType/:entityId returns 200", async () => {
    mockService.getEntityHistory.mockResolvedValue({ logs: [], snapshots: [] });
    await request(app.getHttpServer())
      .get(`/audit/history/users/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  it("GET /audit/statistics returns 200 with admin auth", async () => {
    mockService.getStatistics.mockResolvedValue({ totalLogs: 0 });
    await request(app.getHttpServer())
      .get(
        `/audit/statistics?dateFrom=2025-01-01T00:00:00.000Z&dateTo=2025-12-31T23:59:59.999Z`,
      )
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // SNAPSHOTS
  // ==========================================================================

  it("GET /audit/snapshots/:entityType/:entityId returns 200 with admin auth", async () => {
    mockService.getSnapshots.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/audit/snapshots/users/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /audit/snapshots/detail/:id returns 200 with admin auth", async () => {
    mockService.getSnapshot.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/audit/snapshots/detail/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /audit/snapshots returns 201 with admin auth", async () => {
    mockService.createSnapshot.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/audit/snapshots")
      .set("Authorization", "Bearer admin-token")
      .send({
        organization_id: TEST_UUID,
        entity_type: "users",
        entity_id: TEST_UUID,
        snapshot: { name: "Test", status: "active" },
      })
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // SESSIONS
  // ==========================================================================

  it("GET /audit/sessions/user/:userId returns 200 with admin auth", async () => {
    mockService.getUserSessions.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/audit/sessions/user/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /audit/sessions/:sessionId/end returns 200 with admin auth", async () => {
    mockService.endSession.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .post(`/audit/sessions/${TEST_UUID}/end`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "admin_forced" })
      .expect(HttpStatus.OK);
  });

  it("POST /audit/sessions/user/:userId/terminate-all returns 200", async () => {
    mockService.terminateAllUserSessions.mockResolvedValue(3);
    await request(app.getHttpServer())
      .post(`/audit/sessions/user/${TEST_UUID}/terminate-all`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "security_concern" })
      .expect(HttpStatus.OK);
  });

  it("POST /audit/sessions/:sessionId/suspicious returns 200", async () => {
    mockService.markSessionSuspicious.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .post(`/audit/sessions/${TEST_UUID}/suspicious`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Login from unusual location" })
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // REPORTS
  // ==========================================================================

  it("GET /audit/reports returns 200 with admin auth", async () => {
    mockService.getReports.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/audit/reports?organization_id=${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /audit/reports/generate returns 201 with admin auth", async () => {
    mockService.generateReport.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/audit/reports/generate")
      .set("Authorization", "Bearer admin-token")
      .send({
        organization_id: TEST_UUID,
        report_type: "activity",
        date_from: "2025-01-01T00:00:00.000Z",
        date_to: "2025-12-31T23:59:59.999Z",
      })
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // ADMIN CLEANUP
  // ==========================================================================

  it("POST /audit/cleanup/logs returns 200 with owner auth", async () => {
    mockService.cleanupExpiredLogs.mockResolvedValue(42);
    await request(app.getHttpServer())
      .post("/audit/cleanup/logs")
      .set("Authorization", "Bearer owner-token")
      .expect(HttpStatus.OK);
  });

  it("POST /audit/cleanup/snapshots returns 200 with owner auth", async () => {
    mockService.cleanupExpiredSnapshots.mockResolvedValue(10);
    await request(app.getHttpServer())
      .post("/audit/cleanup/snapshots")
      .set("Authorization", "Bearer owner-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // ROLE RESTRICTIONS
  // ==========================================================================

  it("GET /audit/logs rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/audit/logs")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /audit/cleanup/logs rejects admin role (owner only)", async () => {
    await request(app.getHttpServer())
      .post("/audit/cleanup/logs")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /audit/snapshots/:entityType/:entityId rejects viewer", async () => {
    await request(app.getHttpServer())
      .get(`/audit/snapshots/users/${TEST_UUID}`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
