import { Injectable, BadRequestException } from "@nestjs/common";
import {
  ParsedData,
  ParserOptions,
  FormatDetectionResult,
  ValidationResult,
} from "./interfaces/parser.interface";
import { UniversalParser } from "./parsers/universal.parser";
import { DataValidationService } from "./services/data-validation.service";

@Injectable()
export class DataParserService {
  constructor(
    private readonly universalParser: UniversalParser,
    private readonly validationService: DataValidationService,
  ) {}

  async parse(
    buffer: Buffer,
    filename?: string,
    options: ParserOptions = {},
  ): Promise<ParsedData> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException("File is empty");
    }
    return this.universalParser.parse(buffer, filename, options);
  }

  async parseSales(
    buffer: Buffer,
    filename?: string,
    options: ParserOptions = {},
  ): Promise<ParsedData & { validation: ValidationResult }> {
    const data = await this.parse(buffer, filename, options);
    const validation = this.validationService.validateSalesRows(data.rows);
    return { ...data, validation };
  }

  async parseCounterparties(
    buffer: Buffer,
    filename?: string,
    options: ParserOptions = {},
  ): Promise<ParsedData & { validation: ValidationResult }> {
    const data = await this.parse(buffer, filename, options);
    const validation = this.validationService.validateCounterpartyRows(
      data.rows,
    );
    return { ...data, validation };
  }

  async parseInventory(
    buffer: Buffer,
    filename?: string,
    options: ParserOptions = {},
  ): Promise<ParsedData & { validation: ValidationResult }> {
    const data = await this.parse(buffer, filename, options);
    const validation = this.validationService.validateInventoryRows(data.rows);
    return { ...data, validation };
  }

  detectFormat(buffer: Buffer, filename?: string): FormatDetectionResult {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException("File is empty");
    }
    return this.universalParser.detectFormat(buffer, filename);
  }

  async recover(
    buffer: Buffer,
    filename?: string,
    overrideOptions?: ParserOptions,
  ): Promise<ParsedData> {
    // Try with different delimiters and encodings
    const delimiters = [",", ";", "\t", "|"];
    const encodings: BufferEncoding[] = ["utf-8", "latin1", "utf-16le"];

    let bestResult: ParsedData | null = null;
    let bestRowCount = 0;

    for (const encoding of encodings) {
      for (const delimiter of delimiters) {
        try {
          const result = await this.universalParser.parse(buffer, filename, {
            ...overrideOptions,
            delimiter,
            encoding,
          });
          if (result.rows.length > bestRowCount && result.errors.length === 0) {
            bestResult = result;
            bestRowCount = result.rows.length;
          }
        } catch {
          // Try next combination
        }
      }
    }

    if (bestResult) return bestResult;

    // Fallback: try as-is
    return this.universalParser.parse(buffer, filename, overrideOptions);
  }

  getSupportedFormats(): {
    format: string;
    extensions: string[];
    available: boolean;
  }[] {
    return [
      {
        format: "CSV",
        extensions: [".csv", ".tsv"],
        available: true, // csv-parser availability checked at parse time
      },
      {
        format: "Excel",
        extensions: [".xlsx", ".xls"],
        available: true,
      },
      {
        format: "JSON",
        extensions: [".json"],
        available: true, // native, always available
      },
    ];
  }
}
