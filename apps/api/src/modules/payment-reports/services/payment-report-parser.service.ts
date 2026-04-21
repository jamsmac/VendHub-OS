import { Injectable, Logger } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import * as crypto from "crypto";

const AdmZip = require("adm-zip");

/** Max decompressed size from ZIP to prevent zip bombs */
const MAX_DECOMPRESSED_SIZE = 100 * 1024 * 1024; // 100 MB
import { ReportType } from "../entities/payment-report-upload.entity";
import {
  PaymentReportDetectorService,
  DetectionResult,
} from "./payment-report-detector.service";

export interface ParsedReportRow {
  rowIndex: number;
  externalId?: string;
  orderNumber?: string;
  paymentTime?: Date;
  amount?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  cardNumber?: string;
  clientPhone?: string;
  goodsName?: string;
  machineCode?: string;
  location?: string;
  rawData: Record<string, unknown>;
}

export interface ParsedReport {
  detection: DetectionResult;
  rows: ParsedReportRow[];
  periodFrom?: Date;
  periodTo?: Date;
  totalAmount?: number;
  meta: Record<string, unknown>;
  fileHash: string;
}

@Injectable()
export class PaymentReportParserService {
  private readonly logger = new Logger(PaymentReportParserService.name);

  constructor(private readonly detector: PaymentReportDetectorService) {}

  /** Главный метод — разобрать загруженный файл */
  async parse(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<ParsedReport> {
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Если ZIP — извлекаем первый XLSX
    let workBuffer = buffer;
    let workFileName = fileName;
    if (fileName.toLowerCase().endsWith(".zip")) {
      const extracted = this.extractFirstXlsxFromZip(buffer);
      if (extracted) {
        workBuffer = extracted.buffer;
        workFileName = extracted.fileName;
      }
    }

    const isCsv =
      workFileName.toLowerCase().endsWith(".csv") || mimeType.includes("csv");

    let rawRows: unknown[][];
    let sheetNames: string[] = [];

    if (isCsv) {
      rawRows = this.parseCsvRows(workBuffer);
    } else {
      const result = await this.parseXlsxRows(workBuffer);
      rawRows = result.rows;
      sheetNames = result.sheetNames;
    }

    const detection = this.detector.detect(
      workFileName,
      sheetNames,
      rawRows,
      mimeType,
    );
    const headerIndex = detection.headerRowIndex ?? 0;

    let parsedRows: ParsedReportRow[];
    switch (detection.type) {
      case ReportType.PAYME:
        parsedRows = this.parsePaymeRows(rawRows, headerIndex);
        break;
      case ReportType.CLICK:
        parsedRows = this.parseClickRows(rawRows, headerIndex);
        break;
      case ReportType.VENDHUB_ORDERS:
        parsedRows = this.parseVendhubOrderRows(rawRows, headerIndex);
        break;
      case ReportType.VENDHUB_CSV:
        parsedRows = this.parseVendhubCsvRows(rawRows, headerIndex);
        break;
      case ReportType.KASSA_FISCAL:
        parsedRows = this.parseKassaRows(rawRows, headerIndex);
        break;
      default:
        parsedRows = this.parseUnknownRows(rawRows);
    }

    const totalAmount = parsedRows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const times = parsedRows
      .map((r) => r.paymentTime)
      .filter(Boolean)
      .sort((a, b) => a!.getTime() - b!.getTime()) as Date[];

    return {
      detection,
      rows: parsedRows,
      ...(times[0] !== undefined && { periodFrom: times[0] }),
      ...(times[times.length - 1] !== undefined && {
        periodTo: times[times.length - 1],
      }),
      totalAmount,
      meta: detection.meta,
      fileHash,
    };
  }

  // ─────────────────────────────────────────────
  // XLSX helpers
  // ─────────────────────────────────────────────
  private async parseXlsxRows(buffer: Buffer): Promise<{
    rows: unknown[][];
    sheetNames: string[];
  }> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);

    const sheetNames = wb.worksheets.map((ws) => ws.name);
    const ws = wb.worksheets[0];
    if (!ws) return { rows: [], sheetNames };

