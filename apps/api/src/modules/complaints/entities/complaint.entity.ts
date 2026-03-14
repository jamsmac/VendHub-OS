/**
 * Complaint Entities for VendHub OS
 * Система жалоб и обращений через QR-код
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
} from "typeorm";
import { Organization } from "../../organizations/entities/organization.entity";
import { BaseEntity } from "../../../common/entities/base.entity";

// Re-export enums and constants for backward compatibility
export {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintSource,
  ComplaintActionType,
  RefundType,
  RefundStatus,
  SatisfactionRating,
} from "./complaint.enums";

export {
  DEFAULT_SLA_CONFIG,
  COMPLAINT_CATEGORY_LABELS,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_PRIORITY_LABELS,
  COMPLAINT_SOURCE_LABELS,
} from "./complaint.constants";

// Import enums for local usage in entities
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintSource,
  ComplaintActionType,
  RefundType,
  RefundStatus,
  SatisfactionRating,
} from "./complaint.enums";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Контактная информация клиента
 */
interface CustomerContact {
  name?: string;
  phone?: string;
  email?: string;
  telegramId?: string;
  telegramUsername?: string;
  preferredChannel?: "phone" | "email" | "telegram" | "sms";
  language?: "ru" | "uz" | "en";
}

/**
 * Информация о транзакции
 */
interface TransactionInfo {
  transactionId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  cardMask?: string; // "****1234"
  transactionDate?: Date;
  receiptNumber?: string;
}

/**
 * Информация о продукте
 */
interface ProductInfo {
  productId?: string;
  productName?: string;
  slotNumber?: number;
  quantity?: number;
  price?: number;
  batchNumber?: string;
  expiryDate?: Date;
}

/**
 * Информация об автомате
 */
interface MachineInfo {
  machineId?: string;
  machineCode?: string;
  machineName?: string;
  serialNumber?: string;
  locationId?: string;
  locationName?: string;
  locationAddress?: string;
}

/**
 * Геолокация
 */
interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  capturedAt: Date;
}

/**
 * Вложение
 */
interface Attachment {
  id: string;
  type: "image" | "video" | "audio" | "document";
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
  uploadedBy?: string;
}

/**
 * SLA конфигурация
 */
interface SlaConfig {
  responseTimeHours: number; // Время до первого ответа
  resolutionTimeHours: number; // Время до решения
  escalationTimeHours: number; // Время до эскалации
}

/**
 * SLA статус
 */
interface SlaStatus {
  responseDeadline: Date;
  resolutionDeadline: Date;
  isResponseOverdue: boolean;
  isResolutionOverdue: boolean;
  responseTime?: number; // Фактическое время ответа (минуты)
  resolutionTime?: number; // Фактическое время решения (минуты)
}

/**
 * Метаданные жалобы
 */
interface ComplaintMetadata {
  // Устройство клиента
  userAgent?: string;
  deviceType?: string;
  osVersion?: string;
  appVersion?: string;

  // QR код
  qrCodeId?: string;
  qrCodeScannedAt?: Date;

  // Автомат (дополнительно)
  machineErrorCode?: string;
  machineLastSync?: Date;
  machineTemperature?: number;

  // Внутренние
  internalNotes?: string;
  tags?: string[];
  relatedComplaintIds?: string[];

  // Аналитика
  timeToFirstResponse?: number; // минуты
  timeToResolution?: number; // минуты
  numberOfInteractions?: number;
  wasEscalated?: boolean;
  wasReopened?: boolean;
}

// ============================================================================
// ENTITIES
// ============================================================================

/**
 * Жалоба/Обращение
 */
@Entity("complaints")
@Index(["organizationId", "status"])
@Index(["organizationId", "category"])
@Index(["organizationId", "createdAt"])
@Index(["machineId", "status"])
@Index(["assignedToId", "status"])
@Index(["ticketNumber"], { unique: true })
@Index(["status", "priority"])
export class Complaint extends BaseEntity {
  // ===== Идентификация =====

  @Column({ length: 20, unique: true })
  ticketNumber: string; // "CMP-2024-00001"

  @Column({
    type: "enum",
    enum: ComplaintSource,
    default: ComplaintSource.QR_CODE,
  })
  source: ComplaintSource;

  // ===== Категоризация =====

  @Column({
    type: "enum",
    enum: ComplaintCategory,
    default: ComplaintCategory.OTHER,
  })
  category: ComplaintCategory;

  @Column({ length: 100, nullable: true })
  subcategory: string; // Дополнительная категоризация

  @Column({
    type: "enum",
    enum: ComplaintPriority,
    default: ComplaintPriority.MEDIUM,
  })
  priority: ComplaintPriority;

