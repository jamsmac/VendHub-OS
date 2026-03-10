import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../../common/test-utils/controller-test.helper";
import { HopperTypeController } from "./hopper-type.controller";
import { HopperTypeService } from "../services/hopper-type.service";

describe("HopperTypeController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      HopperTypeController,
      HopperTypeService,
      ["create", "findAll", "findOne", "update", "delete"],
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
      .get("/hopper-types")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ---- Role rejection ----

  it("rejects viewer on GET /hopper-types", async () => {
    await request(app.getHttpServer())
      .get("/hopper-types")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator on POST /hopper-types", async () => {
    await request(app.getHttpServer())
      .post("/hopper-types")
      .set("Authorization", "Bearer operator-token")
      .send({ name: "Test", volumeMl: 500 })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ---- Success cases ----

  it("GET /hopper-types returns 200", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/hopper-types")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /hopper-types/:id returns 200", async () => {
    mockService.findOne.mockResolvedValue({ id: TEST_UUID, name: "Test" });
    await request(app.getHttpServer())
      .get(`/hopper-types/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /hopper-types returns 201", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID, name: "Test" });
    await request(app.getHttpServer())
      .post("/hopper-types")
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Test Hopper", volumeMl: 500 })
      .expect(HttpStatus.CREATED);
  });

  it("PUT /hopper-types/:id returns 200", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID, name: "Updated" });
    await request(app.getHttpServer())
      .put(`/hopper-types/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /hopper-types/:id returns 204", async () => {
    mockService.delete.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/hopper-types/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("rejects operator on DELETE /hopper-types/:id", async () => {
    await request(app.getHttpServer())
      .delete(`/hopper-types/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
