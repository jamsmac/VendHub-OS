import { Entity, Column, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('stock_opening_balances')
@Index(['organizationId'])
@Index(['productId'])
@Index(['warehouseId'])
@Index(['balanceDate'])
@Index(['isApplied'])
export class StockOpeningBalance extends BaseEntity {
  @ApiProperty({ description: 'Organization ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiProperty({ description: 'Warehouse ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  warehouseId: string;

  @ApiProperty({ description: 'Balance date' })
  @Column({ type: 'date' })
  balanceDate: Date;

  @ApiProperty({ description: 'Quantity', example: 100.5 })
  @Column({ type: 'decimal', precision: 15, scale: 3 })
  quantity: number;

  @ApiProperty({ description: 'Unit of measurement', example: 'pcs' })
  @Column({ type: 'varchar', length: 20, default: 'pcs' })
  unit: string;

  @ApiProperty({ description: 'Unit cost', example: 15000.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitCost: number;

  @ApiProperty({ description: 'Total cost', example: 1500000.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalCost: number;

  @ApiPropertyOptional({ description: 'Batch number' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  batchNumber: string | null;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @Column({ type: 'date', nullable: true })
  expiryDate: Date | null;

  @ApiPropertyOptional({ description: 'Location (shelf/zone)' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @ApiProperty({ description: 'Whether the balance has been applied', default: false })
  @Column({ type: 'boolean', default: false })
  isApplied: boolean;

  @ApiPropertyOptional({ description: 'Timestamp when balance was applied' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  appliedAt: Date | null;

  @ApiPropertyOptional({ description: 'ID of user who applied the balance', format: 'uuid' })
  @Column({ type: 'uuid', nullable: true })
  appliedByUserId: string | null;

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
