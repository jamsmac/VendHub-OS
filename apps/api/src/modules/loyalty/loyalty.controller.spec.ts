import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { LoyaltyController } from "./loyalty.controller";
import { LoyaltyService } from "./loyalty.service";

describe("LoyaltyController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      LoyaltyController,
      LoyaltyService,
      [
        "getBalance",
        "getHistory",
        "getAllLevels",
        "spendPoints",
        "getLeaderboard",
        "adjustPoints",
        "getStats",
        "getExpiringPointsReport",
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
  // AUTH
  // =========================================================================

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/loyalty/balance")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // GET /loyalty/balance (user)
  // =========================================================================

  it("GET /loyalty/balance returns 200", async () => {
    mockService.getBalance.mockResolvedValue({ balance: 0 });
    await request(app.getHttpServer())
      .get("/loyalty/balance")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // GET /loyalty/history (user)
  // =========================================================================

  it("GET /loyalty/history returns 200", async () => {
    mockService.getHistory.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get("/loyalty/history")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // GET /loyalty/levels (user)
  // =========================================================================

  it("GET /loyalty/levels returns 200", async () => {
    mockService.getAllLevels.mockResolvedValue({ levels: [] });
    await request(app.getHttpServer())
      .get("/loyalty/levels")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // POST /loyalty/spend (user)
  // =========================================================================

  it("POST /loyalty/spend returns 200", async () => {
    mockService.spendPoints.mockResolvedValue({ spent: 100, newBalance: 900 });
    await request(app.getHttpServer())
      .post("/loyalty/spend")
      .set("Authorization", "Bearer admin-token")
      .send({ points: 100, orderId: TEST_UUID })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // GET /loyalty/leaderboard (user)
  // =========================================================================

  it("GET /loyalty/leaderboard returns 200", async () => {
    mockService.getLeaderboard.mockResolvedValue({ entries: [] });
    await request(app.getHttpServer())
      .get("/loyalty/leaderboard")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // POST /loyalty/admin/adjust (admin only)
  // =========================================================================

  it("POST /loyalty/admin/adjust returns 200", async () => {
    mockService.adjustPoints.mockResolvedValue({
      earned: 100,
      newBalance: 100,
    });
    await request(app.getHttpServer())
      .post("/loyalty/admin/adjust")
      .set("Authorization", "Bearer admin-token")
      .send({ userId: TEST_UUID, amount: 100, reason: "Compensation" })
      .expect(HttpStatus.OK);
  });

  it("rejects viewer for POST /loyalty/admin/adjust", async () => {
    await request(app.getHttpServer())
      .post("/loyalty/admin/adjust")
      .set("Authorization", "Bearer viewer-token")
      .send({ userId: TEST_UUID, amount: 100, reason: "Compensation" })
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // GET /loyalty/admin/stats (admin)
  // =========================================================================

  it("GET /loyalty/admin/stats returns 200", async () => {
    mockService.getStats.mockResolvedValue({ totalMembers: 0 });
    await request(app.getHttpServer())
      .get("/loyalty/admin/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("rejects viewer for GET /loyalty/admin/stats", async () => {
    await request(app.getHttpServer())
      .get("/loyalty/admin/stats")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // GET /loyalty/admin/expiring (admin)
  // =========================================================================

  it("GET /loyalty/admin/expiring returns 200", async () => {
    mockService.getExpiringPointsReport.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/loyalty/admin/expiring")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // GET /loyalty/levels/info (@Public)
  // =========================================================================

  it("GET /loyalty/levels/info returns 200 without auth", async () => {
    mockService.getAllLevels.mockResolvedValue({ levels: [] });
    await request(app.getHttpServer())
      .get("/loyalty/levels/info")
      .expect(HttpStatus.OK);
  });
});
