import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { LocationsController } from "./locations.controller";
import { LocationsService } from "./locations.service";

describe("LocationsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      LocationsController,
      LocationsService,
      ["create", "findAll", "findNearby", "findById", "update", "remove"],
    ));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // AUTH
  // =========================================================================

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/locations")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("rejects viewer for POST /locations", async () => {
    await request(app.getHttpServer())
      .post("/locations")
      .set("Authorization", "Bearer viewer-token")
      .send({})
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // GET /locations
  // =========================================================================

  it("GET /locations returns 200", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/locations")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // GET /locations/nearby
  // =========================================================================

  it("GET /locations/nearby returns 200", async () => {
    mockService.findNearby.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/locations/nearby?lat=41.31&lng=69.28")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // GET /locations/:id
  // =========================================================================

  it("GET /locations/:id returns 200", async () => {
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/locations/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // POST /locations
  // =========================================================================

  it("POST /locations returns 201", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/locations")
      .set("Authorization", "Bearer admin-token")
      .send({
        name: "Test Location",
        address: {
          country: "Uzbekistan",
          region: "Tashkent",
          city: "Tashkent",
          street: "Amir Temur",
          building: "1",
        },
        city: "Tashkent",
        latitude: 41.311081,
        longitude: 69.279737,
      })
      .expect(HttpStatus.CREATED);
  });

  // =========================================================================
  // PATCH /locations/:id
  // =========================================================================

  it("PATCH /locations/:id returns 200", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/locations/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated" })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // DELETE /locations/:id
  // =========================================================================

  it("DELETE /locations/:id returns 204", async () => {
    mockService.remove.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/locations/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("rejects operator for DELETE /locations/:id", async () => {
    await request(app.getHttpServer())
      .delete(`/locations/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