  @Column({
    type: "enum",
    enum: ComplaintStatus,
    default: ComplaintStatus.NEW,
  })
  status: ComplaintStatus;

  // ===== Описание =====

  @Column({ length: 255 })
  subject: string; // Краткое описание

  @Column({ type: "text" })
  description: string; // Полное описание

  // ===== Клиент =====

  @Column({ type: "jsonb", nullable: true })
  customer: CustomerContact;

  @Column({ type: "uuid", nullable: true })
  customerId: string; // Если зарегистрированный пользователь

  @Column({ default: false })
  isAnonymous: boolean;

  // ===== Связи с автоматом/продуктом =====

  @Column({ type: "uuid", nullable: true })
  machineId: string;

  @Column({ type: "jsonb", nullable: true })
  machineInfo: MachineInfo;

  @Column({ type: "uuid", nullable: true })
  locationId: string;

  @Column({ type: "jsonb", nullable: true })
  productInfo: ProductInfo;

  @Column({ type: "jsonb", nullable: true })
  transactionInfo: TransactionInfo;

  // ===== Геолокация =====

  @Column({ type: "jsonb", nullable: true })
  geoLocation: GeoLocation;

  // ===== Вложения =====

  @Column({ type: "jsonb", default: [] })
  attachments: Attachment[];

  // ===== Назначение =====

  @Column({ type: "uuid", nullable: true })
  assignedToId: string; // Ответственный сотрудник

  @Column({ length: 255, nullable: true })
  assignedToName: string;

  @Column({ type: "uuid", nullable: true })
  assignedTeamId: string; // Команда

  @Column({ type: "timestamp", nullable: true })
  assignedAt: Date;

  // ===== SLA =====

  @Column({ type: "jsonb", nullable: true })
  slaConfig: SlaConfig;

  @Column({ type: "jsonb", nullable: true })
  slaStatus: SlaStatus;

  @Column({ type: "timestamp", nullable: true })
  responseDeadline: Date;

  @Column({ type: "timestamp", nullable: true })
  resolutionDeadline: Date;

  @Column({ default: false })
  isSlaBreached: boolean;

  // ===== Решение =====

  @Column({ type: "text", nullable: true })
  resolution: string; // Описание решения

  @Column({ length: 100, nullable: true })
  resolutionCode: string; // Код решения

  @Column({ type: "timestamp", nullable: true })
  resolvedAt: Date;

  @Column({ type: "uuid", nullable: true })
  resolvedById: string;

  @Column({ length: 255, nullable: true })
  resolvedByName: string;

  // ===== Обратная связь =====

  @Column({ type: "int", nullable: true })
  satisfactionRating: SatisfactionRating;

  @Column({ type: "text", nullable: true })
  satisfactionFeedback: string;

  @Column({ type: "timestamp", nullable: true })
  feedbackReceivedAt: Date;

  // ===== Эскалация =====

  @Column({ default: false })
  isEscalated: boolean;

  @Column({ type: "int", default: 0 })
  escalationLevel: number;

  @Column({ type: "timestamp", nullable: true })
  escalatedAt: Date;

  @Column({ type: "text", nullable: true })
  escalationReason: string;

  // ===== Метаданные =====

  @Column({ type: "jsonb", default: {} })
  metadata: ComplaintMetadata;

  @Column({ type: "simple-array", nullable: true })
  tags: string[];

  // ===== Счетчики =====

  @Column({ default: 0 })
  commentCount: number;

  @Column({ default: 0 })
  reopenCount: number;

  // ===== Multi-tenant =====

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  // ===== Связи =====

  @OneToMany(() => ComplaintComment, (comment) => comment.complaint)
  comments: ComplaintComment[];

  @OneToMany(() => ComplaintAction, (action) => action.complaint)
  actions: ComplaintAction[];

  @OneToMany(() => ComplaintRefund, (refund) => refund.complaint)
  refunds: ComplaintRefund[];

  // ===== Timestamps =====

  @Column({ type: "timestamp", nullable: true })
  firstResponseAt: Date;

  // ===== Hooks =====

  @BeforeInsert()
  generateTicketNumber() {
    if (!this.ticketNumber) {
      const year = new Date().getFullYear();
      const random = Math.random().toString().substring(2, 7).padStart(5, "0");
      this.ticketNumber = `CMP-${year}-${random}`;
    }
  }

