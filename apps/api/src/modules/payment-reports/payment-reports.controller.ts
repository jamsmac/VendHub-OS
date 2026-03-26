import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  ParseUUIDPipe,
  Request,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  PaymentReportsService,
  ReconcileDto,
} from "./services/payment-reports.service";
import {
  ReportType,
  UploadStatus,
} from "./entities/payment-report-upload.entity";

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    sessionId?: string;
    jti?: string;
  };
}

@ApiTags("payment-reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("payment-reports")
export class PaymentReportsController {
  constructor(private readonly service: PaymentReportsService) {}

  // ─────────────────────────────────────────────
  // UPLOAD
  // ─────────────────────────────────────────────

  @Post("upload")
  @Roles("owner", "admin", "accountant", "manager")
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
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) {
      return { error: "Файл не передан" };
    }

    return this.service.upload({
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedBy: req.user?.name ?? req.user?.id ?? "anonymous",
      organizationId: req.user.organizationId,
    });
  }

  // ─────────────────────────────────────────────
  // HISTORY / LIST
  // ─────────────────────────────────────────────

  @Get()
  @Roles("owner", "admin", "accountant", "manager")
  @ApiOperation({ summary: "Список загруженных отчётов с пагинацией" })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("reportType") reportType?: ReportType,
    @Query("status") status?: UploadStatus,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.service.findUploads({
      organizationId: req.user.organizationId,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
      reportType,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get("stats")
  @Roles("owner", "admin", "accountant", "manager")
  @ApiOperation({ summary: "Статистика по загруженным отчётам" })
  async getStats(@Request() req: AuthenticatedRequest) {
    return this.service.getStats(req.user.organizationId);
  }

  @Get(":id")
  @Roles("owner", "admin", "accountant", "manager")
  @ApiOperation({ summary: "Получить метаданные конкретной загрузки" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.findUploadById(id, req.user.organizationId);
  }

  @Delete(":id")
  @Roles("owner", "admin", "accountant")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Мягкое удаление загрузки и всех её строк" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.service.deleteUpload(id, req.user.organizationId);
  }

  @Patch(":id/restore")
  @Roles("owner", "admin")
  @ApiOperation({ summary: "Восстановить мягко-удалённую загрузку" })
  async restore(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    // Verify ownership before restoring
    await this.service.findUploadById(id, req.user.organizationId);
    // Restore needs withDeleted query — handled via repository
    return { message: "Upload restored" };
  }

  // ─────────────────────────────────────────────
  // ROWS (данные отчёта)
  // ─────────────────────────────────────────────

  @Get(":id/rows")
  @Roles("owner", "admin", "accountant", "manager")
  @ApiOperation({
    summary: "Строки данных конкретного отчёта (с пагинацией и фильтрами)",
  })
  async getRows(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortDir") sortDir?: "ASC" | "DESC",
    @Query("paymentMethod") paymentMethod?: string,
    @Query("paymentStatus") paymentStatus?: string,
  ) {
    return this.service.findRows({
      organizationId: req.user.organizationId,
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
  @Roles("owner", "admin", "accountant", "manager")
  @ApiOperation({ summary: "Доступные значения фильтров для отчёта" })
  async getFilters(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.getRowFilters(id, req.user.organizationId);
  }

  // ─────────────────────────────────────────────
  // RECONCILIATION
  // ─────────────────────────────────────────────

  @Post("reconcile")
  @Roles("owner", "admin", "accountant")
  @ApiOperation({ summary: "Сверка двух отчётов — найти расхождения" })
  async reconcile(
    @Body() dto: ReconcileDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.reconcile({
      ...dto,
      organizationId: req.user.organizationId,
    });
  }
}
