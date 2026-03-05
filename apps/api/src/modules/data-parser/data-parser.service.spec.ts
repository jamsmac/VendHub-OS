import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { DataParserService } from "./data-parser.service";
import { UniversalParser } from "./parsers/universal.parser";
import { DataValidationService } from "./services/data-validation.service";
import {
  ParsedData,
  FileFormat,
  ValidationResult,
  FormatDetectionResult,
} from "./interfaces/parser.interface";

describe("DataParserService", () => {
  let service: DataParserService;
  let universalParser: jest.Mocked<UniversalParser>;
  let validationService: jest.Mocked<DataValidationService>;

  const mockParsedData: ParsedData = {
    format: FileFormat.CSV,
    headers: ["name", "email", "amount"],
    rows: [
      { name: "John Doe", email: "john@example.com", amount: 1000 },
      { name: "Jane Smith", email: "jane@example.com", amount: 2000 },
    ],
    totalRows: 2,
    errors: [],
  };

  const mockValidationResult: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    validRows: 2,
    totalRows: 2,
  };

  const mockFormatDetection: FormatDetectionResult = {
    format: FileFormat.CSV,
    confidence: 0.95,
    mimeType: "text/csv",
    encoding: "utf-8",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataParserService,
        {
          provide: UniversalParser,
          useValue: {
            parse: jest.fn(),
            detectFormat: jest.fn(),
          },
        },
        {
          provide: DataValidationService,
          useValue: {
            validateSalesRows: jest.fn(),
            validateCounterpartyRows: jest.fn(),
            validateInventoryRows: jest.fn(),
            isValidAmount: jest.fn(),
            isValidInn: jest.fn(),
            isValidPhone: jest.fn(),
            parseDate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DataParserService>(DataParserService);
    universalParser = module.get(
      UniversalParser,
    ) as jest.Mocked<UniversalParser>;
    validationService = module.get(
      DataValidationService,
    ) as jest.Mocked<DataValidationService>;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // parse
  // =========================================================================

  describe("parse", () => {
    it("should parse a buffer with filename and options", async () => {
      const buffer = Buffer.from("csv data");
      const filename = "data.csv";
      const options = { delimiter: "," };

      universalParser.parse.mockResolvedValue(mockParsedData);

      const result = await service.parse(buffer, filename, options);

      expect(result).toEqual(mockParsedData);
      expect(universalParser.parse).toHaveBeenCalledWith(
        buffer,
        filename,
        options,
      );
    });

    it("should parse without filename", async () => {
      const buffer = Buffer.from("csv data");

      universalParser.parse.mockResolvedValue(mockParsedData);

      const result = await service.parse(buffer);

      expect(result).toEqual(mockParsedData);
      expect(universalParser.parse).toHaveBeenCalledWith(buffer, undefined, {});
    });

    it("should throw BadRequestException when buffer is empty", async () => {
      const emptyBuffer = Buffer.from("");

      await expect(service.parse(emptyBuffer)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when buffer is null", async () => {
      await expect(service.parse(null as unknown as Buffer)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should parse with custom options", async () => {
      const buffer = Buffer.from("tsv data");
      const options = {
        delimiter: "\t",
        encoding: "utf-8" as BufferEncoding,
        skipEmptyRows: true,
      };

      universalParser.parse.mockResolvedValue(mockParsedData);

      await service.parse(buffer, "data.tsv", options);

      expect(universalParser.parse).toHaveBeenCalledWith(
        buffer,
        "data.tsv",
        options,
      );
    });
  });

  // =========================================================================
  // parseSales
  // =========================================================================

  describe("parseSales", () => {
    it("should parse sales data and validate rows", async () => {
      const buffer = Buffer.from("sales data");

      universalParser.parse.mockResolvedValue(mockParsedData);
      validationService.validateSalesRows.mockReturnValue(mockValidationResult);

      const result = await service.parseSales(buffer);

      expect(result.format).toBe(FileFormat.CSV);
      expect(result.rows).toEqual(mockParsedData.rows);
      expect(result.validation).toEqual(mockValidationResult);
      expect(validationService.validateSalesRows).toHaveBeenCalledWith(
        mockParsedData.rows,
      );
    });

    it("should include validation errors in result", async () => {
      const buffer = Buffer.from("sales data");
      const validationWithErrors: ValidationResult = {
        valid: false,
        errors: [
          {
            row: 1,
            column: "amount",
            value: -100,
            message: "Amount must be positive",
          },
        ],
        warnings: [],
        validRows: 1,
        totalRows: 2,
      };

      universalParser.parse.mockResolvedValue(mockParsedData);
      validationService.validateSalesRows.mockReturnValue(validationWithErrors);

      const result = await service.parseSales(buffer);

      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors).toHaveLength(1);
    });

    it("should throw BadRequestException when buffer is empty", async () => {
      const emptyBuffer = Buffer.from("");

      await expect(service.parseSales(emptyBuffer)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // parseCounterparties
  // =========================================================================

  describe("parseCounterparties", () => {
    it("should parse counterparty data and validate", async () => {
      const parseBuffer = Buffer.from("counterparty data");
      const counterpartyData = {
        ...mockParsedData,
        rows: [{ name: "Company A", inn: "123456789", phone: "+998901234567" }],
      };

      universalParser.parse.mockResolvedValue(counterpartyData);
      validationService.validateCounterpartyRows.mockReturnValue(
        mockValidationResult,
      );

      const result = await service.parseCounterparties(
        parseBuffer,
        "counterparties.csv",
      );

      expect(result.format).toBe(FileFormat.CSV);
      expect(result.validation).toEqual(mockValidationResult);
      expect(validationService.validateCounterpartyRows).toHaveBeenCalledWith(
        counterpartyData.rows,
      );
    });

    it("should handle validation warnings", async () => {
      const parseBuffer = Buffer.from("counterparty data");
      const validationWithWarnings: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [
          {
            row: 1,
            column: "phone",
            value: "9901234567",
            message: "Invalid phone format",
          },
        ],
        validRows: 2,
        totalRows: 2,
      };

      universalParser.parse.mockResolvedValue(mockParsedData);
      validationService.validateCounterpartyRows.mockReturnValue(
        validationWithWarnings,
      );

      const result = await service.parseCounterparties(parseBuffer);

      expect(result.validation.warnings).toHaveLength(1);
      expect(result.validation.valid).toBe(true);
    });

    it("should throw BadRequestException when buffer is empty", async () => {
      const emptyBuffer = Buffer.from("");

      await expect(service.parseCounterparties(emptyBuffer)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // parseInventory
  // =========================================================================

  describe("parseInventory", () => {
    it("should parse inventory data and validate", async () => {
      const inventoryBuffer = Buffer.from("inventory data");
      const inventoryData = {
        ...mockParsedData,
        rows: [
          { name: "Product A", sku: "SKU001", quantity: 100, price: 50 },
          { name: "Product B", sku: "SKU002", quantity: 50, price: 75 },
        ],
      };

      universalParser.parse.mockResolvedValue(inventoryData);
      validationService.validateInventoryRows.mockReturnValue(
        mockValidationResult,
      );

      const result = await service.parseInventory(
        inventoryBuffer,
        "inventory.xlsx",
        { sheetIndex: 0 },
      );

      expect(result.format).toBe(FileFormat.CSV);
      expect(result.rows).toHaveLength(2);
      expect(result.validation).toEqual(mockValidationResult);
      expect(validationService.validateInventoryRows).toHaveBeenCalledWith(
        inventoryData.rows,
      );
    });

    it("should handle empty inventory", async () => {
      const emptyBuffer = Buffer.from("inventory data");
      const emptyData: ParsedData = {
        format: FileFormat.CSV,
        headers: ["name", "sku", "quantity"],
        rows: [],
        totalRows: 0,
        errors: [],
      };

      universalParser.parse.mockResolvedValue(emptyData);
      validationService.validateInventoryRows.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        validRows: 0,
        totalRows: 0,
      });

      const result = await service.parseInventory(emptyBuffer);

      expect(result.totalRows).toBe(0);
      expect(result.validation.validRows).toBe(0);
    });

    it("should throw BadRequestException when buffer is empty", async () => {
      const emptyBuffer = Buffer.from("");

      await expect(service.parseInventory(emptyBuffer)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // detectFormat
  // =========================================================================

  describe("detectFormat", () => {
    it("should detect CSV format", async () => {
      const buffer = Buffer.from("name,email\nJohn,john@example.com");

      universalParser.detectFormat.mockReturnValue(mockFormatDetection);

      const result = service.detectFormat(buffer, "data.csv");

      expect(result.format).toBe(FileFormat.CSV);
      expect(result.confidence).toBe(0.95);
      expect(universalParser.detectFormat).toHaveBeenCalledWith(
        buffer,
        "data.csv",
      );
    });

    it("should detect Excel format", async () => {
      const buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // ZIP signature
      const excelDetection: FormatDetectionResult = {
        format: FileFormat.EXCEL,
        confidence: 0.9,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        encoding: "utf-8",
      };

      universalParser.detectFormat.mockReturnValue(excelDetection);

      const result = service.detectFormat(buffer, "data.xlsx");

      expect(result.format).toBe(FileFormat.EXCEL);
      expect(universalParser.detectFormat).toHaveBeenCalled();
    });

    it("should detect JSON format", async () => {
      const buffer = Buffer.from('{"key": "value"}');
      const jsonDetection: FormatDetectionResult = {
        format: FileFormat.JSON,
        confidence: 0.95,
        mimeType: "application/json",
        encoding: "utf-8",
      };

      universalParser.detectFormat.mockReturnValue(jsonDetection);

      const result = service.detectFormat(buffer);

      expect(result.format).toBe(FileFormat.JSON);
    });

    it("should throw BadRequestException when buffer is empty", () => {
      const emptyBuffer = Buffer.from("");

      expect(() => service.detectFormat(emptyBuffer)).toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when buffer is null", () => {
      expect(() => service.detectFormat(null as unknown as Buffer)).toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // recover
  // =========================================================================

  describe("recover", () => {
    it("should recover data by trying different delimiters and encodings", async () => {
      const buffer = Buffer.from("malformed data");

      universalParser.parse
        .mockRejectedValueOnce(new Error("Parse failed"))
        .mockRejectedValueOnce(new Error("Parse failed"))
        .mockResolvedValueOnce(mockParsedData); // Success on 3rd attempt

      const result = await service.recover(buffer);

      expect(result).toEqual(mockParsedData);
      expect(universalParser.parse).toHaveBeenCalled();
    });

    it("should return best result with most valid rows", async () => {
      const buffer = Buffer.from("data");
      const resultWithFewRows = {
        ...mockParsedData,
        rows: mockParsedData.rows.slice(0, 1),
        totalRows: 1,
      };
      const resultWithMoreRows = {
        ...mockParsedData,
        rows: mockParsedData.rows,
        totalRows: 2,
      };

      universalParser.parse
        .mockResolvedValueOnce(resultWithFewRows)
        .mockResolvedValueOnce(resultWithMoreRows)
        .mockRejectedValue(new Error("No more attempts"));

      const result = await service.recover(buffer);

      expect(result.totalRows).toBe(2);
    });

    it("should return fallback result if recovery fails", async () => {
      const buffer = Buffer.from("unrecoverable data");

      universalParser.parse.mockRejectedValue(new Error("Parse failed"));

      // Mock the last fallback attempt
      universalParser.parse.mockResolvedValueOnce(mockParsedData);

      const result = await service.recover(buffer);

      expect(result).toEqual(mockParsedData);
    });

    it("should apply override options to recovery attempts", async () => {
      const buffer = Buffer.from("data");
      const overrideOptions = { skipEmptyRows: true };

      universalParser.parse.mockRejectedValue(new Error("Parse failed"));
      universalParser.parse.mockResolvedValueOnce(mockParsedData);

      await service.recover(buffer, undefined, overrideOptions);

      expect(universalParser.parse).toHaveBeenCalledWith(
        buffer,
        undefined,
        expect.objectContaining({
          skipEmptyRows: true,
        }),
      );
    });
  });

  // =========================================================================
  // getSupportedFormats
  // =========================================================================

  describe("getSupportedFormats", () => {
    it("should return list of supported formats", () => {
      const formats = service.getSupportedFormats();

      expect(formats).toHaveLength(3);
      expect(formats[0].format).toBe("CSV");
      expect(formats[1].format).toBe("Excel");
      expect(formats[2].format).toBe("JSON");
    });

    it("should include file extensions for CSV format", () => {
      const formats = service.getSupportedFormats();
      const csv = formats.find((f) => f.format === "CSV");

      expect(csv?.extensions).toContain(".csv");
      expect(csv?.extensions).toContain(".tsv");
    });

    it("should include file extensions for Excel format", () => {
      const formats = service.getSupportedFormats();
      const excel = formats.find((f) => f.format === "Excel");

      expect(excel?.extensions).toContain(".xlsx");
      expect(excel?.extensions).toContain(".xls");
    });

    it("should include file extensions for JSON format", () => {
      const formats = service.getSupportedFormats();
      const json = formats.find((f) => f.format === "JSON");

      expect(json?.extensions).toContain(".json");
    });

    it("should mark all formats as available", () => {
      const formats = service.getSupportedFormats();

      formats.forEach((format) => {
        expect(format.available).toBe(true);
      });
    });
  });
});
