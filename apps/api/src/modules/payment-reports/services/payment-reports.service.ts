import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  PaymentReportUpload,
  UploadStatus,
  ReportType,
} from "../entities/payment-report-upload.entity";
import { PaymentReportRow } from "../entities/payment-report-row.entity";
import { PaymentReportParserService } from "./payment-report-parser.service";

export interface UploadReportDto {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: string;
}

export interface QueryReportsDto {
  page?: number;
  limit?: number;
  reportType?: ReportType;
  status?: UploadStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface QueryRowsDto {
  uploadId: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
  paymentMethod?: string;
  paymentStatus?: string;
}

export interface ReconcileDto {
  uploadIdA: string;
  uploadIdB: string;
}

@Injectable()
export class PaymentReportsService {
  private readonly logger = new Logger(PaymentReportsService.name);

  constructor(
    @InjectRepository(PaymentReportUpload)
    private readonly uploadRepo: Repository<PaymentReportUpload>,
    @InjectRepository(PaymentReportRow)
    private readonly rowRepo: Repository<PaymentReportRow>,
    private readonly parser: PaymentReportParserService,
  ) {}

  // ─────────────────────────────────────────────
  // UPLOAD & PARSE
  // ─────────────────────────────────────────────

  async upload(dto: UploadReportDto): Promise<PaymentReportUpload> {
    const ACCEPTED = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv",
      "application/zip",
      "application/x-zip-compressed",
    ];
    const ext = dto.fileName.toLowerCase();
    const isValid =
      ACCEPTED.includes(dto.mimeType) ||
      ext.endsWith(".xlsx") ||
      ext.endsWith(".xls") ||
      ext.endsWith(".csv") ||
      ext.endsWith(".zip");

    if (!isValid) {
      throw new BadRequestException(
        "Неподдерживаемый формат файла. Допустимы: XLSX, XLS, CSV, ZIP",
      );
    }

    // Создаём запись в статусе PENDING
    const upload = this.uploadRepo.create({
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      status: UploadStatus.PENDING,
      uploadedBy: dto.uploadedBy,
    });
    await this.uploadRepo.save(upload);

    try {
      upload.status = UploadStatus.PROCESSING;
      await this.uploadRepo.save(upload);

      const parsed = await this.parser.parse(
        dto.buffer,
        dto.fileName,
        dto.mimeType,
      );

      // Проверяем дубликат по хешу файла
      const existing = await this.uploadRepo.findOne({
        where: { fileHash: parsed.fileHash },
      });
      if (existing) {
        upload.status = UploadStatus.DUPLICATE;
        upload.fileHash = parsed.fileHash;
        upload.errorMessage = `Файл уже был загружен ранее (ID: ${existing.id})`;
        await this.uploadRepo.save(upload);
        throw new ConflictException({
          message: "Файл уже загружен ранее",
          existingUploadId: existing.id,
        });
      }

      // Обновляем запись с результатами парсинга
      upload.fileHash = parsed.fileHash;
      upload.reportType = parsed.detection.type;
      upload.detectionConfidence = parsed.detection.confidence;
      upload.reportMeta = parsed.meta;
      upload.periodFrom = parsed.periodFrom ?? (null as unknown as Date);
      upload.periodTo = parsed.periodTo ?? (null as unknown as Date);
      upload.totalAmount = parsed.totalAmount ?? (null as unknown as number);
      upload.totalRows = parsed.rows.length;
      upload.processedRows = parsed.rows.length;

      // Проверка дублей на уровне строк (по externalId)
      const existingExternalIds = new Set<string>();
      if (parsed.detection.type !== ReportType.UNKNOWN) {
        const existingRows = await this.rowRepo
          .createQueryBuilder("r")
          .select("r.external_id")
          .where("r.report_type = :type", { type: parsed.detection.type })
          .andWhere("r.external_id IS NOT NULL")
          .getRawMany<{ r_external_id: string }>();
        existingRows.forEach((r) => existingExternalIds.add(r.r_external_id));
      }

      // Сохраняем строки батчами по 500
      const BATCH = 500;
      let newCount = 0;
      let dupCount = 0;

      for (let i = 0; i < parsed.rows.length; i += BATCH) {
        const batch = parsed.rows.slice(i, i + BATCH).map((r) => {
          const isDup = !!r.externalId && existingExternalIds.has(r.externalId);
          if (isDup) dupCount++;
          else newCount++;
          return this.rowRepo.create({
            uploadId: upload.id,
            reportType: parsed.detection.type,
            rowIndex: r.rowIndex,
            externalId: r.externalId || undefined,
            orderNumber: r.orderNumber || undefined,
            paymentTime: r.paymentTime || undefined,
            amount: r.amount ?? undefined,
            paymentStatus: r.paymentStatus || undefined,
            paymentMethod: r.paymentMethod || undefined,
            cardNumber: r.cardNumber || undefined,
            clientPhone: r.clientPhone || undefined,
            goodsName: r.goodsName || undefined,
            machineCode: r.machineCode || undefined,
            location: r.location || undefined,
            rawData: r.rawData,
            isDuplicate: isDup,
          } as Record<string, unknown>);
        });
        await this.rowRepo.save(batch, { chunk: BATCH });
      }

      upload.newRows = newCount;
      upload.duplicateRows = dupCount;
      upload.status = UploadStatus.COMPLETED;
      await this.uploadRepo.save(upload);

      this.logger.log(
        `Upload ${upload.id}: type=${upload.reportType}, rows=${upload.totalRows}, new=${newCount}, dup=${dupCount}`,
      );
      return upload;
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      upload.status = UploadStatus.FAILED;
      upload.errorMessage = err instanceof Error ? err.message : String(err);
      await this.uploadRepo.save(upload);
      throw err;
    }
  }

