import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsObject,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryBatchDto {
  @ApiProperty({ description: 'Organization ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Warehouse ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Batch number', example: 'BATCH-2024-001', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  batchNumber: string;

  @ApiProperty({ description: 'Initial quantity', example: 500 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit of measure', example: 'pcs', default: 'pcs', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unitOfMeasure?: string;

  @ApiPropertyOptional({ description: 'Cost per unit in UZS', example: 15000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @ApiPropertyOptional({ description: 'Batch expiry date (ISO 8601)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Extra metadata', default: {} })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
