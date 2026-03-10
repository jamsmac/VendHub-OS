import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { CmsController } from "./cms.controller";
import { CmsService } from "./cms.service";

describe("CmsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      CmsController,
      CmsService,
      [
        "getArticles",
        "getArticleByIdOrSlug",
        "getArticlesByCategory",
        "createArticle",
        "updateArticle",
        "deleteArticle",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── AUTH ──────────────────────────────────────────────────────
  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/cms/articles")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ── LIST ARTICLES ────────────────────────────────────────────
  it("GET /cms/articles returns 200 with auth", async () => {
    mockService.getArticles.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/cms/articles")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /cms/articles allows viewer role", async () => {
    mockService.getArticles.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/cms/articles")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  // operator (level 30) >= viewer (level 10) in role hierarchy, so operator passes
  it("GET /cms/articles rejects unauthenticated", async () => {
    await request(app.getHttpServer())
      .get("/cms/articles")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ── GET BY CATEGORY ──────────────────────────────────────────
  it("GET /cms/articles/category/:cat returns 200", async () => {
    mockService.getArticlesByCategory.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/cms/articles/category/news")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── GET SINGLE ARTICLE ───────────────────────────────────────
  it("GET /cms/articles/:idOrSlug returns 200", async () => {
    mockService.getArticleByIdOrSlug.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/cms/articles/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── CREATE ARTICLE ───────────────────────────────────────────
  it("POST /cms/articles returns 201 with valid body", async () => {
    mockService.createArticle.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/cms/articles")
      .set("Authorization", "Bearer admin-token")
      .send({ title: "Test Article", content: "Test content" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /cms/articles rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/cms/articles")
      .set("Authorization", "Bearer viewer-token")
      .send({ title: "Test", content: "Test" })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── UPDATE ARTICLE ───────────────────────────────────────────
  it("PATCH /cms/articles/:id returns 200", async () => {
    mockService.updateArticle.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/cms/articles/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ title: "Updated Title" })
      .expect(HttpStatus.OK);
  });

  // ── DELETE ARTICLE ───────────────────────────────────────────
  it("DELETE /cms/articles/:id returns 204", async () => {
    mockService.deleteArticle.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/cms/articles/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });
});