    const rows: unknown[][] = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      rows.push(
        row.values
          ? (row.values as unknown[]).slice(1) // ExcelJS row.values is 1-indexed
          : [],
      );
    });

    return { rows, sheetNames };
  }

  private parseCsvRows(buffer: Buffer): unknown[][] {
    const text = buffer.toString("utf-8");
    const lines = text.split("\n").filter((l) => l.trim());
    return lines.map((line) => line.split(";").map((v) => v.trim()));
  }

  private extractFirstXlsxFromZip(
    buffer: Buffer,
  ): { buffer: Buffer; fileName: string } | null {
    try {
      const zip = new AdmZip(buffer);
      const entry = zip
        .getEntries()
        .find(
          (e: { name: string; header: { size: number } }) =>
            (e.name.toLowerCase().endsWith(".xlsx") ||
              e.name.toLowerCase().endsWith(".xls")) &&
            e.header.size <= MAX_DECOMPRESSED_SIZE,
        );
      if (!entry) return null;

      // Zip bomb protection: reject entries exceeding max decompressed size
      if (entry.header.size > MAX_DECOMPRESSED_SIZE) {
        this.logger.warn(
          `ZIP entry ${entry.name} exceeds max decompressed size (${entry.header.size} > ${MAX_DECOMPRESSED_SIZE})`,
        );
        return null;
      }

      const data = entry.getData();
      if (data.length > MAX_DECOMPRESSED_SIZE) {
        this.logger.warn(
          `ZIP entry ${entry.name} actual size exceeds limit (${data.length} > ${MAX_DECOMPRESSED_SIZE})`,
        );
        return null;
      }

      return { buffer: data, fileName: entry.name };
    } catch (e: unknown) {
      this.logger.warn("Failed to read ZIP", e);
    }
    return null;
  }

  private toDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? undefined : d;
  }

  private toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === "") return undefined;
    const n = Number(String(value).replace(/\s/g, "").replace(",", "."));
    return isNaN(n) ? undefined : n;
  }

  private mapHeader(row: unknown[]): Record<string, number> {
    const map: Record<string, number> = {};
    row.forEach((cell, i) => {
      if (cell != null) {
        map[String(cell).trim().replace(/\n/g, " ")] = i;
      }
    });
    return map;
  }

  // ─────────────────────────────────────────────
  // PAYME parser
  // Строки 0-5: метаданные, строка 6: заголовок, далее данные
  // ─────────────────────────────────────────────
  private parsePaymeRows(
    rawRows: unknown[][],
    headerIndex: number,
  ): ParsedReportRow[] {
    if (rawRows.length <= headerIndex + 1) return [];
    const headers = this.mapHeader(rawRows[headerIndex] ?? []);
    const results: ParsedReportRow[] = [];

    for (let i = headerIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.every((v) => v === null || v === undefined)) continue;

      const rawData: Record<string, unknown> = {};
      Object.entries(headers).forEach(([key, idx]) => {
        rawData[key] = row[idx] ?? null;
      });

      const get = (col: string) => row[headers[col] ?? -1];
      const amount = this.toNumber(get("СУММА БЕЗ КОМИССИИ"));
      if (amount === undefined && !get("ВРЕМЯ ОПЛАТЫ")) continue; // пропускаем пустые

      const paymentTime0 = this.toDate(get("ВРЕМЯ ОПЛАТЫ"));
      results.push({
        rowIndex: i,
        externalId: String(
          get("ИДЕНТИФИКАТОР ПЛАТЕЖА  (ПЛАТЕЖНАЯ СИСТЕМА)") ??
            get("ИДЕНТИФИКАТОР ПЛАТЕЖА \n (ПЛАТЕЖНАЯ СИСТЕМА)") ??
            "",
        ),
        orderNumber: String(get("НОМЕР ЗАКАЗА") ?? ""),
        ...(paymentTime0 !== undefined && { paymentTime: paymentTime0 }),
        ...(amount !== undefined && { amount }),
        paymentStatus: String(get("СОСТОЯНИЕ ОПЛАТЫ") ?? ""),
        paymentMethod: String(get("НАЗВАНИЕ ПРОЦЕССИНГА") ?? ""),
        cardNumber: String(get("НОМЕР КАРТЫ") ?? ""),
        location: String(get("НАЗВАНИЕ КАССЫ") ?? ""),
        rawData,
      });
    }
    return results;
  }

  // ─────────────────────────────────────────────
  // CLICK parser
  // Строка 0: заголовок, далее данные
  // ─────────────────────────────────────────────
  private parseClickRows(
    rawRows: unknown[][],
    headerIndex: number,
  ): ParsedReportRow[] {
    if (rawRows.length <= headerIndex + 1) return [];
    const headers = this.mapHeader(rawRows[headerIndex] ?? []);
    const results: ParsedReportRow[] = [];

    for (let i = headerIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.every((v) => v === null || v === undefined)) continue;

      const rawData: Record<string, unknown> = {};
      Object.entries(headers).forEach(([key, idx]) => {
        rawData[key] = row[idx] ?? null;
      });

      const get = (col: string) => row[headers[col] ?? -1];

      const paymentTimeClick = this.toDate(get("Дата"));
      const amountClick = this.toNumber(get("Сумма"));
      results.push({
        rowIndex: i,
        externalId: String(get("Click ID") ?? ""),
        orderNumber: String(get("Идент-р") ?? ""),
        ...(paymentTimeClick !== undefined && {
          paymentTime: paymentTimeClick,
        }),
        ...(amountClick !== undefined && { amount: amountClick }),
        paymentStatus: String(get("Статус платежа") ?? ""),
        paymentMethod: String(get("Способ оплаты") ?? ""),
        clientPhone: String(get("Клиент") ?? ""),
        location: String(get("Касса") ?? ""),
        rawData,
      });
    }
    return results;
  }

  // ─────────────────────────────────────────────
  // VENDHUB ORDERS parser
  // ─────────────────────────────────────────────
  private parseVendhubOrderRows(
    rawRows: unknown[][],
    headerIndex: number,
  ): ParsedReportRow[] {
    if (rawRows.length <= headerIndex + 1) return [];
    const headers = this.mapHeader(rawRows[headerIndex] ?? []);
    const results: ParsedReportRow[] = [];

    for (let i = headerIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.every((v) => v === null || v === undefined)) continue;

      const rawData: Record<string, unknown> = {};
      Object.entries(headers).forEach(([key, idx]) => {
        rawData[key] = row[idx] ?? null;
      });

      const get = (col: string) => row[headers[col] ?? -1];

      const paymentTimeVh = this.toDate(get("Время оплаты"));
      const amountVh = this.toNumber(get("Цена заказа"));
      results.push({
        rowIndex: i,
        orderNumber: String(get("Номер заказа") ?? ""),
        ...(paymentTimeVh !== undefined && { paymentTime: paymentTimeVh }),
        ...(amountVh !== undefined && { amount: amountVh }),
        paymentStatus: String(get("Статус платежа") ?? ""),
        paymentMethod: String(get("Ресурс заказа") ?? ""),
        cardNumber: String(get("Платежная карта") ?? ""),
        goodsName: String(get("Наименование товара") ?? ""),
        machineCode: String(get("Машинный код") ?? ""),
        location: String(get("Адрес") ?? ""),
        rawData,
      });
    }
    return results;
  }

  // ─────────────────────────────────────────────
  // VENDHUB CSV parser (semicolon-separated)
  // ─────────────────────────────────────────────
  private parseVendhubCsvRows(
    rawRows: unknown[][],
    headerIndex: number,
  ): ParsedReportRow[] {
    if (rawRows.length <= headerIndex + 1) return [];
    const headers = this.mapHeader(rawRows[headerIndex] ?? []);
    const results: ParsedReportRow[] = [];

    for (let i = headerIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.every((v) => v === null || v === undefined || v === ""))
        continue;

      const rawData: Record<string, unknown> = {};
      Object.entries(headers).forEach(([key, idx]) => {
        rawData[key] = row[idx] ?? null;
      });

      const get = (col: string) => row[headers[col] ?? -1];
      const priceStr = String(get("Order price") ?? "")
        .replace(/\s/g, "")
        .replace(",", ".");

      const paymentTimeCsv = this.toDate(get("Time"));
      const amountCsv = this.toNumber(priceStr);
      results.push({
        rowIndex: i,
        externalId: String(get("ID") ?? ""),
        orderNumber: String(get("Order number") ?? ""),
        ...(paymentTimeCsv !== undefined && { paymentTime: paymentTimeCsv }),
        ...(amountCsv !== undefined && { amount: amountCsv }),
        paymentMethod: String(get("Payment type") ?? ""),
        goodsName: String(get("Goods name") ?? ""),
        machineCode: String(get("Machine Code") ?? ""),
        location: String(get("Machine category") ?? ""),
        rawData,
      });
    }
    return results;
  }

  // ─────────────────────────────────────────────
  // KASSA FISCAL parser
  // ─────────────────────────────────────────────
  private parseKassaRows(
    rawRows: unknown[][],
    headerIndex: number,
  ): ParsedReportRow[] {
    if (rawRows.length <= headerIndex + 1) return [];
    const headers = this.mapHeader(rawRows[headerIndex] ?? []);
    const results: ParsedReportRow[] = [];

    for (let i = headerIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.every((v) => v === null || v === undefined)) continue;

      const rawData: Record<string, unknown> = {};
      Object.entries(headers).forEach(([key, idx]) => {
        rawData[key] = row[idx] ?? null;
      });

      const get = (col: string) => row[headers[col] ?? -1];
      const operation = String(get("Операция") ?? "");
      if (!operation) continue;

      const cash = this.toNumber(get("Наличные"));
      const card = this.toNumber(get("Карта"));
      const total =
        this.toNumber(get("Сумма операции")) ?? (cash ?? 0) + (card ?? 0);

      const paymentTimeKassa = this.toDate(get("Дата и время"));
      const amountKassa = total > 0 ? total : undefined;
      results.push({
        rowIndex: i,
        externalId: String(get("Номер чека") ?? ""),
        ...(paymentTimeKassa !== undefined && {
          paymentTime: paymentTimeKassa,
        }),
        ...(amountKassa !== undefined && { amount: amountKassa }),
        paymentStatus: operation,
        paymentMethod: card ? "Карта" : "Наличные",
        location: String(get("Торговый пункт") ?? ""),
        rawData,
      });
    }
    return results;
  }

  // ─────────────────────────────────────────────
  // UNKNOWN — сохраняем как есть
  // ─────────────────────────────────────────────
  private parseUnknownRows(rawRows: unknown[][]): ParsedReportRow[] {
    return rawRows.slice(1, 101).map((row, i) => ({
      rowIndex: i + 1,
      rawData: row.reduce<Record<string, unknown>>((acc, v, idx) => {
        acc[`col_${idx}`] = v;
        return acc;
      }, {}),
    }));
  }
}
