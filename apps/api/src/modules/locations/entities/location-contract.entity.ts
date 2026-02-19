/**
 * LocationContract + LocationContractPayment Entities for VendHub OS
 * Контракт с локацией и оплаты по контракту
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { Organization } from "../../organizations/entities/organization.entity";
import { BaseEntity } from "../../../common/entities/base.entity";
import {
  ContractType,
  ContractStatus,
  PaymentFrequency,
} from "./location-enums";
import type { ContractFinancials } from "./location-interfaces";
import { Location } from "./location.entity";

/**
 * Контракт с локацией
 */
@Entity("location_contracts")
@Index(["locationId", "status"])
@Index(["organizationId", "status"])
@Index(["endDate", "status"])
export class LocationContract extends BaseEntity {
  @Column()
  locationId: string;

  @ManyToOne(() => Location, (location) => location.contracts, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  // ===== Основные данные =====

  @Column({ length: 100, unique: true })
  contractNumber: string; // "CT-2024-00001"

  @Column({ length: 255, nullable: true })
  title: string;

  @Column({
    type: "enum",
    enum: ContractType,
    default: ContractType.RENT,
  })
  type: ContractType;

  @Column({
    type: "enum",
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
  })
  status: ContractStatus;

  // ===== Даты =====

  @Column({ type: "date" })
  startDate: Date;

  @Column({ type: "date" })
  endDate: Date;

  @Column({ type: "date", nullable: true })
  signedDate: Date;

  @Column({ type: "date", nullable: true })
  terminatedDate: Date;

  // Автопродление
  @Column({ default: false })
  autoRenewal: boolean;

  @Column({ type: "int", default: 12 })
  renewalPeriodMonths: number;

  @Column({ type: "int", default: 30 })
  noticeBeforeExpiryDays: number; // За сколько дней уведомить

  // ===== Финансы =====

  @Column({ type: "jsonb" })
  financials: ContractFinancials;

  @Column({
    type: "enum",
    enum: PaymentFrequency,
    default: PaymentFrequency.MONTHLY,
  })
  paymentFrequency: PaymentFrequency;

  @Column({ type: "int", default: 5 })
  paymentDueDay: number; // День месяца для оплаты

  // Суммы для быстрого доступа
  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  monthlyAmount: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  revenueSharePercent: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  depositAmount: number;

  @Column({ length: 10, default: "UZS" })
  currency: string;

  // ===== Стороны контракта =====

  // Наша сторона
  @Column({ length: 255, nullable: true })
  companyName: string;

  @Column({ length: 255, nullable: true })
  companyRepresentative: string;

  // Сторона локации
  @Column({ length: 255 })
  landlordName: string; // Арендодатель

  @Column({ length: 20, nullable: true })
  landlordInn: string; // ИНН арендодателя

  @Column({ length: 255, nullable: true })
  landlordRepresentative: string;

  @Column({ length: 50, nullable: true })
  landlordPhone: string;

  @Column({ length: 255, nullable: true })
  landlordEmail: string;

  @Column({ type: "text", nullable: true })
  landlordAddress: string;

  // ===== Условия =====

  @Column({ type: "jsonb", default: [] })
  specialConditions: {
    condition: string;
    isActive: boolean;
  }[];

  @Column({ type: "jsonb", default: [] })
  allowedMachineTypes: string[]; // Разрешенные типы автоматов

  @Column({ type: "int", nullable: true })
  maxMachines: number; // Макс. количество автоматов

  @Column({ type: "jsonb", default: [] })
  restrictedProducts: string[]; // Запрещенные продукты

  // ===== Документы =====

  @Column({ type: "jsonb", default: [] })
  documents: {
    id: string;
    name: string;
    type: string; // "contract", "annex", "act"
    url: string;
    uploadedAt: Date;
    uploadedBy: string;
  }[];

  @Column({ type: "text", nullable: true })
  contractFileUrl: string; // Основной файл контракта

  // ===== История платежей =====

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  totalPaid: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  totalDue: number;

  @Column({ type: "date", nullable: true })
  lastPaymentDate: Date;

  @Column({ type: "date", nullable: true })
  nextPaymentDate: Date;

  // ===== Примечания =====

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "text", nullable: true })
  terminationReason: string;

  // ===== Approval =====

  @Column({ type: "uuid", nullable: true })
  approvedBy: string;

  @Column({ type: "timestamp", nullable: true })
  approvedAt: Date;

  // ===== Hooks =====

  @BeforeInsert()
  generateContractNumber() {
    if (!this.contractNumber) {
      const year = new Date().getFullYear();
      const random = Math.random().toString().substring(2, 7);
      this.contractNumber = `CT-${year}-${random}`;
    }
  }

  @BeforeUpdate()
  checkExpiry() {
    if (this.status === ContractStatus.ACTIVE && this.endDate) {
      const daysUntilExpiry = Math.ceil(
        (new Date(this.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (
        daysUntilExpiry <= this.noticeBeforeExpiryDays &&
        daysUntilExpiry > 0
      ) {
        this.status = ContractStatus.EXPIRING_SOON;
      } else if (daysUntilExpiry <= 0) {
        this.status = ContractStatus.EXPIRED;
      }
    }
  }
}

/**
 * Оплата по контракту
 */
@Entity("location_contract_payments")
@Index(["contractId", "status"])
@Index(["organizationId", "dueDate"])
export class LocationContractPayment extends BaseEntity {
  @Column()
  contractId: string;

  @ManyToOne(() => LocationContract, { onDelete: "SET NULL" })
  @JoinColumn({ name: "contract_id" })
  contract: LocationContract;

  @Column()
  locationId: string;

  @Column()
  organizationId: string;

  // Период
  @Column({ type: "date" })
  periodStart: Date;

  @Column({ type: "date" })
  periodEnd: Date;

  // Суммы
  @Column({ type: "decimal", precision: 15, scale: 2 })
  baseAmount: number; // Базовая сумма

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  revenueShareAmount: number; // Доля от выручки

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  utilitiesAmount: number; // Коммунальные

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  penaltyAmount: number; // Штрафы

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  discountAmount: number; // Скидки

  @Column({ type: "decimal", precision: 15, scale: 2 })
  totalAmount: number; // Итого к оплате

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  paidAmount: number; // Оплачено

  @Column({ length: 10, default: "UZS" })
  currency: string;

  // Даты
  @Column({ type: "date" })
  dueDate: Date;

  @Column({ type: "date", nullable: true })
  paidDate: Date;

  // Статус
  @Column({
    type: "enum",
    enum: ["pending", "partial", "paid", "overdue", "cancelled"],
    default: "pending",
  })
  status: "pending" | "partial" | "paid" | "overdue" | "cancelled";

  // Детали оплаты
  @Column({ length: 50, nullable: true })
  paymentMethod: string; // "bank_transfer", "cash", "card"

  @Column({ length: 100, nullable: true })
  paymentReference: string; // Номер платежки

  @Column({ type: "text", nullable: true })
  notes: string;

  // Документы
  @Column({ type: "jsonb", default: [] })
  documents: {
    type: string; // "invoice", "receipt", "act"
    url: string;
    uploadedAt: Date;
  }[];

  @Column({ type: "uuid", nullable: true })
  paidBy: string;
}
