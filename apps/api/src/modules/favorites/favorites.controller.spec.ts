import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { FavoritesController } from "./favorites.controller";
import { FavoritesService } from "./favorites.service";

describe("FavoritesController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      FavoritesController,
      FavoritesService,
      [
        "getFavorites",
        "getFavoriteProducts",
        "getFavoriteMachines",
        "getFavoritesCount",
        "addFavorite",
        "removeFavorite",
        "updateFavorite",
        "toggleFavorite",
        "isFavorite",
        "isFavoriteBulk",
        "addFavoritesBulk",
        "removeFavoritesBulk",
        "reorderFavorites",
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
      .get("/favorites")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ---- All roles allowed (viewer through owner) ----

  it("allows viewer on GET /favorites", async () => {
    mockService.getFavorites.mockResolvedValue({
      products: [],
      machines: [],
      totalProducts: 0,
      totalMachines: 0,
    });
    await request(app.getHttpServer())
      .get("/favorites")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  // ---- Success cases ----

  it("GET /favorites returns 200", async () => {
    mockService.getFavorites.mockResolvedValue({
      products: [],
      machines: [],
      totalProducts: 0,
      totalMachines: 0,
    });
    await request(app.getHttpServer())
      .get("/favorites")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /favorites/products returns 200", async () => {
    mockService.getFavoriteProducts.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/favorites/products")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /favorites/machines returns 200", async () => {
    mockService.getFavoriteMachines.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/favorites/machines")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /favorites/count returns 200", async () => {
    mockService.getFavoritesCount.mockResolvedValue({
      products: 0,
      machines: 0,
    });
    await request(app.getHttpServer())
      .get("/favorites/count")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /favorites returns 201", async () => {
    mockService.addFavorite.mockResolvedValue({
      success: true,
      id: TEST_UUID,
      message: "Added",
      alreadyExists: false,
    });
    await request(app.getHttpServer())
      .post("/favorites")
      .set("Authorization", "Bearer admin-token")
      .send({ type: "product", productId: TEST_UUID })
      .expect(HttpStatus.CREATED);
  });

  it("DELETE /favorites/:id returns 204", async () => {
    mockService.removeFavorite.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/favorites/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("PUT /favorites/:id returns 200", async () => {
    mockService.updateFavorite.mockResolvedValue({});
    await request(app.getHttpServer())
      .put(`/favorites/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ notes: "My favorite" })
      .expect(HttpStatus.OK);
  });

  it("POST /favorites/products/:productId/toggle returns 200", async () => {
    mockService.toggleFavorite.mockResolvedValue({
      isFavorite: true,
      favoriteId: TEST_UUID,
    });
    await request(app.getHttpServer())
      .post(`/favorites/products/${TEST_UUID}/toggle`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /favorites/products/:productId/status returns 200", async () => {
    mockService.isFavorite.mockResolvedValue({
      isFavorite: true,
      favoriteId: TEST_UUID,
    });
    await request(app.getHttpServer())
      .get(`/favorites/products/${TEST_UUID}/status`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /favorites/products/status/bulk returns 200", async () => {
    mockService.isFavoriteBulk.mockResolvedValue({ items: {} });
    await request(app.getHttpServer())
      .post("/favorites/products/status/bulk")
      .set("Authorization", "Bearer admin-token")
      .send({ productIds: [TEST_UUID] })
      .expect(HttpStatus.OK);
  });

  it("POST /favorites/bulk returns 201", async () => {
    mockService.addFavoritesBulk.mockResolvedValue([]);
    await request(app.getHttpServer())
      .post("/favorites/bulk")
      .set("Authorization", "Bearer admin-token")
      .send({ items: [{ type: "product", productId: TEST_UUID }] })
      .expect(HttpStatus.CREATED);
  });

  it("PUT /favorites/reorder returns 204", async () => {
    mockService.reorderFavorites.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .put("/favorites/reorder")
      .set("Authorization", "Bearer admin-token")
      .send({ orderedIds: [TEST_UUID] })
      .expect(HttpStatus.NO_CONTENT);
  });
});
