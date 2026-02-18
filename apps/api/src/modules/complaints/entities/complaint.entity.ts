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

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Категория жалобы
 */
export enum ComplaintCategory {
  // Проблемы с автоматом
  MACHINE_NOT_WORKING = "machine_not_working", // Автомат не работает
  MACHINE_ERROR = "machine_error", // Ошибка автомата
  PAYMENT_FAILED = "payment_failed", // Проблема с оплатой
  CARD_NOT_ACCEPTED = "card_not_accepted", // Карта не принимается
  CASH_NOT_ACCEPTED = "cash_not_accepted", // Наличные не принимаются
  NO_CHANGE = "no_change", // Нет сдачи

  // Проблемы с продуктом
  PRODUCT_NOT_DISPENSED = "product_not_dispensed", // Товар не выдан
  PRODUCT_STUCK = "product_stuck", // Товар застрял
  WRONG_PRODUCT = "wrong_product", // Выдан не тот товар
  PRODUCT_EXPIRED = "product_expired", // Товар просрочен
  PRODUCT_DAMAGED = "product_damaged", // Товар поврежден
  PRODUCT_QUALITY = "product_quality", // Качество товара
  PRODUCT_OUT_OF_STOCK = "product_out_of_stock", // Товар закончился

  // Возврат средств
  REFUND_REQUEST = "refund_request", // Запрос на возврат
  DOUBLE_CHARGE = "double_charge", // Двойное списание
  CHARGE_WITHOUT_PRODUCT = "charge_without_product", // Списание без выдачи

  // Гигиена и безопасность
  MACHINE_DIRTY = "machine_dirty", // Автомат грязный
  HYGIENE_ISSUE = "hygiene_issue", // Проблема гигиены
  SAFETY_CONCERN = "safety_concern", // Проблема безопасности

  // Предложения
  SUGGESTION = "suggestion", // Предложение
  PRODUCT_REQUEST = "product_request", // Запрос продукта
  PRICE_FEEDBACK = "price_feedback", // Отзыв о цене

  // Другое
  OTHER = "other", // Другое
}

/**
 * Приоритет жалобы
 */
export enum ComplaintPriority {
  LOW = "low", // Низкий (предложения)
  MEDIUM = "medium", // Средний (мелкие проблемы)
  HIGH = "high", // Высокий (возвраты, неработающий автомат)
  CRITICAL = "critical", // Критический (безопасность, массовые проблемы)
}

/**
 * Статус жалобы
 */
export enum ComplaintStatus {
  // Начальные
  NEW = "new", // Новая
  PENDING = "pending", // Ожидает обработки

  // В работе
  IN_PROGRESS = "in_progress", // В работе
  ASSIGNED = "assigned", // Назначена исполнителю
  INVESTIGATING = "investigating", // Расследование
  AWAITING_CUSTOMER = "awaiting_customer", // Ожидает клиента
  AWAITING_PARTS = "awaiting_parts", // Ожидает запчастей

  // Финальные
  RESOLVED = "resolved", // Решена
  CLOSED = "closed", // Закрыта
  REJECTED = "rejected", // Отклонена
  DUPLICATE = "duplicate", // Дубликат

  // Эскалация
  ESCALATED = "escalated", // Эскалирована
  REOPENED = "reopened", // Открыта повторно
}

/**
 * Источник жалобы
 */
export enum ComplaintSource {
  QR_CODE = "qr_code", // Через QR-код на автомате
  MOBILE_APP = "mobile_app", // Мобильное приложение
  WEB_PORTAL = "web_portal", // Веб-портал
  TELEGRAM_BOT = "telegram_bot", // Telegram бот
  PHONE_CALL = "phone_call", // Звонок
  EMAIL = "email", // Email
  SOCIAL_MEDIA = "social_media", // Социальные сети
  LOCATION_CONTACT = "location_contact", // Контакт от локации
  INTERNAL = "internal", // Внутренняя (от сотрудников)
}

/**
 * Тип действия по жалобе
 */
export enum ComplaintActionType {
  // Статус
  CREATED = "created",
  STATUS_CHANGED = "status_changed",
  ASSIGNED = "assigned",
  ESCALATED = "escalated",

  // Коммуникация
  COMMENT_ADDED = "comment_added",
  CUSTOMER_CONTACTED = "customer_contacted",
  CUSTOMER_REPLIED = "customer_replied",

  // Решение
  REFUND_INITIATED = "refund_initiated",
  REFUND_COMPLETED = "refund_completed",
  PRODUCT_REPLACED = "product_replaced",
  MACHINE_SERVICED = "machine_serviced",

  // Другое
  ATTACHMENT_ADDED = "attachment_added",
  MERGED = "merged",
  SPLIT = "split",
  REOPENED = "reopened",
}

/**
 * Тип возврата
 */
export enum RefundType {
  FULL = "full", // Полный возврат
  PARTIAL = "partial", // Частичный возврат
  PRODUCT_REPLACEMENT = "product_replacement", // Замена товара
  CREDIT = "credit", // Кредит на будущие покупки
  COMPENSATION = "compensation", // Компенсация
}

