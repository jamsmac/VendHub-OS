import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { IncidentsController } from "./incidents.controller";
import { IncidentsService } from "./incidents.service";

describe("IncidentsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      IncidentsController,
      IncidentsService,
      [
        "create",
        "query",
        "getStatistics",
        "findByMachine",
        "findById",
        "update",
        "assign",
        "resolve",
        "close",
        "remove",
      ],
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
      .get("/incidents")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ---- Role rejection ----

  it("rejects viewer on GET /incidents", async () => {
    await request(app.getHttpServer())
      .get("/incidents")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator on GET /incidents/statistics", async () => {
    await request(app.getHttpServer())
      .get("/incidents/statistics?dateFrom=2026-01-01&dateTo=2026-12-31")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator on DELETE /incidents/:id", async () => {
    await request(app.getHttpServer())
      .delete(`/incidents/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ---- Success cases ----

  it("GET /incidents returns 200", async () => {
    mockService.query.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/incidents")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /incidents/:id returns 200", async () => {
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/incidents/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /incidents/statistics returns 200", async () => {
    mockService.getStatistics.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/incidents/statistics?dateFrom=2026-01-01&dateTo=2026-12-31")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /incidents/machine/:machineId returns 200", async () => {
    mockService.findByMachine.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/incidents/machine/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /incidents returns 201", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/incidents")
      .set("Authorization", "Bearer admin-token")
      .send({
        machineId: TEST_UUID,
        type: "mechanical_failure",
        title: "Motor jammed",
      })
      .expect(HttpStatus.CREATED);
  });

  it("PATCH /incidents/:id returns 200", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/incidents/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ title: "Updated title" })
      .expect(HttpStatus.OK);
  });

  it("POST /incidents/:id/assign returns 200", async () => {
    mockService.assign.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/incidents/${TEST_UUID}/assign`)
      .set("Authorization", "Bearer admin-token")
      .send({ assignedToUserId: TEST_UUID })
      .expect(HttpStatus.OK);
  });

  it("POST /incidents/:id/resolve returns 200", async () => {
    mockService.resolve.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/incidents/${TEST_UUID}/resolve`)
      .set("Authorization", "Bearer admin-token")
      .send({ resolution: "Replaced motor unit" })
      .expect(HttpStatus.OK);
  });

  it("POST /incidents/:id/close returns 200", async () => {
    mockService.close.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/incidents/${TEST_UUID}/close`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("DELETE /incidents/:id returns 204", async () => {
    mockService.remove.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/incidents/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ---- Operator allowed on CRUD, not on management ----

  it("allows operator on POST /incidents", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/incidents")
      .set("Authorization", "Bearer operator-token")
      .send({
        machineId: TEST_UUID,
        type: "mechanical_failure",
        title: "Test incident",
      })
      .expect(HttpStatus.CREATED);
  });

  it("rejects operator on POST /incidents/:id/assign", async () => {
    await request(app.getHttpServer())
      .post(`/incidents/${TEST_UUID}/assign`)
      .set("Authorization", "Bearer operator-token")
      .send({ assignedToUserId: TEST_UUID })
      .expect(HttpStatus.FORBIDDEN);
  });
});
