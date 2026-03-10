import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../../common/test-utils/controller-test.helper";
import { WashingScheduleController } from "./washing-schedule.controller";
import { WashingScheduleService } from "../services/washing-schedule.service";

describe("WashingScheduleController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      WashingScheduleController,
      WashingScheduleService,
      ["create", "findAll", "findOne", "update", "completeWash", "delete"],
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
      .get("/washing-schedules")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ---- Role rejection ----

  it("rejects viewer on GET /washing-schedules", async () => {
    await request(app.getHttpServer())
      .get("/washing-schedules")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator on POST /washing-schedules", async () => {
    await request(app.getHttpServer())
      .post("/washing-schedules")
      .set("Authorization", "Bearer operator-token")
      .send({
        machineId: TEST_UUID,
        frequencyDays: 7,
        nextWashDate: "2026-04-01T00:00:00.000Z",
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ---- Success cases ----

  it("GET /washing-schedules returns 200", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/washing-schedules")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /washing-schedules/:id returns 200", async () => {
    mockService.findOne.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/washing-schedules/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /washing-schedules returns 201", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/washing-schedules")
      .set("Authorization", "Bearer admin-token")
      .send({
        machineId: TEST_UUID,
        frequencyDays: 7,
        nextWashDate: "2026-04-01T00:00:00.000Z",
      })
      .expect(HttpStatus.CREATED);
  });

  it("PUT /washing-schedules/:id returns 200", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/washing-schedules/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ frequencyDays: 14 })
      .expect(HttpStatus.OK);
  });

  it("POST /washing-schedules/:id/complete returns 201", async () => {
    mockService.completeWash.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/washing-schedules/${TEST_UUID}/complete`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.CREATED);
  });

  it("DELETE /washing-schedules/:id returns 204", async () => {
    mockService.delete.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/washing-schedules/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("rejects operator on DELETE /washing-schedules/:id", async () => {
    await request(app.getHttpServer())
      .delete(`/washing-schedules/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
