import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { AchievementsController } from "./achievements.controller";
import { AchievementsService } from "./achievements.service";

describe("AchievementsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      AchievementsController,
      AchievementsService,
      [
        "getUserAchievementsSummary",
        "getUserAchievements",
        "claimReward",
        "claimAllRewards",
        "getAchievements",
        "getStats",
        "createAchievement",
        "updateAchievement",
        "deleteAchievement",
        "seedDefaultAchievements",
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

  it("GET /achievements returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/achievements")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ==========================================================================
  // USER ENDPOINTS
  // ==========================================================================

  it("GET /achievements/my returns 200 with admin auth", async () => {
    mockService.getUserAchievementsSummary.mockResolvedValue({
      total: 0,
      unlocked: 0,
    });
    await request(app.getHttpServer())
      .get("/achievements/my")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /achievements/my returns 200 with viewer auth (all roles allowed)", async () => {
    mockService.getUserAchievementsSummary.mockResolvedValue({
      total: 0,
      unlocked: 0,
    });
    await request(app.getHttpServer())
      .get("/achievements/my")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("GET /achievements/my/all returns 200 with admin auth", async () => {
    mockService.getUserAchievements.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/achievements/my/all")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /achievements/my/:id/claim returns 200 with admin auth", async () => {
    mockService.claimReward.mockResolvedValue({
      success: true,
      pointsClaimed: 100,
    });
    await request(app.getHttpServer())
      .post(`/achievements/my/${TEST_UUID}/claim`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /achievements/my/claim-all returns 200 with admin auth", async () => {
    mockService.claimAllRewards.mockResolvedValue([]);
    await request(app.getHttpServer())
      .post("/achievements/my/claim-all")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // ADMIN ENDPOINTS
  // ==========================================================================

  it("GET /achievements returns 200 with admin auth", async () => {
    mockService.getAchievements.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/achievements")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /achievements rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/achievements")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /achievements/stats returns 200 with admin auth", async () => {
    mockService.getStats.mockResolvedValue({ totalAchievements: 0 });
    await request(app.getHttpServer())
      .get("/achievements/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /achievements returns 201 with admin auth", async () => {
    mockService.createAchievement.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/achievements")
      .set("Authorization", "Bearer admin-token")
      .send({
        name: "First Order",
        description: "Complete your first order",
        conditionType: "first_order",
        conditionValue: 1,
      })
      .expect(HttpStatus.CREATED);
  });

  it("PUT /achievements/:id returns 200 with admin auth", async () => {
    mockService.updateAchievement.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/achievements/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated Name" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /achievements/:id returns 204 with admin auth", async () => {
    mockService.deleteAchievement.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/achievements/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("POST /achievements/seed returns 200 with admin auth", async () => {
    mockService.seedDefaultAchievements.mockResolvedValue(5);
    await request(app.getHttpServer())
      .post("/achievements/seed")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /achievements rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/achievements")
      .set("Authorization", "Bearer viewer-token")
      .send({
        name: "First Order",
        description: "Complete your first order",
        conditionType: "first_order",
        conditionValue: 1,
      })
      .expect(HttpStatus.FORBIDDEN);
  });
});
