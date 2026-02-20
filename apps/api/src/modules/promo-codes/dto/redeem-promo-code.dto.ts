/**
 * Redeem / Validate Promo Code DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class RedeemPromoCodeDto {
  @ApiProperty({ description: 'Promo code to redeem', example: 'SUMMER2024' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Client user UUID who is redeeming' })
  @IsUUID()
  clientUserId: string;

  @ApiPropertyOptional({ description: 'Order UUID linked to this redemption' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Order amount before discount (UZS)', example: 120000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderAmount?: number;
}

export class ValidatePromoCodeDto {
  @ApiProperty({ description: 'Promo code to validate', example: 'SUMMER2024' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Client user UUID for per-user limit check' })
  @IsOptional()
  @IsUUID()
  clientUserId?: string;

  @ApiPropertyOptional({ description: 'Order amount to check minimum threshold (UZS)', example: 80000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderAmount?: number;
}
