import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { DirectoriesController } from "./directories.controller";
import { DirectoriesService } from "./directories.service";

const TEST_UUID2 = "550e8400-e29b-41d4-a716-446655440088";

describe("DirectoriesController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      DirectoriesController,
      DirectoriesService,
      [
        "findAll",
        "create",
        "findBySlug",
        "findOne",
        "update",
        "remove",
        "addField",
        "updateField",
        "removeField",
        "findAllEntries",
        "searchEntries",
        "createEntry",
        "inlineCreateEntry",
        "findOneEntry",
        "updateEntry",
        "removeEntry",
        "findEntryAuditLogs",
        "moveEntry",
        "findAllSources",
        "createSource",
        "findOneSource",
        "updateSource",
        "removeSource",
        "triggerSync",
        "findSyncLogs",
        "findAuditLogs",
        "getHierarchyTree",
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
      .get("/directories")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ── LIST DIRECTORIES ─────────────────────────────────────────
  it("GET /directories returns 200 with auth", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/directories")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /directories allows viewer role", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/directories")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  // ── CREATE DIRECTORY ─────────────────────────────────────────
  it("POST /directories returns 201 with valid body", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/directories")
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Units", slug: "units", type: "MANUAL" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /directories rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/directories")
      .set("Authorization", "Bearer viewer-token")
      .send({ name: "Units", slug: "units", type: "MANUAL" })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── BY SLUG ──────────────────────────────────────────────────
  it("GET /directories/by-slug/:slug returns 200", async () => {
    mockService.findBySlug.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get("/directories/by-slug/units")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── SINGLE ───────────────────────────────────────────────────
  it("GET /directories/:id returns 200", async () => {
    mockService.findOne.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/directories/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── UPDATE ───────────────────────────────────────────────────
  it("PATCH /directories/:id returns 200", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/directories/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated" })
      .expect(HttpStatus.OK);
  });

  // ── DELETE ───────────────────────────────────────────────────
  it("DELETE /directories/:id returns 204", async () => {
    mockService.remove.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/directories/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("DELETE /directories/:id rejects operator role", async () => {
    await request(app.getHttpServer())
      .delete(`/directories/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── FIELDS ───────────────────────────────────────────────────
  it("POST /directories/:id/fields returns 201", async () => {
    mockService.addField.mockResolvedValue({ id: TEST_UUID2 });
    await request(app.getHttpServer())
      .post(`/directories/${TEST_UUID}/fields`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "color", displayName: "Color", fieldType: "TEXT" })
      .expect(HttpStatus.CREATED);
  });

  it("PATCH /directories/:id/fields/:fieldId returns 200", async () => {
    mockService.updateField.mockResolvedValue({ id: TEST_UUID2 });
    await request(app.getHttpServer())
      .patch(`/directories/${TEST_UUID}/fields/${TEST_UUID2}`)
      .set("Authorization", "Bearer admin-token")
      .send({ displayName: "Updated Field" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /directories/:id/fields/:fieldId returns 204", async () => {
    mockService.removeField.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/directories/${TEST_UUID}/fields/${TEST_UUID2}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ── ENTRIES ──────────────────────────────────────────────────
  it("GET /directories/:id/entries returns 200", async () => {
    mockService.findAllEntries.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get(`/directories/${TEST_UUID}/entries`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /directories/:id/entries/search returns 200", async () => {
    mockService.searchEntries.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/directories/${TEST_UUID}/entries/search?q=test`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /directories/:id/entries returns 201", async () => {
    mockService.createEntry.mockResolvedValue({ id: TEST_UUID2 });
    await request(app.getHttpServer())
      .post(`/directories/${TEST_UUID}/entries`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Entry 1" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /directories/:id/entries/inline returns 201", async () => {
    mockService.inlineCreateEntry.mockResolvedValue({ id: TEST_UUID2 });
    await request(app.getHttpServer())
      .post(`/directories/${TEST_UUID}/entries/inline`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Quick entry" })
      .expect(HttpStatus.CREATED);
  });

  it("GET /directories/:id/entries/:entryId returns 200", async () => {
    mockService.findOneEntry.mockResolvedValue({ id: TEST_UUID2 });
    await request(app.getHttpServer())
      .get(`/directories/${TEST_UUID}/entries/${TEST_UUID2}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PATCH /directories/:id/entries/:entryId returns 200", async () => {
    mockService.updateEntry.mockResolvedValue({ id: TEST_UUID2 });
    await request(app.getHttpServer())
      .patch(`/directories/${TEST_UUID}/entries/${TEST_UUID2}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /directories/:id/entries/:entryId returns 204", async () => {
    mockService.removeEntry.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/directories/${TEST_UUID}/entries/${TEST_UUID2}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("GET /directories/:id/entries/:entryId/audit returns 200", async () => {
    mockService.findEntryAuditLogs.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get(`/directories/${TEST_UUID}/entries/${TEST_UUID2}/audit`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // POST without @HttpCode defaults to 201
  it("POST /directories/:id/entries/:entryId/move returns 201", async () => {
    mockService.moveEntry.mockResolvedValue({ id: TEST_UUID2 });
    await request(app.getHttpServer())
      .post(`/directories/${TEST_UUID}/entries/${TEST_UUID2}/move`)
      .set("Authorization", "Bearer admin-token")
      .send({ newParentId: null })
      .expect(HttpStatus.CREATED);
  });

  // ── SOURCES ──────────────────────────────────────────────────
  it("GET /directories/:id/sources returns 200", async () => {
    mockService.findAllSources.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get(`/directories/${TEST_UUID}/sources`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /directories/:id/sources returns 201", async () => {
    mockService.createSource.mockResolvedValue({ id: TEST_UUID2 });
    await request(app.getHttpServer())
      .post(`/directories/${TEST_UUID}/sources`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "External API", sourceType: "API" })
      .expect(HttpStatus.CREATED);
  });

  it("DELETE /directories/:id/sources/:sourceId returns 204", async () => {
    mockService.removeSource.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/directories/${TEST_UUID}/sources/${TEST_UUID2}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ── SYNC ─────────────────────────────────────────────────────
  // POST without @HttpCode defaults to 201
  it("POST /directories/:id/sources/:sourceId/sync returns 201", async () => {
    mockService.triggerSync.mockResolvedValue({ status: "completed" });
    await request(app.getHttpServer())
      .post(`/directories/${TEST_UUID}/sources/${TEST_UUID2}/sync`)
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.CREATED);
  });

  it("GET /directories/:id/sync-logs returns 200", async () => {
    mockService.findSyncLogs.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get(`/directories/${TEST_UUID}/sync-logs`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── AUDIT ────────────────────────────────────────────────────
  it("GET /directories/:id/audit returns 200", async () => {
    mockService.findAuditLogs.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get(`/directories/${TEST_UUID}/audit`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── TREE ─────────────────────────────────────────────────────
  it("GET /directories/:id/tree returns 200", async () => {
    mockService.getHierarchyTree.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/directories/${TEST_UUID}/tree`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
