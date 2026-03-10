import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { PromoCodesController } from "./promo-codes.controller";
import { PromoCodesService } from "./promo-codes.service";

describe("PromoCodesController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      PromoCodesController,
      PromoCodesService,
      [
        "create",
        "findAll",
        "findById",
        "update",
        "validate",
        "redeem",
        "deactivate",
        "getStats",
        "getRedemptions",
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
  // Auth required
  // =========================================================================

  it("GET /promo-codes returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/promo-codes")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // Role rejection
  // =========================================================================

  it("POST /promo-codes rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/promo-codes")
      .set("Authorization", "Bearer viewer-token")
      .send({
        code: "SUMMER2024",
        name: "Summer Sale",
        type: "percentage",
        value: 15,
        validFrom: "2024-06-01T00:00:00Z",
        validUntil: "2024-08-31T23:59:59Z",
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /promo-codes/:id/deactivate rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post(`/promo-codes/${TEST_UUID}/deactivate`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // CRUD
  // =========================================================================

  it("POST /promo-codes returns 201 for admin", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/promo-codes")
      .set("Authorization", "Bearer admin-token")
      .send({
        code: "SUMMER2024",
        name: "Summer Sale",
        type: "percentage",
        value: 15,
        validFrom: "2024-06-01T00:00:00Z",
        validUntil: "2024-08-31T23:59:59Z",
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /promo-codes returns 200 for admin", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/promo-codes")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /promo-codes/:id returns 200 for admin", async () => {
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/promo-codes/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PUT /promo-codes/:id returns 200 for admin", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/promo-codes/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated Sale" })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Validate (public endpoint)
  // =========================================================================

  it("POST /promo-codes/validate returns 200 without auth (public)", async () => {
    mockService.validate.mockResolvedValue({ valid: true, discount: 15000 });
    await request(app.getHttpServer())
      .post("/promo-codes/validate")
      .send({
        code: "SUMMER2024",
        organizationId: TEST_UUID,
      })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Redeem (all roles)
  // =========================================================================

  it("POST /promo-codes/redeem returns 200 for viewer", async () => {
    mockService.redeem.mockResolvedValue({ redeemed: true });
    await request(app.getHttpServer())
      .post("/promo-codes/redeem")
      .set("Authorization", "Bearer viewer-token")
      .send({
        code: "SUMMER2024",
        clientUserId: TEST_UUID,
      })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Status management
  // =========================================================================

  it("POST /promo-codes/:id/deactivate returns 200 for admin", async () => {
    mockService.deactivate.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/promo-codes/${TEST_UUID}/deactivate`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Stats & redemptions
  // =========================================================================

  it("GET /promo-codes/:id/stats returns 200 for admin", async () => {
    mockService.getStats.mockResolvedValue({ totalUses: 0 });
    await request(app.getHttpServer())
      .get(`/promo-codes/${TEST_UUID}/stats`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /promo-codes/:id/redemptions returns 200 for admin", async () => {
    mockService.getRedemptions.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get(`/promo-codes/${TEST_UUID}/redemptions`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
