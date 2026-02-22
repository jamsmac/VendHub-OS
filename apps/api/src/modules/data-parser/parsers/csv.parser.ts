import { Injectable, Logger } from "@nestjs/common";
import { Readable } from "stream";
import {
  ParsedData,
  ParsedRow,
  ParserOptions,
  FileFormat,
} from "../interfaces/parser.interface";

// Dynamic require — csv-parser is optional
let csvParser: typeof import("csv-parser") | null = null;
try {
  csvParser = require("csv-parser");
} catch {
  // csv-parser not installed
}

@Injectable()
export class CsvParser {
  private readonly logger = new Logger(CsvParser.name);

  get isAvailable(): boolean {
    return csvParser !== null;
  }

  async parse(
    buffer: Buffer,
    options: ParserOptions = {},
  ): Promise<ParsedData> {
    if (!csvParser) {
      return {
        format: FileFormat.CSV,
        headers: [],
        rows: [],
        totalRows: 0,
        errors: ["csv-parser package not installed"],
      };
    }

    const {
      delimiter = ",",
      maxRows = 10000,
      skipEmptyRows = true,
      trimValues = true,
    } = options;

    return new Promise((resolve) => {
      const rows: ParsedRow[] = [];
      const errors: string[] = [];
      let headers: string[] = [];

      const stream = Readable.from(buffer);
      stream
        .pipe(
          csvParser({
            separator: delimiter,
            skipLines: options.headerRow ? options.headerRow - 1 : 0,
            mapValues: ({ value }: { value: string }) =>
              trimValues ? value.trim() : value,
          }),
        )
        .on("headers", (h: string[]) => {
          headers = h.map((header) => (trimValues ? header.trim() : header));
        })
        .on("data", (row: ParsedRow) => {
          if (rows.length >= maxRows) return;

          if (skipEmptyRows) {
            const values = Object.values(row);
            if (values.every((v) => v === "" || v === null || v === undefined))
              return;
          }

          rows.push(row);
        })
        .on("error", (err: Error) => {
          this.logger.error(`CSV parse error: ${err.message}`);
          errors.push(err.message);
        })
        .on("end", () => {
          resolve({
            format: FileFormat.CSV,
            headers,
            rows,
            totalRows: rows.length,
            errors,
          });
        });
    });
  }
}
