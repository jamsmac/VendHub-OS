import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { TripsController } from "./trips.controller";
import { TripsService } from "./trips.service";

describe("TripsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      TripsController,
      TripsService,
      [
        "startTrip",
        "endTrip",
        "cancelTrip",
        "getActiveTrip",
        "listTrips",
        "getTripById",
        "getTripRoute",
        "getTripStops",
        "getTripAnomalies",
        "addPoint",
        "addPointsBatch",
        "updateLiveLocationStatus",
        "getTripTasks",
        "linkTask",
        "completeLinkedTask",
        "listUnresolvedAnomalies",
        "resolveAnomaly",
        "performReconciliation",
        "getReconciliationHistory",
        "getEmployeeStats",
        "getMachineVisitStats",
        "getTripsSummary",
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
      .get("/trips")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("rejects viewer role on list", async () => {
    await request(app.getHttpServer())
      .get("/trips")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── Trip Lifecycle ──────────────────────────────────────

  it("POST /trips/start creates trip (201)", async () => {
    mockService.startTrip.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/trips/start")
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.CREATED);
    expect(mockService.startTrip).toHaveBeenCalled();
  });

  it("POST /trips/:id/end ends trip", async () => {
    mockService.getTripById.mockResolvedValue({
      id: TEST_UUID,
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    mockService.endTrip.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/trips/${TEST_UUID}/end`)
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.CREATED);
  });

  it("POST /trips/:id/cancel cancels trip", async () => {
    mockService.getTripById.mockResolvedValue({
      id: TEST_UUID,
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    mockService.cancelTrip.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/trips/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.CREATED);
  });

  it("GET /trips/active returns active trip", async () => {
    mockService.getActiveTrip.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get("/trips/active")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── Trip Queries ────────────────────────────────────────

  it("GET /trips returns paginated list", async () => {
    mockService.listTrips.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/trips")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.listTrips).toHaveBeenCalled();
  });

  it("GET /trips/:id returns trip by ID", async () => {
    mockService.getTripById.mockResolvedValue({
      id: TEST_UUID,
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    await request(app.getHttpServer())
      .get(`/trips/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /trips/:id/route returns route", async () => {
    mockService.getTripById.mockResolvedValue({
      id: TEST_UUID,
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    mockService.getTripRoute.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/trips/${TEST_UUID}/route`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── GPS Tracking ────────────────────────────────────────

  it("POST /trips/:id/points adds GPS point (201)", async () => {
    mockService.getTripById.mockResolvedValue({
      id: TEST_UUID,
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    mockService.addPoint.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/trips/${TEST_UUID}/points`)
      .set("Authorization", "Bearer admin-token")
      .send({ latitude: 41.311, longitude: 69.24 })
      .expect(HttpStatus.CREATED);
  });

  // ── Anomalies ───────────────────────────────────────────

  it("GET /trips/anomalies/unresolved lists anomalies", async () => {
    mockService.listUnresolvedAnomalies.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/trips/anomalies/unresolved")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("rejects operator on anomalies/unresolved", async () => {
    await request(app.getHttpServer())
      .get("/trips/anomalies/unresolved")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── Reconciliation ─────────────────────────────────────

  it("POST /trips/reconciliation creates reconciliation (201)", async () => {
    mockService.performReconciliation.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/trips/reconciliation")
      .set("Authorization", "Bearer admin-token")
      .send({
        vehicleId: TEST_UUID,
        actualOdometer: 15000,
      })
      .expect(HttpStatus.CREATED);
  });

  // ── Analytics ───────────────────────────────────────────

  it("GET /trips/analytics/summary returns summary", async () => {
    mockService.getTripsSummary.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/trips/analytics/summary?dateFrom=2026-01-01&dateTo=2026-01-31")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
