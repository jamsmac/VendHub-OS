/**
 * VendHub Excel Export Service
 * Экспорт отчетов в Excel согласно спецификации v11.0
 *
 * Delegates sheet building to:
 * - ExcelStructureABuilder (payment-type breakdown sheets)
 * - ExcelStructureBBuilder (financial analytics sheets)
 */

import { Injectable, Logger } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import {
  VendHubFullReportDto,
  ReportStructure,
} from "../dto/vendhub-report.dto";
import {
  STYLES,
  autoFitColumns,
  formatDate,
  formatDateTime,
} from "./excel-shared";
import { ExcelStructureABuilder } from "./excel-structure-a.builder";
import { ExcelStructureBBuilder } from "./excel-structure-b.builder";

@Injectable()
export class VendHubExcelExportService {
  private readonly logger = new Logger(VendHubExcelExportService.name);

  constructor(
    private readonly structureABuilder: ExcelStructureABuilder,
    private readonly structureBBuilder: ExcelStructureBBuilder,
  ) {}

  /**
   * Экспортирует отчет VendHub в Excel
   */
  async exportToExcel(report: VendHubFullReportDto): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "VendHub OS";
    workbook.created = new Date();

    this.logger.log(
      `Exporting VendHub report ${report.metadata.reportId} to Excel`,
    );

    // Create Contents sheet first
    this.createContentsSheet(workbook, report);

    // Export based on structure
    if (report.structureA) {
      this.structureABuilder.exportStructureA(
        workbook,
        report.structureA,
        report.metadata,
      );
    }

    if (report.structureB) {
      this.structureBBuilder.exportStructureB(
        workbook,
        report.structureB,
        report.metadata,
      );
    }

    // Add analytics sheet if full report
    if (report.analytics) {
      this.createAnalyticsSheet(workbook, report.analytics);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ============================================================================
  // CONTENTS SHEET
  // ============================================================================

  private createContentsSheet(
    workbook: ExcelJS.Workbook,
    report: VendHubFullReportDto,
  ): void {
    const sheet = workbook.addWorksheet("Содержание", {
      views: [{ showGridLines: false }],
    });

    // Title
    sheet.mergeCells("A1:D1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "\u{1F4CA} ОТЧЁТ VENDHUB";
    titleCell.style = STYLES.TITLE as Partial<ExcelJS.Style>;
    sheet.getRow(1).height = 30;

    // Period info
    sheet.getCell("A3").value = "Период:";
    sheet.getCell("B3").value =
      `${formatDate(report.metadata.period.from)} — ${formatDate(report.metadata.period.to)}`;
    sheet.getCell("A4").value = "Структура:";
    sheet.getCell("B4").value = this.getStructureName(
      report.metadata.structure,
    );
    sheet.getCell("A5").value = "Создан:";
    sheet.getCell("B5").value = formatDateTime(report.metadata.generatedAt);
    sheet.getCell("A6").value = "ID отчёта:";
    sheet.getCell("B6").value = report.metadata.reportId;

    // Table of Contents
    sheet.getCell("A8").value = "СОДЕРЖАНИЕ";
    sheet.getCell("A8").style = { font: { bold: true, size: 12 } };

    let row = 10;
    const sheets = workbook.worksheets.slice(1);

    for (let i = 0; i < sheets.length; i++) {
      sheet.getCell(`A${row}`).value = i + 1;
      sheet.getCell(`B${row}`).value = sheets[i]!.name;
      row++;
    }

    // Set column widths
    sheet.getColumn("A").width = 5;
    sheet.getColumn("B").width = 40;
    sheet.getColumn("C").width = 20;
    sheet.getColumn("D").width = 20;
  }

  // ============================================================================
  // ANALYTICS SHEET
  // ============================================================================

  private createAnalyticsSheet(
    workbook: ExcelJS.Workbook,
    analytics: VendHubFullReportDto["analytics"],
  ): void {
    if (!analytics) return;

    const sheet = workbook.addWorksheet("Аналитика");

    sheet.getCell("A1").value = "\u{1F4CA} СВОДНАЯ АНАЛИТИКА";
    sheet.getCell("A1").style = STYLES.TITLE as Partial<ExcelJS.Style>;

    // Trends
    let row = 3;
    sheet.getCell(`A${row}`).value = "ТРЕНДЫ";
    sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11 } };
    row++;
    sheet.getCell(`A${row}`).value = "Рост выручки:";
    sheet.getCell(`B${row}`).value = analytics.trends.revenueGrowth / 100;
    sheet.getCell(`B${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = "Рост заказов:";
    sheet.getCell(`B${row}`).value = analytics.trends.orderGrowth / 100;
    sheet.getCell(`B${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = "Тренд маржи:";
    sheet.getCell(`B${row}`).value = analytics.trends.marginTrend / 100;
    sheet.getCell(`B${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;

    // Top Products
    row += 2;
    sheet.getCell(`A${row}`).value = "TOP-10 ПРОДУКТОВ";
    sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11 } };
    row++;
    for (const product of analytics.topProducts) {
      sheet.getCell(`A${row}`).value = product.name;
      sheet.getCell(`B${row}`).value = product.revenue;
      sheet.getCell(`C${row}`).value = product.count;
      row++;
    }

    // Top Machines
    row++;
    sheet.getCell(`A${row}`).value = "TOP-10 АВТОМАТОВ";
    sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11 } };
    row++;
    for (const machine of analytics.topMachines) {
      sheet.getCell(`A${row}`).value = machine.code;
      sheet.getCell(`B${row}`).value = machine.address;
      sheet.getCell(`C${row}`).value = machine.revenue;
      row++;
    }

    // Alerts
    if (analytics.alerts.length > 0) {
      row++;
      sheet.getCell(`A${row}`).value = "\u26A0\uFE0F ПРЕДУПРЕЖДЕНИЯ";
      sheet.getCell(`A${row}`).style = {
        font: { bold: true, size: 11, color: { argb: "FFFF0000" } },
      };
      row++;
      for (const alert of analytics.alerts) {
        const icon =
          alert.severity === "critical"
            ? "\u274C"
            : alert.severity === "warning"
              ? "\u26A0\uFE0F"
              : "\u2139\uFE0F";
        sheet.getCell(`A${row}`).value = `${icon} ${alert.message}`;
        row++;
      }
    }

    autoFitColumns(sheet);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private getStructureName(structure: ReportStructure): string {
    switch (structure) {
      case ReportStructure.A:
        return "A: По типам платежей";
      case ReportStructure.B:
        return "B: Финансовая аналитика";
      case ReportStructure.FULL:
        return "A+B: Полная";
      default:
        return structure;
    }
  }
}
