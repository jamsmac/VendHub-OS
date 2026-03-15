import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

describe("NotificationsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      NotificationsController,
      NotificationsService,
      [
        "query",
        "getUnreadCount",
        "markAsRead",
        "markAllAsRead",
        "delete",
        "getSettings",
        "updateSettings",
        "create",
        "sendTemplated",
        "getTemplates",
        "getTemplate",
        "createTemplate",
        "updateTemplate",
        "getCampaigns",
        "createCampaign",
        "startCampaign",
        "deleteOld",
        "processQueue",
        "subscribePush",
        "unsubscribePush",
        "registerFcm",
        "unregisterFcm",
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

  it("GET /notifications returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/notifications")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // User notifications (all roles)
  // =========================================================================

  it("GET /notifications returns 200 with auth", async () => {
    mockService.query.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/notifications")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("GET /notifications/unread-count returns 200", async () => {
    mockService.getUnreadCount.mockResolvedValue(5);
    await request(app.getHttpServer())
      .get("/notifications/unread-count")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("POST /notifications/:id/read returns 200", async () => {
    mockService.markAsRead.mockResolvedValue({});
    await request(app.getHttpServer())
      .post(`/notifications/${TEST_UUID}/read`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("POST /notifications/read-all returns 200", async () => {
    mockService.markAllAsRead.mockResolvedValue(3);
    await request(app.getHttpServer())
      .post("/notifications/read-all")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("DELETE /notifications/:id returns 204", async () => {
    mockService.delete.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/notifications/${TEST_UUID}`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // =========================================================================
  // Settings (all roles)
  // =========================================================================

  it("GET /notifications/settings returns 200", async () => {
    mockService.getSettings.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/notifications/settings")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("PUT /notifications/settings returns 200", async () => {
    mockService.updateSettings.mockResolvedValue({});
    await request(app.getHttpServer())
      .put("/notifications/settings")
      .set("Authorization", "Bearer viewer-token")
      .send({ emailEnabled: true })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Admin operations (owner/admin/manager)
  // =========================================================================

  it("POST /notifications returns 201 for admin", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/notifications")
      .set("Authorization", "Bearer admin-token")
      .send({ title: "Test", message: "Hello", userId: TEST_UUID })
      .expect(HttpStatus.CREATED);
  });

  it("POST /notifications rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/notifications")
      .set("Authorization", "Bearer viewer-token")
      .send({ title: "Test", message: "Hello", userId: TEST_UUID })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /notifications/organization returns 200 for admin", async () => {
    mockService.query.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/notifications/organization")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Templates (owner/admin for write, manager for read)
  // =========================================================================

  it("GET /notifications/templates returns 200 for admin", async () => {
    mockService.getTemplates.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/notifications/templates")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /notifications/templates returns 201 for admin", async () => {
    mockService.createTemplate.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/notifications/templates")
      .set("Authorization", "Bearer admin-token")
      .send({
        name: "welcome",
        code: "WELCOME",
        type: "system",
        titleRu: "Добро пожаловать",
        bodyRu: "Hello {{name}}",
      })
      .expect(HttpStatus.CREATED);
  });

  // =========================================================================
  // Campaigns
  // =========================================================================

  it("GET /notifications/campaigns returns 200 for admin", async () => {
    mockService.getCampaigns.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/notifications/campaigns")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Cleanup / queue
  // =========================================================================

  it("POST /notifications/cleanup returns 200 for admin", async () => {
    mockService.deleteOld.mockResolvedValue(10);
    await request(app.getHttpServer())
      .post("/notifications/cleanup")
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.OK);
  });

  it("POST /notifications/process-queue returns 200 for admin", async () => {
    mockService.processQueue.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .post("/notifications/process-queue")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Push / FCM
  // =========================================================================

  it("POST /notifications/push/subscribe returns 201", async () => {
    mockService.subscribePush.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/notifications/push/subscribe")
      .set("Authorization", "Bearer viewer-token")
      .send({
        endpoint: "https://push.example.com/sub",
        p256dh: "key123",
        auth: "auth123",
      })
      .expect(HttpStatus.CREATED);
  });

  it("DELETE /notifications/push/unsubscribe returns 204", async () => {
    mockService.unsubscribePush.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete("/notifications/push/unsubscribe")
      .set("Authorization", "Bearer viewer-token")
      .send({ endpoint: "https://push.example.com/sub" })
      .expect(HttpStatus.NO_CONTENT);
  });

  it("POST /notifications/fcm/register returns 201", async () => {
    mockService.registerFcm.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/notifications/fcm/register")
      .set("Authorization", "Bearer viewer-token")
      .send({ token: "fcm-token-123", deviceType: "android" })
      .expect(HttpStatus.CREATED);
  });

  it("DELETE /notifications/fcm/unregister returns 204", async () => {
    mockService.unregisterFcm.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete("/notifications/fcm/unregister")
      .set("Authorization", "Bearer viewer-token")
      .send({ token: "fcm-token-123" })
      .expect(HttpStatus.NO_CONTENT);
  });
});