  // ─────────────────────────────────────────────
  // ИСТОРИЯ ЗАГРУЗОК
  // ─────────────────────────────────────────────

  async findUploads(dto: QueryReportsDto) {
    const { page = 1, limit = 20, reportType, status, dateFrom, dateTo } = dto;
    const qb = this.uploadRepo.createQueryBuilder("u");

    if (reportType) qb.andWhere("u.reportType = :reportType", { reportType });
    if (status) qb.andWhere("u.status = :status", { status });
    if (dateFrom) qb.andWhere("u.createdAt >= :dateFrom", { dateFrom });
    if (dateTo) qb.andWhere("u.createdAt <= :dateTo", { dateTo });

    qb.orderBy("u.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findUploadById(id: string): Promise<PaymentReportUpload> {
    const upload = await this.uploadRepo.findOne({ where: { id } });
    if (!upload) throw new BadRequestException(`Upload ${id} not found`);
    return upload;
  }

  async deleteUpload(id: string): Promise<void> {
    await this.uploadRepo.delete(id);
  }

  // ─────────────────────────────────────────────
  // СТРОКИ ОТЧЁТА (с пагинацией, фильтрами, сортировкой)
  // ─────────────────────────────────────────────

  async findRows(dto: QueryRowsDto) {
    const {
      uploadId,
      page = 1,
      limit = 100,
      search,
      sortBy = "rowIndex",
      sortDir = "ASC",
      paymentMethod,
      paymentStatus,
    } = dto;

    const ALLOWED_SORT = [
      "rowIndex",
      "paymentTime",
      "amount",
      "paymentStatus",
      "paymentMethod",
      "machineCode",
      "orderNumber",
      "createdAt",
    ];

    const qb = this.rowRepo
      .createQueryBuilder("r")
      .where("r.upload_id = :uploadId", { uploadId });

    if (search) {
      qb.andWhere(
        "(r.orderNumber LIKE :s OR r.externalId LIKE :s OR r.goodsName LIKE :s OR r.machineCode LIKE :s OR r.location LIKE :s)",
        { s: `%${search}%` },
      );
    }
    if (paymentMethod)
      qb.andWhere("r.paymentMethod = :paymentMethod", { paymentMethod });
    if (paymentStatus)
      qb.andWhere("r.paymentStatus = :paymentStatus", { paymentStatus });

    const safeSort = ALLOWED_SORT.includes(sortBy) ? sortBy : "rowIndex";
    qb.orderBy(`r.${safeSort}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Доступные фильтры для конкретной загрузки */
  async getRowFilters(uploadId: string) {
    const methods = await this.rowRepo
      .createQueryBuilder("r")
      .select("DISTINCT r.paymentMethod", "value")
      .where("r.upload_id = :uploadId AND r.paymentMethod IS NOT NULL", {
        uploadId,
      })
      .getRawMany<{ value: string }>();

    const statuses = await this.rowRepo
      .createQueryBuilder("r")
      .select("DISTINCT r.paymentStatus", "value")
      .where("r.upload_id = :uploadId AND r.paymentStatus IS NOT NULL", {
        uploadId,
      })
      .getRawMany<{ value: string }>();

    return {
      paymentMethods: methods.map((m) => m.value).filter(Boolean),
      paymentStatuses: statuses.map((s) => s.value).filter(Boolean),
    };
  }

  // ─────────────────────────────────────────────
  // СВЕРКА (RECONCILIATION)
  // ─────────────────────────────────────────────

  async reconcile(dto: ReconcileDto) {
    const [uploadA, uploadB] = await Promise.all([
      this.findUploadById(dto.uploadIdA),
      this.findUploadById(dto.uploadIdB),
    ]);

    // Загружаем строки обоих отчётов
    const [rowsA, rowsB] = await Promise.all([
      this.rowRepo.find({ where: { uploadId: dto.uploadIdA } }),
      this.rowRepo.find({ where: { uploadId: dto.uploadIdB } }),
    ]);

    // Строим индексы по orderNumber
    const indexA = new Map(rowsA.map((r) => [r.orderNumber, r]));
    const indexB = new Map(rowsB.map((r) => [r.orderNumber, r]));

    const matched: {
      orderNumber: string;
      amountA: number;
      amountB: number;
      diff: number;
    }[] = [];
    const onlyInA: PaymentReportRow[] = [];
    const onlyInB: PaymentReportRow[] = [];
    const mismatched: {
      orderNumber: string;
      amountA: number;
      amountB: number;
      diff: number;
    }[] = [];

    for (const [orderNum, rowA] of indexA) {
      if (!orderNum) continue;
      if (indexB.has(orderNum)) {
        const rowB = indexB.get(orderNum)!;
        const diff = (rowA.amount ?? 0) - (rowB.amount ?? 0);
        if (Math.abs(diff) > 0.01) {
          mismatched.push({
            orderNumber: orderNum,
            amountA: rowA.amount ?? 0,
            amountB: rowB.amount ?? 0,
            diff,
          });
        } else {
          matched.push({
            orderNumber: orderNum,
            amountA: rowA.amount ?? 0,
            amountB: rowB.amount ?? 0,
            diff,
          });
        }
      } else {
        onlyInA.push(rowA);
      }
    }

    for (const [orderNum, rowB] of indexB) {
      if (!orderNum) continue;
      if (!indexA.has(orderNum)) onlyInB.push(rowB);
    }

    return {
      uploadA: {
        id: uploadA.id,
        type: uploadA.reportType,
        fileName: uploadA.fileName,
      },
      uploadB: {
        id: uploadB.id,
        type: uploadB.reportType,
        fileName: uploadB.fileName,
      },
      summary: {
        totalA: rowsA.length,
        totalB: rowsB.length,
        matched: matched.length,
        mismatched: mismatched.length,
        onlyInA: onlyInA.length,
        onlyInB: onlyInB.length,
      },
      mismatched: mismatched.slice(0, 200),
      onlyInA: onlyInA.slice(0, 200),
      onlyInB: onlyInB.slice(0, 200),
    };
  }

  // ─────────────────────────────────────────────
  // СТАТИСТИКА
  // ─────────────────────────────────────────────

  async getStats() {
    const byType = await this.uploadRepo
      .createQueryBuilder("u")
      .select("u.reportType", "type")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(u.totalRows)", "totalRows")
      .addSelect("SUM(u.totalAmount)", "totalAmount")
      .where("u.status = :s", { s: UploadStatus.COMPLETED })
      .groupBy("u.reportType")
      .getRawMany<{
        type: string;
        count: string;
        totalRows: string;
        totalAmount: string;
      }>();

    return { byType };
  }
}
