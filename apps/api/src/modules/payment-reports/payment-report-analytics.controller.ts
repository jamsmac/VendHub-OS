import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Response } from "express";
import * as xlsx from "xlsx";
import { PaymentReportAnalyticsService } from "./services/payment-report-analytics.service";
import { PaymentReportsService } from "./services/payment-reports.service";
import { PaymentReportFolderWatcherService } from "./services/payment-report-folder-watcher.service";
import { ReportType } from "./entities/payment-report-upload.entity";

@ApiTags("payment-reports-analytics")
@Controller("payment-reports/analytics")
export class PaymentReportAnalyticsController {
  constructor(
    private readonly analytics: PaymentReportAnalyticsService,
    private readonly reportsService: PaymentReportsService,
    private readonly folderWatcher: PaymentReportFolderWatcherService,
  ) {}

  @Get("revenue-dynamics")
  @ApiOperation({
    summary: "Динамика оборота по типам отчётов (для линейного графика)",
  })
  async revenueDynamics(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("groupBy") groupBy?: "day" | "week" | "month",
    @Query("types") types?: string,
  ) {
    return this.analytics.getRevenueDynamics({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      groupBy: groupBy ?? "day",
      reportTypes: types ? (types.split(",") as ReportType[]) : undefined,
    });
  }

  @Get("top-machines")
  @ApiOperation({ summary: "ТОП машин по обороту (для барного графика)" })
  async topMachines(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("limit") limit?: string,
    @Query("types") types?: string,
  ) {
    return this.analytics.getTopMachines({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: limit ? Number(limit) : 20,
      reportTypes: types ? (types.split(",") as ReportType[]) : undefined,
    });
  }

  @Get("payment-methods")
  @ApiOperation({ summary: "Разбивка по методам оплаты (для pie chart)" })
  async paymentMethods(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("types") types?: string,
  ) {
    return this.analytics.getPaymentMethodBreakdown({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      reportTypes: types ? (types.split(",") as ReportType[]) : undefined,
    });
  }

