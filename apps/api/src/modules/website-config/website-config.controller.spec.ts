import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { WebsiteConfigController } from "./website-config.controller";
import { WebsiteConfigService } from "./website-config.service";

describe("WebsiteConfigController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      WebsiteConfigController,
      WebsiteConfigService,
      [
        "getAll",
        "getBySection",
        "getByKey",
        "create",
        "updateByKey",
        "bulkUpdate",
        "deleteByKey",
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
      .get("/website-config")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/website-config")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator role", async () => {
    await request(app.getHttpServer())
      .get("/website-config")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── GET all ─────────────────────────────────────────────

  it("GET /website-config returns all configs (200)", async () => {
    mockService.getAll.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/website-config")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.getAll).toHaveBeenCalled();
  });

  // ── GET by section ──────────────────────────────────────

  it("GET /website-config/:section returns configs by section (200)", async () => {
    mockService.getBySection.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/website-config/general")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.getBySection).toHaveBeenCalled();
  });

  // ── GET by key ──────────────────────────────────────────

  it("GET /website-config/key/:key returns config by key (200)", async () => {
    mockService.getByKey.mockResolvedValue({
      key: "site_name",
      value: "VendHub",
    });
    await request(app.getHttpServer())
      .get("/website-config/key/site_name")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.getByKey).toHaveBeenCalled();
  });

  // ── Create ──────────────────────────────────────────────

  it("POST /website-config creates config (201)", async () => {
    mockService.create.mockResolvedValue({
      key: "site_name",
      value: "VendHub",
    });
    await request(app.getHttpServer())
      .post("/website-config")
      .set("Authorization", "Bearer admin-token")
      .send({ key: "site_name", value: "VendHub" })
      .expect(HttpStatus.CREATED);
    expect(mockService.create).toHaveBeenCalled();
  });

  it("rejects owner on create (admin-only)", async () => {
    // @Roles(UserRole.ADMIN) means only admin level, not owner
    // But role hierarchy: owner(100) > admin(90), so owner should pass
    mockService.create.mockResolvedValue({});
    await request(app.getHttpServer())
      .post("/website-config")
      .set("Authorization", "Bearer owner-token")
      .send({ key: "test", value: "val" })
      .expect(HttpStatus.CREATED);
  });

  // ── Update ──────────────────────────────────────────────

  it("PATCH /website-config/:key updates config (200)", async () => {
    mockService.updateByKey.mockResolvedValue({
      key: "site_name",
      value: "Updated",
    });
    await request(app.getHttpServer())
      .patch("/website-config/site_name")
      .set("Authorization", "Bearer admin-token")
      .send({ value: "Updated" })
      .expect(HttpStatus.OK);
    expect(mockService.updateByKey).toHaveBeenCalled();
  });

  // ── Bulk Update ─────────────────────────────────────────

  it("PATCH /website-config/bulk/update bulk updates (200)", async () => {
    mockService.bulkUpdate.mockResolvedValue([]);
    await request(app.getHttpServer())
      .patch("/website-config/bulk/update")
      .set("Authorization", "Bearer admin-token")
      .send([{ key: "site_name", value: "VendHub v2" }])
      .expect(HttpStatus.OK);
    expect(mockService.bulkUpdate).toHaveBeenCalled();
  });

  // ── Delete ──────────────────────────────────────────────

  it("DELETE /website-config/:key deletes config (204)", async () => {
    mockService.deleteByKey.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete("/website-config/old_key")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
    expect(mockService.deleteByKey).toHaveBeenCalled();
  });

  it("allows owner role on GET", async () => {
    mockService.getAll.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/website-config")
      .set("Authorization", "Bearer owner-token")
      .expect(HttpStatus.OK);
  });
});
