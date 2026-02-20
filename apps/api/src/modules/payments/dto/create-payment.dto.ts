/**
 * Payment Creation DTOs
 * Validation for creating payment transactions
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsUUID,
  IsEnum,
  IsOptional,
  IsUrl,
  Min,
} from 'class-validator';
import { PaymentProvider } from '../entities/payment-transaction.entity';

/**
 * DTO for creating a payment transaction (Payme / Click)
 */
export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment amount in UZS (minimum 100)',
    example: 5000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({
    description: 'Order UUID to pay for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({
    description: 'Payment provider (auto-detected from endpoint if omitted)',
    enum: PaymentProvider,
    example: PaymentProvider.PAYME,
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiPropertyOptional({
    description: 'Machine UUID (for vending machine payments)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({
    description: 'Client user UUID (for registered customers)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsUUID()
  clientUserId?: string;
}

/**
 * DTO for creating an Uzum Bank checkout session
 */
export class UzumCreateDto {
  @ApiProperty({
    description: 'Payment amount in UZS (minimum 100)',
    example: 15000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({
    description: 'Order UUID to pay for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({
    description: 'URL to redirect the customer after payment',
    example: 'https://vendhub.uz/payment/success',
  })
  @IsOptional()
  @IsUrl()
  returnUrl?: string;
}

/**
 * DTO for generating a QR payment code for vending machines
 */
export class GenerateQRDto {
  @ApiProperty({
    description: 'Payment amount in UZS (minimum 100)',
    example: 3000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({
    description: 'Machine UUID to generate QR for',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  machineId: string;
}
