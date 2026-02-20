import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDate,
  MaxLength,
  Min,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UnitOfMeasure } from '../entities/product.entity';

export class CreateBatchDto {
  @ApiProperty({ example: 'BATCH-2025-001', description: 'Unique batch number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  batchNumber: string;

  @ApiProperty({ example: 1000, description: 'Quantity received' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ enum: UnitOfMeasure, description: 'Unit of measure' })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  unitOfMeasure?: UnitOfMeasure;

  @ApiPropertyOptional({ description: 'Purchase price per unit in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({ description: 'Total cost of the batch in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number;

  @ApiPropertyOptional({ description: 'UUID of the supplier' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Supplier-assigned batch number' })
  @IsOptional()
  @IsString()
  supplierBatchNumber?: string;

  @ApiPropertyOptional({ description: 'Invoice number for this batch' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Date of manufacture' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  manufactureDate?: Date;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @ApiPropertyOptional({ description: 'Storage location (shelf/bin)' })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
