import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../../common/test-utils/controller-test.helper";
import { ReferralController } from "./referral.controller";
import { ReferralService } from "../services/referral.service";

describe("ReferralController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      ReferralController,
      ReferralService,
      ["getMyCode", "applyReferral", "getStats", "getAdminStats"],
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
      .get("/loyalty/referrals/my-code")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // GET /loyalty/referrals/my-code (user)
  // =========================================================================

  it("GET /loyalty/referrals/my-code returns 200", async () => {
    mockService.getMyCode.mockResolvedValue({
      code: "VH3K9M2X",
      totalReferrals: 0,
      pendingReferrals: 0,
    });
    await request(app.getHttpServer())
      .get("/loyalty/referrals/my-code")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // POST /loyalty/referrals/apply (user)
  // =========================================================================

  it("POST /loyalty/referrals/apply returns 200", async () => {
    mockService.applyReferral.mockResolvedValue({
      success: true,
      message: "Applied",
    });
    await request(app.getHttpServer())
      .post("/loyalty/referrals/apply")
      .set("Authorization", "Bearer admin-token")
      .send({ code: "VH3K9M2X" })
      .expect(HttpStatus.OK);
  });

  it("POST /loyalty/referrals/apply validates code format", async () => {
    await request(app.getHttpServer())
      .post("/loyalty/referrals/apply")
      .set("Authorization", "Bearer admin-token")
      .send({ code: "short" })
      .expect(HttpStatus.BAD_REQUEST);
  });

  // =========================================================================
  // GET /loyalty/referrals/stats (user)
  // =========================================================================

  it("GET /loyalty/referrals/stats returns 200", async () => {
    mockService.getStats.mockResolvedValue({
      totalCompleted: 0,
      totalPending: 0,
      totalPointsEarned: 0,
      referralCode: "VH3K9M2X",
    });
    await request(app.getHttpServer())
      .get("/loyalty/referrals/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // GET /loyalty/referrals/admin/stats (admin)
  // =========================================================================

  it("GET /loyalty/referrals/admin/stats returns 200", async () => {
    mockService.getAdminStats.mockResolvedValue({
      totalReferrals: 0,
      completedReferrals: 0,
    });
    await request(app.getHttpServer())
      .get("/loyalty/referrals/admin/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("rejects viewer for GET /loyalty/referrals/admin/stats", async () => {
    await request(app.getHttpServer())
      .get("/loyalty/referrals/admin/stats")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
