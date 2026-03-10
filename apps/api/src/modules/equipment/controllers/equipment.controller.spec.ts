import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../../common/test-utils/controller-test.helper";
import { EquipmentController } from "./equipment.controller";
import { EquipmentService } from "../services/equipment.service";

describe("EquipmentController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      EquipmentController,
      EquipmentService,
      [
        "createComponent",
        "findAllComponents",
        "findOneComponent",
        "updateComponent",
        "deleteComponent",
        "createMaintenance",
        "findMaintenanceHistory",
        "createMovement",
        "findMovementHistory",
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
      .get("/equipment")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ── LIST COMPONENTS ──────────────────────────────────────────
  it("GET /equipment returns 200 with auth", async () => {
    mockService.findAllComponents.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/equipment")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /equipment allows operator role", async () => {
    mockService.findAllComponents.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/equipment")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.OK);
  });

  it("GET /equipment rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/equipment")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── SINGLE COMPONENT ─────────────────────────────────────────
  it("GET /equipment/:id returns 200", async () => {
    mockService.findOneComponent.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/equipment/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── CREATE COMPONENT ─────────────────────────────────────────
  it("POST /equipment returns 201 with valid body", async () => {
    mockService.createComponent.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/equipment")
      .set("Authorization", "Bearer admin-token")
      .send({
        componentType: "hopper",
        name: "Main Hopper",
      })
      .expect(HttpStatus.CREATED);
  });

  // ── UPDATE COMPONENT ─────────────────────────────────────────
  it("PUT /equipment/:id returns 200", async () => {
    mockService.updateComponent.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/equipment/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated Hopper" })
      .expect(HttpStatus.OK);
  });

  // ── DELETE COMPONENT ─────────────────────────────────────────
  it("DELETE /equipment/:id returns 204", async () => {
    mockService.deleteComponent.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/equipment/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("DELETE /equipment/:id rejects operator role", async () => {
    await request(app.getHttpServer())
      .delete(`/equipment/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── MAINTENANCE ──────────────────────────────────────────────
  it("POST /equipment/maintenance returns 201", async () => {
    mockService.createMaintenance.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/equipment/maintenance")
      .set("Authorization", "Bearer admin-token")
      .send({
        componentId: TEST_UUID,
        maintenanceType: "preventive",
        description: "Routine check",
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /equipment/maintenance/history returns 200", async () => {
    mockService.findMaintenanceHistory.mockResolvedValue({
      data: [],
      total: 0,
    });
    await request(app.getHttpServer())
      .get("/equipment/maintenance/history")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── MOVEMENTS ────────────────────────────────────────────────
  it("POST /equipment/movements returns 201", async () => {
    mockService.createMovement.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/equipment/movements")
      .set("Authorization", "Bearer admin-token")
      .send({
        componentId: TEST_UUID,
        fromMachineId: TEST_UUID,
        toMachineId: TEST_UUID,
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /equipment/movements/history returns 200", async () => {
    mockService.findMovementHistory.mockResolvedValue({
      data: [],
      total: 0,
    });
    await request(app.getHttpServer())
      .get("/equipment/movements/history")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