  @BeforeInsert()
  calculatePriority() {
    // Автоматический расчет приоритета по категории
    if (!this.priority) {
      const highPriorityCategories = [
        ComplaintCategory.MACHINE_NOT_WORKING,
        ComplaintCategory.REFUND_REQUEST,
        ComplaintCategory.DOUBLE_CHARGE,
        ComplaintCategory.CHARGE_WITHOUT_PRODUCT,
        ComplaintCategory.SAFETY_CONCERN,
      ];

      const criticalCategories = [
        ComplaintCategory.PRODUCT_EXPIRED,
        ComplaintCategory.HYGIENE_ISSUE,
      ];

      if (criticalCategories.includes(this.category)) {
        this.priority = ComplaintPriority.CRITICAL;
      } else if (highPriorityCategories.includes(this.category)) {
        this.priority = ComplaintPriority.HIGH;
      } else if (
        this.category === ComplaintCategory.SUGGESTION ||
        this.category === ComplaintCategory.PRODUCT_REQUEST
      ) {
        this.priority = ComplaintPriority.LOW;
      } else {
        this.priority = ComplaintPriority.MEDIUM;
      }
    }
  }

  @BeforeInsert()
  setSlaDeadlines() {
    // Установка дедлайнов по SLA в зависимости от приоритета
    const now = new Date();

    const slaHours = {
      [ComplaintPriority.CRITICAL]: { response: 1, resolution: 4 },
      [ComplaintPriority.HIGH]: { response: 2, resolution: 8 },
      [ComplaintPriority.MEDIUM]: { response: 4, resolution: 24 },
      [ComplaintPriority.LOW]: { response: 8, resolution: 72 },
    };

    const config =
      slaHours[this.priority] || slaHours[ComplaintPriority.MEDIUM];

    this.responseDeadline = new Date(
      now.getTime() + config.response * 60 * 60 * 1000,
    );
    this.resolutionDeadline = new Date(
      now.getTime() + config.resolution * 60 * 60 * 1000,
    );

    this.slaConfig = {
      responseTimeHours: config.response,
      resolutionTimeHours: config.resolution,
      escalationTimeHours: config.response * 2,
    };
  }
}

/**
 * Комментарий к жалобе
 */
@Entity("complaint_comments")
@Index(["complaintId", "createdAt"])
export class ComplaintComment extends BaseEntity {
  @Column()
  complaintId: string;

  @ManyToOne(() => Complaint, (complaint) => complaint.comments, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "complaint_id" })
  complaint: Complaint;

  @Column()
  organizationId: string;

  // Автор
  @Column({ type: "uuid", nullable: true })
  authorId: string;

  @Column({ length: 255 })
  authorName: string;

  @Column({
    type: "enum",
    enum: ["staff", "customer", "system"],
    default: "staff",
  })
  authorType: "staff" | "customer" | "system";

  // Контент
  @Column({ type: "text" })
  content: string;

  @Column({ type: "jsonb", default: [] })
  attachments: Attachment[];

  // Флаги
  @Column({ default: false })
  isInternal: boolean; // Внутренний комментарий (не видно клиенту)

  @Column({ default: false })
  isAutoGenerated: boolean; // Автоматически сгенерированный

  // Отправка клиенту
  @Column({ default: false })
  sentToCustomer: boolean;

  @Column({ length: 50, nullable: true })
  sentVia: string; // "email", "telegram", "sms"

  @Column({ type: "timestamp", nullable: true })
  sentAt: Date;
}

/**
 * Действие/история по жалобе
 */
@Entity("complaint_actions")
@Index(["complaintId", "createdAt"])
@Index(["organizationId", "actionType"])
export class ComplaintAction extends BaseEntity {
  @Column()
  complaintId: string;

  @ManyToOne(() => Complaint, (complaint) => complaint.actions, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "complaint_id" })
  complaint: Complaint;

  @Column()
  organizationId: string;

  @Column({
    type: "enum",
    enum: ComplaintActionType,
  })
  actionType: ComplaintActionType;

  @Column({ length: 255 })
  description: string;

  // Изменения
  @Column({ type: "jsonb", nullable: true })
  changes: {
    field: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    oldValue: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newValue: any;
  }[];

  // Метаданные
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  // Пользователь
  @Column({ type: "uuid", nullable: true })
  performedById: string;

  @Column({ length: 255, nullable: true })
  performedByName: string;

  @Column({ default: false })
  isSystemAction: boolean;
}

/**
 * Возврат по жалобе
 */
@Entity("complaint_refunds")
@Index(["complaintId", "status"])
@Index(["organizationId", "status"])
export class ComplaintRefund extends BaseEntity {
  @Column()
  complaintId: string;

