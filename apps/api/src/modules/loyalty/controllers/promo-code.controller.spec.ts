import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../../common/test-utils/controller-test.helper";
import { LoyaltyPromoCodeController } from "./promo-code.controller";
import { LoyaltyPromoCodeService } from "../services/promo-code.service";

describe("LoyaltyPromoCodeController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      LoyaltyPromoCodeController,
      LoyaltyPromoCodeService,
      [
        "validateCode",
        "applyCode",
        "findAll",
        "create",
        "update",
        "remove",
        "getStats",
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
      .get("/loyalty/promo-codes")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // POST /loyalty/promo-codes/validate (any authenticated user)
  // =========================================================================

  it("POST /loyalty/promo-codes/validate returns 200", async () => {
    mockService.validateCode.mockResolvedValue({ valid: true });
    await request(app.getHttpServer())
      .post("/loyalty/promo-codes/validate")
      .set("Authorization", "Bearer admin-token")
      .send({ code: "SUMMER25" })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // POST /loyalty/promo-codes/apply (any authenticated user)
  // =========================================================================

  it("POST /loyalty/promo-codes/apply returns 200", async () => {
    mockService.applyCode.mockResolvedValue({ applied: true, message: "OK" });
    await request(app.getHttpServer())
      .post("/loyalty/promo-codes/apply")
      .set("Authorization", "Bearer admin-token")
      .send({ code: "SUMMER25" })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // GET /loyalty/promo-codes (admin)
  // =========================================================================

  it("GET /loyalty/promo-codes returns 200", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/loyalty/promo-codes")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("rejects viewer for GET /loyalty/promo-codes", async () => {
    await request(app.getHttpServer())
      .get("/loyalty/promo-codes")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // POST /loyalty/promo-codes (admin)
  // =========================================================================

  it("POST /loyalty/promo-codes returns 201", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/loyalty/promo-codes")
      .set("Authorization", "Bearer admin-token")
      .send({
        code: "SUMMER25",
        name: "Summer Bonus",
        type: "points_bonus",
        value: 500,
      })
      .expect(HttpStatus.CREATED);
  });

  // =========================================================================
  // PATCH /loyalty/promo-codes/:id (admin)
  // =========================================================================

  it("PATCH /loyalty/promo-codes/:id returns 200", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/loyalty/promo-codes/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated" })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // DELETE /loyalty/promo-codes/:id (admin/owner)
  // =========================================================================

  it("DELETE /loyalty/promo-codes/:id returns 204", async () => {
    mockService.remove.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/loyalty/promo-codes/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // =========================================================================
  // GET /loyalty/promo-codes/:id/stats (admin)
  // =========================================================================

  it("GET /loyalty/promo-codes/:id/stats returns 200", async () => {
    mockService.getStats.mockResolvedValue({ totalUsages: 0, uniqueUsers: 0 });
    await request(app.getHttpServer())
      .get(`/loyalty/promo-codes/${TEST_UUID}/stats`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
