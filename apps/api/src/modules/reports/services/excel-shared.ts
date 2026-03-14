/**
 * Shared constants and utilities for VendHub Excel export
 */

import * as ExcelJS from "exceljs";

// ============================================================================
// STYLING CONSTANTS
// ============================================================================

export const STYLES = {
  HEADER: {
    font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
    fill: {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FF2E5090" },
    },
    alignment: { horizontal: "center" as const, vertical: "middle" as const },
    border: {
      top: { style: "thin" as const },
      left: { style: "thin" as const },
      bottom: { style: "thin" as const },
      right: { style: "thin" as const },
    },
  },
  SUBHEADER: {
    font: { bold: true, size: 10 },
    fill: {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FFE8E8E8" },
    },
    alignment: { horizontal: "center" as const, vertical: "middle" as const },
  },
  NUMBER: {
    numFmt: "#,##0",
    alignment: { horizontal: "right" as const },
  },
  CURRENCY: {
    numFmt: '#,##0" сум"',
    alignment: { horizontal: "right" as const },
  },
  PERCENT: {
    numFmt: "0.00%",
    alignment: { horizontal: "right" as const },
  },
  TITLE: {
    font: { bold: true, size: 14, color: { argb: "FF2E5090" } },
    alignment: { horizontal: "center" as const },
  },
  TOTAL_ROW: {
    font: { bold: true },
    fill: {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FFFFF2CC" },
    },
  },
  OK_STATUS: {
    font: { color: { argb: "FF008000" } },
  },
  WARNING_STATUS: {
    font: { color: { argb: "FFFFA500" } },
  },
  CRITICAL_STATUS: {
    font: { color: { argb: "FFFF0000" } },
  },
};

// ============================================================================
// SHARED UTILITY FUNCTIONS
// ============================================================================

export function addHeaderRow(
  sheet: ExcelJS.Worksheet,
  rowNum: number,
  headers: string[],
): void {
  headers.forEach((header, i) => {
    const cell = sheet.getCell(rowNum, i + 1);
    cell.value = header;
    cell.style = STYLES.HEADER as Partial<ExcelJS.Style>;
  });
  sheet.getRow(rowNum).height = 20;
}

export function autoFitColumns(sheet: ExcelJS.Worksheet): void {
  sheet.columns.forEach((column) => {
    if (!column.values) return;

    let maxLength = 10;
    column.values.forEach((value) => {
      if (value) {
        const length = String(value).length;
        if (length > maxLength) {
          maxLength = Math.min(length, 50);
        }
      }
    });
    column.width = maxLength + 2;
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getPaymentTypeName(type: string): string {
  const names: Record<string, string> = {
    CASH: "Наличные",
    QR: "QR",
    VIP: "VIP",
    CREDIT: "Кредит",
    TEST: "Тест",
  };
  return names[type] || type;
}
