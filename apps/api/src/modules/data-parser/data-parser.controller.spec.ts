import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { DataParserController } from "./data-parser.controller";
import { DataParserService } from "./data-parser.service";

describe("DataParserController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      DataParserController,
      DataParserService,
      [
        "getSupportedFormats",
        "parse",
        "parseSales",
        "parseCounterparties",
        "parseInventory",
        "detectFormat",
        "recover",
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
  it("returns 401 without auth on protected endpoint", async () => {
    await request(app.getHttpServer())
      .post("/data-parser/parse")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ── GET FORMATS ──────────────────────────────────────────────
  // No @Roles() decorator → any authenticated user can access
  it("GET /data-parser/formats returns 200 with auth", async () => {
    mockService.getSupportedFormats.mockReturnValue(["csv", "xlsx", "json"]);
    await request(app.getHttpServer())
      .get("/data-parser/formats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /data-parser/formats allows viewer (no @Roles)", async () => {
    mockService.getSupportedFormats.mockReturnValue([]);
    await request(app.getHttpServer())
      .get("/data-parser/formats")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  // ── PARSE ────────────────────────────────────────────────────
  it("POST /data-parser/parse returns 201 with file", async () => {
    mockService.parse.mockResolvedValue({ rows: [], total: 0 });
    await request(app.getHttpServer())
      .post("/data-parser/parse")
      .set("Authorization", "Bearer admin-token")
      .attach("file", Buffer.from("col1,col2\nval1,val2"), "test.csv")
      .expect(HttpStatus.CREATED);
  });

  it("POST /data-parser/parse rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/data-parser/parse")
      .set("Authorization", "Bearer viewer-token")
      .attach("file", Buffer.from("data"), "test.csv")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /data-parser/parse rejects operator role", async () => {
    await request(app.getHttpServer())
      .post("/data-parser/parse")
      .set("Authorization", "Bearer operator-token")
      .attach("file", Buffer.from("data"), "test.csv")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── PARSE SALES ──────────────────────────────────────────────
  it("POST /data-parser/parse/sales returns 201 with file", async () => {
    mockService.parseSales.mockResolvedValue({ rows: [], total: 0 });
    await request(app.getHttpServer())
      .post("/data-parser/parse/sales")
      .set("Authorization", "Bearer admin-token")
      .attach("file", Buffer.from("date,amount\n2026-01-01,1000"), "sales.csv")
      .expect(HttpStatus.CREATED);
  });

  // ── PARSE COUNTERPARTIES ─────────────────────────────────────
  it("POST /data-parser/parse/counterparties returns 201 with file", async () => {
    mockService.parseCounterparties.mockResolvedValue({ rows: [], total: 0 });
    await request(app.getHttpServer())
      .post("/data-parser/parse/counterparties")
      .set("Authorization", "Bearer admin-token")
      .attach("file", Buffer.from("name,inn\nTest,12345"), "cp.csv")
      .expect(HttpStatus.CREATED);
  });

  // ── PARSE INVENTORY ──────────────────────────────────────────
  it("POST /data-parser/parse/inventory returns 201 with file", async () => {
    mockService.parseInventory.mockResolvedValue({ rows: [], total: 0 });
    await request(app.getHttpServer())
      .post("/data-parser/parse/inventory")
      .set("Authorization", "Bearer admin-token")
      .attach("file", Buffer.from("sku,qty\nSKU1,10"), "inv.csv")
      .expect(HttpStatus.CREATED);
  });

  // ── DETECT FORMAT ────────────────────────────────────────────
  it("POST /data-parser/detect-format returns 201 with file", async () => {
    mockService.detectFormat.mockResolvedValue({ format: "csv" });
    await request(app.getHttpServer())
      .post("/data-parser/detect-format")
      .set("Authorization", "Bearer operator-token")
      .attach("file", Buffer.from("data"), "test.csv")
      .expect(HttpStatus.CREATED);
  });

  // ── RECOVER ──────────────────────────────────────────────────
  it("POST /data-parser/recover returns 201 with file", async () => {
    mockService.recover.mockResolvedValue({ rows: [], errors: [] });
    await request(app.getHttpServer())
      .post("/data-parser/recover")
      .set("Authorization", "Bearer admin-token")
      .attach("file", Buffer.from("bad,data"), "broken.csv")
      .expect(HttpStatus.CREATED);
  });
});
