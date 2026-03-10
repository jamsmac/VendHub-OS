import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { TripAnalyticsController } from "./trip-analytics.controller";
import { TripAnalyticsService } from "./trip-analytics.service";

describe("TripAnalyticsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      TripAnalyticsController,
      TripAnalyticsService,
      [
        "getMainDashboard",
        "getActivityDashboard",
        "getEmployeeDashboard",
        "getVehiclesDashboard",
        "getAnomaliesDashboard",
        "getTaxiDashboard",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Auth ────────────────────────────────────────────────

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/analytics/trips/dashboard/main")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/analytics/trips/dashboard/main")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator role", async () => {
    await request(app.getHttpServer())
      .get("/analytics/trips/dashboard/main")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── Dashboard endpoints ─────────────────────────────────

  it("GET /analytics/trips/dashboard/main returns 200", async () => {
    mockService.getMainDashboard.mockResolvedValue({ kpis: [] });
    await request(app.getHttpServer())
      .get("/analytics/trips/dashboard/main")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.getMainDashboard).toHaveBeenCalled();
  });

  it("GET /analytics/trips/dashboard/activity returns 200", async () => {
    mockService.getActivityDashboard.mockResolvedValue({ activity: [] });
    await request(app.getHttpServer())
      .get("/analytics/trips/dashboard/activity")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.getActivityDashboard).toHaveBeenCalled();
  });

  it("GET /analytics/trips/dashboard/employees returns 200", async () => {
    mockService.getEmployeeDashboard.mockResolvedValue({ employees: [] });
    await request(app.getHttpServer())
      .get("/analytics/trips/dashboard/employees")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.getEmployeeDashboard).toHaveBeenCalled();
  });

  it("GET /analytics/trips/dashboard/vehicles returns 200", async () => {
    mockService.getVehiclesDashboard.mockResolvedValue({ vehicles: [] });
    await request(app.getHttpServer())
      .get("/analytics/trips/dashboard/vehicles")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.getVehiclesDashboard).toHaveBeenCalled();
  });

  it("GET /analytics/trips/dashboard/anomalies returns 200", async () => {
    mockService.getAnomaliesDashboard.mockResolvedValue({ anomalies: [] });
    await request(app.getHttpServer())
      .get("/analytics/trips/dashboard/anomalies")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.getAnomaliesDashboard).toHaveBeenCalled();
  });

  it("GET /analytics/trips/dashboard/taxi returns 200", async () => {
    mockService.getTaxiDashboard.mockResolvedValue({ taxi: [] });
    await request(app.getHttpServer())
      .get("/analytics/trips/dashboard/taxi")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.getTaxiDashboard).toHaveBeenCalled();
  });

  it("accepts optional period query params", async () => {
    mockService.getMainDashboard.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/analytics/trips/dashboard/main?from=2026-01-01&to=2026-01-31")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("allows owner role", async () => {
    mockService.getMainDashboard.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/analytics/trips/dashboard/main")
      .set("Authorization", "Bearer owner-token")
      .expect(HttpStatus.OK);
  });
});
