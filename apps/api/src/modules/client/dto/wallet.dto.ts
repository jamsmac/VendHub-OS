/**
 * Wallet DTOs
 * Validation and Swagger docs for wallet operations
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

export class TopUpWalletDto {
  @ApiProperty({
    description: 'Amount to top up in UZS (minimum 100)',
    example: 10000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiPropertyOptional({
    description: 'Optional description for the top-up',
    example: 'Manual top-up via admin panel',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class WalletAdjustmentDto {
  @ApiProperty({
    description: 'Adjustment amount (positive for credit, negative for debit)',
    example: -5000,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Reason for the manual adjustment',
    example: 'Refund for defective product',
  })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional description',
    example: 'Customer complaint #1234',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
