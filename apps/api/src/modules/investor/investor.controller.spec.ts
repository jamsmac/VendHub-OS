import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { InvestorController } from "./investor.controller";
import { InvestorService } from "./investor.service";

describe("InvestorController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      InvestorController,
      InvestorService,
      [
        "getDashboard",
        "findProfile",
        "findAllProfiles",
        "createProfile",
        "updateProfile",
        "createDividend",
        "findDividends",
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
      .get("/investor/dashboard")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ---- Role rejection ----

  it("rejects viewer on GET /investor/dashboard", async () => {
    await request(app.getHttpServer())
      .get("/investor/dashboard")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator on GET /investor/dashboard", async () => {
    await request(app.getHttpServer())
      .get("/investor/dashboard")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ---- Success cases ----

  it("GET /investor/dashboard returns 200 for admin", async () => {
    mockService.getDashboard.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/investor/dashboard")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /investor/profile returns 200 for admin", async () => {
    mockService.findProfile.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/investor/profile")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /investor/profiles returns 200 for admin", async () => {
    mockService.findAllProfiles.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/investor/profiles")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /investor/profiles returns 201 for admin", async () => {
    mockService.createProfile.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/investor/profiles")
      .set("Authorization", "Bearer admin-token")
      .send({
        name: "Alpha Fund",
        sharePercent: 15,
        totalInvested: 500000000,
      })
      .expect(HttpStatus.CREATED);
  });

  it("PATCH /investor/profiles/:id returns 200 for admin", async () => {
    mockService.updateProfile.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/investor/profiles/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated Fund" })
      .expect(HttpStatus.OK);
  });

  it("POST /investor/dividends returns 201 for admin", async () => {
    mockService.createDividend.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/investor/dividends")
      .set("Authorization", "Bearer admin-token")
      .send({
        investorProfileId: TEST_UUID,
        period: "Q1 2026",
        paymentDate: "2026-04-01",
        amount: 15000000,
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /investor/dividends/:profileId returns 200 for admin", async () => {
    mockService.findDividends.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/investor/dividends/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ---- Owner-only endpoints (profiles management) ----

  it("allows owner on POST /investor/profiles", async () => {
    mockService.createProfile.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/investor/profiles")
      .set("Authorization", "Bearer owner-token")
      .send({
        name: "Beta Fund",
        sharePercent: 10,
        totalInvested: 300000000,
      })
      .expect(HttpStatus.CREATED);
  });
});
