import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { ContainersController } from "./containers.controller";
import { ContainersService } from "./containers.service";

describe("ContainersController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      ContainersController,
      ContainersService,
      [
        "create",
        "findAll",
        "checkLowLevels",
        "checkAllLowLevels",
        "findByNomenclature",
        "findOne",
        "update",
        "remove",
        "refill",
        "findByMachine",
        "getStatsByMachine",
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
      .get("/containers")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ── LIST ─────────────────────────────────────────────────────
  it("GET /containers returns 200 with auth", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/containers")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /containers allows operator role", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/containers")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.OK);
  });

  it("GET /containers rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/containers")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── LOW LEVELS ───────────────────────────────────────────────
  it("GET /containers/low-levels returns 200", async () => {
    mockService.checkLowLevels.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/containers/low-levels?machineId=${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /containers/low-levels/all returns 200", async () => {
    mockService.checkAllLowLevels.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/containers/low-levels/all")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── BY NOMENCLATURE ──────────────────────────────────────────
  it("GET /containers/by-nomenclature/:id returns 200", async () => {
    mockService.findByNomenclature.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/containers/by-nomenclature/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── SINGLE ───────────────────────────────────────────────────
  it("GET /containers/:id returns 200", async () => {
    mockService.findOne.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/containers/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── CREATE ───────────────────────────────────────────────────
  it("POST /containers returns 201 with valid body", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/containers")
      .set("Authorization", "Bearer admin-token")
      .send({
        machineId: TEST_UUID,
        slotNumber: 1,
        capacity: 1000,
      })
      .expect(HttpStatus.CREATED);
  });

  it("POST /containers rejects operator role", async () => {
    await request(app.getHttpServer())
      .post("/containers")
      .set("Authorization", "Bearer operator-token")
      .send({ machineId: TEST_UUID, slotNumber: 1, capacity: 1000 })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── UPDATE ───────────────────────────────────────────────────
  it("PATCH /containers/:id returns 200", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/containers/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated name" })
      .expect(HttpStatus.OK);
  });

  // ── DELETE ───────────────────────────────────────────────────
  it("DELETE /containers/:id returns 200", async () => {
    mockService.remove.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .delete(`/containers/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("DELETE /containers/:id rejects operator role", async () => {
    await request(app.getHttpServer())
      .delete(`/containers/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── REFILL ───────────────────────────────────────────────────
  it("POST /containers/:id/refill returns 201", async () => {
    mockService.refill.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/containers/${TEST_UUID}/refill`)
      .set("Authorization", "Bearer admin-token")
      .send({ quantity: 500 })
      .expect(HttpStatus.CREATED);
  });

  // ── BY MACHINE ───────────────────────────────────────────────
  it("GET /containers/by-machine/:machineId returns 200", async () => {
    mockService.findByMachine.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/containers/by-machine/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /containers/by-machine/:machineId/stats returns 200", async () => {
    mockService.getStatsByMachine.mockResolvedValue({});
    await request(app.getHttpServer())
      .get(`/containers/by-machine/${TEST_UUID}/stats`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
