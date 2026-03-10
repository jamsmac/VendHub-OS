import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { ReferralsController } from "./referrals.controller";
import { ReferralsService } from "./referrals.service";

describe("ReferralsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      ReferralsController,
      ReferralsService,
      [
        "getReferralCode",
        "regenerateReferralCode",
        "getReferralSummary",
        "getUserReferrals",
        "applyReferralCode",
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

  // ============================================================================
  // AUTH
  // ============================================================================

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/referrals/my-code")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ============================================================================
  // USER ENDPOINTS (all roles allowed)
  // ============================================================================

  it("GET /referrals/my-code returns 200", async () => {
    mockService.getReferralCode.mockResolvedValue({ code: "ABC123" });
    await request(app.getHttpServer())
      .get("/referrals/my-code")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /referrals/my-code/regenerate returns 200", async () => {
    mockService.regenerateReferralCode.mockResolvedValue({ code: "NEW123" });
    await request(app.getHttpServer())
      .post("/referrals/my-code/regenerate")
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.OK);
  });

  it("GET /referrals/summary returns 200", async () => {
    mockService.getReferralSummary.mockResolvedValue({
      totalReferrals: 0,
      totalBonuses: 0,
    });
    await request(app.getHttpServer())
      .get("/referrals/summary")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /referrals/my returns 200", async () => {
    mockService.getUserReferrals.mockResolvedValue({
      data: [],
      total: 0,
    });
    await request(app.getHttpServer())
      .get("/referrals/my")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /referrals/apply returns 200 with valid code", async () => {
    mockService.applyReferralCode.mockResolvedValue({ success: true });
    await request(app.getHttpServer())
      .post("/referrals/apply")
      .set("Authorization", "Bearer admin-token")
      .send({ referralCode: "ABC12345" })
      .expect(HttpStatus.OK);
  });

  it("POST /referrals/apply rejects invalid body", async () => {
    await request(app.getHttpServer())
      .post("/referrals/apply")
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.BAD_REQUEST);
  });

  // ============================================================================
  // ADMIN ENDPOINTS (owner, admin, manager only)
  // ============================================================================

  it("GET /referrals/stats returns 200 for admin", async () => {
    mockService.getStats.mockResolvedValue({ totalReferrals: 10 });
    await request(app.getHttpServer())
      .get("/referrals/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /referrals/stats rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/referrals/stats")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
