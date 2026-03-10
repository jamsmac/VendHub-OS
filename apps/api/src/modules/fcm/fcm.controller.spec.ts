import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { FcmController } from "./fcm.controller";
import { FcmService } from "./fcm.service";

describe("FcmController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      FcmController,
      FcmService,
      [
        "isConfigured",
        "registerToken",
        "unregisterToken",
        "getUserTokens",
        "subscribeToTopic",
        "unsubscribeFromTopic",
        "sendToUser",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Auth ----

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/fcm/status")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ---- No class-level @Roles, so all authenticated users can access most endpoints ----

  it("GET /fcm/status returns 200", async () => {
    mockService.isConfigured.mockReturnValue(true);
    await request(app.getHttpServer())
      .get("/fcm/status")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /fcm/register returns 201", async () => {
    mockService.registerToken.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/fcm/register")
      .set("Authorization", "Bearer admin-token")
      .send({ token: "fcm-device-token-123" })
      .expect(HttpStatus.CREATED);
  });

  it("DELETE /fcm/unregister/:token returns 204", async () => {
    mockService.unregisterToken.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete("/fcm/unregister/some-fcm-token")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("GET /fcm/tokens returns 200", async () => {
    mockService.getUserTokens.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/fcm/tokens")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /fcm/subscribe-topic returns 200", async () => {
    mockService.subscribeToTopic.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .post("/fcm/subscribe-topic")
      .set("Authorization", "Bearer admin-token")
      .send({ topic: "alerts" })
      .expect(HttpStatus.OK);
  });

  it("POST /fcm/unsubscribe-topic returns 200", async () => {
    mockService.unsubscribeFromTopic.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .post("/fcm/unsubscribe-topic")
      .set("Authorization", "Bearer admin-token")
      .send({ topic: "alerts" })
      .expect(HttpStatus.OK);
  });

  // ---- POST /fcm/send requires admin/owner ----

  it("POST /fcm/send returns 200 for admin", async () => {
    mockService.sendToUser.mockResolvedValue(2);
    await request(app.getHttpServer())
      .post("/fcm/send")
      .set("Authorization", "Bearer admin-token")
      .send({
        userId: TEST_UUID,
        title: "Test notification",
        body: "Hello world",
      })
      .expect(HttpStatus.OK);
  });

  it("POST /fcm/send rejects operator", async () => {
    await request(app.getHttpServer())
      .post("/fcm/send")
      .set("Authorization", "Bearer operator-token")
      .send({
        userId: TEST_UUID,
        title: "Test notification",
        body: "Hello world",
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("allows viewer on non-restricted endpoints", async () => {
    mockService.isConfigured.mockReturnValue(false);
    await request(app.getHttpServer())
      .get("/fcm/status")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });
});
