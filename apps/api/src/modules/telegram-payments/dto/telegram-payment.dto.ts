/**
 * Telegram Payment DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  IsOptional,
  Min,
  IsObject,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TelegramPaymentStatus,
  TelegramPaymentProvider,
  TelegramPaymentCurrency,
} from '../telegram-payments.constants';

// ============================================================================
// REQUEST DTOs
// ============================================================================

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Order ID' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: TelegramPaymentProvider })
  @IsEnum(TelegramPaymentProvider)
  provider: TelegramPaymentProvider;

  @ApiProperty({ enum: TelegramPaymentCurrency })
  @IsEnum(TelegramPaymentCurrency)
  currency: TelegramPaymentCurrency;

  @ApiProperty({ description: 'Telegram user ID' })
  @IsInt()
  telegramUserId: number;

  @ApiPropertyOptional({ description: 'Telegram chat ID' })
  @IsInt()
  @IsOptional()
  telegramChatId?: number;

  @ApiPropertyOptional({ description: 'Custom description' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateInvoiceLinkDto {
  @ApiProperty({ description: 'Payment title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Payment description' })
  @IsString()
  description: string;

  @ApiProperty({ enum: TelegramPaymentProvider })
  @IsEnum(TelegramPaymentProvider)
  provider: TelegramPaymentProvider;

  @ApiProperty({ enum: TelegramPaymentCurrency })
  @IsEnum(TelegramPaymentCurrency)
  currency: TelegramPaymentCurrency;

  @ApiProperty({ description: 'Amount in smallest currency unit' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: 'Custom payload' })
  @IsString()
  @IsOptional()
  payload?: string;
}

export class PreCheckoutQueryDto {
  @ApiProperty({ description: 'Pre-checkout query ID' })
  @IsString()
  preCheckoutQueryId: string;

  @ApiProperty({ description: 'Telegram user ID' })
  @IsInt()
  telegramUserId: number;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Total amount in smallest units' })
  @IsInt()
  totalAmount: number;

  @ApiProperty({ description: 'Invoice payload' })
  @IsString()
  invoicePayload: string;

  @ApiPropertyOptional({ description: 'Shipping option ID' })
  @IsString()
  @IsOptional()
  shippingOptionId?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  orderInfo?: {
    name?: string;
    phoneNumber?: string;
    email?: string;
    shippingAddress?: {
      countryCode: string;
      state: string;
      city: string;
      streetLine1: string;
      streetLine2?: string;
      postCode: string;
    };
  };
}

export class SuccessfulPaymentDto {
  @ApiProperty({ description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Total amount in smallest units' })
  @IsInt()
  totalAmount: number;

  @ApiProperty({ description: 'Invoice payload' })
  @IsString()
  invoicePayload: string;

  @ApiProperty({ description: 'Telegram payment charge ID' })
  @IsString()
  telegramPaymentChargeId: string;

  @ApiProperty({ description: 'Provider payment charge ID' })
  @IsString()
  providerPaymentChargeId: string;

  @ApiPropertyOptional({ description: 'Shipping option ID' })
  @IsString()
  @IsOptional()
  shippingOptionId?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  orderInfo?: {
    name?: string;
    phoneNumber?: string;
    email?: string;
  };
}

export class RefundPaymentDto {
  @ApiProperty({ description: 'Payment ID' })
  @IsUUID()
  paymentId: string;

  @ApiPropertyOptional({ description: 'Partial refund amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Refund reason' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class PaymentFilterDto {
  @ApiPropertyOptional({ enum: TelegramPaymentStatus })
  @IsEnum(TelegramPaymentStatus)
  @IsOptional()
  status?: TelegramPaymentStatus;

  @ApiPropertyOptional({ enum: TelegramPaymentProvider })
  @IsEnum(TelegramPaymentProvider)
  @IsOptional()
  provider?: TelegramPaymentProvider;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class InvoiceResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  paymentId: string;

  @ApiPropertyOptional()
  invoiceLink?: string;

  @ApiPropertyOptional()
  message?: string;
}

export class PaymentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional()
  orderId?: string;

  @ApiProperty({ enum: TelegramPaymentProvider })
  provider: TelegramPaymentProvider;

  @ApiProperty({ enum: TelegramPaymentStatus })
  status: TelegramPaymentStatus;

  @ApiProperty({ enum: TelegramPaymentCurrency })
  currency: TelegramPaymentCurrency;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  telegramUserId: number;

  @ApiPropertyOptional()
  telegramPaymentChargeId?: string;

  @ApiPropertyOptional()
  providerPaymentChargeId?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  failureReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  refundedAt?: Date;

  @ApiPropertyOptional()
  refundedAmount?: number;
}

export class PaymentListDto {
  @ApiProperty({ type: [PaymentDto] })
  items: PaymentDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class PaymentStatsDto {
  @ApiProperty()
  totalPayments: number;

  @ApiProperty()
  completedPayments: number;

  @ApiProperty()
  failedPayments: number;

  @ApiProperty()
  refundedPayments: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  refundedAmount: number;

  @ApiProperty()
  netAmount: number;

  @ApiProperty()
  byProvider: Record<TelegramPaymentProvider, {
    count: number;
    amount: number;
  }>;
}

export class WebhookResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  message?: string;
}
