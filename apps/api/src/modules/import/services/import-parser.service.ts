/**
 * Import Parser Service
 * CSV, Excel, and JSON file parsing
 */

import { Injectable, BadRequestException } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import * as Papa from "papaparse";

export const IMPORT_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_ROWS: 50_000,
  MAX_COLUMNS: 100,
  MAX_CELL_LENGTH: 10_000,
};

@Injectable()
export class ImportParserService {
  private enforceRowLimit(
    rows: Record<string, unknown>[],
    format: string,
  ): void {
    if (rows.length > IMPORT_LIMITS.MAX_ROWS) {
      throw new BadRequestException(
        `${format} file exceeds maximum of ${IMPORT_LIMITS.MAX_ROWS.toLocaleString()} rows (got ${rows.length.toLocaleString()})`,
      );
    }
  }

  private enforceColumnLimit(headers: string[], format: string): void {
    if (headers.length > IMPORT_LIMITS.MAX_COLUMNS) {
      throw new BadRequestException(
        `${format} file exceeds maximum of ${IMPORT_LIMITS.MAX_COLUMNS} columns (got ${headers.length})`,
      );
    }
  }

  private truncateCellValues(rows: Record<string, unknown>[]): void {
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (
          typeof row[key] === "string" &&
          row[key].length > IMPORT_LIMITS.MAX_CELL_LENGTH
        ) {
          row[key] = row[key].slice(0, IMPORT_LIMITS.MAX_CELL_LENGTH);
        }
      }
    }
  }

  /**
   * Parse CSV file
   */
  async parseCSV(
    buffer: Buffer,
    options?: { delimiter?: string; encoding?: string; headerRow?: number },
  ): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
    const csvString = buffer.toString(
      (options?.encoding as BufferEncoding) || "utf-8",
    );

    return new Promise((resolve, reject) => {
      Papa.parse(csvString, {
        header: true,
        delimiter: options?.delimiter || ",",
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          const headers = results.meta.fields || [];
          const rows = results.data as Record<string, unknown>[];

          try {
            this.enforceColumnLimit(headers, "CSV");
            this.enforceRowLimit(rows, "CSV");
            this.truncateCellValues(rows);
          } catch (err) {
            reject(err);
            return;
          }

          resolve({ headers, rows });
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : String(error);
          reject(new BadRequestException(`CSV parse error: ${message}`));
        },
      });
    });
  }

  /**
   * Parse Excel file
   */
  async parseExcel(
    buffer: Buffer,
    options?: { sheetName?: string; headerRow?: number; startRow?: number },
  ): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

      const sheet = options?.sheetName
        ? workbook.getWorksheet(options.sheetName)
        : workbook.worksheets[0];

      if (!sheet) {
        throw new BadRequestException(
          `Sheet "${options?.sheetName || "first"}" not found`,
        );
      }

      const headerRowIndex = options?.headerRow || 1;
      const startRowIndex = options?.startRow || 2;

      const headerRow = sheet.getRow(headerRowIndex);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value ?? "").trim();
      });

      const rows: Record<string, unknown>[] = [];

      for (let i = startRowIndex; i <= sheet.rowCount; i++) {
        const excelRow = sheet.getRow(i);
        const row: Record<string, unknown> = {};

        headers.forEach((header, idx) => {
          const cell = excelRow.getCell(idx + 1);
          row[header] = cell.value ?? "";
        });

        // Skip empty rows
        if (Object.values(row).some((v) => v !== "")) {
          rows.push(row);
        }
      }

      this.enforceColumnLimit(headers, "Excel");
      this.enforceRowLimit(rows, "Excel");
      this.truncateCellValues(rows);

      return { headers, rows };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Excel parse error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parse JSON file
   */
  async parseJSON(
    buffer: Buffer,
  ): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
    try {
      const data = JSON.parse(buffer.toString("utf-8"));
      const rows = Array.isArray(data) ? data : [data];

      this.enforceRowLimit(rows, "JSON");

      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

      this.enforceColumnLimit(headers, "JSON");
      this.truncateCellValues(rows);

      return { headers, rows };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
