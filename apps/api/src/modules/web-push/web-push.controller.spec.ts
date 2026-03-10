import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { WebPushController } from "./web-push.controller";
import { WebPushService } from "./web-push.service";

describe("WebPushController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      WebPushController,
      WebPushService,
      [
        "getPublicKey",
        "subscribe",
        "unsubscribe",
        "getUserSubscriptions",
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

  // ── Auth ────────────────────────────────────────────────

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/web-push/public-key")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ── Public Key ──────────────────────────────────────────

  it("GET /web-push/public-key returns VAPID key (200)", async () => {
    mockService.getPublicKey.mockReturnValue("VAPID_KEY_123");
    await request(app.getHttpServer())
      .get("/web-push/public-key")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK)
      .expect((res) => {
        expect(res.body.publicKey).toBe("VAPID_KEY_123");
      });
  });

  // ── Subscribe ───────────────────────────────────────────

  it("POST /web-push/subscribe creates subscription (201)", async () => {
    mockService.subscribe.mockResolvedValue({
      id: TEST_UUID,
      endpoint: "https://push.example.com/sub",
    });
    await request(app.getHttpServer())
      .post("/web-push/subscribe")
      .set("Authorization", "Bearer admin-token")
      .send({
        endpoint: "https://push.example.com/sub",
        keys: { p256dh: "key1", auth: "key2" },
      })
      .expect(HttpStatus.CREATED);
    expect(mockService.subscribe).toHaveBeenCalled();
  });

  // ── Unsubscribe ─────────────────────────────────────────

  it("POST /web-push/unsubscribe removes subscription (200)", async () => {
    mockService.unsubscribe.mockResolvedValue(true);
    await request(app.getHttpServer())
      .post("/web-push/unsubscribe")
      .set("Authorization", "Bearer admin-token")
      .send({ endpoint: "https://push.example.com/sub" })
      .expect(HttpStatus.OK);
    expect(mockService.unsubscribe).toHaveBeenCalled();
  });

  // ── Subscriptions List ──────────────────────────────────

  it("GET /web-push/subscriptions lists user subs (200)", async () => {
    mockService.getUserSubscriptions.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/web-push/subscriptions")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.getUserSubscriptions).toHaveBeenCalled();
  });

  // ── Send (admin only) ──────────────────────────────────

  it("POST /web-push/send sends notification (200)", async () => {
    mockService.sendToUser.mockResolvedValue(1);
    await request(app.getHttpServer())
      .post("/web-push/send")
      .set("Authorization", "Bearer admin-token")
      .send({
        userId: TEST_UUID,
        title: "Test Push",
        body: "Hello World",
      })
      .expect(HttpStatus.OK);
    expect(mockService.sendToUser).toHaveBeenCalled();
  });

  it("rejects viewer role on send", async () => {
    await request(app.getHttpServer())
      .post("/web-push/send")
      .set("Authorization", "Bearer viewer-token")
      .send({
        userId: TEST_UUID,
        title: "Test",
        body: "Blocked",
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator role on send", async () => {
    await request(app.getHttpServer())
      .post("/web-push/send")
      .set("Authorization", "Bearer operator-token")
      .send({
        userId: TEST_UUID,
        title: "Test",
        body: "Blocked",
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── Test Push ───────────────────────────────────────────

  it("POST /web-push/test sends test push to self (200)", async () => {
    mockService.sendToUser.mockResolvedValue(1);
    await request(app.getHttpServer())
      .post("/web-push/test")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.sendToUser).toHaveBeenCalled();
  });
});
