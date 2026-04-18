jest.mock("@nestjs/axios", () => ({
  HttpService: class HttpService {},
  HttpModule: class HttpModule {},
}));

import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

describe("AiController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      AiController,
      AiService,
      [
        "parseProductsFromImage",
        "parseProductsFromText",
        "analyzeComplaint",
        "suggestComplaintResponse",
        "detectSalesAnomaly",
        "suggestCategory",
        "batchCategorize",
        "suggestProductsForLocation",
        "suggestPricing",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // AUTH
  // ==========================================================================

  it("GET /ai/status returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/ai/status")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ==========================================================================
  // IMPORT
  // ==========================================================================

  it("POST /ai/import/image returns 201 with admin auth", async () => {
    mockService.parseProductsFromImage.mockResolvedValue({ products: [] });
    await request(app.getHttpServer())
      .post("/ai/import/image")
      .set("Authorization", "Bearer admin-token")
      .send({ image_base64: "iVBORw0KGgoAAAANSUhEUg==" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /ai/import/text returns 201 with admin auth", async () => {
    mockService.parseProductsFromText.mockResolvedValue({ products: [] });
    await request(app.getHttpServer())
      .post("/ai/import/text")
      .set("Authorization", "Bearer admin-token")
      .send({ text: "Coca-Cola 0.5l, 8000 UZS" })
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // COMPLAINT ANALYSIS
  // ==========================================================================

  it("POST /ai/complaints/analyze returns 201 with admin auth", async () => {
    mockService.analyzeComplaint.mockResolvedValue({
      sentiment: "negative",
      priority: "high",
    });
    await request(app.getHttpServer())
      .post("/ai/complaints/analyze")
      .set("Authorization", "Bearer admin-token")
      .send({
        subject: "Machine not working",
        description: "Paid but nothing dispensed",
      })
      .expect(HttpStatus.CREATED);
  });

  it("POST /ai/complaints/suggest-response returns 201 with admin auth", async () => {
    mockService.suggestComplaintResponse.mockResolvedValue(
      "We apologize for the inconvenience",
    );
    await request(app.getHttpServer())
      .post("/ai/complaints/suggest-response")
      .set("Authorization", "Bearer admin-token")
      .send({
        subject: "Machine not working",
        description: "Paid but nothing dispensed",
        category: "product_not_dispensed",
      })
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // ANOMALY DETECTION
  // ==========================================================================

  it("POST /ai/anomaly/sales returns 201 with admin auth", async () => {
    mockService.detectSalesAnomaly.mockResolvedValue({ anomalies: [] });
    await request(app.getHttpServer())
      .post("/ai/anomaly/sales")
      .set("Authorization", "Bearer admin-token")
      .send({
        machine_id: TEST_UUID,
        sales_data: [{ date: "2025-01-15", amount: 450000, transactions: 52 }],
        historical_average: { avg_amount: 500000, avg_transactions: 60 },
      })
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // CATEGORIZATION
  // ==========================================================================

  it("POST /ai/categorize returns 201 with admin auth", async () => {
    mockService.suggestCategory.mockResolvedValue({ category: "snacks" });
    await request(app.getHttpServer())
      .post("/ai/categorize")
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Snickers 50g" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /ai/categorize/batch returns 201 with admin auth", async () => {
    mockService.batchCategorize.mockResolvedValue(new Map());
    await request(app.getHttpServer())
      .post("/ai/categorize/batch")
      .set("Authorization", "Bearer admin-token")
      .send({
        products: [{ id: TEST_UUID, name: "Coca-Cola 0.5l" }],
      })
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // SUGGESTIONS
  // ==========================================================================

  it("POST /ai/suggest/products returns 201 with admin auth", async () => {
    mockService.suggestProductsForLocation.mockResolvedValue([]);
    await request(app.getHttpServer())
      .post("/ai/suggest/products")
      .set("Authorization", "Bearer admin-token")
      .send({
        location_type: "university",
        existing_products: ["Coca-Cola"],
      })
      .expect(HttpStatus.CREATED);
  });

  it("POST /ai/suggest/pricing returns 201 with admin auth", async () => {
    mockService.suggestPricing.mockResolvedValue({
      suggestedPrice: 12000,
    });
    await request(app.getHttpServer())
      .post("/ai/suggest/pricing")
      .set("Authorization", "Bearer admin-token")
      .send({
        product_name: "Americano",
        category: "coffee",
        cost_price: 3500,
        location_type: "business_center",
      })
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // STATUS
  // ==========================================================================

  it("GET /ai/status returns 200 with admin auth", async () => {
    await request(app.getHttpServer())
      .get("/ai/status")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // ROLE RESTRICTIONS
  // ==========================================================================

  it("POST /ai/import/image rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/ai/import/image")
      .set("Authorization", "Bearer viewer-token")
      .send({ image_base64: "test" })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /ai/status rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/ai/status")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
