/**
 * Excel Structure A Sheet Builder
 * Builds all Structure A (payment-type breakdown) sheets for VendHub Excel export
 */

import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import {
  VendHubReportStructureA,
  VendHubFullReportDto,
  STRUCTURE_A_SHEETS,
} from "../dto/vendhub-report.dto";
import {
  STYLES,
  addHeaderRow,
  autoFitColumns,
  formatDate,
  getPaymentTypeName,
} from "./excel-shared";

@Injectable()
export class ExcelStructureABuilder {
  /**
   * Export all Structure A sheets into the workbook
   */
  exportStructureA(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA,
    metadata: VendHubFullReportDto["metadata"],
  ): void {
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
    this.createPaymentTypeDetailSheets(workbook, data.cashSummary, "Наличные");

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
    summary: VendHubReportStructureA["summary"],
    _metadata: VendHubFullReportDto["metadata"],
  ): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.SUMMARY);

    // Title
    sheet.mergeCells("A1:G1");
    sheet.getCell("A1").value = "СВОДКА ПО ТИПАМ ПЛАТЕЖЕЙ";
    sheet.getCell("A1").style = STYLES.TITLE as Partial<ExcelJS.Style>;
    sheet.getRow(1).height = 25;

    // Period
    sheet.getCell("A3").value =
      `Период: ${formatDate(summary.period.from)} — ${formatDate(summary.period.to)}`;

    // Payment types table
    const headers = [
      "Тип платежа",
      "Заказов",
      "Сумма (сум)",
      "% кол-во",
      "% сумма",
      "Ср. чек",
    ];
    let row = 5;

    addHeaderRow(sheet, row, headers);
    row++;

    const icons: Record<string, string> = {
      CASH: "\u{1F4B5}",
      QR: "\u{1F4F1}",
      VIP: "\u2B50",
      CREDIT: "\u{1F4B3}",
    };

    for (const pt of summary.byPaymentType) {
      const icon = icons[pt.paymentType] || "";
      sheet.getCell(`A${row}`).value =
        `${icon} ${getPaymentTypeName(pt.paymentType)}`;
      sheet.getCell(`B${row}`).value = pt.orderCount;
      sheet.getCell(`C${row}`).value = pt.totalAmount;
      sheet.getCell(`C${row}`).style =
        STYLES.CURRENCY as Partial<ExcelJS.Style>;
      sheet.getCell(`D${row}`).value = pt.percentByCount / 100;
      sheet.getCell(`D${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
      sheet.getCell(`E${row}`).value = pt.percentByAmount / 100;
      sheet.getCell(`E${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
      sheet.getCell(`F${row}`).value = pt.averageCheck;
      sheet.getCell(`F${row}`).style =
        STYLES.CURRENCY as Partial<ExcelJS.Style>;
      row++;
    }

    // Total row
    sheet.getCell(`A${row}`).value = "ИТОГО (платные)";
    sheet.getCell(`B${row}`).value = summary.totalPaid.orderCount;
    sheet.getCell(`C${row}`).value = summary.totalPaid.totalAmount;
    sheet.getCell(`D${row}`).value = 1;
    sheet.getCell(`E${row}`).value = 1;
    sheet.getCell(`F${row}`).value = summary.totalPaid.averageCheck;
    for (let col = 1; col <= 6; col++) {
      sheet.getCell(row, col).style =
        STYLES.TOTAL_ROW as Partial<ExcelJS.Style>;
    }
    row++;

    // Test orders
    row += 2;
    sheet.getCell(`A${row}`).value =
      `\u{1F9EA} Тестовые заказы: ${summary.testOrderCount}`;

    // QR Details
    row += 2;
    sheet.getCell(`A${row}`).value = "ДЕТАЛИЗАЦИЯ QR-ПЛАТЕЖЕЙ";
    sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11 } };
    row++;

    const qrHeaders = [
      "Система",
      "Платежей",
      "Сумма (сум)",
      "% от QR",
      "Ср. платёж",
    ];
    addHeaderRow(sheet, row, qrHeaders);
    row++;

    for (const qr of summary.qrDetails) {
      sheet.getCell(`A${row}`).value = qr.system;
      sheet.getCell(`B${row}`).value = qr.paymentCount;
      sheet.getCell(`C${row}`).value = qr.totalAmount;
      sheet.getCell(`D${row}`).value = qr.percentOfQR / 100;
      sheet.getCell(`E${row}`).value = qr.averagePayment;
      row++;
    }

    autoFitColumns(sheet);
  }

  private createMonthlyPaymentTypesSheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA["byMonths"],
  ): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.BY_MONTHS);

    const headers = [
      "Месяц",
      "Наличные кол",
      "Наличные сум",
      "QR кол",
      "QR сум",
      "VIP кол",
      "VIP сум",
      "Кредит кол",
      "Кредит сум",
      "ИТОГО кол",
      "ИТОГО сум",
    ];

    addHeaderRow(sheet, 1, headers);

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
      [3, 5, 7, 9, 11].forEach((col) => {
        sheet.getCell(row, col).style =
          STYLES.CURRENCY as Partial<ExcelJS.Style>;
      });

      row++;
    }

    autoFitColumns(sheet);
  }

  private createWeekdaySheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA["byWeekdays"],
  ): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.BY_DAYS);

    // Warning: by DAYS OF WEEK (7 rows), not by dates
    sheet.getCell("A1").value = "\u26A0\uFE0F По ДНЯМ НЕДЕЛИ (не по датам)";
    sheet.getCell("A1").style = {
      font: { italic: true, color: { argb: "FFFF6600" } },
    };

    const headers = [
      "День недели",
      "Наличные кол",
      "Наличные сум",
      "QR кол",
      "QR сум",
      "VIP кол",
      "VIP сум",
      "ИТОГО кол",
      "ИТОГО сум",
    ];
    addHeaderRow(sheet, 3, headers);

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

    autoFitColumns(sheet);
  }

  private createMachinePaymentTypesSheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA["byMachines"],
  ): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.BY_MACHINES);

    const headers = [
      "#",
      "Код",
      "Адрес",
      "Наличные кол",
      "Наличные сум",
      "QR кол",
      "QR сум",
      "VIP кол",
      "VIP сум",
      "Кредит кол",
      "Кредит сум",
      "ИТОГО кол",
      "ИТОГО сум",
      "% выручки",
    ];

    addHeaderRow(sheet, 1, headers);

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

    autoFitColumns(sheet);
  }

  private createProductPaymentTypesSheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA["byProducts"],
  ): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.BY_PRODUCTS);

    const headers = [
      "#",
      "Продукт",
      "Налич.кол",
      "Налич.сум",
      "QR кол",
      "QR сум",
      "VIP кол",
      "VIP сум",
      "Всего кол",
      "Всего сум",
    ];
    addHeaderRow(sheet, 1, headers);

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

    autoFitColumns(sheet);
  }

  private createPaymentTypeDetailSheets(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA["cashSummary"],
    prefix: string,
  ): void {
    // Summary sheet
    const summarySheet = workbook.addWorksheet(prefix);
    summarySheet.getCell("A1").value = `Сводка по типу "${prefix}"`;

    // Monthly sheet
    const monthlySheet = workbook.addWorksheet(`${prefix}_месяцы`);
    const monthHeaders = ["Месяц", "Заказов", "Сумма", "Ср.чек", "Доля"];
    addHeaderRow(monthlySheet, 1, monthHeaders);

    let row = 2;
    for (const month of data.months || []) {
      monthlySheet.getCell(`A${row}`).value = month.monthName;
      monthlySheet.getCell(`B${row}`).value = month.total.count;
      monthlySheet.getCell(`C${row}`).value = month.total.amount;
      monthlySheet.getCell(`D${row}`).value =
        month.total.count > 0
          ? Math.round(month.total.amount / month.total.count)
          : 0;
      row++;
    }

    autoFitColumns(monthlySheet);
  }

  private createQRDetailSheets(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA["qrSummary"],
  ): void {
    // QR Summary
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.QR_SUMMARY);
    sheet.getCell("A1").value = "Сводка QR-платежей";

    // QR Share by machines
    const shareSheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.QR_SHARE);
    const headers = [
      "Автомат",
      "Адрес",
      "Всего заказов",
      "Наличные",
      "QR",
      "Доля QR %",
    ];
    addHeaderRow(shareSheet, 1, headers);

    let row = 2;
    for (const machine of data.qrShare || []) {
      shareSheet.getCell(`A${row}`).value = machine.machineId;
      shareSheet.getCell(`B${row}`).value = machine.address || "";
      shareSheet.getCell(`C${row}`).value = machine.totalOrders;
      shareSheet.getCell(`D${row}`).value = machine.cashOrders;
      shareSheet.getCell(`E${row}`).value = machine.qrOrders;
      shareSheet.getCell(`F${row}`).value = machine.qrSharePercent / 100;
      shareSheet.getCell(`F${row}`).style =
        STYLES.PERCENT as Partial<ExcelJS.Style>;
      row++;
    }

    autoFitColumns(shareSheet);
  }

  private createVIPSheets(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA["vipSummary"],
  ): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.VIP_SUMMARY);
    sheet.getCell("A1").value = "VIP заказы";
    sheet.getCell("A3").value =
      `Всего: ${data.total.orderCount} заказов, ${data.total.totalAmount} сум`;

    // Details
    const detailSheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.VIP_DETAILS);
    const headers = ["Дата", "Автомат", "Продукт", "Сумма", "Статус"];
    addHeaderRow(detailSheet, 1, headers);

    let row = 2;
    for (const detail of data.details || []) {
      detailSheet.getCell(`A${row}`).value = detail.date;
      detailSheet.getCell(`B${row}`).value = detail.machineCode;
      detailSheet.getCell(`C${row}`).value = detail.productName;
      detailSheet.getCell(`D${row}`).value = detail.amount;
      detailSheet.getCell(`E${row}`).value = detail.status;
      row++;
    }

    autoFitColumns(detailSheet);
  }

  private createCreditSheets(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA["creditSummary"],
  ): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.CREDIT_SUMMARY);
    sheet.getCell("A1").value = "Кредитные платежи";
    sheet.getCell("A3").value =
      `Всего: ${data.total.orderCount} заказов, ${data.total.totalAmount} сум`;

    // Details
    const detailSheet = workbook.addWorksheet(
      STRUCTURE_A_SHEETS.CREDIT_DETAILS,
    );
    const headers = ["Дата", "Автомат", "Адрес", "Продукт", "Сумма"];
    addHeaderRow(detailSheet, 1, headers);

    let row = 2;
    for (const detail of data.details || []) {
      detailSheet.getCell(`A${row}`).value = detail.date;
      detailSheet.getCell(`B${row}`).value = detail.machineCode;
      detailSheet.getCell(`C${row}`).value = detail.machineAddress;
      detailSheet.getCell(`D${row}`).value = detail.productName;
      detailSheet.getCell(`E${row}`).value = detail.amount;
      row++;
    }

    autoFitColumns(detailSheet);
  }

  private createQRReconciliationSheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA["qrReconciliation"],
  ): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.QR_RECONCILIATION);

    const headers = [
      "Месяц",
      "Order QR кол",
      "Order QR сум",
      "Payme кол",
      "Payme сум",
      "Click кол",
      "Click сум",
      "Внешние сум",
      "Разница сум",
      "Разница %",
      "Статус",
    ];
    addHeaderRow(sheet, 1, headers);

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
      statusCell.value =
        rec.status === "OK"
          ? "\u2705 OK"
          : rec.status === "WARNING"
            ? "\u26A0\uFE0F Внимание"
            : "\u274C Критично";
      statusCell.style =
        rec.status === "OK"
          ? (STYLES.OK_STATUS as Partial<ExcelJS.Style>)
          : rec.status === "WARNING"
            ? (STYLES.WARNING_STATUS as Partial<ExcelJS.Style>)
            : (STYLES.CRITICAL_STATUS as Partial<ExcelJS.Style>);

      row++;
    }

    autoFitColumns(sheet);
  }

  private createCrossAnalysisSheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA["crossAnalysis"],
  ): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.CROSS_ANALYSIS);

    sheet.getCell("A1").value = "КРОСС-АНАЛИЗ TOP-5 \u00D7 TOP-5";
    sheet.getCell("A1").style = STYLES.TITLE as Partial<ExcelJS.Style>;

    // Matrix headers
    sheet.getCell("A3").value = "Продукт \\ Автомат";
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
    sheet.getCell(`A${hourlyRow}`).value = "ПОЧАСОВОЙ АНАЛИЗ";
    sheet.getCell(`A${hourlyRow}`).style = { font: { bold: true, size: 11 } };

    const hourHeaders = ["Час", "Заказов", "Сумма", "Ср. чек"];
    addHeaderRow(sheet, hourlyRow + 1, hourHeaders);

    let row = hourlyRow + 2;
    for (const hour of data.hourlyAnalysis) {
      sheet.getCell(`A${row}`).value =
        `${String(hour.hour).padStart(2, "0")}:00`;
      sheet.getCell(`B${row}`).value = hour.orderCount;
      sheet.getCell(`C${row}`).value = hour.totalAmount;
      sheet.getCell(`D${row}`).value = hour.averageCheck;
      row++;
    }

    autoFitColumns(sheet);
  }

  private createDailyReportSheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA["dailyReport"],
  ): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.DAILY);

    // Warning: by DATES (many rows)
    sheet.getCell("A1").value = "\u26A0\uFE0F По ДАТАМ (ежедневный отч\u0451т)";
    sheet.getCell("A1").style = {
      font: { italic: true, color: { argb: "FFFF6600" } },
    };

    const headers = [
      "Дата",
      "Наличные кол",
      "Наличные сум",
      "QR кол",
      "QR сум",
      "VIP кол",
      "VIP сум",
      "ИТОГО кол",
      "ИТОГО сум",
    ];
    addHeaderRow(sheet, 3, headers);

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

    autoFitColumns(sheet);
  }

  private createAverageCheckSheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureA["averageCheck"],
  ): void {
    const sheet = workbook.addWorksheet(STRUCTURE_A_SHEETS.AVERAGE_CHECK);

    sheet.getCell("A1").value = "СРЕДНИЙ ЧЕК";
    sheet.getCell("A1").style = STYLES.TITLE as Partial<ExcelJS.Style>;

    // By month
    sheet.getCell("A3").value = "По месяцам";
    const monthHeaders = ["Месяц", "Средний чек"];
    addHeaderRow(sheet, 4, monthHeaders);

    let row = 5;
    for (const month of data.byMonth || []) {
      sheet.getCell(`A${row}`).value = month.month;
      sheet.getCell(`B${row}`).value = month.averageCheck;
      row++;
    }

    // By product
    row += 2;
    sheet.getCell(`A${row}`).value = "По продуктам";
    const prodHeaders = ["Продукт", "Средний чек"];
    addHeaderRow(sheet, row + 1, prodHeaders);

    row += 2;
    for (const product of data.byProduct || []) {
      sheet.getCell(`A${row}`).value = product.product;
      sheet.getCell(`B${row}`).value = product.averageCheck;
      row++;
    }

    autoFitColumns(sheet);
  }
}
