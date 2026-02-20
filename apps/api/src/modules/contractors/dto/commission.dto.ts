/**
 * Commission DTOs
 * Calculate, query, and manage commission calculations
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '../entities/contract.entity';

// ============================================================================
// CALCULATE COMMISSION DTO
// ============================================================================

export class CalculateCommissionDto {
  @ApiProperty({ description: 'Contract ID' })
  @IsUUID()
  contractId: string;

  @ApiProperty({ description: 'Period start date (inclusive)' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Period end date (inclusive)' })
  @IsDateString()
  periodEnd: string;
}

// ============================================================================
// QUERY COMMISSIONS DTO
// ============================================================================

export class QueryCommissionsDto {
  @ApiPropertyOptional({ description: 'Filter by contract ID' })
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @ApiPropertyOptional({ description: 'Filter by payment status', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Date from (inclusive)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to (inclusive)' })
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

// ============================================================================
// MARK COMMISSION PAID DTO
// ============================================================================

export class MarkCommissionPaidDto {
  @ApiProperty({ description: 'Payment transaction ID' })
  @IsUUID()
  paymentTransactionId: string;

  @ApiPropertyOptional({ description: 'Notes about the payment' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
