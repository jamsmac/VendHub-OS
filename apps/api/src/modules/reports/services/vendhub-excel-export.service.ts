/**
 * VendHub Excel Export Service
 * Экспорт отчетов в Excel согласно спецификации v11.0
 */

import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  VendHubFullReportDto,
  VendHubReportStructureA,
  VendHubReportStructureB,
  ReportStructure,
  STRUCTURE_A_SHEETS,
  STRUCTURE_B_SHEETS,
  VENDHUB_INGREDIENTS,
} from '../dto/vendhub-report.dto';

// ============================================================================
// STYLING CONSTANTS
// ============================================================================

const STYLES = {
  HEADER: {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2E5090' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const },
    },
  },
  SUBHEADER: {
    font: { bold: true, size: 10 },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE8E8E8' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
  },
  NUMBER: {
    numFmt: '#,##0',
    alignment: { horizontal: 'right' as const },
  },
  CURRENCY: {
    numFmt: '#,##0" сум"',
    alignment: { horizontal: 'right' as const },
  },
  PERCENT: {
    numFmt: '0.00%',
    alignment: { horizontal: 'right' as const },
  },
  TITLE: {
    font: { bold: true, size: 14, color: { argb: 'FF2E5090' } },
    alignment: { horizontal: 'center' as const },
  },
  TOTAL_ROW: {
    font: { bold: true },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF2CC' } },
  },
  OK_STATUS: {
    font: { color: { argb: 'FF008000' } },
  },
  WARNING_STATUS: {
    font: { color: { argb: 'FFFFA500' } },
  },
  CRITICAL_STATUS: {
    font: { color: { argb: 'FFFF0000' } },
  },
};

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class VendHubExcelExportService {
  private readonly logger = new Logger(VendHubExcelExportService.name);

  /**
   * Экспортирует отчет VendHub в Excel
   */
  async exportToExcel(report: VendHubFullReportDto): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'VendHub OS';
    workbook.created = new Date();

    this.logger.log(`Exporting VendHub report ${report.metadata.reportId} to Excel`);

    // Create Contents sheet first
    this.createContentsSheet(workbook, report);

    // Export based on structure
    if (report.structureA) {
      await this.exportStructureA(workbook, report.structureA, report.metadata);
    }

    if (report.structureB) {
      await this.exportStructureB(workbook, report.structureB, report.metadata);
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

  private createContentsSheet(workbook: ExcelJS.Workbook, report: VendHubFullReportDto): void {
    const sheet = workbook.addWorksheet('Содержание', {
      views: [{ showGridLines: false }],
    });

    // Title
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = '📊 ОТЧЁТ VENDHUB';
    titleCell.style = STYLES.TITLE as Partial<ExcelJS.Style>;
    sheet.getRow(1).height = 30;

    // Period info
    sheet.getCell('A3').value = 'Период:';
    sheet.getCell('B3').value = `${this.formatDate(report.metadata.period.from)} — ${this.formatDate(report.metadata.period.to)}`;
    sheet.getCell('A4').value = 'Структура:';
    sheet.getCell('B4').value = this.getStructureName(report.metadata.structure);
    sheet.getCell('A5').value = 'Создан:';
    sheet.getCell('B5').value = this.formatDateTime(report.metadata.generatedAt);
    sheet.getCell('A6').value = 'ID отчёта:';
    sheet.getCell('B6').value = report.metadata.reportId;

    // Table of Contents
    sheet.getCell('A8').value = 'СОДЕРЖАНИЕ';
    sheet.getCell('A8').style = { font: { bold: true, size: 12 } };

    let row = 10;
    const sheets = workbook.worksheets.slice(1);

    for (let i = 0; i < sheets.length; i++) {
      sheet.getCell(`A${row}`).value = i + 1;
      sheet.getCell(`B${row}`).value = sheets[i].name;
      row++;
    }

    // Set column widths
    sheet.getColumn('A').width = 5;
    sheet.getColumn('B').width = 40;
    sheet.getColumn('C').width = 20;
    sheet.getColumn('D').width = 20;
  }

  // ============================================================================
  // STRUCTURE A EXPORT
  // ============================================================================

  private async exportStructureA(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA,
    metadata: VendHubFullReportDto['metadata'],
  ): Promise<void> {
    this.logger.log('Exporting Structure A sheets');

    // Сводка
    this.createSummarySheetA(workbook, data.summary, metadata);

    // По месяцам
    this.createMonthlyPaymentTypesSheet(workbook, data.byMonths);

    // По дням недели
    this.createWeekdaySheet(workbook, data.byWeekdays);

    // По автоматам
    this.createMachinePaymentTypesSheet(workbook, data.byMachines);

    // По продуктам
    this.createProductPaymentTypesSheet(workbook, data.byProducts);

    // Наличные
    this.createPaymentTypeDetailSheets(workbook, data.cashSummary, 'Наличные');

    // QR
    this.createQRDetailSheets(workbook, data.qrSummary);

    // VIP
    this.createVIPSheets(workbook, data.vipSummary);

    // Кредит
    this.createCreditSheets(workbook, data.creditSummary);

    // Сверка QR
    this.createQRReconciliationSheet(workbook, data.qrReconciliation);

    // Кросс-анализ
    this.createCrossAnalysisSheet(workbook, data.crossAnalysis);

    // Ежедневно
    this.createDailyReportSheet(workbook, data.dailyReport);

    // Средний чек
    this.createAverageCheckSheet(workbook, data.averageCheck);
  }

  private createSummarySheetA(
    workbook: ExcelJS.Workbook,
    summary: VendHubReportStructureA['summary'],
    _metadata: VendHubFullReportDto['metadata'],
  ): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.SUMMARY);

    // Title
    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = 'СВОДКА ПО ТИПАМ ПЛАТЕЖЕЙ';
    sheet.getCell('A1').style = STYLES.TITLE as Partial<ExcelJS.Style>;
    sheet.getRow(1).height = 25;

    // Period
    sheet.getCell('A3').value = `Период: ${this.formatDate(summary.period.from)} — ${this.formatDate(summary.period.to)}`;

    // Payment types table
    const headers = ['Тип платежа', 'Заказов', 'Сумма (сум)', '% кол-во', '% сумма', 'Ср. чек'];
    let row = 5;

    this.addHeaderRow(sheet, row, headers);
    row++;

    const icons: Record<string, string> = {
      CASH: '💵',
      QR: '📱',
      VIP: '⭐',
      CREDIT: '💳',
    };

    for (const pt of summary.byPaymentType) {
      const icon = icons[pt.paymentType] || '';
      sheet.getCell(`A${row}`).value = `${icon} ${this.getPaymentTypeName(pt.paymentType)}`;
      sheet.getCell(`B${row}`).value = pt.orderCount;
      sheet.getCell(`C${row}`).value = pt.totalAmount;
      sheet.getCell(`C${row}`).style = STYLES.CURRENCY as Partial<ExcelJS.Style>;
      sheet.getCell(`D${row}`).value = pt.percentByCount / 100;
      sheet.getCell(`D${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
      sheet.getCell(`E${row}`).value = pt.percentByAmount / 100;
      sheet.getCell(`E${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
      sheet.getCell(`F${row}`).value = pt.averageCheck;
      sheet.getCell(`F${row}`).style = STYLES.CURRENCY as Partial<ExcelJS.Style>;
      row++;
    }

    // Total row
    sheet.getCell(`A${row}`).value = 'ИТОГО (платные)';
    sheet.getCell(`B${row}`).value = summary.totalPaid.orderCount;
    sheet.getCell(`C${row}`).value = summary.totalPaid.totalAmount;
    sheet.getCell(`D${row}`).value = 1;
    sheet.getCell(`E${row}`).value = 1;
    sheet.getCell(`F${row}`).value = summary.totalPaid.averageCheck;
    for (let col = 1; col <= 6; col++) {
      sheet.getCell(row, col).style = STYLES.TOTAL_ROW as Partial<ExcelJS.Style>;
    }
    row++;

    // Test orders
    row += 2;
    sheet.getCell(`A${row}`).value = `🧪 Тестовые заказы: ${summary.testOrderCount}`;

    // QR Details
    row += 2;
    sheet.getCell(`A${row}`).value = 'ДЕТАЛИЗАЦИЯ QR-ПЛАТЕЖЕЙ';
    sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11 } };
    row++;

    const qrHeaders = ['Система', 'Платежей', 'Сумма (сум)', '% от QR', 'Ср. платёж'];
    this.addHeaderRow(sheet, row, qrHeaders);
    row++;

    for (const qr of summary.qrDetails) {
      sheet.getCell(`A${row}`).value = qr.system;
      sheet.getCell(`B${row}`).value = qr.paymentCount;
      sheet.getCell(`C${row}`).value = qr.totalAmount;
      sheet.getCell(`D${row}`).value = qr.percentOfQR / 100;
      sheet.getCell(`E${row}`).value = qr.averagePayment;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createMonthlyPaymentTypesSheet(workbook: ExcelJS.Workbook, data: VendHubReportStructureA['byMonths']): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.BY_MONTHS);

    const headers = [
      'Месяц', 'Наличные кол', 'Наличные сум', 'QR кол', 'QR сум',
      'VIP кол', 'VIP сум', 'Кредит кол', 'Кредит сум', 'ИТОГО кол', 'ИТОГО сум'
    ];

    this.addHeaderRow(sheet, 1, headers);

    let row = 2;
    for (const month of data) {
      sheet.getCell(`A${row}`).value = month.monthName;
      sheet.getCell(`B${row}`).value = month.cash.count;
      sheet.getCell(`C${row}`).value = month.cash.amount;
      sheet.getCell(`D${row}`).value = month.qr.count;
      sheet.getCell(`E${row}`).value = month.qr.amount;
      sheet.getCell(`F${row}`).value = month.vip.count;
      sheet.getCell(`G${row}`).value = month.vip.amount;
      sheet.getCell(`H${row}`).value = month.credit.count;
      sheet.getCell(`I${row}`).value = month.credit.amount;
      sheet.getCell(`J${row}`).value = month.total.count;
      sheet.getCell(`K${row}`).value = month.total.amount;

      // Apply currency format to amount columns
      [3, 5, 7, 9, 11].forEach(col => {
        sheet.getCell(row, col).style = STYLES.CURRENCY as Partial<ExcelJS.Style>;
      });

      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createWeekdaySheet(workbook: ExcelJS.Workbook, data: VendHubReportStructureA['byWeekdays']): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.BY_DAYS);

    // ⚠️ Это по ДНЯМ НЕДЕЛИ (7 строк), не по датам!
    sheet.getCell('A1').value = '⚠️ По ДНЯМ НЕДЕЛИ (не по датам)';
    sheet.getCell('A1').style = { font: { italic: true, color: { argb: 'FFFF6600' } } };

    const headers = ['День недели', 'Наличные кол', 'Наличные сум', 'QR кол', 'QR сум', 'VIP кол', 'VIP сум', 'ИТОГО кол', 'ИТОГО сум'];
    this.addHeaderRow(sheet, 3, headers);

    let row = 4;
    for (const day of data) {
      sheet.getCell(`A${row}`).value = day.dayName;
      sheet.getCell(`B${row}`).value = day.cash.count;
      sheet.getCell(`C${row}`).value = day.cash.amount;
      sheet.getCell(`D${row}`).value = day.qr.count;
      sheet.getCell(`E${row}`).value = day.qr.amount;
      sheet.getCell(`F${row}`).value = day.vip.count;
      sheet.getCell(`G${row}`).value = day.vip.amount;
      sheet.getCell(`H${row}`).value = day.total.count;
      sheet.getCell(`I${row}`).value = day.total.amount;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createMachinePaymentTypesSheet(workbook: ExcelJS.Workbook, data: VendHubReportStructureA['byMachines']): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.BY_MACHINES);

    const headers = [
      '#', 'Код', 'Адрес', 'Наличные кол', 'Наличные сум', 'QR кол', 'QR сум',
      'VIP кол', 'VIP сум', 'Кредит кол', 'Кредит сум', 'ИТОГО кол', 'ИТОГО сум', '% выручки'
    ];

    this.addHeaderRow(sheet, 1, headers);

    let row = 2;
    let num = 1;
    for (const machine of data) {
      sheet.getCell(`A${row}`).value = num++;
      sheet.getCell(`B${row}`).value = machine.machineCode;
      sheet.getCell(`C${row}`).value = machine.address;
      sheet.getCell(`D${row}`).value = machine.cash.count;
      sheet.getCell(`E${row}`).value = machine.cash.amount;
      sheet.getCell(`F${row}`).value = machine.qr.count;
      sheet.getCell(`G${row}`).value = machine.qr.amount;
      sheet.getCell(`H${row}`).value = machine.vip.count;
      sheet.getCell(`I${row}`).value = machine.vip.amount;
      sheet.getCell(`J${row}`).value = machine.credit.count;
      sheet.getCell(`K${row}`).value = machine.credit.amount;
      sheet.getCell(`L${row}`).value = machine.total.count;
      sheet.getCell(`M${row}`).value = machine.total.amount;
      sheet.getCell(`N${row}`).value = machine.revenuePercent / 100;
      sheet.getCell(`N${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createProductPaymentTypesSheet(workbook: ExcelJS.Workbook, data: VendHubReportStructureA['byProducts']): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.BY_PRODUCTS);

    const headers = ['#', 'Продукт', 'Налич.кол', 'Налич.сум', 'QR кол', 'QR сум', 'VIP кол', 'VIP сум', 'Всего кол', 'Всего сум'];
    this.addHeaderRow(sheet, 1, headers);

    let row = 2;
    let num = 1;
    for (const product of data) {
      sheet.getCell(`A${row}`).value = num++;
      sheet.getCell(`B${row}`).value = product.productName;
      sheet.getCell(`C${row}`).value = product.cash.count;
      sheet.getCell(`D${row}`).value = product.cash.amount;
      sheet.getCell(`E${row}`).value = product.qr.count;
      sheet.getCell(`F${row}`).value = product.qr.amount;
      sheet.getCell(`G${row}`).value = product.vip.count;
      sheet.getCell(`H${row}`).value = product.vip.amount;
      sheet.getCell(`I${row}`).value = product.total.count;
      sheet.getCell(`J${row}`).value = product.total.amount;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createPaymentTypeDetailSheets(workbook: ExcelJS.Workbook, data: any, prefix: string): void {
    // Summary sheet
    const summarySheet = workbook.addWorksheet(prefix);
    summarySheet.getCell('A1').value = `Сводка по типу "${prefix}"`;

    // Monthly sheet
    const monthlySheet = workbook.addWorksheet(`${prefix}_месяцы`);
    const monthHeaders = ['Месяц', 'Заказов', 'Сумма', 'Ср.чек', 'Доля'];
    this.addHeaderRow(monthlySheet, 1, monthHeaders);

    let row = 2;
    for (const month of data.months || []) {
      monthlySheet.getCell(`A${row}`).value = month.monthName;
      monthlySheet.getCell(`B${row}`).value = month.total.count;
      monthlySheet.getCell(`C${row}`).value = month.total.amount;
      monthlySheet.getCell(`D${row}`).value = month.total.count > 0 ? Math.round(month.total.amount / month.total.count) : 0;
      row++;
    }

    this.autoFitColumns(monthlySheet);
  }

  private createQRDetailSheets(workbook: ExcelJS.Workbook, data: any): void {
    // QR Summary
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.QR_SUMMARY);
    sheet.getCell('A1').value = 'Сводка QR-платежей';

    // QR Share by machines
    const shareSheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.QR_SHARE);
    const headers = ['Автомат', 'Адрес', 'Всего заказов', 'Наличные', 'QR', 'Доля QR %'];
    this.addHeaderRow(shareSheet, 1, headers);

    let row = 2;
    for (const machine of data.qrShare || []) {
      shareSheet.getCell(`A${row}`).value = machine.machineId;
      shareSheet.getCell(`B${row}`).value = machine.address || '';
      shareSheet.getCell(`C${row}`).value = machine.totalOrders;
      shareSheet.getCell(`D${row}`).value = machine.cashOrders;
      shareSheet.getCell(`E${row}`).value = machine.qrOrders;
      shareSheet.getCell(`F${row}`).value = machine.qrSharePercent / 100;
      shareSheet.getCell(`F${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
      row++;
    }

    this.autoFitColumns(shareSheet);
  }

  private createVIPSheets(workbook: ExcelJS.Workbook, data: any): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.VIP_SUMMARY);
    sheet.getCell('A1').value = 'VIP заказы';
    sheet.getCell('A3').value = `Всего: ${data.total.orderCount} заказов, ${data.total.totalAmount} сум`;

    // Details
    const detailSheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.VIP_DETAILS);
    const headers = ['Дата', 'Автомат', 'Продукт', 'Сумма', 'Статус'];
    this.addHeaderRow(detailSheet, 1, headers);

    let row = 2;
    for (const detail of data.details || []) {
      detailSheet.getCell(`A${row}`).value = detail.date;
      detailSheet.getCell(`B${row}`).value = detail.machineCode;
      detailSheet.getCell(`C${row}`).value = detail.productName;
      detailSheet.getCell(`D${row}`).value = detail.amount;
      detailSheet.getCell(`E${row}`).value = detail.status;
      row++;
    }

    this.autoFitColumns(detailSheet);
  }

  private createCreditSheets(workbook: ExcelJS.Workbook, data: any): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.CREDIT_SUMMARY);
    sheet.getCell('A1').value = 'Кредитные платежи';
    sheet.getCell('A3').value = `Всего: ${data.total.orderCount} заказов, ${data.total.totalAmount} сум`;

    // Details
    const detailSheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.CREDIT_DETAILS);
    const headers = ['Дата', 'Автомат', 'Адрес', 'Продукт', 'Сумма'];
    this.addHeaderRow(detailSheet, 1, headers);

    let row = 2;
    for (const detail of data.details || []) {
      detailSheet.getCell(`A${row}`).value = detail.date;
      detailSheet.getCell(`B${row}`).value = detail.machineCode;
      detailSheet.getCell(`C${row}`).value = detail.machineAddress;
      detailSheet.getCell(`D${row}`).value = detail.productName;
      detailSheet.getCell(`E${row}`).value = detail.amount;
      row++;
    }

    this.autoFitColumns(detailSheet);
  }

  private createQRReconciliationSheet(workbook: ExcelJS.Workbook, data: VendHubReportStructureA['qrReconciliation']): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.QR_RECONCILIATION);

    const headers = [
      'Месяц', 'Order QR кол', 'Order QR сум', 'Payme кол', 'Payme сум',
      'Click кол', 'Click сум', 'Внешние сум', 'Разница сум', 'Разница %', 'Статус'
    ];
    this.addHeaderRow(sheet, 1, headers);

    let row = 2;
    for (const rec of data) {
      sheet.getCell(`A${row}`).value = rec.month;
      sheet.getCell(`B${row}`).value = rec.orderQR.count;
      sheet.getCell(`C${row}`).value = rec.orderQR.amount;
      sheet.getCell(`D${row}`).value = rec.payme.count;
      sheet.getCell(`E${row}`).value = rec.payme.amount;
      sheet.getCell(`F${row}`).value = rec.click.count;
      sheet.getCell(`G${row}`).value = rec.click.amount;
      sheet.getCell(`H${row}`).value = rec.externalTotal;
      sheet.getCell(`I${row}`).value = rec.difference;
      sheet.getCell(`J${row}`).value = rec.differencePercent / 100;
      sheet.getCell(`J${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;

      const statusCell = sheet.getCell(`K${row}`);
      statusCell.value = rec.status === 'OK' ? '✅ OK' : rec.status === 'WARNING' ? '⚠️ Внимание' : '❌ Критично';
      statusCell.style = rec.status === 'OK'
        ? STYLES.OK_STATUS as Partial<ExcelJS.Style>
        : rec.status === 'WARNING'
          ? STYLES.WARNING_STATUS as Partial<ExcelJS.Style>
          : STYLES.CRITICAL_STATUS as Partial<ExcelJS.Style>;

      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createCrossAnalysisSheet(workbook: ExcelJS.Workbook, data: VendHubReportStructureA['crossAnalysis']): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.CROSS_ANALYSIS);

    sheet.getCell('A1').value = 'КРОСС-АНАЛИЗ TOP-5 × TOP-5';
    sheet.getCell('A1').style = STYLES.TITLE as Partial<ExcelJS.Style>;

    // Matrix headers
    sheet.getCell('A3').value = 'Продукт \\ Автомат';
    data.topMachines.forEach((machine, i) => {
      sheet.getCell(3, i + 2).value = machine;
    });

    // Matrix data
    data.topProducts.forEach((product, i) => {
      sheet.getCell(4 + i, 1).value = product;
      data.matrix[i]?.forEach((count, j) => {
        sheet.getCell(4 + i, j + 2).value = count;
      });
    });

    // Hourly analysis
    const hourlyRow = 4 + data.topProducts.length + 2;
    sheet.getCell(`A${hourlyRow}`).value = 'ПОЧАСОВОЙ АНАЛИЗ';
    sheet.getCell(`A${hourlyRow}`).style = { font: { bold: true, size: 11 } };

    const hourHeaders = ['Час', 'Заказов', 'Сумма', 'Ср. чек'];
    this.addHeaderRow(sheet, hourlyRow + 1, hourHeaders);

    let row = hourlyRow + 2;
    for (const hour of data.hourlyAnalysis) {
      sheet.getCell(`A${row}`).value = `${String(hour.hour).padStart(2, '0')}:00`;
      sheet.getCell(`B${row}`).value = hour.orderCount;
      sheet.getCell(`C${row}`).value = hour.totalAmount;
      sheet.getCell(`D${row}`).value = hour.averageCheck;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createDailyReportSheet(workbook: ExcelJS.Workbook, data: any[]): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.DAILY);

    // ⚠️ Это по ДАТАМ (много строк)!
    sheet.getCell('A1').value = '⚠️ По ДАТАМ (ежедневный отчёт)';
    sheet.getCell('A1').style = { font: { italic: true, color: { argb: 'FFFF6600' } } };

    const headers = ['Дата', 'Наличные кол', 'Наличные сум', 'QR кол', 'QR сум', 'VIP кол', 'VIP сум', 'ИТОГО кол', 'ИТОГО сум'];
    this.addHeaderRow(sheet, 3, headers);

    let row = 4;
    for (const day of data) {
      sheet.getCell(`A${row}`).value = day.date;
      sheet.getCell(`B${row}`).value = day.cash?.count || 0;
      sheet.getCell(`C${row}`).value = day.cash?.amount || 0;
      sheet.getCell(`D${row}`).value = day.qr?.count || 0;
      sheet.getCell(`E${row}`).value = day.qr?.amount || 0;
      sheet.getCell(`F${row}`).value = day.vip?.count || 0;
      sheet.getCell(`G${row}`).value = day.vip?.amount || 0;
      sheet.getCell(`H${row}`).value = day.total?.count || 0;
      sheet.getCell(`I${row}`).value = day.total?.amount || 0;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createAverageCheckSheet(workbook: ExcelJS.Workbook, data: any): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.AVERAGE_CHECK);

    sheet.getCell('A1').value = 'СРЕДНИЙ ЧЕК';
    sheet.getCell('A1').style = STYLES.TITLE as Partial<ExcelJS.Style>;

    // By month
    sheet.getCell('A3').value = 'По месяцам';
    const monthHeaders = ['Месяц', 'Средний чек'];
    this.addHeaderRow(sheet, 4, monthHeaders);

    let row = 5;
    for (const month of data.byMonth || []) {
      sheet.getCell(`A${row}`).value = month.month;
      sheet.getCell(`B${row}`).value = month.averageCheck;
      row++;
    }

    // By product
    row += 2;
    sheet.getCell(`A${row}`).value = 'По продуктам';
    const prodHeaders = ['Продукт', 'Средний чек'];
    this.addHeaderRow(sheet, row + 1, prodHeaders);

    row += 2;
    for (const product of data.byProduct || []) {
      sheet.getCell(`A${row}`).value = product.product;
      sheet.getCell(`B${row}`).value = product.averageCheck;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  // ============================================================================
  // STRUCTURE B EXPORT
  // ============================================================================

  private async exportStructureB(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureB,
    metadata: VendHubFullReportDto['metadata'],
  ): Promise<void> {
    this.logger.log('Exporting Structure B sheets');

    // Сводка
    this.createSummarySheetB(workbook, data.summary, metadata);

    // По месяцам (финансовые показатели)
    this.createMonthlyFinancialSheet(workbook, data.byMonths);

    // По дням (по датам!)
    this.createDailyFinancialSheet(workbook, data.byDays);

    // По автоматам
    this.createMachineFinancialSheet(workbook, data.byMachines);

    // По продуктам (с категорией и себестоимостью)
    this.createProductFinancialSheet(workbook, data.byProducts);

    // Ингредиенты
    this.createIngredientSheets(workbook, data.ingredients);

    // Сбои
    this.createFailuresSheet(workbook, data.deliveryFailures);
  }

  private createSummarySheetB(
    workbook: ExcelJS.Workbook,
    summary: VendHubReportStructureB['summary'],
    _metadata: VendHubFullReportDto['metadata'],
  ): void {
    const sheet = workbook.addWorksheet('B_' + STRUCTURE_B_SHEETS.SUMMARY);

    // Title
    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = 'СВОДКА VENDHUB';
    sheet.getCell('A1').style = STYLES.TITLE as Partial<ExcelJS.Style>;

    // Period
    sheet.getCell('A3').value = `Период: ${this.formatDate(summary.period.from)} — ${this.formatDate(summary.period.to)}`;
    sheet.getCell('A4').value = `Количество дней: ${summary.period.dayCount}`;

    // Orders section
    let row = 6;
    sheet.getCell(`A${row}`).value = 'ЗАКАЗЫ';
    sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11 } };
    row++;
    sheet.getCell(`A${row}`).value = 'Всего заказов:';
    sheet.getCell(`B${row}`).value = summary.orders.total;
    row++;
    sheet.getCell(`A${row}`).value = 'Успешных доставок:';
    sheet.getCell(`B${row}`).value = summary.orders.successful;
    row++;
    sheet.getCell(`A${row}`).value = 'Сбоев доставки:';
    sheet.getCell(`B${row}`).value = summary.orders.failed;
    row++;
    sheet.getCell(`A${row}`).value = 'Процент успеха:';
    sheet.getCell(`B${row}`).value = summary.orders.successRate / 100;
    sheet.getCell(`B${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;

    // Finance section
    row += 2;
    sheet.getCell(`A${row}`).value = 'ФИНАНСЫ';
    sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11 } };
    row++;
    sheet.getCell(`A${row}`).value = 'Общая выручка:';
    sheet.getCell(`B${row}`).value = summary.finance.totalRevenue;
    sheet.getCell(`B${row}`).style = STYLES.CURRENCY as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = 'Себестоимость (кофейные):';
    sheet.getCell(`B${row}`).value = summary.finance.costOfGoods;
    sheet.getCell(`B${row}`).style = STYLES.CURRENCY as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = 'Валовая прибыль:';
    sheet.getCell(`B${row}`).value = summary.finance.grossProfit;
    sheet.getCell(`B${row}`).style = STYLES.CURRENCY as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = 'Маржа %:';
    sheet.getCell(`B${row}`).value = summary.finance.marginPercent / 100;
    sheet.getCell(`B${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = 'Средний чек:';
    sheet.getCell(`B${row}`).value = summary.finance.averageCheck;
    sheet.getCell(`B${row}`).style = STYLES.CURRENCY as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = 'Заказов в день (ср.):';
    sheet.getCell(`B${row}`).value = summary.finance.ordersPerDay;

    // By payment type
    row += 2;
    sheet.getCell(`A${row}`).value = 'ПО ТИПУ ОПЛАТЫ';
    sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11 } };
    row++;

    for (const pt of summary.byPaymentType) {
      sheet.getCell(`A${row}`).value = `${pt.type}:`;
      sheet.getCell(`B${row}`).value = `${pt.orderCount} заказов, ${pt.totalAmount} сум`;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createMonthlyFinancialSheet(workbook: ExcelJS.Workbook, data: VendHubReportStructureB['byMonths']): void {
    const sheet = workbook.addWorksheet('B_' + STRUCTURE_B_SHEETS.BY_MONTHS);

    // ⚠️ Это ФИНАНСОВЫЕ показатели!
    sheet.getCell('A1').value = '⚠️ ФИНАНСОВЫЕ показатели (не по типам платежей!)';
    sheet.getCell('A1').style = { font: { italic: true, color: { argb: 'FFFF6600' } } };

    const headers = [
      'Месяц', 'Дней', 'Заказов', 'Успешных', 'Сбоев', 'Выручка',
      'Себестоимость', 'Прибыль', 'Маржа %', 'Ср. чек', 'Заказов/день'
    ];
    this.addHeaderRow(sheet, 3, headers);

    let row = 4;
    for (const month of data) {
      sheet.getCell(`A${row}`).value = month.monthName;
      sheet.getCell(`B${row}`).value = month.dayCount;
      sheet.getCell(`C${row}`).value = month.orderCount;
      sheet.getCell(`D${row}`).value = month.successfulCount;
      sheet.getCell(`E${row}`).value = month.failedCount;
      sheet.getCell(`F${row}`).value = month.revenue;
      sheet.getCell(`G${row}`).value = month.costOfGoods;
      sheet.getCell(`H${row}`).value = month.profit;
      sheet.getCell(`I${row}`).value = month.marginPercent / 100;
      sheet.getCell(`I${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
      sheet.getCell(`J${row}`).value = month.averageCheck;
      sheet.getCell(`K${row}`).value = month.ordersPerDay;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createDailyFinancialSheet(workbook: ExcelJS.Workbook, data: VendHubReportStructureB['byDays']): void {
    const sheet = workbook.addWorksheet('B_' + STRUCTURE_B_SHEETS.BY_DAYS);

    // ⚠️ Это по ДАТАМ!
    sheet.getCell('A1').value = '⚠️ По ДАТАМ (много строк)!';
    sheet.getCell('A1').style = { font: { italic: true, color: { argb: 'FFFF6600' } } };

    const headers = [
      'Дата', 'День недели', 'Заказов', 'Успешных', 'Сбоев',
      'Выручка', 'Себестоимость', 'Прибыль', 'Маржа %', 'Ср. чек'
    ];
    this.addHeaderRow(sheet, 3, headers);

    let row = 4;
    for (const day of data) {
      sheet.getCell(`A${row}`).value = day.date;
      sheet.getCell(`B${row}`).value = day.dayOfWeek;
      sheet.getCell(`C${row}`).value = day.orderCount;
      sheet.getCell(`D${row}`).value = day.successfulCount;
      sheet.getCell(`E${row}`).value = day.failedCount;
      sheet.getCell(`F${row}`).value = day.revenue;
      sheet.getCell(`G${row}`).value = day.costOfGoods;
      sheet.getCell(`H${row}`).value = day.profit;
      sheet.getCell(`I${row}`).value = day.marginPercent / 100;
      sheet.getCell(`I${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
      sheet.getCell(`J${row}`).value = day.averageCheck;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createMachineFinancialSheet(workbook: ExcelJS.Workbook, data: VendHubReportStructureB['byMachines']): void {
    const sheet = workbook.addWorksheet('B_' + STRUCTURE_B_SHEETS.BY_MACHINES);

    const headers = [
      'Машинный код', 'Адрес', 'Заказов', 'Успешных', 'Сбоев',
      'Выручка', 'Себестоимость', 'Прибыль', 'Маржа %', 'Доля %'
    ];
    this.addHeaderRow(sheet, 1, headers);

    let row = 2;
    for (const machine of data) {
      sheet.getCell(`A${row}`).value = machine.machineCode;
      sheet.getCell(`B${row}`).value = machine.address;
      sheet.getCell(`C${row}`).value = machine.orderCount;
      sheet.getCell(`D${row}`).value = machine.successfulCount;
      sheet.getCell(`E${row}`).value = machine.failedCount;
      sheet.getCell(`F${row}`).value = machine.revenue;
      sheet.getCell(`G${row}`).value = machine.costOfGoods;
      sheet.getCell(`H${row}`).value = machine.profit;
      sheet.getCell(`I${row}`).value = machine.marginPercent / 100;
      sheet.getCell(`I${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
      sheet.getCell(`J${row}`).value = machine.revenuePercent / 100;
      sheet.getCell(`J${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createProductFinancialSheet(workbook: ExcelJS.Workbook, data: VendHubReportStructureB['byProducts']): void {
    const sheet = workbook.addWorksheet('B_' + STRUCTURE_B_SHEETS.BY_PRODUCTS);

    // ⚠️ Есть Категория и Себестоимость/ед.!
    sheet.getCell('A1').value = '⚠️ ЕСТЬ Категория и Себестоимость/ед.!';
    sheet.getCell('A1').style = { font: { italic: true, color: { argb: 'FF008000' } } };

    const headers = [
      'Продукт', 'Категория', 'Кол-во', 'Выручка', 'Себестоимость/ед.',
      'Себестоимость', 'Прибыль', 'Маржа %', 'Доля %'
    ];
    this.addHeaderRow(sheet, 3, headers);

    let row = 4;
    for (const product of data) {
      sheet.getCell(`A${row}`).value = product.productName;
      sheet.getCell(`B${row}`).value = product.category;
      sheet.getCell(`C${row}`).value = product.orderCount;
      sheet.getCell(`D${row}`).value = product.revenue;
      sheet.getCell(`E${row}`).value = product.costPerUnit;
      sheet.getCell(`F${row}`).value = product.costOfGoods;
      sheet.getCell(`G${row}`).value = product.profit;
      sheet.getCell(`H${row}`).value = product.marginPercent / 100;
      sheet.getCell(`H${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
      sheet.getCell(`I${row}`).value = product.revenuePercent / 100;
      sheet.getCell(`I${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  private createIngredientSheets(workbook: ExcelJS.Workbook, data: VendHubReportStructureB['ingredients']): void {
    // Summary
    const summarySheet = workbook.addWorksheet('B_' + STRUCTURE_B_SHEETS.INGREDIENTS_SUMMARY);
    const summaryHeaders = ['Ингредиент', 'Ед. изм.', 'Цена/ед.', 'Расход', 'Упаковок', 'Стоимость'];
    this.addHeaderRow(summarySheet, 1, summaryHeaders);

    let row = 2;
    for (const ing of data.summary) {
      summarySheet.getCell(`A${row}`).value = ing.ingredientName;
      summarySheet.getCell(`B${row}`).value = ing.unit;
      summarySheet.getCell(`C${row}`).value = ing.pricePerUnit;
      summarySheet.getCell(`D${row}`).value = ing.totalConsumption;
      summarySheet.getCell(`E${row}`).value = ing.packagesUsed;
      summarySheet.getCell(`F${row}`).value = ing.totalCost;
      row++;
    }
    this.autoFitColumns(summarySheet);

    // By months
    const monthlySheet = workbook.addWorksheet('B_' + STRUCTURE_B_SHEETS.INGREDIENTS_MONTHS);
    const ingredientNames = Object.values(VENDHUB_INGREDIENTS).map(i => i.name);
    const monthlyHeaders = ['Месяц', ...ingredientNames];
    this.addHeaderRow(monthlySheet, 1, monthlyHeaders);

    row = 2;
    for (const month of data.byMonths) {
      monthlySheet.getCell(`A${row}`).value = month.month;
      Object.entries(VENDHUB_INGREDIENTS).forEach(([code, _info], i) => {
        monthlySheet.getCell(row, i + 2).value = month.ingredients[code] || 0;
      });
      row++;
    }
    this.autoFitColumns(monthlySheet);

    // By machines
    const machineSheet = workbook.addWorksheet('B_' + STRUCTURE_B_SHEETS.INGREDIENTS_MACHINES);
    const machineHeaders = ['Автомат', 'Адрес', ...ingredientNames, 'Стоимость'];
    this.addHeaderRow(machineSheet, 1, machineHeaders);

    row = 2;
    for (const machine of data.byMachines) {
      machineSheet.getCell(`A${row}`).value = machine.machineCode;
      machineSheet.getCell(`B${row}`).value = machine.address;
      Object.entries(VENDHUB_INGREDIENTS).forEach(([code, _info], i) => {
        machineSheet.getCell(row, i + 3).value = machine.ingredients[code] || 0;
      });
      machineSheet.getCell(row, ingredientNames.length + 3).value = machine.totalCost;
      row++;
    }
    this.autoFitColumns(machineSheet);
  }

  private createFailuresSheet(workbook: ExcelJS.Workbook, data: VendHubReportStructureB['deliveryFailures']): void {
    const sheet = workbook.addWorksheet('B_' + STRUCTURE_B_SHEETS.FAILURES);

    const headers = ['Дата', 'Время', 'Автомат', 'Адрес', 'Продукт', 'Вкус', 'Цена', 'Тип оплаты', 'Статус'];
    this.addHeaderRow(sheet, 1, headers);

    let row = 2;
    for (const failure of data) {
      sheet.getCell(`A${row}`).value = failure.date;
      sheet.getCell(`B${row}`).value = failure.time;
      sheet.getCell(`C${row}`).value = failure.machineCode;
      sheet.getCell(`D${row}`).value = failure.address;
      sheet.getCell(`E${row}`).value = failure.productName;
      sheet.getCell(`F${row}`).value = failure.flavor;
      sheet.getCell(`G${row}`).value = failure.price;
      sheet.getCell(`H${row}`).value = failure.paymentType;
      sheet.getCell(`I${row}`).value = failure.status;
      row++;
    }

    this.autoFitColumns(sheet);
  }

  // ============================================================================
  // ANALYTICS SHEET
  // ============================================================================

  private createAnalyticsSheet(workbook: ExcelJS.Workbook, analytics: VendHubFullReportDto['analytics']): void {
    if (!analytics) return;

    const sheet = workbook.addWorksheet('Аналитика');

    sheet.getCell('A1').value = '📊 СВОДНАЯ АНАЛИТИКА';
    sheet.getCell('A1').style = STYLES.TITLE as Partial<ExcelJS.Style>;

    // Trends
    let row = 3;
    sheet.getCell(`A${row}`).value = 'ТРЕНДЫ';
    sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11 } };
    row++;
    sheet.getCell(`A${row}`).value = 'Рост выручки:';
    sheet.getCell(`B${row}`).value = analytics.trends.revenueGrowth / 100;
    sheet.getCell(`B${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = 'Рост заказов:';
    sheet.getCell(`B${row}`).value = analytics.trends.orderGrowth / 100;
    sheet.getCell(`B${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = 'Тренд маржи:';
    sheet.getCell(`B${row}`).value = analytics.trends.marginTrend / 100;
    sheet.getCell(`B${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;

    // Top Products
    row += 2;
    sheet.getCell(`A${row}`).value = 'TOP-10 ПРОДУКТОВ';
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
    sheet.getCell(`A${row}`).value = 'TOP-10 АВТОМАТОВ';
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
      sheet.getCell(`A${row}`).value = '⚠️ ПРЕДУПРЕЖДЕНИЯ';
      sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11, color: { argb: 'FFFF0000' } } };
      row++;
      for (const alert of analytics.alerts) {
        const icon = alert.severity === 'critical' ? '❌' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
        sheet.getCell(`A${row}`).value = `${icon} ${alert.message}`;
        row++;
      }
    }

    this.autoFitColumns(sheet);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private addHeaderRow(sheet: ExcelJS.Worksheet, rowNum: number, headers: string[]): void {
    headers.forEach((header, i) => {
      const cell = sheet.getCell(rowNum, i + 1);
      cell.value = header;
      cell.style = STYLES.HEADER as Partial<ExcelJS.Style>;
    });
    sheet.getRow(rowNum).height = 20;
  }

  private autoFitColumns(sheet: ExcelJS.Worksheet): void {
    sheet.columns.forEach(column => {
      if (!column.values) return;

      let maxLength = 10;
      column.values.forEach(value => {
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

  private formatDate(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private getStructureName(structure: ReportStructure): string {
    switch (structure) {
      case ReportStructure.A:
        return 'A: По типам платежей';
      case ReportStructure.B:
        return 'B: Финансовая аналитика';
      case ReportStructure.FULL:
        return 'A+B: Полная';
      default:
        return structure;
    }
  }

  private getPaymentTypeName(type: string): string {
    const names: Record<string, string> = {
      CASH: 'Наличные',
      QR: 'QR',
      VIP: 'VIP',
      CREDIT: 'Кредит',
      TEST: 'Тест',
    };
    return names[type] || type;
  }
}
