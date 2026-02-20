/**
 * Payment DTOs
 * Входные и выходные DTO для платежей по инвойсам
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BillingPaymentMethod,
  BillingPaymentStatus,
} from '../entities/billing.entity';

// ============================================================================
// CREATE PAYMENT DTO
// ============================================================================

export class CreatePaymentDto {
  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Payment method', enum: BillingPaymentMethod })
  @IsEnum(BillingPaymentMethod)
  paymentMethod: BillingPaymentMethod;

  @ApiProperty({ description: 'Payment date' })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ description: 'Reference number (bank transfer ID, receipt number, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// ============================================================================
// QUERY PAYMENTS DTO
// ============================================================================

export class QueryPaymentsDto {
  @ApiPropertyOptional({ description: 'Filter by invoice ID' })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional({ description: 'Filter by payment status', enum: BillingPaymentStatus })
  @IsOptional()
  @IsEnum(BillingPaymentStatus)
  status?: BillingPaymentStatus;

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
  @Type(() => Number)
  limit?: number = 20;
}
