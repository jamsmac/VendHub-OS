/**
 * Location Entity for VendHub OS
 * Локация - точка размещения автоматов
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { Organization } from "../../organizations/entities/organization.entity";
import { BaseEntity } from "../../../common/entities/base.entity";
import { LocationType, LocationStatus, ContractType } from "./location-enums";
import type {
  Address,
  Coordinates,
  ContactPerson,
  DaySchedule,
  WeeklySchedule,
  LocationCharacteristics,
  LocationMetadata,
  LocationStats,
} from "./location-interfaces";
import { LocationZone } from "./location-zone.entity";
import { LocationContract } from "./location-contract.entity";
import { LocationEvent } from "./location-event.entity";
import { LocationNote } from "./location-note.entity";

@Entity("locations")
@Index(["organizationId", "status"])
@Index(["organizationId", "type"])
@Index(["city", "status"])
@Index(["latitude", "longitude"])
@Index(["status", "deletedAt"])
export class Location extends BaseEntity {
  // ===== Основная информация =====

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  code: string; // "LOC-TAS-001"

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: LocationType,
    default: LocationType.OTHER,
  })
  type: LocationType;

  @Column({
    type: "enum",
    enum: LocationStatus,
    default: LocationStatus.PROSPECTING,
  })
  status: LocationStatus;

  // ===== Адрес =====

  @Column({ type: "jsonb" })
  address: Address;

  @Column({ length: 100 })
  city: string;

  @Column({ length: 100, nullable: true })
  region: string;

  @Column({ length: 20, nullable: true })
  postalCode: string;

  // ===== Координаты =====

  @Column({ type: "decimal", precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: "decimal", precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: "jsonb", nullable: true })
  coordinates: Coordinates;

  // ===== Контакты =====

  @Column({ type: "jsonb", default: [] })
  contacts: ContactPerson[];

  @Column({ length: 255, nullable: true })
  primaryContactName: string;

  @Column({ length: 50, nullable: true })
  primaryContactPhone: string;

  @Column({ length: 255, nullable: true })
  primaryContactEmail: string;

  // ===== Расписание =====

  @Column({ type: "jsonb", nullable: true })
  workingHours: WeeklySchedule;

  @Column({ default: false })
  is24Hours: boolean;

  @Column({ type: "jsonb", default: [] })
  holidays: {
    date: string; // "2024-01-01"
    name: string;
    isOpen: boolean;
    schedule?: DaySchedule;
  }[];

  @Column({ length: 50, default: "Asia/Tashkent" })
  timezone: string;

  // ===== Характеристики =====

  @Column({ type: "jsonb", default: {} })
  characteristics: LocationCharacteristics;

  // ===== Финансы =====

  @Column({
    type: "enum",
    enum: ContractType,
    default: ContractType.RENT,
  })
  contractType: ContractType;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  monthlyRent: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  revenueSharePercent: number;

  @Column({ length: 10, default: "UZS" })
  currency: string;

  // ===== Активный контракт =====

  @Column({ type: "uuid", nullable: true })
  activeContractId: string;

  // ===== Статистика =====

  @Column({ type: "jsonb", default: {} })
  stats: LocationStats;

  @Column({ default: 0 })
  machineCount: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ default: 0 })
  totalTransactions: number;

  // ===== Рейтинги =====

  @Column({ type: "decimal", precision: 3, scale: 2, nullable: true })
  rating: number; // Общий рейтинг 1-5

  @Column({ default: 0 })
  ratingCount: number;

  // ===== Приоритет и оценка =====

  @Column({ type: "int", default: 5 })
  priorityScore: number; // 1-10

  @Column({ type: "int", nullable: true })
  potentialScore: number; // 1-10

  @Column({ type: "int", nullable: true })
  riskScore: number; // 1-10

  // ===== Метаданные =====

  @Column({ type: "jsonb", default: {} })
  metadata: LocationMetadata;

  @Column({ type: "simple-array", nullable: true })
  tags: string[];

  // ===== Флаги =====

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVip: boolean; // VIP локация

  @Column({ default: false })
  requiresApproval: boolean; // Требует одобрения для действий

  @Column({ default: false })
  hasExclusivity: boolean; // Эксклюзивный контракт

  // ===== Multi-tenant =====

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  // ===== Ответственные =====

  @Column({ type: "uuid", nullable: true })
  managerId: string; // Менеджер по локации

  @Column({ type: "uuid", nullable: true })
  salesRepId: string; // Торговый представитель

  // ===== Связи =====

  @OneToMany(() => LocationContract, (contract) => contract.location)
  contracts: LocationContract[];

  @OneToMany(() => LocationZone, (zone) => zone.location)
  zones: LocationZone[];

  @OneToMany(() => LocationEvent, (event) => event.location)
  events: LocationEvent[];

  @OneToMany(() => LocationNote, (note) => note.location)
  notes: LocationNote[];

  // ===== Timestamps =====

  @Column({ type: "timestamp", nullable: true })
  activatedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  lastVisitAt: Date;

  @Column({ type: "timestamp", nullable: true })
  nextVisitAt: Date;

  // ===== Hooks =====

  @BeforeInsert()
  generateCode() {
    if (!this.code) {
      const cityCode = (this.city || "XXX").substring(0, 3).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.code = `LOC-${cityCode}-${random}`;
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  updateFullAddress() {
    if (this.address && !this.address.fullAddress) {
      const parts = [
        this.address.city,
        this.address.district,
        this.address.street,
        this.address.building,
      ].filter(Boolean);
      this.address.fullAddress = parts.join(", ");
    }
  }
}

// ============================================================================
// BARREL RE-EXPORTS for backward compatibility
// ============================================================================

export * from "./location-enums";
export * from "./location-interfaces";
export * from "./location-zone.entity";
export * from "./location-contract.entity";
export * from "./location-event.entity";
export * from "./location-note.entity";
export * from "./location-visit.entity";
export * from "./location-constants";
