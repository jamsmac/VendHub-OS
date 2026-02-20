/**
 * Import Parser Service
 * CSV, Excel, and JSON file parsing
 */

import { Injectable, BadRequestException } from "@nestjs/common";
import * as XLSX from "xlsx";
import * as Papa from "papaparse";

@Injectable()
export class ImportParserService {
  /**
   * Parse CSV file
   */
  async parseCSV(
    buffer: Buffer,
    options?: { delimiter?: string; encoding?: string; headerRow?: number },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
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
          resolve({
            headers: results.meta.fields || [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rows: results.data as Record<string, any>[],
          });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: (error: any) => {
          reject(new BadRequestException(`CSV parse error: ${error.message}`));
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });

      const sheetName = options?.sheetName || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        throw new BadRequestException(`Sheet "${sheetName}" not found`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
        header: 1,
        defval: "",
      });

      const headerRowIndex = (options?.headerRow || 1) - 1;
      const startRowIndex = (options?.startRow || 2) - 1;

      const headers = (rawData[headerRowIndex] as string[]).map((h) =>
        String(h).trim(),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: Record<string, any>[] = [];

      for (let i = startRowIndex; i < rawData.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rowData = rawData[i] as any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row: Record<string, any> = {};

        headers.forEach((header, idx) => {
          row[header] = rowData[idx] ?? "";
        });

        // Skip empty rows
        if (Object.values(row).some((v) => v !== "")) {
          rows.push(row);
        }
      }

      return { headers, rows };
    } catch (error: unknown) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
    try {
      const data = JSON.parse(buffer.toString("utf-8"));
      const rows = Array.isArray(data) ? data : [data];

      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

      return { headers, rows };
    } catch (error: unknown) {
      throw new BadRequestException(
        `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
