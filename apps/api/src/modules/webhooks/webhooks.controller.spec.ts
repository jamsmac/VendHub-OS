import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";

describe("WebhooksController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      WebhooksController,
      WebhooksService,
      ["send"],
    ));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Auth ────────────────────────────────────────────────

  it("returns 401 without auth on GET /webhooks", async () => {
    await request(app.getHttpServer())
      .get("/webhooks")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/webhooks")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator role", async () => {
    await request(app.getHttpServer())
      .get("/webhooks")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── Create Webhook ──────────────────────────────────────

  it("POST /webhooks creates webhook (201)", async () => {
    const res = await request(app.getHttpServer())
      .post("/webhooks")
      .set("Authorization", "Bearer admin-token")
      .send({
        url: "https://example.com/hook",
        events: ["sale.completed"],
      })
      .expect(HttpStatus.CREATED);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("secret");
  });

  // ── List Webhooks ───────────────────────────────────────

  it("GET /webhooks lists webhooks (200)", async () => {
    const res = await request(app.getHttpServer())
      .get("/webhooks")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(res.body).toHaveProperty("webhooks");
    expect(res.body).toHaveProperty("total");
  });

  // ── Get Webhook ─────────────────────────────────────────

  it("GET /webhooks/:id returns 400 for non-existent webhook", async () => {
    await request(app.getHttpServer())
      .get(`/webhooks/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.BAD_REQUEST);
  });

  // ── Full CRUD flow ─────────────────────────────────────

  it("creates, gets, updates, deletes a webhook", async () => {
    // Create
    const createRes = await request(app.getHttpServer())
      .post("/webhooks")
      .set("Authorization", "Bearer admin-token")
      .send({
        url: "https://example.com/crud-test",
        events: ["task.created"],
        description: "CRUD test",
      })
      .expect(HttpStatus.CREATED);

    const webhookId = createRes.body.id;

    // Get
    await request(app.getHttpServer())
      .get(`/webhooks/${webhookId}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK)
      .expect((res) => {
        expect(res.body.url).toBe("https://example.com/crud-test");
      });

    // Update
    await request(app.getHttpServer())
      .put(`/webhooks/${webhookId}`)
      .set("Authorization", "Bearer admin-token")
      .send({ url: "https://example.com/updated", is_active: false })
      .expect(HttpStatus.OK)
      .expect((res) => {
        expect(res.body.url).toBe("https://example.com/updated");
        expect(res.body.is_active).toBe(false);
      });

    // Delete
    await request(app.getHttpServer())
      .delete(`/webhooks/${webhookId}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);

    // Verify deleted
    await request(app.getHttpServer())
      .get(`/webhooks/${webhookId}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.BAD_REQUEST);
  });

  // ── Regenerate Secret ──────────────────────────────────

  it("POST /webhooks/:id/regenerate-secret returns new secret", async () => {
    // Create first
    const createRes = await request(app.getHttpServer())
      .post("/webhooks")
      .set("Authorization", "Bearer admin-token")
      .send({
        url: "https://example.com/secret-test",
        events: ["task.created"],
      })
      .expect(HttpStatus.CREATED);

    const webhookId = createRes.body.id;
    const originalSecret = createRes.body.secret;

    const regenRes = await request(app.getHttpServer())
      .post(`/webhooks/${webhookId}/regenerate-secret`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.CREATED);

    expect(regenRes.body.secret).toBeDefined();
    expect(regenRes.body.secret).not.toBe(originalSecret);
  });

  // ── Events List ─────────────────────────────────────────

  it("GET /webhooks/events/list returns available events", async () => {
    const res = await request(app.getHttpServer())
      .get("/webhooks/events/list")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(res.body.events).toBeDefined();
    expect(res.body.events.length).toBeGreaterThan(0);
  });

  // ── Webhook Logs ────────────────────────────────────────

  it("GET /webhooks/:id/logs returns 400 for non-existent", async () => {
    await request(app.getHttpServer())
      .get(`/webhooks/${TEST_UUID}/logs`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.BAD_REQUEST);
  });

  it("allows owner role", async () => {
    const res = await request(app.getHttpServer())
      .get("/webhooks")
      .set("Authorization", "Bearer owner-token")
      .expect(HttpStatus.OK);
    expect(res.body).toHaveProperty("webhooks");
  });
});
