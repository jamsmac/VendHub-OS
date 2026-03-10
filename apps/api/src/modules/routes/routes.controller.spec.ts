import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { RoutesController } from "./routes.controller";
import { RoutesService } from "./routes.service";
import { RouteOptimizationService } from "./route-optimization.service";

describe("RoutesController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    const mockOptService = {
      optimizeRoute: jest.fn().mockResolvedValue({ optimized: true }),
    };

    ({ app, mockService } = await createControllerTestApp(
      RoutesController,
      RoutesService,
      [
        "create",
        "findAll",
        "findById",
        "update",
        "remove",
        "startRoute",
        "completeRoute",
        "getStops",
        "addStop",
        "updateStop",
        "removeStop",
        "reorderStops",
      ],
      [{ provide: RouteOptimizationService, useValue: mockOptService }],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    // findById is used by verifyRouteAccess - default to returning a route
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
  });

  // ============================================================================
  // AUTH
  // ============================================================================

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/routes")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ============================================================================
  // CRUD
  // ============================================================================

  it("POST /routes returns 201", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer admin-token")
      .send({
        organizationId: TEST_UUID,
        operatorId: TEST_UUID,
        name: "Morning route",
        plannedDate: "2025-01-15",
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /routes returns 200", async () => {
    await request(app.getHttpServer())
      .get("/routes")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /routes/:id returns 200", async () => {
    await request(app.getHttpServer())
      .get(`/routes/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PATCH /routes/:id returns 200", async () => {
    mockService.update.mockResolvedValue({});
    await request(app.getHttpServer())
      .patch(`/routes/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated route" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /routes/:id returns 200", async () => {
    mockService.remove.mockResolvedValue({});
    await request(app.getHttpServer())
      .delete(`/routes/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  it("POST /routes/:id/start returns 201", async () => {
    mockService.startRoute.mockResolvedValue({});
    await request(app.getHttpServer())
      .post(`/routes/${TEST_UUID}/start`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.CREATED);
  });

  it("POST /routes/:id/complete returns 201", async () => {
    mockService.completeRoute.mockResolvedValue({});
    await request(app.getHttpServer())
      .post(`/routes/${TEST_UUID}/complete`)
      .set("Authorization", "Bearer operator-token")
      .send({})
      .expect(HttpStatus.CREATED);
  });

  // ============================================================================
  // ROLE RESTRICTIONS
  // ============================================================================

  it("POST /routes rejects viewer", async () => {
    await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer viewer-token")
      .send({
        organizationId: TEST_UUID,
        operatorId: TEST_UUID,
        name: "test",
        plannedDate: "2025-01-15",
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("DELETE /routes/:id rejects operator", async () => {
    await request(app.getHttpServer())
      .delete(`/routes/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
