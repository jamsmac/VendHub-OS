/**
 * Refund and Transaction Query DTOs
 * Validation for refund initiation and transaction listing
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RefundReason } from '../entities/payment-refund.entity';
import {
  PaymentProvider,
  PaymentTransactionStatus,
} from '../entities/payment-transaction.entity';

/**
 * DTO for initiating a refund
 */
export class InitiateRefundDto {
  @ApiProperty({
    description: 'UUID of the payment transaction to refund',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  paymentTransactionId: string;

  @ApiPropertyOptional({
    description: 'Amount to refund in UZS (partial refund). If omitted, full refund is processed.',
    example: 5000,
    minimum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  amount?: number;

  @ApiProperty({
    description: 'Reason for the refund',
    enum: RefundReason,
    example: RefundReason.CUSTOMER_REQUEST,
  })
  @IsEnum(RefundReason)
  reason: RefundReason;

  @ApiPropertyOptional({
    description: 'Additional note explaining the refund reason',
    example: 'Customer did not receive product from machine',
  })
  @IsOptional()
  @IsString()
  reasonNote?: string;
}

/**
 * DTO for querying transactions with pagination and filters
 */
export class QueryTransactionsDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by payment provider',
    enum: PaymentProvider,
    example: PaymentProvider.PAYME,
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiPropertyOptional({
    description: 'Filter by transaction status',
    enum: PaymentTransactionStatus,
    example: PaymentTransactionStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(PaymentTransactionStatus)
  status?: PaymentTransactionStatus;

  @ApiPropertyOptional({
    description: 'Filter transactions from this date (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter transactions up to this date (ISO 8601)',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by order UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Filter by machine UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  machineId?: string;
}
