import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsObject,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '../entities/warehouse.entity';

export class CreateStockMovementDto {
  @ApiProperty({ description: 'Organization ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Source warehouse ID (null for receipts)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  fromWarehouseId?: string;

  @ApiPropertyOptional({ description: 'Destination warehouse ID (null for dispatches)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  toWarehouseId?: string;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity to move', example: 100 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit of measure', example: 'pcs', default: 'pcs', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unitOfMeasure?: string;

  @ApiProperty({ description: 'Movement type', enum: StockMovementType })
  @IsEnum(StockMovementType)
  @IsNotEmpty()
  type: StockMovementType;

  @ApiPropertyOptional({ description: 'Reference number for tracking', example: 'MOV-2024-001', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Cost of the movement', example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Extra metadata', default: {} })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
