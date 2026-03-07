import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { ImportParserService, IMPORT_LIMITS } from "./import-parser.service";

describe("ImportParserService", () => {
  let service: ImportParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImportParserService],
    }).compile();

    service = module.get<ImportParserService>(ImportParserService);
  });

  // --------------------------------------------------------------------------
  // CSV parsing
  // --------------------------------------------------------------------------

  it("should parse a valid CSV buffer", async () => {
    const csv = "name,price,barcode\nCola,1000,123456\nFanta,800,789012";
    const buffer = Buffer.from(csv, "utf-8");

    const result = await service.parseCSV(buffer);

    expect(result.headers).toEqual(["name", "price", "barcode"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({ name: "Cola", price: "1000" }),
    );
  });

  it("should handle custom delimiter in CSV", async () => {
    const csv = "name;price\nCola;1000";
    const buffer = Buffer.from(csv, "utf-8");

    const result = await service.parseCSV(buffer, { delimiter: ";" });

    expect(result.headers).toEqual(["name", "price"]);
    expect(result.rows[0].name).toBe("Cola");
  });

  it("should trim CSV headers", async () => {
    const csv = " name , price \nCola,1000";
    const buffer = Buffer.from(csv, "utf-8");

    const result = await service.parseCSV(buffer);

    expect(result.headers).toEqual(["name", "price"]);
  });

  it("should skip empty lines in CSV", async () => {
    const csv = "name,price\nCola,1000\n\nFanta,800\n";
    const buffer = Buffer.from(csv, "utf-8");

    const result = await service.parseCSV(buffer);

    expect(result.rows).toHaveLength(2);
  });

  // --------------------------------------------------------------------------
  // JSON parsing
  // --------------------------------------------------------------------------

  it("should parse a valid JSON array buffer", async () => {
    const data = [
      { name: "Cola", price: 1000 },
      { name: "Fanta", price: 800 },
    ];
    const buffer = Buffer.from(JSON.stringify(data), "utf-8");

    const result = await service.parseJSON(buffer);

    expect(result.headers).toEqual(["name", "price"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].name).toBe("Cola");
  });

  it("should wrap a single JSON object in an array", async () => {
    const data = { name: "Cola", price: 1000 };
    const buffer = Buffer.from(JSON.stringify(data), "utf-8");

    const result = await service.parseJSON(buffer);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe("Cola");
  });

  it("should throw BadRequestException for malformed JSON", async () => {
    const buffer = Buffer.from("{ not valid json }", "utf-8");

    await expect(service.parseJSON(buffer)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("should extract headers from first row of JSON array", async () => {
    const buffer = Buffer.from("[]", "utf-8");

    const result = await service.parseJSON(buffer);

    expect(result.headers).toEqual([]);
    expect(result.rows).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // Limits enforcement
  // --------------------------------------------------------------------------

  it("should truncate cell values exceeding MAX_CELL_LENGTH", async () => {
    const longValue = "x".repeat(IMPORT_LIMITS.MAX_CELL_LENGTH + 100);
    const data = [{ name: longValue }];
    const buffer = Buffer.from(JSON.stringify(data), "utf-8");

    const result = await service.parseJSON(buffer);

    expect((result.rows[0].name as string).length).toBe(
      IMPORT_LIMITS.MAX_CELL_LENGTH,
    );
  });

  it("should reject JSON with too many columns", async () => {
    const row: Record<string, string> = {};
    for (let i = 0; i < IMPORT_LIMITS.MAX_COLUMNS + 1; i++) {
      row[`col_${i}`] = "val";
    }
    const buffer = Buffer.from(JSON.stringify([row]), "utf-8");

    await expect(service.parseJSON(buffer)).rejects.toThrow(
      BadRequestException,
    );
  });

  // --------------------------------------------------------------------------
  // Excel parsing (smoke test)
  // --------------------------------------------------------------------------

  it("should throw BadRequestException for corrupted Excel buffer", async () => {
    const buffer = Buffer.from("not-a-valid-excel-file", "utf-8");

    await expect(service.parseExcel(buffer)).rejects.toThrow(
      BadRequestException,
    );
  });
});
