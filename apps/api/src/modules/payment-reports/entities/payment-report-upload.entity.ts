import { Entity, Column, OneToMany, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum ReportType {
  PAYME = "PAYME",
  CLICK = "CLICK",
  VENDHUB_ORDERS = "VENDHUB_ORDERS",
  VENDHUB_CSV = "VENDHUB_CSV",
  KASSA_FISCAL = "KASSA_FISCAL",
  UNKNOWN = "UNKNOWN",
}

export enum UploadStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  DUPLICATE = "DUPLICATE",
}

@Entity("payment_report_uploads")
@Index(["organizationId"])
@Index(["organizationId", "createdAt"])
@Index(["reportType", "createdAt"])
@Index(["status"])
export class PaymentReportUpload extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  /** Оригинальное имя файла */
  @Column({ name: "file_name", length: 500 })
  fileName: string;

  /** Путь к файлу в S3 / локальном хранилище */
  @Column({ name: "file_path", length: 1000, nullable: true })
  filePath: string;

  /** Размер файла в байтах */
  @Column({ name: "file_size", type: "bigint", nullable: true })
  fileSize: number;

  /** MIME-тип файла */
  @Column({ name: "mime_type", length: 100, nullable: true })
  mimeType: string;

  /** Тип отчёта — определяется автоматически */
  @Column({
    name: "report_type",
    type: "enum",
    enum: ReportType,
    default: ReportType.UNKNOWN,
  })
  reportType: ReportType;

  /** Уверенность авто-определения (0-100) */
  @Column({
    name: "detection_confidence",
    type: "int",
    default: 0,
  })
  detectionConfidence: number;

  /** Статус обработки */
  @Column({
    type: "enum",
    enum: UploadStatus,
    default: UploadStatus.PENDING,
  })
  status: UploadStatus;

  /** Сообщение об ошибке при неудачной обработке */
  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage: string;

  /** Метаданные из шапки файла (период, компания, и т.д.) */
  @Column({ name: "report_meta", type: "json", nullable: true })
  reportMeta: Record<string, unknown>;

  /** Период отчёта — начало */
  @Column({ name: "period_from", type: "timestamp", nullable: true })
  periodFrom: Date;

  /** Период отчёта — конец */
  @Column({ name: "period_to", type: "timestamp", nullable: true })
  periodTo: Date;

  /** Общее количество строк в файле */
  @Column({ name: "total_rows", type: "int", default: 0 })
  totalRows: number;

  /** Количество успешно обработанных строк */
  @Column({ name: "processed_rows", type: "int", default: 0 })
  processedRows: number;

  /** Количество новых строк (не дублей) */
  @Column({ name: "new_rows", type: "int", default: 0 })
  newRows: number;

  /** Количество дублей */
  @Column({ name: "duplicate_rows", type: "int", default: 0 })
  duplicateRows: number;

  /** Сумма по отчёту (если применимо) */
  @Column({
    name: "total_amount",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
  })
  totalAmount: number;

  /** Валюта суммы */
  @Column({ name: "currency", length: 10, default: "UZS" })
  currency: string;

  /** Контрольная сумма файла для дедупликации */
  @Column({ name: "file_hash", length: 64, nullable: true })
  @Index()
  fileHash: string;

  /** Кто загрузил */
  @Column({ name: "uploaded_by", length: 255, nullable: true })
  uploadedBy: string;

  @OneToMany("PaymentReportRow", "upload", { cascade: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[];

  // ─────────────────────────────────────────────
  // IMPORT TRACKING (Phase 1: Reports → Transactions)
  // ─────────────────────────────────────────────

  /** Количество успешно импортированных строк */
  @Column({ name: "imported_rows", type: "int", default: 0 })
  importedRows: number;

  /** Количество ошибок при импорте */
  @Column({ name: "import_errors", type: "int", default: 0 })
  importErrors: number;

  /** Дата/время импорта */
  @Column({ name: "imported_at", type: "timestamptz", nullable: true })
  importedAt: Date | null;

  /** Кто инициировал импорт */
  @Column({ name: "imported_by", type: "varchar", length: 255, nullable: true })
  importedBy: string | null;
}