  @ManyToOne(() => Complaint, (complaint) => complaint.refunds, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "complaint_id" })
  complaint: Complaint;

  @Column()
  organizationId: string;

  // ===== Тип и сумма =====

  @Column({ length: 50, unique: true })
  refundNumber: string; // "REF-2024-00001"

  @Column({
    type: "enum",
    enum: RefundType,
    default: RefundType.FULL,
  })
  type: RefundType;

  @Column({
    type: "enum",
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount: number;

  @Column({ length: 10, default: "UZS" })
  currency: string;

  // ===== Оригинальная транзакция =====

  @Column({ type: "uuid", nullable: true })
  originalTransactionId: string;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  originalAmount: number;

  // ===== Способ возврата =====

  @Column({ length: 50 })
  refundMethod: string; // "original_payment", "bank_transfer", "cash"

  @Column({ type: "jsonb", nullable: true })
  refundDetails: {
    bankName?: string;
    accountNumber?: string;
    cardMask?: string;
    phoneNumber?: string;
  };

  // ===== Причина =====

  @Column({ type: "text" })
  reason: string;

  @Column({ length: 100, nullable: true })
  reasonCode: string;

  // ===== Процессинг =====

  @Column({ type: "timestamp", nullable: true })
  approvedAt: Date;

  @Column({ type: "uuid", nullable: true })
  approvedById: string;

  @Column({ length: 255, nullable: true })
  approvedByName: string;

  @Column({ type: "timestamp", nullable: true })
  processedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date;

  @Column({ length: 100, nullable: true })
  externalRefundId: string; // ID в платежной системе

  // ===== Примечания =====

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "text", nullable: true })
  rejectionReason: string;

  // ===== Hooks =====

  @BeforeInsert()
  generateRefundNumber() {
    if (!this.refundNumber) {
      const year = new Date().getFullYear();
      const random = Math.random().toString().substring(2, 7).padStart(5, "0");
      this.refundNumber = `REF-${year}-${random}`;
    }
  }
}

/**
 * Шаблон ответа на жалобу
 */
@Entity("complaint_templates")
@Index(["organizationId", "category"])
@Index(["organizationId", "isActive"])
export class ComplaintTemplate extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  code: string; // "REFUND_APPROVED", "MACHINE_FIXED"

  @Column({
    type: "enum",
    enum: ComplaintCategory,
    nullable: true,
  })
  category: ComplaintCategory; // Для какой категории

  @Column({
    type: "enum",
    enum: ["response", "resolution", "escalation", "follow_up"],
    default: "response",
  })
  templateType: "response" | "resolution" | "escalation" | "follow_up";

  // Контент на разных языках
  @Column({ type: "text" })
  contentRu: string;

  @Column({ type: "text", nullable: true })
  contentUz: string;

  @Column({ type: "text", nullable: true })
  contentEn: string;

  // Переменные
  @Column({ type: "jsonb", default: [] })
  variables: string[]; // ["customer_name", "ticket_number", "refund_amount"]

  // Флаги
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDefault: boolean; // Шаблон по умолчанию для категории

  // Статистика использования
  @Column({ default: 0 })
  usageCount: number;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt: Date;
}

/**
 * QR-код для жалоб (на автомате)
 */
@Entity("complaint_qr_codes")
@Index(["machineId"])
@Index(["code"], { unique: true })
export class ComplaintQrCode extends BaseEntity {
  @Column({ length: 100, unique: true })
  code: string; // Уникальный код QR

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ type: "uuid" })
  machineId: string;

  @Column({ length: 100, nullable: true })
  machineCode: string;

  @Column({ type: "uuid", nullable: true })
  locationId: string;

  // URL
  @Column({ type: "text" })
  url: string; // Полный URL для QR

  @Column({ type: "text", nullable: true })
  shortUrl: string; // Сокращенный URL

  // Изображение QR
  @Column({ type: "text", nullable: true })
  qrImageUrl: string;

  // Статистика
  @Column({ default: 0 })
  scanCount: number;

  @Column({ default: 0 })
  complaintCount: number;

  @Column({ type: "timestamp", nullable: true })
  lastScannedAt: Date;

  // Флаги
  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date;
}

/**
 * Правило автоматизации жалоб
 */
@Entity("complaint_automation_rules")
@Index(["organizationId", "isActive"])
export class ComplaintAutomationRule extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  // Условия (когда срабатывает)
  @Column({ type: "jsonb" })
  conditions: {
    field: string; // "category", "priority", "status", "source"
    operator: "equals" | "not_equals" | "contains" | "in" | "not_in";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
  }[];

  // Действия
  @Column({ type: "jsonb" })
  actions: {
    type:
      | "assign"
      | "set_priority"
      | "add_tag"
      | "send_notification"
      | "auto_reply";

    params: Record<string, unknown>;
  }[];

  // Порядок выполнения
  @Column({ type: "int", default: 0 })
  priority: number;

  @Column({ default: true })
  stopOnMatch: boolean; // Остановить после срабатывания

  // Статистика
  @Column({ default: 0 })
  triggerCount: number;

  @Column({ type: "timestamp", nullable: true })
  lastTriggeredAt: Date;

  @Column({ default: true })
  isActive: boolean;
}
