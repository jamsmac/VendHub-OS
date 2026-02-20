/**
 * Contractor Entity
 * Подрядчики и их счета
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum ServiceType {
  MAINTENANCE = 'maintenance',
  CLEANING = 'cleaning',
  DELIVERY = 'delivery',
  REPAIR = 'repair',
  SECURITY = 'security',
  INSTALLATION = 'installation',
  CONSULTING = 'consulting',
  LOCATION_OWNER = 'location_owner',
  SUPPLIER = 'supplier',
  OTHER = 'other',
}

export enum ContractorType {
  CLIENT = 'client',
  SUPPLIER = 'supplier',
  PARTNER = 'partner',
  LOCATION_OWNER = 'location_owner',
}

export enum InvoiceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

// ============================================================================
// CONTRACTOR ENTITY
// ============================================================================

@Entity('contractors')
@Index(['organizationId', 'isActive'])
@Index(['serviceType'])
export class Contractor extends BaseEntity {
  @Column()
  @Index()
  organizationId: string;

  @Column({ length: 255 })
  companyName: string;

  @Column({ length: 200, nullable: true })
  contactPerson: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({
    type: 'enum',
    enum: ServiceType,
  })
  serviceType: ServiceType;

  @Column({ type: 'date', nullable: true })
  contractStart: Date;

  @Column({ type: 'date', nullable: true })
  contractEnd: Date;

  @Column({ type: 'text', nullable: true })
  contractNumber: string;

  @Column({ type: 'text', nullable: true })
  paymentTerms: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating: number; // 1.00 - 5.00

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: true })
  isActive: boolean;

  // Bank details (legacy JSONB — prefer individual columns below)
  @Column({ type: 'jsonb', nullable: true })
  bankDetails: {
    bankName: string;
    accountNumber: string;
    mfo?: string;
    inn?: string;
    oked?: string;
  };

  // ---- Enhanced fields ----

  @Column({ length: 100, nullable: true })
  shortName: string;

  @Column({ length: 9, nullable: true })
  inn: string;

  @Column({ length: 10, nullable: true })
  oked: string;

  @Column({ length: 5, nullable: true })
  mfo: string;

  @Column({ length: 30, nullable: true })
  bankAccount: string;

  @Column({ length: 200, nullable: true })
  bankName: string;

  @Column({ type: 'text', nullable: true })
  legalAddress: string;

  @Column({ type: 'text', nullable: true })
  actualAddress: string;

  @Column({ length: 200, nullable: true })
  directorName: string;

  @Column({ length: 100, nullable: true })
  directorPosition: string;

  @Column({ default: false })
  isVatPayer: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  vatRate: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  creditLimit: number;

  @Column({
    type: 'enum',
    enum: ContractorType,
    default: ContractorType.SUPPLIER,
  })
  type: ContractorType;

  // Relations
  @OneToMany(() => ContractorInvoice, invoice => invoice.contractor)
  invoices: ContractorInvoice[];

  @OneToMany('Contract', 'contractor')
  contracts: import('./contract.entity').Contract[];

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}

// ============================================================================
// CONTRACTOR INVOICE ENTITY
// ============================================================================

@Entity('contractor_invoices')
@Index(['organizationId', 'status'])
@Index(['contractorId'])
@Index(['dueDate'])
export class ContractorInvoice extends BaseEntity {
  @Column()
  @Index()
  organizationId: string;

  @Column()
  contractorId: string;

  @ManyToOne(() => Contractor, c => c.invoices)
  @JoinColumn({ name: 'contractor_id' })
  contractor: Contractor;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'date', nullable: true })
  paidDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Approval
  @Column({ nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  // Attachments
  @Column({ type: 'simple-array', nullable: true })
  attachmentUrls: string[];

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
