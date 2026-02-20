import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  Length,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseHistoryDto {
  @ApiProperty({ description: 'Purchase date', example: '2025-01-15' })
  @IsDateString()
  purchaseDate: string;

  @ApiPropertyOptional({ description: 'Invoice number' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Supplier/Contractor ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: 'Warehouse ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiProperty({ description: 'Quantity', example: 100 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit of measurement', example: 'pcs', default: 'pcs' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  unit?: string;

  @ApiProperty({ description: 'Unit price', example: 15000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'VAT rate (%)', example: 12, default: 12 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatRate?: number;

  @ApiPropertyOptional({ description: 'Batch number' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'Production date', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  productionDate?: string;

  @ApiPropertyOptional({ description: 'Expiry date', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'UZS', default: 'UZS' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Exchange rate to UZS', example: 1, default: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkCreatePurchaseHistoryDto {
  @ApiProperty({ description: 'Array of purchase records', type: [CreatePurchaseHistoryDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseHistoryDto)
  purchases: CreatePurchaseHistoryDto[];

  @ApiPropertyOptional({ description: 'Import source (manual, excel, csv)', example: 'excel' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  importSource?: string;
}

export class UpdatePurchaseHistoryDto extends PartialType(CreatePurchaseHistoryDto) {}

export class ReceivePurchaseDto {
  @ApiPropertyOptional({ description: 'Delivery note number' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  deliveryNoteNumber?: string;

  @ApiPropertyOptional({ description: 'Delivery date', example: '2025-01-20' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnPurchaseDto {
  @ApiProperty({ description: 'Return reason' })
  @IsString()
  @Length(1, 500)
  reason: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
