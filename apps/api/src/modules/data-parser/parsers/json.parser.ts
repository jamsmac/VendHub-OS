import { Injectable, Logger } from "@nestjs/common";
import {
  ParsedData,
  ParsedRow,
  ParserOptions,
  FileFormat,
} from "../interfaces/parser.interface";

@Injectable()
export class JsonParser {
  private readonly logger = new Logger(JsonParser.name);

  async parse(
    buffer: Buffer,
    options: ParserOptions = {},
  ): Promise<ParsedData> {
    const { maxRows = 10000, trimValues = true } = options;

    try {
      const text = buffer.toString(options.encoding || "utf-8");
      const parsed = JSON.parse(text);

      let dataArray: Record<string, unknown>[];

      if (Array.isArray(parsed)) {
        dataArray = parsed;
      } else if (parsed && typeof parsed === "object") {
        // Try to find the first array property (common pattern: { data: [...] })
        const arrayProp = Object.values(parsed).find(Array.isArray) as
          | Record<string, unknown>[]
          | undefined;
        dataArray = arrayProp || [parsed];
      } else {
        return {
          format: FileFormat.JSON,
          headers: [],
          rows: [],
          totalRows: 0,
          errors: ["JSON root is not an object or array"],
        };
      }

      dataArray = dataArray.slice(0, maxRows);

      // Extract headers from all rows
      const headerSet = new Set<string>();
      for (const item of dataArray) {
        if (item && typeof item === "object") {
          Object.keys(item).forEach((k) => headerSet.add(k));
        }
      }
      const headers = Array.from(headerSet);

      const rows: ParsedRow[] = dataArray.map((item) => {
        const row: ParsedRow = {};
        for (const header of headers) {
          const val = item[header];
          if (val === null || val === undefined) {
            row[header] = null;
          } else if (typeof val === "string") {
            row[header] = trimValues ? val.trim() : val;
          } else if (typeof val === "number" || typeof val === "boolean") {
            row[header] = val;
          } else {
            row[header] = JSON.stringify(val);
          }
        }
        return row;
      });

      return {
        format: FileFormat.JSON,
        headers,
        rows,
        totalRows: rows.length,
        errors: [],
      };
    } catch (error) {
      this.logger.error(
        `JSON parse error: ${error instanceof Error ? error.message : error}`,
      );
      return {
        format: FileFormat.JSON,
        headers: [],
        rows: [],
        totalRows: 0,
        errors: [
          `JSON parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }
}
