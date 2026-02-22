/**
 * Validated DTOs for transaction operations
 * Replaces unvalidated interfaces from transactions.service.ts
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
  IsArray,
  IsUUID,
  IsDateString,
  IsInt,
  IsIn,
  Min,
  Max,
  Length,
  ValidateNested,
  IsPositive,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  PaymentMethod,
  TransactionStatus,
} from "../entities/transaction.entity";

const DISPENSE_STATUSES = [
  "pending",
  "dispensing",
  "dispensed",
  "failed",
  "partial",
] as const;
type DispenseStatus = (typeof DISPENSE_STATUSES)[number];

// ============================================================================
// TRANSACTION ITEM
// ============================================================================

class TransactionItemDto {
  @ApiProperty({ description: "Product ID" })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: "Slot number in machine" })
  @IsInt()
  @Min(0)
  slotNumber: number;

  @ApiProperty({ description: "Quantity" })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: "Unit price" })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: "Product name" })
  @IsString()
  @Length(1, 255)
  productName: string;

  @ApiPropertyOptional({ description: "Product SKU" })
  @IsOptional()
  @IsString()
  productSku?: string;
}

// ============================================================================
// CREATE TRANSACTION
// ============================================================================

export class CreateTransactionBodyDto {
  @ApiProperty({ description: "Machine ID" })
  @IsUUID()
  machineId: string;

  @ApiPropertyOptional({ description: "Location ID" })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: "Session ID" })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: "Customer phone" })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: "Customer Telegram ID" })
  @IsOptional()
  @IsString()
  customerTelegramId?: string;

  @ApiProperty({ description: "Transaction items", type: [TransactionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];

  @ApiPropertyOptional({ description: "Currency code (default: UZS)" })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}

// ============================================================================
// PROCESS PAYMENT
// ============================================================================

export class ProcessPaymentBodyDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: "Payment amount" })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: "Currency code" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: "Provider transaction ID" })
  @IsOptional()
  @IsString()
  providerTransactionId?: string;

  @ApiPropertyOptional({ description: "Provider data" })
  @IsOptional()
  @IsObject()
  providerData?: Record<string, unknown>;
}

// ============================================================================
// DISPENSE RESULT
// ============================================================================

export class DispenseResultBodyDto {
  @ApiProperty({ description: "Transaction item ID" })
  @IsUUID()
  itemId: string;

  @ApiProperty({ enum: DISPENSE_STATUSES })
  @IsIn(DISPENSE_STATUSES)
  status: DispenseStatus;

  @ApiProperty({ description: "Dispensed quantity" })
  @IsInt()
  @Min(0)
  dispensedQuantity: number;

  @ApiPropertyOptional({ description: "Error code" })
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiPropertyOptional({ description: "Error message" })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

// ============================================================================
// CANCEL TRANSACTION
// ============================================================================

export class CancelTransactionDto {
  @ApiProperty({ description: "Cancellation reason" })
  @IsString()
  @Length(1, 500)
  reason: string;
}

// ============================================================================
// REFUND
// ============================================================================

export class CreateRefundDto {
  @ApiProperty({ description: "Refund amount" })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: "Refund reason" })
  @IsString()
  @Length(1, 500)
  reason: string;
}

export class ProcessRefundDto {
  @ApiProperty({ description: "Refund success" })
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({ description: "Reference number" })
  @IsOptional()
  @IsString()
  referenceNumber?: string;
}

// ============================================================================
// QUERY TRANSACTIONS
// ============================================================================

// ============================================================================
// FISCAL DATA
// ============================================================================

export class FiscalDataDto {
  @ApiPropertyOptional({ description: "Fiscal receipt number" })
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @ApiPropertyOptional({ description: "Fiscal sign" })
  @IsOptional()
  @IsString()
  fiscalSign?: string;

  @ApiPropertyOptional({ description: "QR code data" })
  @IsOptional()
  @IsString()
  qrCode?: string;

  @ApiPropertyOptional({ description: "OFD name (e.g. Soliq)" })
  @IsOptional()
  @IsString()
  ofdName?: string;
}

// ============================================================================
// QUERY TRANSACTIONS
// ============================================================================

export class QueryTransactionsBodyDto {
  @ApiPropertyOptional({ description: "Machine ID" })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: "Location ID" })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: "Operator ID" })
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional({
    description: "Filter by statuses",
    enum: TransactionStatus,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TransactionStatus, { each: true })
  status?: TransactionStatus[];

  @ApiPropertyOptional({
    description: "Filter by payment methods",
    enum: PaymentMethod,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  paymentMethod?: PaymentMethod[];

  @ApiPropertyOptional({ description: "Start date" })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: "End date" })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: "Minimum amount" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: "Maximum amount" })
  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @ApiPropertyOptional({ description: "Has error" })
  @IsOptional()
  @IsBoolean()
  hasError?: boolean;

  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "Items per page", default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: "Sort field" })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ["ASC", "DESC"], default: "DESC" })
  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC";
}
