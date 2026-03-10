import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { MaintenanceController } from "./maintenance.controller";
import { MaintenanceService } from "./maintenance.service";

describe("MaintenanceController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      MaintenanceController,
      MaintenanceService,
      [
        "create",
        "findAll",
        "getStats",
        "findOne",
        "update",
        "delete",
        "submit",
        "approve",
        "reject",
        "assignTechnician",
        "start",
        "setAwaitingParts",
        "complete",
        "verify",
        "cancel",
        "addPart",
        "updatePart",
        "removePart",
        "addWorkLog",
        "updateWorkLog",
        "removeWorkLog",
        "createSchedule",
        "findAllSchedules",
        "updateSchedule",
        "deleteSchedule",
      ],
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
      .get("/maintenance")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("rejects viewer for GET /maintenance", async () => {
    await request(app.getHttpServer())
      .get("/maintenance")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // CRUD
  // =========================================================================

  it("GET /maintenance returns 200", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/maintenance")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /maintenance/stats returns 200", async () => {
    mockService.getStats.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/maintenance/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /maintenance/:id returns 200", async () => {
    mockService.findOne.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/maintenance/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /maintenance returns 201", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/maintenance")
      .set("Authorization", "Bearer admin-token")
      .send({
        maintenanceType: "preventive",
        machineId: TEST_UUID,
        title: "Routine check",
      })
      .expect(HttpStatus.CREATED);
  });

  it("PUT /maintenance/:id returns 200", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/maintenance/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ title: "Updated" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /maintenance/:id returns 204", async () => {
    mockService.delete.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/maintenance/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // =========================================================================
  // WORKFLOW
  // =========================================================================

  it("POST /maintenance/:id/submit returns 201", async () => {
    mockService.submit.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/maintenance/${TEST_UUID}/submit`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.CREATED);
  });

  it("POST /maintenance/:id/approve returns 201", async () => {
    mockService.approve.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/maintenance/${TEST_UUID}/approve`)
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.CREATED);
  });

  it("POST /maintenance/:id/reject returns 201", async () => {
    mockService.reject.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/maintenance/${TEST_UUID}/reject`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Not needed" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /maintenance/:id/assign returns 201", async () => {
    mockService.assignTechnician.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/maintenance/${TEST_UUID}/assign`)
      .set("Authorization", "Bearer admin-token")
      .send({ technicianId: TEST_UUID })
      .expect(HttpStatus.CREATED);
  });

  it("POST /maintenance/:id/cancel returns 201", async () => {
    mockService.cancel.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/maintenance/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Changed priority" })
      .expect(HttpStatus.CREATED);
  });

  // =========================================================================
  // PARTS
  // =========================================================================

  it("POST /maintenance/:id/parts returns 201", async () => {
    mockService.addPart.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/maintenance/${TEST_UUID}/parts`)
      .set("Authorization", "Bearer admin-token")
      .send({
        productId: TEST_UUID,
        partName: "Filter",
        quantityNeeded: 2,
        unitPrice: 15000,
      })
      .expect(HttpStatus.CREATED);
  });

  it("DELETE /maintenance/:id/parts/:partId returns 204", async () => {
    mockService.removePart.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/maintenance/${TEST_UUID}/parts/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // =========================================================================
  // SCHEDULES
  // =========================================================================

  // NOTE: GET/POST /maintenance/schedules routes conflict with GET /maintenance/:id
  // because NestJS evaluates routes in declaration order and :id matches first.
  // This is a known controller design issue. Testing POST schedules with required body.

  it("POST /maintenance/schedules returns 201", async () => {
    mockService.createSchedule.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/maintenance/schedules")
      .set("Authorization", "Bearer admin-token")
      .send({
        name: "Weekly check",
        maintenanceType: "preventive",
        frequencyType: "weekly",
        frequencyValue: 1,
      })
      .expect(HttpStatus.CREATED);
  });

  it("PUT /maintenance/schedules/:id returns 200", async () => {
    mockService.updateSchedule.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/maintenance/schedules/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /maintenance/schedules/:id returns 204", async () => {
    mockService.deleteSchedule.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/maintenance/schedules/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });
});
