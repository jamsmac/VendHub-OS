import { Injectable, Logger } from "@nestjs/common";
import {
  ParsedData,
  ParsedRow,
  ParserOptions,
  FileFormat,
} from "../interfaces/parser.interface";

// Dynamic require — exceljs is optional
let ExcelJS: typeof import("exceljs") | null = null;
try {
  ExcelJS = require("exceljs");
} catch {
  // exceljs not installed
}

@Injectable()
export class ExcelParser {
  private readonly logger = new Logger(ExcelParser.name);

  get isAvailable(): boolean {
    return ExcelJS !== null;
  }

  async parse(
    buffer: Buffer,
    options: ParserOptions = {},
  ): Promise<ParsedData> {
    if (!ExcelJS) {
      return {
        format: FileFormat.EXCEL,
        headers: [],
        rows: [],
        totalRows: 0,
        errors: ["exceljs package not installed"],
      };
    }

    const {
      sheetIndex = 0,
      headerRow = 1,
      maxRows = 10000,
      skipEmptyRows = true,
      trimValues = true,
    } = options;

    try {
      const workbook = new ExcelJS.Workbook();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.worksheets[sheetIndex];
      if (!worksheet) {
        return {
          format: FileFormat.EXCEL,
          headers: [],
          rows: [],
          totalRows: 0,
          errors: [`Sheet at index ${sheetIndex} not found`],
        };
      }

      const headers: string[] = [];
      const headerRowData = worksheet.getRow(headerRow);
      headerRowData.eachCell((cell, colNumber) => {
        let value = cell.text || `Column${colNumber}`;
        if (trimValues) value = value.trim();
        headers.push(value);
      });

      const rows: ParsedRow[] = [];
      const errors: string[] = [];

      for (let rowNum = headerRow + 1; rowNum <= worksheet.rowCount; rowNum++) {
        if (rows.length >= maxRows) break;

        const row = worksheet.getRow(rowNum);
        const rowData: ParsedRow = {};
        let isEmpty = true;

        headers.forEach((header, idx) => {
          const cell = row.getCell(idx + 1);
          let value: string | number | boolean | null = null;

          if (cell.type === 2) {
            // Number
            value = cell.value as number;
            isEmpty = false;
          } else if (cell.type === 4) {
            // Date
            value = cell.text;
            isEmpty = false;
          } else if (cell.type === 6) {
            // Boolean (formula result or explicit)
            value = cell.value as boolean;
            isEmpty = false;
          } else if (cell.text) {
            value = trimValues ? cell.text.trim() : cell.text;
            isEmpty = false;
          }

          rowData[header] = value;
        });

        if (skipEmptyRows && isEmpty) continue;
        rows.push(rowData);
      }

      return {
        format: FileFormat.EXCEL,
        headers,
        rows,
        totalRows: rows.length,
        errors,
        metadata: {
          sheetName: worksheet.name,
          totalSheets: workbook.worksheets.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Excel parse error: ${error instanceof Error ? error.message : error}`,
      );
      return {
        format: FileFormat.EXCEL,
        headers: [],
        rows: [],
        totalRows: 0,
        errors: [
          `Excel parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }
}
