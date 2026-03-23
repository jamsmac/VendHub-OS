/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  Request,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Response } from "express";
import * as ExcelJS from "exceljs";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { PaymentReportAnalyticsService } from "./services/payment-report-analytics.service";
import { PaymentReportsService } from "./services/payment-reports.service";
import { PaymentReportFolderWatcherService } from "./services/payment-report-folder-watcher.service";
import { ReportType } from "./entities/payment-report-upload.entity";

@ApiTags("payment-reports-analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("payment-reports/analytics")
export class PaymentReportAnalyticsController {
  constructor(
    private readonly analytics: PaymentReportAnalyticsService,
    private readonly reportsService: PaymentReportsService,
    private readonly folderWatcher: PaymentReportFolderWatcherService,
  ) {}

  private getOrgId(req: any): string {
    return req.user.organizationId;
  }

  @Get("revenue-dynamics")
  @Roles("owner", "admin", "accountant", "manager")
  @ApiOperation({
    summary: "Динамика оборота по типам отчётов (для линейного графика)",
  })
  async revenueDynamics(
    @Request() req: any,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("groupBy") groupBy?: "day" | "week" | "month",
    @Query("types") types?: string,
  ) {
    return this.analytics.getRevenueDynamics({
      organizationId: this.getOrgId(req),
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      groupBy: groupBy ?? "day",
      reportTypes: types ? (types.split(",") as ReportType[]) : undefined,
    });
  }

  @Get("top-machines")
  @Roles("owner", "admin", "accountant", "manager")
  @ApiOperation({ summary: "ТОП машин по обороту (для барного графика)" })
  async topMachines(
    @Request() req: any,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("limit") limit?: string,
    @Query("types") types?: string,
  ) {
    return this.analytics.getTopMachines({
      organizationId: this.getOrgId(req),
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: limit ? Number(limit) : 20,
      reportTypes: types ? (types.split(",") as ReportType[]) : undefined,
    });
  }

  @Get("payment-methods")
  @Roles("owner", "admin", "accountant", "manager")
  @ApiOperation({ summary: "Разбивка по методам оплаты (для pie chart)" })
  async paymentMethods(
    @Request() req: any,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("types") types?: string,
  ) {
    return this.analytics.getPaymentMethodBreakdown({
      organizationId: this.getOrgId(req),
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      reportTypes: types ? (types.split(",") as ReportType[]) : undefined,
    });
  }

  @Get("provider-comparison")
  @Roles("owner", "admin", "accountant", "manager")
  @ApiOperation({
    summary: "Сравнение провайдеров (Payme / Click / VendHub / Касса)",
  })
  async providerComparison(
    @Request() req: any,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.analytics.getProviderComparison({
      organizationId: this.getOrgId(req),
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get("heatmap")
  @Roles("owner", "admin", "accountant", "manager")
  @ApiOperation({ summary: "Тепловая карта активности: день × час" })
  async heatmap(
    @Request() req: any,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("types") types?: string,
  ) {
    return this.analytics.getHeatmap({
      organizationId: this.getOrgId(req),
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      reportTypes: types ? (types.split(",") as ReportType[]) : undefined,
    });
  }

  // ─────────────────────────────────────────────
  // FOLDER WATCHER — ручной запуск сканирования
  // ─────────────────────────────────────────────

  @Post("trigger-scan")
  @Roles("owner", "admin")
  @ApiOperation({ summary: "Ручной запуск сканирования папки авто-импорта" })
  async triggerScan() {
    return this.folderWatcher.triggerScan();
  }

  // ─────────────────────────────────────────────
  // EXPORT TO EXCEL (расширенная сверка)
  // ─────────────────────────────────────────────

  @Post("export-reconcile")
  @Roles("owner", "admin", "accountant")
  @ApiOperation({ summary: "Сверка двух отчётов — экспорт в Excel" })
  async exportReconcile(
    @Body() dto: { uploadIdA: string; uploadIdB: string },
    @Request() req: any,
    @Res() res: Response,
  ) {
    const organizationId = this.getOrgId(req);
    const result = await this.reportsService.reconcile({
      ...dto,
      organizationId,
    });

    const wb = new ExcelJS.Workbook();

    // Лист 1: Сводка
    const ws1 = wb.addWorksheet("Сводка");
    ws1.columns = [{ width: 30 }, { width: 40 }];
    ws1.addRows([
      ["Параметр", "Значение"],
      ["Отчёт A", result.uploadA.fileName],
      ["Тип A", result.uploadA.type],
      ["Отчёт Б", result.uploadB.fileName],
      ["Тип Б", result.uploadB.type],
      [],
      ["Всего строк A", result.summary.totalA],
      ["Всего строк Б", result.summary.totalB],
      ["Совпадений", result.summary.matched],
      ["Расхождений по сумме", result.summary.mismatched],
      ["Только в A", result.summary.onlyInA],
      ["Только в Б", result.summary.onlyInB],
    ]);

    // Лист 2: Расхождения по сумме
    if (result.mismatched.length > 0) {
      const ws2 = wb.addWorksheet("Расхождения");
      ws2.columns = [
        { width: 45 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 12 },
      ];
      ws2.addRow(["№ Заказа", "Сумма A", "Сумма Б", "Разница", "Разница %"]);
      for (const m of result.mismatched) {
        ws2.addRow([
          m.orderNumber,
          m.amountA,
          m.amountB,
          m.diff,
          m.amountA > 0 ? ((m.diff / m.amountA) * 100).toFixed(2) + "%" : "—",
        ]);
      }
    }

    // Helper for "only in" sheets
    const addOnlySheet = (name: string, rows: typeof result.onlyInA) => {
      if (rows.length === 0) return;
      const ws = wb.addWorksheet(name);
      ws.columns = [
        { width: 45 },
        { width: 20 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
      ];
      ws.addRow([
        "№ Заказа",
        "Время оплаты",
        "Сумма",
        "Статус",
        "Метод",
        "Машина",
      ]);
      for (const r of rows) {
        ws.addRow([
          r.orderNumber ?? "",
          r.paymentTime ?? "",
          r.amount ?? "",
          r.paymentStatus ?? "",
          r.paymentMethod ?? "",
          r.machineCode ?? "",
        ]);
      }
    };

    addOnlySheet(
      `Только в ${result.uploadA.type.slice(0, 10)}`,
      result.onlyInA,
    );
    addOnlySheet(
      `Только в ${result.uploadB.type.slice(0, 10)}`,
      result.onlyInB,
    );

    const buf = Buffer.from(await wb.xlsx.writeBuffer());
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
  @Roles("owner", "admin", "accountant", "manager")
  @ApiOperation({ summary: "Экспорт строк отчёта в Excel" })
  async exportRows(
    @Query("uploadId") uploadId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const organizationId = this.getOrgId(req);
    const upload = await this.reportsService.findUploadById(
      uploadId,
      organizationId,
    );
    const { data } = await this.reportsService.findRows({
      organizationId,
      uploadId,
      limit: 100000,
      page: 1,
    });

    if (data.length === 0) {
      res.status(HttpStatus.NO_CONTENT).send();
      return;
    }

    // Заголовки из первой строки rawData
    const rawKeys = Object.keys(data[0]!.rawData ?? {});
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

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(upload.reportType);
    ws.addRow(headers);
    for (let i = 0; i < data.length; i++) {
      const r = data[i]!;
      ws.addRow([
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
    }

    const buf = Buffer.from(await wb.xlsx.writeBuffer());
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
