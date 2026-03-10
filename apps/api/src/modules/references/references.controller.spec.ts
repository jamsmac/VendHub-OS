import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { ReferencesController } from "./references.controller";
import { ReferencesService } from "./references.service";

describe("ReferencesController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      ReferencesController,
      ReferencesService,
      [
        "findAllGoodsClassifiers",
        "findGoodsClassifierByCode",
        "createGoodsClassifier",
        "updateGoodsClassifier",
        "findAllIkpuCodes",
        "findIkpuCodeByCode",
        "createIkpuCode",
        "updateIkpuCode",
        "findAllVatRates",
        "findVatRateByCode",
        "createVatRate",
        "updateVatRate",
        "findAllPackageTypes",
        "findPackageTypeByCode",
        "createPackageType",
        "updatePackageType",
        "findAllPaymentProviders",
        "findPaymentProviderByCode",
        "createPaymentProvider",
        "updatePaymentProvider",
        "getMarkingRequirements",
        "getCurrencies",
        "getRegions",
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

  it("GET /references/goods-classifiers returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/references/goods-classifiers")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // Role rejection
  // =========================================================================

  it("GET /references/goods-classifiers rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/references/goods-classifiers")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /references/goods-classifiers rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/references/goods-classifiers")
      .set("Authorization", "Bearer viewer-token")
      .send({ code: "12345", nameRu: "Test" })
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // Goods Classifiers (MXIK)
  // =========================================================================

  it("GET /references/goods-classifiers returns 200 for admin", async () => {
    mockService.findAllGoodsClassifiers.mockResolvedValue({
      data: [],
      total: 0,
    });
    await request(app.getHttpServer())
      .get("/references/goods-classifiers")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /references/goods-classifiers/:code returns 200 for admin", async () => {
    mockService.findGoodsClassifierByCode.mockResolvedValue({
      code: "10820001",
    });
    await request(app.getHttpServer())
      .get("/references/goods-classifiers/10820001")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /references/goods-classifiers returns 201 for admin", async () => {
    mockService.createGoodsClassifier.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/references/goods-classifiers")
      .set("Authorization", "Bearer admin-token")
      .send({ code: "10820001001000000", nameRu: "Test classifier" })
      .expect(HttpStatus.CREATED);
  });

  it("PATCH /references/goods-classifiers/:id returns 200 for admin", async () => {
    mockService.updateGoodsClassifier.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/references/goods-classifiers/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ nameRu: "Updated name" })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // IKPU Codes
  // =========================================================================

  it("GET /references/ikpu-codes returns 200 for admin", async () => {
    mockService.findAllIkpuCodes.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/references/ikpu-codes")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /references/ikpu-codes/:code returns 200 for admin", async () => {
    mockService.findIkpuCodeByCode.mockResolvedValue({ code: "11014001" });
    await request(app.getHttpServer())
      .get("/references/ikpu-codes/11014001")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // VAT Rates
  // =========================================================================

  it("GET /references/vat-rates returns 200 for admin", async () => {
    mockService.findAllVatRates.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/references/vat-rates")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /references/vat-rates/:code returns 200 for admin", async () => {
    mockService.findVatRateByCode.mockResolvedValue({ code: "STANDARD" });
    await request(app.getHttpServer())
      .get("/references/vat-rates/STANDARD")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /references/vat-rates returns 201 for admin", async () => {
    mockService.createVatRate.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/references/vat-rates")
      .set("Authorization", "Bearer admin-token")
      .send({ code: "REDUCED", nameRu: "Пониженная ставка", rate: 5 })
      .expect(HttpStatus.CREATED);
  });

  // =========================================================================
  // Package Types
  // =========================================================================

  it("GET /references/package-types returns 200 for admin", async () => {
    mockService.findAllPackageTypes.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/references/package-types")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /references/package-types/:code returns 200 for admin", async () => {
    mockService.findPackageTypeByCode.mockResolvedValue({ code: "BOTTLE" });
    await request(app.getHttpServer())
      .get("/references/package-types/BOTTLE")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Payment Providers
  // =========================================================================

  it("GET /references/payment-providers returns 200 for admin", async () => {
    mockService.findAllPaymentProviders.mockResolvedValue({
      data: [],
      total: 0,
    });
    await request(app.getHttpServer())
      .get("/references/payment-providers")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /references/payment-providers/:code returns 200 for admin", async () => {
    mockService.findPaymentProviderByCode.mockResolvedValue({ code: "payme" });
    await request(app.getHttpServer())
      .get("/references/payment-providers/payme")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Static reference data
  // =========================================================================

  it("GET /references/marking-requirements returns 200 for admin", async () => {
    mockService.getMarkingRequirements.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/references/marking-requirements")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /references/currencies returns 200 for admin", async () => {
    mockService.getCurrencies.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/references/currencies")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /references/regions returns 200 for admin", async () => {
    mockService.getRegions.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/references/regions")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Write operations require owner/admin
  // =========================================================================

  it("POST /references/goods-classifiers rejects operator role", async () => {
    await request(app.getHttpServer())
      .post("/references/goods-classifiers")
      .set("Authorization", "Bearer operator-token")
      .send({ code: "12345", nameRu: "Test" })
      .expect(HttpStatus.FORBIDDEN);
  });
});
