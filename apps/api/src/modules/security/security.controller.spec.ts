import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { SecurityController } from "./security.controller";
import { SecurityEventService } from "./services/security-event.service";

describe("SecurityController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      SecurityController,
      SecurityEventService,
      ["findAll", "findByUser", "getUnresolvedCount", "resolve"],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // AUTH
  // ============================================================================

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/security/events")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ============================================================================
  // ENDPOINTS
  // ============================================================================

  it("GET /security/events returns 200 for admin", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/security/events")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /security/events/user/:userId returns 200", async () => {
    mockService.findByUser.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/security/events/user/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /security/events/unresolved/count returns 200", async () => {
    mockService.getUnresolvedCount.mockResolvedValue(5);
    await request(app.getHttpServer())
      .get("/security/events/unresolved/count")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /security/events/:id/resolve returns 201 for admin", async () => {
    mockService.resolve.mockResolvedValue({ id: TEST_UUID, isResolved: true });
    await request(app.getHttpServer())
      .post(`/security/events/${TEST_UUID}/resolve`)
      .set("Authorization", "Bearer admin-token")
      .send({ notes: "Confirmed false positive" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /security/events/:id/resolve rejects invalid body", async () => {
    await request(app.getHttpServer())
      .post(`/security/events/${TEST_UUID}/resolve`)
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.BAD_REQUEST);
  });

  // ============================================================================
  // ROLE RESTRICTIONS
  // ============================================================================

  it("GET /security/events rejects viewer", async () => {
    await request(app.getHttpServer())
      .get("/security/events")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /security/events rejects operator", async () => {
    await request(app.getHttpServer())
      .get("/security/events")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /security/events allows owner", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/security/events")
      .set("Authorization", "Bearer owner-token")
      .expect(HttpStatus.OK);
  });
});
