/**
 * Warehouse Zone DTOs
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  ZoneType,
  ZoneStatus,
  StorageCondition,
} from '../entities/warehouse-zone.entity';

// ============================================================================
// WAREHOUSE ZONE DTOs
// ============================================================================

export class CreateWarehouseZoneDto {
  @ApiProperty({ example: 'A-01', description: 'Zone code' })
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiProperty({ description: 'Zone name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Zone description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ZoneType, default: ZoneType.STORAGE })
  @IsEnum(ZoneType)
  @IsOptional()
  zoneType?: ZoneType = ZoneType.STORAGE;

  @ApiProperty({ enum: StorageCondition, default: StorageCondition.AMBIENT })
  @IsEnum(StorageCondition)
  @IsOptional()
  storageCondition?: StorageCondition = StorageCondition.AMBIENT;

  @ApiPropertyOptional({ description: 'Floor/level number' })
  @IsInt()
  @Min(0)
  @IsOptional()
  floor?: number = 1;

  @ApiPropertyOptional({ description: 'Aisle identifier' })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  aisle?: string;

  @ApiPropertyOptional({ description: 'Total capacity' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalCapacity?: number;

  @ApiPropertyOptional({ description: 'Capacity unit' })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  capacityUnit?: string = 'units';

  @ApiPropertyOptional({ description: 'Minimum temperature (°C)' })
  @IsNumber()
  @IsOptional()
  minTemperature?: number;

  @ApiPropertyOptional({ description: 'Maximum temperature (°C)' })
  @IsNumber()
  @IsOptional()
  maxTemperature?: number;

  @ApiPropertyOptional({ description: 'Allowed product categories' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedCategories?: string[];

  @ApiPropertyOptional({ description: 'Excluded product categories' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedCategories?: string[];

  @ApiPropertyOptional({ description: 'Is pickable zone' })
  @IsBoolean()
  @IsOptional()
  isPickable?: boolean = true;

  @ApiPropertyOptional({ description: 'Pick priority' })
  @IsInt()
  @Min(0)
  @IsOptional()
  pickPriority?: number = 100;

  @ApiPropertyOptional({ description: 'FIFO enabled' })
  @IsBoolean()
  @IsOptional()
  fifoEnabled?: boolean = true;
}

export class UpdateWarehouseZoneDto extends PartialType(CreateWarehouseZoneDto) {
  @ApiPropertyOptional({ enum: ZoneStatus })
  @IsEnum(ZoneStatus)
  @IsOptional()
  status?: ZoneStatus;
}

export class ZoneQueryDto {
  @ApiPropertyOptional({ enum: ZoneType })
  @IsEnum(ZoneType)
  @IsOptional()
  zoneType?: ZoneType;

  @ApiPropertyOptional({ enum: ZoneStatus })
  @IsEnum(ZoneStatus)
  @IsOptional()
  status?: ZoneStatus;

  @ApiPropertyOptional({ enum: StorageCondition })
  @IsEnum(StorageCondition)
  @IsOptional()
  storageCondition?: StorageCondition;

  @ApiPropertyOptional({ description: 'Floor number' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  floor?: number;

  @ApiPropertyOptional({ description: 'Is pickable' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  isPickable?: boolean;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;
}

// ============================================================================
// WAREHOUSE BIN DTOs
// ============================================================================

export class CreateWarehouseBinDto {
  @ApiProperty({ description: 'Zone ID' })
  @IsUUID()
  zoneId: string;

  @ApiProperty({ example: 'A-01-R01-S01', description: 'Bin barcode' })
  @IsString()
  @MaxLength(50)
  barcode: string;

  @ApiPropertyOptional({ description: 'Bin name' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Row number' })
  @IsInt()
  @Min(0)
  @IsOptional()
  row?: number;

  @ApiPropertyOptional({ description: 'Shelf number' })
  @IsInt()
  @Min(0)
  @IsOptional()
  shelf?: number;

  @ApiPropertyOptional({ description: 'Position in row' })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ description: 'Max capacity' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxCapacity?: number;

  @ApiPropertyOptional({ description: 'Width (cm)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ description: 'Height (cm)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ description: 'Depth (cm)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  depth?: number;

  @ApiPropertyOptional({ description: 'Max weight (kg)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxWeight?: number;

  @ApiPropertyOptional({ description: 'Is pickable' })
  @IsBoolean()
  @IsOptional()
  isPickable?: boolean = true;
}

export class UpdateWarehouseBinDto extends PartialType(CreateWarehouseBinDto) {
  @ApiPropertyOptional({ description: 'Status' })
  @IsEnum(['available', 'occupied', 'reserved', 'blocked', 'maintenance'])
  @IsOptional()
  status?: 'available' | 'occupied' | 'reserved' | 'blocked' | 'maintenance';
}

export class PlaceProductInBinDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Lot/batch number' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @Type(() => Date)
  @IsOptional()
  expiryDate?: Date;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class PickFromBinDto {
  @ApiProperty({ description: 'Quantity to pick' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Reference (order ID, task ID)' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class TransferBinContentsDto {
  @ApiProperty({ description: 'Destination bin ID' })
  @IsUUID()
  destinationBinId: string;

  @ApiPropertyOptional({ description: 'Quantity to transfer (default: all)' })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BinQueryDto {
  @ApiPropertyOptional({ description: 'Zone ID' })
  @IsUUID()
  @IsOptional()
  zoneId?: string;

  @ApiPropertyOptional({ description: 'Status' })
  @IsEnum(['available', 'occupied', 'reserved', 'blocked', 'maintenance'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Product ID' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'Only empty bins' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  emptyOnly?: boolean;

  @ApiPropertyOptional({ description: 'Only pickable bins' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  pickableOnly?: boolean;

  @ApiPropertyOptional({ description: 'Search (barcode)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 100 })
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 100;
}

// ============================================================================
// BULK OPERATIONS DTOs
// ============================================================================

export class BulkCreateBinsDto {
  @ApiProperty({ description: 'Zone ID' })
  @IsUUID()
  zoneId: string;

  @ApiProperty({ description: 'Barcode prefix' })
  @IsString()
  @MaxLength(30)
  barcodePrefix: string;

  @ApiProperty({ description: 'Number of rows' })
  @IsInt()
  @Min(1)
  @Max(100)
  rows: number;

  @ApiProperty({ description: 'Number of shelves per row' })
  @IsInt()
  @Min(1)
  @Max(20)
  shelves: number;

  @ApiProperty({ description: 'Number of positions per shelf' })
  @IsInt()
  @Min(1)
  @Max(50)
  positions: number;

  @ApiPropertyOptional({ description: 'Max capacity per bin' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxCapacity?: number;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class ZoneUtilizationDto {
  @ApiProperty()
  zoneId: string;

  @ApiProperty()
  zoneName: string;

  @ApiProperty()
  totalCapacity: number;

  @ApiProperty()
  usedCapacity: number;

  @ApiProperty()
  utilizationPercent: number;

  @ApiProperty()
  totalBins: number;

  @ApiProperty()
  occupiedBins: number;

  @ApiProperty()
  availableBins: number;
}

export class WarehouseStatsDto {
  @ApiProperty()
  totalZones: number;

  @ApiProperty()
  totalBins: number;

  @ApiProperty()
  occupiedBins: number;

  @ApiProperty()
  availableBins: number;

  @ApiProperty()
  overallUtilization: number;

  @ApiProperty()
  byZoneType: Record<ZoneType, number>;

  @ApiProperty()
  byStorageCondition: Record<StorageCondition, number>;

  @ApiProperty()
  temperatureAlerts: number;
}
