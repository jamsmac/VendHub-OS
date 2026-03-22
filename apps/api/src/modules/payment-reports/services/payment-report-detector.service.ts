import { Injectable, Logger } from "@nestjs/common";
import { ReportType } from "../entities/payment-report-upload.entity";

export interface DetectionResult {
  type: ReportType;
  confidence: number;
  meta: Record<string, unknown>;
  headerRowIndex?: number; // для XLSX — индекс строки с заголовками
}

/**
 * Сервис авто-определения типа отчёта платёжной системы
 *
 * Поддерживаемые типы:
 *   PAYME         — XLSX от payme.uz (метаданные в строках 0-5, заголовок в строке 6)
 *   CLICK         — XLSX от click.uz (лист "Общий отчет", колонки Click ID / Billing ID)
 *   VENDHUB_ORDERS — XLSX экспорт заказов из VendHub (Sheet1, 20 колонок с "Номер заказа")
 *   VENDHUB_CSV   — CSV экспорт товарных чеков (semicolon-separated, колонка "Goods name")
 *   KASSA_FISCAL  — XLSX/ZIP кассового аппарата (колонки "Фискальный модуль", "Номер чека")
 */
@Injectable()
export class PaymentReportDetectorService {
  private readonly logger = new Logger(PaymentReportDetectorService.name);

  /**
   * Определить тип отчёта по уже разобранным данным файла.
   * @param fileName  оригинальное имя файла
   * @param sheetNames список листов (для XLSX)
   * @param rawRows   первые 15 строк как массив массивов значений
   * @param mimeType  MIME-тип файла
   */
  detect(
    fileName: string,
    sheetNames: string[],
    rawRows: unknown[][],
    mimeType: string,
  ): DetectionResult {
    const _lowerName = fileName.toLowerCase();

    // ────────────────────────────────────────────────────
    // 1. PAYME — характерные признаки в шапке файла
    // ────────────────────────────────────────────────────
    const paymeResult = this.tryDetectPayme(rawRows, sheetNames, _lowerName);
    if (paymeResult) return paymeResult;

    // ────────────────────────────────────────────────────
    // 2. CLICK — лист "Общий отчет" + колонка Click ID
    // ────────────────────────────────────────────────────
    const clickResult = this.tryDetectClick(rawRows, sheetNames, _lowerName);
    if (clickResult) return clickResult;

    // ────────────────────────────────────────────────────
    // 3. KASSA FISCAL — кассовый аппарат
    // ────────────────────────────────────────────────────
    const kassaResult = this.tryDetectKassa(rawRows, sheetNames, _lowerName);
    if (kassaResult) return kassaResult;

    // ────────────────────────────────────────────────────
    // 4. VENDHUB CSV — CSV с разделителем ";"
    // ────────────────────────────────────────────────────
    if (mimeType.includes("csv") || _lowerName.endsWith(".csv")) {
      const csvResult = this.tryDetectVendhubCsv(rawRows, _lowerName);
      if (csvResult) return csvResult;
    }

    // ────────────────────────────────────────────────────
    // 5. VENDHUB ORDERS — XLSX экспорт заказов
    // ────────────────────────────────────────────────────
    const ordersResult = this.tryDetectVendhubOrders(
      rawRows,
      sheetNames,
      _lowerName,
    );
    if (ordersResult) return ordersResult;

    this.logger.warn(`Could not detect report type for: ${fileName}`);
    return { type: ReportType.UNKNOWN, confidence: 0, meta: {} };
  }

  // ────────────────────────────────────────────────────────────
  // PAYME
  // ────────────────────────────────────────────────────────────
  private tryDetectPayme(
    rawRows: unknown[][],
    sheetNames: string[],
    _lowerName: string,
  ): DetectionResult | null {
    let score = 0;
    const meta: Record<string, unknown> = {};

    // По имени файла
    if (_lowerName.includes("payme")) score += 30;

    // Ищем строку с "ТИП ОТЧЕТА"
    for (let i = 0; i < Math.min(8, rawRows.length); i++) {
      const rowStr = rawRows[i]!.map((v) => String(v ?? "")).join(" ");
      if (rowStr.includes("ТИП ОТЧЕТА")) {
        score += 40;
        // Извлекаем период
        const periodRow = rawRows[i + 1] ?? [];
        const periodRow2 = rawRows[i + 2] ?? [];
        meta.reportType = rawRows[i]![2];
        meta.createdAt = rawRows[i]![6];
        meta.periodFrom = periodRow[3];
        meta.periodTo = periodRow2[3];
      }
      if (rowStr.includes("СУММА БЕЗ КОМИССИИ") && rowStr.includes("RRN"))
        score += 30;
      if (
        rowStr.includes("НАЗВАНИЕ ПОСТАВЩИКA") ||
        rowStr.includes("СОСТОЯНИЕ ОПЛАТЫ")
      )
        score += 20;
    }

    // Заголовок в строке 6 (нулевая индексация)
    if (rawRows.length > 6) {
      const headerRow = rawRows[6]!.map((v) => String(v ?? ""));
      if (headerRow.includes("№") && headerRow.includes("НАЗВАНИЕ КАССЫ"))
        score += 20;
    }

    if (score >= 40) {
      return {
        type: ReportType.PAYME,
        confidence: Math.min(score, 100),
        meta,
        headerRowIndex: 6,
      };
    }
    return null;
  }

