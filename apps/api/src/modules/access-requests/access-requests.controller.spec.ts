import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { AccessRequestsController } from "./access-requests.controller";
import { AccessRequestsService } from "./access-requests.service";

describe("AccessRequestsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      AccessRequestsController,
      AccessRequestsService,
      ["create", "findAll", "getStats", "findById", "approve", "reject"],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // POST /access-requests (Public)
  // ==========================================================================

  it("POST /access-requests creates request without auth (public)", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/access-requests")
      .send({ telegramId: "123456789" })
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // GET /access-requests (manager+)
  // ==========================================================================

  it("GET /access-requests returns 200 with admin auth", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/access-requests")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /access-requests returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/access-requests")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("GET /access-requests rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/access-requests")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ==========================================================================
  // GET /access-requests/stats (admin+)
  // ==========================================================================

  it("GET /access-requests/stats returns 200 with admin auth", async () => {
    mockService.getStats.mockResolvedValue({ total: 0, pending: 0 });
    await request(app.getHttpServer())
      .get("/access-requests/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /access-requests/stats rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/access-requests/stats")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ==========================================================================
  // GET /access-requests/:id (manager+)
  // ==========================================================================

  it("GET /access-requests/:id returns 200 with admin auth", async () => {
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/access-requests/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // POST /access-requests/:id/approve (admin+)
  // ==========================================================================

  it("POST /access-requests/:id/approve returns 201 with admin auth", async () => {
    mockService.approve.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/access-requests/${TEST_UUID}/approve`)
      .set("Authorization", "Bearer admin-token")
      .send({
        role: "operator",
        email: "user@vendhub.com",
        password: "securePassword123",
      })
      .expect(HttpStatus.CREATED);
  });

  it("POST /access-requests/:id/approve rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post(`/access-requests/${TEST_UUID}/approve`)
      .set("Authorization", "Bearer viewer-token")
      .send({
        role: "operator",
        email: "user@vendhub.com",
        password: "securePassword123",
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ==========================================================================
  // POST /access-requests/:id/reject (admin+)
  // ==========================================================================

  it("POST /access-requests/:id/reject returns 201 with admin auth", async () => {
    mockService.reject.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/access-requests/${TEST_UUID}/reject`)
      .set("Authorization", "Bearer admin-token")
      .send({ rejectionReason: "Insufficient information" })
      .expect(HttpStatus.CREATED);
  });
});
