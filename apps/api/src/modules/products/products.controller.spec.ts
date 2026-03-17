import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

describe("ProductsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      ProductsController,
      ProductsService,
      [
        "create",
        "findAll",
        "findById",
        "findByBarcode",
        "update",
        "remove",
        "getRecipeStats",
        "getStockSummary",
        "getExpiringBatches",
        "createRecipe",
        "getRecipesByProduct",
        "findPrimaryRecipe",
        "updateRecipe",
        "deleteRecipe",
        "getRecipeSnapshots",
        "getSnapshotByVersion",
        "findRecipeWithOrgCheck",
        "recalculateRecipeCost",
        "calculateRecipeCost",
        "addIngredient",
        "removeIngredient",
        "createBatch",
        "getAvailableBatches",
        "updateBatch",
        "deleteBatch",
        "checkExpiredBatches",
        "getPriceHistory",
        "updatePrice",
        "getStockByProduct",
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

  it("GET /products returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/products")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // Role rejection
  // =========================================================================

  it("POST /products rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/products")
      .set("Authorization", "Bearer viewer-token")
      .send({
        name: "Test Product",
        sku: "TEST-001",
        basePrice: 8000,
        organizationId: TEST_UUID,
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("DELETE /products/:id rejects viewer role", async () => {
    await request(app.getHttpServer())
      .delete(`/products/${TEST_UUID}`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // Product CRUD
  // =========================================================================

  it("POST /products returns 201 for admin", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/products")
      .set("Authorization", "Bearer admin-token")
      .send({
        name: "Espresso",
        sku: "COFFEE-ESP-001",
        basePrice: 8000,
        organizationId: TEST_UUID,
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /products returns 200 for viewer", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/products")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("GET /products/:id returns 200 for viewer", async () => {
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/products/${TEST_UUID}`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("GET /products/barcode/:barcode returns 200 for viewer", async () => {
    mockService.findByBarcode.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get("/products/barcode/4607001234001")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("PATCH /products/:id returns 200 for admin", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/products/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated Product" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /products/:id returns 204 for admin", async () => {
    mockService.remove.mockResolvedValue({ affected: 1 });
    await request(app.getHttpServer())
      .delete(`/products/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // =========================================================================
  // Stats
  // =========================================================================

  it("GET /products/recipes-stats returns 200 for admin", async () => {
    mockService.getRecipeStats.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/products/recipes-stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /products/stock-summary returns 200 for admin", async () => {
    mockService.getStockSummary.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/products/stock-summary")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Recipes
  // =========================================================================

  it("GET /products/:id/recipes returns 200 for viewer", async () => {
    mockService.getRecipesByProduct.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/products/${TEST_UUID}/recipes`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Batches
  // =========================================================================

  it("GET /products/:id/batches returns 200 for viewer", async () => {
    mockService.getAvailableBatches.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/products/${TEST_UUID}/batches`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Price history
  // =========================================================================

  it("GET /products/:id/price-history returns 200 for viewer", async () => {
    mockService.getPriceHistory.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/products/${TEST_UUID}/price-history`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });
});
