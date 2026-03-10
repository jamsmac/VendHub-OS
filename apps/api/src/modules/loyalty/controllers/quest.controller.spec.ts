import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../../common/test-utils/controller-test.helper";
import { QuestController } from "./quest.controller";
import { QuestService } from "../services/quest.service";

describe("QuestController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      QuestController,
      QuestService,
      [
        "getActiveQuests",
        "getUserQuests",
        "claimReward",
        "getQuests",
        "getQuestStats",
        "createQuest",
        "updateQuest",
        "deleteQuest",
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
      .get("/loyalty/quests")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // GET /loyalty/quests (user — active quests)
  // =========================================================================

  it("GET /loyalty/quests returns 200", async () => {
    mockService.getActiveQuests.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/loyalty/quests")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // GET /loyalty/quests/my (user progress)
  // =========================================================================

  it("GET /loyalty/quests/my returns 200", async () => {
    mockService.getUserQuests.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/loyalty/quests/my")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // POST /loyalty/quests/:id/claim (user)
  // =========================================================================

  it("POST /loyalty/quests/:id/claim returns 200", async () => {
    mockService.claimReward.mockResolvedValue({
      success: true,
      pointsEarned: 50,
      newBalance: 150,
      message: "Reward claimed",
    });
    await request(app.getHttpServer())
      .post(`/loyalty/quests/${TEST_UUID}/claim`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // GET /loyalty/quests/admin/list (admin)
  // =========================================================================

  it("GET /loyalty/quests/admin/list returns 200", async () => {
    mockService.getQuests.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/loyalty/quests/admin/list")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("rejects viewer for GET /loyalty/quests/admin/list", async () => {
    await request(app.getHttpServer())
      .get("/loyalty/quests/admin/list")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // GET /loyalty/quests/admin/stats (admin)
  // =========================================================================

  it("GET /loyalty/quests/admin/stats returns 200", async () => {
    mockService.getQuestStats.mockResolvedValue({
      totalQuests: 0,
      activeQuests: 0,
    });
    await request(app.getHttpServer())
      .get("/loyalty/quests/admin/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // POST /loyalty/quests (admin — create)
  // =========================================================================

  it("POST /loyalty/quests returns 201", async () => {
    mockService.createQuest.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/loyalty/quests")
      .set("Authorization", "Bearer admin-token")
      .send({
        title: "Make 3 orders",
        description: "Complete 3 purchases",
        period: "daily",
        type: "order_count",
        targetValue: 3,
        rewardPoints: 50,
      })
      .expect(HttpStatus.CREATED);
  });

  it("rejects viewer for POST /loyalty/quests", async () => {
    await request(app.getHttpServer())
      .post("/loyalty/quests")
      .set("Authorization", "Bearer viewer-token")
      .send({
        title: "Test",
        description: "Test",
        period: "daily",
        type: "order_count",
        targetValue: 1,
        rewardPoints: 10,
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // PATCH /loyalty/quests/:id (admin)
  // =========================================================================

  it("PATCH /loyalty/quests/:id returns 200", async () => {
    mockService.updateQuest.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/loyalty/quests/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ title: "Updated" })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // DELETE /loyalty/quests/:id (admin)
  // =========================================================================

  it("DELETE /loyalty/quests/:id returns 204", async () => {
    mockService.deleteQuest.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/loyalty/quests/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });
});
