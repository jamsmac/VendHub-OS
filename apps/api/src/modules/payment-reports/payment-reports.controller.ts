/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  Req,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { Request } from "express";
import {
  PaymentReportsService,
  ReconcileDto,
} from "./services/payment-reports.service";
import {
  ReportType,
  UploadStatus,
} from "./entities/payment-report-upload.entity";

@ApiTags("payment-reports")
@Controller("payment-reports")
export class PaymentReportsController {
  constructor(private readonly service: PaymentReportsService) {}

  // ─────────────────────────────────────────────
  // UPLOAD
  // ─────────────────────────────────────────────

  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Загрузить отчёт платёжной системы (Payme/Click/VendHub/Касса)",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      return { error: "Файл не передан" };
    }

    const uploadedBy =
      (req as any).user?.name ?? (req as any).user?.id ?? "anonymous";

    return this.service.upload({
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedBy,
    });
  }

  // ─────────────────────────────────────────────
  // HISTORY / LIST
  // ─────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: "Список загруженных отчётов с пагинацией" })
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("reportType") reportType?: ReportType,
    @Query("status") status?: UploadStatus,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.service.findUploads({
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
      reportType,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get("stats")
  @ApiOperation({ summary: "Статистика по загруженным отчётам" })
  async getStats() {
    return this.service.getStats();
  }

  @Get(":id")
  @ApiOperation({ summary: "Получить метаданные конкретной загрузки" })
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findUploadById(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Удалить загрузку и все её строки" })
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.service.deleteUpload(id);
  }

  // ─────────────────────────────────────────────
  // ROWS (данные отчёта)
  // ─────────────────────────────────────────────

  @Get(":id/rows")
  @ApiOperation({
    summary: "Строки данных конкретного отчёта (с пагинацией и фильтрами)",
  })
  async getRows(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortDir") sortDir?: "ASC" | "DESC",
    @Query("paymentMethod") paymentMethod?: string,
    @Query("paymentStatus") paymentStatus?: string,
  ) {
    return this.service.findRows({
      uploadId: id,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 500) : 100,
      search,
      sortBy,
      sortDir,
      paymentMethod,
      paymentStatus,
    });
  }

  @Get(":id/filters")
  @ApiOperation({ summary: "Доступные значения фильтров для отчёта" })
  async getFilters(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.getRowFilters(id);
  }

  // ─────────────────────────────────────────────
  // RECONCILIATION
  // ─────────────────────────────────────────────

  @Post("reconcile")
  @ApiOperation({ summary: "Сверка двух отчётов — найти расхождения" })
  async reconcile(@Body() dto: ReconcileDto) {
    return this.service.reconcile(dto);
  }
}

// ─────────────────────────────────────────────
// ANALYTICS (добавляем в конец контроллера)
// ─────────────────────────────────────────────
// NOTE: analytics endpoints добавлены ниже через отдельный контроллер

// append watcher trigger endpoint at end of file — handled in controller class above
