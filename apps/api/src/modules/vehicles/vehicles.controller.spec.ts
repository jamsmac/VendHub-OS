import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";

describe("VehiclesController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      VehiclesController,
      VehiclesService,
      ["create", "findAll", "findById", "update", "updateOdometer", "remove"],
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
      .get("/vehicles")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("rejects viewer role on create", async () => {
    await request(app.getHttpServer())
      .post("/vehicles")
      .set("Authorization", "Bearer viewer-token")
      .send({ type: "company", brand: "Toyota", plateNumber: "01A123AA" })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── CRUD ────────────────────────────────────────────────

  it("POST /vehicles creates vehicle (201)", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/vehicles")
      .set("Authorization", "Bearer admin-token")
      .send({ type: "company", brand: "Toyota", plateNumber: "01A123AA" })
      .expect(HttpStatus.CREATED);
    expect(mockService.create).toHaveBeenCalled();
  });

  it("GET /vehicles returns paginated list (200)", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/vehicles")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.findAll).toHaveBeenCalled();
  });

  it("GET /vehicles/:id returns vehicle (200)", async () => {
    mockService.findById.mockResolvedValue({
      id: TEST_UUID,
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    await request(app.getHttpServer())
      .get(`/vehicles/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PATCH /vehicles/:id updates vehicle (200)", async () => {
    mockService.findById.mockResolvedValue({
      id: TEST_UUID,
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/vehicles/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ brand: "Honda" })
      .expect(HttpStatus.OK);
    expect(mockService.update).toHaveBeenCalled();
  });

  it("PATCH /vehicles/:id/odometer updates odometer (200)", async () => {
    mockService.findById.mockResolvedValue({
      id: TEST_UUID,
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    mockService.updateOdometer.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/vehicles/${TEST_UUID}/odometer`)
      .set("Authorization", "Bearer admin-token")
      .send({ odometer: 50000 })
      .expect(HttpStatus.OK);
    expect(mockService.updateOdometer).toHaveBeenCalled();
  });

  it("DELETE /vehicles/:id soft-deletes vehicle (200)", async () => {
    mockService.findById.mockResolvedValue({
      id: TEST_UUID,
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
    });
    mockService.remove.mockResolvedValue({ affected: 1 });
    await request(app.getHttpServer())
      .delete(`/vehicles/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.remove).toHaveBeenCalled();
  });

  it("rejects operator on delete", async () => {
    await request(app.getHttpServer())
      .delete(`/vehicles/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("allows viewer on GET list", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/vehicles")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });
});
