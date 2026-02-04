/**
 * Reconciliation DTOs
 * Входные и выходные DTO для модуля сверки
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsInt,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ReconciliationSource,
  ReconciliationStatus,
  MismatchType,
  HwImportSource,
} from '../entities/reconciliation.entity';

// ============================================================================
// CREATE RECONCILIATION RUN DTO
// ============================================================================

export class CreateReconciliationRunDto {
  @ApiProperty({ description: 'Start date for reconciliation period' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ description: 'End date for reconciliation period' })
  @IsDateString()
  dateTo: string;

  @ApiProperty({
    description: 'Data sources to reconcile',
    enum: ReconciliationSource,
    isArray: true,
    example: ['hw', 'payme'],
  })
  @IsArray()
  @IsEnum(ReconciliationSource, { each: true })
  sources: ReconciliationSource[];

  @ApiPropertyOptional({
    description: 'Machine IDs to filter (optional, all if empty)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  machineIds?: string[];

  @ApiPropertyOptional({
    description: 'Time tolerance in seconds for matching (default 300)',
    default: 300,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  timeTolerance?: number;

  @ApiPropertyOptional({
    description: 'Amount tolerance as decimal fraction (default 0.01)',
    default: 0.01,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  amountTolerance?: number;
}

// ============================================================================
// RESOLVE MISMATCH DTO
// ============================================================================

export class ResolveMismatchDto {
  @ApiProperty({ description: 'Resolution notes explaining how mismatch was resolved' })
  @IsString()
  @MaxLength(2000)
  resolutionNotes: string;
}

// ============================================================================
// IMPORT HW SALES DTO
// ============================================================================

export class ImportHwSaleItemDto {
  @ApiProperty({ description: 'Sale date and time' })
  @IsDateString()
  saleDate: string;

  @ApiProperty({ description: 'Machine code' })
  @IsString()
  @MaxLength(50)
  machineCode: string;

  @ApiProperty({ description: 'Sale amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Order number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  orderNumber?: string;

  @ApiPropertyOptional({ description: 'Product name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  productName?: string;

  @ApiPropertyOptional({ description: 'Product code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  productCode?: string;

  @ApiPropertyOptional({ description: 'Quantity', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class ImportHwSalesDto {
  @ApiProperty({
    description: 'Array of HW sales to import',
    type: [ImportHwSaleItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportHwSaleItemDto)
  sales: ImportHwSaleItemDto[];

  @ApiProperty({
    description: 'Import source type',
    enum: HwImportSource,
  })
  @IsEnum(HwImportSource)
  importSource: HwImportSource;

  @ApiPropertyOptional({ description: 'Name of imported file' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  importFilename?: string;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class QueryReconciliationRunsDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: ReconciliationStatus })
  @IsOptional()
  @IsEnum(ReconciliationStatus)
  status?: ReconciliationStatus;

  @ApiPropertyOptional({ description: 'Filter from date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class QueryMismatchesDto {
  @ApiPropertyOptional({ description: 'Filter by mismatch type', enum: MismatchType })
  @IsOptional()
  @IsEnum(MismatchType)
  mismatchType?: MismatchType;

  @ApiPropertyOptional({ description: 'Filter by resolution status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isResolved?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