  @Get("provider-comparison")
  @ApiOperation({
    summary: "Сравнение провайдеров (Payme / Click / VendHub / Касса)",
  })
  async providerComparison(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.analytics.getProviderComparison({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get("heatmap")
  @ApiOperation({ summary: "Тепловая карта активности: день × час" })
  async heatmap(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("types") types?: string,
  ) {
    return this.analytics.getHeatmap({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      reportTypes: types ? (types.split(",") as ReportType[]) : undefined,
    });
  }

  // ─────────────────────────────────────────────
  // FOLDER WATCHER — ручной запуск сканирования
  // ─────────────────────────────────────────────

  @Post("trigger-scan")
  @ApiOperation({ summary: "Ручной запуск сканирования папки авто-импорта" })
  async triggerScan() {
    return this.folderWatcher.triggerScan();
  }

  // ─────────────────────────────────────────────
  // EXPORT TO EXCEL (расширенная сверка)
  // ─────────────────────────────────────────────

  @Post("export-reconcile")
  @ApiOperation({ summary: "Сверка двух отчётов — экспорт в Excel" })
  async exportReconcile(
    @Body() dto: { uploadIdA: string; uploadIdB: string },
    @Res() res: Response,
  ) {
    const result = await this.reportsService.reconcile(dto);

    const wb = xlsx.utils.book_new();

    // Лист 1: Сводка
    const summaryData = [
      ["Параметр", "Значение"],
      ["Отчёт A", result.uploadA.fileName],
      ["Тип A", result.uploadA.type],
      ["Отчёт Б", result.uploadB.fileName],
      ["Тип Б", result.uploadB.type],
      [""],
      ["Всего строк A", result.summary.totalA],
      ["Всего строк Б", result.summary.totalB],
      ["Совпадений", result.summary.matched],
      ["Расхождений по сумме", result.summary.mismatched],
      ["Только в A", result.summary.onlyInA],
      ["Только в Б", result.summary.onlyInB],
    ];
    const ws1 = xlsx.utils.aoa_to_sheet(summaryData);
    ws1["!cols"] = [{ wch: 30 }, { wch: 40 }];
    xlsx.utils.book_append_sheet(wb, ws1, "Сводка");

    // Лист 2: Расхождения по сумме
    if (result.mismatched.length > 0) {
      const mismatchData = [
        ["№ Заказа", "Сумма A", "Сумма Б", "Разница", "Разница %"],
        ...result.mismatched.map((m) => [
          m.orderNumber,
          m.amountA,
          m.amountB,
          m.diff,
          m.amountA > 0 ? ((m.diff / m.amountA) * 100).toFixed(2) + "%" : "—",
        ]),
      ];
      const ws2 = xlsx.utils.aoa_to_sheet(mismatchData);
      ws2["!cols"] = [
        { wch: 45 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
      ];
      xlsx.utils.book_append_sheet(wb, ws2, "Расхождения");
    }

    // Лист 3: Только в A
    if (result.onlyInA.length > 0) {
      const onlyAData = [
        ["№ Заказа", "Время оплаты", "Сумма", "Статус", "Метод", "Машина"],
        ...result.onlyInA.map((r) => [
          r.orderNumber ?? "",
          r.paymentTime ?? "",
          r.amount ?? "",
          r.paymentStatus ?? "",
          r.paymentMethod ?? "",
          r.machineCode ?? "",
        ]),
      ];
      const ws3 = xlsx.utils.aoa_to_sheet(onlyAData);
      ws3["!cols"] = [
        { wch: 45 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];
      xlsx.utils.book_append_sheet(
        wb,
        ws3,
        `Только в ${result.uploadA.type.slice(0, 10)}`,
      );
    }

    // Лист 4: Только в Б
    if (result.onlyInB.length > 0) {
      const onlyBData = [
        ["№ Заказа", "Время оплаты", "Сумма", "Статус", "Метод", "Машина"],
        ...result.onlyInB.map((r) => [
          r.orderNumber ?? "",
          r.paymentTime ?? "",
          r.amount ?? "",
          r.paymentStatus ?? "",
          r.paymentMethod ?? "",
          r.machineCode ?? "",
        ]),
      ];
      const ws4 = xlsx.utils.aoa_to_sheet(onlyBData);
      ws4["!cols"] = [
        { wch: 45 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];
      xlsx.utils.book_append_sheet(
        wb,
        ws4,
        `Только в ${result.uploadB.type.slice(0, 10)}`,
      );
    }

    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `reconcile_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res
      .status(HttpStatus.OK)
      .setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      )
      .setHeader("Content-Disposition", `attachment; filename="${filename}"`)
      .send(buf);
  }

  @Get("export-rows")
  @ApiOperation({ summary: "Экспорт строк отчёта в Excel" })
  async exportRows(@Query("uploadId") uploadId: string, @Res() res: Response) {
    const upload = await this.reportsService.findUploadById(uploadId);
    const { data } = await this.reportsService.findRows({
      uploadId,
      limit: 100000,
      page: 1,
    });

    if (data.length === 0) {
      res.status(HttpStatus.NO_CONTENT).send();
      return;
    }

    // Заголовки из первой строки rawData
    const rawKeys = Object.keys(data[0].rawData ?? {});
    const headers = [
      "№",
      "Время оплаты",
      "Сумма",
      "Статус",
      "Метод",
      "Машина",
      "Локация",
      "№ Заказа",
      ...rawKeys,
    ];

    const rows = data.map((r, i) => [
      i + 1,
      r.paymentTime ?? "",
      r.amount ?? "",
      r.paymentStatus ?? "",
      r.paymentMethod ?? "",
      r.machineCode ?? "",
      r.location ?? "",
      r.orderNumber ?? "",
      ...rawKeys.map((k) => r.rawData?.[k] ?? ""),
    ]);

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    xlsx.utils.book_append_sheet(wb, ws, upload.reportType);

    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `${upload.reportType}_${upload.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}_export.xlsx`;

    res
      .status(HttpStatus.OK)
      .setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      )
      .setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(filename)}"`,
      )
      .send(buf);
  }
}
