import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../../common/test-utils/controller-test.helper";
import { AchievementController } from "./achievement.controller";
import { AchievementService } from "../services/achievement.service";

describe("AchievementController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      AchievementController,
      AchievementService,
      [
        "getAchievements",
        "getAchievementsAdmin",
        "getUserAchievements",
        "getStats",
        "createAchievement",
        "updateAchievement",
        "deleteAchievement",
        "seedDefaults",
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
      .get("/loyalty/achievements")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // GET /loyalty/achievements
  // =========================================================================

  it("GET /loyalty/achievements returns 200", async () => {
    mockService.getAchievementsAdmin.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/loyalty/achievements")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // GET /loyalty/achievements/my
  // =========================================================================

  it("GET /loyalty/achievements/my returns 200", async () => {
    mockService.getUserAchievements.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/loyalty/achievements/my")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // GET /loyalty/achievements/stats
  // =========================================================================

  it("GET /loyalty/achievements/stats returns 200", async () => {
    mockService.getStats.mockResolvedValue({
      totalAchievements: 0,
      totalUnlocked: 0,
      totalRewardsClaimed: 0,
    });
    await request(app.getHttpServer())
      .get("/loyalty/achievements/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("rejects viewer for GET /loyalty/achievements/stats", async () => {
    await request(app.getHttpServer())
      .get("/loyalty/achievements/stats")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // POST /loyalty/achievements
  // =========================================================================

  it("POST /loyalty/achievements returns 201", async () => {
    mockService.createAchievement.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/loyalty/achievements")
      .set("Authorization", "Bearer admin-token")
      .send({
        title: "First Order",
        description: "Make your first order",
        conditionType: "total_orders",
        conditionValue: 1,
      })
      .expect(HttpStatus.CREATED);
  });

  it("rejects viewer for POST /loyalty/achievements", async () => {
    await request(app.getHttpServer())
      .post("/loyalty/achievements")
      .set("Authorization", "Bearer viewer-token")
      .send({
        title: "First Order",
        description: "Make your first order",
        conditionType: "total_orders",
        conditionValue: 1,
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // PATCH /loyalty/achievements/:id
  // =========================================================================

  it("PATCH /loyalty/achievements/:id returns 200", async () => {
    mockService.updateAchievement.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/loyalty/achievements/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ title: "Updated" })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // DELETE /loyalty/achievements/:id
  // =========================================================================

  it("DELETE /loyalty/achievements/:id returns 204", async () => {
    mockService.deleteAchievement.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/loyalty/achievements/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // =========================================================================
  // POST /loyalty/achievements/seed
  // =========================================================================

  it("POST /loyalty/achievements/seed returns 201", async () => {
    mockService.seedDefaults.mockResolvedValue([]);
    await request(app.getHttpServer())
      .post("/loyalty/achievements/seed")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.CREATED);
  });
});