/**
 * Статус возврата
 */
export enum RefundStatus {
  PENDING = "pending", // Ожидает
  APPROVED = "approved", // Одобрен
  PROCESSING = "processing", // В обработке
  COMPLETED = "completed", // Завершен
  REJECTED = "rejected", // Отклонен
  CANCELLED = "cancelled", // Отменен
}

/**
 * Рейтинг удовлетворенности
 */
export enum SatisfactionRating {
  VERY_DISSATISFIED = 1,
  DISSATISFIED = 2,
  NEUTRAL = 3,
  SATISFIED = 4,
  VERY_SATISFIED = 5,
}

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: Record<string, any>;
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

// ============================================================================
// HELPER CONSTANTS
// ============================================================================

/**
 * SLA конфигурация по приоритету
 */
export const DEFAULT_SLA_CONFIG: Record<ComplaintPriority, SlaConfig> = {
  [ComplaintPriority.CRITICAL]: {
    responseTimeHours: 1,
    resolutionTimeHours: 4,
    escalationTimeHours: 2,
  },
  [ComplaintPriority.HIGH]: {
    responseTimeHours: 2,
    resolutionTimeHours: 8,
    escalationTimeHours: 4,
  },
  [ComplaintPriority.MEDIUM]: {
    responseTimeHours: 4,
    resolutionTimeHours: 24,
    escalationTimeHours: 8,
  },
  [ComplaintPriority.LOW]: {
    responseTimeHours: 8,
    resolutionTimeHours: 72,
    escalationTimeHours: 24,
  },
};

/**
 * Labels для категорий жалоб
 */
export const COMPLAINT_CATEGORY_LABELS: Record<
  ComplaintCategory,
  { ru: string; uz: string }
> = {
  [ComplaintCategory.MACHINE_NOT_WORKING]: {
    ru: "Автомат не работает",
    uz: "Avtomat ishlamayapti",
  },
  [ComplaintCategory.MACHINE_ERROR]: {
    ru: "Ошибка автомата",
    uz: "Avtomat xatosi",
  },
  [ComplaintCategory.PAYMENT_FAILED]: {
    ru: "Проблема с оплатой",
    uz: "To'lov muammosi",
  },
  [ComplaintCategory.CARD_NOT_ACCEPTED]: {
    ru: "Карта не принимается",
    uz: "Karta qabul qilinmayapti",
  },
  [ComplaintCategory.CASH_NOT_ACCEPTED]: {
    ru: "Наличные не принимаются",
    uz: "Naqd pul qabul qilinmayapti",
  },
  [ComplaintCategory.NO_CHANGE]: { ru: "Нет сдачи", uz: "Qaytim yo'q" },
  [ComplaintCategory.PRODUCT_NOT_DISPENSED]: {
    ru: "Товар не выдан",
    uz: "Mahsulot berilmadi",
  },
  [ComplaintCategory.PRODUCT_STUCK]: {
    ru: "Товар застрял",
    uz: "Mahsulot tiqilib qoldi",
  },
  [ComplaintCategory.WRONG_PRODUCT]: {
    ru: "Выдан не тот товар",
    uz: "Noto'g'ri mahsulot berildi",
  },
  [ComplaintCategory.PRODUCT_EXPIRED]: {
    ru: "Товар просрочен",
    uz: "Mahsulot muddati o'tgan",
  },
  [ComplaintCategory.PRODUCT_DAMAGED]: {
    ru: "Товар поврежден",
    uz: "Mahsulot shikastlangan",
  },
  [ComplaintCategory.PRODUCT_QUALITY]: {
    ru: "Качество товара",
    uz: "Mahsulot sifati",
  },
  [ComplaintCategory.PRODUCT_OUT_OF_STOCK]: {
    ru: "Товар закончился",
    uz: "Mahsulot tugadi",
  },
  [ComplaintCategory.REFUND_REQUEST]: {
    ru: "Запрос на возврат",
    uz: "Qaytarish so'rovi",
  },
  [ComplaintCategory.DOUBLE_CHARGE]: {
    ru: "Двойное списание",
    uz: "Ikki marta yechildi",
  },
  [ComplaintCategory.CHARGE_WITHOUT_PRODUCT]: {
    ru: "Списание без выдачи",
    uz: "Mahsulotsiz yechim",
  },
  [ComplaintCategory.MACHINE_DIRTY]: {
    ru: "Автомат грязный",
    uz: "Avtomat iflos",
  },
  [ComplaintCategory.HYGIENE_ISSUE]: {
    ru: "Проблема гигиены",
    uz: "Gigiena muammosi",
  },
  [ComplaintCategory.SAFETY_CONCERN]: {
    ru: "Проблема безопасности",
    uz: "Xavfsizlik muammosi",
  },
  [ComplaintCategory.SUGGESTION]: { ru: "Предложение", uz: "Taklif" },
  [ComplaintCategory.PRODUCT_REQUEST]: {
    ru: "Запрос продукта",
    uz: "Mahsulot so'rovi",
  },
  [ComplaintCategory.PRICE_FEEDBACK]: {
    ru: "Отзыв о цене",
    uz: "Narx haqida fikr",
  },
  [ComplaintCategory.OTHER]: { ru: "Другое", uz: "Boshqa" },
};

