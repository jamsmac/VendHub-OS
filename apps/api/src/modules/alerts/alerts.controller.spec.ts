import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { AlertsController } from "./alerts.controller";
import { AlertsService } from "./alerts.service";

describe("AlertsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      AlertsController,
      AlertsService,
      [
        "createRule",
        "findAllRules",
        "findOneRule",
        "updateRule",
        "toggleRule",
        "deleteRule",
        "getAlertStats",
        "getAlertHistory",
        "getActiveAlerts",
        "acknowledgeAlert",
        "resolveAlert",
        "dismissAlert",
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

  it("GET /alerts/rules returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/alerts/rules")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ==========================================================================
  // ALERT RULES
  // ==========================================================================

  it("POST /alerts/rules returns 201 with admin auth", async () => {
    mockService.createRule.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/alerts/rules")
      .set("Authorization", "Bearer admin-token")
      .send({
        name: "Low stock alert",
        metric: "stock_level",
        condition: "less_than",
        threshold: 5,
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /alerts/rules returns 200 with admin auth", async () => {
    mockService.findAllRules.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/alerts/rules")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /alerts/rules/:id returns 200 with admin auth", async () => {
    mockService.findOneRule.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/alerts/rules/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PUT /alerts/rules/:id returns 200 with admin auth", async () => {
    mockService.updateRule.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/alerts/rules/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated rule" })
      .expect(HttpStatus.OK);
  });

  it("PATCH /alerts/rules/:id/toggle returns 200 with admin auth", async () => {
    mockService.toggleRule.mockResolvedValue({
      id: TEST_UUID,
      isActive: false,
    });
    await request(app.getHttpServer())
      .patch(`/alerts/rules/${TEST_UUID}/toggle`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("DELETE /alerts/rules/:id returns 204 with admin auth", async () => {
    mockService.deleteRule.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/alerts/rules/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ==========================================================================
  // STATS
  // ==========================================================================

  it("GET /alerts/stats returns 200 with admin auth", async () => {
    mockService.getAlertStats.mockResolvedValue({ totalRules: 0 });
    await request(app.getHttpServer())
      .get("/alerts/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // ALERT HISTORY
  // ==========================================================================

  it("GET /alerts/history returns 200 with admin auth", async () => {
    mockService.getAlertHistory.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/alerts/history")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /alerts/active returns 200 with admin auth", async () => {
    mockService.getActiveAlerts.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/alerts/active")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // ALERT LIFECYCLE
  // ==========================================================================

  it("POST /alerts/:id/acknowledge returns 201 with admin auth", async () => {
    mockService.acknowledgeAlert.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/alerts/${TEST_UUID}/acknowledge`)
      .set("Authorization", "Bearer admin-token")
      .send({ message: "Looking into it" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /alerts/:id/resolve returns 201 with admin auth", async () => {
    mockService.resolveAlert.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/alerts/${TEST_UUID}/resolve`)
      .set("Authorization", "Bearer admin-token")
      .send({ message: "Issue fixed" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /alerts/:id/dismiss returns 201 with admin auth", async () => {
    mockService.dismissAlert.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/alerts/${TEST_UUID}/dismiss`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "False alarm" })
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // ROLE RESTRICTIONS
  // ==========================================================================

  it("POST /alerts/rules rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/alerts/rules")
      .set("Authorization", "Bearer viewer-token")
      .send({
        name: "Test",
        metric: "stock_level",
        condition: "less_than",
        threshold: 5,
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /alerts/history rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/alerts/history")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /alerts/:id/dismiss rejects operator role", async () => {
    await request(app.getHttpServer())
      .post(`/alerts/${TEST_UUID}/dismiss`)
      .set("Authorization", "Bearer operator-token")
      .send({ reason: "Test" })
      .expect(HttpStatus.FORBIDDEN);
  });
});
