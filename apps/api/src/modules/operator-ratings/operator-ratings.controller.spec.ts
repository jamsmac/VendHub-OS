import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { OperatorRatingsController } from "./operator-ratings.controller";
import { OperatorRatingsService } from "./operator-ratings.service";

describe("OperatorRatingsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      OperatorRatingsController,
      OperatorRatingsService,
      [
        "calculateRating",
        "recalculateRating",
        "query",
        "getLeaderboard",
        "getOrganizationSummary",
        "getOperatorHistory",
        "findById",
        "remove",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Auth required
  // =========================================================================

  it("GET /operator-ratings returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/operator-ratings")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // Role rejection (requires owner/admin/manager)
  // =========================================================================

  it("GET /operator-ratings rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/operator-ratings")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /operator-ratings/calculate rejects operator role", async () => {
    await request(app.getHttpServer())
      .post("/operator-ratings/calculate")
      .set("Authorization", "Bearer operator-token")
      .send({
        userId: TEST_UUID,
        periodStart: "2025-01-01",
        periodEnd: "2025-01-31",
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // Calculate
  // =========================================================================

  it("POST /operator-ratings/calculate returns 201 for admin", async () => {
    mockService.calculateRating.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/operator-ratings/calculate")
      .set("Authorization", "Bearer admin-token")
      .send({
        userId: TEST_UUID,
        periodStart: "2025-01-01",
        periodEnd: "2025-01-31",
      })
      .expect(HttpStatus.CREATED);
  });

  it("POST /operator-ratings/recalculate/:id returns 201 for admin", async () => {
    mockService.recalculateRating.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/operator-ratings/recalculate/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({
        userId: TEST_UUID,
        periodStart: "2025-01-01",
        periodEnd: "2025-01-31",
      })
      .expect(HttpStatus.CREATED);
  });

  // =========================================================================
  // Query
  // =========================================================================

  it("GET /operator-ratings returns 200 for admin", async () => {
    mockService.query.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/operator-ratings")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /operator-ratings/leaderboard returns 200 for admin", async () => {
    mockService.getLeaderboard.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/operator-ratings/leaderboard")
      .query({ periodStart: "2025-01-01", periodEnd: "2025-01-31" })
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /operator-ratings/summary returns 200 for admin", async () => {
    mockService.getOrganizationSummary.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/operator-ratings/summary")
      .query({ periodStart: "2025-01-01", periodEnd: "2025-01-31" })
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /operator-ratings/operator/:userId returns 200 for admin", async () => {
    mockService.getOperatorHistory.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/operator-ratings/operator/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /operator-ratings/:id returns 200 for admin", async () => {
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/operator-ratings/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Delete
  // =========================================================================

  it("DELETE /operator-ratings/:id returns 204 for admin", async () => {
    mockService.remove.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/operator-ratings/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("DELETE /operator-ratings/:id rejects viewer role", async () => {
    await request(app.getHttpServer())
      .delete(`/operator-ratings/${TEST_UUID}`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