/**
 * Labels для статусов жалоб
 */
export const COMPLAINT_STATUS_LABELS: Record<
  ComplaintStatus,
  { ru: string; uz: string; color: string }
> = {
  [ComplaintStatus.NEW]: { ru: "Новая", uz: "Yangi", color: "#3B82F6" },
  [ComplaintStatus.PENDING]: {
    ru: "Ожидает",
    uz: "Kutmoqda",
    color: "#F59E0B",
  },
  [ComplaintStatus.IN_PROGRESS]: {
    ru: "В работе",
    uz: "Jarayonda",
    color: "#8B5CF6",
  },
  [ComplaintStatus.ASSIGNED]: {
    ru: "Назначена",
    uz: "Tayinlangan",
    color: "#6366F1",
  },
  [ComplaintStatus.INVESTIGATING]: {
    ru: "Расследование",
    uz: "Tekshirilmoqda",
    color: "#EC4899",
  },
  [ComplaintStatus.AWAITING_CUSTOMER]: {
    ru: "Ожидает клиента",
    uz: "Mijozni kutmoqda",
    color: "#F97316",
  },
  [ComplaintStatus.AWAITING_PARTS]: {
    ru: "Ожидает запчасти",
    uz: "Ehtiyot qismlarni kutmoqda",
    color: "#EAB308",
  },
  [ComplaintStatus.RESOLVED]: {
    ru: "Решена",
    uz: "Hal qilindi",
    color: "#10B981",
  },
  [ComplaintStatus.CLOSED]: { ru: "Закрыта", uz: "Yopildi", color: "#6B7280" },
  [ComplaintStatus.REJECTED]: {
    ru: "Отклонена",
    uz: "Rad etildi",
    color: "#EF4444",
  },
  [ComplaintStatus.DUPLICATE]: {
    ru: "Дубликат",
    uz: "Dublikat",
    color: "#9CA3AF",
  },
  [ComplaintStatus.ESCALATED]: {
    ru: "Эскалирована",
    uz: "Eskalatsiya",
    color: "#DC2626",
  },
  [ComplaintStatus.REOPENED]: {
    ru: "Открыта повторно",
    uz: "Qayta ochildi",
    color: "#F59E0B",
  },
};

/**
 * Labels для приоритетов
 */
export const COMPLAINT_PRIORITY_LABELS: Record<
  ComplaintPriority,
  { ru: string; uz: string; color: string; icon: string }
> = {
  [ComplaintPriority.LOW]: {
    ru: "Низкий",
    uz: "Past",
    color: "#6B7280",
    icon: "⬇️",
  },
  [ComplaintPriority.MEDIUM]: {
    ru: "Средний",
    uz: "O'rta",
    color: "#F59E0B",
    icon: "➡️",
  },
  [ComplaintPriority.HIGH]: {
    ru: "Высокий",
    uz: "Yuqori",
    color: "#F97316",
    icon: "⬆️",
  },
  [ComplaintPriority.CRITICAL]: {
    ru: "Критический",
    uz: "Kritik",
    color: "#EF4444",
    icon: "🔥",
  },
};

/**
 * Labels для источников
 */
export const COMPLAINT_SOURCE_LABELS: Record<
  ComplaintSource,
  { ru: string; uz: string; icon: string }
> = {
  [ComplaintSource.QR_CODE]: { ru: "QR-код", uz: "QR-kod", icon: "📱" },
  [ComplaintSource.MOBILE_APP]: {
    ru: "Мобильное приложение",
    uz: "Mobil ilova",
    icon: "📲",
  },
  [ComplaintSource.WEB_PORTAL]: {
    ru: "Веб-портал",
    uz: "Veb-portal",
    icon: "🌐",
  },
  [ComplaintSource.TELEGRAM_BOT]: {
    ru: "Telegram бот",
    uz: "Telegram bot",
    icon: "🤖",
  },
  [ComplaintSource.PHONE_CALL]: { ru: "Звонок", uz: "Qo'ng'iroq", icon: "📞" },
  [ComplaintSource.EMAIL]: { ru: "Email", uz: "Email", icon: "📧" },
  [ComplaintSource.SOCIAL_MEDIA]: {
    ru: "Социальные сети",
    uz: "Ijtimoiy tarmoqlar",
    icon: "💬",
  },
  [ComplaintSource.LOCATION_CONTACT]: {
    ru: "Контакт от локации",
    uz: "Lokatsiya aloqasi",
    icon: "📍",
  },
  [ComplaintSource.INTERNAL]: { ru: "Внутренняя", uz: "Ichki", icon: "🏢" },
};
