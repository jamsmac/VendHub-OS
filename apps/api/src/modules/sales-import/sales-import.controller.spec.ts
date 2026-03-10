import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { SalesImportController } from "./sales-import.controller";
import { SalesImportService } from "./sales-import.service";

describe("SalesImportController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      SalesImportController,
      SalesImportService,
      ["create", "findAll", "getStats", "findById", "remove"],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // AUTH
  // ============================================================================

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/sales-import")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ============================================================================
  // CRUD
  // ============================================================================

  it("POST /sales-import returns 201", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/sales-import")
      .set("Authorization", "Bearer admin-token")
      .send({ filename: "sales.xlsx", fileType: "EXCEL" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /sales-import rejects invalid body", async () => {
    await request(app.getHttpServer())
      .post("/sales-import")
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.BAD_REQUEST);
  });

  it("GET /sales-import returns 200", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/sales-import")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /sales-import/stats returns 200", async () => {
    mockService.getStats.mockResolvedValue({ total: 0, successRate: 0 });
    await request(app.getHttpServer())
      .get("/sales-import/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /sales-import/:id returns 200", async () => {
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/sales-import/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("DELETE /sales-import/:id returns 204", async () => {
    mockService.remove.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/sales-import/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ============================================================================
  // ROLE RESTRICTIONS
  // ============================================================================

  it("POST /sales-import rejects viewer", async () => {
    await request(app.getHttpServer())
      .post("/sales-import")
      .set("Authorization", "Bearer viewer-token")
      .send({ filename: "sales.xlsx", fileType: "EXCEL" })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("DELETE /sales-import/:id rejects viewer", async () => {
    await request(app.getHttpServer())
      .delete(`/sales-import/${TEST_UUID}`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /sales-import allows viewer (viewer is in roles list)", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/sales-import")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });
});
