import { Entity, Column, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum PurchaseStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  PARTIAL = 'PARTIAL',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

@Entity('purchase_history')
@Index(['organizationId'])
@Index(['supplierId'])
@Index(['productId'])
@Index(['warehouseId'])
@Index(['purchaseDate'])
@Index(['status'])
@Index(['invoiceNumber'])
export class PurchaseHistory extends BaseEntity {
  @ApiProperty({ description: 'Organization ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Purchase date' })
  @Column({ type: 'date' })
  purchaseDate: Date;

  @ApiPropertyOptional({ description: 'Invoice number' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  invoiceNumber: string | null;

  @ApiPropertyOptional({ description: 'Supplier/Contractor ID', format: 'uuid' })
  @Column({ type: 'uuid', nullable: true })
  supplierId: string | null;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiPropertyOptional({ description: 'Warehouse ID', format: 'uuid' })
  @Column({ type: 'uuid', nullable: true })
  warehouseId: string | null;

  @ApiProperty({ description: 'Quantity', example: 100.5 })
  @Column({ type: 'decimal', precision: 15, scale: 3 })
  quantity: number;

  @ApiProperty({ description: 'Unit of measurement', example: 'pcs' })
  @Column({ type: 'varchar', length: 20, default: 'pcs' })
  unit: string;

  @ApiProperty({ description: 'Unit price', example: 15000.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @ApiProperty({ description: 'VAT rate (Uzbekistan standard: 12%)', example: 12 })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 12 })
  vatRate: number;

  @ApiProperty({ description: 'VAT amount', example: 180000.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  vatAmount: number;

  @ApiProperty({ description: 'Total amount including VAT', example: 1680000.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Batch number' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  batchNumber: string | null;

  @ApiPropertyOptional({ description: 'Production date' })
  @Column({ type: 'date', nullable: true })
  productionDate: Date | null;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @Column({ type: 'date', nullable: true })
  expiryDate: Date | null;

  @ApiProperty({ description: 'Purchase status', enum: PurchaseStatus })
  @Column({ type: 'enum', enum: PurchaseStatus, default: PurchaseStatus.PENDING })
  status: PurchaseStatus;

  @ApiPropertyOptional({ description: 'Delivery date' })
  @Column({ type: 'date', nullable: true })
  deliveryDate: Date | null;

  @ApiPropertyOptional({ description: 'Delivery note number' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  deliveryNoteNumber: string | null;

  @ApiProperty({ description: 'Currency code', example: 'UZS' })
  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @ApiProperty({ description: 'Exchange rate to UZS', example: 1 })
  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
  exchangeRate: number;

  @ApiPropertyOptional({ description: 'Payment method' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod: string | null;

  @ApiPropertyOptional({ description: 'Payment date' })
  @Column({ type: 'date', nullable: true })
  paymentDate: Date | null;

  @ApiPropertyOptional({ description: 'Import source (manual, excel, csv)' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  importSource: string | null;

  @ApiPropertyOptional({ description: 'Import session ID', format: 'uuid' })
  @Column({ type: 'uuid', nullable: true })
  importSessionId: string | null;

  @ApiPropertyOptional({ description: 'Notes' })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Additional metadata', default: {} })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}
