import { Injectable } from "@nestjs/common";
import {
  FileFormat,
  FormatDetectionResult,
  ParsedData,
  ParserOptions,
} from "../interfaces/parser.interface";
import { CsvParser } from "./csv.parser";
import { ExcelParser } from "./excel.parser";
import { JsonParser } from "./json.parser";

@Injectable()
export class UniversalParser {
  constructor(
    private readonly csvParser: CsvParser,
    private readonly excelParser: ExcelParser,
    private readonly jsonParser: JsonParser,
  ) {}

  detectFormat(buffer: Buffer, filename?: string): FormatDetectionResult {
    // Check by file extension first
    if (filename) {
      const ext = filename.toLowerCase().split(".").pop();
      if (ext === "csv" || ext === "tsv")
        return { format: FileFormat.CSV, confidence: 0.9 };
      if (ext === "xlsx" || ext === "xls")
        return { format: FileFormat.EXCEL, confidence: 0.95 };
      if (ext === "json") return { format: FileFormat.JSON, confidence: 0.9 };
    }

    // Check by magic bytes
    // XLSX (ZIP): PK\x03\x04
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      return {
        format: FileFormat.EXCEL,
        confidence: 0.95,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }

    // Try JSON detection
    const text = buffer
      .toString("utf-8", 0, Math.min(buffer.length, 1000))
      .trim();
    if (text.startsWith("{") || text.startsWith("[")) {
      try {
        JSON.parse(buffer.toString("utf-8"));
        return {
          format: FileFormat.JSON,
          confidence: 0.9,
          mimeType: "application/json",
        };
      } catch {
        // Not valid JSON
      }
    }

    // Default to CSV for text-like content
    if (/^[\x20-\x7E\r\n\t]+$/.test(text.slice(0, 500))) {
      return {
        format: FileFormat.CSV,
        confidence: 0.6,
        mimeType: "text/csv",
      };
    }

    return { format: FileFormat.UNKNOWN, confidence: 0 };
  }

  async parse(
    buffer: Buffer,
    filename?: string,
    options: ParserOptions = {},
  ): Promise<ParsedData> {
    const detection = this.detectFormat(buffer, filename);

    switch (detection.format) {
      case FileFormat.CSV:
        return this.csvParser.parse(buffer, options);
      case FileFormat.EXCEL:
        return this.excelParser.parse(buffer, options);
      case FileFormat.JSON:
        return this.jsonParser.parse(buffer, options);
      default:
        return {
          format: FileFormat.UNKNOWN,
          headers: [],
          rows: [],
          totalRows: 0,
          errors: ["Could not detect file format"],
        };
    }
  }
}