  // ────────────────────────────────────────────────────────────
  // CLICK
  // ────────────────────────────────────────────────────────────
  private tryDetectClick(
    rawRows: unknown[][],
    sheetNames: string[],
    _lowerName: string,
  ): DetectionResult | null {
    let score = 0;
    const meta: Record<string, unknown> = {};

    if (_lowerName.includes("click")) score += 30;
    if (sheetNames.some((s) => s.toLowerCase().includes("общий отчет")))
      score += 35;

    // Первая строка должна содержать заголовки
    if (rawRows.length > 0) {
      const headerStr = rawRows[0]!.map((v) => String(v ?? "")).join(" ");
      if (headerStr.includes("Click ID") || headerStr.includes("Billing ID"))
        score += 40;
      if (headerStr.includes("Статус платежа") && headerStr.includes("Сумма"))
        score += 15;
      if (headerStr.includes("Идент-р") || headerStr.includes("Сервис"))
        score += 15;

      // Проверяем данные — должны быть даты и суммы
      if (rawRows.length > 1) {
        const firstDataRow = rawRows[1]!;
        const hasDate = firstDataRow.some((v) => {
          const s = String(v ?? "");
          return /\d{4}-\d{2}-\d{2}/.test(s);
        });
        if (hasDate) score += 10;
      }
    }

    if (score >= 40) {
      meta.sheetName = sheetNames[0];
      return {
        type: ReportType.CLICK,
        confidence: Math.min(score, 100),
        meta,
        headerRowIndex: 0,
      };
    }
    return null;
  }

  // ────────────────────────────────────────────────────────────
  // KASSA FISCAL
  // ────────────────────────────────────────────────────────────
  private tryDetectKassa(
    rawRows: unknown[][],
    sheetNames: string[],
    _lowerName: string,
  ): DetectionResult | null {
    let score = 0;
    const meta: Record<string, unknown> = {};

    if (
      _lowerName.includes("kassa") ||
      _lowerName.includes("касс") ||
      _lowerName.includes("cash")
    )
      score += 20;

    // Лист с ID фискального модуля
    const sheetWithSerial = sheetNames.find(
      (s) => /[A-Z0-9]{10,}/.test(s) || s.toLowerCase().includes("сервер"),
    );
    if (sheetWithSerial) {
      score += 30;
      meta.sheetName = sheetWithSerial;
    }

    // Ищем заголовок
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const rowStr = rawRows[i]!.map((v) => String(v ?? "")).join(" ");
      if (rowStr.includes("Фискальный модуль") || rowStr.includes("Фискальный"))
        score += 40;
      if (rowStr.includes("Номер чека") && rowStr.includes("Операция"))
        score += 30;
      if (
        rowStr.includes("Сумма операции") ||
        rowStr.includes("Торговый пункт")
      )
        score += 20;
      if (score >= 40) {
        meta.headerRowIndex = i + 1; // данные после этой строки
        break;
      }
    }

    if (score >= 40) {
      return {
        type: ReportType.KASSA_FISCAL,
        confidence: Math.min(score, 100),
        meta,
        headerRowIndex: (meta.headerRowIndex as number) ?? 1,
      };
    }
    return null;
  }

  // ────────────────────────────────────────────────────────────
  // VENDHUB CSV
  // ────────────────────────────────────────────────────────────
  private tryDetectVendhubCsv(
    rawRows: unknown[][],
    _lowerName: string,
  ): DetectionResult | null {
    let score = 0;
    const meta: Record<string, unknown> = {};

    if (rawRows.length > 0) {
      const headerStr = rawRows[0]!.map((v) => String(v ?? "")).join(" ");
      if (headerStr.includes("Goods name") || headerStr.includes("Goods ID"))
        score += 40;
      if (
        headerStr.includes("Machine Code") ||
        headerStr.includes("Machine category")
      )
        score += 30;
      if (
        headerStr.includes("Order number") ||
        headerStr.includes("Order resource")
      )
        score += 20;
      if (headerStr.includes("ИКПУ") || headerStr.includes("Штрих код"))
        score += 10;
      if (headerStr.includes("Payment type")) score += 15;
    }

    if (score >= 40) {
      meta.separator = ";";
      return {
        type: ReportType.VENDHUB_CSV,
        confidence: Math.min(score, 100),
        meta,
        headerRowIndex: 0,
      };
    }
    return null;
  }

  // ────────────────────────────────────────────────────────────
  // VENDHUB ORDERS
  // ────────────────────────────────────────────────────────────
  private tryDetectVendhubOrders(
    rawRows: unknown[][],
    sheetNames: string[],
    _lowerName: string,
  ): DetectionResult | null {
    let score = 0;
    const meta: Record<string, unknown> = {};

    if (_lowerName.includes("order")) score += 15;

    if (rawRows.length > 0) {
      const headerStr = rawRows[0]!.map((v) => String(v ?? "")).join(" ");
      if (headerStr.includes("Номер заказа")) score += 40;
      if (headerStr.includes("Машинный код")) score += 30;
      if (
        headerStr.includes("Статус варки") ||
        headerStr.includes("Время варки") ||
        headerStr.includes("Время заваривания")
      )
        score += 25;
      if (
        headerStr.includes("Наименование товара") ||
        headerStr.includes("Название вкуса")
      )
        score += 20;
      if (
        headerStr.includes("Ресурс заказа") ||
        headerStr.includes("Тип заказа")
      )
        score += 15;
    }

    if (score >= 40) {
      meta.sheetName = sheetNames[0];
      return {
        type: ReportType.VENDHUB_ORDERS,
        confidence: Math.min(score, 100),
        meta,
        headerRowIndex: 0,
      };
    }
    return null;
  }
}
