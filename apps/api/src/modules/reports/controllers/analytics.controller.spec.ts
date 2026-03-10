import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../../common/test-utils/controller-test.helper";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "../services/analytics.service";

describe("AnalyticsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      AnalyticsController,
      AnalyticsService,
      [
        "getSnapshots",
        "getSnapshot",
        "createDailySnapshot",
        "createWeeklySnapshot",
        "createMonthlySnapshot",
        "getDailyStats",
        "updateDailyStats",
        "getDashboardData",
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
      .get("/analytics/snapshots")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ============================================================================
  // SNAPSHOTS
  // ============================================================================

  it("GET /analytics/snapshots returns 200", async () => {
    mockService.getSnapshots.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/analytics/snapshots")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /analytics/snapshots/:id returns 200", async () => {
    mockService.getSnapshot.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/analytics/snapshots/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /analytics/snapshots/rebuild returns 200 for admin", async () => {
    mockService.createDailySnapshot.mockResolvedValue({});
    await request(app.getHttpServer())
      .post("/analytics/snapshots/rebuild")
      .set("Authorization", "Bearer admin-token")
      .send({ date: "2025-01-01", snapshotType: "daily" })
      .expect(HttpStatus.OK);
  });

  it("POST /analytics/snapshots/rebuild rejects viewer", async () => {
    await request(app.getHttpServer())
      .post("/analytics/snapshots/rebuild")
      .set("Authorization", "Bearer viewer-token")
      .send({ date: "2025-01-01", snapshotType: "daily" })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ============================================================================
  // DAILY STATS
  // ============================================================================

  it("GET /analytics/daily-stats returns 200", async () => {
    mockService.getDailyStats.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/analytics/daily-stats?dateFrom=2025-01-01&dateTo=2025-01-31")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /analytics/daily-stats/rebuild returns 200 for admin", async () => {
    mockService.updateDailyStats.mockResolvedValue({});
    await request(app.getHttpServer())
      .post("/analytics/daily-stats/rebuild")
      .set("Authorization", "Bearer admin-token")
      .send({ date: "2025-01-01" })
      .expect(HttpStatus.OK);
  });

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  it("GET /analytics/dashboard returns 200", async () => {
    mockService.getDashboardData.mockResolvedValue({ today: {}, trends: {} });
    await request(app.getHttpServer())
      .get("/analytics/dashboard")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /analytics/snapshots/rebuild rejects operator", async () => {
    await request(app.getHttpServer())
      .post("/analytics/snapshots/rebuild")
      .set("Authorization", "Bearer operator-token")
      .send({ date: "2025-01-01", snapshotType: "daily" })
      .expect(HttpStatus.FORBIDDEN);
  });
});
