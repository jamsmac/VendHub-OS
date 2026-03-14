/**
 * Excel Structure B Sheet Builder
 * Builds all Structure B (financial analytics) sheets for VendHub Excel export
 */

import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import {
  VendHubReportStructureB,
  VendHubFullReportDto,
  STRUCTURE_B_SHEETS,
  VENDHUB_INGREDIENTS,
} from "../dto/vendhub-report.dto";
import {
  STYLES,
  addHeaderRow,
  autoFitColumns,
  formatDate,
} from "./excel-shared";

@Injectable()
export class ExcelStructureBBuilder {
  /**
   * Export all Structure B sheets into the workbook
   */
  exportStructureB(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureB,
    metadata: VendHubFullReportDto["metadata"],
  ): void {
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
    summary: VendHubReportStructureB["summary"],
    _metadata: VendHubFullReportDto["metadata"],
  ): void {
    const sheet = workbook.addWorksheet("B_" + STRUCTURE_B_SHEETS.SUMMARY);

    // Title
    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value = "СВОДКА VENDHUB";
    sheet.getCell("A1").style = STYLES.TITLE as Partial<ExcelJS.Style>;

    // Period
    sheet.getCell("A3").value =
      `Период: ${formatDate(summary.period.from)} — ${formatDate(summary.period.to)}`;
    sheet.getCell("A4").value = `Количество дней: ${summary.period.dayCount}`;

    // Orders section
    let row = 6;
    sheet.getCell(`A${row}`).value = "ЗАКАЗЫ";
    sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11 } };
    row++;
    sheet.getCell(`A${row}`).value = "Всего заказов:";
    sheet.getCell(`B${row}`).value = summary.orders.total;
    row++;
    sheet.getCell(`A${row}`).value = "Успешных доставок:";
    sheet.getCell(`B${row}`).value = summary.orders.successful;
    row++;
    sheet.getCell(`A${row}`).value = "Сбоев доставки:";
    sheet.getCell(`B${row}`).value = summary.orders.failed;
    row++;
    sheet.getCell(`A${row}`).value = "Процент успеха:";
    sheet.getCell(`B${row}`).value = summary.orders.successRate / 100;
    sheet.getCell(`B${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;

    // Finance section
    row += 2;
    sheet.getCell(`A${row}`).value = "ФИНАНСЫ";
    sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11 } };
    row++;
    sheet.getCell(`A${row}`).value = "Общая выручка:";
    sheet.getCell(`B${row}`).value = summary.finance.totalRevenue;
    sheet.getCell(`B${row}`).style = STYLES.CURRENCY as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = "Себестоимость (кофейные):";
    sheet.getCell(`B${row}`).value = summary.finance.costOfGoods;
    sheet.getCell(`B${row}`).style = STYLES.CURRENCY as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = "Валовая прибыль:";
    sheet.getCell(`B${row}`).value = summary.finance.grossProfit;
    sheet.getCell(`B${row}`).style = STYLES.CURRENCY as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = "Маржа %:";
    sheet.getCell(`B${row}`).value = summary.finance.marginPercent / 100;
    sheet.getCell(`B${row}`).style = STYLES.PERCENT as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = "Средний чек:";
    sheet.getCell(`B${row}`).value = summary.finance.averageCheck;
    sheet.getCell(`B${row}`).style = STYLES.CURRENCY as Partial<ExcelJS.Style>;
    row++;
    sheet.getCell(`A${row}`).value = "Заказов в день (ср.):";
    sheet.getCell(`B${row}`).value = summary.finance.ordersPerDay;

    // By payment type
    row += 2;
    sheet.getCell(`A${row}`).value = "ПО ТИПУ ОПЛАТЫ";
    sheet.getCell(`A${row}`).style = { font: { bold: true, size: 11 } };
    row++;

    for (const pt of summary.byPaymentType) {
      sheet.getCell(`A${row}`).value = `${pt.type}:`;
      sheet.getCell(`B${row}`).value =
        `${pt.orderCount} заказов, ${pt.totalAmount} сум`;
      row++;
    }

    autoFitColumns(sheet);
  }

  private createMonthlyFinancialSheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureB["byMonths"],
  ): void {
    const sheet = workbook.addWorksheet("B_" + STRUCTURE_B_SHEETS.BY_MONTHS);

    // Warning: FINANCIAL indicators
    sheet.getCell("A1").value =
      "\u26A0\uFE0F ФИНАНСОВЫЕ показатели (не по типам платежей!)";
    sheet.getCell("A1").style = {
      font: { italic: true, color: { argb: "FFFF6600" } },
    };

    const headers = [
      "Месяц",
      "Дней",
      "Заказов",
      "Успешных",
      "Сбоев",
      "Выручка",
      "Себестоимость",
      "Прибыль",
      "Маржа %",
      "Ср. чек",
      "Заказов/день",
    ];
    addHeaderRow(sheet, 3, headers);

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

    autoFitColumns(sheet);
  }

  private createDailyFinancialSheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureB["byDays"],
  ): void {
    const sheet = workbook.addWorksheet("B_" + STRUCTURE_B_SHEETS.BY_DAYS);

    // Warning: by DATES
    sheet.getCell("A1").value = "\u26A0\uFE0F По ДАТАМ (много строк)!";
    sheet.getCell("A1").style = {
      font: { italic: true, color: { argb: "FFFF6600" } },
    };

    const headers = [
      "Дата",
      "День недели",
      "Заказов",
      "Успешных",
      "Сбоев",
      "Выручка",
      "Себестоимость",
      "Прибыль",
      "Маржа %",
      "Ср. чек",
    ];
    addHeaderRow(sheet, 3, headers);

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

    autoFitColumns(sheet);
  }

  private createMachineFinancialSheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureB["byMachines"],
  ): void {
    const sheet = workbook.addWorksheet("B_" + STRUCTURE_B_SHEETS.BY_MACHINES);

    const headers = [
      "Машинный код",
      "Адрес",
      "Заказов",
      "Успешных",
      "Сбоев",
      "Выручка",
      "Себестоимость",
      "Прибыль",
      "Маржа %",
      "Доля %",
    ];
    addHeaderRow(sheet, 1, headers);

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

    autoFitColumns(sheet);
  }

  private createProductFinancialSheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureB["byProducts"],
  ): void {
    const sheet = workbook.addWorksheet("B_" + STRUCTURE_B_SHEETS.BY_PRODUCTS);

    // Note: has Category and Cost/unit
    sheet.getCell("A1").value =
      "\u26A0\uFE0F ЕСТЬ Категория и Себестоимость/ед.!";
    sheet.getCell("A1").style = {
      font: { italic: true, color: { argb: "FF008000" } },
    };

    const headers = [
      "Продукт",
      "Категория",
      "Кол-во",
      "Выручка",
      "Себестоимость/ед.",
      "Себестоимость",
      "Прибыль",
      "Маржа %",
      "Доля %",
    ];
    addHeaderRow(sheet, 3, headers);

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

    autoFitColumns(sheet);
  }

  private createIngredientSheets(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureB["ingredients"],
  ): void {
    // Summary
    const summarySheet = workbook.addWorksheet(
      "B_" + STRUCTURE_B_SHEETS.INGREDIENTS_SUMMARY,
    );
    const summaryHeaders = [
      "Ингредиент",
      "Ед. изм.",
      "Цена/ед.",
      "Расход",
      "Упаковок",
      "Стоимость",
    ];
    addHeaderRow(summarySheet, 1, summaryHeaders);

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
    autoFitColumns(summarySheet);

    // By months
    const monthlySheet = workbook.addWorksheet(
      "B_" + STRUCTURE_B_SHEETS.INGREDIENTS_MONTHS,
    );
    const ingredientNames = Object.values(VENDHUB_INGREDIENTS).map(
      (i) => i.name,
    );
    const monthlyHeaders = ["Месяц", ...ingredientNames];
    addHeaderRow(monthlySheet, 1, monthlyHeaders);

    row = 2;
    for (const month of data.byMonths) {
      monthlySheet.getCell(`A${row}`).value = month.month;
      Object.entries(VENDHUB_INGREDIENTS).forEach(([code, _info], i) => {
        monthlySheet.getCell(row, i + 2).value = month.ingredients[code] || 0;
      });
      row++;
    }
    autoFitColumns(monthlySheet);

    // By machines
    const machineSheet = workbook.addWorksheet(
      "B_" + STRUCTURE_B_SHEETS.INGREDIENTS_MACHINES,
    );
    const machineHeaders = [
      "Автомат",
      "Адрес",
      ...ingredientNames,
      "Стоимость",
    ];
    addHeaderRow(machineSheet, 1, machineHeaders);

    row = 2;
    for (const machine of data.byMachines) {
      machineSheet.getCell(`A${row}`).value = machine.machineCode;
      machineSheet.getCell(`B${row}`).value = machine.address;
      Object.entries(VENDHUB_INGREDIENTS).forEach(([code, _info], i) => {
        machineSheet.getCell(row, i + 3).value = machine.ingredients[code] || 0;
      });
      machineSheet.getCell(row, ingredientNames.length + 3).value =
        machine.totalCost;
      row++;
    }
    autoFitColumns(machineSheet);
  }

  private createFailuresSheet(
    workbook: ExcelJS.Workbook,
    data: VendHubReportStructureB["deliveryFailures"],
  ): void {
    const sheet = workbook.addWorksheet("B_" + STRUCTURE_B_SHEETS.FAILURES);

    const headers = [
      "Дата",
      "Время",
      "Автомат",
      "Адрес",
      "Продукт",
      "Вкус",
      "Цена",
      "Тип оплаты",
      "Статус",
    ];
    addHeaderRow(sheet, 1, headers);

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

    autoFitColumns(sheet);
  }
}
