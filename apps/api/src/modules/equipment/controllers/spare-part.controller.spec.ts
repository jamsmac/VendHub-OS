import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../../common/test-utils/controller-test.helper";
import { SparePartController } from "./spare-part.controller";
import { SparePartService } from "../services/spare-part.service";

describe("SparePartController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      SparePartController,
      SparePartService,
      ["create", "findAll", "findOne", "update", "adjustQuantity", "delete"],
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
      .get("/spare-parts")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ---- Role rejection ----

  it("rejects viewer on GET /spare-parts", async () => {
    await request(app.getHttpServer())
      .get("/spare-parts")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator on POST /spare-parts", async () => {
    await request(app.getHttpServer())
      .post("/spare-parts")
      .set("Authorization", "Bearer operator-token")
      .send({ partNumber: "SP-001", name: "Filter" })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ---- Success cases ----

  it("GET /spare-parts returns 200", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/spare-parts")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /spare-parts/:id returns 200", async () => {
    mockService.findOne.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/spare-parts/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /spare-parts returns 201", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/spare-parts")
      .set("Authorization", "Bearer admin-token")
      .send({ partNumber: "SP-001", name: "Filter" })
      .expect(HttpStatus.CREATED);
  });

  it("PUT /spare-parts/:id returns 200", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/spare-parts/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated Filter" })
      .expect(HttpStatus.OK);
  });

  it("PATCH /spare-parts/:id/quantity returns 200", async () => {
    mockService.adjustQuantity.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/spare-parts/${TEST_UUID}/quantity`)
      .set("Authorization", "Bearer admin-token")
      .send({ adjustment: 5 })
      .expect(HttpStatus.OK);
  });

  it("DELETE /spare-parts/:id returns 204", async () => {
    mockService.delete.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/spare-parts/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("rejects operator on DELETE /spare-parts/:id", async () => {
    await request(app.getHttpServer())
      .delete(`/spare-parts/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
