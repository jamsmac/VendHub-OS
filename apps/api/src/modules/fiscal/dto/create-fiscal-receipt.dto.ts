/**
 * Create Fiscal Receipt DTO
 * For creating a fiscal receipt (sale or refund) through the OFD provider.
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { FiscalReceiptType } from "../entities/fiscal.entity";

// ============================================================================
// NESTED DTOs
// ============================================================================

export class FiscalReceiptItemDto {
  @ApiProperty({
    description: "Product/item name",
    example: "Coca-Cola 0.5L",
  })
  @IsString()
  @MaxLength(500)
  name: string;

  @ApiProperty({
    description: "IKPU code (Uzbekistan product classification code)",
    example: "06111001001000000",
  })
  @IsString()
  @MaxLength(20)
  ikpu_code: string;

  @ApiPropertyOptional({
    description: "Package code",
    example: "1234567",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  package_code?: string;

  @ApiProperty({
    description: "Item quantity",
    example: 1,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({
    description: "Price per unit in tiyin (1 UZS = 100 tiyin)",
    example: 1500000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: "VAT rate percentage (e.g. 12 for 12%)",
    example: 12,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  vat_rate: number;

  @ApiProperty({
    description: "Unit of measurement",
    example: "pcs",
  })
  @IsString()
  @MaxLength(20)
  unit: string;
}

export class FiscalReceiptPaymentDto {
  @ApiProperty({
    description: "Cash payment amount in tiyin",
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  cash: number;

  @ApiProperty({
    description: "Card payment amount in tiyin",
    example: 1500000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  card: number;

  @ApiPropertyOptional({
    description: "Other payment method amount in tiyin (e.g. Payme, Click)",
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  other?: number;
}

export class FiscalReceiptMetadataDto {
  @ApiPropertyOptional({ description: "Vending machine ID" })
  @IsOptional()
  @IsUUID()
  machine_id?: string;

  @ApiPropertyOptional({ description: "Location ID" })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiPropertyOptional({ description: "Operator/user ID" })
  @IsOptional()
  @IsUUID()
  operator_id?: string;

  @ApiPropertyOptional({
    description: "Additional comment or note",
    example: "Automatic receipt from vending machine",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

// ============================================================================
// MAIN DTO
// ============================================================================

export class CreateFiscalReceiptDto {
  @ApiProperty({
    description: "Fiscal device ID to issue receipt on",
  })
  @IsUUID()
  device_id: string;

  @ApiPropertyOptional({
    description: "Associated order ID",
  })
  @IsOptional()
  @IsUUID()
  order_id?: string;

  @ApiPropertyOptional({
    description: "Associated transaction ID",
  })
  @IsOptional()
  @IsUUID()
  transaction_id?: string;

  @ApiProperty({
    description: "Receipt type: sale or refund",
    enum: FiscalReceiptType,
    example: FiscalReceiptType.SALE,
  })
  @IsEnum(FiscalReceiptType)
  type: FiscalReceiptType;

  @ApiProperty({
    description: "Receipt line items",
    type: [FiscalReceiptItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FiscalReceiptItemDto)
  items: FiscalReceiptItemDto[];

  @ApiProperty({
    description: "Payment breakdown",
    type: FiscalReceiptPaymentDto,
  })
  @ValidateNested()
  @Type(() => FiscalReceiptPaymentDto)
  payment: FiscalReceiptPaymentDto;

  @ApiPropertyOptional({
    description: "Additional metadata (machine, location, operator)",
    type: FiscalReceiptMetadataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FiscalReceiptMetadataDto)
  metadata?: FiscalReceiptMetadataDto;
}
