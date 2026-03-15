import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { AnalyticsController } from "./analytics.controller";
import { DashboardStatsService } from "./analytics.service";

describe("AnalyticsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      AnalyticsController,
      DashboardStatsService,
      [
        "getDailyStats",
        "aggregateDailyStats",
        "getDashboard",
        "createWidget",
        "updateWidget",
        "deleteWidget",
        "reorderWidgets",
        "getTopMachines",
        "getTopProducts",
        "getRevenueTrend",
        "getSnapshots",
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

  it("GET /analytics/dashboard returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/analytics/dashboard")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ==========================================================================
  // DAILY STATS
  // ==========================================================================

  it("GET /analytics/daily returns 200 with admin auth", async () => {
    mockService.getDailyStats.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/analytics/daily?from=2025-01-01&to=2025-01-31")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /analytics/aggregate/:date returns 201 with admin auth", async () => {
    mockService.aggregateDailyStats.mockResolvedValue({ date: "2025-01-15" });
    await request(app.getHttpServer())
      .post("/analytics/aggregate/2025-01-15")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  it("GET /analytics/dashboard returns 200 with admin auth", async () => {
    mockService.getDashboard.mockResolvedValue({ widgets: [], stats: {} });
    await request(app.getHttpServer())
      .get("/analytics/dashboard")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // WIDGETS
  // ==========================================================================

  it("POST /analytics/widgets returns 201 with admin auth", async () => {
    mockService.createWidget.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/analytics/widgets")
      .set("Authorization", "Bearer admin-token")
      .send({ title: "Revenue Overview", widgetType: "sales_chart" })
      .expect(HttpStatus.CREATED);
  });

  it("PATCH /analytics/widgets/:id returns 200 with admin auth", async () => {
    mockService.updateWidget.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/analytics/widgets/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ title: "Updated Widget" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /analytics/widgets/:id returns 204 with admin auth", async () => {
    mockService.deleteWidget.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/analytics/widgets/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("PUT /analytics/widgets/reorder returns 200 with admin auth", async () => {
    mockService.reorderWidgets.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .put("/analytics/widgets/reorder")
      .set("Authorization", "Bearer admin-token")
      .send({ widgetIds: [TEST_UUID] })
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // CHART DATA
  // ==========================================================================

  it("GET /analytics/top-machines returns 200 with admin auth", async () => {
    mockService.getTopMachines.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/analytics/top-machines?from=2025-01-01&to=2025-01-31")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /analytics/top-products returns 200 with admin auth", async () => {
    mockService.getTopProducts.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/analytics/top-products?from=2025-01-01&to=2025-01-31")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /analytics/revenue-trend returns 200 with admin auth", async () => {
    mockService.getRevenueTrend.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/analytics/revenue-trend?from=2025-01-01&to=2025-01-31")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // SNAPSHOTS
  // ==========================================================================

  it("GET /analytics/snapshots returns 200 with admin auth", async () => {
    mockService.getSnapshots.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/analytics/snapshots?type=daily&from=2025-01-01&to=2025-01-31")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // ROLE RESTRICTIONS
  // ==========================================================================

  it("GET /analytics/daily rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/analytics/daily?from=2025-01-01&to=2025-01-31")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /analytics/aggregate/:date rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/analytics/aggregate/2025-01-15")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /analytics/snapshots rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/analytics/snapshots?type=daily&from=2025-01-01&to=2025-01-31")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
