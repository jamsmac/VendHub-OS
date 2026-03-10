import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import { createControllerTestApp } from "../../common/test-utils/controller-test.helper";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";

describe("RecommendationsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      RecommendationsController,
      RecommendationsService,
      [
        "getPersonalizedRecommendations",
        "getMachineRecommendations",
        "getSimilarProducts",
        "getComplementaryProducts",
        "getTimeBasedRecommendations",
        "getNewArrivals",
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

  it("GET /recommendations returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/recommendations")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // Class-level @Roles allows all roles including viewer
  // No role rejection test needed -- all authenticated users are allowed
  // =========================================================================

  // =========================================================================
  // Main endpoint
  // =========================================================================

  it("GET /recommendations returns 200 for viewer", async () => {
    mockService.getPersonalizedRecommendations.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/recommendations")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("GET /recommendations?type=new_arrivals returns 200", async () => {
    mockService.getNewArrivals.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/recommendations")
      .query({ type: "new_arrivals" })
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // For-you
  // =========================================================================

  it("GET /recommendations/for-you returns 200", async () => {
    mockService.getPersonalizedRecommendations.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/recommendations/for-you")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // New arrivals
  // =========================================================================

  it("GET /recommendations/new returns 200", async () => {
    mockService.getNewArrivals.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/recommendations/new")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Works with admin token too
  // =========================================================================

  it("GET /recommendations returns 200 for admin", async () => {
    mockService.getPersonalizedRecommendations.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/recommendations")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
