import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { CollectionsController } from "./collections.controller";
import { CollectionsService } from "./collections.service";

describe("CollectionsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      CollectionsController,
      CollectionsService,
      [
        "findAll",
        "findPending",
        "findByOperator",
        "getStats",
        "findOne",
        "getHistory",
        "create",
        "bulkCreate",
        "receive",
        "edit",
        "cancel",
        "bulkCancel",
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

  // ── AUTH ──────────────────────────────────────────────────────
  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/collections")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ── LIST ─────────────────────────────────────────────────────
  it("GET /collections returns 200 with auth", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/collections")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /collections rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/collections")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── PENDING ──────────────────────────────────────────────────
  it("GET /collections/pending returns 200", async () => {
    mockService.findPending.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/collections/pending")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /collections/pending rejects operator role", async () => {
    await request(app.getHttpServer())
      .get("/collections/pending")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── MY COLLECTIONS ───────────────────────────────────────────
  it("GET /collections/my returns 200", async () => {
    mockService.findByOperator.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/collections/my")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.OK);
  });

  // ── STATS ────────────────────────────────────────────────────
  it("GET /collections/stats returns 200", async () => {
    mockService.getStats.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/collections/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── SINGLE ───────────────────────────────────────────────────
  it("GET /collections/:id returns 200", async () => {
    mockService.findOne.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/collections/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── HISTORY ──────────────────────────────────────────────────
  it("GET /collections/:id/history returns 200", async () => {
    mockService.getHistory.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/collections/${TEST_UUID}/history`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── CREATE ───────────────────────────────────────────────────
  it("POST /collections returns 201 with valid body", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/collections")
      .set("Authorization", "Bearer admin-token")
      .send({
        machineId: TEST_UUID,
        collectedAt: "2026-03-10T10:00:00.000Z",
      })
      .expect(HttpStatus.CREATED);
  });

  // ── BULK CREATE ──────────────────────────────────────────────
  it("POST /collections/bulk returns 201", async () => {
    mockService.bulkCreate.mockResolvedValue({ created: 0 });
    await request(app.getHttpServer())
      .post("/collections/bulk")
      .set("Authorization", "Bearer admin-token")
      .send({
        collections: [
          { collectedAt: "2026-03-10T10:00:00.000Z", machineId: TEST_UUID },
        ],
      })
      .expect(HttpStatus.CREATED);
  });

  // ── RECEIVE ──────────────────────────────────────────────────
  it("PATCH /collections/:id/receive returns 200", async () => {
    mockService.receive.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/collections/${TEST_UUID}/receive`)
      .set("Authorization", "Bearer admin-token")
      .send({ amount: 50000 })
      .expect(HttpStatus.OK);
  });

  // ── EDIT ─────────────────────────────────────────────────────
  it("PATCH /collections/:id/edit returns 200", async () => {
    mockService.edit.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/collections/${TEST_UUID}/edit`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Correction" })
      .expect(HttpStatus.OK);
  });

  // ── CANCEL ───────────────────────────────────────────────────
  it("PATCH /collections/:id/cancel returns 200", async () => {
    mockService.cancel.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/collections/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.OK);
  });

  // ── BULK CANCEL ──────────────────────────────────────────────
  it("PATCH /collections/bulk-cancel returns 200", async () => {
    mockService.bulkCancel.mockResolvedValue({ cancelled: 0 });
    await request(app.getHttpServer())
      .patch("/collections/bulk-cancel")
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.OK);
  });

  // ── DELETE ───────────────────────────────────────────────────
  it("DELETE /collections/:id returns 204", async () => {
    mockService.remove.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/collections/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("DELETE /collections/:id rejects operator role", async () => {
    await request(app.getHttpServer())
      .delete(`/collections/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
