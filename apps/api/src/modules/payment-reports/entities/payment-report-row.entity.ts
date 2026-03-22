import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import {
  PaymentReportUpload,
  ReportType,
} from "./payment-report-upload.entity";
import { BaseEntity } from "../../../common/entities/base.entity";

@Entity("payment_report_rows")
@Index(["uploadId", "rowIndex"])
@Index(["reportType", "externalId"])
@Index(["reportType", "paymentTime"])
export class PaymentReportRow extends BaseEntity {
  @Column({ name: "upload_id" })
  @Index()
  uploadId: string;

  @ManyToOne(() => PaymentReportUpload, (upload) => upload.rows, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "upload_id" })
  upload: PaymentReportUpload;

  /** Тип отчёта — дублируем для быстрых запросов */
  @Column({
    name: "report_type",
    type: "enum",
    enum: ReportType,
  })
  reportType: ReportType;

  /** Порядковый номер строки в файле */
  @Column({ name: "row_index", type: "int" })
  rowIndex: number;

  // ─────────────────────────────────────────────
  // ОБЩИЕ ПОЛЯ (нормализованные для всех типов)
  // ─────────────────────────────────────────────

  /** Внешний ID транзакции (из платёжной системы) */
  @Column({ name: "external_id", length: 255, nullable: true })
  externalId: string;

  /** Номер заказа VendHub */
  @Column({ name: "order_number", length: 255, nullable: true })
  @Index()
  orderNumber: string;

  /** Дата/время оплаты */
  @Column({ name: "payment_time", type: "timestamp", nullable: true })
  @Index()
  paymentTime: Date;

  /** Сумма (в минимальных единицах или с копейками) */
  @Column({
    name: "amount",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
  })
  amount: number;

  /** Статус платежа */
  @Column({ name: "payment_status", length: 100, nullable: true })
  paymentStatus: string;

  /** Метод оплаты (UZCARD, HUMO, CLICK, PAYME, Наличные и т.д.) */
  @Column({ name: "payment_method", length: 100, nullable: true })
  paymentMethod: string;

  /** Маскированный номер карты */
  @Column({ name: "card_number", length: 50, nullable: true })
  cardNumber: string;

  /** Телефон клиента (если есть) */
  @Column({ name: "client_phone", length: 50, nullable: true })
  clientPhone: string;

  /** Название товара / услуги */
  @Column({ name: "goods_name", length: 500, nullable: true })
  goodsName: string;

  /** Код машины */
  @Column({ name: "machine_code", length: 100, nullable: true })
  machineCode: string;

  /** Адрес / локация */
  @Column({ name: "location", length: 500, nullable: true })
  location: string;

  // ─────────────────────────────────────────────
  // RAW ДАННЫЕ — полная строка как JSON
  // (для просмотра оригинала и будущего маппинга)
  // ─────────────────────────────────────────────
  @Column({ name: "raw_data", type: "json" })
  rawData: Record<string, unknown>;

  /** Дубликат ли эта строка (уже была загружена ранее) */
  @Column({ name: "is_duplicate", type: "boolean", default: false })
  isDuplicate: boolean;

  /** ID дублирующей строки */
  @Column({ name: "duplicate_of", nullable: true })
  duplicateOf: string;
}
