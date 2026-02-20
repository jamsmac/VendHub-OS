import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateOpeningBalanceDto {
  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Warehouse ID', format: 'uuid' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ description: 'Balance date', example: '2025-01-01' })
  @IsDateString()
  balanceDate: string;

  @ApiProperty({ description: 'Quantity', example: 100.5 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit of measurement', example: 'pcs', default: 'pcs' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  unit?: string;

  @ApiProperty({ description: 'Unit cost', example: 15000.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost: number;

  @ApiPropertyOptional({ description: 'Total cost (auto-calculated if not provided)', example: 1500000.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalCost?: number;

  @ApiPropertyOptional({ description: 'Batch number' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'Expiry date', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Location (shelf/zone)' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  location?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkCreateOpeningBalanceDto {
  @ApiProperty({ description: 'Array of opening balance records', type: [CreateOpeningBalanceDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateOpeningBalanceDto)
  balances: CreateOpeningBalanceDto[];

  @ApiPropertyOptional({ description: 'Import source (manual, excel, csv)', example: 'excel' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  importSource?: string;
}

export class UpdateOpeningBalanceDto extends PartialType(CreateOpeningBalanceDto) {}

export class QueryOpeningBalancesDto {
  @ApiPropertyOptional({ description: 'Filter by product ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Filter by warehouse ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Filter by applied status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isApplied?: boolean;

  @ApiPropertyOptional({ description: 'Filter from date', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ApplyAllDto {
  @ApiProperty({ description: 'Balance date to apply', example: '2025-01-01' })
  @IsDateString()
  balanceDate: string;
}
